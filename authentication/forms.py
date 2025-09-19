from django import forms
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from .models import ApplicantInformation
from landingpage.models import StudentInformation 
from django.contrib.auth.password_validation import validate_password

MyUser = get_user_model()

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

class RegistrationForm(BaseLRNForm):
    email = forms.EmailField(
        error_messages={
            "required": "Email is required.",
            "invalid": "Please enter a valid email address."
        }
    )
    psa_no = forms.CharField(
        max_length=20,
        error_messages={
            "required": "PSA Number is required.",
            "max_length": "PSA Number cannot exceed 20 characters."
        }
    )
    first_name = forms.CharField(
        max_length=100,
        error_messages={
            "required": "First name is required.",
            "max_length": "First name cannot exceed 100 characters."
        }
    )
    middle_name = forms.CharField(
        max_length=100,
        required=False,
        error_messages={
            "max_length": "Middle name cannot exceed 100 characters."
        }
    )
    last_name = forms.CharField(
        max_length=100,
        error_messages={
            "required": "Last name is required.",
            "max_length": "Last name cannot exceed 100 characters."
        }
    )
    password = forms.CharField(
        widget=forms.PasswordInput,
        error_messages={
            "required": "Password is required."
        }
    )
    confirm_password = forms.CharField(
        widget=forms.PasswordInput,
        error_messages={
            "required": "Please confirm your password."
        }
    )

    def clean_email(self):
        email = self.cleaned_data["email"]
        if MyUser.objects.filter(email=email).exists():
            raise ValidationError("Email already exists!")
        return email

    def clean_lrn(self):
        lrn = super().clean_lrn()  # run base LRN validation
        if ApplicantInformation.objects.filter(lrn=lrn).exists() or StudentInformation.objects.filter(lrn=lrn).exists():
            raise ValidationError("LRN already exists!")
        return lrn

    def clean_psa_no(self):
        psa_no = self.cleaned_data.get("psa_no")
        if ApplicantInformation.objects.filter(psa_no=psa_no).exists() or StudentInformation.objects.filter(psa_no=psa_no).exists():
            raise ValidationError("PSA No. already exists!")
        return psa_no

    def clean_password(self):
        password = self.cleaned_data.get("password")
        if password:
            validate_password(password)
        return password

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")
        if password and confirm_password and password != confirm_password:
            self.add_error("confirm_password", "Passwords do not match!")
        return cleaned_data


class LoginForm(BaseLRNForm):
    password = forms.CharField(widget=forms.PasswordInput)

    def clean_lrn(self):
        lrn = super().clean_lrn()
        if not (ApplicantInformation.objects.filter(lrn=lrn).exists() or StudentInformation.objects.filter(lrn=lrn).exists()):
            raise ValidationError("No account found with this LRN.")
        return lrn