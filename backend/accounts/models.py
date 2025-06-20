import os
import uuid
from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
    Group
)
from django.conf import settings
from django.core.validators import FileExtensionValidator, RegexValidator
from django.db.models import Sum
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError

class UserManager(BaseUserManager):
    """Кастомный менеджер для модели User"""
    
    def create_user(self, username, email, full_name, password=None, **extra_fields):
        """Создание обычного пользователя"""
        if not email:
            raise ValueError('Пользователь должен иметь email')
        if not username:
            raise ValueError('Пользователь должен иметь username')
        
        # Валидация полей перед созданием пользователя
        username_validator = RegexValidator(
            regex=r'^[a-zA-Z][a-zA-Z0-9]{3,19}$',
            message=_('Username должен начинаться с буквы, содержать только буквы и цифры, и быть длиной 4-20 символов.')
        )
        username_validator(username)
        
        email_validator = RegexValidator(
            regex=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$',
            message=_('Введите корректный email адрес.')
        )
        email_validator(email)
        
        full_name_validator = RegexValidator(
            regex=r'^[a-zA-Zа-яА-ЯёЁ\s\-]+$',
            message=_('Полное имя может содержать только буквы, пробелы и дефисы.')
        )
        full_name_validator(full_name)
        
        email = self.normalize_email(email)
        user = self.model(
            username=username,
            email=email,
            full_name=full_name,
            **extra_fields
        )
        
        if password:
            from .validators import PasswordValidator
            PasswordValidator()(password)
            user.set_password(password)
        
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, email, full_name, password=None, **extra_fields):
        """Создание суперпользователя"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_admin', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Суперпользователь должен иметь is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Суперпользователь должен иметь is_superuser=True.')
        
        return self.create_user(username, email, full_name, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    """Кастомная модель пользователя"""
    
    username = models.CharField(
        _('username'),
        max_length=20,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^[a-zA-Z][a-zA-Z0-9]{3,19}$',
                message=_('Username должен начинаться с буквы, содержать только буквы и цифры, и быть длиной 4-20 символов.')
            )
        ],
        help_text=_('Обязательное поле. 4-20 символов. Только буквы и цифры. Первый символ должен быть буквой.'),
    )
    
    email = models.EmailField(
        _('email address'),
        max_length=255,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$',
                message=_('Введите корректный email адрес.')
            )
        ],
    )
    
    full_name = models.CharField(
        _('full name'),
        max_length=255,
        validators=[
            RegexValidator(
                regex=r'^[a-zA-Zа-яА-ЯёЁ\s\-]+$',
                message=_('Полное имя может содержать только буквы, пробелы и дефисы.')
            )
        ]
    )
    
    storage_directory = models.CharField(
        _('storage directory'),
        max_length=255,
        unique=True,
        blank=True,
    )
    
    storage_quota = models.BigIntegerField(
        _('storage quota'),
        default=100*1024*1024,  # 100MB по умолчанию
        help_text=_('Квота хранилища в байтах'),
    )
    
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_('Указывает, должен ли пользователь считаться активным.'),
    )
    
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Указывает, может ли пользователь входить в админ-панель.'),
    )
    
    is_admin = models.BooleanField(
        _('admin status'),
        default=False,
        help_text=_('Указывает, имеет ли пользователь права администратора.'),
    )
    
    date_joined = models.DateTimeField(
        _('date joined'),
        auto_now_add=True,
        editable=False, 
    )
    
    groups = models.ManyToManyField(
        Group,
        verbose_name=_('groups'),
        blank=True,
        related_name='custom_user_set',
        related_query_name='user',
    )
    
    objects = UserManager()
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'full_name']
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-date_joined']
        permissions = [
            ("can_view_all_files", "Может просматривать все файлы"),
            ("can_manage_users", "Может управлять пользователями"),
        ]
    
    def __str__(self):
        return f'{self.username} ({self.full_name})'
    
    def save(self, *args, **kwargs):
        """Автоматическое создание директории для файлов пользователя"""
        if not self.storage_directory:
            self.storage_directory = f'user_{self.username}'
        super().save(*args, **kwargs)
    
    @property
    def storage_used(self):
        """Используемое дисковое пространство"""
        return self.files.aggregate(total=Sum('size'))['total'] or 0
    
    @property
    def storage_left(self):
        """Оставшееся дисковое пространство"""
        return max(0, self.storage_quota - self.storage_used)
    
    def has_perm(self, perm, obj=None):
        """Проверка прав доступа"""
        if self.is_admin:
            return True
        return super().has_perm(perm, obj)
    
    def has_module_perms(self, app_label):
        """Проверка прав доступа к модулю"""
        return True
    
    def can_upload_file(self, file_size):
        """Проверка возможности загрузки файла"""
        return self.storage_left >= file_size

class File(models.Model):
    """Модель для хранения файлов в облачном хранилище"""
    
    class FileType(models.TextChoices):
        PDF = 'PDF', _('PDF Document')
        WORD = 'WORD', _('Word Document')
        IMAGE = 'IMAGE', _('Image')
        TEXT = 'TEXT', _('Text File')
        OTHER = 'OTHER', _('Other')
    
    id = models.UUIDField(
        _('id'),
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='files',
        verbose_name=_('owner'),
    )
    
    original_name = models.CharField(
        _('original filename'),
        max_length=255,
        validators=[
            RegexValidator(
                regex=r'^[\w\s\-\.\(\)\[\]!@#$%^&+=;,\']+$',
                message=_('Имя файла содержит недопустимые символы.')
            )
        ]
    )
    
    file = models.FileField(
        _('file'),
        upload_to='user_uploads/%Y/%m/%d',
        validators=[
            FileExtensionValidator(
                allowed_extensions=['pdf', 'docx', 'jpg', 'jpeg', 'png', 'txt'],
                message=_('Тип файла не разрешен. Разрешенные расширения: pdf, docx, jpg, png, txt')
            )
        ],
    )
    
    size = models.BigIntegerField(
        _('file size'),
        help_text=_('Размер файла в байтах'),
    )
    
    upload_date = models.DateTimeField(
        _('upload date'),
        auto_now_add=True,
    )
    
    last_download = models.DateTimeField(
        _('last download'),
        null=True,
        blank=True,
    )
    
    comment = models.TextField(
        _('comment'),
        blank=True,
        max_length=500,
        validators=[
            RegexValidator(
                regex=r'^[\w\s\-\.\(\)\[\]!@#$%^&+=;,\'\"]*$',
                message=_('Комментарий содержит недопустимые символы.')
            )
        ]
    )
    
    shared_link = models.CharField(
        _('share link'),
        max_length=50,
        unique=True,
        blank=True,
        null=True,
    )
    
    is_public = models.BooleanField(
        _('is public'),
        default=False,
    )
    
    file_type = models.CharField(
        _('file type'),
        max_length=50,
        choices=FileType.choices,
        default=FileType.OTHER,
    )

    class Meta:
        verbose_name = _('file')
        verbose_name_plural = _('files')
        ordering = ['-upload_date']
        indexes = [
            models.Index(fields=['owner']),
            models.Index(fields=['upload_date']),
            models.Index(fields=['file_type']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(size__gte=0),
                name='file_size_positive'
            )
        ]

    def __str__(self):
        return f"{self.original_name} (Владелец: {self.owner.username})"

    def clean(self):
        """Валидация перед сохранением"""
        if not self.pk:  # Только для новых файлов
            if not self.owner.can_upload_file(self.size):
                raise ValidationError(
                    _('Файл превышает квоту хранилища. Доступно: %(available)s байт') % {
                        'available': self.owner.storage_left
                    }
                )

    def save(self, *args, **kwargs):
        """Автоматическая обработка перед сохранением"""
        if not self.pk:  # Только при создании
            self.size = self.file.size
            self.original_name = os.path.basename(self.file.name)
            self.file_type = self.get_file_type()
            
            if not self.shared_link and self.is_public:
                self.shared_link = uuid.uuid4().hex[:15]
        
        self.full_clean() 
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Удаление файла с диска при удалении записи"""
        if self.file and os.path.isfile(self.file.path):
            os.remove(self.file.path)
        super().delete(*args, **kwargs)

    def get_file_type(self):
        """Определение типа файла по расширению"""
        ext = os.path.splitext(self.file.name)[1].lower()
        return {
            '.pdf': self.FileType.PDF,
            '.docx': self.FileType.WORD,
            '.jpg': self.FileType.IMAGE,
            '.jpeg': self.FileType.IMAGE,
            '.png': self.FileType.IMAGE,
            '.txt': self.FileType.TEXT,
        }.get(ext, self.FileType.OTHER)

    @property
    def human_readable_size(self):
        """Человеко-читаемый размер файла"""
        size = self.size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"

    def can_be_accessed_by(self, user):
        """Проверка доступа пользователя к файлу"""
        if self.is_public:
            return True
        return user.is_authenticated and (user.is_admin or self.owner == user)