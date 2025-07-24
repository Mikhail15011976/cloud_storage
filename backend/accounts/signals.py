import os
import logging
from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.conf import settings
from django.contrib.auth.models import Group
from rest_framework.authtoken.models import Token
from .models import User

# Настройка логирования
logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def create_user_storage_and_token(sender, instance, created, **kwargs):
    """
    Обработчик сигнала post_save для модели User.
    Создает директорию для хранения файлов, добавляет пользователя в группу "Пользователи"
    и создает токен для нового пользователя.
    """
    if created:
        try:            
            user_storage_path = os.path.join(settings.MEDIA_ROOT, instance.storage_directory)
            os.makedirs(user_storage_path, exist_ok=True)
            logger.info(f"Storage directory created for user {instance.username} at {user_storage_path}")
        except Exception as e:
            logger.error(f"Failed to create storage directory for user {instance.username}: {str(e)}")

        try:            
            group, created = Group.objects.get_or_create(name='Пользователи')
            instance.groups.add(group)
            logger.info(f"User {instance.username} added to group 'Пользователи'")
        except Exception as e:
            logger.error(f"Failed to add user {instance.username} to group 'Пользователи': {str(e)}")

        try:            
            token, created = Token.objects.get_or_create(user=instance)
            logger.info(f"Token {'created' if created else 'already exists'} for user {instance.username}")
        except Exception as e:
            logger.error(f"Failed to create token for user {instance.username}: {str(e)}")

        try:            
            sync_user_permissions(instance)
            logger.info(f"Permissions synced for user {instance.username} during creation")
        except Exception as e:
            logger.error(f"Failed to sync permissions for user {instance.username} during creation: {str(e)}")

@receiver(m2m_changed, sender=User.groups.through)
def update_user_permissions_on_group_change(sender, instance, action, **kwargs):
    """
    Обработчик сигнала m2m_changed для связи User.groups.
    Обновляет права пользователя при изменении его групп (добавление, удаление).
    """
    if action in ['post_add', 'post_remove', 'post_clear']:
        try:
            sync_user_permissions(instance)
            logger.info(f"Permissions updated for user {instance.username} after group change (action: {action})")
        except Exception as e:
            logger.error(f"Failed to update permissions for user {instance.username} after group change: {str(e)}")

def sync_user_permissions(user):
    """
    Синхронизирует права пользователя с правами всех групп, в которых он состоит.
    """
    try:        
        groups = user.groups.all()        
        permissions = set()
        for group in groups:
            permissions.update(group.permissions.all())        
        
        user.user_permissions.set(permissions)
        user.save()
        logger.debug(f"Permissions synced for user {user.username}: {permissions}")
    except Exception as e:
        logger.error(f"Error syncing permissions for user {user.username}: {str(e)}")
        raise  
