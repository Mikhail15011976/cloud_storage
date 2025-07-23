from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FileViewSet,
    UserViewSet,
    RegisterView,
    LoginView,
    LogoutView,
    PublicFileDownloadView
)

# Создание роутера для автоматической генерации URL-адресов для ViewSet'ов
router = DefaultRouter()
router.register(r'files', FileViewSet, basename='files')  # Эндпоинты для работы с файлами (CRUD операции)
router.register(r'users', UserViewSet, basename='users')  # Эндпоинты для работы с пользователями (CRUD операции)

# URL-паттерны для аутентификации, сгруппированные под /auth/
auth_urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),  # Регистрация нового пользователя
    path('login/', LoginView.as_view(), name='login'),          # Аутентификация пользователя (вход в систему)
    path('logout/', LogoutView.as_view(), name='logout'),       # Выход из системы (завершение сессии)
]

# Основные URL-паттерны приложения
urlpatterns = [
    path('auth/', include(auth_urlpatterns)),  # Группировка всех маршрутов аутентификации под префиксом /auth/
    path('public/files/<str:shared_link>/', 
         PublicFileDownloadView.as_view(), 
         name='public-file-download'),  # Эндпоинт для скачивания публичных файлов по уникальной ссылке (shared_link)
    path('', include(router.urls)),  # Подключение автоматически сгенерированных URL-адресов из роутера для ViewSet'ов
]
