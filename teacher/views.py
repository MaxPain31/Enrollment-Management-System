from django.shortcuts import render,redirect
from django.views import View
from django.contrib.auth import logout
import pytz
from django.utils import timezone
from django.contrib import messages
from landingpage.models import StudentInformation, Section, EnrollmentManagement
from django.contrib.auth.decorators import user_passes_test, login_required
from django.utils.decorators import method_decorator
from django.http import JsonResponse
import json
from django.http import HttpResponse
import openpyxl
import os
from django.conf import settings
from django.http import HttpResponse

def is_coordinator(user):
    return user.is_authenticated and user.user_role in ["Teacher"]


@method_decorator(
    [
        login_required(login_url="/authentication/sign-in/"),
        user_passes_test(is_coordinator),
    ],
    name="dispatch",
)
class TeacherStudentList(View):
    def get(self, request):
        teacher_info = getattr(request.user, "teacherinformation", None)
        gender = request.GET.get("gender", None)

        if teacher_info:
            section = Section.objects.filter(teacher=teacher_info).first()
            students_qs = StudentInformation.objects.filter(
                section=section.section_name,
                student_status="Enrolled",
                user__deactivated=False,
                school_year=section.academic_year
            ) if section else StudentInformation.objects.none()
            if gender:
                students_qs = students_qs.filter(gender__iexact=gender)
            students = students_qs
        else:
            section = None
            students = []

        return render(
            request, "teacher/index.html", {"students": students, "section": section}
        )


@method_decorator(
    [
        login_required(login_url="/authentication/sign-in/"),
        user_passes_test(is_coordinator),
    ],
    name="dispatch",
)
class InputFinalGradeView(View):
    def post(self, request, student_id):
        try:
            data = json.loads(request.body)
            gen_avg = data.get("gen_avg")
            print(gen_avg)
            if int(gen_avg) < 75 or int(gen_avg) > 100:
                return JsonResponse(
                    {
                        "success": False,
                        "message": "General Average must be between 75 and 100.",
                    },
                    status=400,
                )
            if not gen_avg:
                return JsonResponse({'success': False, 'message': 'Missing final grade.'}, status=400)
            student = StudentInformation.objects.get(id=student_id)
            settings = EnrollmentManagement.objects.get(id=1)
            new_academic_year = f"{settings.academic_year_start}-{settings.academic_year_end}"
            if student.school_year == new_academic_year:
                return JsonResponse({'success': False, 'message': 'Academic year is still ongoing.'}, status=400)
            student.gen_avg = gen_avg
            student.school_year = new_academic_year
            student.section = None
            current_grade = int(student.grade)
            # JHS: 7-10, SHS: 11-12
            if 7 <= current_grade < 10:
                student.grade = str(current_grade + 1)
            elif current_grade == 10:
                student.jhs_completed = True
                student.save()
            elif current_grade == 11:
                student.grade = '12'
            elif current_grade == 12:
                student.shs_completed = True
            student.save()
            return JsonResponse({'success': True, 'message': 'Final grade, academic year, and grade level updated successfully.'})
        except StudentInformation.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Student not found.'}, status=404)
        except EnrollmentManagement.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Enrollment settings not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)


@method_decorator(
    [
        login_required(login_url="/authentication/sign-in/"),
        user_passes_test(is_coordinator),
    ],
    name="dispatch",
)
class ExportStudentsExcelView(View):
    def get(self, request):
        try:
            # Get teacher's section
            teacher_info = getattr(request.user, "teacherinformation", None)
            section = Section.objects.filter(teacher=teacher_info).first()

            if not section:
                return HttpResponse("Section not found.", status=404)

            students = StudentInformation.objects.filter(
                section=section.section_name,
                student_status="Enrolled",
                user__deactivated=False,
                school_year=section.academic_year,
            ).order_by("last_name")

            # Load Excel template
            template_path = os.path.join(
                settings.BASE_DIR, "enrollmentwebsite/static/excel/Masterlist.xlsx"
            )
            if not os.path.exists(template_path):
                return HttpResponse("Template file not found.", status=404)

            wb = openpyxl.load_workbook(template_path)
            ws = wb.active

            # Start rows
            male_row = 12
            female_row = 63

            for student in students:
                full_name = f"{student.last_name}, {student.first_name} {student.middle_name or ''}".strip()
                if student.gender.lower() == "male":
                    ws[f"B{male_row}"] = full_name
                    male_row += 1
                elif student.gender.lower() == "female":
                    ws[f"B{female_row}"] = full_name
                    female_row += 1

            # Prepare response
            filename = f"Masterlist_{section.section_name}.xlsx"
            response = HttpResponse(
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            wb.save(response)
            return response

        except Exception as e:
            return HttpResponse(f"Error: {str(e)}", status=500)


class TeacherLogoutView(View):
    def get(self, request):
        if request.user.is_authenticated:
            user = request.user
            philippine_time = timezone.now().astimezone(pytz.timezone("Asia/Manila"))
            user.is_active = False
            user.updated_at = philippine_time
            user.save(update_fields=["is_active", "updated_at"])
            request.session.flush()

        logout(request)
        messages.success(request, "Logged out successfully!")

        return redirect("signin")


# Create your views here.
