from rest_framework import permissions


class IsOwnerOrAdmin(permissions.BasePermission):
    """Разрешение только для владельца или администратора"""
    
    def has_object_permission(self, request, view, obj):
        return request.user.is_admin or obj.owner == request.user


class IsFileOwner(permissions.BasePermission):
    """Разрешение только для владельца файла"""
    
    def has_permission(self, request, view):
        if view.action == 'create':
            return True
        return super().has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        return request.user.is_admin or obj.owner == request.user