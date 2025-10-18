from encodings.punycode import T
from MySQLdb import Time
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from authentication.models import MyUser, TeacherInformation
from authentication.utils import capitalize_words

class EnrollmentForm(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    application_no = models.CharField(max_length=50)
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(null=True, blank=True)
    school_year = models.CharField(max_length=50)
    grade_level = models.CharField(max_length=50)
    with_lrn = models.BooleanField(null=True, blank=True)
    student_type = models.CharField(max_length=50, null=True, blank=True)
    gen_avg = models.IntegerField()
    psa_no = models.CharField(max_length=50)
    lrn = models.CharField(max_length=50)
    first_name = models.CharField(max_length=50)
    middle_name = models.CharField(max_length=50, null=True, blank=True)
    last_name = models.CharField(max_length=50)
    extension_name = models.CharField(max_length=50, null=True, blank=True)
    birth_date = models.DateField()
    age = models.IntegerField()
    gender = models.CharField(max_length=50)
    place_of_birth = models.CharField(max_length=50)
    mother_tongue = models.CharField(max_length=50)
    documents_submitted = models.TextField(null=True, blank=True)
    early_reg = models.BooleanField(null=True, blank=True)
    is_approved = models.BooleanField(null=True, blank=True)
    accept_term = models.BooleanField(default=False)
    enrollment_type = models.CharField(
        max_length=3,
        choices=[("JHS", "Junior High School"), ("SHS", "Senior High School")],
        null=True,
        blank=True,
    )
    semester = models.CharField(
        max_length=3,
        choices=[("1st", "1st Semester"), ("2nd", "2nd Semester")],
        null=True,
        blank=True,
    )
    strand = models.CharField(
        max_length=4,
        choices=[("ABM", "Accountancy, Business, and Management"), ("STEM", "Science, Technology, Engineering, and Mathematics")],
        null=True,
        blank=True,
    )
    class Meta:
        db_table = "enrollment_form"

    def save(self, *args, **kwargs):
        self.school_year = self.school_year.upper() if self.school_year else None
        self.grade_level = self.grade_level.upper() if self.grade_level else None
        self.psa_no = self.psa_no.upper() if self.psa_no else None
        self.lrn = self.lrn.upper() if self.lrn else None
        self.first_name = self.first_name.upper() if self.first_name else None
        self.middle_name = self.middle_name.upper() if self.middle_name else None
        self.last_name = self.last_name.upper() if self.last_name else None
        self.extension_name = (
            self.extension_name.upper() if self.extension_name else None
        )
        self.place_of_birth = (
            self.place_of_birth.upper() if self.place_of_birth else None
        )
        self.mother_tongue = self.mother_tongue.upper() if self.mother_tongue else None
        self.student_type = self.student_type.upper() if self.student_type else None
        super(EnrollmentForm, self).save(*args, **kwargs)


class ApplicationApproved(models.Model):
    enrollment = models.OneToOneField(
        EnrollmentForm, on_delete=models.CASCADE, null=True, blank=True
    )
    created_at = models.DateTimeField(default=timezone.now)
    class Meta:
        db_table = "application_approved"


class ApplicationPending(models.Model):
    enrollment = models.OneToOneField(
        EnrollmentForm, on_delete=models.CASCADE, null=True, blank=True
    )
    is_reapproved = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(null=True, blank=True)
    message_pending = models.TextField(null=True, blank=True)
    class Meta:
        db_table = "application_pending"


class Assessment(models.Model):
    application_approved = models.OneToOneField(
        ApplicationApproved, on_delete=models.CASCADE
    )
    literacy_level = models.CharField(max_length=191, null=True, blank=True)
    literacy_result = models.TextField(null=True, blank=True)
    numeracy_level = models.CharField(max_length=191, null=True, blank=True)
    numeracy_result = models.TextField(null=True, blank=True)
    is_assessed = models.BooleanField(default=False)
    assessed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    class Meta:
        db_table = "assessment"


class StudentInformation(models.Model):
    user = models.OneToOneField(MyUser, on_delete=models.CASCADE)
    application_approved = models.ForeignKey(
        ApplicationApproved, null=True, on_delete=models.SET_NULL
    )
    assessment = models.ForeignKey(Assessment, null=True, on_delete=models.SET_NULL)
    application_no = models.CharField(max_length=191)
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(null=True, blank=True)
    school_year = models.CharField(max_length=191)
    grade = models.CharField(max_length=191)
    with_lrn = models.BooleanField(null=True, blank=True)
    student_type = models.CharField(max_length=191, null=True, blank=True)
    gen_avg = models.IntegerField()
    section = models.CharField(max_length=191, null=True, blank=True)
    psa_no = models.CharField(max_length=191)
    lrn = models.CharField(max_length=191)
    first_name = models.CharField(max_length=191)
    middle_name = models.CharField(max_length=191, null=True, blank=True)
    last_name = models.CharField(max_length=191)
    extension_name = models.CharField(max_length=191, null=True, blank=True)
    birth_date = models.DateField()
    age = models.IntegerField()
    gender = models.CharField(max_length=50)
    place_of_birth = models.CharField(max_length=191)
    mother_tongue = models.CharField(max_length=191)
    documents_submitted = models.TextField(null=True, blank=True)
    early_reg = models.BooleanField(null=True, blank=True)
    is_approved = models.BooleanField(null=True, blank=True)
    submission_remarks = models.TextField(null=True, blank=True)
    enrollment_status = models.CharField(max_length=10, 
        choices=[("PASSED", "PASSED"), ("FAILED", "FAILED")],
        null=True,
        blank=True
    )
    enrollment_type = models.CharField(
        max_length=3,
        choices=[("JHS", "Junior High School"), ("SHS", "Senior High School")],
        null=True,
        blank=True,
    )
    semester = models.CharField(
        max_length=3,
        choices=[("1st", "1st Semester"), ("2nd", "2nd Semester")],
        null=True,
        blank=True,
    )
    strand = models.CharField(
        max_length=4,
        choices=[
            ("ABM", "Accountancy, Business, and Management"),
            ("STEM", "Science, Technology, Engineering, and Mathematics"),
        ],
        null=True,
        blank=True,
    )
    student_status = models.CharField(
        max_length=50,
        choices=[
            ("Enrolled", "Enrolled"),
            ("Transferred", "Transferred"),
            ("Dropped", "Dropped"),
        ],
        default="Enrolled",
    )
    jhs_completed = models.BooleanField(default=False, null=True, blank=True)
    shs_completed = models.BooleanField(default=False, null=True, blank=True)

    class Meta:
        db_table = "student_information"

    def save(self, *args, **kwargs):
        self.school_year = self.school_year.upper() if self.school_year else None
        self.psa_no = self.psa_no.upper() if self.psa_no else None
        self.lrn = self.lrn.upper() if self.lrn else None
        self.first_name = self.first_name.upper() if self.first_name else None
        self.middle_name = self.middle_name.upper() if self.middle_name else None
        self.last_name = self.last_name.upper() if self.last_name else None
        self.extension_name = (
            self.extension_name.upper() if self.extension_name else None
        )
        self.place_of_birth = (
            self.place_of_birth.upper() if self.place_of_birth else None
        )
        self.mother_tongue = self.mother_tongue.upper() if self.mother_tongue else None
        self.student_type = self.student_type.upper() if self.student_type else None
        grade_int = int(self.grade)
        if grade_int in [11, 12]:
            self.jhs_completed = True
        super(StudentInformation, self).save(*args, **kwargs)


class Section(models.Model):
    section_id = models.AutoField(primary_key=True)
    section_name = models.CharField(max_length=50)
    strand = models.CharField(
        max_length=4,
        choices=[
            ("ABM", "Accountancy, Business, and Management"),
            ("STEM", "Science, Technology, Engineering, and Mathematics"),
        ],
        null=True,
        blank=True,
    )
    grade_level = models.IntegerField()
    max_slot = models.IntegerField()
    current_slot = models.IntegerField(default=0)
    teacher = models.ForeignKey(
        TeacherInformation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    academic_year = models.CharField(max_length=10)
    status = models.CharField(
        max_length=10,
        choices=[("Active", "Active"), ("Inactive", "Inactive"), ("Completed", "Completed")],
        default="Active",
    )

    class Meta:
        db_table = "section"


    def __str__(self):
        adviser = (
            f"{self.teacher.first_name} {self.teacher.last_name}"
            if self.teacher
            else "None"
        )
        return f"{self.section_name} (Grade {self.grade_level}) - Adviser: {adviser}"


class Announcement(models.Model):
    STATUS_CHOICES = (
        ("active", "Active"),
        ("inactive", "Inactive"),
    )
    title = models.CharField(max_length=191)
    content = models.TextField()
    image = models.ImageField(upload_to="announcements/", blank=True, null=True)
    date = models.DateField()
    created_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    type = models.CharField(max_length=191, null=True, blank=True)
    
    class Meta:
        db_table = "announcement"

    def __str__(self):
        return self.title


class EnrollmentManagement(models.Model):
    enrollment_active = models.BooleanField(default=False)
    early_registration_active = models.BooleanField(default=False)
    enrollment_start_date = models.DateField(null=True, blank=True)
    enrollment_deadline_date = models.DateField(null=True, blank=True)
    early_registration_start_date = models.DateField(null=True, blank=True)
    early_registration_deadline_date = models.DateField(null=True, blank=True)
    announcement_content = models.TextField(null=True, blank=True)
    academic_year_start = models.IntegerField(null=True, blank=True)
    academic_year_end = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = "enrollment_management"

    def save(self, *args, **kwargs):
        today = timezone.now().date()
        if self.enrollment_start_date == today:
            self.enrollment_active = True
        if self.early_registration_start_date == today:
            self.early_registration_active = True

        if self.enrollment_deadline_date == today:
            self.enrollment_active = False
        if self.early_registration_deadline_date == today:
            self.early_registration_active = False

        super(EnrollmentManagement, self).save(*args, **kwargs)

class Document(models.Model):
    document_name = models.CharField(max_length=191)
    is_required = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = "document"
        
class DocumentList(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, null=True, blank=True, related_name="document_lists")
    enrollment = models.ForeignKey(EnrollmentForm, on_delete=models.CASCADE, null=True, blank=True, related_name="documents")
    student_information = models.ForeignKey(StudentInformation, on_delete=models.CASCADE, null=True, blank=True, related_name="documents")
    updated_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "document_list"
        
class SchoolYear(models.Model):
    name = models.CharField(max_length=10, null=True, blank=True)
    school_year_start = models.CharField(max_length=10, null=True, blank=True)
    school_year_end = models.CharField(max_length=10, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = "school_year"
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        self.name = f"{self.school_year_start}-{self.school_year_end}"
        super(SchoolYear, self).save(*args, **kwargs)
        
        
class StudentListHistory(models.Model):
    teacher_information = models.ForeignKey(TeacherInformation, on_delete=models.SET_NULL, null=True, blank=True)
    student_information = models.ForeignKey(StudentInformation, on_delete=models.CASCADE, null=True, blank=True)
    section = models.ForeignKey(Section, on_delete=models.CASCADE, null=True, blank=True)
    grade_level = models.IntegerField(null=True, blank=True)
    previous_final_average = models.IntegerField(null=True, blank=True)
    final_average = models.IntegerField(null=True, blank=True)
    school_year = models.CharField(max_length=10, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = "student_list_history"
        
    
class FAQ(models.Model):
    question = models.TextField(null=True, blank=True)
    answer = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = "faq"
        
    def __str__(self):
        return self.question
    
class OrganizationChart(models.Model):
    name = models.CharField(max_length=191)
    position = models.CharField(max_length=191, null=True, blank=True)
    department = models.CharField(max_length=191, null=True, blank=True)
    designation = models.CharField(max_length=191, null=True, blank=True)
    image = models.ImageField(upload_to="organization_chart/", blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = "organization_chart"
        
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        self.name = capitalize_words(self.name) if self.name else None
        self.designation = capitalize_words(self.designation) if self.designation else None
        super(OrganizationChart, self).save(*args, **kwargs)