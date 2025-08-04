import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'media'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'static'), exist_ok=True)

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')

DEBUG = os.getenv('DJANGO_DEBUG', 'False').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS').split(',')

CSRF_TRUSTED_ORIGINS = os.getenv('DJANGO_CSRF_TRUSTED_ORIGINS').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    'rest_framework',
    'rest_framework.authtoken',  
    'corsheaders',  
    'drf_yasg',  
    'django_filters',  
    
    'accounts.apps.AccountsConfig',  
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',  
    'django.contrib.sessions.middleware.SessionMiddleware',  
    'corsheaders.middleware.CorsMiddleware',  
    'django.middleware.common.CommonMiddleware',  
    'django.middleware.csrf.CsrfViewMiddleware',  
    'django.contrib.auth.middleware.AuthenticationMiddleware',  
    'django.contrib.messages.middleware.MessageMiddleware',  
    'django.middleware.clickjacking.XFrameOptionsMiddleware',  
]

ROOT_URLCONF = 'core.urls'  
WSGI_APPLICATION = 'core.wsgi.application'  

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

DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE'),
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',  
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',  
        'OPTIONS': {
            'min_length': int(os.getenv('PASSWORD_MIN_LENGTH')),
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

AUTH_USER_MODEL = 'accounts.User'

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
        'anon': os.getenv('THROTTLE_ANON_RATE'), 
        'user': os.getenv('THROTTLE_USER_RATE'),  
    },
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',  
    'PAGE_SIZE': int(os.getenv('PAGE_SIZE')),  
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',  
        'rest_framework.filters.SearchFilter',  
        'rest_framework.filters.OrderingFilter',  
    ],
}

try:
    import rest_framework_simplejwt
    INSTALLED_APPS.append('rest_framework_simplejwt')  
    REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'].append(
        'rest_framework_simplejwt.authentication.JWTAuthentication' 
    )
    from datetime import timedelta
    SIMPLE_JWT = {
        'ACCESS_TOKEN_LIFETIME': timedelta(hours=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME_HOURS'))), 
        'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME_DAYS'))),  
        'ROTATE_REFRESH_TOKENS': os.getenv('JWT_ROTATE_REFRESH_TOKENS').lower() in ('true', '1', 'yes'),  
        'BLACKLIST_AFTER_ROTATION': os.getenv('JWT_BLACKLIST_AFTER_ROTATION').lower() in ('true', '1', 'yes'),  
    }
except ImportError:
    pass  

CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS').split(',')

CORS_ALLOW_CREDENTIALS = os.getenv('CORS_ALLOW_CREDENTIALS').lower() in ('true', '1', 'yes')

LANGUAGE_CODE = os.getenv('DJANGO_LANGUAGE_CODE')  

TIME_ZONE = os.getenv('DJANGO_TIME_ZONE')  

USE_I18N = os.getenv('DJANGO_USE_I18N').lower() in ('true', '1', 'yes')  

USE_L10N = os.getenv('DJANGO_USE_L10N').lower() in ('true', '1', 'yes')  

USE_TZ = os.getenv('DJANGO_USE_TZ').lower() in ('true', '1', 'yes')  

STATIC_URL = '/static/'  
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]  

MEDIA_URL = '/media/'  
MEDIA_ROOT = os.getenv('MEDIA_ROOT')  
MAX_UPLOAD_SIZE = int(os.getenv('MAX_UPLOAD_SIZE'))  
FILE_UPLOAD_PERMISSIONS = int(os.getenv('FILE_UPLOAD_PERMISSIONS'), 8)  

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'  

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
            'maxBytes': int(os.getenv('LOG_MAX_BYTES')),  
            'backupCount': int(os.getenv('LOG_BACKUP_COUNT')), 
            'formatter': 'verbose',
            'encoding': 'utf-8',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.getenv('ROOT_LOG_LEVEL'),
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': os.getenv('DJANGO_LOG_LEVEL'),
            'propagate': False,
        },
        'accounts': {
            'handlers': ['console', 'file'],
            'level': os.getenv('ACCOUNTS_LOG_LEVEL'),  
        },
    },
}

if not DEBUG:
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS'))  
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS').lower() in ('true', '1', 'yes')  
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT').lower() in ('true', '1', 'yes')  
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE').lower() in ('true', '1', 'yes')  
    CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE').lower() in ('true', '1', 'yes')  
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  
    SECURE_BROWSER_XSS_FILTER = os.getenv('SECURE_BROWSER_XSS_FILTER').lower() in ('true', '1', 'yes')  
    SECURE_CONTENT_TYPE_NOSNIFF = os.getenv('SECURE_CONTENT_TYPE_NOSNIFF').lower() in ('true', '1', 'yes')  
    X_FRAME_OPTIONS = os.getenv('X_FRAME_OPTIONS')  
