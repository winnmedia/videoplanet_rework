import jwt, threading, os

# Safe import for my_settings (fallback to environment variables in production)
try:
    import my_settings
    SECRET_KEY = my_settings.SECRET_KEY
    EMAIL_HOST_PASSWORD = my_settings.EMAIL_HOST_PASSWORD
    FROM_EMAIL = my_settings.FROM_EMAIL
    ALGORITHM = getattr(my_settings, 'ALGORITHM', 'HS256')
except ImportError:
    # Use environment variables in production (Railway)
    SECRET_KEY = os.environ.get('SECRET_KEY', 'fallback-secret-key')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
    FROM_EMAIL = os.environ.get('FROM_EMAIL', 'service@vlanet.net')
    ALGORITHM = 'HS256'
from django.http import JsonResponse
from . import models
from projects import models as project_model

from django.core.mail import EmailMessage, send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def user_validator(function):
    def wrapper(self, request, *args, **kwargs):
        try:
            vridge_session = request.COOKIES.get("vridge_session", None)

            if not vridge_session:
                return JsonResponse({"message": "NEED_ACCESS_TOKEN"}, status=401)

            payload = jwt.decode(
                vridge_session, SECRET_KEY, ALGORITHM
            )
            try:
                request.user = models.User.objects.get(id=payload["user_id"])
            except:
                request.user = None
                return JsonResponse({"message": "NEED_ACCESS_TOKEN"}, status=401)

            print("request.user", request.user)

            return function(self, request, *args, **kwargs)

        except models.User.DoesNotExist:
            return JsonResponse({"message": "USER_NOT_EXIST"}, status=404)

    return wrapper


class EmailThread(threading.Thread):
    def __init__(self, subject, body, recipient_list, html_message):
        self.subject = subject
        self.body = body
        self.recipient_list = recipient_list
        self.fail_silently = False
        self.html_message = html_message
        threading.Thread.__init__(self)

    def run(self):
        email = EmailMultiAlternatives(
            subject=self.subject, body=self.body, to=self.recipient_list
        )
        if self.html_message:
            email.attach_alternative(self.html_message, "text/html")
        email.send(self.fail_silently)


def auth_send_email(request, email, secret):
    html_message = render_to_string("verify_email.html", {"secret": secret})
    to = [email]
    EmailThread("영상 협업툴의 신세계, 비디오플래닛에 오신 걸 환영합니다!", strip_tags(html_message), to, html_message).start()


def invite_send_email(request, email, uid, token, name):
    try:
        DEBUG = my_settings.DEBUG
    except NameError:
        DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    if DEBUG:
        url = "http://localhost:3000/EmailCheck"
    else:
        url = "https://vlanet.net/EmailCheck"
    html_message = render_to_string(
        "invite_email.html",
        {
            "uid": uid,
            "token": token,
            "url": url,
            "scheme": request.scheme,
            "domain": request.META["HTTP_HOST"],
            "name": name,
        },
    )
    to = [email]
    EmailThread("Vlanet", strip_tags(html_message), to, html_message).start()


# request.Meta
# CONTENT_LENGTH– 요청 본문의 길이(문자열).
# CONTENT_TYPE– 요청 본문의 MIME 유형입니다.
# HTTP_ACCEPT– 응답에 허용되는 콘텐츠 유형.
# HTTP_ACCEPT_ENCODING– 응답에 허용되는 인코딩.
# HTTP_ACCEPT_LANGUAGE– 응답에 허용되는 언어.
# HTTP_HOST– 클라이언트가 보낸 HTTP 호스트 헤더입니다.
# HTTP_REFERER– 참조 페이지(있는 경우).
# HTTP_USER_AGENT– 클라이언트의 사용자 에이전트 문자열.
# QUERY_STRING– 쿼리 문자열은 단일(파싱되지 않은) 문자열입니다.
# REMOTE_ADDR– 클라이언트의 IP 주소.
# REMOTE_HOST– 클라이언트의 호스트 이름.
# REMOTE_USER– 웹 서버에서 인증된 사용자(있는 경우).
# REQUEST_METHOD"GET"– 또는 와 같은 문자열 "POST".
# SERVER_NAME– 서버의 호스트 이름.
# SERVER_PORT– 서버의 포트(문자열).

from django.contrib.auth.tokens import default_token_generator  # 여기 참고하면서 토큰 생성
from django.utils.crypto import salted_hmac, constant_time_compare
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str


def project_token_generator(project):
    value = (
        f"{project.id}{project.user.id}{project.user.username}{project.user.password}"
    )
    token = salted_hmac(
        "django.winnmedia.virege.project.inviteToken",
        value,
        secret=SECRET_KEY,
    ).hexdigest()[::2]
    return token


def check_project_token(project, token):
    if not (project and token):
        return False
    return constant_time_compare(project_token_generator(project), token)
