"""
Health check endpoints for the Django backend
"""
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import time

# Track server start time
SERVER_START_TIME = time.time()

@csrf_exempt
@require_http_methods(["GET", "HEAD"])
def health_check(request):
    """
    Simple health check endpoint that returns the server status.
    Used by frontend and monitoring tools.
    """
    if request.method == 'HEAD':
        return JsonResponse({}, status=200)
    
    uptime = int(time.time() - SERVER_START_TIME)
    
    # Check database connection
    db_status = "ok"
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    # Check Redis connection
    redis_status = "ok"
    try:
        from django.core.cache import cache
        cache.set('health_check', 'ok', 1)
        if cache.get('health_check') != 'ok':
            redis_status = "error: cache not working"
    except Exception as e:
        redis_status = f"error: {str(e)}"
    
    # In development, Redis is optional
    health_status = "healthy" if db_status == "ok" else "unhealthy"
    
    health_data = {
        "status": health_status,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "version": "1.0.0",
        "environment": "development",
        "uptime": uptime,
        "checks": {
            "database": {"status": db_status},
            "redis": {"status": redis_status},
        }
    }
    
    status_code = 200 if health_data["status"] == "healthy" else 503
    return JsonResponse(health_data, status=status_code)