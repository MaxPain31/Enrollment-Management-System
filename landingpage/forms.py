from django import forms
from django.core.exceptions import ValidationError
from datetime import date


class EnrollmentForm(forms.Form):
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
    track = forms.CharField(required=False)
    
    # Returning/Transferee fields
    last_grade_level = forms.CharField(required=False)
    last_school_year = forms.CharField(required=False)
    last_school_attended = forms.CharField(required=False)
    school_id = forms.CharField(required=False)
    
    # Current Address
    current_house_no = forms.CharField(required=False)
    current_street = forms.CharField(
        required=True,
        error_messages={"required": "Sitio/Street Name is required."}
    )
    current_barangay = forms.CharField(
        required=True,
        error_messages={"required": "Barangay is required."}
    )
    current_municipality = forms.CharField(
        required=True,
        error_messages={"required": "Municipality/City is required."}
    )
    current_province = forms.CharField(
        required=True,
        error_messages={"required": "Province is required."}
    )
    current_country = forms.CharField(
        required=True,
        error_messages={"required": "Country is required."}
    )
    current_zip_code = forms.CharField(
        required=True,
        error_messages={"required": "Zip Code is required."}
    )
    
    # Permanent Address
    permanent_house_no = forms.CharField(required=False)
    permanent_street = forms.CharField(
        required=True,
        error_messages={"required": "Sitio/Street Name is required."}
    )
    permanent_barangay = forms.CharField(
        required=True,
        error_messages={"required": "Barangay is required."}
    )
    permanent_municipality = forms.CharField(
        required=True,
        error_messages={"required": "Municipality/City is required."}
    )
    permanent_province = forms.CharField(
        required=True,
        error_messages={"required": "Province is required."}
    )
    permanent_country = forms.CharField(
        required=True,
        error_messages={"required": "Country is required."}
    )
    permanent_zip_code = forms.CharField(
        required=True,
        error_messages={"required": "Zip Code is required."}
    )
    
    # Parent's/Guardian's Information
    father_last_name = forms.CharField(
        required=True,
        error_messages={"required": "Father's Last Name is required."}
    )
    father_first_name = forms.CharField(
        required=True,
        error_messages={"required": "Father's First Name is required."}
    )
    father_middle_name = forms.CharField(required=False)
    father_contact_number = forms.CharField(required=False)
    mother_last_name = forms.CharField(
        required=True,
        error_messages={"required": "Mother's Last Name is required."}
    )
    mother_first_name = forms.CharField(
        required=True,
        error_messages={"required": "Mother's First Name is required."}
    )
    mother_middle_name = forms.CharField(required=False)
    mother_contact_number = forms.CharField(required=False)
    guardian_last_name = forms.CharField(required=False)
    guardian_first_name = forms.CharField(required=False)
    guardian_middle_name = forms.CharField(required=False)
    guardian_contact_number = forms.CharField(required=False)
    
    # IP Community
    ip_community = forms.CharField(required=False)
    ip_community_specify_text = forms.CharField(required=False)
    
    # 4Ps Beneficiary
    beneficiary_4ps = forms.CharField(required=False)
    household_id_number = forms.CharField(required=False)
    
    # Learner with Disability
    learner_with_disability = forms.CharField(required=False)
    disability_type = forms.CharField(required=False)  # Will be handled as JSON
    disability_visual_type = forms.CharField(required=False)  # Will be handled as JSON
    disability_health_type = forms.CharField(required=False)  # Will be handled as JSON
    
    # Learning Modalities
    learning_modality = forms.CharField(required=False)  # Will be handled as JSON - validated in clean()

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

    # Terms
    accept_terms = forms.BooleanField(
        required=True,
        error_messages={"required": "You must accept the terms to continue."}
    )

    # --- Custom Validators ---
    def clean_gen_avg(self):
        gen_avg = self.cleaned_data.get("gen_avg")
        if gen_avg and not (75 <= gen_avg <= 100):
            raise ValidationError("General average must be between 75 and 100.")
        return gen_avg

    def clean_science_avg(self):
        science_avg = self.cleaned_data.get("science_avg")
        enrollment_type = self.cleaned_data.get("enrollment_type")
        if enrollment_type != "JHS" and (science_avg is None or not (75 <= science_avg <= 100)):
            raise ValidationError("Science average must be between 75 and 100.")
        return science_avg

    def clean_math_avg(self):
        math_avg = self.cleaned_data.get("math_avg")
        enrollment_type = self.cleaned_data.get("enrollment_type")
        if enrollment_type != "JHS" and (math_avg is None or not (75 <= math_avg <= 100)):
            raise ValidationError("Mathematics average must be between 75 and 100.")
        return math_avg

    def clean_age(self):
        age = self.cleaned_data.get("age")
        birth_date = self.cleaned_data.get("birth_date")
        grade_level = self.cleaned_data.get("grade_level")
        if grade_level == "7" and (not age or age < 12):
            raise ValidationError("Age must be 12 years old or above.")
        if grade_level == "8" and (not age or age < 13):
            raise ValidationError("Age must be 13 years old or above.")
        if grade_level == "9" and (not age or age < 14):
            raise ValidationError("Age must be 14 years old or above.")
        if grade_level == "10" and (not age or age < 15):
            raise ValidationError("Age must be 15 years old or above.")
        if grade_level == "11" and (not age or age < 16):
            raise ValidationError("Age must be 16 years old or above.")
        if grade_level == "12" and (not age or age < 17):
            raise ValidationError("Age must be 17 years old or above.")
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
        learning_modality = cleaned_data.get("learning_modality")
        student_type = cleaned_data.get("student_type")
        last_grade_level = cleaned_data.get("last_grade_level")
        last_school_year = cleaned_data.get("last_school_year")
        last_school_attended = cleaned_data.get("last_school_attended")
        school_id = cleaned_data.get("school_id")

        # Skip strand/science/math validation for JHS
        if enrollment_type != "JHS" and science_avg is not None and math_avg is not None:
            if science_avg >= 85 and math_avg >= 85:
                if strand not in ["ABM", "STEM"]:
                    raise ValidationError("With your averages, you can only select ABM or STEM.")
            else:
                if strand != "ABM":
                    raise ValidationError("With your averages, only ABM strand is allowed.")

        # Validate returning/transferee fields if student_type is returning or transferee
        if student_type in ["returning", "transferee"]:
            if not last_grade_level or not last_grade_level.strip():
                raise ValidationError({"last_grade_level": "Last Grade Level Completed is required for returning/transferee students."})
            if not last_school_year or not last_school_year.strip():
                raise ValidationError({"last_school_year": "Last School Year Completed is required for returning/transferee students."})
            if not last_school_attended or not last_school_attended.strip():
                raise ValidationError({"last_school_attended": "Last School Attended is required for returning/transferee students."})
            if not school_id or not school_id.strip():
                raise ValidationError({"school_id": "School ID is required for returning/transferee students."})

        # Note: Distance Learning Modalities validation is handled in the view
        # since it's processed as a checkbox list using request.POST.getlist()

        return cleaned_data
