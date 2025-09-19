from django.core.mail import send_mail

from django.core.mail import send_mail

def emailNotification(first_name, last_name, application_no, recipient_email, application_status, message_rejected=None):
    if application_status == "approved":
        subject = "Application Approved"
        message_plain = f"""Dear {first_name} {last_name},

        Congratulations! Your application has been approved.
        Application No: {application_no}

        Thank you for choosing our school!
        """
        message_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="color: #2c3e50;">Application Approved</h2>
            <p>Dear <strong>{first_name} {last_name}</strong>,</p>
            <p>Congratulations! Your application has been approved.</p>
            <p><strong style="color: #2980b9;">Application No: {application_no}</strong></p>
            <p>Thank you for choosing our school!</p>
        </body>
        </html>
        """
    else:
        subject = "Application Pending"
        reason = message_rejected if message_rejected else "No reason provided."
        message_plain = f"""Dear {first_name} {last_name},

        We would like to inform you that your application is pending.
        Application No: {application_no}

        Reason for pending:
        {reason}

        If you have any questions, please contact us or visit our school. 

        Thank you.
        """
        message_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="color: #2c3e50;">Application Pending</h2>
            <p>Dear <strong>{first_name} {last_name}</strong>,</p>
            <p>We would like to inform you that your application is pending.</p>
            <p><strong style="color: #2980b9;">Application No: {application_no}</strong></p>
            <p><strong>Reason for pending:</strong></p>
            <p>{reason}</p>
            <p>If you have any questions, please contact us or visit our school.</p>
            <p>Thank you.</p>
        </body>
        </html>
        """

    send_mail(
        subject,
        message_plain,
        "pdbnhs@gmail.com",
        [recipient_email],
        html_message=message_html,
        fail_silently=False,
    )
