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

router = DefaultRouter()
router.register(r'files', FileViewSet, basename='files')
router.register(r'users', UserViewSet, basename='users')

auth_urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
]

urlpatterns = [
    path('auth/', include(auth_urlpatterns)),
    path('public/files/<str:shared_link>/', 
         PublicFileDownloadView.as_view(), 
         name='public-file-download'),
    path('', include(router.urls)),
]