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
router.register(r'files', FileViewSet, basename='files')  
router.register(r'users', UserViewSet, basename='users')  

# URL-паттерны для аутентификации, сгруппированные под /auth/
auth_urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),  
    path('login/', LoginView.as_view(), name='login'),          
    path('logout/', LogoutView.as_view(), name='logout'),       
]

# Основные URL-паттерны приложения
urlpatterns = [
    path('auth/', include(auth_urlpatterns)),      
    path('', include(router.urls)),  
]
