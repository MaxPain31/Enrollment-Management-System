from django.core.management.base import BaseCommand
from authentication.models import MyUser, AdminInformation

class Command(BaseCommand):
    help = 'Ensure default admin account exists'

    def handle(self, *args, **kwargs):
        email = 'admin123@gmail.com'
        password = '123asd'
        if not MyUser.objects.filter(email=email).exists():
            user = MyUser.objects.create_superuser(email=email, password=password)
            AdminInformation.objects.create(user=user, first_name="Admin", last_name="Account")
            self.stdout.write(self.style.SUCCESS('Admin account created.'))
        else:
            self.stdout.write(self.style.WARNING('Admin account already exists.'))