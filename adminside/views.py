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
        from django.utils import timezone
        from datetime import datetime, timedelta
        
        # Get filter parameter
        filter_type = request.GET.get('filter', 'all')
        now = timezone.now()
        
        # Define date ranges based on filter
        if filter_type == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        elif filter_type == 'month':
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        elif filter_type == 'year':
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        else:
            start_date = None
            end_date = None
        
        # Apply date filters if specified
        def apply_date_filter(queryset, date_field='created_at'):
            if start_date and end_date:
                return queryset.filter(**{f"{date_field}__gte": start_date, f"{date_field}__lte": end_date})
            return queryset
        
        # Get filtered counts with correct date fields for each model
        # ApplicationApproved and ApplicationPending don't have created_at, filter through EnrollmentForm
        if start_date and end_date:
            approved_count = EnrollmentForm.objects.filter(
                applicationapproved__isnull=False,
                created_at__gte=start_date,
                created_at__lte=end_date
            ).count()
            rejected_count = EnrollmentForm.objects.filter(
                applicationpending__isnull=False,
                created_at__gte=start_date,
                created_at__lte=end_date
            ).count()
        else:
            approved_count = ApplicationApproved.objects.count()
            rejected_count = ApplicationPending.objects.count()
        
        # ApplicantInformation doesn't have created_at, use user's created_at
        applcant_total = apply_date_filter(ApplicantInformation.objects.all(), 'user__created_at').count()
        application_junior_count = apply_date_filter(EnrollmentForm.objects.filter(enrollment_type="JHS", is_approved=None)).count()
        application_senior_count = apply_date_filter(EnrollmentForm.objects.filter(enrollment_type="SHS", is_approved=None)).count()
        users_count = apply_date_filter(MyUser.objects.all()).count()
        administrator_count = apply_date_filter(MyUser.objects.filter(user_role="Administrator")).count()
        coordinator_count = apply_date_filter(MyUser.objects.filter(user_role="Coordinator")).count()
        teacher_count = apply_date_filter(MyUser.objects.filter(user_role="Teacher")).count()
        student_count = apply_date_filter(MyUser.objects.filter(user_role="Student")).count()
        applicant_count = apply_date_filter(MyUser.objects.filter(user_role="Applicant")).count()
        student_junior_count = apply_date_filter(StudentInformation.objects.filter(enrollment_type="JHS")).count()
        student_senior_count = apply_date_filter(StudentInformation.objects.filter(enrollment_type="SHS")).count()
        male_count = apply_date_filter(StudentInformation.objects.filter(gender__iexact="MALE")).count()
        female_count = apply_date_filter(StudentInformation.objects.filter(gender__iexact="FEMALE")).count()
        
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
            "filter_type": filter_type,
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None
            }
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
        current_academic_year = SchoolYearRepository.get_all().order_by("updated_at").last()
        response_data = EnrollmentFormService.get_application_data_for_datatables(request, current_academic_year)
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
        current_academic_year = SchoolYearRepository.get_all().order_by("updated_at").last()
        response_data = ApplicationApprovedService.get_application_data_for_datatables(request, current_academic_year)
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
        current_academic_year = SchoolYearRepository.get_all().order_by("updated_at").last()
        response_data = ApplicationPendingService.get_application_data_for_datatables(request, current_academic_year)
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

# REPORTS DATA API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class AdminReportsDataAPI(View):
    def get(self, request):
        from django.db.models import Count, Q
        from django.utils import timezone
        from datetime import datetime, timedelta
        import calendar
        from adminside.repositories.all_repository import (
            EnrollmentFormRepository, ApplicationApprovedRepository, ApplicationPendingRepository,
            StudentInformationRepository, UserInformationRepository, TeacherInformationRepository,
            SectionRepository, SchoolYearRepository, EnrollmentManagementRepository,
            DocumentRepository, AssessmentRepository, FAQRepository, AnnouncementRepository
        )
        
        # Get school year filter
        school_year_filter = request.GET.get('school_year', None)
        
        # Get current date and time
        now = timezone.now()
        current_year = now.year
        current_month = now.month
        
        # Apply school year filter if provided
        enrollment_queryset = EnrollmentFormRepository.get_all()
        student_queryset = StudentInformationRepository.get_all()
        
        if school_year_filter and school_year_filter != 'all':
            enrollment_queryset = enrollment_queryset.filter(school_year=school_year_filter)
            student_queryset = student_queryset.filter(school_year=school_year_filter)
        
        # Get available school years for filter
        available_school_years = list(EnrollmentFormRepository.get_all().values_list('school_year', flat=True).distinct().exclude(school_year__isnull=True))
        
        # Basic counts using repositories
        total_applications = enrollment_queryset.count()
        approved_applications = ApplicationApprovedRepository.get_all().filter(enrollment__in=enrollment_queryset).count()
        pending_applications = ApplicationPendingRepository.get_all().filter(enrollment__in=enrollment_queryset).count()
        total_students = student_queryset.count()
        total_users = UserInformationRepository.get_all().count()
        
        # Application status distribution
        application_status_data = [
            {"value": approved_applications, "name": "Approved"},
            {"value": pending_applications, "name": "Pending"},
            {"value": total_applications - approved_applications - pending_applications, "name": "In Review"}
        ]
        
        # User role distribution using repositories
        user_role_data = [
            {"value": UserInformationRepository.get_all().filter(user_role="Student").count(), "name": "Students"},
            {"value": UserInformationRepository.get_all().filter(user_role="Teacher").count(), "name": "Teachers"},
            {"value": UserInformationRepository.get_all().filter(user_role="Coordinator").count(), "name": "Coordinators"},
            {"value": UserInformationRepository.get_all().filter(user_role="Administrator").count(), "name": "Administrators"},
            {"value": UserInformationRepository.get_all().filter(user_role="Applicant").count(), "name": "Applicants"}
        ]
        
        # Gender distribution
        gender_data = [
            {"value": student_queryset.filter(gender__iexact="MALE").count(), "name": "Male"},
            {"value": student_queryset.filter(gender__iexact="FEMALE").count(), "name": "Female"}
        ]
        
        # Enrollment type distribution
        enrollment_type_data = [
            {"value": student_queryset.filter(enrollment_type="JHS").count(), "name": "Junior High School"},
            {"value": student_queryset.filter(enrollment_type="SHS").count(), "name": "Senior High School"}
        ]
        
        # Student type distribution
        student_type_data = [
            {"value": student_queryset.filter(student_type="new student").count(), "name": "New Students"},
            {"value": student_queryset.filter(student_type="transferee").count(), "name": "Transferees"},
            {"value": student_queryset.filter(student_type="returning").count(), "name": "Returnees"}
        ]
        
        # Monthly application trends (last 12 months)
        monthly_trends = []
        for i in range(12):
            month_date = now - timedelta(days=30*i)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if i == 0:
                month_end = now
            else:
                next_month = month_start + timedelta(days=32)
                month_end = next_month.replace(day=1) - timedelta(days=1)
            
            count = enrollment_queryset.filter(
                created_at__gte=month_start,
                created_at__lte=month_end
            ).count()
            
            monthly_trends.append({
                "month": month_start.strftime("%b %Y"),
                "applications": count
            })
        
        monthly_trends.reverse()  # Show oldest to newest
        
        # Grade level distribution
        grade_level_data = []
        for grade in range(7, 13):  # Grades 7-12
            count = student_queryset.filter(grade=str(grade)).count()
            grade_level_data.append({
                "grade": f"Grade {grade}",
                "count": count
            })
        
        # Strand distribution (for SHS)
        strand_data = []
        strands = student_queryset.filter(enrollment_type="SHS").values_list('strand', flat=True).distinct()
        for strand in strands:
            if strand:
                count = student_queryset.filter(strand=strand).count()
                strand_data.append({
                    "strand": strand,
                    "count": count
                })
        
        # Application approval rate
        approval_rate = 0
        if total_applications > 0:
            approval_rate = round((approved_applications / total_applications) * 100, 2)
        
        # Recent activity (last 30 days) using repositories
        thirty_days_ago = now - timedelta(days=30)
        recent_applications = enrollment_queryset.filter(created_at__gte=thirty_days_ago).count()
        recent_approvals = ApplicationApprovedRepository.get_all().filter(enrollment__in=enrollment_queryset, created_at__gte=thirty_days_ago).count()
        
        # Early registration statistics
        early_reg_count = enrollment_queryset.filter(early_reg=True).count()
        regular_reg_count = total_applications - early_reg_count
        
        # Document submission statistics
        complete_docs = enrollment_queryset.filter(status="Complete").count()
        missing_docs = enrollment_queryset.filter(status="Missing").count()
        
        # Additional analytics based on models using repositories
        # Teacher analytics
        total_teachers = TeacherInformationRepository.get_all().count()
        active_teachers = TeacherInformationRepository.get_all().filter(user__is_active=True).count()
        
        # Section analytics
        total_sections = SectionRepository.get_all().count()
        active_sections = SectionRepository.get_all().filter(status="Active").count()
        completed_sections = SectionRepository.get_all().filter(status="Completed").count()
        
        # Student status analytics
        enrolled_students = student_queryset.filter(student_status="Enrolled").count()
        transferred_students = student_queryset.filter(student_status="Transferred").count()
        dropped_students = student_queryset.filter(student_status="Dropped").count()
        
        # Grade completion analytics
        jhs_completed = student_queryset.filter(jhs_completed=True).count()
        shs_completed = student_queryset.filter(shs_completed=True).count()
        
        # Early vs Regular registration
        early_registrations = enrollment_queryset.filter(early_reg=True).count()
        regular_registrations = enrollment_queryset.filter(early_reg=False).count()
        
        # Enrollment type breakdown
        jhs_enrollments = enrollment_queryset.filter(enrollment_type="JHS").count()
        shs_enrollments = enrollment_queryset.filter(enrollment_type="SHS").count()
        
        # Strand analytics (SHS only)
        abm_students = student_queryset.filter(strand="ABM").count()
        stem_students = student_queryset.filter(strand="STEM").count()
        
        # Semester analytics
        first_semester = enrollment_queryset.filter(semester="1st").count()
        second_semester = enrollment_queryset.filter(semester="2nd").count()
        
        # Age distribution
        age_groups = {
            "12-14": student_queryset.filter(age__gte=12, age__lte=14).count(),
            "15-17": student_queryset.filter(age__gte=15, age__lte=17).count(),
            "18-20": student_queryset.filter(age__gte=18, age__lte=20).count(),
            "21+": student_queryset.filter(age__gte=21).count()
        }
        
        # Grade level distribution for enrollment forms
        grade_distribution = {}
        for grade in range(7, 13):
            grade_distribution[f"Grade {grade}"] = enrollment_queryset.filter(grade_level=str(grade)).count()
        
        # Repository-specific analytics
        # Get all school years from repository
        school_years = SchoolYearRepository.get_all().values_list('name', flat=True)
        
        # Get enrollment management data
        enrollment_management = EnrollmentManagementRepository.get_all().first()
        enrollment_active = enrollment_management.enrollment_active if enrollment_management else False
        early_reg_active = enrollment_management.early_registration_active if enrollment_management else False
        
        # Get document statistics
        total_documents = DocumentRepository.get_all().count()
        required_documents = DocumentRepository.get_required_ids()
        
        # Get assessment statistics
        total_assessments = AssessmentRepository.get_all().count()
        assessed_count = AssessmentRepository.get_all_with_assessed().count()
        not_assessed_count = AssessmentRepository.get_all_with_not_assessed().count()
        
        # Get FAQ statistics
        total_faqs = FAQRepository.get_all().count()
        
        # Get announcement statistics
        total_announcements = AnnouncementRepository.get_all().count()
        active_announcements = AnnouncementRepository.get_all().filter(status="active").count()
        
        data = {
            "summary": {
                "total_applications": total_applications,
                "approved_applications": approved_applications,
                "pending_applications": pending_applications,
                "total_students": total_students,
                "total_users": total_users,
                "approval_rate": approval_rate,
                "recent_applications": recent_applications,
                "recent_approvals": recent_approvals,
                "total_teachers": total_teachers,
                "active_teachers": active_teachers,
                "total_sections": total_sections,
                "active_sections": active_sections
            },
            "application_status": application_status_data,
            "user_roles": user_role_data,
            "gender_distribution": gender_data,
            "enrollment_types": enrollment_type_data,
            "student_types": student_type_data,
            "monthly_trends": monthly_trends,
            "grade_levels": grade_level_data,
            "strands": strand_data,
            "registration_types": [
                {"value": early_reg_count, "name": "Early Registration"},
                {"value": regular_reg_count, "name": "Regular Registration"}
            ],
            "document_status": [
                {"value": complete_docs, "name": "Complete Documents"},
                {"value": missing_docs, "name": "Missing Documents"}
            ],
            "student_status": [
                {"value": enrolled_students, "name": "Enrolled"},
                {"value": transferred_students, "name": "Transferred"},
                {"value": dropped_students, "name": "Dropped"}
            ],
            "strand_distribution": [
                {"value": abm_students, "name": "ABM"},
                {"value": stem_students, "name": "STEM"}
            ],
            "semester_distribution": [
                {"value": first_semester, "name": "1st Semester"},
                {"value": second_semester, "name": "2nd Semester"}
            ],
            "age_groups": [
                {"value": age_groups["12-14"], "name": "12-14 years"},
                {"value": age_groups["15-17"], "name": "15-17 years"},
                {"value": age_groups["18-20"], "name": "18-20 years"},
                {"value": age_groups["21+"], "name": "21+ years"}
            ],
            "grade_distribution": [
                {"grade": grade, "count": count} for grade, count in grade_distribution.items()
            ],
            "completion_stats": {
                "jhs_completed": jhs_completed,
                "shs_completed": shs_completed
            },
            "section_stats": {
                "total_sections": total_sections,
                "active_sections": active_sections,
                "completed_sections": completed_sections
            },
            "teacher_stats": {
                "total_teachers": total_teachers,
                "active_teachers": active_teachers
            },
            "enrollment_management": {
                "enrollment_active": enrollment_active,
                "early_registration_active": early_reg_active
            },
            "document_stats": {
                "total_documents": total_documents,
                "required_documents_count": len(required_documents)
            },
            "assessment_stats": {
                "total_assessments": total_assessments,
                "assessed_count": assessed_count,
                "not_assessed_count": not_assessed_count,
                "assessment_rate": round((assessed_count / total_assessments * 100), 2) if total_assessments > 0 else 0
            },
            "content_stats": {
                "total_faqs": total_faqs,
                "total_announcements": total_announcements,
                "active_announcements": active_announcements
            },
            "available_school_years": available_school_years,
            "repository_school_years": list(school_years)
        }
        
        return JsonResponse(data)



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
    
# UPDATE STUDENT USER
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_admin)],
    name="dispatch",
)
class UpdateStudentInformationView(View):
    def post(self, request):
        response = StudentInformationService.update_student_information(request)
        return JsonResponse(response, safe=False)


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

