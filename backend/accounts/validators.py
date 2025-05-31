from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class PasswordValidator:
    def __init__(self):
        self.min_length = 8
        self.special_chars = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?"

    def __call__(self, password, user=None):
        self.validate(password, user)

    def validate(self, password, user=None):
        errors = []
        
        if len(password) < self.min_length:
            errors.append(ValidationError(
                _("Пароль должен содержать минимум %(min_length)d символов."),
                code='password_too_short',
                params={'min_length': self.min_length},
            ))
        
        if not any(char.isdigit() for char in password):
            errors.append(ValidationError(
                _("Пароль должен содержать хотя бы одну цифру."),
                code='password_no_digit',
            ))
        
        if not any(char.isupper() for char in password):
            errors.append(ValidationError(
                _("Пароль должен содержать хотя бы одну заглавную букву."),
                code='password_no_upper',
            ))
            
        if not any(char.islower() for char in password):
            errors.append(ValidationError(
                _("Пароль должен содержать хотя бы одну строчную букву."),
                code='password_no_lower',
            ))
        
        if not any(char in self.special_chars for char in password):
            errors.append(ValidationError(
                _("Пароль должен содержать хотя бы один специальный символ: %(special_chars)s"),
                code='password_no_special',
                params={'special_chars': self.special_chars},
            ))
            
        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return _(
            "Ваш пароль должен содержать:\n"
            "- минимум %(min_length)d символов\n"
            "- хотя бы одну цифру\n"
            "- хотя бы одну заглавную букву\n"
            "- хотя бы одну строчную букву\n"
            "- хотя бы один специальный символ: %(special_chars)s\n"
        ) % {'min_length': self.min_length, 'special_chars': self.special_chars}