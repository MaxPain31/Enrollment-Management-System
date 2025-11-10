from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0022_alter_admininformation_first_name_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="myuser",
            name="email_verified",
            field=models.BooleanField(default=False),
        ),
    ]


