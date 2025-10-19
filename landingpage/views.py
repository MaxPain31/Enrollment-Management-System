from django.shortcuts import render, redirect, get_object_or_404
from django.views import View
from django.contrib import messages
import json

from adminside.repositories.all_repository import AnnouncementRepository, FAQRepository
from .models import EnrollmentForm, Announcement, EnrollmentManagement, StudentInformation, OrganizationChart
from authentication.models import ApplicantInformation
from django.db.models import Count
from django.utils import timezone
from datetime import datetime, timedelta
from django.utils import timezone
from django.http import JsonResponse
from django.core.paginator import Paginator
from .forms import EnrollmentForm as EnrollmentValidationForm
from .utils import emailNotification


class HomeView(View):
    def get(self, request):
        faqs = FAQRepository.get_all().order_by("-created_at")
        latest_announcements = AnnouncementRepository.get_all().filter(status="active").order_by("-date")[:2]

        # Organizational chart data
        org_all = OrganizationChart.objects.all()

        principal = (
            org_all.filter(position__icontains="Principal").first()
            or org_all.filter(designation__iexact="Principal").first()
        )

        admin_staff = org_all.filter(designation__iexact="Administrative Staff").order_by("department", "name")
        support_staff = org_all.filter(designation__iexact="Support Staff").order_by("department", "name")
        jhs_faculty = org_all.filter(designation__iexact="Junior High School Faculty").order_by("department", "name")
        shs_faculty = org_all.filter(designation__iexact="Senior High School Faculty").order_by("department", "name")

        def group_by_department(qs):
            grouped = {}
            for item in qs:
                dept = item.department or "General"
                grouped.setdefault(dept, []).append(item)
            # return as list of tuples for template stable order
            return [(dept, members) for dept, members in grouped.items()]

        # Enrollment analytics data
        enrollment_analytics = get_enrollment_analytics()

        context = {
            "latest_announcements": latest_announcements,
            "faqs": faqs,
            "principal": principal,
            "admin_staff": admin_staff,
            "support_staff": support_staff,
            "jhs_grouped": group_by_department(jhs_faculty),
            "shs_grouped": group_by_department(shs_faculty),
            "enrollment_analytics": enrollment_analytics,
        }

        return render(request, "index.html", context)


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
            user_role = request.user.user_role
            
            if user_role == "Student":
                student_info = StudentInformation.objects.filter(user=request.user).first()
                context["info"] = student_info
                context["info_type"] = "student"
            elif user_role == "Applicant":
                applicant_info = ApplicantInformation.objects.filter(user=request.user).first()
                context["info"] = applicant_info
                context["info_type"] = "applicant"
            elif user_role == "Administrator":
                from authentication.models import AdminInformation
                admin_info = AdminInformation.objects.filter(user=request.user).first()
                context["info"] = admin_info
                context["info_type"] = "administrator"
            elif user_role == "Coordinator":
                from authentication.models import CoordinatorInformation
                coordinator_info = CoordinatorInformation.objects.filter(user=request.user).first()
                context["info"] = coordinator_info
                context["info_type"] = "coordinator"
            elif user_role == "Teacher":
                from authentication.models import TeacherInformation
                teacher_info = TeacherInformation.objects.filter(user=request.user).first()
                context["info"] = teacher_info
                context["info_type"] = "teacher"
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


def get_enrollment_analytics():
    try:
        all_school_years = StudentInformation.objects.values_list('school_year', flat=True).distinct().order_by('-school_year')
        years = list(all_school_years)
        
        # Get JHS enrollment data by grade and year
        jhs_data = {}
        for grade in range(7, 11):  # Grades 7-10
            jhs_data[f"Grade {grade}"] = []
            for year in years:
                count = StudentInformation.objects.filter(
                    grade=str(grade),
                    enrollment_type="JHS",
                    school_year=year
                ).count()
                jhs_data[f"Grade {grade}"].append(count)
        
        # Get SHS enrollment data by strand and year
        shs_data = {}
        strands = ["ABM", "STEM"]
        for strand in strands:
            shs_data[f"Grade 11 {strand}"] = []
            shs_data[f"Grade 12 {strand}"] = []
            for year in years:
                # Grade 11
                count_11 = StudentInformation.objects.filter(
                    grade="11",
                    enrollment_type="SHS",
                    strand=strand,
                    school_year=year
                ).count()
                shs_data[f"Grade 11 {strand}"].append(count_11)
                
                # Grade 12
                count_12 = StudentInformation.objects.filter(
                    grade="12",
                    enrollment_type="SHS",
                    strand=strand,
                    school_year=year
                ).count()
                shs_data[f"Grade 12 {strand}"].append(count_12)
        
        return json.dumps({
            "years": years,
            "jhs_data": jhs_data,
            "shs_data": shs_data,
        })
    except Exception as e:
        # Return empty data if there's an error
        return json.dumps({
            "years": [],
            "jhs_data": {},
            "shs_data": {},
        })

