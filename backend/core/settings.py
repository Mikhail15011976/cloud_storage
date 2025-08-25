import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Базовые пути
BASE_DIR = Path(__file__).resolve().parent.parent

os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'media'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'static'), exist_ok=True)

# Безопасность
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'fallback-secret-key-for-development')
DEBUG = os.getenv('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,192.168.1.127').split(',')
CSRF_TRUSTED_ORIGINS = os.getenv('DJANGO_CSRF_TRUSTED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.127:3000').split(',')

# Настройки приложений
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Сторонние приложения
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'drf_yasg',
    'django_filters',
    
    # Локальные приложения
    'accounts.apps.AccountsConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'
WSGI_APPLICATION = 'core.wsgi.application'

# Настройки шаблонов
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Настройки базы данных
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': os.getenv('DB_NAME', os.path.join(BASE_DIR, 'db.sqlite3')),
        'USER': os.getenv('DB_USER', ''),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', ''),
        'PORT': os.getenv('DB_PORT', ''),
    }
}

# Валидация паролей
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': int(os.getenv('PASSWORD_MIN_LENGTH', 8)),
        }
    },
    {
        'NAME': 'accounts.validators.PasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Кастомная модель пользователя
AUTH_USER_MODEL = 'accounts.User'

# Настройки REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': os.getenv('REST_FRAMEWORK_DEFAULT_THROTTLE_RATES_ANON', '100/day'),
        'user': os.getenv('REST_FRAMEWORK_DEFAULT_THROTTLE_RATES_USER', '1000/day'),
    },
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': int(os.getenv('REST_FRAMEWORK_PAGE_SIZE', 20)),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000", 
    "http://192.168.1.127:3000",
    "http://192.168.1.127:8000",  
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'access-control-allow-origin', 
]
CORS_EXPOSE_HEADERS = [
    'content-disposition', 
]

# Международные настройки
LANGUAGE_CODE = os.getenv('DJANGO_LANGUAGE_CODE', 'en-us')
TIME_ZONE = os.getenv('DJANGO_TIME_ZONE', 'UTC')
USE_I18N = os.getenv('DJANGO_USE_I18N', 'True') == 'True'
USE_L10N = os.getenv('DJANGO_USE_L10N', 'True') == 'True'
USE_TZ = os.getenv('DJANGO_USE_TZ', 'True') == 'True'

# Статические файлы
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]

# Медиа файлы
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, os.getenv('MEDIA_ROOT', 'media'))
MAX_UPLOAD_SIZE = int(os.getenv('MAX_UPLOAD_SIZE', 52428800))
FILE_UPLOAD_PERMISSIONS = int(os.getenv('FILE_UPLOAD_PERMISSIONS', '644'), 8)

# Настройки по умолчанию
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Логирование
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs/django.log'),
            'maxBytes': int(os.getenv('LOG_MAX_BYTES', 5242880)),
            'backupCount': int(os.getenv('LOG_BACKUP_COUNT', 5)),
            'formatter': 'verbose',
            'encoding': 'utf-8',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.getenv('ROOT_LOG_LEVEL', 'INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'accounts': {
            'handlers': ['console', 'file'],
            'level': os.getenv('ACCOUNTS_LOG_LEVEL', 'INFO'),
        },
        'corsheaders': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',  # ← ДОБАВЛЕНО для отладки CORS
        },
    },
}

# Настройки для production (при выключенном DEBUG)
if not DEBUG:
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', 31536000))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'True') == 'True'
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True') == 'True'
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'True') == 'True'
    CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'True') == 'True'
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_BROWSER_XSS_FILTER = os.getenv('SECURE_BROWSER_XSS_FILTER', 'True') == 'True'
    SECURE_CONTENT_TYPE_NOSNIFF = os.getenv('SECURE_CONTENT_TYPE_NOSNIFF', 'True') == 'True'
    X_FRAME_OPTIONS = os.getenv('X_FRAME_OPTIONS', 'DENY')
