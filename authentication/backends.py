from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from authentication.models import ApplicantInformation, MyUser
from landingpage.models import StudentInformation
UserModel = get_user_model()


class LRNAuthenticationBackend(BaseBackend):
    def authenticate(self, request, lrn=None, email=None, password=None, **kwargs):
        # Try to authenticate MyUser by LRN (ApplicantInformation or StudentInformation)
        if lrn:
            # Try ApplicantInformation
            try:
                applicant_info = ApplicantInformation.objects.select_related("user").get(
                    lrn=lrn
                )
                user = applicant_info.user
                if user.check_password(password):
                    return user
            except ApplicantInformation.DoesNotExist:
                pass

            try:
                student_info = StudentInformation.objects.select_related("user").get(lrn=lrn)
                user = student_info.user
                if user.check_password(password):
                    return user
            except StudentInformation.DoesNotExist:
                return None

        # Try to authenticate MyUser by email and role
        elif email:
            try:
                user = MyUser.objects.get(
                    email=email,
                    user_role__in=["Administrator", "Coordinator", "Teacher"],
                )
                if user.check_password(password):
                    return user
            except MyUser.DoesNotExist:
                return None

        return None

    def get_user(self, user_id):
        try:
            return UserModel.objects.get(pk=user_id)
        except UserModel.DoesNotExist:
            return None
