from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from django.utils.html import format_html
from django.core.exceptions import ValidationError
from .models import User
from .validators import PasswordValidator

class CustomUserCreationForm(forms.ModelForm):
    password1 = forms.CharField(
        label="Password",
        strip=False,
        widget=forms.PasswordInput(attrs={'autocomplete': 'new-password'}),
        help_text=PasswordValidator().get_help_text(),
    )
    password2 = forms.CharField(
        label="Password confirmation",
        widget=forms.PasswordInput(attrs={'autocomplete': 'new-password'}),
        strip=False,
        help_text="Enter the same password as before, for verification.",
    )

    class Meta:
        model = User
        fields = ('username', 'email', 'full_name')

    def clean_password1(self):
        password1 = self.cleaned_data.get('password1')
        if password1:
            validator = PasswordValidator()
            validator.validate(password1)
        return password1

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise ValidationError("Passwords don't match")
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user

class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = forms.ModelForm
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
        return ", ".join([group.name for group in obj.groups.all()])
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

admin.site.unregister(Group)

@admin.register(Group)
class CustomGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_user_count', 'user_actions')
    filter_horizontal = ('permissions',)
    
    def get_user_count(self, obj):
        return obj.user_set.count()
    get_user_count.short_description = 'Users'
    
    def user_actions(self, obj):
        return format_html(
            '<a class="button" href="{}">Add users</a>&nbsp;'
            '<a class="button" href="{}">View users</a>',
            f'/admin/accounts/user/?groups__id__exact={obj.id}',
            f'/admin/accounts/group/{obj.id}/users/'
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
        users = group.user_set.all()
        context = {
            'group': group,
            'users': users,
            'opts': self.model._meta,
            'has_view_permission': self.has_view_permission(request),
            'has_change_permission': self.has_change_permission(request, group),
        }
        return render(request, 'admin/auth/group_users.html', context)

admin.site.register(User, CustomUserAdmin)