from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth import get_user_model
from django.contrib import messages
from django.views import View
from .models import MyUser, ApplicantInformation
from landingpage.models import StudentInformation
from .utils import capitalize_words, send_verification_email, send_post_verification_email, send_password_reset_email
from django.http import JsonResponse, HttpResponse
from .forms import RegistrationForm, LoginForm
from django.utils import timezone
import pytz
from django.utils.http import urlsafe_base64_decode
from .tokens import (
    email_verification_token_generator,
    password_reset_token_generator,
)
import logging


logger = logging.getLogger(__name__)


class RegistrationView(View):
    def get(self, request):
        form = RegistrationForm()
        return render(request, "authentication/register.html", {"form": form})

    def post(self, request):
        form = RegistrationForm(request.POST)

        if not form.is_valid():
            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse({
                    "success": False,
                    "errors": form.errors
                })
            return render(request, "authentication/register.html", {"form": form})

        user = MyUser.objects.create_user(
            email=form.cleaned_data["email"],
            password=form.cleaned_data["password"],
            user_role="Applicant",
        )

        ApplicantInformation.objects.create(
            user=user,
            first_name=capitalize_words(form.cleaned_data["first_name"]),
            middle_name=capitalize_words(form.cleaned_data["middle_name"]),
            last_name=capitalize_words(form.cleaned_data["last_name"]),
            lrn=form.cleaned_data["lrn"],
            psa_no=form.cleaned_data["psa_no"],
        )

        email_sent = False
        try:
            send_verification_email(user, request)
            email_sent = True
        except Exception as exc:
            logger.exception("Unable to send verification email for %s", user.email)

        success_message = (
            "Registration received. Please check your email to verify your account before logging in."
        )

        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse({
                "success": True,
                "message": success_message,
                "email": user.email,
                "email_sent": email_sent
            })

        messages.success(request, success_message)
        return redirect("login")


class LoginView(View):
    def get(self, request):
        form = LoginForm()
        return render(request, "authentication/login.html", {"form": form})

    def post(self, request):
        form = LoginForm(request.POST)

        if form.is_valid():
            lrn = form.cleaned_data["lrn"]
            password = form.cleaned_data["password"]

            user = authenticate(request, lrn=lrn, password=password)

            if user is not None:
                if hasattr(user, "deactivated") and user.deactivated:
                    response_data = {
                        "success": False,
                        "message": "Your account has been deactivated. Please visit the school administrator for assistance.",
                    }
                    if request.headers.get("x-requested-with") == "XMLHttpRequest":
                        return JsonResponse(response_data)
                    return render(request, "authentication/login.html", {"form": form, "error": response_data["message"]})

                if user.user_role == "Applicant" and not getattr(user, "email_verified", False):
                    email_sent = False
                    try:
                        send_verification_email(user, request)
                        email_sent = True
                    except Exception:
                        logger.exception(
                            "Unable to send verification email for %s during login", user.email
                        )

                    base_message = "Please verify your email before logging in."
                    ajax_message = "" if email_sent else base_message
                    template_message = (
                        "Please verify your email before logging in. A new verification link has been sent to your email."
                        if email_sent
                        else base_message
                    )

                    response_data = {
                        "success": False,
                        "unverified": True,
                        "email": getattr(user, "email", ""),
                        "email_sent": email_sent,
                        "resend_cooldown": 60,
                    }
                    if ajax_message:
                        response_data["message"] = ajax_message

                    if request.headers.get("x-requested-with") == "XMLHttpRequest":
                        return JsonResponse(response_data)
                    return render(
                        request,
                        "authentication/login.html",
                        {"form": form, "error": template_message},
                    )

                user.updated_at = timezone.now().astimezone(pytz.timezone("Asia/Manila"))
                user.is_active = True
                user.save(update_fields=["updated_at", "is_active"])
                login(request, user)
                request.session.set_expiry(86400)

                response_data = {
                    "success": True,
                    "message": "Logged in successfully!",
                    "redirect_url": "/",
                }
                if request.headers.get("x-requested-with") == "XMLHttpRequest":
                    return JsonResponse(response_data)
                return redirect("home")
            response_data = {"success": False, "message": "Invalid LRN or password"}
        else:
            response_data = {
                "success": False,
                "errors": form.errors,
            }
        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse(response_data)

        return render(request, "authentication/login.html", {"form": form, "error": response_data.get("message")})

class LogoutView(View):
    def get(self, request):
        if request.user.is_authenticated:
            user = request.user
            philippine_time = timezone.now().astimezone(pytz.timezone("Asia/Manila"))
            user.is_active = False
            user.updated_at = philippine_time
            user.save(update_fields=["is_active", "updated_at"])
        logout(request)
        messages.success(request, "Logged out successfully!")
        return redirect("home")


def test_user_model(request):
    user_model = get_user_model()
    return HttpResponse(f"User model: {user_model}")


class SignInView(View):
    def get(self, request):
        return render(request, "authentication/admin_login.html")

    def post(self, request):
        email = request.POST.get("email", "").strip()
        password = request.POST.get("password", "").strip()

        if not email or "@" not in email or not password:
            return JsonResponse(
                {"success": False, "message": "Invalid email or missing fields"},
                status=400,
            )

        request.session.flush()
        user = authenticate(request, email=email, password=password)

        if user is not None:
            if hasattr(user, 'deactivated') and user.deactivated:
                return JsonResponse(
                    {"success": False, "message": "Your account has been deactivated. Please visit the school administrator for assistance."},
                    status=403,
                )
            if user.user_role in [
                "Administrator",
                "Teacher",
                "Coordinator",
            ]:
                philippine_time = timezone.now().astimezone(pytz.timezone("Asia/Manila"))
                user.updated_at = philippine_time
                user.is_active = True
                user.save(update_fields=["updated_at", "is_active"])
                login(request, user)
                request.session.set_expiry(86400)

                # Redirect based on user role
                if user.user_role == "Coordinator":
                    redirect_url = "/coordinator/assessment/"
                elif user.user_role == "Administrator":
                    redirect_url = "/admin/dashboard/"
                elif user.user_role == "Teacher":
                    redirect_url = "/teacher/student_list/"

                return JsonResponse(
                    {
                        "success": True,
                        "message": "Logged in successfully!",
                        "redirect_url": redirect_url,
                    }
                )

        return JsonResponse(
            {"success": False, "message": "Invalid email or password"}, status=401
        )


class VerifyEmailView(View):
    def get(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
        except Exception:
            uid = None

        user = None
        if uid:
            try:
                user = MyUser.objects.get(pk=uid)
            except MyUser.DoesNotExist:
                user = None

        if user and email_verification_token_generator.check_token(user, token):
            if not user.email_verified:
                user.email_verified = True
                user.save(update_fields=["email_verified"])
                try:
                    applicant = ApplicantInformation.objects.filter(user=user).first()
                    lrn = applicant.lrn if applicant else ""
                    send_post_verification_email(user, lrn, request)
                except Exception:
                    pass
            return render(request, "authentication/verify_result.html", {"success": True})

        return render(request, "authentication/verify_result.html", {"success": False})


class ResendVerificationView(View):
    def post(self, request):
        email = request.POST.get("email", "").strip()
        if not email:
            return JsonResponse({"success": False, "message": "Email is required."}, status=400)

        try:
            user = MyUser.objects.get(email=email)
        except MyUser.DoesNotExist:
            return JsonResponse({"success": False, "message": "No account found for this email."}, status=404)

        if getattr(user, "email_verified", False):
            return JsonResponse({"success": False, "message": "Email is already verified."}, status=400)

        try:
            send_verification_email(user, request)
        except Exception:
            return JsonResponse({"success": False, "message": "Unable to send verification email right now."}, status=500)

        return JsonResponse({"success": True, "message": "Verification email re-sent. Please check your inbox and spam folder."})


class PasswordResetRequestView(View):
    template_name = "authentication/password_reset_request.html"

    def get(self, request):
        return render(request, self.template_name)

    def post(self, request):
        email = request.POST.get("email", "").strip()
        is_ajax = request.headers.get("x-requested-with") == "XMLHttpRequest"

        if not email:
            message = "Email is required."
            if is_ajax:
                return JsonResponse({"success": False, "message": message}, status=400)
            return render(request, self.template_name, {"error": message, "submitted_email": email})

        try:
            user = MyUser.objects.get(email=email)
        except MyUser.DoesNotExist:
            message = "This email is not existing."
            if is_ajax:
                return JsonResponse({"success": False, "message": message}, status=404)
            return render(request, self.template_name, {"error": message, "submitted_email": email})

        sent = send_password_reset_email(user, request)
        if not sent:
            message = "Unable to send reset email right now."
            if is_ajax:
                return JsonResponse({"success": False, "message": message}, status=500)
            return render(request, self.template_name, {"error": message, "submitted_email": email})

        success_message = "A reset link has been sent to your email."
        if is_ajax:
            return JsonResponse({"success": True, "message": success_message})
        return render(request, self.template_name, {"email_sent": True, "email": email})


class PasswordResetConfirmView(View):
    def get(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = MyUser.objects.get(pk=uid)
        except Exception:
            return render(request, "authentication/password_reset_result.html", {"success": False})

        if not password_reset_token_generator.check_token(user, token):
            return render(request, "authentication/password_reset_result.html", {"success": False})

        return render(request, "authentication/password_reset_form.html", {"uidb64": uidb64, "token": token})

    def post(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = MyUser.objects.get(pk=uid)
        except Exception:
            return render(request, "authentication/password_reset_result.html", {"success": False})

        if not password_reset_token_generator.check_token(user, token):
            return render(request, "authentication/password_reset_result.html", {"success": False})

        password = request.POST.get("password", "")
        confirm = request.POST.get("confirm_password", "")
        if not password or not confirm or password != confirm:
            return render(request, "authentication/password_reset_form.html", {
                "uidb64": uidb64,
                "token": token,
                "error": "Passwords do not match."
            })

        user.set_password(password)
        user.save(update_fields=["password"])
        return render(request, "authentication/password_reset_result.html", {"success": True})
