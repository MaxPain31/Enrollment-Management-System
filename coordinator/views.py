from django.utils import timezone
import json
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.auth import logout
from django.contrib import messages
from django.views import View
from django.contrib.auth.decorators import user_passes_test, login_required
from django.utils.decorators import method_decorator
from landingpage.models import (
    ApplicationApproved,
    Assessment,
    Section,
    StudentInformation,
    EnrollmentManagement
)
from django.db.models import F
import pytz
from authentication.models import ApplicantInformation, MyUser, TeacherInformation
import json

def is_coordinator(user):
    return user.is_authenticated and user.user_role in ["Coordinator"]

@method_decorator(
    [
        login_required(login_url="/authentication/sign-in/"),
        user_passes_test(is_coordinator),
    ],
    name="dispatch",
)
class CoordinatorAssessmentView(View):
    def get(self, request):
        applications = ApplicationApproved.objects.filter(
           is_assessed=False, enrollment__grade_level=7, enrollment__status="Complete", 
        )
        assessments = Assessment.objects.all()
        assessments_dict = {
            assessment.application_approved.enrollment.id: assessment
            for assessment in assessments
        }

        for application in applications:
            assessment = assessments_dict.get(application.enrollment.id)
            if assessment:
                application.assessment = assessment
                print(
                    f"Application ID: {application.enrollment.id}, Assessment: {assessment}"
                )

        return render(request, "coordinator/index.html", {"applications": applications})


@method_decorator(
    [
        login_required(login_url="/authentication/sign-in/"),
        user_passes_test(is_coordinator),
    ],
    name="dispatch",
)
class DoneAssessmentView(View):
    def post(self, request):
        enrollment_id = request.POST.get("enrollment_id")
        literacy_level = request.POST.get("literacy_level")
        literacy_result = request.POST.get("literacy_result")
        numeracy_level = request.POST.get("numeracy_level")
        numeracy_result = request.POST.get("numeracy_result")

        if not enrollment_id:
            messages.error(request, "Application ID is missing.")
            return redirect("assessment_view")

        if not all([literacy_level, literacy_result, numeracy_level, numeracy_result]):
            messages.error(request, "You didn't put all fields of assessment.")
            return redirect("assessment_view")

        try:
            application = ApplicationApproved.objects.get(enrollment=enrollment_id)
            assessment_obj, _ = Assessment.objects.update_or_create(
                application_approved=application,
                defaults={
                    "literacy_level": literacy_level,
                    "literacy_result": literacy_result,
                    "numeracy_level": numeracy_level,
                    "numeracy_result": numeracy_result,
                },
            )

            application.is_assessed = True
            application.save()

            # Update or create the student record
            enrollment = application.enrollment
            StudentInformation.objects.update_or_create(
                application_approved=application,
                defaults={
                    "user": enrollment.user,
                    "application_no": enrollment.application_no,
                    "status": enrollment.status,
                    "created_at": enrollment.created_at,
                    "school_year": enrollment.school_year,
                    "grade": enrollment.grade_level,
                    "with_lrn": enrollment.with_lrn,
                    "student_type": enrollment.student_type,
                    "gen_avg": enrollment.gen_avg,
                    "section": None,
                    "psa_no": enrollment.psa_no,
                    "lrn": enrollment.lrn,
                    "first_name": enrollment.first_name,
                    "middle_name": enrollment.middle_name,
                    "last_name": enrollment.last_name,
                    "extension_name": enrollment.extension_name,
                    "birth_date": enrollment.birth_date,
                    "age": enrollment.age,
                    "gender": enrollment.gender,
                    "place_of_birth": enrollment.place_of_birth,
                    "mother_tongue": enrollment.mother_tongue,
                    "documents_submitted": enrollment.documents_submitted,
                    "early_reg": enrollment.early_reg,
                    "is_approved": True,
                    "enrollment_type": enrollment.enrollment_type,
                    "semester": enrollment.semester,
                    "strand": enrollment.strand,
                    "student_status": "Enrolled",
                    "assessment": assessment_obj,
                },
            )

            ApplicantInformation.objects.filter(user=application.enrollment.user).delete()
            application.enrollment.user.user_role = "Student"
            application.enrollment.user.save()

            return JsonResponse(
                {
                    "success": True,
                    "message": "Assessment saved successfully.",
                }
            )
        except ApplicationApproved.DoesNotExist:
            return JsonResponse(
                {"success": False, "message": "Application not found."}, status=404
            )
        except Exception as e:
            return JsonResponse(
                {"success": False, "message": f"An error occurred: {str(e)}"},
                status=500,
            )


@method_decorator(
    [
        login_required(login_url="/authentication/sign-in/"),
        user_passes_test(is_coordinator),
    ],
    name="dispatch",
)
class StudentUnassignedListView(View):
    def get(self, request, grade):
        print(f"Grade (raw): {grade}")

        # Ensure grade is a string
        grade = str(grade)

        filters = {
            "grade": grade,
            "section__isnull": True,
            "student_status": "Enrolled",
            "user__deactivated": False,
        }

        # Apply additional filters based on grade level
        if grade == "10":
            filters["jhs_completed"] = False
        elif grade in ["11", "12"]:
            filters["jhs_completed"] = True
            filters["shs_completed"] = False

        print(f"Applied filters: {filters}")

        students = StudentInformation.objects.filter(**filters).select_related(
            "application_approved", "assessment"
        )

        print(f"Student count found: {students.count()}")

        return render(
            request,
            "coordinator/student_unassigned_list.html",
            {"grade": grade, "students": students},
        )


@method_decorator(
    [
        login_required(login_url="/authentication/sign-in/"),
        user_passes_test(is_coordinator),
    ],
    name="dispatch",
)
class GradeLevelView(View):
    def get(self, request, grade):
        settings = EnrollmentManagement.objects.get(id=1)
        sections = Section.objects.filter(grade_level=grade)
        assigned_teacher_ids = Section.objects.exclude(teacher__isnull=True).values_list("teacher_id", flat=True)
        teachers = TeacherInformation.objects.exclude(id__in=assigned_teacher_ids).order_by("grade_level")
        teachers = teachers.filter(grade_level=grade)
        for section in sections:
            # Fix: count only students with matching section name, grade, and academic year
            students_counted = StudentInformation.objects.filter(
                section=section.section_name,
                grade=section.grade_level,
                school_year=section.academic_year,
                student_status="Enrolled",
                user__deactivated=False,
            )
            print(f"Section: {section.section_name} (Grade {section.grade_level}, {section.academic_year}) - Students counted: {[f'{s.first_name} {s.last_name} ({s.school_year})' for s in students_counted]}")
            current_slot = students_counted.count()
            if section.current_slot != current_slot:
                section.current_slot = current_slot
                section.save(update_fields=["current_slot"])

        return render(
            request,
            "coordinator/grade_level.html",
            {"grade": grade, "sections": sections, "teachers": teachers, "settings": settings},
        )


@method_decorator(
    [
        login_required(login_url="/authentication/sign-in/"),
        user_passes_test(is_coordinator),
    ],
    name="dispatch",
)
class AddSectionView(View):
    def post(self, request):
        strand = request.POST.get("strand")
        section_name = request.POST.get("section_name")
        max_slot = request.POST.get("max_slot")
        grade_level = request.POST.get("grade_level")
        academic_year = request.POST.get("academic_year")
        status = request.POST.get("status")
        teacher_id = request.POST.get("teacher_name")

        if (
            not section_name
            or not max_slot
            or not grade_level
            or not academic_year
            or not status
            or not teacher_id
        ):
            return JsonResponse(
                {"success": False, "message": "All fields are required."}
            )

        try:
            teacher_info = TeacherInformation.objects.get(id=teacher_id)
        except TeacherInformation.DoesNotExist:
            return JsonResponse(
                {"success": False, "message": "Selected teacher does not exist."},
                status=400,
            )

        Section.objects.create(
            section_name=section_name,
            strand=strand,
            max_slot=max_slot,
            grade_level=grade_level,
            current_slot=0,
            academic_year=academic_year,
            status=status,
            teacher=teacher_info,
        )
        return JsonResponse({"success": True, "message": "Section added successfully."})


@method_decorator(
    [
        login_required(login_url="/authentication/sign-in/"),
        user_passes_test(is_coordinator),
    ],
    name="dispatch",
)
class AutoSectionView(View):
    def post(self, request):
        data = json.loads(request.body)
        grade_level = data.get("grade_level")
        # Only get sections for the specific grade
        sections = Section.objects.filter(
            grade_level=grade_level, current_slot__lt=F("max_slot")
        ).order_by("section_id")

        if not sections.exists():
            return JsonResponse(
                {
                    "success": False,
                    "message": "You don't have any sections. Please create sections first!",
                },
                status=400,
            )

        # Only get students for the specific grade
        students = StudentInformation.objects.filter(
            grade=grade_level, section__isnull=True, student_status="Enrolled", user__deactivated=False
        ).order_by("-gen_avg", "gender")

        # Filter students for auto-sectioning based on grade_level and completion status
        if int(grade_level) == 10:
            students = students.filter(jhs_completed=False)
        elif int(grade_level) == 11:
            students = students.filter(shs_completed=False, grade=11)
        elif int(grade_level) == 12:
            students = students.filter(shs_completed=False, grade=12)

        if not students.exists():
            return JsonResponse(
                {
                    "success": False,
                    "message": f"No unassigned students found for Grade {grade_level}.",
                },
                status=400,
            )

        # Get the current academic year from settings
        settings = EnrollmentManagement.objects.get(id=1)
        current_academic_year = f"{settings.academic_year_start}-{settings.academic_year_end}"
        # Check if all sections have the same academic year as the current
        if not all(section.academic_year == current_academic_year for section in sections):
            return JsonResponse({
                "success": False,
                "message": "Please update the academic years of all sections for this grade before auto-assigning students."
            }, status=400)

        assigned_count = 0
        # For grades 11/12, distribute by strand, but only for the current grade
        if int(grade_level) in [11, 12]:
            from collections import defaultdict
            strand_students = defaultdict(list)
            for student in students:
                strand_students[student.strand].append(student)
            for strand, students_in_strand in strand_students.items():
                # Only get sections for this grade and strand
                strand_sections = [s for s in sections if (s.strand or '').strip().lower() == (strand or '').strip().lower() and str(s.grade_level) == str(grade_level)]
                if not strand_sections:
                    continue
                male_students = [s for s in students_in_strand if (s.gender or '').lower() == "male"]
                female_students = [s for s in students_in_strand if (s.gender or '').lower() == "female"]
                distributed_students = male_students + female_students
                section_slots = {section.section_id: section.max_slot - section.current_slot for section in strand_sections}
                section_map = {section.section_id: section for section in strand_sections}
                section_ids = [section.section_id for section in strand_sections]
                section_assignments = {section_id: [] for section_id in section_ids}
                for student in distributed_students:
                    eligible_sections = [sid for sid in section_ids if section_slots[sid] > 0]
                    if not eligible_sections:
                        break
                    section_totals = {sid: sum(s.gen_avg or 0 for s in section_assignments[sid]) for sid in eligible_sections}
                    target_section_id = min(section_totals, key=section_totals.get)
                    section = section_map[target_section_id]
                    student.section = section.section_name
                    student.save()
                    section_assignments[target_section_id].append(student)
                    section.current_slot += 1
                    section.save(update_fields=["current_slot"])
                    section_slots[target_section_id] -= 1
                    assigned_count += 1
        else:
            # For other grades, use the original logic
            male_students = [student for student in students if student.gender.lower() == "male"]
            female_students = [student for student in students if student.gender.lower() == "female"]
            distributed_students = male_students + female_students
            section_slots = {section.section_id: section.max_slot - section.current_slot for section in sections}
            section_map = {section.section_id: section for section in sections}
            section_ids = [section.section_id for section in sections]
            section_assignments = {section_id: [] for section_id in section_ids}
            for student in distributed_students:
                eligible_sections = [sid for sid in section_ids if section_slots[sid] > 0]
                if not eligible_sections:
                    break
                section_totals = {sid: sum(s.gen_avg or 0 for s in section_assignments[sid]) for sid in eligible_sections}
                target_section_id = min(section_totals, key=section_totals.get)
                section = section_map[target_section_id]
                student.section = section.section_name
                student.save()
                section_assignments[target_section_id].append(student)
                section.current_slot += 1
                section.save(update_fields=["current_slot"])
                section_slots[target_section_id] -= 1
                assigned_count += 1
        return JsonResponse({
            "success": True,
            "message": f"{assigned_count} students have been successfully assigned to section. Remaining students were not assigned because all sections are full.",
        })


@method_decorator(
    [
        login_required(login_url="/authentication/sign-in/"),
        user_passes_test(is_coordinator),
    ],
    name="dispatch",
)
class StudentAssignedListView(View):
    def get(self, request, grade, section_id):
        try:
            section = Section.objects.get(section_id=section_id)
            if section.teacher:
                section.teacher_name = f"{section.teacher.first_name} {section.teacher.last_name}"
            else:
                section.teacher_name = "None"
            students = StudentInformation.objects.filter(
                grade=grade,
                section=section.section_name,
                school_year=section.academic_year,
                student_status="Enrolled",
                user__deactivated=False,
            ).select_related("application_approved", "assessment")

        except Section.DoesNotExist:
            print("Section does not exist.")
            return render(
                request,
                "coordinator/student_assigned_list.html",
                {"grade": grade, "section": None, "students": []},
            )

        return render(
            request,
            "coordinator/student_assigned_list.html",
            {"grade": grade, "section": section, "students": students},
        )


@method_decorator(
    [
        login_required(login_url="/authentication/sign-in/"),
        user_passes_test(is_coordinator),
    ],
    name="dispatch",
)
class DeleteStudentView(View):
    def post(self, request, student_id):
        try:
            student = get_object_or_404(StudentInformation, id=student_id)
            student.delete()
            return JsonResponse(
                {"success": True, "message": "Student deleted successfully."}
            )
        except Exception as e:
            return JsonResponse(
                {"success": False, "message": f"Error: {str(e)}"}, status=400
            )


@method_decorator(
    [
        login_required(login_url="/authentication/sign-in/"),
        user_passes_test(is_coordinator),
    ],
    name="dispatch",
)
class EditStudentStatusView(View):
    def post(self, request, student_id):
        try:
            student = get_object_or_404(StudentInformation, id=student_id)
            print(student)
            new_status = request.POST.get("student_status")

            if new_status not in ["Enrolled", "Transferred", "Dropped"]:
                return JsonResponse(
                    {"success": False, "message": "Invalid student status."},
                    status=400,
                )

            student.student_status = new_status
            student.save()

            return JsonResponse(
                {"success": True, "message": "Student status updated successfully."}
            )
        except Exception as e:
            return JsonResponse(
                {"success": False, "message": f"Error: {str(e)}"}, status=400
            )


class CoordinatorLogoutView(View):
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


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class GetSectionView(View):
    def get(self, request, section_id):
        try:
            section = Section.objects.get(section_id=section_id)
            data = {
                "section_id": section.section_id,
                "section_name": section.section_name,
                "strand": section.strand,
                "max_slot": section.max_slot,
                "teacher_id": section.teacher.id if section.teacher else None,
                "teacher_name": f"{section.teacher.first_name} {section.teacher.last_name}" if section.teacher else None,
                "academic_year": section.academic_year,
                "status": section.status,
            }
            print(f"Section data: {data}")
            return JsonResponse(data)
        except Section.DoesNotExist:
            return JsonResponse({"success": False, "message": "Section not found."}, status=404)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class UpdateSectionView(View):
    def put(self, request, section_id):
        try:
            data = json.loads(request.body)
            section = Section.objects.get(section_id=section_id)

            section.section_name = data.get("section_name", section.section_name)
            section.max_slot = data.get("max_slot", section.max_slot)
            teacher_id = data.get("teacher_name")
            if teacher_id:
                section.teacher = MyUser.objects.get(id=teacher_id, user_role="Teacher")
            section.academic_year = data.get("academic_year", section.academic_year)
            section.status = data.get("status", section.status)
            section.save()

            return JsonResponse({"success": True, "message": "Section updated successfully."})
        except Section.DoesNotExist:
            return JsonResponse({"success": False, "message": "Section not found."}, status=404)
        except MyUser.DoesNotExist:
            return JsonResponse({"success": False, "message": "Teacher not found."}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=500)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class DeleteSectionView(View):
    def delete(self, request, section_id):
        try:
            section = Section.objects.get(section_id=section_id)
            if section.current_slot > 0:
                return JsonResponse(
                    {"success": False, "message": "Section cannot be deleted because it has assigned students."},
                    status=400,
                )
            section.delete()
            return JsonResponse({"success": True, "message": "Section deleted successfully."})
        except Section.DoesNotExist:
            return JsonResponse({"success": False, "message": "Section not found."}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=500)


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class UpdateAllAcademicYearsSectionView(View):
    def post(self, request, grade):
        try:
            settings = EnrollmentManagement.objects.get(id=1)
            new_academic_year = f"{settings.academic_year_start}-{settings.academic_year_end}"
            print(f"New academic year: {new_academic_year}")
            sections = Section.objects.filter(grade_level=grade)
            if not sections.exists():
                return JsonResponse({
                    "success": False,
                    "message": f"No sections found for grade {grade}."
                }, status=404)
            if all(section.academic_year == new_academic_year for section in sections):
                return JsonResponse({
                    "success": True,
                    "message": f"Academic Year is up to date."
                })
            for section in sections:
                if section.academic_year != new_academic_year:
                    section.academic_year = new_academic_year
                    section.save()
            return JsonResponse({
                "success": True,
                "message": f"Updated section(s) in grade {grade} to academic year {new_academic_year}."
            })
        except EnrollmentManagement.DoesNotExist:
            return JsonResponse({"success": False, "message": "Enrollment settings not found."}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=500)
