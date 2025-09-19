from django.contrib.auth import get_user_model
from authentication.models import ApplicantInformation
from landingpage.models import EnrollmentForm
import random
from django.utils import timezone
import factory
from faker import Faker

fake = Faker()
User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.LazyFunction(lambda: fake.unique.email())
    password = factory.PostGenerationMethodCall('set_password', 'MaxPain11@')
    user_role = "Applicant"


class EnrollmentFormFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = EnrollmentForm

    user = factory.SubFactory(UserFactory)
    created_at = factory.LazyFunction(timezone.now)
    status = "Missing"
    school_year = "2025-2026"
    grade_level = "11"
    student_type = "TRANSFEREE"
    gen_avg = factory.LazyFunction(lambda: random.randint(75, 100))

    # Application no like 2025-0918009
    application_no = factory.LazyFunction(
        lambda: f"{timezone.now().year}-{random.randint(1000000, 9999999)}"
    )

    # PSA no like 22-0004
    psa_no = factory.LazyFunction(
        lambda: f"{str(timezone.now().year)[-2:]}-{random.randint(1, 9999):04d}"
    )

    # LRN 12 digits
    lrn = factory.LazyFunction(lambda: f"{random.randint(10**11, 10**12-1)}")
    enrollment_type = "SHS"

    first_name = factory.LazyAttribute(lambda _: fake.first_name())
    middle_name = factory.LazyAttribute(lambda _: fake.first_name())
    last_name = factory.LazyAttribute(lambda _: fake.last_name())
    extension_name = ""
    birth_date = factory.LazyFunction(lambda: fake.date_of_birth(minimum_age=14, maximum_age=16))
    age = factory.LazyAttribute(lambda obj: timezone.now().year - obj.birth_date.year)
    gender = factory.LazyAttribute(lambda _: random.choice(["MALE", "FEMALE"]))
    place_of_birth = "VALENZUELA"
    mother_tongue = "FILIPINO"
    documents_submitted = ""
    early_reg = False
    is_approved = None
    accept_term = True


class ApplicantFormFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ApplicantInformation

    user = factory.SubFactory(UserFactory)

    @factory.lazy_attribute
    def lrn(self):
        enrollment = EnrollmentFormFactory(user=self.user)
        self._enrollment = enrollment
        return enrollment.lrn

    @factory.lazy_attribute
    def psa_no(self):
        return self._enrollment.psa_no

    @factory.lazy_attribute
    def first_name(self):
        return self._enrollment.first_name

    @factory.lazy_attribute
    def middle_name(self):
        return self._enrollment.middle_name

    @factory.lazy_attribute
    def last_name(self):
        return self._enrollment.last_name
