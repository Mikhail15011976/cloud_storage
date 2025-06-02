from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from accounts.views import FileViewSet, UserViewSet, RegisterView, LoginView
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from django.http import HttpResponse

# Создание основного роутера API
api_router = DefaultRouter()
api_router.register(r'files', FileViewSet, basename='files')
api_router.register(r'users', UserViewSet, basename='users')

schema_view = get_schema_view(
    openapi.Info(
        title="Cloud Storage API",
        default_version='v1',
        description="API for Cloud Storage System",
    ),
    public=True,
    patterns=[path('api/', include(api_router.urls))],
)

def home(request):
    return HttpResponse("Добро пожаловать в Cloud Storage API")

urlpatterns = [
    path('', home),
    
    # Админка
    path('admin/', admin.site.urls),
    
    # Auth endpoints
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/login/', LoginView.as_view(), name='login'),
    
    # Основные API endpoints
    path('api/', include(api_router.urls)),
    
    # Документация
    path('api/docs/swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='swagger-ui'),
    path('api/docs/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='redoc'),
]