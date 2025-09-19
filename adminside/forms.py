# forms.py
from django import forms
from django.core.exceptions import ValidationError
from datetime import date

class AddStudentForm(forms.Form):
    # Account
    email = forms.EmailField(required=True)
    password = forms.CharField(min_length=8, required=True)

    # Student Information
    lrn = forms.CharField(required=True)
    psa_no = forms.CharField(required=True)
    first_name = forms.CharField(required=True)
    middle_name = forms.CharField(required=False)
    last_name = forms.CharField(required=True)
    extension_name = forms.CharField(required=False)

    enrollment_type = forms.CharField(required=True)
    student_type = forms.CharField(required=True)
    school_year = forms.CharField(required=True)
    grade_level = forms.IntegerField(required=True)
    gen_avg = forms.IntegerField(min_value=75, max_value=100, required=True)

    semester = forms.CharField(required=False)
    strand = forms.CharField(required=False)
    birth_date = forms.DateField(required=True)
    age = forms.IntegerField(min_value=11, required=True)
    gender = forms.CharField(required=True)
    place_of_birth = forms.CharField(required=True)
    mother_tongue = forms.CharField(required=True)
    documents_submitted = forms.JSONField(required=True)
    
    def clean_documents_submitted(self):
        docs = self.cleaned_data["documents_submitted"]
        required_docs = {"PSA", "Report Card"}
        if not required_docs.issubset(set(docs)):
            raise forms.ValidationError("PSA and Report Card are required documents.")
        return docs

class ApplicationForm(forms.Form):
    # Hidden Fields
    enrollment_type = forms.CharField(widget=forms.HiddenInput())
    user_id = forms.IntegerField(widget=forms.HiddenInput())
    user_role = forms.CharField(widget=forms.HiddenInput())
    application_no = forms.CharField(widget=forms.HiddenInput())
    status = forms.CharField(widget=forms.HiddenInput())
    early_reg = forms.CharField(widget=forms.HiddenInput())

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
        required=False,  # conditional
        error_messages={"required": "Science average is required.", "invalid": "Enter a valid number."},
    )
    math_avg = forms.DecimalField(
        max_digits=5, decimal_places=2,
        required=False,  # conditional
        error_messages={"required": "Math average is required.", "invalid": "Enter a valid number."},
    )
    strand = forms.CharField(
        required=False,  # conditional
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
    