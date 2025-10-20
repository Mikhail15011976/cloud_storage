import os
import uuid
import logging
import mimetypes
from django.http import FileResponse, Http404
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth import logout
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
    IsOwnerOrAdmin
)

logger = logging.getLogger(__name__)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class FileViewSet(viewsets.ModelViewSet):
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
        queryset = super().get_queryset().filter(is_deleted=False)         
        
        if self.request.user.is_admin:            
            owner_id = self.request.query_params.get('owner')
            if owner_id:
                queryset = queryset.filter(owner__id=owner_id)
        else:            
            queryset = queryset.filter(owner=self.request.user)
        
        return queryset

    def perform_create(self, serializer):
        file_obj = self.request.FILES.get('file')
        if not file_obj:
            raise ValidationError({"file": "Файл не предоставлен."})
        
        current_user = self.request.user        
        
        if current_user.storage_left < file_obj.size:
            raise ValidationError(
                {"detail": f"Недостаточно места в хранилище. Доступно: {current_user.storage_left} байт"}
            )        
        
        serializer.save(owner=current_user)
        logger.info(f"User {current_user.username} uploaded file {file_obj.name}")

    def perform_destroy(self, instance):
        try:
            instance.delete()
            logger.info(f"Deleted file record: {instance.original_name}")
        except Exception as e:
            logger.error(f"Error in perform_destroy: {str(e)}")
            raise ValidationError("Ошибка при удалении файла")

    @swagger_auto_schema(
        operation_description="Скачивание файла",
        responses={
            200: openapi.Response('Файл для скачивания'),
            404: 'Файл не найден'
        }
    )
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        file = self.get_object()        
        
        if not file.can_be_accessed_by(request.user):
            return Response(
                {"detail": "У вас нет доступа к этому файлу."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        file.last_download = timezone.now()
        file.save()

        file_handle = None
        try:
            file_path = file.file.path
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                raise Http404("Файл не найден на сервере.")
            
            mime_type, _ = mimetypes.guess_type(file_path)
            file_handle = open(file_path, 'rb')
            response = FileResponse(
                file_handle,
                content_type=mime_type or 'application/octet-stream',
                as_attachment=True,
                filename=file.original_name
            )            
            
            file_handle = None
            return response
            
        except Exception as e:
            if file_handle:
                file_handle.close()
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
        file = self.get_object()
        
        if not file.can_be_accessed_by(request.user):
            return Response(
                {"detail": "У вас нет прав для управления этим файлом."},
                status=status.HTTP_403_FORBIDDEN
            )

        if request.method == 'POST':           
            link = uuid.uuid4().hex[:16]
            while File.objects.filter(shared_link=link).exists():
                link = uuid.uuid4().hex[:16]

            file.shared_link = link
            file.is_public = True
            file.save()
            logger.info(f"Created shared link for file: {file.original_name} -> {link}")

            full_url = request.build_absolute_uri(
                f'/public/files/{file.shared_link}/'
            )
            return Response({'shared_link': full_url}, status=status.HTTP_200_OK)

        elif request.method == 'DELETE':
            file.shared_link = None
            file.is_public = False
            file.save()
            logger.info(f"Removed shared link for file: {file.original_name}")
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
        file = self.get_object()        
        
        if not file.can_be_accessed_by(request.user) or (not request.user.is_admin and file.owner != request.user):
            return Response(
                {"detail": "У вас нет прав для переименования этого файла."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_name = request.data.get('new_name')
        
        if not new_name or not new_name.strip():
            return Response(
                {'detail': 'Необходимо указать новое имя файла'},
                status=status.HTTP_400_BAD_REQUEST
            )        
        
        old_name = file.original_name
        file.original_name = new_name
        
        try:
            file.save()  
            return Response(
                {'id': file.id, 'original_name': new_name},
                status=status.HTTP_200_OK
            )
        except ValidationError as e:            
            file.original_name = old_name
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class PublicFileDownloadView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_description="Скачивание публичного файла",
        responses={
            200: openapi.Response('Файл для скачивания'),
            404: 'Файл не найден или недоступен'
        }
    )
    def get(self, request, shared_link):
        try:
            file = File.objects.get(shared_link=shared_link, is_public=True, is_deleted=False)
        except File.DoesNotExist:
            raise Http404("Файл не найден или недоступен")

        file.last_download = timezone.now()
        file.save()

        file_handle = None
        try:
            file_path = file.file.path
            if not os.path.exists(file_path):
                raise Http404("Файл не найден на сервере")

            mime_type, _ = mimetypes.guess_type(file_path)
            file_handle = open(file_path, 'rb')
            response = FileResponse(
                file_handle,
                content_type=mime_type or 'application/octet-stream'
            )
            response['Content-Disposition'] = f'attachment; filename="{file.original_name}"'
                        
            file_handle = None
            return response
            
        except Exception as e:
            if file_handle:
                file_handle.close()
            logger.error(f"Public download error: {str(e)}")
            raise Http404(f"Ошибка скачивания: {str(e)}")

class RegisterView(APIView):
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
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Выход из системы",
        responses={
            200: 'Успешный выход',
            400: 'Ошибка выхода'
        }
    )
    def post(self, request):
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
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        if self.request.user.is_admin:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @swagger_auto_schema(
        operation_description="Получение данных текущего пользователя",
        responses={
            200: UserSerializer,
            401: 'Не авторизован'
        }
    )
    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response(
                {"detail": "Вы не можете удалить свою учетную запись."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)