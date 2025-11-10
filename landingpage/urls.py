from django.urls import path

from landingpage.views import (
    AboutView,
    AnnouncementDetailView,
    AnnouncementsView,
    ChangeEmailView,
    ChangePasswordView,
    ContactView,
    EnrollmentView,
    GetEnrollmentManagementView,
    HomeView,
    JuniorEnrollmentView,
    ProfileView,
    SeniorEnrollmentView,
)

urlpatterns = [
    path("", HomeView.as_view(), name="home"),
    path("about/", AboutView.as_view(), name="about"),
    path("announcements/", AnnouncementsView.as_view(), name="announcements"),
    path("enrollment/", EnrollmentView.as_view(), name="enrollment"),
    path("contact/", ContactView.as_view(), name="contact"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("profile/change-email/", ChangeEmailView.as_view(), name="profile_change_email"),
    path("profile/change-password/", ChangePasswordView.as_view(), name="profile_change_password"),
    path(
        "enrollment/junior/", JuniorEnrollmentView.as_view(), name="junior_enrollment"
    ),
    path(
        "enrollment/senior/", SeniorEnrollmentView.as_view(), name="senior_enrollment"
    ),
    path(
        "get_enrollment_management/",
        GetEnrollmentManagementView.as_view(),
        name="get_enrollment_management",
    ),
    path("announcement/<int:announcement_id>/", AnnouncementDetailView.as_view(), name="announcement_detail"),
]
