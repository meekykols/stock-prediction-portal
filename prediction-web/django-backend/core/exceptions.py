import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_handler

from .errors import ServiceError

logger = logging.getLogger(__name__)


def exception_handler(exc, context):
    """Every error leaves as {"success": false, "message", "code", "errors"?}."""
    if isinstance(exc, ServiceError):
        return Response(
            {"success": False, "message": exc.message, "code": exc.code},
            status=exc.status_code,
        )

    response = drf_handler(exc, context)
    if response is None:
        logger.exception("Unhandled error in %s", context.get("view"))
        return Response(
            {"success": False, "message": "The prediction service hit an unexpected error", "code": "server_error"},
            status=500,
        )

    data = response.data
    if isinstance(data, dict) and "detail" in data:
        response.data = {"success": False, "message": str(data["detail"]), "code": getattr(data["detail"], "code", "error")}
    else:
        response.data = {"success": False, "message": "Invalid request", "code": "invalid", "errors": data}
    return response
