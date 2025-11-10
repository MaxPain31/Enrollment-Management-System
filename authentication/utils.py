from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.urls import reverse
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator


def capitalize_words(name):
    if name:
        return " ".join(word.capitalize() for word in name.split())
    return name


def send_verification_email(user, request):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    verify_url = request.build_absolute_uri(
        reverse("verify_email", kwargs={"uidb64": uid, "token": token})
    )

    subject = "Verify your email address"
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)

    context = {
        "user": user,
        "verify_url": verify_url,
        "site_name": getattr(settings, "SITE_NAME", "Enrollment System"),
    }

    html_body = render_to_string("authentication/emails/verify_email.html", context)
    text_body = render_to_string("authentication/emails/verify_email.txt", context)

    email = EmailMultiAlternatives(subject, text_body, from_email, [user.email])
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=True)


def send_post_verification_email(user, lrn, request):
    subject = "Your account is verified"
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
    context = {
        "site_name": getattr(settings, "SITE_NAME", "Enrollment System"),
        "user_email": user.email,
        "lrn": lrn,
        "login_url": request.build_absolute_uri(reverse("login")),
    }
    html_body = render_to_string("authentication/emails/post_verify.html", context)
    text_body = (
        f"Your account is verified on {context['site_name']}\n"
        f"LRN: {lrn}\n"
        "For security, we never email passwords. If you forgot it, reset it from the login page.\n"
        f"Login: {context['login_url']}\n"
    )
    email = EmailMultiAlternatives(subject, text_body, from_email, [user.email])
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=True)
