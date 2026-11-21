import hmac

from django.conf import settings
from rest_framework import authentication, exceptions


class ServiceUser:
    """The only caller of this service: the Express API."""

    is_authenticated = True

    def __str__(self):
        return "express-api"


class ServiceKeyAuthentication(authentication.BaseAuthentication):
    header = "HTTP_X_SERVICE_KEY"

    def authenticate(self, request):
        expected = settings.ML_SERVICE_API_KEY
        if not expected:
            if settings.DEBUG:
                return (ServiceUser(), None)  # local development without a key
            raise exceptions.AuthenticationFailed("Service key is not configured")

        provided = request.META.get(self.header, "")
        if not provided or not hmac.compare_digest(provided.encode(), expected.encode()):
            raise exceptions.AuthenticationFailed("Invalid service key")
        return (ServiceUser(), None)

    def authenticate_header(self, request):
        return "X-Service-Key"
