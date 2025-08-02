import os
import uuid
import logging
import mimetypes
from datetime import datetime, timedelta
from django.http import FileResponse, Http404, HttpResponse
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.contrib.auth import logout
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.authtoken.models import Token
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

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

logger = logging.getLogger(__name__)

# Константы для кэширования
CACHE_TIMEOUT = 60 * 5  
FILE_LIST_CACHE_KEY = 'file_list_{user_id}_{page}_{page_size}'
USER_LIST_CACHE_KEY = 'user_list_{page}_{page_size}'

class StandardResultsSetPagination(PageNumberPagination):
    """Кастомная пагинация для API"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class FileViewSet(viewsets.ModelViewSet):
    """
    API endpoint для управления файлами пользователей.
    Поддерживает все CRUD операции, а также дополнительные действия:
    - download: скачивание файла
    - share: создание публичной ссылки
    - rename: переименование файла
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

    @method_decorator(cache_page(CACHE_TIMEOUT))
    def list(self, request, *args, **kwargs):
        """
        Список файлов с кэшированием.
        Кэш зависит от пользователя, страницы и размера страницы.
        """
        cache_key = FILE_LIST_CACHE_KEY.format(
            user_id=request.user.id,
            page=request.query_params.get('page', 1),
            page_size=request.query_params.get('page_size', self.pagination_class.page_size)
        )
        
        # Пытаемся получить данные из кэша
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)
        
        # Если в кэше нет, выполняем обычный запрос
        response = super().list(request, *args, **kwargs)
        
        # Сохраняем ответ в кэш
        cache.set(cache_key, response.data, CACHE_TIMEOUT)
        return response

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
        Создание нового файла с проверкой квоты хранилища.
        При создании файла инвалидируем кэш списка файлов для этого пользователя.
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
        
        # Инвалидация кэша списка файлов для этого пользователя
        self._invalidate_file_list_cache(self.request.user.id)

    def perform_destroy(self, instance):
        """Удаление файла с физическим удалением с диска"""
        if instance.file and os.path.isfile(instance.file.path):
            try:
                os.remove(instance.file.path)
                logger.info(f"Deleted physical file: {instance.file.path}")
            except Exception as e:
                logger.error(f"Error deleting file {instance.file.path}: {str(e)}")
                raise ValidationError("Ошибка при удалении файла")
        instance.delete()
        logger.info(f"Deleted file record: {instance.original_name}")
        
        # Инвалидация кэша списка файлов для владельца файла
        self._invalidate_file_list_cache(instance.owner.id)

    def perform_update(self, serializer):
        """Обновление файла с инвалидацией кэша"""
        instance = serializer.instance
        response = super().perform_update(serializer)
        
        # Инвалидация кэша списка файлов для владельца файла
        self._invalidate_file_list_cache(instance.owner.id)
        return response

    def _invalidate_file_list_cache(self, user_id):
        """Инвалидация кэша списка файлов для указанного пользователя"""
        cache.delete_many([
            FILE_LIST_CACHE_KEY.format(
                user_id=user_id,
                page=page,
                page_size=self.pagination_class.page_size
            )
            for page in range(1, 10)  
        ])

    @swagger_auto_schema(
        operation_description="Скачивание файла",
        responses={
            200: openapi.Response('Файл для скачивания'),
            404: 'Файл не найден'
        }
    )
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Скачивание файла с обновлением даты последнего скачивания.
        """
        file = self.get_object()
        file.last_download = timezone.now()
        file.save()

        try:
            file_path = file.file.path
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                raise Http404("Файл не найден на сервере.")
            
            mime_type, _ = mimetypes.guess_type(file_path)
            response = FileResponse(
                open(file_path, 'rb'),
                content_type=mime_type or 'application/octet-stream'
            )
            response['Content-Disposition'] = f'attachment; filename="{file.original_name}"'
            response['Content-Length'] = os.path.getsize(file_path)
            return response
        except Exception as e:
            logger.error(f"Download error: {str(e)}")
            raise Http404(f"Ошибка при скачивании: {str(e)}")

    @swagger_auto_schema(
        method='post',
        operation_description="Создание публичной ссылки на файл",
        responses={
            200: openapi.Response('Успешно', schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'shared_link': openapi.Schema(type=openapi.TYPE_STRING)
                }
            )),
            400: 'Ошибка запроса'
        }
    )
    @swagger_auto_schema(
        method='delete',
        operation_description="Удаление публичной ссылки на файл",
        responses={
            204: 'Ссылка успешно удалена',
            400: 'Ошибка запроса'
        }
    )
    @action(detail=True, methods=['post', 'delete'])
    def share(self, request, pk=None):
        """
        Управление публичным доступом к файлу.
        POST - создает публичную ссылку
        DELETE - удаляет публичную ссылку
        """
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

    @swagger_auto_schema(
        operation_description="Переименование файла",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'new_name': openapi.Schema(type=openapi.TYPE_STRING)
            }
        ),
        responses={
            200: openapi.Response('Успешно', schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'id': openapi.Schema(type=openapi.TYPE_STRING),
                    'original_name': openapi.Schema(type=openapi.TYPE_STRING)
                }
            )),
            400: 'Неверное имя файла'
        }
    )
    @action(detail=True, methods=['patch'], url_path='rename')
    def rename(self, request, pk=None):
        """Переименование файла"""
        file = self.get_object()
        new_name = request.data.get('new_name')
        
        if not new_name or not new_name.strip():
            return Response(
                {'detail': 'Необходимо указать новое имя файла'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file.original_name = new_name
        file.save()
        return Response(
            {'id': file.id, 'original_name': new_name},
            status=status.HTTP_200_OK
        )

class PublicFileDownloadView(APIView):
    """
    API для скачивания публичных файлов по shared_link.
    Доступ без аутентификации.
    """
    permission_classes = [AllowAny]

    @method_decorator(cache_page(CACHE_TIMEOUT))
    @swagger_auto_schema(
        operation_description="Скачивание публичного файла",
        responses={
            200: openapi.Response('Файл для скачивания'),
            404: 'Файл не найден или недоступен'
        }
    )
    def get(self, request, shared_link):
        """Скачивание файла по публичной ссылке"""
        try:
            file = File.objects.get(shared_link=shared_link, is_public=True)
        except File.DoesNotExist:
            raise Http404("Файл не найден или недоступен")

        file.last_download = timezone.now()
        file.save()

        try:
            file_path = file.file.path
            if not os.path.exists(file_path):
                raise Http404("Файл не найден на сервере")
            
            mime_type, _ = mimetypes.guess_type(file_path)
            response = FileResponse(
                open(file_path, 'rb'),
                content_type=mime_type or 'application/octet-stream'
            )
            response['Content-Disposition'] = f'attachment; filename="{file.original_name}"'
            return response
        except Exception as e:
            logger.error(f"Public download error: {str(e)}")
            raise Http404(f"Ошибка скачивания: {str(e)}")

class RegisterView(APIView):
    """
    Регистрация нового пользователя.
    При успешной регистрации возвращает данные пользователя и токен.
    """
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_description="Регистрация нового пользователя",
        request_body=RegisterSerializer,
        responses={
            201: openapi.Response('Успешная регистрация', UserSerializer),
            400: 'Ошибка валидации'
        }
    )
    def post(self, request):
        """Обработка регистрации"""
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            Token.objects.filter(user=user).delete()
            token = Token.objects.create(user=user)
            
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    """
    Аутентификация пользователя.
    При успешном входе возвращает данные пользователя и токен.
    """
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_description="Аутентификация пользователя",
        request_body=LoginSerializer,
        responses={
            200: openapi.Response('Успешный вход', UserSerializer),
            400: 'Неверные учетные данные'
        }
    )
    def post(self, request):
        """Обработка входа"""
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_200_OK)

class LogoutView(APIView):
    """
    Выход пользователя из системы.
    Удаляет токен аутентификации.
    """
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Выход из системы",
        responses={
            200: 'Успешный выход',
            400: 'Ошибка выхода'
        }
    )
    def post(self, request):
        """Обработка выхода"""
        try:
            if hasattr(request, 'auth') and isinstance(request.auth, Token):
                request.auth.delete()
            
            logout(request)
            return Response(
                {"detail": "Вы успешно вышли из системы."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            return Response(
                {"detail": "Ошибка при выходе из системы"},
                status=status.HTTP_400_BAD_REQUEST
            )

class UserViewSet(viewsets.ModelViewSet):
    """
    Управление пользователями (только для администраторов).
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    pagination_class = StandardResultsSetPagination

    @method_decorator(cache_page(CACHE_TIMEOUT))
    def list(self, request, *args, **kwargs):
        """
        Список пользователей с кэшированием.
        Кэш зависит от страницы и размера страницы.
        """
        cache_key = USER_LIST_CACHE_KEY.format(
            page=request.query_params.get('page', 1),
            page_size=request.query_params.get('page_size', self.pagination_class.page_size)
        )
        
        # Пытаемся получить данные из кэша
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)
        
        # Если в кэше нет, выполняем обычный запрос
        response = super().list(request, *args, **kwargs)
        
        # Сохраняем ответ в кэш
        cache.set(cache_key, response.data, CACHE_TIMEOUT)
        return response

    def get_queryset(self):
        """Ограничение queryset в зависимости от прав"""
        if self.request.user.is_admin:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    def perform_create(self, serializer):
        """Создание пользователя с инвалидацией кэша"""
        response = super().perform_create(serializer)
        self._invalidate_user_list_cache()
        return response

    def perform_destroy(self, instance):
        """Удаление пользователя с инвалидацией кэша"""
        response = super().perform_destroy(instance)
        self._invalidate_user_list_cache()
        return response

    def perform_update(self, serializer):
        """Обновление пользователя с инвалидацией кэша"""
        response = super().perform_update(serializer)
        self._invalidate_user_list_cache()
        return response

    def _invalidate_user_list_cache(self):
        """Инвалидация кэша списка пользователей"""
        cache.delete_many([
            USER_LIST_CACHE_KEY.format(
                page=page,
                page_size=self.pagination_class.page_size
            )
            for page in range(1, 10)  
        ])

    @swagger_auto_schema(
        operation_description="Получение данных текущего пользователя",
        responses={
            200: UserSerializer,
            401: 'Не авторизован'
        }
    )
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Получение данных текущего пользователя"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Запрет на удаление собственной учетной записи"""
        instance = self.get_object()
        if instance == request.user:
            return Response(
                {"detail": "Вы не можете удалить свою учетную запись."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)