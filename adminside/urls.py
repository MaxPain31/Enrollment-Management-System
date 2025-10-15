from django.urls import path
from adminside.views import (
    AdminApplicationBulkApproveView,
    AdminApplicationBulkReApproveView,
    AdminApplicationReApproveView,
    AdminApplicationReapproveActionView,
    AdminDashboardView,
    AdminApplicationView,
    AdminReportsView,
    BulkApproveProgressView,
    BulkReApproveProgressView,
    EditAdminUserView,
    EditCoordinatorUserView,
    EditTeacherUserView,
    GetAdminUserDataAPI,
    GetAnnouncementDataAPI,
    GetApplicationApprovedDataAPI,
    GetApplicationDataView,
    GetCoordinatorUserDataAPI,
    GetStudentUserDataAPI,
    GetTeacherUserDataAPI,
    UpdateApplicationView,
    AllUserView,
    AdminUserView,
    CoordinatorUserView,
    AdminDeleteUserView,
    AddAdminUserView,
    AdminLogoutView,
    ManageAnnouncementView,
    ManageEnrollmentView,
    AdminApplicationActionView,
    AddAnnouncementView,
    EditAnnouncementView,
    DeleteAnnouncementView,
    TeacherUserView,
    StudentUserView,
    AddCoordinatorUserView,
    AddStudentUserView,
    AddTeacherUserView,
    AdminDashboardDataAPI,
    AdminApplicationApprovedView,
    AdminApplicationPendingView,
    AdminActionUserView,
    ChangePasswordView,
    EditStudentStatusView,
    GetApplicationDataAPI,
    AdminApplicationUpdateView,
    AdminApplicationApprovedActionView,
    AdminApplicationPendingActionView,
    GetApplicationPendingDataAPI,
    GetAllUserDataAPI,
)

urlpatterns = [
    # --DASHBOARD--
    path("dashboard/", AdminDashboardView.as_view(), name="admin_dashboard"),
    path("dashboard-data/", AdminDashboardDataAPI.as_view(), name="dashboard_data"),
    
    # --APPLICATION--
    # APPLICATION VIEW
    path("application/", AdminApplicationView.as_view(), name="application"),
    path("applications/data/", GetApplicationDataAPI.as_view(), name="applications-data"),
    path("applications/update/", AdminApplicationUpdateView.as_view(), name="applications-update"),
    path("bulk_approve/", AdminApplicationBulkApproveView.as_view(), name="bulk_approve"),
    path('bulk-approve-progress/<str:batch_key>/', BulkApproveProgressView.as_view(), name='bulk-approve-progress'),
    path("applications/approved/action/", AdminApplicationApprovedActionView.as_view(), name="applications-approved-action"),
    path("applications/pending/action/", AdminApplicationPendingActionView.as_view(), name="applications-pending-action"),
    
    # APPLICATION APPROVED VIEW
    path("application_approved/", AdminApplicationApprovedView.as_view(), name="application_approved"),
    path("applications/approved/data/", GetApplicationApprovedDataAPI.as_view(), name="application_approved_data"),
    
    
    # APPLICATION PENDING VIEW
    path("application_rejected/", AdminApplicationPendingView.as_view(), name="application_rejected"),
    path("applications/pending/data/", GetApplicationPendingDataAPI.as_view(), name="applications-pending-data"),
    path("bulk_reapprove/", AdminApplicationBulkReApproveView.as_view(), name="bulk_reapprove"),
    path('bulk-reapprove-progress/<str:batch_key>/', BulkReApproveProgressView.as_view(), name='bulk-reapprove-progress'),
    path("applications/reapprove/action/", AdminApplicationReapproveActionView.as_view(), name="applications-reapprove-action"),
    
    # --REPORTS--
    path("reports/", AdminReportsView.as_view(), name="reports"),
    
    # CAN BE DELETED THIS FUNCTION
    path("get_application/<int:application_id>/", GetApplicationDataView.as_view(), name="get_application"),
    path("update_application/<int:application_id>/", UpdateApplicationView.as_view(), name="update_application"),
    path("application_action/", AdminApplicationActionView.as_view(), name="application_action"),
    path("reapprove_action/", AdminApplicationReApproveView.as_view(), name="reapprove_action"),
    
    # --MANAGE ENROLLMENT--
    # ENROLLMENT VIEW
    path("manage-enrollment/", ManageEnrollmentView.as_view(), name="manage_enrollment"),
    
    #ANNOUNCEMENT VIEW
    path("manage-announcement/", ManageAnnouncementView.as_view(), name="manage_announcement"),
    path("announcement-data/", GetAnnouncementDataAPI.as_view(), name="announcement_data"),
    path("add-announcement/", AddAnnouncementView.as_view(), name="add_announcement"),
    path("edit-announcement/", EditAnnouncementView.as_view(), name="edit_announcement"),
    path("delete-announcement/", DeleteAnnouncementView.as_view(), name="delete_announcement"),
    
    # --USER MANAGEMENT--
    path("users/", AllUserView.as_view(), name="admin_all_users"),
    path("users/data/", GetAllUserDataAPI.as_view(), name="admin_all_users_data"),
    
    # ADMIN USER MANAGEMENT VIEW
    path("delete_user/<int:user_id>/", AdminDeleteUserView.as_view(), name="delete_user"),
    path("admin-users/", AdminUserView.as_view(), name="admin_users"),
    path("add_admin/", AddAdminUserView.as_view(), name="add_admin_user"),
    path("admin-users/data/", GetAdminUserDataAPI.as_view(), name="admin_users_data"),
    path("edit_admin/", EditAdminUserView.as_view(), name="edit_admin_user"),
    
    
    # STUDENT USER MANAGEMENT VIEW
    path("student-users/", StudentUserView.as_view(), name="student_users"),
    path("add_student/", AddStudentUserView.as_view(), name="add_student_user"),
    path("student-users/data/", GetStudentUserDataAPI.as_view(), name="student_users_data"),
    path("edit_student_status/", EditStudentStatusView.as_view(), name="admin_edit_student_status"),
    
    
    # TEACHER USER MANAGEMENT VIEW
    path("teacher-users/", TeacherUserView.as_view(), name="teacher_users"),
    path("teacher-users/data/", GetTeacherUserDataAPI.as_view(), name="teacher_users_data"),
    path("add_teacher/", AddTeacherUserView.as_view(), name="add_teacher_user"),
    path("edit_teacher/", EditTeacherUserView.as_view(), name="edit_teacher_user"),
    
    # COORDINATOR USER MANAGEMENT VIEW
    path("coordinator-users/", CoordinatorUserView.as_view(), name="coordinator_users"),
    path("coordinator-users/data/", GetCoordinatorUserDataAPI.as_view(), name="coordinator_users_data"),
    path("add_coordinator/", AddCoordinatorUserView.as_view(), name="add_coordinator_user"),
    path("edit_coordinator/", EditCoordinatorUserView.as_view(), name="edit_coordinator_user"),

    # ADMIN LOGOUT
    path("logout/", AdminLogoutView.as_view(), name="admin_logout"),

    # ACTION BUTTONS
    path("deactivate_user/<int:user_id>/", AdminActionUserView.as_view(), name="deactivate_user"),
    path("change_password/", ChangePasswordView.as_view(), name="change_password"),
]
