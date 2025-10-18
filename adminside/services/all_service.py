# services/enrollment_form_service.py
from asyncio.windows_events import NULL
from email import message
from email.mime import application
import json

from django.contrib.auth.base_user import password_validation
from django.db.models import Q, F, Case, When, Value, CharField
from django.forms import model_to_dict
from adminside.forms import AdminForm, AnnouncementForm, CoordinatorForm, EditAdminForm, EditAnnouncementForm, EditCoordinatorForm, EditFAQForm, EditOrganizationChartForm, EditTeacherForm, FAQForm, OrganizationChartForm, StudentForm, ApplicationForm as ApplicationFormValidation, TeacherForm
from adminside.repositories.all_repository import AdminInformationRepository, AnnouncementRepository, ApplicantInformationRepository, ApplicationApprovedRepository, ApplicationPendingRepository, AssessmentRepository, CoordinatorInformationRepository, DocumentListRepository, EnrollmentFormRepository, DocumentRepository, FAQRepository, OrganizationChartRepository, SectionRepository, StudentInformationRepository, StudentListHistoryRepository, TeacherInformationRepository, UserInformationRepository
import logging
from django.utils import timezone
from django.core.cache import cache
from threading import Thread
import uuid
from django.conf import settings
from adminside.utils import emailNotification
from authentication.models import MyUser
import os

from teacher.forms import InputFinalAverageForm

logger = logging.getLogger(__name__)


class EnrollmentFormService:
    @staticmethod
    def get_all_with_documents():
        return (
            EnrollmentFormRepository.get_all().filter(is_approved=None).prefetch_related("documents__document") 
        )
    
    @staticmethod
    def get_application_data_for_datatables(request, current_academic_year):
        #pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))
        
        #searching
        search_value = request.GET.get("search[value]", "")
        
        #sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")
        
        #filtering
        grade_level = request.GET.get("grade_level")
        student_type = request.GET.get("student_type")
        enrollment_type = request.GET.get("enrollment_type")
        early_reg = request.GET.get("early_reg")
        
        # Map DataTables column index -> model field
        column_map = {
            1: "application_no",
            2: "last_name",
            3: "student_type",
            4: "grade_level",
            5: "gen_avg",
            6: "created_at",
        }
        
        applications = EnrollmentFormService.get_all_with_documents().filter(school_year=current_academic_year.name)
        
        # Filtering
        if grade_level:
            applications = applications.filter(grade_level=grade_level)
        if student_type:
            applications = applications.filter(student_type=student_type)
        if enrollment_type:
            applications = applications.filter(enrollment_type=enrollment_type)
            
        if early_reg == "Yes":
            applications = applications.filter(early_reg=True)
        elif early_reg == "No":
            applications = applications.filter(early_reg=False)

        
        # Search filter
        if search_value:
            applications = applications.filter(
                Q(first_name__icontains=search_value) |
                Q(middle_name__icontains=search_value) |
                Q(last_name__icontains=search_value) |
                Q(application_no__icontains=search_value) |
                Q(lrn__icontains=search_value)
            )
        
        records_total = EnrollmentFormService.get_all_with_documents().count()
        records_filtered = applications.count()
        
        # Apply ordering
        if order_column and str(order_column).isdigit():
            col_index = int(order_column)
            if col_index in column_map:
                order_field = column_map[col_index]
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                applications = applications.order_by(order_field)
        
        # Pagination (slice)
        applications = applications[start:start+length]
        
        data = RequestHelper.convert_json_with_enrollment(applications)
        
        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }
    
    @staticmethod
    def update_application_data(request):
        try:
            enrollment_id = request.POST.get("id")
            if not enrollment_id:
                return {"success": False, "message": "Missing application ID."}
            
            enrollment = EnrollmentFormRepository.get_by_id(enrollment_id)
            if not enrollment:
                return {"success": False, "message": "Application not found."}
            
            form_data = request.POST.copy()
            
            form_data.update({
                "enrollment_type": enrollment.enrollment_type,
                "user_id": enrollment.user.id,
                "user_role": enrollment.user.user_role,
                "application_no": enrollment.application_no,
                "status": enrollment.status,
                "early_reg": enrollment.early_reg,
            })
            form = ApplicationFormValidation(form_data)
            if not form.is_valid():
                return {"success": False, "errors": form.errors}
            
            cleaned_data = form.cleaned_data

            enrollment.school_year = cleaned_data["school_year"]
            enrollment.grade_level = cleaned_data["grade_level"]
            enrollment.student_type = cleaned_data["student_type"]
            enrollment.semester = cleaned_data.get("semester")
            enrollment.strand = cleaned_data.get("strand")
            enrollment.gen_avg = cleaned_data["gen_avg"]
            enrollment.psa_no = cleaned_data["psa_no"]
            enrollment.lrn = cleaned_data["lrn"]
            enrollment.first_name = cleaned_data["first_name"]
            enrollment.middle_name = cleaned_data.get("middle_name")
            enrollment.last_name = cleaned_data["last_name"]
            enrollment.extension_name = cleaned_data.get("extension_name")
            enrollment.birth_date = cleaned_data["birth_date"]
            enrollment.age = cleaned_data["age"]
            enrollment.gender = cleaned_data["gender"]
            enrollment.place_of_birth = cleaned_data["place_of_birth"]
            enrollment.mother_tongue = cleaned_data["mother_tongue"]
            enrollment.save()

            documents = request.POST.getlist("documents")
            submitted_ids = set(int(doc_id) for doc_id in documents)
            existing_docs = set(DocumentListRepository.get_document_ids_by_enrollment(enrollment.id))
            for doc_id in existing_docs - submitted_ids:
                DocumentListRepository.delete_by_enrollment_and_document(enrollment.id, doc_id)
            for doc_id in submitted_ids - existing_docs:
                DocumentListRepository.create(enrollment=enrollment, document_id=doc_id)
            current_docs = set(DocumentListRepository.get_document_ids_by_enrollment(enrollment.id))

            required_ids = set(DocumentRepository.get_required_ids())
            if required_ids.issubset(current_docs):
                enrollment.status = "Complete"
            else:
                enrollment.status = "Missing"
            enrollment.save()

            return {
                "success": True,
                "message": "Application updated successfully.",
                "status": enrollment.status,
            }

        except Exception as e:
            return {"success": False, "message": str(e)}


class ApplicationApprovedService:
    
    @staticmethod
    def get_application_data_for_datatables(request, current_academic_year):
        #pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))
        
        #searching
        search_value = request.GET.get("search[value]", "")
        
        #sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")
        
        #filtering
        grade_level = request.GET.get("grade_level")
        student_type = request.GET.get("student_type")
        enrollment_type = request.GET.get("enrollment_type")
        early_reg = request.GET.get("early_reg")
        
        # Map DataTables column index -> model field
        column_map = {
            1: "enrollment__application_no",
            2: "enrollment__last_name",
            3: "enrollment__student_type",
            4: "enrollment__grade_level",
            5: "enrollment__gen_avg",
            6: "enrollment__created_at",
        }
        
        applications = ApplicationApprovedRepository.get_all_with_enrollment().filter(enrollment__school_year=current_academic_year.name).prefetch_related("enrollment__documents")
        
        # Filtering
        if grade_level:
            applications = applications.filter(enrollment__grade_level=grade_level)
        if student_type:
            applications = applications.filter(enrollment__student_type=student_type)
        if enrollment_type:
            applications = applications.filter(enrollment__enrollment_type=enrollment_type)
            
        if early_reg == "Yes":
            applications = applications.filter(enrollment__early_reg=True)
        elif early_reg == "No":
            applications = applications.filter(enrollment__early_reg=False)

        
        # Search filter
        if search_value:
            applications = applications.filter(
                Q(enrollment__first_name__icontains=search_value) |
                Q(enrollment__middle_name__icontains=search_value) |
                Q(enrollment__last_name__icontains=search_value) |
                Q(enrollment__application_no__icontains=search_value) |
                Q(enrollment__lrn__icontains=search_value)
            )
            
        records_total = ApplicationApprovedRepository.get_all_with_enrollment().count()
        records_filtered = applications.count()
        
        # Apply ordering
        if order_column and str(order_column).isdigit():
            col_index = int(order_column)
            if col_index in column_map:
                order_field = column_map[col_index]
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                applications = applications.order_by(order_field)
        
        # Pagination (slice)
        applications = applications[start:start+length]
        
        data = RequestHelper.convert_json(applications)
        
        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }

    @staticmethod
    def action_application_approved(request):
        try:
            application_id = request.POST.get("application_id")
            application = EnrollmentFormRepository.get_by_id(application_id)
            documents = DocumentListRepository.get_document_ids_by_enrollment(application.id)

            if not application:
                return {"success": False, "message": "Application not found."}
            
            if application.status == "Missing":
                return {"success": False, "message": "Application cannot be approved while status is 'Missing'."}
            
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
                        "enrollment_status": "PASSED",
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
            
            # Send email notification
            emailNotification(application.first_name, application.last_name, application.application_no, application.user.email, "approved")
            
            return {"success": True, "message": "Application approved successfully and email was sent."}
        
        except Exception as e:
            return {"success": False, "message": str(e)}
        
    @staticmethod
    def bulk_approve_application(request):
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
                                    "enrollment_status": "PASSED",
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
                        
                    except EnrollmentFormRepository.DoesNotExist:
                        skipped.append(application_id)
                        continue
                        
                        
                Thread(target=process_bulk).start()
                return {"success": True, "batch_key": batch_key, "total": total}

        except Exception as e:
            return {"success": False, "message": str(e)}


class ApplicationPendingService:
    @staticmethod
    def get_application_data_for_datatables(request, current_academic_year):
        #pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))
        
        #searching
        search_value = request.GET.get("search[value]", "")
        
        #sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")
        
        #filtering
        grade_level = request.GET.get("grade_level")
        student_type = request.GET.get("student_type")
        enrollment_type = request.GET.get("enrollment_type")
        early_reg = request.GET.get("early_reg")
        
                # Map DataTables column index -> model field
        column_map = {
            1: "enrollment__application_no",
            2: "enrollment__last_name",
            3: "enrollment__student_type",
            4: "enrollment__grade_level",
            5: "enrollment__gen_avg",
            6: "enrollment__created_at",
        }
        
        applications = (
            ApplicationPendingRepository.get_all_with_enrollment().filter(enrollment__school_year=current_academic_year.name)
            .filter(Q(is_reapproved=False) | Q(is_reapproved__isnull=True))
            .prefetch_related("enrollment__documents")
        )
        
        # Filtering
        if grade_level:
            applications = applications.filter(enrollment__grade_level=grade_level)
        if student_type:
            applications = applications.filter(enrollment__student_type=student_type)
        if enrollment_type:
            applications = applications.filter(enrollment__enrollment_type=enrollment_type)
            
        if early_reg == "Yes":
            applications = applications.filter(enrollment__early_reg=True)
        elif early_reg == "No":
            applications = applications.filter(enrollment__early_reg=False)

        
        # Search filter
        if search_value:
            applications = applications.filter(
                Q(enrollment__first_name__icontains=search_value) |
                Q(enrollment__middle_name__icontains=search_value) |
                Q(enrollment__last_name__icontains=search_value) |
                Q(enrollment__application_no__icontains=search_value) |
                Q(enrollment__lrn__icontains=search_value)
            )
            
        records_total = ApplicationPendingRepository.get_all_with_enrollment().count()
        records_filtered = applications.count()
        
        # Apply ordering
        if order_column and str(order_column).isdigit():
            col_index = int(order_column)
            if col_index in column_map:
                order_field = column_map[col_index]
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                applications = applications.order_by(order_field)
        
        # Pagination (slice)
        applications = applications[start:start+length]
        
        data = RequestHelper.convert_json(applications)
        
        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }

        
    @staticmethod
    def action_application_pending(request):
        try:
            # logger.info(f"Received application_id: {request.POST.get('application_id')}, message_pending: {request.POST.get('message_pending')}")
            application_id = request.POST.get("application_id")
            message_pending = request.POST.get("message_pending")
            application = EnrollmentFormRepository.get_by_id(application_id)
            if not application:
                return {"success": False, "message": "Application not found."}
            
            ApplicationPendingRepository.create(
                enrollment=application,
                message_pending=message_pending,
            )

            user = application.user
            if application.enrollment_type == "SHS":
                user.shs_submitted = False
            elif application.enrollment_type == "JHS":
                user.jhs_submitted = False
            user.save()
            
            # Mark as pending
            application.is_approved = False
            application.save()
            
            # Send email notification
            emailNotification(application.first_name, application.last_name, application.application_no, application.user.email, "pending", message_pending)
            
            return {"success": True, "message": "Application pending successfully and email was sent."}
        
        except Exception as e:
            return {"success": False, "message": str(e)}
        
    @staticmethod
    def reapprove_application(request):
        try:
            application_id = request.POST.get("application_id")
            if not application_id:
                return {"success": False, "message": "Application ID is required."}
            
            # Get the pending application
            application_pending = ApplicationPendingRepository.get_by_id(application_id)
            if not application_pending:
                return {"success": False, "message": "Pending application not found."}
            
            # Get the enrollment form
            application = EnrollmentFormRepository.get_by_id(application_pending.enrollment_id)
            if not application:
                return {"success": False, "message": "Enrollment form not found."}
            
            # Create ApplicationApproved record
            application_approved = ApplicationApprovedRepository.create(
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
                        "submission_remarks": application_pending.message_pending,
                        "enrollment_status": "PASSED",
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
            
            # Send email notification
            emailNotification(
                application.first_name,
                application.last_name,
                application.application_no,
                application.user.email,
                "approved"
            )
            
            application_pending.is_reapproved = True
            application_pending.updated_at = timezone.now()
            application_pending.save()
            
            return {
                "success": True,
                "message": "Application re-approved successfully and email was sent."
            }
            
        except Exception as e:
            logger.error(f"Error re-approving application: {e}")
            return {"success": False, "message": "An error occurred while re-approving the application."}
    
    @staticmethod
    def update_message_pending(request):
        try:
            data = request.POST
            id = data.get("id")
            applicationPending = ApplicationPendingRepository.get_by_id(id)
            if data.get("message_pending"):
                applicationPending.message_pending = data.get("message_pending")
            applicationPending.updated_at = timezone.now()
            applicationPending.save()
            return {"success": True, "message": "Pending reason updated successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}
        

class RequestHelper:
    @staticmethod
    def extract_filters(request, allowed_keys: list) -> dict:
        return {key: request.GET.get(key) for key in allowed_keys if request.GET.get(key)}
    
    
    @staticmethod
    def convert_json_with_enrollment(applications):
        data = []
        for enrollment in applications:
            enrollment_data = model_to_dict(enrollment)

            documents = DocumentListRepository.get_by_enrollment(enrollment.id)
            enrollment_data["documents"] = [
                {
                    "id": doc.id,
                    "document_id": doc.document_id,
                    "document_name": doc.document.document_name if doc.document else None,
                    "is_required": doc.document.is_required if doc.document else None,
                }
                for doc in documents
            ]

            data.append(enrollment_data)
        return data
    
    @staticmethod
    def convert_json(applications):
        data = []
        for app in applications:
            app_data = model_to_dict(app)
            enrollment = app.enrollment
            app_data["enrollment"] = model_to_dict(enrollment)

            documents = DocumentListRepository.get_by_enrollment(enrollment.id)
            app_data["documents"] = [
                {
                    "id": doc.id,
                    "document_id": doc.document_id,
                    "document_name": doc.document.document_name if doc.document else None,
                    "is_required": doc.document.is_required if doc.document else None,
                }
                for doc in documents
            ]

            data.append(app_data)

        return data



class DocumentListService:
    @staticmethod
    def get_documents_for_enrollment(enrollment_id: int):
        return DocumentListRepository.get_by_enrollment(enrollment_id)
        
        
class UserInformationService:
    @staticmethod
    def get_all_users():
        return UserInformationRepository.get_all()
    
    @staticmethod
    def get_user_by_id(user_id: int):
        return UserInformationRepository.get_by_user(user_id)

    @staticmethod
    def get_user_for_datatables(request):
        # Pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))

        # Searching
        search_value = request.GET.get("search[value]", "").strip()

        # Sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")

        # Filtering
        user_role = request.GET.get("user_role")
        is_active = request.GET.get("is_active")

        # Base queryset
        users = UserInformationRepository.get_all().annotate(
            display_name=Case(
                When(user_role="Administrator", then=F("admininformation__first_name")),
                When(user_role="Teacher", then=F("teacherinformation__first_name")),
                When(user_role="Coordinator", then=F("coordinatorinformation__first_name")),
                When(user_role="Applicant", then=F("applicantinformation__first_name")),
                When(user_role="Student", then=F("studentinformation__first_name")),
                default=Value(""),
                output_field=CharField(),
            ),
            display_last_name=Case(
                When(user_role="Administrator", then=F("admininformation__last_name")),
                When(user_role="Teacher", then=F("teacherinformation__last_name")),
                When(user_role="Coordinator", then=F("coordinatorinformation__last_name")),
                When(user_role="Applicant", then=F("applicantinformation__last_name")),
                When(user_role="Student", then=F("studentinformation__last_name")),
                default=Value(""),
                output_field=CharField(),
            ),
        )

        # Filtering by role
        if user_role:
            users = users.filter(user_role=user_role)

        # Filtering by active status
        if is_active == "Yes":
            users = users.filter(is_active=True)
        elif is_active == "No":
            users = users.filter(is_active=False)

        # Search filter
        if search_value:
            users = users.filter(
                Q(display_name__icontains=search_value) |
                Q(display_last_name__icontains=search_value) |
                Q(email__icontains=search_value) |
                Q(user_role__icontains=search_value)
            ).distinct()

        # Sorting map (match your DataTable columns)
        column_map = {
            0: None,              
            1: "display_name",    
            2: "email",
            3: "user_role",       
            4: "created_at",      
            5: "updated_at",     
            6: "is_active",       
            7: None,
        }

        # Apply sorting
        if order_column and order_column.isdigit():
            col_index = int(order_column)
            order_field = column_map.get(col_index)
            if order_field:
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                users = users.order_by(order_field)
            else:
                users = users.order_by("-created_at")

        # Count total & filtered records
        records_total = UserInformationRepository.get_all().count()
        records_filtered = users.count()

        # Pagination
        users = users[start:start + length]

        # response data
        data = []
        for user in users:
            full_name = f"{user.display_name or ''} {user.display_last_name or ''}".strip()
            data.append({
                "id": user.id,
                "name": full_name or "N/A",
                "email": user.email,
                "user_role": user.user_role,
                "created_at": user.created_at,
                "updated_at": user.updated_at,
                "is_active": user.is_active,
                "deactivated": user.deactivated,
            })

        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }
        
    @staticmethod
    def change_password(request):
        try:
            logger.info(request.POST)
            user_id = request.POST.get("user_id")
            current_password = request.POST.get("current_password")
            new_password = request.POST.get("new_password")
            confirm_password = request.POST.get("confirm_password")
            user = UserInformationRepository.get_by_user(user_id).first()
            if not user:
                return {"success": False, "message": "User not found."}
            
            if not user.check_password(current_password):
                return {"success": False, "message": "Current password is incorrect."}
            
            if new_password != confirm_password:
                return {"success": False, "message": "Passwords do not match."}
            
            user.set_password(new_password)
            user.save()
            
            return {"success": True, "message": "Password changed successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}
        
    @staticmethod
    def change_user_status(request):
        try:
            user_id = request.POST.get("user_id")
            is_active = request.POST.get("is_active")
            user = UserInformationRepository.get_by_user(user_id).first()
            if not user:
                return {"success": False, "message": "User not found."}
            
            if user.deactivated:
                user.deactivated = False
                user.save()
                return {"success": True, "message": "User activated successfully."}
            else:
                user.deactivated = True
                user.save()
                return {"success": True, "message": "User deactivated successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}


class StudentInformationService:
    @staticmethod
    def get_all_with_documents():
        return StudentInformationRepository.get_all().prefetch_related("documents")
    
    @staticmethod
    def get_student_information_for_datatables(request):
        #pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))

        #searching
        search_value = request.GET.get("search[value]", "")
        

        #sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")

        #filtering
        student_status = request.GET.get("student_status")
        is_active = request.GET.get("is_active")

        
        students = StudentInformationService.get_all_with_documents().select_related("user")
        
        #Filtering
        if student_status:
            students = students.filter(student_status=student_status)
        if is_active:
            if is_active == "Yes":
                students = students.filter(user__is_active=True)
            elif is_active == "No":
                students = students.filter(user__is_active=False)
        
        # Search filter
        if search_value:
            students = students.filter(
                Q(first_name__icontains=search_value) |
                Q(middle_name__icontains=search_value) |
                Q(last_name__icontains=search_value) |
                Q(lrn__icontains=search_value) |
                Q(user__email__icontains=search_value)
            )
            
        
        records_total = StudentInformationService.get_all_with_documents().count()
        records_filtered = students.count()
        
        #Map DataTables column index -> model field
        column_map = {
            0: None,
            1: "lrn",
            2: "last_name",
            3: "user__email",
            4: "user__user_role",
            5: "student_status",
            6: "user__is_active",
            7: None,
        }
        
        # Apply ordering
        if order_column and str(order_column).isdigit():
            col_index = int(order_column)
            order_field = column_map.get(col_index)
            if order_field:
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                students = students.order_by(order_field)
        
        # Pagination (slice)
        students = students[start:start+length]
        
        data = []
        for student in students:
            documents = DocumentListRepository.get_by_student(student.id)
            student_data = model_to_dict(student)
            student_data["user"] = {
                "id": student.user.id,
                "email": student.user.email,
                "user_role": student.user.user_role,
                "created_at": student.user.created_at,
                "updated_at": student.user.updated_at,
                "is_active": student.user.is_active,
                "deactivated": student.user.deactivated,
            }
            student_data["documents"] = [   
                {
                    "id": doc.id,
                    "document_id": doc.document_id,
                    "document_name": doc.document.document_name if doc.document else None,
                    "is_required": doc.document.is_required if doc.document else None,
                }
                for doc in documents
            ]
            data.append(student_data)

        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }
    
    @staticmethod
    def get_student_information_by_id(student_id: int):
        return StudentInformationRepository.get_by_id(student_id)
    
    @staticmethod
    def edit_student_status(request):
        try:
            student_id = request.POST.get("student_id")
            student_status = request.POST.get("student_status")
            if student_status not in ["Enrolled", "Transferred", "Dropped"]:
                return {"success": False, "message": "Invalid student status."}
            student = StudentInformationRepository.get_by_id(student_id)
            student.student_status = student_status
            student.save()
            return {"success": True, "message": "Student status has been updated."}
        except Exception as e:
            return {"success": False, "message": str(e)}
        
    @staticmethod
    def add_student_user(request):
        try:
            data = request.POST
            form = StudentForm(data)
            if not form.is_valid():
                return {"success": False, "message": form.errors}
            cleaned = form.cleaned_data
            user = MyUser.objects.create_user(
                email=cleaned["email"],
                password=cleaned["password"],
                user_role="Student",
            )
            student = StudentInformationRepository.create(
                user=user,
                lrn=cleaned["lrn"],
                psa_no=cleaned["psa_no"],
                first_name=cleaned["first_name"],
                middle_name=cleaned.get("middle_name",""),
                last_name=cleaned["last_name"],
                extension_name=cleaned.get("extension_name",""),
                enrollment_type=cleaned["enrollment_type"],
                student_type=cleaned["student_type"],
                school_year=cleaned["school_year"],
                grade=cleaned["grade_level"],
                gen_avg=cleaned["gen_avg"],
                section=None,
                semester=cleaned.get("semester"),
                strand=cleaned.get("strand"),
                birth_date=cleaned["birth_date"],
                age=cleaned["age"],
                gender=cleaned["gender"],
                place_of_birth=cleaned["place_of_birth"],
                mother_tongue=cleaned["mother_tongue"],
                student_status="Enrolled",
            )
            user.updated_at = timezone.now()
            user.save()
            
            documents = request.POST.getlist("documents")
            submitted_ids = set(int(doc_id) for doc_id in documents)
            existing_docs = set(DocumentListRepository.get_document_ids_by_enrollment(student.id))
            for doc_id in existing_docs - submitted_ids:
                DocumentListRepository.delete_by_enrollment_and_document(student.id, doc_id)
            for doc_id in submitted_ids - existing_docs:
                DocumentListRepository.create(document_id=doc_id, student_information=student)
            current_docs = set(DocumentListRepository.get_document_ids_by_enrollment(student.id))
            required_ids = set(DocumentRepository.get_required_ids())
            if required_ids.issubset(current_docs):
                student.status = "Complete"
            else:
                student.status = "Missing"
            student.save()
            return {"success": True, "message": "Student user created successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    @staticmethod
    def update_student_information(request):
        try:
            student_id = request.POST.get("id")
            if not student_id:
                return {"success": False, "message": "Missing student ID."}
            
            student = StudentInformationRepository.get_by_id(student_id)
            if not student:
                return {"success": False, "message": "Student not found."}
            
            form_data = request.POST.copy()
            
            form_data.update({
                "enrollment_type": student.enrollment_type,
                "user_id": student.user.id,
                "user_role": student.user.user_role,
                "application_no": student.application_no if student.application_no else "",
                "status": student.status,
                "early_reg": student.early_reg,
            })
            
            # Create a form similar to ApplicationForm but for student updates
            form = ApplicationFormValidation(form_data)
            if not form.is_valid():
                return {"success": False, "errors": form.errors}
            
            cleaned_data = form.cleaned_data

            # Update student information
            student.school_year = cleaned_data["school_year"]
            student.grade = cleaned_data["grade_level"]
            student.student_type = cleaned_data["student_type"]
            student.semester = cleaned_data.get("semester")
            student.strand = cleaned_data.get("strand")
            student.gen_avg = cleaned_data["gen_avg"]
            student.psa_no = cleaned_data["psa_no"]
            student.lrn = cleaned_data["lrn"]
            student.first_name = cleaned_data["first_name"]
            student.middle_name = cleaned_data.get("middle_name")
            student.last_name = cleaned_data["last_name"]
            student.extension_name = cleaned_data.get("extension_name")
            student.birth_date = cleaned_data["birth_date"]
            student.age = cleaned_data["age"]
            student.gender = cleaned_data["gender"]
            student.place_of_birth = cleaned_data["place_of_birth"]
            student.mother_tongue = cleaned_data["mother_tongue"]
            
            # Update submission remarks if provided
            submission_remarks = request.POST.get("submission_remarks")
            if submission_remarks:
                student.submission_remarks = submission_remarks
            
            student.save()

            # Handle documents
            documents = request.POST.getlist("documents")
            submitted_ids = set(int(doc_id) for doc_id in documents)
            existing_docs = set(DocumentListRepository.get_document_ids_by_student(student.id))
            for doc_id in existing_docs - submitted_ids:
                DocumentListRepository.delete_by_student_and_document(student.id, doc_id)
            for doc_id in submitted_ids - existing_docs:
                DocumentListRepository.create(document_id=doc_id, student_information=student)
            current_docs = set(DocumentListRepository.get_document_ids_by_student(student.id))

            required_ids = set(DocumentRepository.get_required_ids())
            if required_ids.issubset(current_docs):
                student.status = "Complete"
            else:
                student.status = "Missing"
            student.save()

            return {
                "success": True,
                "message": "Student information updated successfully.",
                "status": student.status,
            }

        except Exception as e:
            return {"success": False, "message": str(e)}
    
    @staticmethod
    def get_student_unassigned_list_for_datatables(request, grade, school_year):
        #pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))
        
        #searching
        search_value = request.GET.get("search[value]", "")
        
        #sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")
        
        #filtering
        gender = request.GET.get("gender")
        general_average = request.GET.get("general_average")
        
        students = StudentInformationRepository.get_all_by_grade(grade).filter(section__isnull=True, student_status="Enrolled", user__deactivated=False, school_year=school_year.name).select_related("user")
        
        #apply filtering
        if gender:
            students = students.filter(gender=gender)
        if general_average:
            if general_average == ">95":
                students = students.filter(gen_avg__gt=95)
            elif general_average == "95>90":
                students = students.filter(gen_avg__lte=95, gen_avg__gt=90)
            elif general_average == "90>85":
                students = students.filter(gen_avg__lte=90, gen_avg__gt=85)
            elif general_average == "85>80":
                students = students.filter(gen_avg__lte=85, gen_avg__gt=80)
            elif general_average == "80>=75":
                students = students.filter(gen_avg__lte=80, gen_avg__gte=75)
        
        #Search filter
        if search_value:
            students = students.filter(
                Q(first_name__icontains=search_value) |
                Q(middle_name__icontains=search_value) |
                Q(last_name__icontains=search_value) |
                Q(lrn__icontains=search_value) |
                Q(user__email__icontains=search_value)
            )
        
        records_total = StudentInformationRepository.get_all().count()
        records_filtered = students.count()
        
        #Map DataTables column index -> model field
        column_map = {
            0: None,
            1: "lrn",
            2: "last_name",
            3: "school_year",
            4: "grade",
            5: "section",
            6: "gen_avg",
            7: "gender",
            8: "student_status",
            9: "created_at",
            10: None,
        }
        
        #Apply ordering
        if order_column and str(order_column).isdigit():
            col_index = int(order_column)
            order_field = column_map.get(col_index)
            if order_field:
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                students = students.order_by(order_field)
        
        #Pagination (slice)
        students = students[start:start+length]
        
        data = []
        for student in students:
            documents = DocumentListRepository.get_by_student(student.id)
            student_data = model_to_dict(student)
            student_data["user"] = {
                "id": student.user.id,
                "email": student.user.email,
                "user_role": student.user.user_role,
                "created_at": student.user.created_at,
                "updated_at": student.user.updated_at,
                "is_active": student.user.is_active,
                "deactivated": student.user.deactivated,
            }
            student_data["documents"] = [   
                {
                    "id": doc.id,
                    "document_id": doc.document_id,
                    "document_name": doc.document.document_name if doc.document else None,
                    "is_required": doc.document.is_required if doc.document else None,
                }
                for doc in documents
            ]
            data.append(student_data)
            
        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }
    

class TeacherInformationService:
    @staticmethod
    def get_teacher_information_for_datatables(request):
        #pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))

        #searching
        search_value = request.GET.get("search[value]", "")
        
        #sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")
        
        #filtering
        is_active = request.GET.get("is_active")
        
        teachers = TeacherInformationRepository.get_all().select_related("user")
        
        #Filtering
        if is_active:
            if is_active == "Yes":
                teachers = teachers.filter(user__is_active=True)
            elif is_active == "No":
                teachers = teachers.filter(user__is_active=False)
        
        #Search filter
        if search_value:
            teachers = teachers.filter(
                Q(first_name__icontains=search_value) |
                Q(middle_name__icontains=search_value) |
                Q(last_name__icontains=search_value) |
                Q(user__email__icontains=search_value)
            )
        
        records_total = TeacherInformationRepository.get_all().count()
        records_filtered = teachers.count()
        
        #Map DataTables column index -> model field
        column_map = {
            0: None,
            1: "last_name",
            2: "user__email",
            3: "user__user_role",
            4: "user__created_at",
            5: "user__updated_at",
            5: "user__is_active",
            6: None,
        }
        
        #Apply ordering
        if order_column and str(order_column).isdigit():
            col_index = int(order_column)
            order_field = column_map.get(col_index)
            if order_field:
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                teachers = teachers.order_by(order_field)
        
        #Pagination (slice)
        teachers = teachers[start:start+length]
        
        data = []
        for teacher in teachers:
            teacher_data = model_to_dict(teacher)
            teacher_data["user"] = {
                "id": teacher.user.id,
                "email": teacher.user.email,
                "user_role": teacher.user.user_role,
                "created_at": teacher.user.created_at,
                "updated_at": teacher.user.updated_at,
                "is_active": teacher.user.is_active,
                "deactivated": teacher.user.deactivated,
            }
            data.append(teacher_data)
        
        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }
        
    @staticmethod
    def add_teacher_user(request):
        try:
            data = request.POST
            form = TeacherForm(data)
            if not form.is_valid():
                return {"success": False, "message": form.errors}
            cleaned = form.cleaned_data
            user = MyUser.objects.create_user(
                email=cleaned["email"],
                password=cleaned["password"],
                user_role="Teacher",
            )
            TeacherInformationRepository.create(
                user=user,
                first_name=cleaned["first_name"],
                middle_name=cleaned.get("middle_name",""),
                last_name=cleaned["last_name"],
                position=cleaned["position"],
                grade_level=cleaned["grade_level"],
            )
            user.updated_at = timezone.now()
            user.save()
            return {"success": True, "message": "Teacher user created successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    @staticmethod
    def edit_teacher_user(request):
        try:
            data = request.POST
            teacher_id = data.get("teacher_id")
            teacher = TeacherInformationRepository.get_by_id(teacher_id)

            form = EditTeacherForm(data, user_id=teacher.user.id)

            if not form.is_valid():
                return {"success": False, "message": form.errors}

            cleaned = form.cleaned_data

            teacher.first_name = cleaned["first_name"]
            teacher.middle_name = cleaned.get("middle_name", "")
            teacher.last_name = cleaned["last_name"]
            teacher.position = cleaned["position"]
            teacher.grade_level = cleaned["grade_level"]
            teacher.save()

            if teacher.user.email != cleaned["email"]:
                teacher.user.email = cleaned["email"]
                teacher.user.save()

            return {"success": True, "message": "Teacher user updated successfully."}

        except Exception as e:
            return {"success": False, "message": str(e)}

class CoordinatorInformationService:
    @staticmethod
    def get_coordinator_information_for_datatables(request):
        #pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))

        #searching
        search_value = request.GET.get("search[value]", "")
        
        #sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")
        
        #filtering
        is_active = request.GET.get("is_active")
        
        coordinators = CoordinatorInformationRepository.get_all().select_related("user")
        
        #Filtering
        if is_active:
            if is_active == "Yes":
                coordinators = coordinators.filter(user__is_active=True)
            elif is_active == "No":
                coordinators = coordinators.filter(user__is_active=False)
        
        #Search filter
        if search_value:
            coordinators = coordinators.filter(
                Q(first_name__icontains=search_value) |
                Q(middle_name__icontains=search_value) |
                Q(last_name__icontains=search_value) |
                Q(user__email__icontains=search_value)
            )
        
        records_total = CoordinatorInformationRepository.get_all().count()
        records_filtered = coordinators.count()
        
        #Map DataTables column index -> model field
        column_map = {
            0: None,
            1: "last_name",
            2: "user__email",
            3: "user__user_role",
            4: "user__created_at",
            5: "user__updated_at",
            5: "user__is_active",
            6: None,
        }
        
        #Apply ordering
        if order_column and str(order_column).isdigit():
            col_index = int(order_column)
            order_field = column_map.get(col_index)
            if order_field:
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                coordinators = coordinators.order_by(order_field)
        
        #Pagination (slice)
        coordinators = coordinators[start:start+length]
        
        data = []
        for coordinator in coordinators:
            coordinator_data = model_to_dict(coordinator)
            coordinator_data["user"] = {
                "id": coordinator.user.id,
                "email": coordinator.user.email,
                "user_role": coordinator.user.user_role,
                "created_at": coordinator.user.created_at,
                "updated_at": coordinator.user.updated_at,
                "is_active": coordinator.user.is_active,
                "deactivated": coordinator.user.deactivated,
            }
            data.append(coordinator_data)
        
        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }
    
    @staticmethod
    def add_coordinator_user(request):
        try:
            data = request.POST
            form = CoordinatorForm(data)
            if not form.is_valid():
                return {"success": False, "message": form.errors}
            cleaned = form.cleaned_data
            user = MyUser.objects.create_user(
                email=cleaned["email"],
                password=cleaned["password"],
                user_role="Coordinator",
            )
            CoordinatorInformationRepository.create(
                user=user,
                first_name=cleaned["first_name"],
                middle_name=cleaned.get("middle_name",""),
                last_name=cleaned["last_name"],
                position=cleaned["position"],
            )
            user.updated_at = timezone.now()
            user.save()
            return {"success": True, "message": "Coordinator user created successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    @staticmethod
    def edit_coordinator_user(request):
        try:
            data = request.POST
            coordinator_id = data.get("coordinator_id")
            coordinator = CoordinatorInformationRepository.get_by_id(coordinator_id)

            form = EditCoordinatorForm(data, user_id=coordinator.user.id)

            if not form.is_valid():
                return {"success": False, "message": form.errors}

            cleaned = form.cleaned_data

            coordinator.first_name = cleaned["first_name"]
            coordinator.middle_name = cleaned.get("middle_name", "")
            coordinator.last_name = cleaned["last_name"]
            coordinator.position = cleaned["position"]
            coordinator.save()

            if coordinator.user.email != cleaned["email"]:
                coordinator.user.email = cleaned["email"]
                coordinator.user.save()

            return {"success": True, "message": "Coordinator user updated successfully."}

        except Exception as e:
            return {"success": False, "message": str(e)}
    
    
class AdminInformationService:
    @staticmethod
    def get_admin_information_for_datatables(request):
        #pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))

        #searching
        search_value = request.GET.get("search[value]", "")
        
        #sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")
        
        #filtering
        is_active = request.GET.get("is_active")
        
        admins = AdminInformationRepository.get_all().select_related("user")
        
        #Filtering
        if is_active:
            if is_active == "Yes":
                admins = admins.filter(user__is_active=True)
            elif is_active == "No":
                admins = admins.filter(user__is_active=False)
        
        #Search filter
        if search_value:
            admins = admins.filter(
                Q(first_name__icontains=search_value) |
                Q(middle_name__icontains=search_value) |
                Q(last_name__icontains=search_value) |
                Q(user__email__icontains=search_value)
            )
        
        records_total = AdminInformationRepository.get_all().count()
        records_filtered = admins.count()
        
        #Map DataTables column index -> model field
        column_map = {
            0: None,
            1: "last_name",
            2: "user__email",
            3: "user__user_role",
            4: "user__created_at",
            5: "user__updated_at",
            5: "user__is_active",
            6: None,
        }
        
        #Apply ordering
        if order_column and str(order_column).isdigit():
            col_index = int(order_column)
            order_field = column_map.get(col_index)
            if order_field:
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                admins = admins.order_by(order_field)
        
        #Pagination (slice)
        admins = admins[start:start+length]
        
        data = []
        for admin in admins:
            admin_data = model_to_dict(admin)
            admin_data["user"] = {
                "id": admin.user.id,
                "email": admin.user.email,
                "user_role": admin.user.user_role,
                "created_at": admin.user.created_at,
                "updated_at": admin.user.updated_at,
                "is_active": admin.user.is_active,
                "deactivated": admin.user.deactivated,
            }
            data.append(admin_data)
        
        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }
    
    @staticmethod
    def add_admin_user(request):
        try:
            data = request.POST
            form = AdminForm(data)
            if not form.is_valid():
                return {"success": False, "message": form.errors}
            cleaned = form.cleaned_data
            user = MyUser.objects.create_user(
                email=cleaned["email"],
                password=cleaned["password"],
                user_role="Administrator",
            )
            AdminInformationRepository.create(
                user=user,
                first_name=cleaned["first_name"],
                middle_name=cleaned.get("middle_name",""),
                last_name=cleaned["last_name"],
                position=cleaned["position"],
            )
            user.updated_at = timezone.now()
            user.save()
            return {"success": True, "message": "Admin user created successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}
        
    @staticmethod
    def edit_admin_user(request):
        try:
            data = request.POST
            admin_id = data.get("admin_id")
            admin = AdminInformationRepository.get_by_id(admin_id)

            form = EditAdminForm(data, user_id=admin.user.id)

            if not form.is_valid():
                return {"success": False, "message": form.errors}

            cleaned = form.cleaned_data

            admin.first_name = cleaned["first_name"]
            admin.middle_name = cleaned.get("middle_name", "")
            admin.last_name = cleaned["last_name"]
            admin.position = cleaned["position"]
            admin.save()
            
            if admin.user.email != cleaned["email"]:
                admin.user.email = cleaned["email"]
                admin.user.save()
            
            return {"success": True, "message": "Admin user updated successfully."}

        except Exception as e:
            return {"success": False, "message": str(e)}
        
        
class AnnouncementService:
    @staticmethod
    def get_announcement_for_datatables(request):
        #pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))
        
        #searching
        search_value = request.GET.get("search[value]", "")
        
        #sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")
        
        #filtering
        status = request.GET.get("status")
        
        announcements = AnnouncementRepository.get_all().order_by("-created_at")
        
        #Apply filtering
        if status:
            announcements = announcements.filter(status=status)
        
        #Search filter
        if search_value:
            announcements = announcements.filter(
                Q(title__icontains=search_value) |
                Q(content__icontains=search_value) |
                Q(type__icontains=search_value) |
                Q(date__icontains=search_value)
            )
        
        records_total = AnnouncementRepository.get_all().count()
        records_filtered = announcements.count()
        
        #Map DataTables column index -> model field
        column_map = {
            0: None,
            1: "title",
            2: "content",
            3: "type",
            4: "status",
            5: "date",
            6: "image",
            7: None,
        }
        
        #Apply ordering
        if order_column and str(order_column).isdigit():
            col_index = int(order_column)
            order_field = column_map.get(col_index)
            if order_field:
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                announcements = announcements.order_by(order_field)
        
        #Pagination (slice)
        announcements = announcements[start:start+length]
        
        data = []
        for announcement in announcements:
            image_url = ""
            if announcement.image:
                image_url = announcement.image.url if hasattr(announcement.image, 'url') else f"{settings.MEDIA_URL}{announcement.image}"

            data.append({
                "id": announcement.id,
                "title": announcement.title,
                "content": announcement.content,
                "type": announcement.type,
                "status": announcement.status,
                "date": announcement.date.strftime("%Y-%m-%d") if announcement.date else "",
                "image": image_url,
                "created_at": announcement.created_at.strftime("%Y-%m-%d %H:%M:%S") if announcement.created_at else "",
            })
        
        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }
        
    @staticmethod
    def add_announcement(request):
        try:
            data = request.POST
            files = request.FILES
            form = AnnouncementForm(data, files)
            if not form.is_valid():
                return {"success": False, "message": form.errors}
            cleaned = form.cleaned_data
            image = cleaned.get("image")

            # Save locally first
            announcement = AnnouncementRepository.create(
                title=cleaned["title"],
                content=cleaned["content"],
                type=cleaned["type"],
                status=cleaned["status"],
                date=cleaned["date"],
                image=image
            )
            announcement.created_at = timezone.now()
            announcement.save()
            
            return {"success": True, "message": "Announcement created successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}

        
    @staticmethod
    def edit_announcement(request):
        try:
            data = request.POST
            files = request.FILES
            announcement_id = data.get("announcement_id")
            announcement = AnnouncementRepository.get_by_id(announcement_id)

            form = EditAnnouncementForm(data, files)
            if not form.is_valid():
                return {"success": False, "message": form.errors}

            cleaned = form.cleaned_data
            announcement.title = cleaned["title"]
            announcement.content = cleaned["content"]
            announcement.type = cleaned["type"]
            announcement.status = cleaned["status"]
            announcement.date = cleaned["date"]

            if cleaned.get("image"):
                if announcement.image and announcement.image.name:
                    old_image_path = announcement.image.path
                    if os.path.isfile(old_image_path):
                        os.remove(old_image_path)
                        
                announcement.image = cleaned["image"]

            announcement.save()
            return {"success": True, "message": "Announcement updated successfully."}

        except Exception as e:
            return {"success": False, "message": str(e)}

    @staticmethod
    def delete_announcement(request):
        try:
            announcement_id = request.POST.get("announcement_id")
            announcement = AnnouncementRepository.get_by_id(announcement_id)
            # delete the associated image file if it exists on disk
            if getattr(announcement, "image", None) and getattr(announcement.image, "name", None):
                old_image_path = announcement.image.path
                if os.path.isfile(old_image_path):
                    os.remove(old_image_path)
            announcement.delete()
            return {"success": True, "message": "Announcement deleted successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}

class AssessmentService:
    @staticmethod
    def get_assessment_data_for_datatables(request):
        #pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))
        
        #searching
        search_value = request.GET.get("search[value]", "")
        
        #sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")
        
        assessments = AssessmentRepository.get_all_with_not_assessed().prefetch_related("application_approved__enrollment")
        
        # search filter
        if search_value:
            assessments = assessments.filter(
                Q(application_approved__enrollment__first_name__icontains=search_value) |
                Q(application_approved__enrollment__middle_name__icontains=search_value) |
                Q(application_approved__enrollment__last_name__icontains=search_value) |
                Q(application_approved__enrollment__application_no__icontains=search_value) |
                Q(application_approved__enrollment__lrn__icontains=search_value)
            )
            
        # map data tables column index -> model field
        column_map = {
            0: None,
            1: "application_approved__enrollment__lrn",
            2: "application_approved__enrollment__last_name",
            3: "application_approved__enrollment__grade_level",
            4: "literacy_level",
            5: "literacy_result",
            6: "numeracy_level",
            7: "numeracy_result",
            8: None,
        }
        
        records_total = AssessmentRepository.get_all().count()
        records_filtered = assessments.count()
        
        # apply ordering
        if order_column and str(order_column).isdigit():
            col_index = int(order_column)
            order_field = column_map.get(col_index)
            if order_field:
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                assessments = assessments.order_by(order_field)
                
        # pagination (slice)
        assessments = assessments[start:start+length]
        
        data = []
        for assessment in assessments:
            assessment_data = model_to_dict(assessment)
            assessment_data["application_approved"] = model_to_dict(assessment.application_approved)
            assessment_data["application_approved"]["enrollment"] = model_to_dict(assessment.application_approved.enrollment)
            data.append(assessment_data)
        
        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }
    
    @staticmethod
    def update_assessment(request):
        try:
            data = request.POST
            assessment_id = data.get("assessment_id")
            assessment = AssessmentRepository.get_by_id(assessment_id)
            if data.get("literacy_level"):
                assessment.literacy_level = data.get("literacy_level")
            if data.get("literacy_result"):
                assessment.literacy_result = data.get("literacy_result")
            if data.get("numeracy_level"):
                assessment.numeracy_level = data.get("numeracy_level")
            if data.get("numeracy_result"):
                assessment.numeracy_result = data.get("numeracy_result")
            assessment.save()
            return {"success": True, "message": "Assessment updated successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}
        
    @staticmethod
    def done_assessment(request):
        try:
            data = request.POST
            assessment_id = data.get("assessment_id")
            assessment = AssessmentRepository.get_by_id(assessment_id)
            application_id = assessment.application_approved.enrollment
            application_pending = ApplicationPendingRepository.filter(enrollment_id=application_id).first()
            message_pending = application_pending.message_pending if application_pending else None
            logger.info(f"message_pending: {message_pending}")
            # check if assessment is already done
            if assessment.is_assessed:
                return {"success": False, "message": "Assessment already marked as done."}
            
            # mark as done
            assessment.is_assessed = True
            assessment.assessed_at = timezone.now()
            assessment.save()
            
            # save in student information
            student_information, _ = StudentInformationRepository.update_or_create(
                application_approved=assessment.application_approved,
                defaults={
                    "user": assessment.application_approved.enrollment.user,
                    "application_no": assessment.application_approved.enrollment.application_no,
                    "status": assessment.application_approved.enrollment.status,
                    "created_at": assessment.application_approved.enrollment.created_at,
                    "school_year": assessment.application_approved.enrollment.school_year,
                    "grade": assessment.application_approved.enrollment.grade_level,
                    "with_lrn": assessment.application_approved.enrollment.with_lrn,
                    "student_type": assessment.application_approved.enrollment.student_type,
                    "gen_avg": assessment.application_approved.enrollment.gen_avg,
                    "section": None,
                    "psa_no": assessment.application_approved.enrollment.psa_no,
                    "lrn": assessment.application_approved.enrollment.lrn,
                    "first_name": assessment.application_approved.enrollment.first_name,
                    "middle_name": assessment.application_approved.enrollment.middle_name,
                    "last_name": assessment.application_approved.enrollment.last_name,
                    "extension_name": assessment.application_approved.enrollment.extension_name,
                    "birth_date": assessment.application_approved.enrollment.birth_date,
                    "age": assessment.application_approved.enrollment.age,
                    "gender": assessment.application_approved.enrollment.gender,
                    "place_of_birth": assessment.application_approved.enrollment.place_of_birth,
                    "mother_tongue": assessment.application_approved.enrollment.mother_tongue,
                    "documents_submitted": assessment.application_approved.enrollment.documents_submitted,
                    "early_reg": assessment.application_approved.enrollment.early_reg,
                    "is_approved": True,
                    "enrollment_type": assessment.application_approved.enrollment.enrollment_type,
                    "semester": assessment.application_approved.enrollment.semester,
                    "strand": assessment.application_approved.enrollment.strand,
                    "student_status": "Enrolled",
                    "assessment": assessment,
                    "submission_remarks": message_pending,
                    "enrollment_status": "PASSED",
                }
            )
            # update document list and student information
            DocumentListRepository.get_filtered_by_enrollment(assessment.application_approved.enrollment).update(
                student_information=student_information,
                updated_at=timezone.now()
            )
            # delete applicant information and set user role to student
            ApplicantInformationRepository.delete_by_user(assessment.application_approved.enrollment.user)
            assessment.application_approved.enrollment.user.user_role = "Student"
            assessment.application_approved.enrollment.user.save()
            return {"success": True, "message": "Assessment marked as done successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}
        
    @staticmethod
    def mark_all_as_done(request):
        try:
            try:
                body = json.loads(request.body)
            except json.JSONDecodeError:
                body = {}
            assessment_ids = body.get("assessment_ids", [])
            logger.info(f"Assessment IDs: {assessment_ids}")
            
            if not assessment_ids:
                return {"success": False, "message": "No assessment IDs provided."}
            
            for assessment_id in assessment_ids:
                assessment = AssessmentRepository.get_by_id(assessment_id)
                if assessment.is_assessed:
                    continue
                assessment.is_assessed = True
                assessment.assessed_at = timezone.now()
                assessment.save()
                
                # save in student information
                student_information, _ = StudentInformationRepository.update_or_create(
                    application_approved=assessment.application_approved,
                    defaults={
                        "user": assessment.application_approved.enrollment.user,
                        "application_no": assessment.application_approved.enrollment.application_no,
                        "status": assessment.application_approved.enrollment.status,
                        "created_at": assessment.application_approved.enrollment.created_at,
                        "school_year": assessment.application_approved.enrollment.school_year,
                        "grade": assessment.application_approved.enrollment.grade_level,
                        "with_lrn": assessment.application_approved.enrollment.with_lrn,
                        "student_type": assessment.application_approved.enrollment.student_type,
                        "gen_avg": assessment.application_approved.enrollment.gen_avg,
                        "section": None,
                        "psa_no": assessment.application_approved.enrollment.psa_no,
                        "lrn": assessment.application_approved.enrollment.lrn,
                        "first_name": assessment.application_approved.enrollment.first_name,
                        "middle_name": assessment.application_approved.enrollment.middle_name,
                        "last_name": assessment.application_approved.enrollment.last_name,
                        "extension_name": assessment.application_approved.enrollment.extension_name,
                        "birth_date": assessment.application_approved.enrollment.birth_date,
                        "age": assessment.application_approved.enrollment.age,
                        "gender": assessment.application_approved.enrollment.gender,
                        "place_of_birth": assessment.application_approved.enrollment.place_of_birth,
                        "mother_tongue": assessment.application_approved.enrollment.mother_tongue,
                        "documents_submitted": assessment.application_approved.enrollment.documents_submitted,
                        "early_reg": assessment.application_approved.enrollment.early_reg,
                        "is_approved": True,
                        "enrollment_type": assessment.application_approved.enrollment.enrollment_type,
                        "semester": assessment.application_approved.enrollment.semester,
                        "strand": assessment.application_approved.enrollment.strand,
                        "student_status": "Enrolled",
                        "assessment": assessment,
                    }
                )
                # update document list and student information
                DocumentListRepository.get_filtered_by_enrollment(assessment.application_approved.enrollment).update(
                    student_information=student_information,
                    updated_at=timezone.now()
                )
                # delete applicant information and set user role to student
                ApplicantInformationRepository.delete_by_user(assessment.application_approved.enrollment.user)
                assessment.application_approved.enrollment.user.user_role = "Student"
                assessment.application_approved.enrollment.user.save()
            return {"success": True, "message": "All assessments marked as done successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}
        

    
class StudentListHistoryService:
    @staticmethod
    def get_student_list_history_for_datatables(request, grade, school_year, section_name=None):
        # pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))

        # searching
        search_value = request.GET.get("search[value]", "")
        
        # filtering
        gender = request.GET.get("gender")


        # sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")

        # get section by name
        section = SectionRepository.filter(
            section_name=section_name,
            academic_year=school_year,
            grade_level=grade
        ).first()

        # base queryset
        student_list_history = StudentListHistoryRepository.filter(
            grade_level=grade,
            section=section,
            school_year=school_year,
            student_information__student_status="Enrolled",
            student_information__user__deactivated=False,
        ).select_related(
            "student_information", "section", "teacher_information"
        )
        
        # check if all students have a final average
        have_all_final_average = student_list_history.filter(final_average__isnull=False).count() == student_list_history.count()
        have_all_final_average_count = student_list_history.filter(final_average__isnull=False).count()
        have_all_final_average_total = student_list_history.count()
        section_status = section.status
        
        # filtering
        if gender:
            student_list_history = student_list_history.filter(student_information__gender=gender)
        

        # column → model field mapping
        column_map = {
            0: None,
            1: "student_information__lrn",
            2: "student_information__last_name",
            3: "student_information__grade",
            4: "section__section_name",
            5: "student_information__gen_avg",
            6: "final_average",
            7: "student_information__gender",
            8: "teacher_information__last_name",
            9: "student_information__student_status",
            10: "created_at",
            11: None,
        }

        # search filter
        if search_value:
            student_list_history = student_list_history.filter(
                Q(student_information__first_name__icontains=search_value)
                | Q(student_information__middle_name__icontains=search_value)
                | Q(student_information__last_name__icontains=search_value)
                | Q(student_information__application_no__icontains=search_value)
                | Q(student_information__lrn__icontains=search_value)
            )

        # accurate total counts
        records_total = StudentListHistoryRepository.get_all().count()
        records_filtered = student_list_history.count()

        # apply sorting properly
        try:
            col_index = int(order_column)
            order_field = column_map.get(col_index)
            if order_field:
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                student_list_history = student_list_history.order_by(order_field)
            else:
                # default order if none
                student_list_history = student_list_history.order_by("student_information__last_name")
        except (ValueError, KeyError):
            student_list_history = student_list_history.order_by("student_information__last_name")

        # pagination
        student_list_history = student_list_history[start : start + length]

        # data serialization
        data = []
        for slh in student_list_history:
            documents = DocumentListRepository.get_by_student(slh.student_information)
            teacher = slh.teacher_information
            data.append({
                "id": slh.id,
                "grade_level": slh.grade_level,
                "previous_final_average": slh.previous_final_average,
                "final_average": slh.final_average,
                "student_information": model_to_dict(slh.student_information),
                "section": model_to_dict(slh.section),
                "created_at": slh.created_at,
                "teacher_information": {
                    "id": teacher.id if teacher else None,
                    "first_name": teacher.first_name if teacher else None,
                    "last_name": teacher.last_name if teacher else None,
                    "email": teacher.user.email if teacher and teacher.user else None,
                    "position": teacher.position if teacher else None,
                },
                "documents": [
                    {
                        "id": doc.id,
                        "document_id": doc.document_id,
                        "document_name": doc.document.document_name if doc.document else None,
                        "is_required": doc.document.is_required if doc.document else None,
                    }
                    for doc in documents
                ],
            })

        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
            "haveAllFinalAverage": have_all_final_average,
            "haveAllFinalAverageCount": have_all_final_average_count,
            "haveAllFinalAverageTotal": have_all_final_average_total,
            "section_status": section_status,
        }

    # grade from teacher.grade_level, latest schoo_year, section 
    @staticmethod
    def get_student_list_history(grade, school_year, section_name=None):
        # get section by name
        section = SectionRepository.filter(
            section_name=section_name,
            academic_year=school_year,
            grade_level=grade
        ).first()

        # get student list history
        student_list_history = StudentListHistoryRepository.filter(
            grade_level=grade,
            section=section,
            school_year=school_year,
            student_information__student_status="Enrolled",
            student_information__user__deactivated=False,
        ).select_related(
            "student_information", "section", "teacher_information"
        )
        
        pass
        
    @staticmethod
    def move_student(request):
        try:
            data = request.POST
            student_history_id = data.get("student_history_id")
            section_id = data.get("section_id")

            # Get target section
            section = SectionRepository.filter(section_id=section_id).first()
            if not section:
                return {"success": False, "message": "Section not found."}
            
            
            # Get student record
            student_history = StudentListHistoryRepository.get_by_id(student_history_id)
            if not student_history:
                return {"success": False, "message": "Student not found."}
            
            old_section = student_history.section
            
            # Get student information
            student_information = StudentInformationRepository.get_by_id(student_history.student_information_id)
            if not student_information:
                return {"success": False, "message": "Student information not found."}

            # Check if target section is full
            if section.current_slot >= section.max_slot:
                return {"success": False, "message": "Section is full."}

            # Check if already in this section
            if old_section and old_section.section_id == section.section_id:
                return {"success": False, "message": "Student is already in this section."}

            # Move student
            student_information.section = section.section_name
            student_information.save()
            student_history.section = section
            student_history.updated_at = timezone.now()
            #update student for the teacher
            student_history.teacher_information = section.teacher
            student_history.save()

            # Update current slot counts
            if old_section:
                old_section.current_slot = max(0, old_section.current_slot - 1)
                old_section.save(update_fields=["current_slot"])

            section.current_slot = min(section.max_slot, section.current_slot + 1)
            section.save(update_fields=["current_slot"])

            return {"success": True, "message": "Student moved successfully."}

        except Exception as e:
            return {"success": False, "message": str(e)}

    @staticmethod
    def input_final_average(request):
        try:
            data = request.POST
            student_id = data.get("student_id")
            form = InputFinalAverageForm(data)
            if not form.is_valid():
                return {"success": False, "message": form.errors}
            cleaned = form.cleaned_data
            student = StudentListHistoryRepository.get_by_id(student_id)
            if not student:
                return {"success": False, "message": "Student not found."}
            student.final_average = cleaned["final_average"]
            student.save()
            return {"success": True, "message": "Final average updated successfully."}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
class SectionService:
    @staticmethod
    def mark_as_completed_section(request, school_year):
        try:
            data = request.POST
            section_id = data.get("section_id")

            # Get section
            section = SectionRepository.filter(section_id=section_id).first()
            if not section:
                return {"success": False, "message": "Section not found."}
            if section.status == "Completed":
                return {"success": False, "message": "Section is already completed."}

            # Get student list history for this section and school year
            student_list_history = StudentListHistoryRepository.filter(section=section, school_year=school_year)
            if not student_list_history.exists():
                return {"success": False, "message": "No students found for this section and school year."}

            # Ensure all students have a final average
            for student in student_list_history:
                if student.final_average is None:
                    return {"success": False, "message": f"Student {student.student_information.first_name} {student.student_information.last_name} has no final average."}

            # Process promotion / completion
            for student in student_list_history:
                stud_info = student.student_information
                current_school_year = stud_info.school_year

                try:
                    start_year, end_year = map(int, current_school_year.split('-'))
                    new_school_year = f"{end_year}-{end_year + 1}"
                except ValueError:
                    return {"success": False, "message": f"Invalid school year format: {current_school_year}"}

                # Promote student
                stud_info.school_year = new_school_year
                stud_info.section = None  # Will be assigned later
                stud_info.gen_avg = student.final_average

                current_grade = int(stud_info.grade)
                if 7 <= current_grade < 10:
                    stud_info.grade = str(current_grade + 1)
                elif current_grade == 10:
                    stud_info.jhs_completed = True
                elif current_grade == 11:
                    stud_info.grade = "12"
                elif current_grade == 12:
                    stud_info.shs_completed = True

                stud_info.save(update_fields=[
                    "school_year", "section", "gen_avg", "grade", "jhs_completed", "shs_completed"
                ])

            # Mark section as completed
            section.status = "Completed"
            section.save(update_fields=["status"])

            return {"success": True, "message": "Section marked as completed successfully."}

        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return {"success": False, "message": f"An unexpected error occurred: {str(e)}"}

class OrganizationChartService:
    @staticmethod
    def get_organization_chart_for_datatables(request):
        # pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))
        
        # searching
        search_value = request.GET.get("search[value]", "")
        
        # sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")
        
        # filtering
        department = request.GET.get("department")
        designation = request.GET.get("designation")
        position = request.GET.get("position")
        
        # Map DataTables column index -> model field
        column_map = {
            1: "name",
            2: "position",
            3: "department",
            4: "designation",
            5: "image",
            6: "created_at",
            7: "updated_at",
        }
        
        # base queryset
        organization_chart = OrganizationChartRepository.get_all().order_by("-created_at")
        
        # filtering
        if department:
            organization_chart = organization_chart.filter(department=department)
        if designation:
            organization_chart = organization_chart.filter(designation=designation)
        if position:
            organization_chart = organization_chart.filter(position=position)

        
        # search filter
        if search_value:
            organization_chart = organization_chart.filter(
                Q(name__icontains=search_value) |
                Q(position__icontains=search_value) |
                Q(department__icontains=search_value) |
                Q(designation__icontains=search_value) |
                Q(image__icontains=search_value)
            )
        
        # accurate total counts
        records_total = OrganizationChartRepository.get_all().count()
        records_filtered = organization_chart.count()
        
        #Apply ordering
        if order_column and str(order_column).isdigit():
            col_index = int(order_column)
            order_field = column_map.get(col_index)
            if order_field:
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                organization_chart = organization_chart.order_by(order_field)
        
        # pagination
        organization_chart = organization_chart[start : start + length]
        
        # data serialization
        data = []
        for oc in organization_chart:
            image_url = ""
            if oc.image:
                image_url = oc.image.url if hasattr(oc.image, 'url') else f"{settings.MEDIA_URL}{oc.image}"
            data.append({
                "id": oc.id,
                "name": oc.name,
                "position": oc.position,
                "department": oc.department,
                "designation": oc.designation,
                "image": image_url,
                "created_at": oc.created_at,
                "updated_at": oc.updated_at,
            })
        
        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }
        
    @staticmethod
    def add_organization_chart(request):
        try:
            form = OrganizationChartForm(request.POST, request.FILES)
            if not form.is_valid():
                return {"success": False, "message": form.errors}
            cleaned = form.cleaned_data
            organization_chart = OrganizationChartRepository.create(name=cleaned["name"], position=cleaned["position"], department=cleaned["department"], designation=cleaned["designation"], image=cleaned["image"])
            return {"success": True, "message": "Organization chart added successfully."}
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return {"success": False, "message": f"An unexpected error occurred: {str(e)}"}
    
    @staticmethod
    def edit_organization_chart(request):
        try:
            data = request.POST
            files = request.FILES
            id = data.get("id")
            organizational = OrganizationChartRepository.get_by_id(id)
            form = EditOrganizationChartForm(data, files)
            if not form.is_valid():
                return {"success": False, "message": form.errors}
            cleaned = form.cleaned_data
            organizational.name = cleaned["name"]
            organizational.position = cleaned["position"]
            organizational.department = cleaned["department"]
            organizational.designation = cleaned["designation"]

            if cleaned.get("image"):
                if organizational.image and organizational.image.name:
                    old_image_path = organizational.image.path
                    if os.path.isfile(old_image_path):
                        os.remove(old_image_path)
                        
                organizational.image = cleaned["image"]
            organizational.updated_at = timezone.now()
            organizational.save()
            return {"success": True, "message": "Organization chart updated successfully."}
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return {"success": False, "message": f"An unexpected error occurred: {str(e)}"}
    
    @staticmethod
    def delete_organization_chart(request):
        try:
            organization_chart_id = request.POST.get("id")
            organization_chart = OrganizationChartRepository.get_by_id(organization_chart_id)
            if not organization_chart:
                return {"success": False, "message": "Organization chart not found."}
            # delete the associated image file if it exists on disk
            if getattr(organization_chart, "image", None) and getattr(organization_chart.image, "name", None):
                old_image_path = organization_chart.image.path
                if os.path.isfile(old_image_path):
                    os.remove(old_image_path)
            organization_chart.delete()
            return {"success": True, "message": "Organization chart deleted successfully."}
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return {"success": False, "message": f"An unexpected error occurred: {str(e)}"}
    
class FAQService:
    @staticmethod
    def get_faq_for_datatables(request):
        # pagination
        draw = int(request.GET.get("draw", 1))
        start = int(request.GET.get("start", 0))
        length = int(request.GET.get("length", 10))
        
        # searching
        search_value = request.GET.get("search[value]", "")
        
        # sorting
        order_column = request.GET.get("order[0][column]", 0)
        order_direction = request.GET.get("order[0][dir]", "asc")
        
        # filtering
        question = request.GET.get("question")
        answer = request.GET.get("answer")
        
        # Map DataTables column index -> model field
        column_map = {
            1: "question",
            2: "answer",
            3: "created_at",
            4: "updated_at",
        }
        
        # base queryset
        faq = FAQRepository.get_all().order_by("-created_at")
        
        # filtering
        if question:
            faq = faq.filter(question__icontains=question)
        if answer:
            faq = faq.filter(answer__icontains=answer)
        
        # search filter
        if search_value:
            faq = faq.filter(
                Q(question__icontains=search_value) |
                Q(answer__icontains=search_value)
            )
        
        # accurate total counts
        records_total = FAQRepository.get_all().count()
        records_filtered = faq.count()
        
        #Apply ordering
        if order_column and str(order_column).isdigit():
            col_index = int(order_column)
            order_field = column_map.get(col_index)
            if order_field:
                if order_direction == "desc":
                    order_field = f"-{order_field}"
                faq = faq.order_by(order_field)
        
        # pagination
        faq = faq[start : start + length]
        
        # data serialization
        data = []
        for f in faq:
            data.append({
                "id": f.id,
                "question": f.question,
                "answer": f.answer,
                "created_at": f.created_at,
                "updated_at": f.updated_at,
            })
        
        return {
            "draw": draw,
            "recordsTotal": records_total,
            "recordsFiltered": records_filtered,
            "data": data,
        }
    
    @staticmethod
    def add_faq(request):
        try:
            form = FAQForm(request.POST)
            if not form.is_valid():
                return {"success": False, "message": form.errors}
            cleaned = form.cleaned_data
            faq = FAQRepository.create(question=cleaned["question"], answer=cleaned["answer"])
            return {"success": True, "message": "FAQ added successfully."}
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return {"success": False, "message": f"An unexpected error occurred: {str(e)}"}
    
    @staticmethod
    def edit_faq(request):
        try:
            data = request.POST
            faq_id = data.get("faq_id")
            if not faq_id:
                return {"success": False, "message": "FAQ ID is required."}
            form = EditFAQForm(data)
            if not form.is_valid():
                return {"success": False, "message": form.errors}
            cleaned = form.cleaned_data
            faq = FAQRepository.update(faq_id, question=cleaned["question"], answer=cleaned["answer"], updated_at=timezone.now())
            return {"success": True, "message": "FAQ updated successfully."}
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return {"success": False, "message": f"An unexpected error occurred: {str(e)}"}
    
    @staticmethod
    def delete_faq(request):
        try:
            faq_id = request.POST.get("faq_id")
            faq = FAQRepository.get_by_id(faq_id)
            if not faq:
                return {"success": False, "message": "FAQ not found."}
            faq.delete()
            return {"success": True, "message": "FAQ deleted successfully."}
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return {"success": False, "message": f"An unexpected error occurred: {str(e)}"}