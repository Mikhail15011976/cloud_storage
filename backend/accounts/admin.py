from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from django.utils.html import format_html
from .models import User

class CustomUserAdmin(UserAdmin):
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('full_name', 'email', 'storage_directory')}),
        ('Groups', {'fields': ('groups',)}),
        ('Permissions', {
            'fields': ('is_admin', 'is_staff', 'is_superuser', 'user_permissions'),
            'description': 'Set user permissions'
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'full_name', 'password1', 'password2', 'groups', 'is_admin', 'is_staff', 'is_superuser'),
        }),
    )
    
    list_display = ('username', 'email', 'full_name', 'get_group_names', 'date_joined', 'get_permission_status_display')
    list_filter = ('is_admin', 'is_staff', 'is_superuser', 'groups', 'date_joined')
    search_fields = ('username', 'email', 'full_name')
    ordering = ('-date_joined',)
    filter_horizontal = ('groups', 'user_permissions')
    
    def get_group_names(self, obj):
        return obj.get_group_names()
    get_group_names.short_description = 'Groups'
    
    def get_permission_status_display(self, obj):
        if obj.is_superuser:
            return "Superuser"
        elif obj.is_admin:
            return "Admin"
        elif obj.is_staff:
            return "Staff"
        return "Regular user"
    get_permission_status_display.short_description = 'Permissions'
    get_permission_status_display.admin_order_field = 'is_superuser'

admin.site.register(User, CustomUserAdmin)

# Unregister default Group admin and register custom one
admin.site.unregister(Group)

@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_user_count', 'user_actions')
    filter_horizontal = ('permissions',)
    
    def get_user_count(self, obj):
        return obj.custom_user_set.count()
    get_user_count.short_description = 'Users'
    
    def user_actions(self, obj):
        return format_html(
            '<a class="button" href="{}">Add users</a>&nbsp;'
            '<a class="button" href="{}">View users</a>',
            f'/admin/accounts/user/?groups__id__exact={obj.id}',
            f'/admin/auth/group/{obj.id}/users/'
        )
    user_actions.short_description = 'Actions'
    user_actions.allow_tags = True
    
    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('<path:object_id>/users/', self.admin_site.admin_view(self.group_users_view), 
            name='group-users'),
        ]
        return custom_urls + urls
    
    def group_users_view(self, request, object_id):
        from django.shortcuts import render
        group = Group.objects.get(id=object_id)
        users = group.custom_user_set.all()
        context = {
            'group': group,
            'users': users,
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request),
            'has_change_permission': self.has_change_permission(request, group),
        }
        return render(request, 'admin/auth/group_users.html', context)