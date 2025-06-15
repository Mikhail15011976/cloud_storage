from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Настройки Swagger/OpenAPI
schema_view = get_schema_view(
    openapi.Info(
        title="Cloud Storage API",
        default_version='v1',
        description="API documentation for Cloud Storage System",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="contact@cloudstorage.local"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

# Основные URL-паттерны
urlpatterns = [
    # Админ-панель Django
    path('admin/', admin.site.urls),
    
    # Документация API
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', 
            schema_view.without_ui(cache_timeout=0), 
            name='schema-json'),
    re_path(r'^swagger/$', 
            schema_view.with_ui('swagger', cache_timeout=0), 
            name='schema-swagger-ui'),
    re_path(r'^redoc/$', 
            schema_view.with_ui('redoc', cache_timeout=0), 
            name='schema-redoc'),
    
    # API приложения
    path('api/', include('accounts.urls')),
    
    # Стандартные URL для аутентификации DRF
    path('api/auth/', include('rest_framework.urls', namespace='rest_framework')),
]

# Обработка медиа-файлов в режиме разработки
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
    # Подключение Debug Toolbar, если установлен
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass

# Обработчик для главной страницы
def home(request):
    from django.http import HttpResponse
    return HttpResponse("""
        <h1>Welcome to Cloud Storage API</h1>
        <p>Available endpoints:</p>
        <ul>
            <li><a href="/api/">API Root</a></li>
            <li><a href="/swagger/">Swagger UI</a></li>
            <li><a href="/redoc/">ReDoc UI</a></li>
            <li><a href="/admin/">Admin Panel</a></li>
        </ul>
    """)

# Добавление главной страницы в начало URL-паттернов
urlpatterns = [path('', home, name='home')] + urlpatterns