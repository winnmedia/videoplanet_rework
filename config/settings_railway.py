"""
Railway 배포를 위한 Django 설정
환경변수를 통한 설정 관리
"""

import os
from pathlib import Path
from datetime import timedelta
from corsheaders.defaults import default_headers

try:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Security Settings
SECRET_KEY = os.environ.get('SECRET_KEY', '_bt^%50gaoz@!b6milag@hk_+%apmuu9&yq89%d@8ho65lieu3')
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

ALLOWED_HOSTS = [
    "api.vridge.kr",
    "api.vlanet.net",
    ".railway.app",
    ".vercel.app",
    "localhost",
    "127.0.0.1",
    "videoplanet.up.railway.app",
    os.environ.get('RAILWAY_STATIC_URL', '').replace('https://', '').replace('http://', ''),
]

# Filter out empty hosts
ALLOWED_HOSTS = [host for host in ALLOWED_HOSTS if host]

# Application definition
DJANGO_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

PROJECT_APPS = [
    "core",
    "users",
    "projects", 
    "feedbacks",
    "onlines",
]

THIRD_PARTY_APPS = [
    "channels",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "storages",
]

INSTALLED_APPS = DJANGO_APPS + PROJECT_APPS + THIRD_PARTY_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    # "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database
# Railway PostgreSQL 사용
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL)
    }
else:
    # 개발 환경에서는 SQLite 사용
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3", 
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Redis/Channels
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    },
}

# REST Framework & JWT
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework_simplejwt.authentication.JWTAuthentication",)
}

REST_USE_JWT = True
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=7),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=28),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_AUTHENTICATION_RULE": "rest_framework_simplejwt.authentication.default_user_authentication_rule",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization
LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "uploads"

# File upload settings
DATA_UPLOAD_MAX_NUMBER_FIELDS = 200000
MAX_UPLOAD_SIZE = 429916160

# Static/Media files - Railway에서 로컬 스토리지 사용
# 프로덕션에서는 Railway의 볼륨이나 별도 CDN 사용 권장

# CORS 설정
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = True  # TODO(human): 디버깅을 위해 임시로 모든 오리진 허용

# CORS 디버깅 로그
import logging
cors_logger = logging.getLogger('corsheaders')
cors_logger.setLevel(logging.DEBUG)

CORS_ALLOWED_ORIGINS = [
    "https://vridge.kr",
    "https://api.vridge.kr", 
    "https://vlanet.net",
    "https://api.vlanet.net",
    "http://localhost:3000",
    "https://vridge-web.vercel.app",
    "https://vridge-web-vlanets-projects.vercel.app",
    "https://videoplanet.vercel.app",
    "https://vlanet.vercel.app",
    "http://localhost:3003",
    "http://localhost:3004",
    # Railway 도메인들
    "https://videoplanet-backend.up.railway.app",
    "https://videoplanet-rework-production.up.railway.app",
    "https://videoplanet.up.railway.app",
    # Vercel 배포 도메인들
    "https://vridge-xyc331ybx-vlanets-projects.vercel.app",
    "https://vridge-73hhbfs04-vlanets-projects.vercel.app",
    "https://videoplanet-kjdrs7r2y-vlanets-projects.vercel.app",
    # Vercel 프리뷰 도메인 패턴
    "https://vridge-web-vlanets-projects.vercel.app",
]

# Railway 환경에서는 프론트엔드 도메인 추가 (스키마 보장)
RAILWAY_FRONTEND_URL = os.environ.get('RAILWAY_FRONTEND_URL')
if RAILWAY_FRONTEND_URL:
    if not RAILWAY_FRONTEND_URL.startswith(('http://', 'https://')):
        RAILWAY_FRONTEND_URL = f'https://{RAILWAY_FRONTEND_URL}'
    if RAILWAY_FRONTEND_URL not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(RAILWAY_FRONTEND_URL)

CORS_ALLOW_METHODS = [
    "DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"
]

CORS_ALLOW_HEADERS = list(default_headers) + [
    "vridge_session", "authorization", "content-type"
]

CSRF_TRUSTED_ORIGINS = [
    "https://api.vridge.kr",
    "https://vridge.kr",
    "https://vlanet.net",
    "https://api.vlanet.net",
    "http://localhost:3000",
    "http://localhost:3003",
    "http://localhost:3004",
    # Railway 도메인들
    "https://videoplanet-backend.up.railway.app",
    "https://videoplanet-rework-production.up.railway.app",
    "https://videoplanet.up.railway.app",
    # Vercel 도메인들
    "https://videoplanet-kjdrs7r2y-vlanets-projects.vercel.app",
    "https://vridge-web-vlanets-projects.vercel.app",
]

# Railway 도메인 동적 추가 (스키마 보장)
if os.environ.get('RAILWAY_STATIC_URL'):
    railway_url = os.environ.get('RAILWAY_STATIC_URL')
    if not railway_url.startswith(('http://', 'https://')):
        railway_url = f'https://{railway_url}'
    if railway_url not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(railway_url)

# Email 설정 - SendGrid
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.sendgrid.net"
EMAIL_PORT = 587
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'apikey')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = os.environ.get('FROM_EMAIL', 'service@vlanet.net')

# Sentry 설정 (프로덕션용)
if not DEBUG and SENTRY_AVAILABLE and os.environ.get('SENTRY_DSN'):
    sentry_sdk.init(
        dsn=os.environ.get('SENTRY_DSN'),
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=True,
        environment=os.environ.get('SENTRY_ENVIRONMENT', 'production'),
    )

# Custom User Model
AUTH_USER_MODEL = "users.User"

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Logging 설정
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}