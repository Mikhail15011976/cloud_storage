from rest_framework import serializers
from rest_framework.authtoken.models import Token
from .models import File, User
from django.contrib.auth import authenticate

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ['id', 'original_name', 'size', 'upload_date', 'comment', 
                 'shared_link', 'is_public', 'file_type']
        read_only_fields = ['id', 'size', 'upload_date', 'owner', 
                          'shared_link', 'file_type']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'full_name', 'is_admin']
        read_only_fields = ['is_admin']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'full_name', 'password']
    
    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Неверные учетные данные")