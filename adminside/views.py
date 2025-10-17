from email.mime import application
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
    ApplicationPending,
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
from .forms import ApplicationForm as ApplicationFormValidation
from .utils import emailNotification
from django.core.cache import cache
from threading import Thread
import uuid
from django.db import transaction
from .services.all_service import (
    AdminInformationService,
    AnnouncementService,
    ApplicationPendingService,
    ApplicationApprovedService,
    CoordinatorInformationService,
    EnrollmentFormService,
    RequestHelper,
    TeacherInformationService,
    UserInformationService,
    StudentInformationService,
    OrganizationChartService,
    FAQService,
)
from .repositories.all_repository import (
    ApplicantInformationRepository,
    ApplicationApprovedRepository,
    ApplicationPendingRepository,
    AssessmentRepository,
    DocumentListRepository,
    DocumentRepository,
    EnrollmentFormRepository,
    EnrollmentManagementRepository,
    SchoolYearRepository,
    StudentInformationRepository,
)
from django.core.paginator import Paginator


def is_admin(user):
    return (user.is_authenticated and user.user_role in ["Administrator"] and not user.deactivated)


logger = logging.getLogger(__name__)

# DASHBOARD
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

# ADMIN DASHBOARD DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminDashboardDataAPI(View):
    def get(self, request):
        approved_count = ApplicationApproved.objects.count()
        rejected_count = ApplicationPending.objects.count()
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
    


# APPLICATION
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationView(View):
    def get(self, request):
        documents = DocumentRepository.get_all()
        return render(request, "admin/application.html", {"documents": documents})

#APPLICATION DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetApplicationDataAPI(View):
    def get(self, request):
        response_data = EnrollmentFormService.get_application_data_for_datatables(request)
        return JsonResponse(response_data, safe=False)
    
# UPDATE APPLICATION DATA
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationUpdateView(View):
    def post(self, request, *args, **kwargs):
        result = EnrollmentFormService.update_application_data(request)
        return JsonResponse(result)

# APPLICATION APPROVED VIEW
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationApprovedView(View):
    def get(self, request):
        documents = DocumentRepository.get_all()
        return render(request, "admin/application_approved.html", {"documents": documents})

#APPLICATION APPROVED DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetApplicationApprovedDataAPI(View):
    def get(self, request):
        response_data = ApplicationApprovedService.get_application_data_for_datatables(request)
        return JsonResponse(response_data, safe=False)

# APPLICATION ACTION FOR APPROVING
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationApprovedActionView(View):
    def post(self, request):
        result = ApplicationApprovedService.action_application_approved(request)
        return JsonResponse(result)
    
# APPLICATION ACTION FOR PENDING
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationPendingActionView(View):
    def post(self, request):
        result = ApplicationPendingService.action_application_pending(request)
        return JsonResponse(result)

# CAN BE DELETED THIS FUNCTION
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
                    application.user.user_role = "Student"
                    ApplicantInformation.objects.filter(user=application.user).delete()
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
                ApplicationPending.objects.create(
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

# APPLICATION BULK APPORVE
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationBulkApproveView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            application_ids = data.get("application_ids")
            logger.info(f"Application IDs: {application_ids}")
            total = len(application_ids)
            
            if not application_ids:
                return {"success": False, "message": "No applications selected."}
            
            batch_key = f"bulk_approve_{uuid.uuid4()}"
            cache.set(batch_key, {"approved": 0, "total": total, "skipped": []}, timeout=3600)
            
            def process_bulk():
                approved_count = 0
                skipped = []
                
                for application_id in application_ids:
                    try:
                        application = EnrollmentFormRepository.get_by_id(application_id)
                        if application.status == "Missing":
                            skipped.append(application_id)
                            continue
                        
                        application_approved, _ = ApplicationApprovedRepository.update_or_create(
                            enrollment=application,
                        )
                        
                        if application.grade_level != "7":
                            application.user.user_role = "Student"
                            ApplicantInformationRepository.delete_by_user(application.user)
                            student_information, _ = StudentInformationRepository.update_or_create(
                                application_approved=application_approved,
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
                                    "early_reg": application.early_reg,
                                    "is_approved": True,
                                    "enrollment_type": application.enrollment_type,
                                    "semester": application.semester,
                                    "strand": application.strand,
                                    "student_status": "Enrolled",
                                },
                            )
                            DocumentListRepository.get_filtered_by_enrollment(application).update(
                                student_information=student_information,
                                updated_at=timezone.now()
                            )
                            application.user.save()
                        else:
                            AssessmentRepository.create(
                                application_approved=application_approved,
                                literacy_level=None,
                                literacy_result=None,
                                numeracy_level=None,
                                numeracy_result=None,
                            )
                        
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
                        
                        approved_count += 1
                        
                        cache.set(batch_key, {"approved": approved_count, "total": total, "skipped": skipped}, timeout=3600)
                            
                        # Send email notification
                        emailNotification(application.first_name, application.last_name, application.application_no, application.user.email, "approved")

                    except EnrollmentForm.DoesNotExist:
                        skipped.append(str(application_id))
                        continue

            Thread(target=process_bulk).start()

            return JsonResponse({"success": True, "batch_key": batch_key, "total": total})

        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=500)
        
# BULK APPROVE PROGRESS VIEW
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






# APPLICATION REAPPROVE ACTION
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationReapproveActionView(View):
    def post(self, request):
        result = ApplicationPendingService.reapprove_application(request)
        return JsonResponse(result)
    
# APPLICATION PENDING
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationPendingView(View):
    def get(self, request):
        documents = DocumentRepository.get_all()
        return render(request, "admin/application_rejected.html", {"documents": documents})

#APPLICATION PENDING DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetApplicationPendingDataAPI(View):
    def get(self, request):
        response_data = ApplicationPendingService.get_application_data_for_datatables(request)
        return JsonResponse(response_data, safe=False)

#MESSAGE PENDING UPDATE
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class MessagePendingReasonUpdate(View):
    def post(self, request):
        response_data = ApplicationPendingService.update_message_pending(request)
        return JsonResponse(response_data, safe=False)

# CAN BE DELETED
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
                # Get the record from ApplicationPending table
                application_rejected = ApplicationPending.objects.get(pk=application_id)

                # Get the record from EnrollmentForm table
                enrollment_form = EnrollmentForm.objects.get(pk=application_rejected.enrollment_id)
                
                            
                if enrollment_form.status == "Missing":
                    return JsonResponse(
                        {
                            "success": False,
                            "message": "Application cannot be approved while status is 'Missing'.",
                        },
                        status=400,
                    )

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

                # Delete from ApplicationPending
                application_rejected.delete()

            return JsonResponse(
                {"success": True, "message": "Application re-approved successfully."}, status=200
            )

        except ApplicationPending.DoesNotExist:
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

# OPTIONAL
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminApplicationBulkReApproveView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            application_ids = data.get("application_ids")
            total = len(application_ids)
            
            if not application_ids:
                return {"success": False, "message": "No applications selected."}
            
            batch_key = f"bulk_reapprove_{uuid.uuid4()}"
            cache.set(batch_key, {"reapproved": 0, "total": total, "skipped": []}, timeout=3600)
            
            def process_bulk():
                reapproved_count = 0
                skipped = []
                
                for application_id in application_ids:
                    try:
                        # Get the pending application
                        application_pending = ApplicationPendingRepository.get_by_id(application_id)
                        if not application_pending:
                            skipped.append(application_id)
                            continue
                        
                        # Get the enrollment form
                        application = EnrollmentFormRepository.get_by_id(application_pending.enrollment_id)
                        if not application:
                            skipped.append(application_id)
                            continue
                        
                        # Create ApplicationApproved record
                        application_approved, _ = ApplicationApprovedRepository.create(
                            enrollment=application,
                        )
                        
                        
                        # Promote to student
                        if application.grade_level != "7":
                            application.user.user_role = "Student"
                            # Delete ApplicantInformation
                            ApplicantInformationRepository.delete_by_user(application.user)
                            # Update StudentInformation
                            student_information, _ = StudentInformationRepository.update_or_create(
                                application_approved=application_approved,
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
                                    "early_reg": application.early_reg,
                                    "is_approved": True,
                                    "enrollment_type": application.enrollment_type,
                                    "semester": application.semester,
                                    "strand": application.strand,
                                    "student_status": "Enrolled",
                                },
                            )
                            # Update DocumentList
                            DocumentListRepository.get_filtered_by_enrollment(application).update(
                                student_information=student_information,
                                updated_at=timezone.now()
                            )
                            application.user.save()
                        else:
                            AssessmentRepository.create(
                                application_approved=application_approved,
                                literacy_level=None,
                                literacy_result=None,
                                numeracy_level=None,
                                numeracy_result=None,
                            )
                        
                        
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
                        
                        # Delete from ApplicationPending
                        ApplicationPendingRepository.delete(application_id)
                        
                        reapproved_count += 1
                        
                        cache.set(batch_key, {"reapproved": reapproved_count, "total": total, "skipped": skipped}, timeout=3600)
                            
                        # Send email notification
                        emailNotification(application.first_name, application.last_name, application.application_no, application.user.email, "approved")
                        
                    except EnrollmentFormRepository.DoesNotExist:
                        skipped.append(application_id)
                        continue

            Thread(target=process_bulk).start()

            return JsonResponse({"success": True, "batch_key": batch_key, "total": total})

        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=500)

# BULK REAPPROVE PROGRESS VIEW
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class BulkReApproveProgressView(View):
    def get(self, request, batch_key):
        progress = cache.get(batch_key)
        if not progress:
            return JsonResponse({"reapproved": 0, "total": 0, "skipped": []})
        return JsonResponse(progress)
    



# REPORTS
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminReportsView(View):
    def get(self, request):
        return render(request, "admin/reports.html")



# CAN BE DELETED
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

            return JsonResponse({
                "success": True,
                "message": "Application updated successfully.",
                "status": application.status
            })
        except EnrollmentForm.DoesNotExist:
            return JsonResponse({"success": False, "message": "Application not found."}, status=404)
        except ValidationError as e:
            return JsonResponse({"success": False, "message": str(e)}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "message": "Invalid JSON data."}, status=400)
        except Exception as e:
            print("Unhandled exception:", e)
            return JsonResponse({"success": False, "message": "An error occurred."}, status=500)
        




# USER MANAGEMENT
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AllUserView(View):
    def get(self, request):
        return render(request, "admin/all_user.html")

# USER MANAGEMENT DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetAllUserDataAPI(View):
    def get(self, request):
        response_data = UserInformationService.get_user_for_datatables(request)
        return JsonResponse(response_data, safe=False)



# ADMIN USER MANAGEMENT
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminUserView(View):
    def get(self, request):
        return render(request, "admin/admin_admins.html")
    
# ADMIN USER DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetAdminUserDataAPI(View):
    def get(self, request):
        response_data = AdminInformationService.get_admin_information_for_datatables(request)
        return JsonResponse(response_data, safe=False)
    
# ADD ADMIN USER
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AddAdminUserView(View):
    def post(self, request):
        response = AdminInformationService.add_admin_user(request)
        return JsonResponse(response, safe=False)
    
# EDIT ADMIN USER
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class EditAdminUserView(View):
    def post(self, request):
        response = AdminInformationService.edit_admin_user(request)
        return JsonResponse(response, safe=False)

# DELETE ADMIN USER
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

# STUDENT USER MANAGEMENT
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class StudentUserView(View):
    def get(self, request):
        enrollment_management = EnrollmentManagementRepository.get_by_id(1)
        documents = DocumentRepository.get_all()
        return render(request, "admin/student_user.html", {"documents": documents, "enrollment_management": enrollment_management})

# STUDENT USER DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetStudentUserDataAPI(View):
    def get(self, request):
        response_data = StudentInformationService.get_student_information_for_datatables(request)
        return JsonResponse(response_data, safe=False)

# ADD STUDENT USER
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AddStudentUserView(View):
    def post(self, request):
        response = StudentInformationService.add_student_user(request)
        return JsonResponse(response, safe=False)

# EDIT STUDENT STATUS
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class EditStudentStatusView(View):
    def post(self, request):
        response = StudentInformationService.edit_student_status(request)
        return JsonResponse(response)


# TEACHER USER MANAGEMENT
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class TeacherUserView(View):
    def get(self, request):
        return render(request, "admin/teacher_user.html")

# TEACHER USER DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetTeacherUserDataAPI(View):
    def get(self, request):
        response_data = TeacherInformationService.get_teacher_information_for_datatables(request)
        return JsonResponse(response_data, safe=False)

# ADD TEACHER USER
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AddTeacherUserView(View):
    def post(self, request):
        response = TeacherInformationService.add_teacher_user(request)
        return JsonResponse(response, safe=False)
    
# EDIT TEACHER USER
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class EditTeacherUserView(View):
    def post(self, request):
        response = TeacherInformationService.edit_teacher_user(request)
        return JsonResponse(response, safe=False)

# COORDINATOR USER MANAGEMENT
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class CoordinatorUserView(View):
    def get(self, request):
        return render(request, "admin/coordinator_user.html")

# COORDINATOR USER DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetCoordinatorUserDataAPI(View):
    def get(self, request):
        response_data = CoordinatorInformationService.get_coordinator_information_for_datatables(request)
        return JsonResponse(response_data, safe=False)


# ADD COORDINATOR USER
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AddCoordinatorUserView(View):
    def post(self, request):
        response = CoordinatorInformationService.add_coordinator_user(request)
        return JsonResponse(response, safe=False)

# EDIT COORDINATOR USER
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class EditCoordinatorUserView(View):
    def post(self, request):
        response = CoordinatorInformationService.edit_coordinator_user(request)
        return JsonResponse(response, safe=False)


# LOGOUT VIEW
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



# MANAGE ANNOUNCEMENT
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class ManageAnnouncementView(View):
    def get(self, request):
        return render(request, "admin/manage_announcement.html")

# ANNOUNCEMENT DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetAnnouncementDataAPI(View):
    def get(self, request):
        response_data = AnnouncementService.get_announcement_for_datatables(request)
        return JsonResponse(response_data, safe=False)

# ADD ANNOUNCEMENT
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AddAnnouncementView(View):
    def post(self, request):
        print(request.POST)
        response = AnnouncementService.add_announcement(request)
        return JsonResponse(response, safe=False)

# UPDATE ANNOUNCEMENT
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class EditAnnouncementView(View):
    def post(self, request):
        response = AnnouncementService.edit_announcement(request)
        return JsonResponse(response, safe=False)

# DELETE ANNOUNCEMENT
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class DeleteAnnouncementView(View):
    def post(self, request):
        response = AnnouncementService.delete_announcement(request)
        return JsonResponse(response, safe=False)




# MANAGE ENROLLMENT
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
            settings = EnrollmentManagement.objects.get(id=1)

            # Update settings fields
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
                
            if data.get("academic_year_start") and data.get("academic_year_end"):
                start = data["academic_year_start"]
                end = data["academic_year_end"]

                existing_school_year = SchoolYearRepository.filter(
                    school_year_start=start,
                    school_year_end=end
                ).first()

                if existing_school_year is None:
                    # Create new school year
                    SchoolYearRepository.create(
                        school_year_start=start,
                        school_year_end=end,
                        created_at=timezone.now(),
                        updated_at=timezone.now()
                    )
                else:
                    # Update existing one (BaseRepository.update(pk, **fields))
                    SchoolYearRepository.update(
                        existing_school_year.id,
                        school_year_start=start,
                        school_year_end=end,
                        updated_at=timezone.now()
                    )


            settings.save()
            return JsonResponse({"status": "success", "message": "Settings updated successfully!"})

        except ValidationError as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)



# MANAGE ORGANIZATION CHART
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class ManageOrganizationalChartView(View):
    def get(self, request):
        return render(request, "admin/manage_organizational_chart.html")

# ORGANIZATION CHART DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetOrganizationChartDataAPI(View):
    def get(self, request):
        response_data = OrganizationChartService.get_organization_chart_for_datatables(request)
        return JsonResponse(response_data, safe=False)

# ADD ORGANIZATION CHART
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AddOrganizationChartView(View):
    def post(self, request):
        response = OrganizationChartService.add_organization_chart(request)
        return JsonResponse(response, safe=False)
    
# EDIT ORGANIZATION CHART
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class EditOrganizationChartView(View):
    def post(self, request):
        response = OrganizationChartService.edit_organization_chart(request)
        return JsonResponse(response, safe=False)
    
# DELETE ORGANIZATION CHART
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class DeleteOrganizationChartView(View):
    def post(self, request):
        response = OrganizationChartService.delete_organization_chart(request)
        return JsonResponse(response, safe=False)
    
    
# MANAGE FAQ
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class ManageFAQView(View):
    def get(self, request):
        return render(request, "admin/manage_faq.html")

# FAQ DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class GetFAQDataAPI(View):
    def get(self, request):
        response_data = FAQService.get_faq_for_datatables(request)
        return JsonResponse(response_data, safe=False)

# ADD FAQ
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AddFAQView(View):
    def post(self, request):
        response = FAQService.add_faq(request)
        return JsonResponse(response, safe=False)

# EDIT FAQ
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class EditFAQView(View):
    def post(self, request):
        response = FAQService.edit_faq(request)
        return JsonResponse(response, safe=False)
    
# DELETE FAQ
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class DeleteFAQView(View):
    def post(self, request):
        response = FAQService.delete_faq(request)
        return JsonResponse(response, safe=False)
    

# ADMIN ACTION USER
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminActionUserView(View):
    def post(self, request, user_id):
        response = UserInformationService.change_user_status(request)
        return JsonResponse(response)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class ChangePasswordView(View):
    def post(self, request):
        response = UserInformationService.change_password(request)
        return JsonResponse(response)

