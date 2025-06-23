from django.contrib.auth.backends import BaseBackend
from authentication.models import MyUser


class AuthBackend(BaseBackend):
    def authenticate(self, request, lrn=None, email=None, password=None, **kwargs):
        try:
            if lrn:
                user = MyUser.objects.get(lrn=lrn)
            elif email:
                user = MyUser.objects.get(
                    email=email,
                    user_role__in=["Administrator", "Coordinator", "Teacher"],
                )
            else:
                return None

            if user.check_password(password):
                return user
        except MyUser.DoesNotExist:
            return None

    def get_user(self, user_id):
        try:
            return MyUser.objects.get(pk=user_id)
        except MyUser.DoesNotExist:
            return None
