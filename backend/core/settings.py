import os
from pathlib import Path
from dotenv import load_dotenv

# Загрузка переменных окружения из .env файла
load_dotenv()

# Базовые пути
BASE_DIR = Path(__file__).resolve().parent.parent

# Создаем необходимые директории для логов, медиа и статических файлов
os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'media'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'static'), exist_ok=True)

# Безопасность
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-dev-key-123')  # Секретный ключ для подписи
DEBUG = os.getenv('DJANGO_DEBUG', 'False') == 'True'  # Режим отладки

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,192.168.1.127').split(',')  # Разрешенные хосты
CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost,http://127.0.0.1').split(',')  # Доверенные источники CSRF

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
    'rest_framework.authtoken',  # Поддержка токенов для аутентификации
    'corsheaders',  # Поддержка CORS
    'drf_yasg',  # Генерация документации API
    'django_filters',  # Фильтрация в API
    
    # Локальные приложения
    'accounts.apps.AccountsConfig',  # Приложение для пользователей и файлов
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',  # Безопасность
    'django.contrib.sessions.middleware.SessionMiddleware',  # Поддержка сессий
    'corsheaders.middleware.CorsMiddleware',  # Обработка CORS-запросов
    'django.middleware.common.CommonMiddleware',  # Общие middleware
    'django.middleware.csrf.CsrfViewMiddleware',  # Защита от CSRF
    'django.contrib.auth.middleware.AuthenticationMiddleware',  # Аутентификация
    'django.contrib.messages.middleware.MessageMiddleware',  # Сообщения
    'django.middleware.clickjacking.XFrameOptionsMiddleware',  # Защита от кликджекинга
]

ROOT_URLCONF = 'core.urls'  # Основной файл URL-роутинга
WSGI_APPLICATION = 'core.wsgi.application'  # WSGI-приложение

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
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.sqlite3'),  # Движок БД
        'NAME': os.getenv('DB_NAME', os.path.join(BASE_DIR, 'db.sqlite3')),  # Имя/путь к БД
        'USER': os.getenv('DB_USER', ''),  # Пользователь БД
        'PASSWORD': os.getenv('DB_PASSWORD', ''),  # Пароль БД
        'HOST': os.getenv('DB_HOST', ''),  # Хост БД
        'PORT': os.getenv('DB_PORT', ''),  # Порт БД
    }
}

# Валидация паролей
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',  # Проверка схожести с данными пользователя
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',  # Минимальная длина пароля
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'accounts.validators.PasswordValidator',  # Кастомный валидатор пароля
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',  # Проверка на распространенные пароли
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',  # Проверка на полностью числовой пароль
    },
]

# Кастомная модель пользователя
AUTH_USER_MODEL = 'accounts.User'

# Настройки REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',  # Аутентификация через сессии
        'rest_framework.authentication.TokenAuthentication',  # Аутентификация через токены
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',  # Доступ только для аутентифицированных (чтение для всех)
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',  # Ограничение для анонимных пользователей
        'rest_framework.throttling.UserRateThrottle',  # Ограничение для аутентифицированных пользователей
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',  # Лимит запросов для анонимов
        'user': '1000/day',  # Лимит запросов для пользователей
    },
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',  # Пагинация
    'PAGE_SIZE': 20,  # Размер страницы для пагинации
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',  # Фильтрация
        'rest_framework.filters.SearchFilter',  # Поиск
        'rest_framework.filters.OrderingFilter',  # Сортировка
    ],
}

# Проверка и добавление JWT, если установлен
try:
    import rest_framework_simplejwt
    INSTALLED_APPS.append('rest_framework_simplejwt')  # Добавляем JWT в установленные приложения
    REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'].append(
        'rest_framework_simplejwt.authentication.JWTAuthentication'  # Добавляем JWT-аутентификацию
    )
    # Настройки JWT
    from datetime import timedelta
    SIMPLE_JWT = {
        'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),  # Время жизни access-токена
        'REFRESH_TOKEN_LIFETIME': timedelta(days=7),  # Время жизни refresh-токена
        'ROTATE_REFRESH_TOKENS': True,  # Обновление refresh-токена при использовании
        'BLACKLIST_AFTER_ROTATION': True,  # Блокировка старых refresh-токенов
    }
except ImportError:
    pass  # Если JWT не установлен, пропускаем

# Настройки CORS
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.127:3000'
).split(',')  # Разрешенные источники для CORS
CORS_ALLOW_CREDENTIALS = True  # Разрешить передачу куки через CORS

# Международные настройки
LANGUAGE_CODE = 'en-us'  # Язык по умолчанию
TIME_ZONE = 'UTC'  # Часовой пояс
USE_I18N = True  # Поддержка интернационализации
USE_L10N = True  # Поддержка локализации
USE_TZ = True  # Использование временных зон

# Статические файлы
STATIC_URL = '/static/'  # URL для статических файлов
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # Путь для сборки статических файлов
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]  # Дополнительные директории для статики

# Медиа файлы
MEDIA_URL = '/media/'  # URL для медиа-файлов
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')  # Путь для хранения медиа-файлов
MAX_UPLOAD_SIZE = int(os.getenv('MAX_UPLOAD_SIZE', 50 * 1024 * 1024))  # Максимальный размер загружаемого файла (50MB по умолчанию)
FILE_UPLOAD_PERMISSIONS = 0o644  # Права доступа к загружаемым файлам

# Настройки по умолчанию
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'  # Тип автоинкрементного поля

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
            'maxBytes': 1024 * 1024 * 5,  # 5 MB - максимальный размер файла логов
            'backupCount': 5,  # Количество резервных копий логов
            'formatter': 'verbose',
            'encoding': 'utf-8',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'accounts': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',  # Детализированное логирование для приложения accounts
        },
    },
}

# Настройки для production (при выключенном DEBUG)
if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000  # 1 год для HSTS
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True  # Включить HSTS для поддоменов
    SECURE_SSL_REDIRECT = True  # Перенаправление на HTTPS
    SESSION_COOKIE_SECURE = True  # Куки только через HTTPS
    CSRF_COOKIE_SECURE = True  # CSRF-куки только через HTTPS
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')  # Поддержка прокси для HTTPS
    SECURE_BROWSER_XSS_FILTER = True  # Защита от XSS
    SECURE_CONTENT_TYPE_NOSNIFF = True  # Защита от MIME-типов
    X_FRAME_OPTIONS = 'DENY'  # Запрет встраивания в iframe
