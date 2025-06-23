from django.urls import path
from teacher.views import (
    TeacherStudentList,
    TeacherLogoutView,
    InputFinalGradeView,
    ExportStudentsExcelView,  # add this import
)


urlpatterns = [
    path("student_list/", TeacherStudentList.as_view(), name="student_list"),
    path("logout/", TeacherLogoutView.as_view(), name="teacher_logout"),
    path("input_final_grade/<int:student_id>/", InputFinalGradeView.as_view(), name="input_final_grade"),
    path("export_students_excel/", ExportStudentsExcelView.as_view(), name="export_students_excel"),
]
