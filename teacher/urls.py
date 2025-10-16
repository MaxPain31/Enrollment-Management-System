from django.urls import path
from teacher.views import (
    ExportExcelFile,
    MarkAsCompletedSectionView,
    StudentListAPI,
    StudentListView,
    TeacherLogoutView,
    ExportStudentsExcelView, 
    InputFinalAverageView,
)


urlpatterns = [
    path("student_list/", StudentListView.as_view(), name="student_list"),
    path("student_list/data/", StudentListAPI.as_view(), name="student_list_data"),
    path("logout/", TeacherLogoutView.as_view(), name="teacher_logout"),
    path("export_students_excel/", ExportStudentsExcelView.as_view(), name="export_students_excel"),
    path("input_final_average/", InputFinalAverageView.as_view(), name="input_final_average"),
    path("mark_as_completed_section/", MarkAsCompletedSectionView.as_view(), name="mark_as_completed_section"),
    path("export_excel/", ExportExcelFile.as_view(), name="export_excel"),
]
