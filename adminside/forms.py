# forms.py
from django import forms
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from datetime import date

from authentication.models import ApplicantInformation, MyUser
from landingpage.models import StudentInformation


class BaseLRNForm(forms.Form):
    lrn = forms.CharField(
        max_length=12,
        min_length=12,
        label="LRN",
        error_messages={
            "min_length": "LRN must be exactly 12 digits.",
            "max_length": "LRN must be exactly 12 digits.",
            "required": "LRN is required.",
        }
    )
    def clean_lrn(self):
        lrn = self.cleaned_data["lrn"]
        if not lrn.isdigit():
            raise ValidationError("LRN must contain only numbers.")
        if len(lrn) != 12:
            raise ValidationError("LRN must be exactly 12 digits.")
        return lrn


class StudentForm(BaseLRNForm):
    # Account Information
    email = forms.EmailField(
        error_messages={
            "required": "Email is required.",
            "invalid": "Please enter a valid email address."
        }
    )
    password = forms.CharField(
        widget=forms.PasswordInput,
        error_messages={
            "required": "Password is required."
        }
    )
    
    # Enrollment Information
    enrollment_type = forms.CharField(required=True)
    school_year = forms.CharField(error_messages={"required": "School year is required."})
    grade_level = forms.ChoiceField(
        choices=[(str(i), f"Grade {i}") for i in range(7, 13)],
        error_messages={"required": "Grade level is required."},
    )
    semester = forms.ChoiceField(
        choices=[("1st", "1st"), ("2nd", "2nd")],
        required=False,  # conditional
        error_messages={"required": "Semester is required."},
    )
    student_type = forms.ChoiceField(
        choices=[
            ("late enrollee", "Late Enrollee"),
            ("new student", "New Student"),
            ("returning", "Returning (Balik Aral)"),
            ("transferee", "Transferee"),
        ],
        error_messages={"required": "Student type is required."},
    )
    gen_avg = forms.DecimalField(
        max_digits=5, decimal_places=2,
        error_messages={"required": "General average is required.", "invalid": "Enter a valid number."},
    )
    strand = forms.CharField(
        required=False,
        error_messages={"required": "Strand selection is required."}
    )

    # Learner Information
    psa_no = forms.CharField(error_messages={"required": "PSA number is required."})
    lrn = forms.CharField(error_messages={"required": "LRN is required."})
    first_name = forms.CharField(error_messages={"required": "First name is required."})
    middle_name = forms.CharField(required=False)
    last_name = forms.CharField(error_messages={"required": "Last name is required."})
    extension_name = forms.CharField(required=False)
    birth_date = forms.DateField(
        error_messages={"required": "Birth date is required.", "invalid": "Enter a valid date."}
    )
    age = forms.IntegerField(
        error_messages={"required": "Age is required.", "invalid": "Enter a valid age."}
    )
    gender = forms.ChoiceField(
        choices=[("MALE", "MALE"), ("FEMALE", "FEMALE")],
        error_messages={"required": "Gender is required."},
    )
    place_of_birth = forms.CharField(error_messages={"required": "Place of birth is required."})
    mother_tongue = forms.CharField(error_messages={"required": "Mother tongue is required."})
    
    def clean_gen_avg(self):
        gen_avg = self.cleaned_data.get("gen_avg")
        if gen_avg and not (75 <= gen_avg <= 100):
            raise ValidationError("General average must be between 75 and 100.")
        return gen_avg
    
    def clean_email(self):
        email = self.cleaned_data["email"]
        if MyUser.objects.filter(email=email).exists():
            raise ValidationError("Email already exists!")
        return email
    
    def clean_password(self):
        password = self.cleaned_data.get("password")
        if password:
            validate_password(password)
        return password
    
    def clean_lrn(self):
        lrn = super().clean_lrn() 
        if ApplicantInformation.objects.filter(lrn=lrn).exists() or StudentInformation.objects.filter(lrn=lrn).exists():
            raise ValidationError("LRN already exists!")
        return lrn

    def clean_psa_no(self):
        psa_no = self.cleaned_data.get("psa_no")
        if ApplicantInformation.objects.filter(psa_no=psa_no).exists() or StudentInformation.objects.filter(psa_no=psa_no).exists():
            raise ValidationError("PSA No. already exists!")
        return psa_no
    
    def clean_age(self):
        age = self.cleaned_data.get("age")
        birth_date = self.cleaned_data.get("birth_date")
        if not age or age <= 11:
            raise ValidationError("Age must be greater than 11.")
        if birth_date:
            today = date.today()
            expected_age = today.year - birth_date.year - (
                (today.month, today.day) < (birth_date.month, birth_date.day)
            )
            if age != expected_age:
                raise ValidationError(f"Age does not match the birth date (should be {expected_age}).")
        return age
    

class ApplicationForm(forms.Form):
    # Hidden Fields
    enrollment_type = forms.CharField(widget=forms.HiddenInput())
    user_id = forms.IntegerField(widget=forms.HiddenInput())
    user_role = forms.CharField(widget=forms.HiddenInput())
    application_no = forms.CharField(widget=forms.HiddenInput(), required=False)
    status = forms.CharField(widget=forms.HiddenInput())
    early_reg = forms.CharField(widget=forms.HiddenInput(), required=False)

    # Enrollment Information
    school_year = forms.CharField(error_messages={"required": "School year is required."})
    grade_level = forms.ChoiceField(
        choices=[(str(i), f"Grade {i}") for i in range(7, 13)],
        error_messages={"required": "Grade level is required."},
    )
    semester = forms.ChoiceField(
        choices=[("1st", "1st"), ("2nd", "2nd")],
        required=False,  # conditional
        error_messages={"required": "Semester is required."},
    )
    student_type = forms.ChoiceField(
        choices=[
            ("new student", "New Student"),
            ("returning", "Returning (Balik Aral)"),
            ("transferee", "Transferee"),
        ],
        error_messages={"required": "Student type is required."},
    )
    gen_avg = forms.DecimalField(
        max_digits=5, decimal_places=2,
        error_messages={"required": "General average is required.", "invalid": "Enter a valid number."},
    )
    science_avg = forms.DecimalField(
        max_digits=5, decimal_places=2,
        required=False,
        error_messages={"required": "Science average is required.", "invalid": "Enter a valid number."},
    )
    math_avg = forms.DecimalField(
        max_digits=5, decimal_places=2,
        required=False,
        error_messages={"required": "Math average is required.", "invalid": "Enter a valid number."},
    )
    strand = forms.CharField(
        required=False,
        error_messages={"required": "Strand selection is required."}
    )

    # Learner Information
    psa_no = forms.CharField(error_messages={"required": "PSA number is required."})
    lrn = forms.CharField(error_messages={"required": "LRN is required."})
    first_name = forms.CharField(error_messages={"required": "First name is required."})
    middle_name = forms.CharField(required=False)
    last_name = forms.CharField(error_messages={"required": "Last name is required."})
    extension_name = forms.CharField(required=False)
    birth_date = forms.DateField(
        error_messages={"required": "Birth date is required.", "invalid": "Enter a valid date."}
    )
    age = forms.IntegerField(
        error_messages={"required": "Age is required.", "invalid": "Enter a valid age."}
    )
    gender = forms.ChoiceField(
        choices=[("MALE", "MALE"), ("FEMALE", "FEMALE")],
        error_messages={"required": "Gender is required."},
    )
    place_of_birth = forms.CharField(error_messages={"required": "Place of birth is required."})
    mother_tongue = forms.CharField(error_messages={"required": "Mother tongue is required."})
    documents_submitted = forms.JSONField(required=False)
    submission_remarks = forms.CharField(required=False)

    # --- Custom Validators ---
    def clean_gen_avg(self):
        gen_avg = self.cleaned_data.get("gen_avg")
        if gen_avg and not (75 <= gen_avg <= 100):
            raise ValidationError("General average must be between 75 and 100.")
        return gen_avg

    def clean_science_avg(self):
        science_avg = self.cleaned_data.get("science_avg")
        enrollment_type = self.cleaned_data.get("enrollment_type")
        # Only validate if non-JHS and value is provided
        if enrollment_type != "JHS" and science_avg is not None:
            if not (75 <= science_avg <= 100):
                raise ValidationError("Science average must be between 75 and 100.")
        return science_avg

    def clean_math_avg(self):
        math_avg = self.cleaned_data.get("math_avg")
        enrollment_type = self.cleaned_data.get("enrollment_type")
        # Only validate if non-JHS and value is provided
        if enrollment_type != "JHS" and math_avg is not None:
            if not (75 <= math_avg <= 100):
                raise ValidationError("Mathematics average must be between 75 and 100.")
        return math_avg

    def clean_age(self):
        age = self.cleaned_data.get("age")
        birth_date = self.cleaned_data.get("birth_date")
        if not age or age <= 11:
            raise ValidationError("Age must be greater than 11.")
        if birth_date:
            today = date.today()
            expected_age = today.year - birth_date.year - (
                (today.month, today.day) < (birth_date.month, birth_date.day)
            )
            if age != expected_age:
                raise ValidationError(f"Age does not match the birth date (should be {expected_age}).")
        return age

    def clean(self):
        cleaned_data = super().clean()
        enrollment_type = cleaned_data.get("enrollment_type")
        science_avg = cleaned_data.get("science_avg")
        math_avg = cleaned_data.get("math_avg")
        strand = cleaned_data.get("strand")
        
        if enrollment_type != "JHS" and science_avg is not None and math_avg is not None:
            if science_avg >= 85 and math_avg >= 85:
                if strand not in ["ABM", "STEM"]:
                    raise ValidationError("With your averages, you can only select ABM or STEM.")
            else:
                if strand != "ABM":
                    raise ValidationError("With your averages, only ABM strand is allowed.")

        return cleaned_data
    
class TeacherForm(forms.Form):
    # Account Information
    email = forms.EmailField(
        error_messages={
            "required": "Email is required.",
            "invalid": "Please enter a valid email address."
        }
    )
    password = forms.CharField(
        widget=forms.PasswordInput,
        error_messages={
            "required": "Password is required."
        }
    )

    # Teacher Information
    first_name = forms.CharField(error_messages={"required": "First name is required."})
    middle_name = forms.CharField(required=False)
    last_name = forms.CharField(error_messages={"required": "Last name is required."})
    position = forms.CharField(error_messages={"required": "Subject Teacher is required."})
    grade_level = forms.ChoiceField(
        choices=[(str(i), f"Grade {i}") for i in range(7, 13)],
        error_messages={"required": "Subject teacher's grade level is required."},
    )
    
    def clean_password(self):
        password = self.cleaned_data.get("password")
        if password:
            validate_password(password)
        return password
    
    def clean_email(self):
        email = self.cleaned_data["email"]
        if MyUser.objects.filter(email=email).exists():
            raise ValidationError("Email already exists!")
        return email
    
    
class EditTeacherForm(forms.Form):
    first_name = forms.CharField(error_messages={"required": "First name is required."})
    middle_name = forms.CharField(required=False)
    last_name = forms.CharField(error_messages={"required": "Last name is required."})
    position = forms.CharField(error_messages={"required": "Subject Teacher is required."})
    grade_level = forms.ChoiceField(
        choices=[(str(i), f"Grade {i}") for i in range(7, 13)],
        error_messages={"required": "Subject teacher's grade level is required."},
    )
    email = forms.EmailField(
        error_messages={
            "required": "Email is required.",
            "invalid": "Please enter a valid email address."
        }
    )

    def __init__(self, *args, **kwargs):
        self.user_id = kwargs.pop("user_id", None) 
        super().__init__(*args, **kwargs)

    def clean_email(self):
        email = self.cleaned_data["email"]
        existing_user = MyUser.objects.filter(email=email).exclude(id=self.user_id).first()
        if existing_user:
            raise ValidationError("Email already exists!")
        return email
    
class CoordinatorForm(forms.Form):
    first_name = forms.CharField(error_messages={"required": "First name is required."})
    middle_name = forms.CharField(required=False)
    last_name = forms.CharField(error_messages={"required": "Last name is required."})
    position = forms.CharField(error_messages={"required": "Position is required."})
    email = forms.EmailField(
        error_messages={
            "required": "Email is required.",
            "invalid": "Please enter a valid email address."
        }
    )
    password = forms.CharField(
        widget=forms.PasswordInput,
        error_messages={
            "required": "Password is required."
        }
    )
    
    def clean_password(self):
        password = self.cleaned_data.get("password")
        if password:
            validate_password(password)
        return password
    
    def clean_email(self):
        email = self.cleaned_data["email"]
        if MyUser.objects.filter(email=email).exists():
            raise ValidationError("Email already exists!")
        return email
    
class EditCoordinatorForm(forms.Form):
    first_name = forms.CharField(error_messages={"required": "First name is required."})
    middle_name = forms.CharField(required=False)
    last_name = forms.CharField(error_messages={"required": "Last name is required."})
    position = forms.CharField(error_messages={"required": "Position is required."})
    email = forms.EmailField(
        error_messages={
            "required": "Email is required.",
            "invalid": "Please enter a valid email address."
        }
    )

    def __init__(self, *args, **kwargs):
        self.user_id = kwargs.pop("user_id", None) 
        super().__init__(*args, **kwargs)

    def clean_email(self):
        email = self.cleaned_data["email"]
        existing_user = MyUser.objects.filter(email=email).exclude(id=self.user_id).first()
        if existing_user:
            raise ValidationError("Email already exists!")
        return email
    

class AdminForm(forms.Form):
    first_name = forms.CharField(error_messages={"required": "First name is required."})
    middle_name = forms.CharField(required=False)
    last_name = forms.CharField(error_messages={"required": "Last name is required."})
    position = forms.CharField(error_messages={"required": "Position is required."})
    email = forms.EmailField(
        error_messages={
            "required": "Email is required.",
            "invalid": "Please enter a valid email address."
        }
    )
    password = forms.CharField(
        widget=forms.PasswordInput,
        error_messages={
            "required": "Password is required."
        }
    )
    
    def clean_password(self):
        password = self.cleaned_data.get("password")
        if password:
            validate_password(password)
        return password
    
    def clean_email(self):
        email = self.cleaned_data["email"]
        if MyUser.objects.filter(email=email).exists():
            raise ValidationError("Email already exists!")
        return email
    
class EditAdminForm(forms.Form):
    first_name = forms.CharField(error_messages={"required": "First name is required."})
    middle_name = forms.CharField(required=False)
    last_name = forms.CharField(error_messages={"required": "Last name is required."})
    position = forms.CharField(error_messages={"required": "Position is required."})
    email = forms.EmailField(
        error_messages={
            "required": "Email is required.",
            "invalid": "Please enter a valid email address."
        }
    )
    
    def __init__(self, *args, **kwargs):
        self.user_id = kwargs.pop("user_id", None) 
        super().__init__(*args, **kwargs)
    
    def clean_email(self):
        email = self.cleaned_data["email"]
        if MyUser.objects.filter(email=email).exists():
            raise ValidationError("Email already exists!")
        return email
    
class AnnouncementForm(forms.Form):
    title = forms.CharField(error_messages={"required": "Title is required."})
    content = forms.CharField(error_messages={"required": "Content is required."})
    type = forms.CharField(
        error_messages={"required": "Type is required."},
    )
    status = forms.ChoiceField(
        choices=[("Active", "Active"), ("Inactive", "Inactive")],
        error_messages={"required": "Status is required."},
    )
    date = forms.DateField(error_messages={"required": "Date is required."})
    image = forms.ImageField(required=False)
    
    def clean_date(self):
        date = self.cleaned_data.get("date")
        if date and date < date.today():
            raise ValidationError("Date cannot be in the past.")
        return date
    
class EditAnnouncementForm(forms.Form):
    title = forms.CharField(error_messages={"required": "Title is required."})
    content = forms.CharField(error_messages={"required": "Content is required."})
    type = forms.CharField(
        error_messages={"required": "Type is required."},
    )
    status = forms.ChoiceField(
        choices=[("Active", "Active"), ("Inactive", "Inactive")],
        error_messages={"required": "Status is required."},
    )
    date = forms.DateField(error_messages={"required": "Date is required."})
    image = forms.ImageField(required=False)
    

class OrganizationChartForm(forms.Form):
    name = forms.CharField(error_messages={"required": "Name is required."})
    position = forms.CharField(error_messages={"required": "Position is required."})
    department = forms.CharField(required=False)
    designation = forms.CharField(error_messages={"required": "Designation is required."})
    image = forms.ImageField(required=False)
    
    def clean_image(self):
        image = self.cleaned_data.get("image")
        if image and image.size > 2 * 1024 * 1024:
            raise ValidationError("Image must be less than 2MB.")
        return image
    
class EditOrganizationChartForm(forms.Form):
    name = forms.CharField(error_messages={"required": "Name is required."})
    position = forms.CharField(error_messages={"required": "Position is required."})
    department = forms.CharField(required=False)
    designation = forms.CharField(error_messages={"required": "Designation is required."})
    image = forms.ImageField(required=False)
    
    def clean_image(self):
        image = self.cleaned_data.get("image")
        if image and image.size > 2 * 1024 * 1024:
            raise ValidationError("Image must be less than 2MB.")
        return image
    
class FAQForm(forms.Form):
    question = forms.CharField(error_messages={"required": "Question is required."})
    answer = forms.CharField(error_messages={"required": "Answer is required."})
    
class EditFAQForm(forms.Form):
    question = forms.CharField(error_messages={"required": "Question is required."})
    answer = forms.CharField(error_messages={"required": "Answer is required."})
