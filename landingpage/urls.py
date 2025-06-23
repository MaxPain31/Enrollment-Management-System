from django.urls import path

from landingpage.views import (
    HomeView,
    AboutView,
    AnnouncementsView,
    EnrollmentView,
    ContactView,
    ProfileView,
    JuniorEnrollmentView,
    SeniorEnrollmentView,
    GetEnrollmentManagementView,
    AnnouncementDetailView,
)

urlpatterns = [
    path("", HomeView.as_view(), name="home"),
    path("about/", AboutView.as_view(), name="about"),
    path("announcements/", AnnouncementsView.as_view(), name="announcements"),
    path("enrollment/", EnrollmentView.as_view(), name="enrollment"),
    path("contact/", ContactView.as_view(), name="contact"),
    path("profile/", ProfileView.as_view(), name="profile"),
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
