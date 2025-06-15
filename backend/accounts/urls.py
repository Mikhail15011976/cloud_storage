from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FileViewSet,
    UserViewSet,
    RegisterView,
    LoginView,
    PublicFileDownloadView
)

# Создание роутера для автоматической генерации URL
router = DefaultRouter()
router.register(r'files', FileViewSet, basename='files')
router.register(r'users', UserViewSet, basename='users')

# Дополнительные URL, не входящие в роутер
auth_urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
]

urlpatterns = [
    # API для аутентификации
    path('auth/', include(auth_urlpatterns)),
    
    # Публичный доступ к файлам
    path('public/files/<str:shared_link>/', 
         PublicFileDownloadView.as_view(), 
         name='public-file-download'),
    
    # URL от роутера (files и users)
    path('', include(router.urls)),
]