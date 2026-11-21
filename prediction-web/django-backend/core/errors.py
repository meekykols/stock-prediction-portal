class ServiceError(Exception):
    """An expected failure with a message that is safe to show to end users."""

    status_code = 400
    code = "bad_request"

    def __init__(self, message, status_code=None, code=None):
        super().__init__(message)
        self.message = message
        if status_code:
            self.status_code = status_code
        if code:
            self.code = code


class NotFound(ServiceError):
    status_code = 404
    code = "not_found"


class InsufficientData(ServiceError):
    status_code = 422
    code = "insufficient_data"


class UpstreamUnavailable(ServiceError):
    status_code = 503
    code = "upstream_unavailable"
