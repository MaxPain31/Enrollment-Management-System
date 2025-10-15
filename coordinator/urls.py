from django.urls import path

from django.urls import path
from .views import (
    AutoSectionView,
    DeleteStudentView,
    GetStudentAssignedListViewAPI,
    GetStudentUnassignedListViewAPI,
    GradeLevelAcademicYearView,
    MarkAllAsDoneView,
    MoveStudentAPI,
    StudentAssignedListView,
    StudentUnassignedListView,
    GradeLevelView,
    AddSectionView,
    CoordinatorLogoutView,
    GetSectionView,
    UpdateAssessmentAPI,
    UpdateSectionView,
    DeleteSectionView,
    EditStudentStatusView,
    UpdateAllAcademicYearsSectionView,
    AssessmentView,
    GetAssessmentDataAPI,   
    DoneAssessmentView,
)



urlpatterns = [
    # ASSESSMENT URLS
    path("assessment/", AssessmentView.as_view(), name="assessment_view"),
    path("assessment/data/", GetAssessmentDataAPI.as_view(), name="assessment_data"),
    path("assessment/update/", UpdateAssessmentAPI.as_view(), name="update_assessment"),
    path("assessment/done/", DoneAssessmentView.as_view(), name="done_assessment"),
    path("assessment/mark-all-as-done/", MarkAllAsDoneView.as_view(), name="mark_all_as_done"),
    
    # STUDENT UNASSIGNED LIST URLS
    path("student-unassigned-list/<int:grade>/", StudentUnassignedListView.as_view(), name="student_unassigned_list"),
    path("student-unassigned-list/<int:grade>/data/", GetStudentUnassignedListViewAPI.as_view(), name="student_unassigned_list_data"),
    
    
    # GRADE LEVEL URLS
    path("grade-level/<int:grade>/", GradeLevelAcademicYearView.as_view(), name="grade_level_academic_year"),
    path( "grade_level/<int:grade>/<str:school_year>/", GradeLevelView.as_view(), name="grade_level"),
    
    # STUDENT ASSIGNED LIST URLS
    path("grade-level/<int:grade>/<str:school_year>/<str:section_name>/", StudentAssignedListView.as_view(), name="student_assigned_list"),
    path("grade-level/<int:grade>/<str:school_year>/<str:section_name>/data/", GetStudentAssignedListViewAPI.as_view(), name="student_assigned_list_data"),
    path("move-student/", MoveStudentAPI.as_view(), name="move_student"),


    # SECTION URLS
    path("add-section/", AddSectionView.as_view(), name="add_section"),
    path("auto-section/", AutoSectionView.as_view(), name="auto_section"),
    path( "delete-student/<int:student_id>/", DeleteStudentView.as_view(), name="delete_student"),
    path("get-section/<int:section_id>/", GetSectionView.as_view(), name="get_section"),
    path("update-section/<int:section_id>/", UpdateSectionView.as_view(), name="update_section"),
    path("delete-section/<int:section_id>/", DeleteSectionView.as_view(), name="delete_section"),
    path("edit-student-status/", EditStudentStatusView.as_view(), name="edit_student_status"),
    path("update-academic-year/<int:grade>/",UpdateAllAcademicYearsSectionView.as_view(),name="update_academic_year"),
    
    # LOGOUT URL
    path("logout/", CoordinatorLogoutView.as_view(), name="coordinator_logout"),
]
