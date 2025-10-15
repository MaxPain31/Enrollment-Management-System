from django.core.management.base import BaseCommand
from landingpage.models import Document

class Command(BaseCommand):
    help = "Seed default documents (PSA, Report Card, SF10)"

    def handle(self, *args, **options):
        documents = ["PSA", "Report Card", "SF10"]
        require_doc = [True, True, False] 

        for doc, required in zip(documents, require_doc):
            obj, created = Document.objects.get_or_create(
                document_name=doc,
                defaults={"is_required": required}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"✅ Created document: {doc} (required={required})"))
            else:
                self.stdout.write(self.style.WARNING(f"⚠️ Document already exists: {doc}"))
