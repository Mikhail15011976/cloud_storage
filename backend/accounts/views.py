from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import filters
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
import os
import uuid
from .models import File, User
from .serializers import FileSerializer, UserSerializer, RegisterSerializer, LoginSerializer
from rest_framework.authtoken.models import Token

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['file_type', 'owner', 'is_public']
    search_fields = ['original_name', 'comment']
    ordering_fields = ['upload_date', 'last_download', 'size']
    ordering = ['-upload_date']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not self.request.user.is_admin:
            queryset = queryset.filter(owner=self.request.user)
        return queryset

    def perform_create(self, serializer):
        file_obj = self.request.FILES['file']
        serializer.save(
            owner=self.request.user,
            original_name=file_obj.name,
            size=file_obj.size
        )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        file = self.get_object()
        if not request.user.is_admin and file.owner != request.user:
            return Response(
                {"detail": "You do not have permission to access this file."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        file.last_download = timezone.now()
        file.save()
        
        try:
            response = FileResponse(open(file.file.path, 'rb'))
            response['Content-Disposition'] = f'attachment; filename="{file.original_name}"'
            return response
        except FileNotFoundError:
            raise Http404("File not found on server")

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

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_admin:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)