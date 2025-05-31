from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin, Group
from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator


class UserManager(BaseUserManager):
    def create_user(self, username, email, full_name, password=None, **extra_fields):
        if not email:
            raise ValueError('User must have an email address')
        if not username:
            raise ValueError('User must have a username')
        if not full_name:
            raise ValueError('User must have a full name')

        user = self.model(
            email=self.normalize_email(email),
            username=username,
            full_name=full_name,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, full_name, password=None, **extra_fields):
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        return self.create_user(username, email, full_name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    # Валидаторы
    username_validator = RegexValidator(
        regex='^[a-zA-Z][a-zA-Z0-9]{3,19}$',
        message='Username must start with a letter and contain 4-20 alphanumeric characters'
    )
    
    # Основные поля
    username = models.CharField(
        max_length=20,
        unique=True,
        validators=[username_validator],
        error_messages={
            'unique': "A user with that username already exists.",
        }
    )
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=100)
    groups = models.ManyToManyField(
        Group,
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name="custom_user_set",
        related_query_name="user",
    )
    
    # Поля для администрирования
    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now, verbose_name='Registration Date')
    
    # Связь с файловым хранилищем
    storage_directory = models.CharField(max_length=255, unique=True, null=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'full_name']
    
    def __str__(self):
        return f"{self.username} ({self.full_name})"
    
    def save(self, *args, **kwargs):
        if not self.storage_directory:
            self.storage_directory = f"user_{self.username}"
        super().save(*args, **kwargs)
    
    def get_group_names(self):
        return ", ".join([group.name for group in self.groups.all()])
    
    def get_permission_status(self):
        if self.is_superuser:
            return "Superuser"
        elif self.is_admin:
            return "Admin"
        elif self.is_staff:
            return "Staff"
        return "Regular user"
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['date_joined']