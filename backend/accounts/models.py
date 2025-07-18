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
    """Менеджер для кастомной модели User"""

    def create_user(self, username, email, full_name, password=None, **extra_fields):
        if not email:
            raise ValueError('Email обязателен')
        if not username:
            raise ValueError('Username обязателен')

        # Валидация username
        username_validator = RegexValidator(
            regex=r'^[a-zA-Z][a-zA-Z0-9]{3,19}$',
            message=_('Username должен начинаться с буквы, содержать только буквы и цифры, длина 4-20 символов.')
        )
        username_validator(username)

        # Валидация email
        email_validator = RegexValidator(
            regex=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$',
            message=_('Введите корректный email.')
        )
        email_validator(email)

        # Валидация полного имени
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
                message=_('Username должен начинаться с буквы, содержать только буквы и цифры, длина 4-20 символов.')
            )
        ],
        help_text=_('Обязательное поле. 4-20 символов. Только буквы и цифры. Первый символ — буква.'),
    )

    email = models.EmailField(
        _('email address'),
        max_length=255,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$',
                message=_('Введите корректный email.')
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
        help_text=_('Папка для хранения файлов пользователя'),
    )

    storage_quota = models.BigIntegerField(
        _('storage quota'),
        default=100 * 1024 * 1024,  # 100 МБ
        help_text=_('Квота хранилища в байтах'),
    )

    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_('Активен ли пользователь'),
    )

    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Может ли пользователь входить в админ-панель'),
    )

    is_admin = models.BooleanField(
        _('admin status'),
        default=False,
        help_text=_('Администратор'),
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
        if not self.storage_directory:
            self.storage_directory = f'user_{self.username}'
        super().save(*args, **kwargs)

    @property
    def storage_used(self):
        return self.files.aggregate(total=Sum('size'))['total'] or 0

    @property
    def storage_left(self):
        return max(0, self.storage_quota - self.storage_used)

    def has_perm(self, perm, obj=None):
        if self.is_admin:
            return True
        return super().has_perm(perm, obj)

    def has_module_perms(self, app_label):
        return True

    def can_upload_file(self, file_size):
        return self.storage_left >= file_size


def user_directory_path(instance, filename):
    """Путь для сохранения файла: media/user_<username>/<filename>"""
    return os.path.join(instance.owner.storage_directory, filename)


class File(models.Model):
    """Модель файла в облачном хранилище"""

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
        upload_to=user_directory_path,
        validators=[
            FileExtensionValidator(
                allowed_extensions=['pdf', 'docx', 'jpg', 'jpeg', 'png', 'txt'],
                message=_('Тип файла не разрешен. Разрешенные расширения: pdf, docx, jpg, png, txt')
            )
        ],
    )

    size = models.BigIntegerField(
        _('file size'),
        default=0,
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
            models.CheckConstraint(check=models.Q(size__gte=0), name='file_size_positive')
        ]

    def __str__(self):
        return f"{self.original_name} (Владелец: {self.owner.username})"

    def clean(self):
        if not self.pk:  # Только при создании
            file_size = self.size if self.size > 0 else (self.file.size if hasattr(self.file, 'size') else 0)
            if not self.owner.can_upload_file(file_size):
                raise ValidationError(
                    _('Файл превышает квоту хранилища. Доступно: %(available)s байт') % {
                        'available': self.owner.storage_left
                    }
                )

    def save(self, *args, **kwargs):
        if not self.pk:  # При создании
            if self.file and hasattr(self.file, 'size'):
                self.size = self.file.size
            else:
                self.size = 0
            self.original_name = os.path.basename(self.file.name)
            self.file_type = self.get_file_type()

            if not self.shared_link and self.is_public:
                self.shared_link = uuid.uuid4().hex[:15]
        else:
            # При обновлении сохраняем старый размер, если файл не изменён
            if not self.file or not hasattr(self.file, 'file'):
                try:
                    original = File.objects.get(pk=self.pk)
                    self.size = original.size
                except File.DoesNotExist:
                    self.size = 0

        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Удаляем физический файл с диска
        if self.file and os.path.isfile(self.file.path):
            os.remove(self.file.path)
        super().delete(*args, **kwargs)

    def get_file_type(self):
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
        size = self.size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"

    def can_be_accessed_by(self, user):
        if self.is_public:
            return True
        return user.is_authenticated and (user.is_admin or self.owner == user)
