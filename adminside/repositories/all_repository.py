from xml.dom.minidom import Identified
from authentication.models import AdminInformation, ApplicantInformation, CoordinatorInformation, MyUser, TeacherInformation
from landingpage.models import Announcement, ApplicationApproved, ApplicationPending, Assessment, Document, DocumentList, EnrollmentForm, EnrollmentManagement, SchoolYear, Section, StudentInformation, StudentListHistory
from .base_repository import BaseRepository

# ENROLLMENT FORM
class EnrollmentFormRepository(BaseRepository):
    model = EnrollmentForm

    @classmethod
    def get_all_application(cls):
        return super().filter(is_approved=None)

    @classmethod
    def get_approved_application(cls):
        return super().filter(is_approved=1)

    @classmethod
    def get_pending_application(cls):
        return super().filter(is_approved=0)
    
    @classmethod
    def get_all(cls):
        return super().get_all()
    
    @classmethod
    def get_by_id(cls, id: int):
        return super().get_by_id(id)

# APPLICATION APPROVED
class ApplicationApprovedRepository(BaseRepository):
    model = ApplicationApproved
    
    @classmethod
    def get_all_with_enrollment(cls):
        return super().get_all().select_related("enrollment")
    
    @classmethod
    def update_or_create(cls, enrollment, defaults=None):
        return cls.model.objects.update_or_create(enrollment=enrollment, defaults=defaults)

# APPLICATION PENDING
class ApplicationPendingRepository(BaseRepository):
    model = ApplicationPending
    
    @classmethod
    def get_all_with_enrollment(cls):
        return super().get_all().select_related("enrollment")
    
    @classmethod
    def get_by_id(cls, id: int):
        return super().get_by_id(id)

# ENROLLMENT MANAGEMENT
class EnrollmentManagementRepository(BaseRepository):
    
    model = EnrollmentManagement

    @classmethod
    def get_by_id(cls, id: int):
        return super().get_by_id(id)
    
# DOCUMENT
class DocumentRepository(BaseRepository):
    
    model = Document
    
    @classmethod
    def get_by_id(cls, id: int):
        return super().get_by_id(id)
    
    @classmethod
    def get_all(cls):
        return super().get_all()
    
    @classmethod
    def get_required_ids(cls):
        return set(cls.model.objects.filter(is_required=1).values_list("id", flat=True))
    
# DOCUMENT LIST
class DocumentListRepository(BaseRepository):
    
    model = DocumentList
    
    @classmethod
    def get_by_enrollment(cls, enrollment_id: int):
        return super().filter(enrollment_id=enrollment_id).select_related("document")
        
    @classmethod
    def delete_by_enrollment(cls, enrollment_id: int):
        return super().filter(enrollment_id=enrollment_id).delete()
    
    @classmethod
    def delete_by_enrollment_and_document(cls, enrollment_id: int, document_id: int):
        return super().filter(enrollment_id=enrollment_id, document_id=document_id).delete()
    
    @classmethod
    def get_document_ids_by_enrollment(cls, enrollment_id: int):
        return super().filter(enrollment_id=enrollment_id).values_list("document_id", flat=True)
    
    @classmethod
    def get_filtered_by_enrollment(cls, enrollment: int):
        return super().filter(enrollment=enrollment)
    
    @classmethod
    def get_by_student(cls, student_id: int):
        return super().filter(student_information=student_id).select_related("document")
    
    
#USER INFORMATION
class UserInformationRepository(BaseRepository):
    model = MyUser
    
    @classmethod
    def get_all(cls):
        return super().get_all().select_related("admininformation", "applicantinformation", "coordinatorinformation", "teacherinformation", "studentinformation")
    
    @classmethod
    def get_by_user(cls, user_id: int):
        return super().filter(id=user_id)

# APPLICANT INFORMATION
class ApplicantInformationRepository(BaseRepository):
    model = ApplicantInformation
    
    @classmethod
    def get_all(cls):
        return super().get_all()
    
    @classmethod
    def delete_by_user(cls, user_id: int):
        return  super().filter(user=user_id).delete()
    
# STUDENT INFORMATION
class StudentInformationRepository(BaseRepository):
    model = StudentInformation
    
    @classmethod
    def get_all(cls):
        return super().get_all()
    
    @classmethod
    def update_or_create(cls, application_approved, defaults=None):
        return cls.model.objects.update_or_create(application_approved=application_approved, defaults=defaults)
    
    @classmethod
    def get_all_by_grade(cls, grade: int):
        return super().filter(grade=grade).prefetch_related("documents")
    
# ADMINISTRATOR INFORMATION
class AdminInformationRepository(BaseRepository):
    model = AdminInformation
    
    @classmethod
    def get_all(cls):
        return super().get_all()
    
    @classmethod
    def get_by_user(cls, user_id: int):
        return super().filter(user=user_id)

# COORDINATOR INFORMATION
class CoordinatorInformationRepository(BaseRepository):
    model = CoordinatorInformation
    
    @classmethod
    def get_all(cls):
        return super().get_all()
    
    @classmethod
    def get_by_user(cls, user_id: int):
        return super().filter(user=user_id)

# TEACHER INFORMATION
class TeacherInformationRepository(BaseRepository):
    model = TeacherInformation
    
    @classmethod
    def get_all(cls):
        return super().get_all()
    
    @classmethod
    def get_by_user(cls, user_id: int):
        return super().filter(user=user_id)
    
# ANNOUNCEMENT
class AnnouncementRepository(BaseRepository):
    model = Announcement
    
    @classmethod
    def get_all(cls):
        return super().get_all()
    
    @classmethod
    def get_by_id(cls, id: int):
        return super().get_by_id(id)
    
# ASSESSMENT
class AssessmentRepository(BaseRepository):
    model = Assessment
    
    @classmethod
    def get_all(cls):
        return super().get_all()
    
    @classmethod
    def get_all_with_not_assessed(cls):
        return super().filter(is_assessed=False)
    
    @classmethod
    def get_all_with_assessed(cls):
        return super().filter(is_assessed=True)
    
    @classmethod
    def get_by_id(cls, id: int):
        return super().get_by_id(id)
    
# SCHOOL YEAR
class SchoolYearRepository(BaseRepository):
    model = SchoolYear
    
    @classmethod
    def get_all(cls):
        return super().get_all()
    
    @classmethod
    def get_by_id(cls, id: int):
        return super().get_by_id(id)

# SECTION
class SectionRepository(BaseRepository):
    model = Section
    
    @classmethod
    def get_all(cls):
        return super().get_all()
    
    @classmethod
    def get_by_id(cls, id: int):
        return super().get_by_id(id)
    

# STUDENT LIST HISTORY
class StudentListHistoryRepository(BaseRepository):
    model = StudentListHistory
    
    @classmethod
    def get_all(cls):
        return super().get_all()
    
    @classmethod
    def get_by_id(cls, id: int):
        return super().get_by_id(id)
    

    