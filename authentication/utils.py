from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.urls import reverse
from django.conf import settings
from .tokens import (
    email_verification_token_generator,
    password_reset_token_generator,
)
import logging
from urllib.parse import urlparse


logger = logging.getLogger(__name__)


def capitalize_words(name):
    if name:
        return " ".join(word.capitalize() for word in name.split())
    return name


def _resolve_from_email(request):
    """
    Determine the best from_email:
    1) settings.DEFAULT_FROM_EMAIL
    2) settings.EMAIL_HOST_USER
    3) no-reply@<current-domain>
    """
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(settings, "EMAIL_HOST_USER", None)
    if from_email:
        return from_email
    host = request.get_host() or "localhost"
    try:
        netloc = urlparse(f"//{host}").netloc or host
    except Exception:
        netloc = host
    domain = netloc.split(":")[0]
    return f"no-reply@{domain}"


def send_verification_email(user, request):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token_generator.make_token(user)
    verify_url = request.build_absolute_uri(
        reverse("verify_email", kwargs={"uidb64": uid, "token": token})
    )

    subject = "Verify your email address"
    from_email = _resolve_from_email(request)

    context = {
        "user": user,
        "verify_url": verify_url,
        "site_name": getattr(settings, "SITE_NAME", "Enrollment System"),
    }

    html_body = render_to_string("authentication/emails/verify_email.html", context)
    text_body = render_to_string("authentication/emails/verify_email.txt", context)

    email = EmailMultiAlternatives(subject, text_body, from_email, [user.email])
    email.attach_alternative(html_body, "text/html")
    try:
        email.send(fail_silently=False)
        return True
    except Exception as exc:
        logger.exception("Failed to send verification email to %s: %s", user.email, exc)
        return False


def send_post_verification_email(user, lrn, request):
    subject = "Your account is verified"
    from_email = _resolve_from_email(request)
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
    try:
        email.send(fail_silently=False)
        return True
    except Exception as exc:
        logger.exception("Failed to send post-verification email to %s: %s", user.email, exc)
        return False


def send_password_reset_email(user, request):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = password_reset_token_generator.make_token(user)
    reset_url = request.build_absolute_uri(
        reverse("password_reset_confirm", kwargs={"uidb64": uid, "token": token})
    )

    subject = "Reset your password"
    from_email = _resolve_from_email(request)

    context = {
        "user": user,
        "reset_url": reset_url,
        "site_name": getattr(settings, "SITE_NAME", "Enrollment System"),
    }

    html_body = render_to_string("authentication/emails/password_reset.html", context)
    text_body = render_to_string("authentication/emails/password_reset.txt", context)

    email = EmailMultiAlternatives(subject, text_body, from_email, [user.email])
    email.attach_alternative(html_body, "text/html")
    try:
        email.send(fail_silently=False)
        return True
    except Exception as exc:
        logger.exception("Failed to send password reset email to %s: %s", user.email, exc)
        return False
