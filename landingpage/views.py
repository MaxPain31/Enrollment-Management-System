from django.shortcuts import render, redirect, get_object_or_404
from django.views import View
from django.contrib import messages
from .models import EnrollmentForm, Announcement, EnrollmentManagement, StudentInformation
from authentication.models import ApplicantInformation
from django.utils import timezone
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.core.mail import send_mail


class HomeView(View):
    def get(self, request):
        latest_announcements = Announcement.objects.filter(status="active").order_by("-date")[:2]
        return render(request, "index.html", {"latest_announcements": latest_announcements})


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

            context = {"application_no": application_no, "early_reg": early_reg, "settings": settings}
            if request.user.is_authenticated:
                if hasattr(request.user, 'user_role') and request.user.user_role == "Student":
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
        enrollment_type = request.POST.get("enrollment_type")
        user_id = request.POST.get("user_id")
        application_no = request.POST.get("application_no")
        status = request.POST.get("status")
        created_at = timezone.now()
        school_year = request.POST.get("school_year")
        grade_level = request.POST.get("grade_level")
        with_lrn = request.POST.get("with_lrn")
        student_type = request.POST.get("student_type")
        gen_avg = request.POST.get("gen_avg")
        psa_no = request.POST.get("psa_no")
        lrn = request.POST.get("lrn")
        first_name = request.POST.get("first_name")
        middle_name = request.POST.get("middle_name")
        last_name = request.POST.get("last_name")
        extension_name = request.POST.get("extension_name")
        birth_date = request.POST.get("birth_date")
        age = request.POST.get("age")
        gender = request.POST.get("gender")
        place_of_birth = request.POST.get("place_of_birth")
        mother_tongue = request.POST.get("mother_tongue")
        status = request.POST.get("status")
        early_reg = request.POST.get("early_reg")
        
        required_fields = {
            "school_year": school_year,
            "grade_level": grade_level,
            "gen_avg": gen_avg,
            "psa_no": psa_no,
            "lrn": lrn,
            "first_name": first_name,
            "last_name": last_name,
            "birth_date": birth_date,
            "age": age,
            "gender": gender,
            "place_of_birth": place_of_birth,
            "mother_tongue": mother_tongue,
        }

        missing_fields = [key for key, value in required_fields.items() if not value]
        if missing_fields:
            return JsonResponse(
                {
                    "success": False,
                    "message": f"The following fields are required and missing: {', '.join(missing_fields)}",
                }
            )

        if int(gen_avg) < 75 or int(gen_avg) > 100:
            return JsonResponse(
                {
                    "success": False,
                    "message": "General Average must be between 75 and 100.",
                }
            )
        if int(age) < 11:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Age must be 11 or older.",
                }
            )

        existing_enrollment = EnrollmentForm.objects.filter(lrn=lrn).first()
        if existing_enrollment:
            existing_enrollment.enrollment_type = enrollment_type
            existing_enrollment.user_id = user_id
            existing_enrollment.application_no = application_no
            existing_enrollment.status = status
            existing_enrollment.created_at = created_at
            existing_enrollment.school_year = school_year
            existing_enrollment.grade_level = grade_level
            existing_enrollment.with_lrn = with_lrn
            existing_enrollment.student_type = student_type
            existing_enrollment.gen_avg = gen_avg
            existing_enrollment.psa_no = psa_no
            existing_enrollment.lrn = lrn
            existing_enrollment.first_name = first_name
            existing_enrollment.middle_name = middle_name
            existing_enrollment.last_name = last_name
            existing_enrollment.extension_name = extension_name
            existing_enrollment.birth_date = birth_date
            existing_enrollment.age = age
            existing_enrollment.gender = gender
            existing_enrollment.place_of_birth = place_of_birth
            existing_enrollment.mother_tongue = mother_tongue
            existing_enrollment.early_reg = early_reg
            existing_enrollment.is_approved = None
            existing_enrollment.save()
        else:
            EnrollmentForm.objects.create(
                enrollment_type=enrollment_type,
                user_id=user_id,
                application_no=application_no,
                status=status,
                created_at=created_at,
                school_year=school_year,
                grade_level=grade_level,
                with_lrn=with_lrn,
                student_type=student_type,
                gen_avg=gen_avg,
                psa_no=psa_no,
                lrn=lrn,
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name,
                extension_name=extension_name,
                birth_date=birth_date,
                age=age,
                gender=gender,
                place_of_birth=place_of_birth,
                mother_tongue=mother_tongue,
                early_reg=early_reg,
            )

        user = request.user
        user.jhs_submitted = True
        user.save()
        # For sending email notification
        subject = "Application Form Submitted"
        message_plain = f"""Welcome to Paso De Blas National HighSchool

        Dear {first_name} {last_name},

        Your enrollment form has been successfully submitted.
        Please remember your application number.
        Application No: {application_no}
        Bring the following required documents:
        - Report Card
        - PSA

        Thank you for enrolling at our school!
        """

        message_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="color: #2c3e50;">Welcome to Paso De Blas National HighSchool</h2>
            <p>Dear <strong>{first_name} {last_name}</strong>,</p>
            <p>Your enrollment form has been successfully submitted.</p>
            <p><strong style="color: #2980b9;">Application No: {application_no}</strong></p>
            <p>Please bring the following required documents:</p>
            <ul>
            <li>Report Card</li>
            <li>PSA</li>
            </ul>
            <p>Thank you for enrolling at our school!</p>
        </body>
        </html>
        """
        recipient_email = request.user.email
        send_mail(
            subject,
            message_plain,
            "pdbnhs@gmail.com",
            [recipient_email],
            html_message=message_html,
            fail_silently=False,
        )

        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse(
                {
                    "success": True,
                    "message": f"<strong>Enrollment form has been submitted successfully.</strong><br>Application No: <strong>{application_no}</strong><br>An email notification has been sent to {recipient_email}.",
                    "redirect_url": "/enrollment/",
                }
            )
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
            context = {"application_no": application_no, "early_reg": early_reg, "settings": settings}
            if request.user.is_authenticated:
                if hasattr(request.user, 'user_role') and request.user.user_role == "Student":
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
        enrollment_type = request.POST.get("enrollment_type")
        user_id = request.POST.get("user_id")
        application_no = request.POST.get("application_no")
        status = request.POST.get("status")
        created_at = timezone.now()
        semester = request.POST.get("semester")
        strand = request.POST.get("strand")
        school_year = request.POST.get("school_year")
        grade_level = request.POST.get("grade_level")
        with_lrn = request.POST.get("with_lrn")
        student_type = request.POST.get("student_type")
        gen_avg = request.POST.get("gen_avg")
        psa_no = request.POST.get("psa_no")
        lrn = request.POST.get("lrn")
        first_name = request.POST.get("first_name")
        middle_name = request.POST.get("middle_name")
        last_name = request.POST.get("last_name")
        extension_name = request.POST.get("extension_name")
        birth_date = request.POST.get("birth_date")
        age = request.POST.get("age")
        gender = request.POST.get("gender")
        place_of_birth = request.POST.get("place_of_birth")
        mother_tongue = request.POST.get("mother_tongue")
        status = request.POST.get("status")
        early_reg = request.POST.get("early_reg")
        
        required_fields = {
            "school_year": school_year,
            "grade_level": grade_level,
            "gen_avg": gen_avg,
            "psa_no": psa_no,
            "lrn": lrn,
            "first_name": first_name,
            "last_name": last_name,
            "birth_date": birth_date,
            "age": age,
            "gender": gender,
            "place_of_birth": place_of_birth,
            "mother_tongue": mother_tongue,
        }

        missing_fields = [key for key, value in required_fields.items() if not value]
        if missing_fields:
            return JsonResponse(
                {
                    "success": False,
                    "message": f"The following fields are required and missing: {', '.join(missing_fields)}",
                }
            )
        if int(gen_avg) < 75 or int(gen_avg) > 100:
            return JsonResponse(
                {
                    "success": False,
                    "message": "General Average must be between 75 and 100.",
                }
            )
        if int(age) < 11:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Age must be 11 or older.",
                }
            )

        existing_enrollment = EnrollmentForm.objects.filter(lrn=lrn).first()
        if existing_enrollment:
            existing_enrollment.enrollment_type = enrollment_type
            existing_enrollment.user_id = user_id
            existing_enrollment.application_no = application_no
            existing_enrollment.status = "Complete"
            existing_enrollment.created_at = created_at
            existing_enrollment.school_year = school_year
            existing_enrollment.grade_level = grade_level
            existing_enrollment.with_lrn = with_lrn
            existing_enrollment.semester = semester
            existing_enrollment.strand = strand
            existing_enrollment.student_type = student_type
            existing_enrollment.gen_avg = gen_avg
            existing_enrollment.psa_no = psa_no
            existing_enrollment.lrn = lrn
            existing_enrollment.first_name = first_name
            existing_enrollment.middle_name = middle_name
            existing_enrollment.last_name = last_name
            existing_enrollment.extension_name = extension_name
            existing_enrollment.birth_date = birth_date
            existing_enrollment.age = age
            existing_enrollment.gender = gender
            existing_enrollment.place_of_birth = place_of_birth
            existing_enrollment.mother_tongue = mother_tongue
            existing_enrollment.early_reg = early_reg
            existing_enrollment.is_approved = None
            existing_enrollment.save()
        else:
            EnrollmentForm.objects.create(
                enrollment_type=enrollment_type,
                user_id=user_id,
                application_no=application_no,
                status=status,
                created_at=created_at,
                school_year=school_year,
                grade_level=grade_level,
                with_lrn=with_lrn,
                semester=semester,
                strand=strand,
                student_type=student_type,
                gen_avg=gen_avg,
                psa_no=psa_no,
                lrn=lrn,
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name,
                extension_name=extension_name,
                birth_date=birth_date,
                age=age,
                gender=gender,
                place_of_birth=place_of_birth,
                mother_tongue=mother_tongue,
                early_reg=early_reg,
            )

        user = request.user
        user.shs_submitted = True
        user.save()

        # For sending email notification
        subject = "Application Form Submitted"
        message_plain = f"""Welcome to Paso De Blas National HighSchool

        Dear {first_name} {last_name},

        Your enrollment form has been successfully submitted.
        Please remember your application number.
        Application No: {application_no}
        Bring the following required documents:
        - Report Card
        - PSA

        Thank you for enrolling at our school!
        """

        message_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="color: #2c3e50;">Welcome to Paso De Blas National HighSchool</h2>
            <p>Dear <strong>{first_name} {last_name}</strong>,</p>
            <p>Your enrollment form has been successfully submitted.</p>
            <p><strong style="color: #2980b9;">Application No: {application_no}</strong></p>
            <p>Please bring the following required documents:</p>
            <ul>
            <li>Report Card</li>
            <li>PSA</li>
            </ul>
            <p>Thank you for enrolling at our school!</p>
        </body>
        </html>
        """
        recipient_email = request.user.email
        send_mail(
            subject,
            message_plain,
            "pdbnhs@gmail.com",
            [recipient_email],
            html_message=message_html,
            fail_silently=False,
        )

        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse(
                {
                    "success": True,
                    "message": f"<strong>Enrollment form has been submitted successfully.</strong><br>Application No: <strong>{application_no}</strong><br>An email notification has been sent to {recipient_email}.",
                    "redirect_url": "/enrollment/",
                }
            )
        return redirect("enrollment")


class AnnouncementDetailView(View):
    def get(self, request, announcement_id):
        announcement = get_object_or_404(Announcement, id=announcement_id, status="active")
        return render(request, "announcement_detail.html", {"announcement": announcement})
