from django.urls import path
from .views import RegistrationView, LoginView, LogoutView, test_user_model, SignInView, VerifyEmailView, ResendVerificationView

urlpatterns = [
    path("register/", RegistrationView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("test-user-model/", test_user_model),
    path("sign-in/", SignInView.as_view(), name="signin"),
    path("verify/<uidb64>/<token>/", VerifyEmailView.as_view(), name="verify_email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="resend_verification"),
]
