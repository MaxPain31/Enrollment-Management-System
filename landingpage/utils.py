from django.core.mail import send_mail

def emailNotification(first_name, last_name, application_no, recipient_email):
    subject = "Application Form Submitted"

    message_plain = f"""Welcome to Paso De Blas National High School

    Dear {first_name} {last_name},

    Your enrollment form has been successfully submitted.
    Please remember your application number.
    Application No: {application_no}
    Bring the following required documents:
    - Report Card
    - PSA

    Thank you for enrolling at our school!
    """

    message_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #2c3e50;">Welcome to Paso De Blas National High School</h2>
        <p>Dear <strong>{first_name} {last_name}</strong>,</p>
        <p>Your enrollment form has been successfully submitted.</p>
        <p><strong style="color: #2980b9;">Application No: {application_no}</strong></p>
        <p>Please bring the following required documents:</p>
        <ul>
            <li>Report Card</li>
            <li>PSA</li>
        </ul>
        <p>Thank you for enrolling at our school!</p>
    </body>
    </html>
    """

    send_mail(
        subject,
        message_plain,
        "pdbnhs@gmail.com",  # Sender email (should match settings.DEFAULT_FROM_EMAIL)
        [recipient_email],
        html_message=message_html,
        fail_silently=False,
    )