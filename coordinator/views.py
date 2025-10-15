from django.utils import timezone
import json
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.auth import logout
from django.contrib import messages
from django.views import View
from django.contrib.auth.decorators import user_passes_test, login_required
from django.utils.decorators import method_decorator
from adminside.repositories.all_repository import DocumentRepository, SchoolYearRepository, StudentInformationRepository, StudentListHistoryRepository
from adminside.services.all_service import AssessmentService, StudentInformationService, StudentListHistoryService
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
import logging
from django.http import Http404
from django.db.models import Q
from collections import defaultdict


logger = logging.getLogger(__name__)

def is_coordinator(user):
    return user.is_authenticated and user.user_role in ["Coordinator"]

# ASSESSMENT VIEW
@method_decorator(
    [ login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class AssessmentView(View):
    def get(self, request):
        return render(request, "coordinator/index.html")
    
# GET ASSESSMENT DATA API
@method_decorator(
    [ login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class GetAssessmentDataAPI(View):
    def get(self, request):
        response_data = AssessmentService.get_assessment_data_for_datatables(request)
        return JsonResponse(response_data, safe=False)

# UPDATE ASSESSMENT API
@method_decorator(
    [ login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class UpdateAssessmentAPI(View):
    def post(self, request):
        response_data = AssessmentService.update_assessment(request)
        return JsonResponse(response_data, safe=False)

# DONE ASSESSMENT
@method_decorator(
    [ login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class DoneAssessmentView(View):
    def post(self, request):
        response_data = AssessmentService.done_assessment(request)
        return JsonResponse(response_data, safe=False)

# MARK ALL AS DONE
@method_decorator(
    [ login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class MarkAllAsDoneView(View):
    def post(self, request):
        response_data = AssessmentService.mark_all_as_done(request)
        return JsonResponse(response_data, safe=False)




# STUDENT UNASSIGNED LIST VIEW FOR GRADE 7 to 12
@method_decorator(
    [ login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class StudentUnassignedListView(View):
    def get(self, request, grade):
        if grade not in [7, 8, 9, 10, 11, 12]:
            raise Http404("Grade not found")
        school_year = SchoolYearRepository.get_all().order_by("updated_at").last()
        if school_year is None:
            raise Http404("School year not found")
        print(f"Grade: {grade}")
        documents = DocumentRepository.get_all()
        sections = Section.objects.filter(grade_level=grade, academic_year=school_year)
        return render( request, "coordinator/student_unassigned_list.html",{"grade": grade, "documents": documents, "sections": sections})

# GET STUDENT UNASSIGNED LIST API
@method_decorator(
    [ login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class GetStudentUnassignedListViewAPI(View):
    def get(self, request, grade):
        if grade not in [7, 8, 9, 10, 11, 12]:
            raise Http404("Grade not found")
        # get the latest school year
        school_year = SchoolYearRepository.get_all().order_by("updated_at").last()
        logger.info(f"School years: {school_year}")
        if school_year is None:
            raise Http404("School year not found")
        
        response_data = StudentInformationService.get_student_unassigned_list_for_datatables(request, grade, school_year)
        return JsonResponse(response_data, safe=False)


@method_decorator(
    [ login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class GradeLevelAcademicYearView(View):
    def get(self, request, grade):
        if grade not in [7, 8, 9, 10, 11, 12]:
            raise Http404("Grade not found")
        school_years = SchoolYearRepository.get_all().order_by("id").reverse()
        return render(request, "coordinator/grade_level_school_year.html", {"grade": grade, "school_years": school_years})


@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class GradeLevelView(View):
    def get(self, request, grade, school_year):
        # Validate grade
        if grade not in [7, 8, 9, 10, 11, 12]:
            raise Http404("Grade not found")
        
        # current school year
        current_school_year = SchoolYearRepository.get_all().order_by("updated_at").last()

        # Validate school year
        school_year_obj = SchoolYearRepository.filter(name=school_year).first()
        if school_year_obj is None:
            raise Http404("School year not found")

        # Get all sections for the grade and this school year
        sections = Section.objects.filter(grade_level=grade, academic_year=school_year_obj.name)

        # 🧠 Step 1: Get all teachers assigned to *this* school year
        assigned_teacher_ids_this_year = Section.objects.filter(
            academic_year=school_year_obj.name
        ).exclude(teacher__isnull=True).values_list("teacher_id", flat=True)

        # 🧠 Step 2: Get all teachers assigned in *other* school years (we’ll exclude them later)
        assigned_teacher_ids_other_years = Section.objects.exclude(
            academic_year=school_year_obj.name
        ).exclude(teacher__isnull=True).values_list("teacher_id", flat=True)

        # 🧠 Step 3: Determine teacher availability logic
        if assigned_teacher_ids_this_year.exists():
            # If there are already teachers assigned in this year → only show unassigned ones
            teachers = TeacherInformation.objects.exclude(
                id__in=assigned_teacher_ids_this_year
            ).filter(grade_level=grade)
        else:
            # If no teachers are assigned in this year → show all (since all are available)
            teachers = TeacherInformation.objects.filter(grade_level=grade)

        teachers = teachers.order_by("last_name")

        # Update student counts in each section
        for section in sections:
            students_counted = StudentListHistoryRepository.filter(
                section=section,
                grade_level=section.grade_level,
                school_year=section.academic_year,
                student_information__student_status="Enrolled",
                student_information__user__deactivated=False,
            )

            current_slot = students_counted.count()
            if section.current_slot != current_slot:
                section.current_slot = current_slot
                section.save(update_fields=["current_slot"])

        return render(
            request,
            "coordinator/grade_level.html",
            {
                "grade": grade,
                "sections": sections,
                "teachers": teachers,
                "school_year": school_year_obj,
                "current_school_year": current_school_year,
            },
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
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class AutoSectionView(View):
    def post(self, request):
        data = json.loads(request.body)
        grade_level = int(data.get("grade_level"))
        if grade_level not in [7, 8, 9, 10, 11, 12]:
            return JsonResponse({
                "success": False,
                "message": "Invalid grade level."
            }, status=400)

        # ✅ 1. Get current school year
        current_academic_year = SchoolYearRepository.get_all().order_by("updated_at").last()
        if not current_academic_year:
            return JsonResponse({
                "success": False,
                "message": "No school year found."
            }, status=400)

        current_school_year_name = current_academic_year.name
        logger.info(f"Current school year: {current_school_year_name}")

        # ✅ 2. Fetch sections for this grade & current school year only
        sections = Section.objects.filter(
            grade_level=grade_level,
            academic_year=current_school_year_name,
            current_slot__lt=F("max_slot"),
            status="Active"
        ).order_by("section_id")

        if not sections.exists():
            return JsonResponse({
                "success": False,
                "message": f"No available sections for Grade {grade_level} in S.Y. {current_school_year_name}. Please create sections first."
            }, status=400)
            
        # ✅ 3. Fetch students for same grade & school year
        students = StudentInformation.objects.filter(
            grade=grade_level,
            school_year=current_school_year_name,
            section__isnull=True,
            student_status="Enrolled",
            user__deactivated=False
        ).order_by("-gen_avg", "gender")

        if grade_level == 10:
            students = students.filter(jhs_completed=False)
        elif grade_level in [11, 12]:
            students = students.filter(shs_completed=False)

        if not students.exists():
            return JsonResponse({
                "success": False,
                "message": f"No unassigned students found for Grade {grade_level} in S.Y. {current_school_year_name}."
            }, status=400)

        assigned_count = 0

        # ✅ 4. Assign per strand (for SHS)
        if grade_level in [11, 12]:
            strand_students = defaultdict(list)
            for s in students:
                strand_students[s.strand].append(s)

            for strand, strand_group in strand_students.items():
                strand_sections = [
                    s for s in sections
                    if (s.strand or '').strip().lower() == (strand or '').strip().lower()
                ]
                if not strand_sections:
                    continue

                male_students = [s for s in strand_group if (s.gender or '').lower() == "male"]
                female_students = [s for s in strand_group if (s.gender or '').lower() == "female"]
                distributed = male_students + female_students

                section_slots = {s.section_id: s.max_slot - s.current_slot for s in strand_sections}
                section_map = {s.section_id: s for s in strand_sections}
                section_assignments = {s.section_id: [] for s in strand_sections}

                for student in distributed:
                    eligible = [sid for sid in section_slots if section_slots[sid] > 0]
                    if not eligible:
                        break

                    section_totals = {sid: sum(st.gen_avg or 0 for st in section_assignments[sid]) for sid in eligible}
                    target_id = min(section_totals, key=section_totals.get)
                    section = section_map[target_id]

                    # assign
                    student.section = section.section_name
                    student.save()

                    StudentListHistoryRepository.create(
                        teacher_information=section.teacher,
                        student_information=student,
                        section=section,
                        grade_level=grade_level,
                        previous_final_average=student.gen_avg,
                        school_year=current_school_year_name,
                        created_at=timezone.now(),
                    )

                    section_assignments[target_id].append(student)
                    section.current_slot += 1
                    section.save(update_fields=["current_slot"])
                    section_slots[target_id] -= 1
                    assigned_count += 1
        else:
            # ✅ Grades 7–10
            male_students = [s for s in students if s.gender.lower() == "male"]
            female_students = [s for s in students if s.gender.lower() == "female"]
            distributed = male_students + female_students

            section_slots = {s.section_id: s.max_slot - s.current_slot for s in sections}
            section_map = {s.section_id: s for s in sections}
            section_assignments = {s.section_id: [] for s in sections}

            for student in distributed:
                eligible = [sid for sid in section_slots if section_slots[sid] > 0]
                if not eligible:
                    break

                section_totals = {sid: sum(st.gen_avg or 0 for st in section_assignments[sid]) for sid in eligible}
                target_id = min(section_totals, key=section_totals.get)
                section = section_map[target_id]

                student.section = section.section_name
                student.save()

                StudentListHistoryRepository.create(
                    teacher_information=section.teacher,
                    student_information=student,
                    section=section,
                    grade_level=grade_level,
                    previous_final_average=student.gen_avg,
                    school_year=current_school_year_name,
                    created_at=timezone.now(),
                )

                section_assignments[target_id].append(student)
                section.current_slot += 1
                section.save(update_fields=["current_slot"])
                section_slots[target_id] -= 1
                assigned_count += 1

        # ✅ 5. Return
        return JsonResponse({
            "success": True,
            "message": f"{assigned_count} students successfully assigned to sections for {current_school_year_name}."
        })

# STUDENT ASSIGNED LIST VIEW
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class StudentAssignedListView(View):
    def get(self, request, grade, school_year, section_name):
        if grade not in [7, 8, 9, 10, 11, 12]:
            raise Http404("Grade not found")
        school_year = SchoolYearRepository.filter(name=school_year).first()
        sections = Section.objects.filter(grade_level=grade, academic_year=school_year)
        current_section = Section.objects.get(section_name=section_name, grade_level=grade, academic_year=school_year)
        if school_year is None:
            raise Http404("School year not found")
        documents = DocumentRepository.get_all()
        return render(request, "coordinator/student_assigned_list.html", {"grade": grade, "school_year": school_year, "section_name": section_name, "documents": documents, "sections": sections, "current_section": current_section})

# STUDENT ASSIGNED LIST API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class GetStudentAssignedListViewAPI(View):
    def get(self, request, grade, school_year, section_name):
        response_data = StudentListHistoryService.get_student_list_history_for_datatables(request, grade, school_year, section_name)
        return JsonResponse(response_data, safe=False)
    
# MOVE STUDENT API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class MoveStudentAPI(View):
    def post(self, request):
        response_data = StudentListHistoryService.move_student(request)
        return JsonResponse(response_data, safe=False)



# DELETE STUDENT API
@method_decorator(
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
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
    [login_required(login_url="/authentication/sign-in/"), user_passes_test(is_coordinator)],
    name="dispatch",
)
class EditStudentStatusView(View):
    def post(self, request):
        response = StudentInformationService.edit_student_status(request)
        return JsonResponse(response)


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
