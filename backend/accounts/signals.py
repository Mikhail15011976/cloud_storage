from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
import os
from .models import User

@receiver(post_save, sender=User)
def create_user_storage(sender, instance, created, **kwargs):
    if created:
        # Создаем физическую директорию для файлов пользователя
        user_storage_path = os.path.join(settings.MEDIA_ROOT, instance.storage_directory)
        os.makedirs(user_storage_path, exist_ok=True)