from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.crypto import constant_time_compare
from django.utils.http import base36_to_int


class ExpiringTokenGenerator(PasswordResetTokenGenerator):
    def __init__(self, timeout):
        super().__init__()
        self.timeout = timeout

    def check_token(self, user, token):
        if not (user and token):
            return False

        try:
            ts_b36, _ = token.split("-")
        except ValueError:
            return False

        try:
            ts = base36_to_int(ts_b36)
        except ValueError:
            return False

        for secret in [self.secret, *self.secret_fallbacks]:
            if constant_time_compare(
                self._make_token_with_timestamp(user, ts, secret),
                token,
            ):
                break
        else:
            return False

        if (self._num_seconds(self._now()) - ts) > self.timeout:
            return False

        return True


password_reset_token_generator = ExpiringTokenGenerator(timeout=600)
email_verification_token_generator = ExpiringTokenGenerator(
    timeout=getattr(settings, "EMAIL_VERIFICATION_TIMEOUT", 60 * 60 * 24)
)

