from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from django.utils import timezone
from .utils import capitalize_words
import pytz


class MyUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("user_role", "Administrator")
        return self.create_user(email, password=password, **extra_fields)


class MyUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(verbose_name="email address", max_length=255, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(null=True, blank=True)
    deactivated = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)
    jhs_submitted = models.BooleanField(default=False, null=True, blank=True)
    shs_submitted = models.BooleanField(default=False, null=True, blank=True)

    USER_ROLE_CHOICES = [
        ("Student", "Student"),
        ("Applicant", "Applicant"),
        ("Administrator", "Administrator"),
        ("Coordinator", "Coordinator"),
        ("Teacher", "Teacher"),
    ]
    user_role = models.CharField(
        max_length=50, choices=USER_ROLE_CHOICES, default="Applicant"
    )

    objects = MyUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "user"

    def __str__(self):
        return self.email

    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True

    @property
    def is_staff(self):
        return self.user_role == "Administrator"

    def save(self, *args, **kwargs):
        now = timezone.now().astimezone(pytz.timezone("Asia/Manila"))
        if not self.id:
            self.created_at = now
        self.updated_at = now
        super().save(*args, **kwargs)


class TeacherInformation(models.Model):
    user = models.OneToOneField(MyUser, on_delete=models.CASCADE)
    first_name = models.CharField(max_length=255)
    middle_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255)
    position = models.CharField(max_length=255, blank=True, null=True)
    grade_level = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "teacher_information"

    def save(self, *args, **kwargs):
        self.first_name = capitalize_words(self.first_name)
        self.middle_name = capitalize_words(self.middle_name)
        self.last_name = capitalize_words(self.last_name)
        self.position = capitalize_words(self.position)
        self.grade_level = capitalize_words(self.grade_level)
        super().save(*args, **kwargs)


class ApplicantInformation(models.Model):
    user = models.OneToOneField(MyUser, on_delete=models.CASCADE)
    lrn = models.CharField(max_length=255, unique=True, blank=True, null=True)
    psa_no = models.CharField(max_length=255, unique=True, blank=True, null=True)
    first_name = models.CharField(max_length=255)
    middle_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255)

    class Meta:
        db_table = "applicant_information"

    def save(self, *args, **kwargs):
        self.first_name = capitalize_words(self.first_name)
        self.middle_name = capitalize_words(self.middle_name)
        self.last_name = capitalize_words(self.last_name)
        super().save(*args, **kwargs)


class AdminInformation(models.Model):
    user = models.OneToOneField(MyUser, on_delete=models.CASCADE)
    first_name = models.CharField(max_length=255)
    middle_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255)
    position = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "admin_information"

    def save(self, *args, **kwargs):
        self.first_name = capitalize_words(self.first_name)
        self.middle_name = capitalize_words(self.middle_name)
        self.last_name = capitalize_words(self.last_name)
        self.position = capitalize_words(self.position)
        super().save(*args, **kwargs)


class CoordinatorInformation(models.Model):
    user = models.OneToOneField(MyUser, on_delete=models.CASCADE)
    first_name = models.CharField(max_length=255)
    middle_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255)
    position = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "coordinator_information"

    def save(self, *args, **kwargs):
        self.first_name = capitalize_words(self.first_name)
        self.middle_name = capitalize_words(self.middle_name)
        self.last_name = capitalize_words(self.last_name)
        self.position = capitalize_words(self.position)
        super().save(*args, **kwargs)
