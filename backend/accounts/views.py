from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from rest_framework.authtoken.models import Token
from django.contrib.auth import logout
from django.core.exceptions import ValidationError
import os
import uuid

from .models import File, User
from .serializers import (
    FileSerializer,
    UserSerializer,
    RegisterSerializer,
    LoginSerializer
)
from .permissions import (
    IsAdminUser,
    IsOwnerOrAdmin,
    IsUserOwnerOrAdmin,
    IsFilePublicOrOwnerOrAdmin
)
from .validators import FileNameValidator

try:
    from rest_framework_simplejwt.tokens import RefreshToken
    JWT_INSTALLED = True
except ImportError:
    JWT_INSTALLED = False


class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['file_type', 'owner', 'is_public']
    search_fields = ['original_name', 'comment']
    ordering_fields = ['upload_date', 'last_download', 'size']
    ordering = ['-upload_date']
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not self.request.user.is_admin:
            queryset = queryset.filter(owner=self.request.user)
        return queryset

    def perform_create(self, serializer):
        file_obj = self.request.FILES['file']
        if self.request.user.storage_left < file_obj.size:
            raise ValidationError(
                {"detail": "Недостаточно места в хранилище. Доступно: {} байт".format(
                    self.request.user.storage_left)}
            )
        serializer.save(
            owner=self.request.user,
            original_name=file_obj.name,
            size=file_obj.size
        )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        file = self.get_object()
        file.last_download = timezone.now()
        file.save()
        
        try:
            response = FileResponse(open(file.file.path, 'rb'))
            response['Content-Disposition'] = f'attachment; filename="{file.original_name}"'
            return response
        except FileNotFoundError:
            raise Http404("Файл не найден на сервере")

    @action(detail=True, methods=['post', 'delete'])
    def share(self, request, pk=None):
        file = self.get_object()
        
        if request.method == 'POST':
            file.shared_link = uuid.uuid4().hex[:15]
            file.is_public = True
            file.save()
            return Response({'shared_link': file.shared_link}, status=status.HTTP_200_OK)
        
        elif request.method == 'DELETE':
            file.shared_link = None
            file.is_public = False
            file.save()
            return Response(status=status.HTTP_204_NO_CONTENT)


class PublicFileDownloadView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, shared_link):
        try:
            file = File.objects.get(shared_link=shared_link, is_public=True)
        except File.DoesNotExist:
            raise Http404("Файл не найден или недоступен для публичного доступа")
        
        file.last_download = timezone.now()
        file.save()
        
        try:
            response = FileResponse(open(file.file.path, 'rb'))
            response['Content-Disposition'] = f'attachment; filename="{file.original_name}"'
            return response
        except FileNotFoundError:
            raise Http404("Файл не найден на сервере")


class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token = Token.objects.create(user=user)
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        user = serializer.validated_data
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key
        })


class LogoutView(APIView):
    """
    API endpoint для выхода пользователя из системы.
    Поддерживает:
    - TokenAuthentication (удаляет токен)
    - SessionAuthentication (завершает сессию)
    - JWT Authentication (если установлен simplejwt, добавляет токен в blacklist)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # 1. Обработка TokenAuthentication
            if hasattr(request, 'auth') and isinstance(request.auth, Token):
                request.auth.delete()
            
            # 2. Обработка JWT Authentication (если установлен)
            if JWT_INSTALLED:
                refresh_token = request.data.get("refresh_token")
                if refresh_token:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
            
            # 3. Обработка SessionAuthentication
            if request.user.is_authenticated:
                logout(request)
            
            response = Response(
                {"detail": "Вы успешно вышли из системы"},
                status=status.HTTP_200_OK
            )
            
            # Очистка cookies
            response.delete_cookie('auth_token')
            response.delete_cookie('sessionid')
            response.delete_cookie('csrftoken')
            
            return response
            
        except Exception as e:
            return Response(
                {"detail": f"Ошибка при выходе из системы: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        if self.request.user.is_admin:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response(
                {"detail": "Вы не можете удалить свою учетную запись"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)