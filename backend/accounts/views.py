from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404, HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from rest_framework.authtoken.models import Token
from django.contrib.auth import logout
from django.core.exceptions import ValidationError
import uuid
import os
import mimetypes
from django.conf import settings
import logging

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

# Проверка наличия JWT для поддержки выхода из системы
try:
    from rest_framework_simplejwt.tokens import RefreshToken
    JWT_INSTALLED = True
except ImportError:
    JWT_INSTALLED = False

# Настройка логирования для отслеживания действий
logger = logging.getLogger(__name__)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20  
    page_size_query_param = 'page_size'
    max_page_size = 100

class FileViewSet(viewsets.ModelViewSet):
    """
    ViewSet для работы с файлами: загрузка, скачивание, удаление, поиск и фильтрация.
    Доступ ограничен для владельцев файлов или администраторов.
    """
    queryset = File.objects.all()
    serializer_class = FileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['file_type', 'owner', 'is_public']
    search_fields = ['original_name', 'comment']
    ordering_fields = ['upload_date', 'last_download', 'size']
    ordering = ['-upload_date']
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """
        Возвращает queryset файлов в зависимости от прав пользователя.
        Администраторы видят все файлы, обычные пользователи — только свои.
        """
        queryset = super().get_queryset()
        if not self.request.user.is_admin:
            queryset = queryset.filter(owner=self.request.user)
        return queryset

    def perform_create(self, serializer):
        """
        Проверка квоты хранилища перед сохранением файла.
        Установка владельца и исходного имени файла.
        """
        file_obj = self.request.FILES.get('file')
        if not file_obj:
            raise ValidationError({"file": "Файл не предоставлен."})

        if self.request.user.storage_left < file_obj.size:
            raise ValidationError(
                {"detail": f"Недостаточно места в хранилище. Доступно: {self.request.user.storage_left} байт"}
            )
        serializer.save(owner=self.request.user)
        logger.info(f"User {self.request.user.username} uploaded file {file_obj.name}")

    def perform_destroy(self, instance):
        """
        Удаление файла из базы данных и физического файла с сервера.
        Логирование действия удаления.
        """
        if instance.file and os.path.isfile(instance.file.path):
            try:
                os.remove(instance.file.path)
                logger.info(f"Physical file {instance.file.path} deleted from server by {self.request.user.username}")
            except Exception as e:
                logger.error(f"Failed to delete physical file {instance.file.path}: {str(e)}")
        instance.delete()
        logger.info(f"User {self.request.user.username} deleted file {instance.original_name} (ID: {instance.id})")

    def destroy(self, request, *args, **kwargs):
        """
        Кастомизация ответа при успешном удалении файла.
        """
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"message": "File deleted successfully"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Скачивание файла с обновлением даты последнего скачивания.
        Устанавливает правильный MIME-тип и заголовок Content-Disposition для сохранения оригинального имени файла.
        """
        file = self.get_object()
        file.last_download = timezone.now()
        file.save()
        logger.info(f"User {request.user.username} downloaded file {file.original_name} (ID: {file.id})")

        try:
            file_path = file.file.path
            if not os.path.exists(file_path):
                logger.error(f"File {file_path} not found on server for download")
                raise Http404("Файл не найден на сервере.")
            
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                mime_type = 'application/octet-stream'
            logger.info(f"Downloading file {file.original_name} with MIME type: {mime_type}")
            
            with open(file_path, 'rb') as fh:
                response = HttpResponse(fh.read(), content_type=mime_type)                
                response['Content-Disposition'] = f'attachment; filename="{file.original_name}"'                
                response['X-Content-Type-Options'] = 'nosniff'                
                response['Content-Length'] = os.path.getsize(file_path)
                return response
        except FileNotFoundError:
            logger.error(f"File {file.file.path} not found on server for download")
            raise Http404("Файл не найден на сервере.")
        except Exception as e:
            logger.error(f"Error downloading file {file.original_name}: {str(e)}")
            raise Http404(f"Ошибка при скачивании файла: {str(e)}")

    @action(detail=True, methods=['post', 'delete'])
    def share(self, request, pk=None):
        """
        Создание или удаление публичной ссылки для общего доступа к файлу.
        POST: Создает ссылку и делает файл публичным.
        DELETE: Удаляет ссылку и делает файл приватным.
        """
        file = self.get_object()

        if request.method == 'POST':
            file.shared_link = uuid.uuid4().hex[:15]
            file.is_public = True
            file.save()
            logger.info(f"User {request.user.username} shared file {file.original_name} with link {file.shared_link}")
            return Response({'shared_link': file.shared_link}, status=status.HTTP_200_OK)

        elif request.method == 'DELETE':
            file.shared_link = None
            file.is_public = False
            file.save()
            logger.info(f"User {request.user.username} revoked sharing for file {file.original_name}")
            return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='rename')
    def rename(self, request, pk=None):
        """
        Переименование файла. Обновляет поле original_name в базе данных.
        """
        file = self.get_object()
        new_name = request.data.get('new_name')
        if not new_name:
            return Response({'detail': 'New name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        file.original_name = new_name
        file.save()
        logger.info(f"User {request.user.username} renamed file {file.id} to {new_name}")
        return Response({'id': file.id, 'original_name': new_name}, status=status.HTTP_200_OK)


class PublicFileDownloadView(APIView):
    """
    API для скачивания публичных файлов по shared_link.
    Доступ открыт для всех (AllowAny).
    """
    permission_classes = [AllowAny]

    def get(self, request, shared_link):
        try:
            file = File.objects.get(shared_link=shared_link, is_public=True)
        except File.DoesNotExist:
            logger.warning(f"Attempt to access non-existent or private file with link {shared_link}")
            raise Http404("Файл не найден или недоступен для публичного доступа.")

        file.last_download = timezone.now()
        file.save()
        logger.info(f"Public download of file {file.original_name} via link {shared_link}")

        try:
            file_path = file.file.path
            if not os.path.exists(file_path):
                logger.error(f"Public file {file_path} not found on server")
                raise Http404("Файл не найден на сервере.")
            
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                mime_type = 'application/octet-stream'
            logger.info(f"Public downloading file {file.original_name} with MIME type: {mime_type}")
           
            with open(file_path, 'rb') as fh:
                response = HttpResponse(fh.read(), content_type=mime_type)
                response['Content-Disposition'] = f'attachment; filename="{file.original_name}"'
                response['X-Content-Type-Options'] = 'nosniff'
                response['Content-Length'] = os.path.getsize(file_path)
                return response
        except FileNotFoundError:
            logger.error(f"Public file {file.file.path} not found on server")
            raise Http404("Файл не найден на сервере.")
        except Exception as e:
            logger.error(f"Error downloading public file {file.original_name}: {str(e)}")
            raise Http404(f"Ошибка при скачивании файла: {str(e)}")


class RegisterView(APIView):
    """
    API для регистрации нового пользователя.
    Доступ открыт для всех (AllowAny).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()            
            
            Token.objects.filter(user=user).delete()
            token = Token.objects.create(user=user)
            
            logger.info(f"New user registered: {user.username}")
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_201_CREATED)
        
        logger.warning(f"Registration failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    API для входа пользователя в систему.
    Возвращает данные пользователя и токен.
    Доступ открыт для всех (AllowAny).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"Failed login attempt: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data
        token, created = Token.objects.get_or_create(user=user)
        logger.info(f"User {user.username} logged in")
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    API для выхода пользователя из системы.
    Поддерживает TokenAuthentication, SessionAuthentication и JWT (если установлен).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:            
            if hasattr(request, 'auth') and isinstance(request.auth, Token):
                request.auth.delete()
                logger.info(f"Token deleted for user {request.user.username}")
            
            if JWT_INSTALLED:
                refresh_token = request.data.get("refresh_token")
                if refresh_token:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                    logger.info(f"JWT token blacklisted for user {request.user.username}")
            
            if request.user.is_authenticated:
                logout(request)
                logger.info(f"Session ended for user {request.user.username}")

            response = Response(
                {"detail": "Вы успешно вышли из системы."},
                status=status.HTTP_200_OK
            )
            
            response.delete_cookie('auth_token')
            response.delete_cookie('sessionid')
            response.delete_cookie('csrftoken')

            return response

        except Exception as e:
            logger.error(f"Logout error for user {request.user.username}: {str(e)}")
            return Response(
                {"detail": f"Ошибка при выходе из системы: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet для работы с пользователями.
    Администраторы видят всех пользователей, обычные пользователи — только себя.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        """
        Ограничение queryset в зависимости от прав пользователя.
        """
        if self.request.user.is_admin:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    def destroy(self, request, *args, **kwargs):
        """
        Запрет на удаление собственной учетной записи.
        """
        instance = self.get_object()
        if instance == request.user:
            logger.warning(f"User {request.user.username} attempted to delete own account")
            return Response(
                {"detail": "Вы не можете удалить свою учетную запись."},
                status=status.HTTP_403_FORBIDDEN
            )
        logger.info(f"User {request.user.username} deleted account {instance.username}")
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Получение данных текущего пользователя.
        """
        serializer = self.get_serializer(request.user)
        logger.info(f"User {request.user.username} accessed own profile")
        return Response(serializer.data)
