from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Разрешение, предоставляющее доступ только администраторам.
    Используется для ограничения доступа к действиям, связанным с управлением
    всеми пользователями или системными настройками.
    """
    def has_permission(self, request, view):       
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Разрешение, предоставляющее доступ владельцу объекта или администратору.
    Используется для операций с файлами или другими ресурсами, где доступ
    должен быть ограничен владельцем или администратором системы.
    """
    def has_object_permission(self, request, view, obj):        
        return bool(request.user and request.user.is_authenticated and
                   (request.user.is_admin or obj.owner == request.user))


class IsUserOwnerOrAdmin(permissions.BasePermission):
    """
    Разрешение, предоставляющее доступ владельцу учетной записи или администратору.
    Используется для операций с пользовательскими данными, где доступ должен быть
    ограничен самим пользователем или администратором системы.
    """
    def has_object_permission(self, request, view, obj):        
        return bool(request.user and request.user.is_authenticated and
                   (request.user.is_admin or obj == request.user))


class IsFilePublicOrOwnerOrAdmin(permissions.BasePermission):
    """
    Разрешение, предоставляющее доступ к файлам, если они публичные,
    либо если пользователь является владельцем файла или администратором.
    Используется для операций скачивания или просмотра файлов.
    """
    def has_object_permission(self, request, view, obj):        
        if obj.is_public:
            return True        
        return bool(request.user and request.user.is_authenticated and
                   (request.user.is_admin or obj.owner == request.user))
