from django.shortcuts import render, redirect, get_object_or_404
from django.views import View
from django.contrib import messages

from adminside.repositories.all_repository import AnnouncementRepository, FAQRepository
from .models import EnrollmentForm, Announcement, EnrollmentManagement, StudentInformation
from authentication.models import ApplicantInformation
from django.utils import timezone
from django.http import JsonResponse
from django.core.paginator import Paginator
from .forms import EnrollmentForm as EnrollmentValidationForm
from .utils import emailNotification


class HomeView(View):
    def get(self, request):
        faqs = FAQRepository.get_all().order_by("-created_at")
        latest_announcements = AnnouncementRepository.get_all().filter(status="active").order_by("-date")[:2]
        return render(request, "index.html", {"latest_announcements": latest_announcements, "faqs": faqs})


class AboutView(View):
    def get(self, request):
        return render(request, "about.html")


class AnnouncementsView(View):
    def get(self, request):
        announcements_list = Announcement.objects.filter(status="active").order_by(
            "-date"
        )
        paginator = Paginator(announcements_list, 5)
        page_number = request.GET.get("page")
        announcements = paginator.get_page(page_number)
        return render(request, "announcements.html", {"announcements": announcements})


class EnrollmentView(View):
    def get(self, request):
        context = {}
        if request.user.is_authenticated:
            if request.user.user_role == "Student":
                student_info = StudentInformation.objects.filter(user=request.user).first()
                context["info"] = student_info
                context["info_type"] = "student"
            else:
                applicant_info = ApplicantInformation.objects.filter(user=request.user).first()
                context["info"] = applicant_info
                context["info_type"] = "applicant"
        return render(request, "enrollment.html", context)


class GetEnrollmentManagementView(View):
    def get(self, request):
        try:
            settings = EnrollmentManagement.objects.get(id=1)

            data = {
                "announcement_content": settings.announcement_content,
                "early_registration_active": settings.early_registration_active,
                "early_registration_start_date": settings.early_registration_start_date,
                "early_registration_deadline_date": settings.early_registration_deadline_date,
                "enrollment_active": settings.enrollment_active,
                "enrollment_start_date": settings.enrollment_start_date,
                "enrollment_deadline_date": settings.enrollment_deadline_date,
            }

            return JsonResponse({"status": "success", "data": data}, status=200)
        except EnrollmentManagement.DoesNotExist:
            return JsonResponse(
                {"status": "error", "message": "Enrollment Management not found."}, status=404
            )


class ContactView(View):
    def get(self, request):
        return render(request, "contact.html")


class ProfileView(View):
    def get(self, request):
        context = {}
        if request.user.is_authenticated:
            if request.user.user_role == "Student":
                student_info = StudentInformation.objects.filter(user=request.user).first()
                context["info"] = student_info
                context["info_type"] = "student"
            else:
                applicant_info = ApplicantInformation.objects.filter(user=request.user).first()
                context["info"] = applicant_info
                context["info_type"] = "applicant"
        return render(request, "profile.html", context)


class JuniorEnrollmentView(View):
    def get(self, request):
        try:
            settings = EnrollmentManagement.objects.get(id=1)
            early_reg = request.GET.get("early_reg", "False") == "True"

            # Security check
            if early_reg and not settings.early_registration_active:
                messages.error(request, "Early registration is not active.")
                return redirect("enrollment")
            if not early_reg and not settings.enrollment_active:
                messages.error(request, "Enrollment is not active.")
                return redirect("enrollment")

            application_no = timezone.now().strftime("%Y-%m%d%H") + str(request.user.id)

            context = {
                "application_no": application_no,
                "early_reg": early_reg,
                "settings": settings,
                "form": EnrollmentValidationForm(initial={
                    "application_no": application_no,
                    "early_reg": early_reg,
                    "user_id": request.user.id,
                    "user_role": getattr(request.user, "user_role", None)
                })
            }

            if request.user.is_authenticated:
                if getattr(request.user, "user_role", None) == "Student":
                    student_info = StudentInformation.objects.filter(user=request.user).first()
                    context["info"] = student_info
                    context["info_type"] = "student"
                else:
                    applicant_info = ApplicantInformation.objects.filter(user=request.user).first()
                    context["info"] = applicant_info
                    context["info_type"] = "applicant"

            return render(request, "junior_enrollment.html", context)

        except EnrollmentManagement.DoesNotExist:
            messages.error(request, "Enrollment settings not found.")
            return redirect("enrollment")

    def post(self, request):
        form = EnrollmentValidationForm(request.POST)

        if not form.is_valid():
            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse({"success": False, "errors": form.errors})
            return render(request, "junior_enrollment.html", {"form": form})

        cleaned_data = form.cleaned_data

        model_fields = [f.name for f in EnrollmentForm._meta.get_fields()]
        valid_data = {k: v for k, v in cleaned_data.items() if k in model_fields}
        valid_data['user'] = request.user
        valid_data['user_id'] = request.user.id

        enrollment, created = EnrollmentForm.objects.update_or_create(
            lrn=cleaned_data["lrn"],
            defaults=valid_data,
        )
        
        user = request.user
        user.jhs_submitted = True
        user.save()

        emailNotification(
            form.cleaned_data["first_name"],
            form.cleaned_data["last_name"],
            form.cleaned_data["application_no"],
            user.email,
        )

        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse({
                "success": True,
                "message": (
                    f"<strong>Enrollment form has been submitted successfully.</strong><br>"
                    f"Application No: <strong>{form.cleaned_data['application_no']}</strong><br>"
                    f"An email notification has been sent to {user.email}."
                ),
                "redirect_url": "/enrollment/",
            })

        messages.success(request, "Enrollment form submitted successfully!")
        return redirect("enrollment")




class SeniorEnrollmentView(View):
    def get(self, request):
        try:
            settings = EnrollmentManagement.objects.get(id=1)
            early_reg = request.GET.get("early_reg", "False") == "True"

            # Security check
            if early_reg and not settings.early_registration_active:
                messages.error(request, "Early registration is not active.")
                return redirect("enrollment")
            if not early_reg and not settings.enrollment_active:
                messages.error(request, "Enrollment is not active.")
                return redirect("enrollment")

            application_no = timezone.now().strftime("%Y-%m%d%H") + str(request.user.id)

            context = {
                "application_no": application_no,
                "early_reg": early_reg,
                "settings": settings,
                "form": EnrollmentValidationForm(initial={
                    "application_no": application_no,
                    "early_reg": early_reg,
                    "user_id": request.user.id,
                    "user_role": getattr(request.user, "user_role", None)
                })
            }

            if request.user.is_authenticated:
                if getattr(request.user, "user_role", None) == "Student":
                    student_info = StudentInformation.objects.filter(user=request.user).first()
                    context["info"] = student_info
                    context["info_type"] = "student"
                else:
                    applicant_info = ApplicantInformation.objects.filter(user=request.user).first()
                    context["info"] = applicant_info
                    context["info_type"] = "applicant"

            return render(request, "senior_enrollment.html", context)

        except EnrollmentManagement.DoesNotExist:
            messages.error(request, "Enrollment settings not found.")
            return redirect("enrollment")

    def post(self, request):
        form = EnrollmentValidationForm(request.POST)

        if not form.is_valid():
            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse({"success": False, "errors": form.errors})
            return render(request, "senior_enrollment.html", {"form": form})
        
        cleaned_data = form.cleaned_data

        model_fields = [f.name for f in EnrollmentForm._meta.get_fields()]
        valid_data = {k: v for k, v in cleaned_data.items() if k in model_fields}
        valid_data['user'] = request.user
        valid_data['user_id'] = request.user.id
        
        enrollment, created = EnrollmentForm.objects.update_or_create(
            lrn=cleaned_data["lrn"],
            defaults=valid_data,
        )

        # Mark user as submitted
        user = request.user
        user.shs_submitted = True
        user.save(update_fields=["shs_submitted"])

        # Send email notification
        emailNotification(
            first_name=form.cleaned_data["first_name"],
            last_name=form.cleaned_data["last_name"],
            application_no=form.cleaned_data["application_no"],
            recipient_email=user.email,
        )

        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse(
                {
                    "success": True,
                    "message": (
                        f"<strong>Enrollment form has been submitted successfully.</strong><br>"
                        f"Application No: <strong>{form.cleaned_data['application_no']}</strong><br>"
                        f"An email notification has been sent to {user.email}."
                    ),
                    "redirect_url": "/enrollment/",
                }
            )

        return redirect("enrollment")

class AnnouncementDetailView(View):
    def get(self, request, announcement_id):
        announcement = get_object_or_404(Announcement, id=announcement_id, status="active")
        return render(request, "announcement_detail.html", {"announcement": announcement})

