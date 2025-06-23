from django.urls import path
from coordinator.views import CoordinatorAssessmentView, DoneAssessmentView

from django.urls import path
from .views import (
    AutoSectionView,
    CoordinatorAssessmentView,
    DeleteStudentView,
    StudentAssignedListView,
    StudentUnassignedListView,
    GradeLevelView,
    AddSectionView,
    CoordinatorLogoutView,
    GetSectionView,
    UpdateSectionView,
    DeleteSectionView,
    EditStudentStatusView,
    UpdateAllAcademicYearsSectionView
)

urlpatterns = [
    path("assessment/", CoordinatorAssessmentView.as_view(), name="assessment_view"),
    path("done-assessment/", DoneAssessmentView.as_view(), name="done_assessment"),
    path(
        "student-unassigned-list/grade-7/",
        StudentUnassignedListView.as_view(),
        {"grade": 7},
        name="student_unassigned_list_grade_7",
    ),
    path(
        "student-unassigned-list/grade-8/",
        StudentUnassignedListView.as_view(),
        {"grade": 8},
        name="student_unassigned_list_grade_8",
    ),
    path(
        "student-unassigned-list/grade-9/",
        StudentUnassignedListView.as_view(),
        {"grade": 9},
        name="student_unassigned_list_grade_9",
    ),
    path(
        "student-unassigned-list/grade-10/",
        StudentUnassignedListView.as_view(),
        {"grade": 10},
        name="student_unassigned_list_grade_10",
    ),
    path(
        "student-unassigned-list/grade-11/",
        StudentUnassignedListView.as_view(),
        {"grade": 11},
        name="student_unassigned_list_grade_11",
    ),
    path(
        "student-unassigned-list/grade-12/",
        StudentUnassignedListView.as_view(),
        {"grade": 12},
        name="student_unassigned_list_grade_12",
    ),
    path(
        "grade_level/7/",
        GradeLevelView.as_view(),
        {"grade": 7},
        name="grade_level_7",
    ),
    path(
        "grade_level/8/",
        GradeLevelView.as_view(),
        {"grade": 8},
        name="grade_level_8",
    ),
    path(
        "grade_level/9/",
        GradeLevelView.as_view(),
        {"grade": 9},
        name="grade_level_9",
    ),
    path(
        "grade_level/10/",
        GradeLevelView.as_view(),
        {"grade": 10},
        name="grade_level_10",
    ),
    path(
        "grade_level/11/",
        GradeLevelView.as_view(),
        {"grade": 11},
        name="grade_level_11",
    ),
    path(
        "grade_level/12/",
        GradeLevelView.as_view(),
        {"grade": 12},
        name="grade_level_12",
    ),
    path("add-section/", AddSectionView.as_view(), name="add_section"),
    path("auto-section/", AutoSectionView.as_view(), name="auto_section"),
    path(
        "student-assigned-list/<int:grade>/<int:section_id>/",
        StudentAssignedListView.as_view(),
        name="student_assigned_list",
    ),
    path(
        "delete-student/<int:student_id>/",
        DeleteStudentView.as_view(),
        name="delete_student",
    ),
    path("logout/", CoordinatorLogoutView.as_view(), name="coordinator_logout"),
    path("get-section/<int:section_id>/", GetSectionView.as_view(), name="get_section"),
    path(
        "update-section/<int:section_id>/",
        UpdateSectionView.as_view(),
        name="update_section",
    ),
    path(
        "delete-section/<int:section_id>/",
        DeleteSectionView.as_view(),
        name="delete_section",
    ),
    path(
        "edit-student-status/<int:student_id>/",
        EditStudentStatusView.as_view(),
        name="edit_student_status",
    ),
    path(
        "update-academic-year/<int:grade>/",
        UpdateAllAcademicYearsSectionView.as_view(),
        name="update_academic_year"
    ),
]
