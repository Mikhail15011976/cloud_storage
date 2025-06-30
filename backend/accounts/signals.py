from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.conf import settings
import os
from django.contrib.auth.models import Group
from .models import User

@receiver(post_save, sender=User)
def create_user_storage(sender, instance, created, **kwargs):
    if created:
        # Создание физической директории для файлов пользователя
        user_storage_path = os.path.join(settings.MEDIA_ROOT, instance.storage_directory)
        os.makedirs(user_storage_path, exist_ok=True)

        # Добавление пользователя в группу "Пользователи"
        group, created = Group.objects.get_or_create(name='Пользователи')
        instance.groups.add(group)

        # Синхронизация прав пользователя с правами группы
        sync_user_permissions(instance)

@receiver(m2m_changed, sender=User.groups.through)
def update_user_permissions_on_group_change(sender, instance, action, **kwargs):
    """
    Обновление прав пользователя при изменении его групп.
    Срабатывает при добавлении или удалении пользователя из группы.
    """
    if action in ['post_add', 'post_remove', 'post_clear']:
        sync_user_permissions(instance)

def sync_user_permissions(user):
    """
    Синхронизирует права пользователя с правами всех групп, в которых он состоит.
    """
    # Получаем все группы пользователя
    groups = user.groups.all()
    # Собираем все права из групп
    permissions = set()
    for group in groups:
        permissions.update(group.permissions.all())
    
    # Назначаем права пользователю
    user.user_permissions.set(permissions)
    user.save()
