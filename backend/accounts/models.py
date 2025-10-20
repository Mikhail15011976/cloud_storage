import os
import uuid
import logging
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin, Group
from django.conf import settings
from django.core.validators import FileExtensionValidator, RegexValidator
from django.db.models import Sum
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

class UserManager(BaseUserManager):
    def create_user(self, username, email, full_name, password=None, **extra_fields):        
        if not email:
            raise ValueError(_('Email обязателен'))
        if not username:
            raise ValueError(_('Username обязателен'))
        
        self._validate_username(username)
        self._validate_email(email)
        self._validate_full_name(full_name)

        email = self.normalize_email(email)
        user = self.model(
            username=username,
            email=email,
            full_name=full_name,
            **extra_fields
        )

        if password:
            self._validate_password(password)
            user.set_password(password)

        user.save(using=self._db)
        logger.info(f"User created: {username}")
        return user

    def create_superuser(self, username, email, full_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_admin', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Суперпользователь должен иметь is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Суперпользователь должен иметь is_superuser=True.'))

        return self.create_user(username, email, full_name, password, **extra_fields)

    def _validate_username(self, username):
        validator = RegexValidator(
            regex=r'^[a-zA-Z][a-zA-Z0-9]{3,19}$',
            message=_('Username должен начинаться с буквы, содержать только буквы и цифры, длина 4-20 символов.')
        )
        validator(username)

    def _validate_email(self, email):
        validator = RegexValidator(
            regex=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$',
            message=_('Введите корректный email.')
        )
        validator(email)

    def _validate_full_name(self, full_name):
        validator = RegexValidator(
            regex=r'^[a-zA-Zа-яА-ЯёЁ\s\-]+$',
            message=_('Полное имя может содержать только буквы, пробелы и дефисы.')
        )
        validator(full_name)

    def _validate_password(self, password):
        from .validators import PasswordValidator
        PasswordValidator()(password)


class User(AbstractBaseUser, PermissionsMixin):
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
        default=100 * 1024 * 1024,
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
            ("can_view_all_files", _("Может просматривать все файлы")),
            ("can_manage_users", _("Может управлять пользователями")),
        ]

    def __str__(self):
        return f'{self.username} ({self.full_name})'

    def save(self, *args, **kwargs):
        if not self.storage_directory:
            self.storage_directory = f'user_{self.username}'
        super().save(*args, **kwargs)

    @property
    def storage_used(self):
        return self.files.filter(is_deleted=False).aggregate(total=Sum('size'))['total'] or 0

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
    return os.path.join(instance.owner.storage_directory, filename)


class File(models.Model):
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

    is_deleted = models.BooleanField(
        _('is deleted'),
        default=False,
        help_text=_('Indicates if the file has been deleted')
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
        if not self.pk and not self.is_deleted:  
            file_size = self.size if self.size > 0 else (self.file.size if hasattr(self.file, 'size') else 0)
            if not self.owner.can_upload_file(file_size):
                raise ValidationError(
                    _('Файл превышает квоту хранилища. Доступно: %(available)s байт') % {
                        'available': self.owner.storage_left
                    }
                )    

    def _set_original_name(self):
        if self.file and not self.original_name:
            self.original_name = os.path.basename(self.file.name)

    def _determine_file_type(self):
        if self.file:
            determined_type = self._get_file_type()
            if self.file_type != determined_type:
                self.file_type = determined_type

    def _calculate_file_size(self):
        if self.file:
            try:
                if hasattr(self.file, 'path') and os.path.exists(self.file.path):
                    self.size = os.path.getsize(self.file.path)
                elif hasattr(self.file, 'size'):
                    self.size = self.file.size
                else:
                    self.size = 0
            except (FileNotFoundError, OSError):                
                self.size = 0
        else:
            self.size = 0

    def _generate_shared_link(self):
        if not self.shared_link:            
            self.shared_link = uuid.uuid4().hex[:16]            
            
            while File.objects.filter(shared_link=self.shared_link).exists():
                self.shared_link = uuid.uuid4().hex[:16]

    def delete(self, *args, **kwargs):
        self._delete_physical_file()
        super().delete(*args, **kwargs)
        logger.info(f"File completely deleted: {self.original_name} (ID: {self.id})")

    def soft_delete(self, *args, **kwargs):
        self.is_deleted = True        
        self.save(update_fields=['is_deleted'])
        logger.info(f"File marked as deleted: {self.original_name} (ID: {self.id})")

    def _delete_physical_file(self):
        if self.file and hasattr(self.file, 'path'):
            try:
                if os.path.isfile(self.file.path):
                    os.remove(self.file.path)
                    logger.info(f"Deleted physical file: {self.file.path}")
            except (FileNotFoundError, OSError) as e:
                logger.warning(f"File already deleted or not found: {self.file.path} - {str(e)}")
            except Exception as e:
                logger.error(f"Error deleting file {self.file.path}: {str(e)}")
                raise ValidationError(_("Ошибка при удалении файла"))
            
    def rename_physical_file(self, new_name):
        if self.file and hasattr(self.file, 'path'):
            try:
                old_path = self.file.path                
                
                if not os.path.exists(old_path):
                    return                
                
                directory = os.path.dirname(old_path)
                current_filename = os.path.basename(old_path)                
                
                current_name_without_ext, current_ext = os.path.splitext(current_filename)                
                
                new_name_without_ext, new_ext = os.path.splitext(new_name)
                
                if new_ext:                    
                    final_filename = new_name
                else:                    
                    final_filename = new_name + current_ext
                
                new_path = os.path.join(directory, final_filename)                
                
                if old_path == new_path:
                    return                
                
                os.rename(old_path, new_path)                
                
                self.file.name = os.path.relpath(new_path, settings.MEDIA_ROOT)
                
            except (FileNotFoundError, OSError) as e:
                logger.error(f"Error renaming file: {str(e)}")
                raise ValidationError(_("Ошибка при переименовании файла"))
            except Exception as e:
                logger.error(f"Unexpected error renaming file: {str(e)}")
                raise ValidationError(_("Неожиданная ошибка при переименовании файла"))

    def save(self, *args, **kwargs):
        if not self.is_deleted:
            self._set_original_name()
            self._determine_file_type()
            self._calculate_file_size()
            self._generate_shared_link()  
    
        if self.pk and not self.is_deleted:
            try:
                old_file = File.objects.get(pk=self.pk)
                if old_file.original_name != self.original_name:
                    self.rename_physical_file(self.original_name)
            except File.DoesNotExist:
                pass

        self.full_clean()
        super().save(*args, **kwargs)    

    def _get_file_type(self):
        if not self.file:
            return self.FileType.OTHER

        ext = os.path.splitext(self.file.name)[1].lower()
        file_type_map = {
            '.pdf': self.FileType.PDF,
            '.docx': self.FileType.WORD,
            '.jpg': self.FileType.IMAGE,
            '.jpeg': self.FileType.IMAGE,
            '.png': self.FileType.IMAGE,
            '.txt': self.FileType.TEXT,
        }
        return file_type_map.get(ext, self.FileType.OTHER)

    @property
    def human_readable_size(self):
        size = self._get_actual_file_size()
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"

    def _get_actual_file_size(self):
        if (self.size == 0 and not self.is_deleted and 
            hasattr(self.file, 'path') and os.path.exists(self.file.path)):
            try:
                self.size = os.path.getsize(self.file.path)                
                self.save(update_fields=['size'])
            except (FileNotFoundError, OSError):
                self.size = 0
            except Exception as e:
                logger.error(f"Error updating file size: {str(e)}")
        return self.size

    def can_be_accessed_by(self, user):
        if self.is_deleted:
            return False
        if self.is_public:
            return True
        return user.is_authenticated and (user.is_admin or self.owner == user)

    def get_public_url(self, request=None):
        if not self.shared_link:
            return None
        
        if request:
            return request.build_absolute_uri(f'/public/files/{self.shared_link}/')
        else:            
            return f'/public/files/{self.shared_link}/'