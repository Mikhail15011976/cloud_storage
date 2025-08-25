from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

class PasswordValidator:
    """Валидатор паролей с комплексной проверкой"""
    
    def __init__(self):
        self.min_length = 8
        self.special_chars = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~"
        self.common_passwords = [
            'password', '123456', 'qwerty', 'admin', 'letmein',
            'welcome', 'monkey', 'sunshine', 'password1'
        ]

    def __call__(self, password, user=None):
        self.validate(password, user)

    def validate(self, password, user=None):
        errors = []
        
        # Проверка минимальной длины
        if len(password) < self.min_length:
            errors.append(ValidationError(
                _("Password must contain at least %(min_length)d characters."),
                code='password_too_short',
                params={'min_length': self.min_length},
            ))
        
        # Проверка наличия цифр
        if not any(char.isdigit() for char in password):
            errors.append(ValidationError(
                _("Password must contain at least one digit."),
                code='password_no_digit',
            ))
        
        # Проверка заглавных букв
        if not any(char.isupper() for char in password):
            errors.append(ValidationError(
                _("Password must contain at least one uppercase letter."),
                code='password_no_upper',
            ))
            
        # Проверка строчных букв
        if not any(char.islower() for char in password):
            errors.append(ValidationError(
                _("Password must contain at least one lowercase letter."),
                code='password_no_lower',
            ))
        
        # Проверка специальных символов
        if not any(char in self.special_chars for char in password):
            errors.append(ValidationError(
                _("Password must contain at least one special character: %(special_chars)s"),
                code='password_no_special',
                params={'special_chars': self.special_chars},
            ))
            
        # Проверка на распространенные пароли
        if password.lower() in self.common_passwords:
            errors.append(ValidationError(
                _("This password is too common."),
                code='password_too_common',
            ))
            
        # Проверка на схожесть с именем пользователя или email
        if user:
            if password.lower() == user.username.lower():
                errors.append(ValidationError(
                    _("Your password cannot be the same as your username."),
                    code='password_same_as_username',
                ))
                
            if user.email and password.lower() == user.email.split('@')[0].lower():
                errors.append(ValidationError(
                    _("Your password cannot be the same as part of your email."),
                    code='password_same_as_email',
                ))
        
        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return _(
            "Your password must:\n"
            "- Be at least %(min_length)d characters long\n"
            "- Contain at least one digit\n"
            "- Contain at least one uppercase letter\n"
            "- Contain at least one lowercase letter\n"
            "- Contain at least one special character: %(special_chars)s\n"
            "- Not be a common password\n"
            "- Not be similar to your username or email"
        ) % {'min_length': self.min_length, 'special_chars': self.special_chars}


class UsernameValidator:
    """Валидатор для имени пользователя"""
    
    def __init__(self):
        self.regex = r'^[a-zA-Z][a-zA-Z0-9]{3,19}$'
        self.message = _(
            'Username must meet the following requirements:\n'
            '- Start with a letter\n'
            '- Contain only letters (a-z, A-Z) and digits (0-9)\n'
            '- Be 4 to 20 characters long'
        )

    def __call__(self, value):
        import re
        if not re.match(self.regex, value):
            raise ValidationError(self.message)


class EmailValidator:
    """Валидатор для email адресов"""
    
    def __init__(self):
        self.regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        self.message = _('Enter a valid email address.')

    def __call__(self, value):
        import re
        if not re.match(self.regex, value):
            raise ValidationError(self.message)


class FullNameValidator:
    """Валидатор для полного имени пользователя"""
    
    def __init__(self):
        self.regex = r'^[a-zA-Zа-яА-ЯёЁ\s\-]+$'
        self.message = _(
            'Full name can only contain:\n'
            '- Letters (a-z, A-Z, а-я, А-Я)\n'
            '- Spaces\n'
            '- Hyphens (-)'
        )

    def __call__(self, value):
        import re
        if not re.match(self.regex, value):
            raise ValidationError(self.message)


class FileNameValidator:
    """Валидатор для имен файлов"""
    
    def __init__(self):
        self.regex = r'^[\w\s\-\.\(\)\[\]!@#$%^&+=;,\']+$'
        self.message = _(
            'Filename contains invalid characters. '
            'Allowed characters: letters, digits, spaces, and the following symbols: -_.()[]!@#$%^&+=;,\''
        )

    def __call__(self, value):
        import re
        if not re.match(self.regex, value):
            raise ValidationError(self.message)


class StorageQuotaValidator:
    """Валидатор для проверки квоты хранилища"""
    
    def __call__(self, user, file_size):
        if user.storage_used + file_size > user.storage_quota:
            raise ValidationError(
                _('File exceeds storage quota. Available: %(available)s bytes') % {
                    'available': user.storage_left
                }
            )
