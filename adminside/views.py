from webbrowser import get
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import logout, login, authenticate
from django.views import View
from django.http import JsonResponse
from django.core.exceptions import ValidationError
from django.contrib.auth.decorators import user_passes_test, login_required
from django.utils.decorators import method_decorator
from landingpage.models import (
    EnrollmentForm,
    ApplicationApproved,
    ApplicationRejected,
    Announcement,
    EnrollmentManagement,
    StudentInformation,
)
from authentication.models import MyUser, ApplicantInformation, AdminInformation, TeacherInformation, CoordinatorInformation
from django.contrib import messages
from django.utils import timezone
import logging
import json
import pytz
from django.core.files.storage import default_storage
from django.utils.dateparse import parse_date
from django.core.mail import send_mail
from django.forms.models import model_to_dict
from .forms import AddStudentForm, ApplicationForm as ApplicationFormValidation
from .utils import emailNotification
from django.core.cache import cache
from threading import Thread
import uuid
from django.db import transaction


def is_admin(user):
    return user.is_authenticated and user.user_role in ["Administrator"]


logger = logging.getLogger(__name__)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminDashboardView(View):
    def get(self, request):
        if request.user.is_authenticated:
            logger.info(
                f"User {request.user.email} with role {request.user.user_role} accessed the admin dashboard."
            )
        else:
            logger.info("Anonymous user accessed the admin dashboard.")

        return render(request, "admin/index.html")


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationView(View):
    def get(self, request):
        grade_level = request.GET.get("grade_level", None)
        student_type = request.GET.get("student_type", None)
        early_reg = request.GET.get("early_reg", None)
        enrollment_type = request.GET.get("enrollment_type", None)

        applications = EnrollmentForm.objects.filter(is_approved=None)
        try:
            settings = EnrollmentManagement.objects.get(id=1)
        except EnrollmentManagement.DoesNotExist:
            settings = None

        if enrollment_type:
            applications = applications.filter(enrollment_type=enrollment_type)
        if grade_level:
            applications = applications.filter(grade_level=grade_level)
        if student_type:
            applications = applications.filter(student_type=student_type)
        if early_reg:
            if early_reg == "Yes":
                applications = applications.filter(early_reg=True)
            elif early_reg == "No":
                applications = applications.filter(early_reg=False)

        return render(request, "admin/application.html", {"applications": applications, "settings": settings})


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationApprovedView(View):
    def get(self, request):
        grade_level = request.GET.get("grade_level", None)
        student_type = request.GET.get("student_type", None)
        early_reg = request.GET.get("early_reg", None)

        application_approved = ApplicationApproved.objects.all()

        if grade_level:
            application_approved = application_approved.filter(
                enrollment__grade_level=grade_level
            )
        if student_type:
            application_approved = application_approved.filter(
                enrollment__student_type=student_type
            )
        if early_reg:
            if early_reg == "Yes":
                application_approved = application_approved.filter(
                    enrollment__early_reg=True
                )
            elif early_reg == "No":
                application_approved = application_approved.filter(
                    enrollment__early_reg=False
                )

        # Normalize enrollment_type in each application instance
        for app in application_approved:
            if app.enrollment.enrollment_type:
                app.enrollment.enrollment_type = app.enrollment.enrollment_type.strip().upper()
            else:
                app.enrollment.enrollment_type = ''

        return render(
            request,
            "admin/application_approved.html",
            {"application_approved": application_approved},
        )


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationRejectedView(View):
    def get(self, request):
        grade_level = request.GET.get("grade_level", None)
        student_type = request.GET.get("student_type", None)
        early_reg = request.GET.get("early_reg", None)

        application_rejected = ApplicationRejected.objects.all()
        if grade_level:
            application_rejected = application_rejected.filter(
                enrollment__grade_level=grade_level
            )
        if student_type:
            application_rejected = application_rejected.filter(
                enrollment__student_type=student_type
            )
        if early_reg:
            if early_reg == "Yes":
                application_rejected = application_rejected.filter(
                    enrollment__early_reg=True
                )
            elif early_reg == "No":
                application_rejected = application_rejected.filter(
                    enrollment__early_reg=False
                )
        return render(
            request,
            "admin/application_rejected.html",
            {"application_rejected": application_rejected},
        )

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationActionView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            action = data.get("action")
            application_id = data.get("application_id")
            message_rejected = data.get("message_rejected", "")
            logger.info(
                f"Received application_id: {application_id}, action: {action}, message_rejected: {message_rejected}"
            )

            application = get_object_or_404(EnrollmentForm, pk=application_id)

            if action == "approve":
                if application.status == "Missing":
                    return JsonResponse(
                        {
                            "success": False,
                            "message": "Application cannot be approved while status is 'Missing'.",
                        },
                        status=400,
                    )

                # Create or update ApplicationApproved (always)
                app_approved, _ = ApplicationApproved.objects.update_or_create(
                    enrollment=application,
                    defaults={"is_assessed": False},
                )

                if application.grade_level != "7":
                    # Promote to student
                    ApplicantInformation.objects.filter(user=application.user).delete()
                    application.user.user_role = "Student"
                    StudentInformation.objects.update_or_create(
                        application_approved=app_approved,
                        defaults={
                            "user": application.user,
                            "application_no": application.application_no,
                            "status": application.status,
                            "created_at": application.created_at,
                            "school_year": application.school_year,
                            "grade": application.grade_level,
                            "with_lrn": application.with_lrn,
                            "student_type": application.student_type,
                            "gen_avg": application.gen_avg,
                            "section": None,
                            "psa_no": application.psa_no,
                            "lrn": application.lrn,
                            "first_name": application.first_name,
                            "middle_name": application.middle_name,
                            "last_name": application.last_name,
                            "extension_name": application.extension_name,
                            "birth_date": application.birth_date,
                            "age": application.age,
                            "gender": application.gender,
                            "place_of_birth": application.place_of_birth,
                            "mother_tongue": application.mother_tongue,
                            "documents_submitted": application.documents_submitted,
                            "early_reg": application.early_reg,
                            "is_approved": True,
                            "enrollment_type": application.enrollment_type,
                            "semester": application.semester,
                            "strand": application.strand,
                            "student_status": "Enrolled",
                        },
                    )
                    application.user.save()
                    
                user = application.user
                if application.enrollment_type == "SHS":
                    user.jhs_submitted = True
                    user.shs_submitted = True
                elif application.enrollment_type == "JHS":
                    user.jhs_submitted = True
                user.save()
                
                # Mark as approved
                application.is_approved = True
                application.save()
                
                # Send email notificatio
                emailNotification(application.first_name, application.last_name, application.application_no, application.user.email, "approved")
                return JsonResponse(
                    {
                        "success": True,
                        "message": "Application approved successfully. Email sent.",
                    }
                )

            elif action == "reject":
                ApplicationRejected.objects.create(
                    enrollment=application,
                    message_rejected=message_rejected,
                )
                user = application.user
                if application.enrollment_type == "SHS":
                    user.shs_submitted = False
                elif application.enrollment_type == "JHS":
                    user.jhs_submitted = False
                user.save()
                application.is_approved = False
                application.save()
                
                # Send Email Notificatio
                emailNotification(application.first_name, application.last_name, application.application_no, application.user.email, "rejected", message_rejected)
                
                return JsonResponse(
                    {
                        "success": True,
                        "message": "Application was rejected. Email sent.",
                    }
                )
            else:
                return JsonResponse(
                    {"success": False, "message": "Invalid action"}, status=400
                )

        except Exception as e:
            logger.error(f"Error processing application action: {e}")
            return JsonResponse(
                {"success": False, "message": "An error occurred"}, status=500
            )

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationBulkApproveView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            application_ids = data.get("application_ids", [])
            total = len(application_ids)

            if not application_ids:
                return JsonResponse({"success": False, "message": "No applications selected."}, status=400)

            batch_key = f"bulk_approve_{uuid.uuid4()}"
            cache.set(batch_key, {"approved": 0, "total": total, "skipped": []}, timeout=3600)

            def process_bulk():
                approved_count = 0
                skipped = []

                for app_id in application_ids:
                    try:
                        application = EnrollmentForm.objects.get(pk=app_id)
                        if application.status == "Missing":
                            skipped.append(application.application_no)
                            continue

                        # --- perform your approval logic ---
                        ApplicantInformation.objects.filter(user=application.user).delete()
                        app_approved, _ = ApplicationApproved.objects.update_or_create(
                            enrollment=application, defaults={"is_assessed": False}
                        )

                        if application.grade_level != "7":
                            application.user.user_role = "Student"
                            StudentInformation.objects.update_or_create(
                                application_approved=app_approved,
                                defaults={
                                    "user": application.user,
                                    "application_no": application.application_no,
                                    "status": application.status,
                                    "created_at": application.created_at,
                                    "school_year": application.school_year,
                                    "grade": application.grade_level,
                                    "with_lrn": application.with_lrn,
                                    "student_type": application.student_type,
                                    "gen_avg": application.gen_avg,
                                    "section": None,
                                    "psa_no": application.psa_no,
                                    "lrn": application.lrn,
                                    "first_name": application.first_name,
                                    "middle_name": application.middle_name,
                                    "last_name": application.last_name,
                                    "extension_name": application.extension_name,
                                    "birth_date": application.birth_date,
                                    "age": application.age,
                                    "gender": application.gender,
                                    "place_of_birth": application.place_of_birth,
                                    "mother_tongue": application.mother_tongue,
                                    "documents_submitted": application.documents_submitted,
                                    "early_reg": application.early_reg,
                                    "is_approved": True,
                                    "enrollment_type": application.enrollment_type,
                                    "semester": application.semester,
                                    "strand": application.strand,
                                    "student_status": "Enrolled",
                                },
                            )
                        application.user.save()

                        if application.enrollment_type == "SHS":
                            application.user.jhs_submitted = True
                            application.user.shs_submitted = True
                        elif application.enrollment_type == "JHS":
                            application.user.jhs_submitted = True
                        application.user.save()

                        application.is_approved = True
                        application.save()
                        approved_count += 1

                        cache.set(batch_key, {"approved": approved_count, "total": total, "skipped": skipped}, timeout=3600)

                        emailNotification(application.first_name, application.last_name, application.application_no, application.user.email, "approved")

                    except EnrollmentForm.DoesNotExist:
                        skipped.append(str(app_id))
                        continue

            Thread(target=process_bulk).start()

            return JsonResponse({"success": True, "batch_key": batch_key, "total": total})

        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=500)
        
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationReApproveView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            application_id = data.get("application_id")

            with transaction.atomic():
                # Get the record from ApplicationRejected table
                application_rejected = ApplicationRejected.objects.get(pk=application_id)

                # Get the record from EnrollmentForm table
                enrollment_form = EnrollmentForm.objects.get(pk=application_rejected.enrollment_id)

                # Update enrollment form
                enrollment_form.is_approve = True
                enrollment_form.save()

                # Insert into ApplicationApproved
                ApplicationApproved.objects.create(
                    is_assessed=0,
                    enrollment_id=application_rejected.enrollment_id
                )
                
                # Send email notificatio
                emailNotification(enrollment_form.first_name, enrollment_form.last_name, enrollment_form.application_no, enrollment_form.user.email, "approved")

                # Delete from ApplicationRejected
                application_rejected.delete()

            return JsonResponse(
                {"success": True, "message": "Application re-approved successfully."}, status=200
            )

        except ApplicationRejected.DoesNotExist:
            return JsonResponse(
                {"success": False, "message": "Application not found."}, status=404
            )
        except EnrollmentForm.DoesNotExist:
            return JsonResponse(
                {"success": False, "message": "Enrollment form not found."}, status=404
            )
        except Exception as e:
            logger.error(f"Error processing application action: {e}")
            return JsonResponse(
                {"success": False, "message": "An error occurred."}, status=500
            )

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationBulkReApproveView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            application_ids = data.get("application_ids", [])
            total = len(application_ids)

            if not application_ids:
                return JsonResponse({"success": False, "message": "No applications selected."}, status=400)

            # Unique key for tracking progress
            batch_key = f"bulk_reapprove_{uuid.uuid4()}"
            cache.set(batch_key, {"reapproved": 0, "total": total, "skipped": []}, timeout=3600)

            def process_bulk():
                reapproved_count = 0
                skipped = []

                for app_id in application_ids:
                    try:
                        with transaction.atomic():
                            application_rejected = ApplicationRejected.objects.get(pk=app_id)

                            try:
                                enrollment_form = EnrollmentForm.objects.get(pk=application_rejected.enrollment_id)
                            except EnrollmentForm.DoesNotExist:
                                skipped.append(str(app_id))
                                continue

                            enrollment_form.is_approve = True
                            enrollment_form.save()

                            ApplicationApproved.objects.create(
                                is_assessed=0,
                                enrollment_id=application_rejected.enrollment_id
                            )

                            application_rejected.delete()

                            try:
                                emailNotification(
                                    enrollment_form.first_name,
                                    enrollment_form.last_name,
                                    enrollment_form.application_no,
                                    enrollment_form.user.email,
                                    "approved"
                                )
                            except Exception as e:
                                logger.error(f"Email failed for {enrollment_form.application_no}: {e}")

                            reapproved_count += 1

                            progress = cache.get(batch_key) or {"reapproved": 0, "total": total, "skipped": []}
                            progress.update({"reapproved": reapproved_count, "skipped": skipped})
                            cache.set(batch_key, progress, timeout=3600)

                    except ApplicationRejected.DoesNotExist:
                        skipped.append(str(app_id))
                    except Exception as e:
                        logger.error(f"Error re-approving application {app_id}: {e}")
                        skipped.append(str(app_id))

                cache.set(batch_key, {
                    "reapproved": reapproved_count,
                    "total": total,
                    "skipped": skipped,
                    "done": True  
                }, timeout=3600)

            Thread(target=process_bulk, daemon=True).start()

            return JsonResponse({"success": True, "batch_key": batch_key, "total": total})

        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=500)

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class BulkReApproveProgressView(View):
    def get(self, request, batch_key):
        progress = cache.get(batch_key)
        if not progress:
            return JsonResponse({"reapproved": 0, "total": 0, "skipped": [], "done": False})
        return JsonResponse(progress)

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)       
class BulkApproveProgressView(View):
    def get(self, request, batch_key):
        progress = cache.get(batch_key)
        if not progress:
            return JsonResponse({"approved": 0, "total": 0, "skipped": []})

        return JsonResponse(progress)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminReportsView(View):
    def get(self, request):
        return render(request, "admin/reports.html")

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetApplicationDataView(View):
    def get(self, request, application_id):
        application = get_object_or_404(EnrollmentForm, pk=application_id)
        try:
            if isinstance(application.documents_submitted, str):
                documents_submitted = json.loads(
                    application.documents_submitted or "[]"
                )
            else:
                documents_submitted = application.documents_submitted or []
        except json.JSONDecodeError:
            documents_submitted = []

        data = {
            "id": application.id,
            "enrollment_type": application.enrollment_type,
            "school_year": application.school_year,
            "grade_level": application.grade_level,
            "with_lrn": application.with_lrn,
            "status": application.status,
            "student_type": application.student_type,
            "gen_avg": application.gen_avg,
            "semester": application.semester,
            "strand": application.strand,
            "psa_no": application.psa_no,
            "lrn": application.lrn,
            "first_name": application.first_name,
            "middle_name": application.middle_name or "",
            "last_name": application.last_name,
            "extension_name": application.extension_name or "",
            "birth_date": (
                application.birth_date.strftime("%Y-%m-%d")
                if application.birth_date
                else ""
            ),
            "age": application.age,
            "gender": application.gender,
            "place_of_birth": application.place_of_birth,
            "mother_tongue": application.mother_tongue,
            "documents_submitted": documents_submitted,
            "early_reg": application.early_reg,
        }
        return JsonResponse(data)

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class UpdateApplicationView(View):
    def post(self, request, *args, **kwargs):
        application_id = kwargs.get("application_id")
        return self.update_application(request, application_id)

    def put(self, request, *args, **kwargs):
        application_id = kwargs.get("application_id")
        return self.update_application(request, application_id)
    def update_application(self, request, application_id):
        try:
            application = EnrollmentForm.objects.get(id=application_id)
            payload = json.loads(request.body)
            nested_data = payload.get("data", {})

            print("Action:", payload.get("action"))
            print("Nested Data:", nested_data)

            documents_submitted = payload.get("documents_submitted", [])
            nested_data["documents_submitted"] = json.dumps(documents_submitted)
            
            nested_data.update({
                "enrollment_type": application.enrollment_type,
                "user_id": application.user.id,
                "user_role": application.user.user_role,
                "application_no": application.application_no,
                "status": application.status,
                "early_reg": application.early_reg,
            })

            form = ApplicationFormValidation(data=nested_data)
            if not form.is_valid():
                return JsonResponse({"success": False, "errors": form.errors}, status=200)
            
            cleaned = form.cleaned_data
            application.school_year = cleaned["school_year"]
            application.grade_level = cleaned["grade_level"]
            application.student_type = cleaned["student_type"]
            application.semester = cleaned.get("semester")
            application.strand = cleaned.get("strand")
            application.gen_avg = cleaned["gen_avg"]
            application.psa_no = cleaned["psa_no"]
            application.lrn = cleaned["lrn"]
            application.first_name = cleaned["first_name"]
            application.middle_name = cleaned.get("middle_name")
            application.last_name = cleaned["last_name"]
            application.extension_name = cleaned.get("extension_name")
            application.birth_date = cleaned["birth_date"]
            application.age = cleaned["age"]
            application.gender = cleaned["gender"]
            application.place_of_birth = cleaned["place_of_birth"]
            application.mother_tongue = cleaned["mother_tongue"]
            application.documents_submitted = nested_data["documents_submitted"]
            application.early_reg = cleaned["early_reg"]
            application.save()

            # 🔹 Extra check when saving
            if payload.get("action") == "save":
                docs = application.documents_submitted or []
                if "PSA" in docs and "Report Card" in docs:
                    application.status = "Complete"
                else:
                    application.status = "Missing"
                application.save()

            return JsonResponse({"success": True, "message": "Application updated successfully."})

        except EnrollmentForm.DoesNotExist:
            return JsonResponse({"success": False, "message": "Application not found."}, status=404)
        except ValidationError as e:
            return JsonResponse({"success": False, "message": str(e)}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)
        except Exception as e:
            print("Unhandled exception:", e)
            return JsonResponse({"success": False, "message": "An error occurred."}, status=500)
        
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AllUserView(View):
    def get(self, request):
        user_role = request.GET.get("user_role", None)
        is_active = request.GET.get("is_active", None)
        users = MyUser.objects.all()
        if user_role:
            users = MyUser.objects.filter(user_role=user_role)
        if is_active:
            if is_active == "Yes":
                users = users.filter(is_active=True)
            elif is_active == "No":
                users = users.filter(is_active=False)
        return render(request, "admin/all_user.html", {"users": users})


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminUserView(View):
    def get(self, request):
        is_active = request.GET.get("is_active", None)
        users = MyUser.objects.filter(user_role="Administrator")
        if is_active:
            if is_active == "Yes":
                users = users.filter(is_active=True)
            elif is_active == "No":
                users = users.filter(is_active=False)
        return render(request, "admin/admin_admins.html", {"users": users})

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class StudentUserView(View):
    def get(self, request):
        student_status = request.GET.get("student_status", None)
        is_active = request.GET.get("is_active", None)
        users = MyUser.objects.filter(user_role="Student")
        if student_status:
            users = users.filter(studentinformation__student_status=student_status)
        if is_active:
            if is_active == "Yes":
                users = users.filter(is_active=True)
            elif is_active == "No":
                users = users.filter(is_active=False)
        return render(request, "admin/student_user.html", {"users": users})

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class TeacherUserView(View):
    def get(self, request):
        is_active = request.GET.get("is_active", None)
        users = MyUser.objects.filter(user_role="Teacher")
        if is_active:
            if is_active == "Yes":
                users = users.filter(is_active=True)
            elif is_active == "No":
                users = users.filter(is_active=False)
        return render(request, "admin/teacher_user.html", {"users": users})

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class CoordinatorUserView(View):
    def get(self, request):
        is_active = request.GET.get("is_active", None)
        users = MyUser.objects.filter(user_role="Coordinator")
        if is_active:
            if is_active == "Yes":
                users = users.filter(is_active=True)
            elif is_active == "No":
                users = users.filter(is_active=False)
        return render(request, "admin/coordinator_user.html", {"users": users})

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminDeleteUserView(View):
    def delete(self, request, user_id):
        try:
            user = MyUser.objects.get(id=user_id)
            user.delete()
            return JsonResponse(
                {"status": "success", "message": "User deleted successfully"}
            )
        except MyUser.DoesNotExist:
            return JsonResponse(
                {"status": "error", "message": "User not found"}, status=404
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AddAdminUserView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            email = data.get("email")
            password = data.get("password")
            first_name = data.get("first_name")
            last_name = data.get("last_name")
            if not email or not password or not first_name or not last_name:
                return JsonResponse(
                    {"status": "error", "message": "All fields are required"},
                    status=400,
                )
            if "@" not in email:
                return JsonResponse(
                    {"status": "error", "message": "Email is invalid"}, status=400
                )
            user = MyUser.objects.create_superuser(
                email=email,
                password=password,
            )
            
            AdminInformation.objects.create(
                user=user,
                first_name=first_name,
                last_name=last_name,
            )
            return JsonResponse(
                {"status": "success", "message": "Admin user created successfully"}
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AddCoordinatorUserView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            email = data.get("email")
            password = data.get("password")
            first_name = data.get("first_name")
            middle_name = data.get("last_name")
            last_name = data.get("last_name")
            position = data.get("position")
            user_role = "Coordinator"
            if (
                not email
                or not password
                or not first_name
                or not last_name
                or not middle_name
                or not position
            ):
                return JsonResponse(
                    {"status": "error", "message": "All fields are required"},
                    status=400,
                )
            if "@" not in email:
                return JsonResponse(
                    {"status": "error", "message": "Email is invalid"}, status=400
                )
            user = MyUser.objects.create_user(
                email=email,
                password=password,
                user_role=user_role,
            )
            
            CoordinatorInformation.objects.create(
                user=user,
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name,
                position=position,
            )
            
            return JsonResponse(
                {"status": "success", "message": "Admin user created successfully"}
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AddTeacherUserView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            email = data.get("email")
            password = data.get("password")
            first_name = data.get("first_name")
            middle_name = data.get("last_name")
            last_name = data.get("last_name")
            position = data.get("position")
            grade_level_teacher = data.get("grade_level_teacher")
            user_role = "Teacher"
            if (
                not email
                or not password
                or not first_name
                or not last_name
                or not middle_name
                or not position
                or not grade_level_teacher
            ):
                return JsonResponse(
                    {"status": "error", "message": "All fields are required"},
                    status=400,
                )
            if "@" not in email:
                return JsonResponse(
                    {"status": "error", "message": "Email is invalid"}, status=400
                )
            user = MyUser.objects.create_user(
                email=email,
                password=password,
                user_role=user_role,
            )
            
            TeacherInformation.objects.create(
                user=user,
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name,
                position=position,
                grade_level=grade_level_teacher,
            )
            
            return JsonResponse(
                {"status": "success", "message": "Admin user created successfully"}
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AddStudentUserView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            form = AddStudentForm(data)

            if not form.is_valid():
                return JsonResponse(
                    {"status": "error", "errors": form.errors}, status=400
                )

            cleaned = form.cleaned_data

            user = MyUser.objects.create_user(
                email=cleaned["email"],
                password=cleaned["password"],
                user_role="Student",
            )

            StudentInformation.objects.create(
                user=user,
                lrn=cleaned["lrn"],
                psa_no=cleaned["psa_no"],
                first_name=cleaned["first_name"],
                middle_name=cleaned.get("middle_name"),
                last_name=cleaned["last_name"],
                extension_name=cleaned.get("extension_name"),
                enrollment_type=cleaned["enrollment_type"],
                student_type=cleaned["student_type"],
                school_year=cleaned["school_year"],
                grade=cleaned["grade_level"],
                gen_avg=cleaned["gen_avg"],
                section=None,
                status="Complete",
                semester=cleaned.get("semester"),
                strand=cleaned.get("strand"),
                birth_date=cleaned["birth_date"],
                age=cleaned["age"],
                gender=cleaned["gender"],
                place_of_birth=cleaned["place_of_birth"],
                mother_tongue=cleaned["mother_tongue"],
                documents_submitted=cleaned["documents_submitted"],
                student_status="Enrolled",
            )

            return JsonResponse(
                {"status": "success", "message": "Student user created successfully"}
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetDocumentDataView(View):
    def get(self, request, application_id):
        application = get_object_or_404(EnrollmentForm, pk=application_id)
        
        raw_docs = application.documents_submitted
        try:
            if isinstance(raw_docs, str):
                documents_submitted = json.loads(raw_docs)
            elif isinstance(raw_docs, list):
                documents_submitted = raw_docs
            else:
                documents_submitted = []
        except Exception as e:
            print("Error loading JSON from documents_submitted:", e)
            documents_submitted = []

        return JsonResponse({ "documents_submitted": documents_submitted })


class AdminLogoutView(View):
    def get(self, request):
        if request.user.is_authenticated:
            user = request.user
            philippine_time = timezone.now().astimezone(pytz.timezone("Asia/Manila"))
            user.is_active = False
            user.updated_at = philippine_time
            user.save(update_fields=["is_active", "updated_at"])
            request.session.flush()

        logout(request)
        messages.success(request, "Logged out successfully!")
        return redirect("signin")


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class ManageAnnouncementView(View):
    def get(self, request):
        announcements = Announcement.objects.all().order_by("-created_at")
        return render(
            request, "admin/manage_announcement.html", {"announcements": announcements}
        )


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AddAnnouncementView(View):
    def post(self, request):
        try:
            title = request.POST.get("announcement_title")
            content = request.POST.get("announcement_content")
            status = request.POST.get("announcement_status")
            image = request.FILES.get("announcement_image")
            type_ = request.POST.get("announcement_type")
            date = request.POST.get("announcement_date")

            announcement = Announcement(
                title=title,
                content=content,
                status=status,
                date=date,
                type=type_,
            )
            if image:
                announcement.image = image
            announcement.save()

            return JsonResponse(
                {
                    "status": "success",
                    "message": "Announcement added successfully!",
                }
            )
        except Exception as e:
            logger.error(f"Error adding announcement: {e}")
            return JsonResponse(
                {"status": "error", "message": "Failed to add announcement."},
                status=500,
            )


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class UpdateAnnouncementView(View):
    def post(self, request, announcement_id):
        try:
            announcement = get_object_or_404(Announcement, id=announcement_id)
            announcement.title = request.POST.get(
                "announcement_title", announcement.title
            )
            announcement.content = request.POST.get(
                "announcement_content", announcement.content
            )
            announcement.date = request.POST.get("announcement_date", announcement.date)
            announcement.type = request.POST.get("announcement_type", announcement.type)
            announcement.status = request.POST.get(
                "announcement_status", announcement.status
            )
            if "announcement_image" in request.FILES:
                announcement.image = request.FILES["announcement_image"]
            announcement.save()
            return JsonResponse(
                {"status": "success", "message": "Announcement updated successfully!"}
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class DeleteAnnouncementView(View):
    def post(self, request, announcement_id):
        try:
            announcement = get_object_or_404(Announcement, id=announcement_id)
            if announcement.image:
                if default_storage.exists(announcement.image.name):
                    default_storage.delete(announcement.image.name)
            announcement.delete()
            return JsonResponse(
                {"status": "success", "message": "Announcement deleted successfully!"}
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class ManageEnrollmentView(View):
    def get(self, request):
        try:
            settings = EnrollmentManagement.objects.filter(id=1).first()
            if settings is None:
                settings = EnrollmentManagement.objects.create(id=1)
                
            return render(request, "admin/manage_enrollment.html", {"settings": settings})
        except Exception as e:
            logger.error(f"Error fetching enrollment settings: {e}")
            messages.error(request, "An error occurred while fetching enrollment settings.")
            return redirect("admin_dashboard")

    def post(self, request):
        try:
            data = json.loads(request.body)
            print(data)
            settings = EnrollmentManagement.objects.get(id=1)
            if "announcement_content" in data:
                settings.announcement_content = data["announcement_content"]
            if "enrollment_active" in data:
                settings.enrollment_active = int(data["enrollment_active"])
            if "early_registration_active" in data:
                settings.early_registration_active = int(data["early_registration_active"])
            if "enrollment_start_date" in data:
                settings.enrollment_start_date = parse_date(data["enrollment_start_date"]) or settings.enrollment_start_date
            if "enrollment_deadline_date" in data:
                settings.enrollment_deadline_date = parse_date(data["enrollment_deadline_date"]) or settings.enrollment_deadline_date
            if "early_registration_start_date" in data:
                settings.early_registration_start_date = parse_date(data["early_registration_start_date"]) or settings.early_registration_start_date
            if "early_registration_deadline_date" in data:
                settings.early_registration_deadline_date = parse_date(data["early_registration_deadline_date"]) or settings.early_registration_deadline_date
            if "academic_year_start" in data:
                settings.academic_year_start = data["academic_year_start"]
            if "academic_year_end" in data:
                settings.academic_year_end = data["academic_year_end"]

            settings.save()
            return JsonResponse({"status": "success", "message": "Settings updated successfully!"})
        except ValidationError as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminDashboardDataAPI(View):
    def get(self, request):
        approved_count = ApplicationApproved.objects.count()
        rejected_count = ApplicationRejected.objects.count()
        applcant_total = ApplicantInformation.objects.count()
        application_junior_count = EnrollmentForm.objects.filter(enrollment_type="JHS", is_approved=None).count()
        application_senior_count = EnrollmentForm.objects.filter( enrollment_type="SHS", is_approved=None).count()
        users_count = MyUser.objects.count()
        administrator_count = MyUser.objects.filter(user_role="Administrator").count()
        coordinator_count = MyUser.objects.filter(user_role="Coordinator").count()
        teacher_count = MyUser.objects.filter(user_role="Teacher").count()
        student_count = MyUser.objects.filter(user_role="Student").count()
        applicant_count = MyUser.objects.filter(user_role="Applicant").count()
        student_junior_count = StudentInformation.objects.filter(enrollment_type="JHS").count()
        student_senior_count = StudentInformation.objects.filter(enrollment_type="SHS").count()
        male_count = StudentInformation.objects.filter(gender__iexact="MALE").count()
        female_count = StudentInformation.objects.filter(gender__iexact="FEMALE").count()

        print("student_junior_count:", student_junior_count)
        print("student_senior_count:", student_senior_count)
        application_report_data = [
            {"value": approved_count, "name": "Approved"},
            {"value": rejected_count, "name": "Rejected"},
        ]

        user_report_data = [
            {"value": applcant_total, "name": "Applicant"},
            {"value": student_count, "name": "Student"},
            {"value": teacher_count, "name": "Teacher"},
            {"value": coordinator_count, "name": "Coordinator"},
            {"value": administrator_count, "name": "Administrator"},
        ]

        data = {
            "approved": approved_count,
            "rejected": rejected_count,
            "junior": application_junior_count,
            "senior": application_senior_count,
            "total_applicant": application_junior_count + application_senior_count,
            "users": users_count,
            "application_report": application_report_data,
            "user_report": user_report_data,
            "male": male_count,
            "female": female_count,
            "student_junior": student_junior_count,
            "student_senior": student_senior_count,
            "all_student_count": student_count,
        }

        return JsonResponse(data)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminActionUserView(View):
    def post(self, request, user_id):
        try:
            user = MyUser.objects.get(id=user_id)
            if user.deactivated:
                user.deactivated = False
                user.save()
                return JsonResponse(
                    {"status": "success", "message": "User activated successfully"}
                )
            else:
                user.deactivated = True
                user.save()
                return JsonResponse(
                    {"status": "success", "message": "User deactivated successfully"}
                )
        except MyUser.DoesNotExist:
            return JsonResponse(
                {"status": "error", "message": "User not found"}, status=404
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class ChangePasswordView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)

            user_id = data.get("user_id")
            current_password = data.get("current_password")
            new_password = data.get("new_password")
            confirm_password = data.get("confirm_password")

            user = MyUser.objects.get(pk=user_id)

            if not user.check_password(current_password):
                return JsonResponse(
                    {"status": "error", "message": "Current password is incorrect"},
                    status=400,
                )

            if new_password != confirm_password:
                return JsonResponse(
                    {"status": "error", "message": "Passwords do not match"}, status=400
                )

            user.set_password(new_password)
            user.save()

            return JsonResponse(
                {"status": "success", "message": "Password changed successfully"}
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetUserDataView(View):
    def get(self, request, user_id, user_role):
        user = get_object_or_404(MyUser, pk=user_id)

        if user_role == "Student":
            student_info = user.studentinformation_set.first()
            if not student_info:
                return JsonResponse(
                    {"error": "Student information not found."}, status=404
                )

            try:
                documents_submitted = []
                if isinstance(student_info.documents_submitted, str):
                    documents_submitted = json.loads(
                        student_info.documents_submitted or "[]"
                    )
                elif isinstance(student_info.documents_submitted, list):
                    documents_submitted = student_info.documents_submitted
            except json.JSONDecodeError:
                documents_submitted = []

            data = {
                "id": student_info.id,
                "school_year": student_info.school_year,
                "grade": student_info.grade,
                "with_lrn": student_info.with_lrn,
                "status": student_info.status,
                "student_type": student_info.student_type,
                "gen_avg": student_info.gen_avg,
                "semester": student_info.semester,
                "strand": student_info.strand,
                "psa_no": student_info.psa_no,
                "lrn": student_info.lrn,
                "first_name": student_info.first_name,
                "middle_name": student_info.middle_name or "",
                "last_name": student_info.last_name,
                "extension_name": student_info.extension_name or "",
                "birth_date": (
                    student_info.birth_date.strftime("%Y-%m-%d")
                    if student_info.birth_date
                    else ""
                ),
                "age": student_info.age,
                "gender": student_info.gender,
                "place_of_birth": student_info.place_of_birth,
                "mother_tongue": student_info.mother_tongue,
                "documents_submitted": documents_submitted,
                "early_reg": student_info.early_reg,
                "enrollment_type": student_info.enrollment_type,
            }
            return JsonResponse(data)

        elif user_role == "Teacher":
            teacher_info = getattr(user, "teacherinformation", None)
            if not teacher_info:
                return JsonResponse(
                    {"error": "Teacher information not found."}, status=404
                )

            data = {
                "id": user.id,
                "first_name": teacher_info.first_name,
                "middle_name": teacher_info.middle_name or "",
                "last_name": teacher_info.last_name,
                "position": teacher_info.position,
                "grade_level": teacher_info.grade_level,
                "email": user.email,
            }
            return JsonResponse(data)

        elif user_role == "Coordinator":
            coordinator_info = getattr(user, "coordinatorinformation", None)
            if not coordinator_info:
                return JsonResponse(
                    {"error": "Coordinator information not found."}, status=404
                )
            newdata = model_to_dict(coordinator_info)
            print("New Data:", newdata)
            data = {
                "id": user.id,
                "first_name": coordinator_info.first_name,
                "middle_name": coordinator_info.middle_name or "",
                "last_name": coordinator_info.last_name,
                "position": coordinator_info.position,
                "email": user.email,
            }
            return JsonResponse(data)

        elif user_role == "Administrator":
            admin_info = getattr(user, "admininformation", None)
            print("Admin Info:", admin_info.middle_name)
            if not admin_info:
                return JsonResponse(
                    {"error": "Administrator information not found."}, status=404
                )

            data = {
                "id": user.id,
                "first_name": admin_info.first_name,
                "middle_name": admin_info.middle_name or "",
                "last_name": admin_info.last_name,
                "position": admin_info.position,
                "email": user.email,
            }
            return JsonResponse(data)

        else:
            return JsonResponse({"error": "Invalid user role"}, status=400)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminEditStudentStatusView(View):
    def post(self, request, student_id):
        try:
            # Parse JSON body
            data = json.loads(request.body)
            new_status = data.get("student_status")

            print("New Status:", new_status)

            if new_status not in ["Enrolled", "Transferred", "Dropped"]:
                return JsonResponse(
                    {"success": False, "message": "Invalid student status."},
                    status=400,
                )

            student = get_object_or_404(StudentInformation, id=student_id)
            student.student_status = new_status
            student.save()

            return JsonResponse(
                {"success": True, "message": "Student status updated successfully."}
            )
        except Exception as e:
            return JsonResponse(
                {"success": False, "message": f"Error: {str(e)}"}, status=400
            )


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminEditUserView(View):
    def post(self, request, user_id, user_role):
        try:
            data = json.loads(request.body)
            user = MyUser.objects.get(id=user_id)   
            if user_role == "Teacher":
                teacher_info = getattr(user, "teacherinformation", None)
                if not teacher_info:
                    return JsonResponse({"status": "error", "message": "Teacher information not found."}, status=404)
                teacher_info.first_name = data.get("first_name", teacher_info.first_name)
                teacher_info.middle_name = data.get("middle_name", teacher_info.middle_name)
                teacher_info.last_name = data.get("last_name", teacher_info.last_name)
                teacher_info.position = data.get("position", teacher_info.position)
                teacher_info.grade_level = data.get("grade_level", teacher_info.grade_level)
                teacher_info.save()
            # Update CoordinatorInformation
            elif user_role == "Coordinator":
                coordinator_info = getattr(user, "coordinatorinformation", None)
                if not coordinator_info:
                    return JsonResponse({"status": "error", "message": "Coordinator information not found."}, status=404)
                coordinator_info.first_name = data.get("first_name", coordinator_info.first_name)
                coordinator_info.middle_name = data.get("middle_name", coordinator_info.middle_name)
                coordinator_info.last_name = data.get("last_name", coordinator_info.last_name)
                coordinator_info.position = data.get("position", coordinator_info.position)
                coordinator_info.save()
            # Optionally update user email or other fields
            if "email" in data:
                user.email = data["email"]
                user.save()
            return JsonResponse({"status": "success", "message": "User updated successfully"})
        except MyUser.DoesNotExist:
            return JsonResponse({"status": "error", "message": "User not found."}, status=404)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
