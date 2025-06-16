from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """Разрешение только для администраторов"""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_admin


class IsOwnerOrAdmin(permissions.BasePermission):
    """Разрешение для владельца или администратора"""
    
    def has_object_permission(self, request, view, obj):
        return request.user.is_admin or obj.owner == request.user


class IsUserOwnerOrAdmin(permissions.BasePermission):
    """Разрешение для владельца учетной записи или администратора"""
    
    def has_object_permission(self, request, view, obj):
        return request.user.is_admin or obj == request.user


class IsFilePublicOrOwnerOrAdmin(permissions.BasePermission):
    """Разрешение для публичных файлов, владельца или администратора"""
    
    def has_object_permission(self, request, view, obj):
        if obj.is_public:
            return True
        return request.user.is_admin or obj.owner == request.user