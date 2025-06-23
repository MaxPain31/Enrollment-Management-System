from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth import get_user_model
from django.contrib import messages
from django.views import View
from .models import MyUser, ApplicantInformation
from landingpage.models import StudentInformation
from .utils import capitalize_words
from django.http import JsonResponse, HttpResponse
from django.utils import timezone
import pytz


class RegistrationView(View):
    def get(self, request):
        return render(request, "authentication/register.html")

    def post(self, request):
        email = request.POST.get("email")
        lrn = request.POST.get("lrn")
        psa_no = request.POST.get("psa_no")
        first_name = capitalize_words(request.POST.get("first_name"))
        middle_name = capitalize_words(request.POST.get("middle_name"))
        last_name = capitalize_words(request.POST.get("last_name"))
        password = request.POST.get("password")
        confirm_password = request.POST.get("confirm_password")

        if password != confirm_password:
            message = {"success": False, "message": "Passwords do not match!"}
            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse(message)
            messages.error(request, message["message"])
            return redirect("register")

        if MyUser.objects.filter(email=email).exists():
            message = {"success": False, "message": "Email already exists!"}
            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse(message)
            messages.error(request, message["message"])
            return redirect("register")

        if ApplicantInformation.objects.filter(lrn=lrn).exists() or StudentInformation.objects.filter(
            lrn=lrn
        ).exists():
            message = {"success": False, "message": "LRN already exists!"}
            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse(message)
            messages.error(request, message["message"])
            return redirect("register")

        user = MyUser.objects.create_user(
            email=email,
            password=password,
            user_role="Applicant",
        )
        user.save()

        ApplicantInformation.objects.create(
            user=user,
            first_name=first_name,
            middle_name=middle_name,
            last_name=last_name,
            lrn=lrn,
            psa_no=psa_no,
        )

        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse(
                {
                    "success": True,
                    "message": "Account created successfully! You can now log in.",
                }
            )
        return redirect("login")


class LoginView(View):
    def get(self, request):
        return render(request, "authentication/login.html")

    def post(self, request):
        lrn = request.POST.get("lrn")
        password = request.POST.get("password")
        user = authenticate(request, lrn=lrn, password=password)

        if user is not None:
            if hasattr(user, 'deactivated') and user.deactivated:
                response_data = {
                    "success": False,
                    "message": "Your account has been deactivated. Please visit the school administrator for assistance.",
                }
                if request.headers.get("x-requested-with") == "XMLHttpRequest":
                    return JsonResponse(response_data)
                return render(request, "authentication/login.html", {"error": response_data["message"]})
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
        else:
            response_data = {"success": False, "message": "Invalid LRN or password"}

        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse(response_data)

        if user and (not hasattr(user, 'deactivated') or not user.deactivated):
            return redirect("home")
        return render(
            request,
            "authentication/login.html",
            {"error": response_data["message"]},
        )


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
