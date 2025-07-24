from rest_framework import serializers
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from django.db.models import Count
from .models import File, User
from .validators import PasswordValidator


class FileSerializer(serializers.ModelSerializer):
    """Сериализатор для модели File"""
    owner = serializers.StringRelatedField(read_only=True)
    human_readable_size = serializers.ReadOnlyField()
    file_type = serializers.ReadOnlyField()

    class Meta:
        model = File
        fields = (
            'id', 'owner', 'original_name', 'file', 'size', 'human_readable_size',
            'upload_date', 'last_download', 'comment', 'shared_link',
            'is_public', 'file_type'
        )
        read_only_fields = (
            'id', 'owner', 'size', 'human_readable_size', 'upload_date',
            'last_download', 'file_type', 'shared_link'
        )

    def create(self, validated_data):
        """Установка владельца файла как текущего пользователя при создании"""
        validated_data['owner'] = self.context['request'].user
        
        if 'original_name' not in validated_data or not validated_data['original_name']:
            file_obj = validated_data.get('file')
            if file_obj:
                validated_data['original_name'] = file_obj.name

        return super().create(validated_data)

    def validate_file(self, value):
        """Валидация файла перед загрузкой"""
        user = self.context['request'].user
        if not user.is_authenticated:
            raise serializers.ValidationError(_("Вы должны быть авторизованы для загрузки файлов."))
        
        if hasattr(value, 'size') and not user.can_upload_file(value.size):
            raise serializers.ValidationError(
                _("Файл превышает квоту хранилища. Доступно: %(available)s байт") % {
                    'available': user.storage_left
                }
            )
        return value


class UserSerializer(serializers.ModelSerializer):
    """Сериализатор для модели User с количеством файлов"""
    files_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'full_name', 'is_admin', 'is_active',
            'storage_directory', 'storage_quota', 'storage_used', 'date_joined', 'files_count'
        )
        read_only_fields = (
            'id', 'is_active', 'storage_directory',
            'storage_quota', 'storage_used', 'date_joined', 'files_count'
        )        

    def get_files_count(self, obj):
        """Получение количества файлов пользователя"""
        return obj.files.count()


class UserUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления данных пользователя"""
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'full_name', 'is_admin')
        read_only_fields = ('id', 'username')   


class UserProfileSerializer(serializers.ModelSerializer):
    """Сериализатор для отображения профиля пользователя с количеством файлов"""
    files_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'full_name', 'is_admin', 'is_active',
            'storage_quota', 'storage_used', 'date_joined', 'files_count'
        )
        read_only_fields = fields  

    def get_files_count(self, obj):
        """Получение количества файлов пользователя"""
        return obj.files.count()


class RegisterSerializer(serializers.ModelSerializer):
    """Сериализатор для регистрации нового пользователя"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        validators=[PasswordValidator()]
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'full_name', 'password', 'confirm_password')
        read_only_fields = ('id',)
        extra_kwargs = {
            'email': {'required': True},
            'full_name': {'required': False},
        }

    def validate(self, data):
        """Проверка, что пароли совпадают"""
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": _("Пароли не совпадают.")})
        return data

    def validate_email(self, value):
        """Проверка уникальности email"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(_("Пользователь с таким email уже существует."))
        return value

    def validate_username(self, value):
        """Проверка уникальности username"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(_("Пользователь с таким именем уже существует."))
        return value

    def create(self, validated_data):
        """Создание нового пользователя"""
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()        
        Token.objects.get_or_create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    """Сериализатор для аутентификации пользователя"""
    username = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, data):
        """Проверка учетных данных пользователя"""
        user = authenticate(username=data['username'], password=data['password'])
        if user and user.is_active:
            return user
        raise serializers.ValidationError(_("Неверные учетные данные или пользователь неактивен."))
