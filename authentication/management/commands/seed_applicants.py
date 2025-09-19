from django.core.management.base import BaseCommand
from authentication.factories import UserFactory, EnrollmentFormFactory, ApplicantFormFactory

class Command(BaseCommand):
    help = 'Seed Users, EnrollmentForms, and ApplicantInformation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--number',
            type=int,
            default=10,
            help='Number of applicants to create'
        )

    def handle(self, *args, **options):
        number = options['number']

        for _ in range(number):
            # 1️⃣ Create user
            user = UserFactory()

            # 2️⃣ Create enrollment form for the user
            enrollment = EnrollmentFormFactory(user=user)

            # 3️⃣ Create applicant info linked to same user and enrollment
            applicant = ApplicantFormFactory(
                user=user,
                lrn=enrollment.lrn,
                psa_no=enrollment.psa_no,
                first_name=enrollment.first_name,
                middle_name=enrollment.middle_name,
                last_name=enrollment.last_name
            )

            self.stdout.write(self.style.SUCCESS(
                f'Created User({user.email}) | EnrollmentForm({enrollment.application_no}) | Applicant({applicant.first_name} {applicant.last_name})'
            ))

        self.stdout.write(self.style.SUCCESS(f'Successfully created {number} applicants.'))
