import os
from django.test import TestCase
from django.core.files.base import ContentFile
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import File
from accounts.serializers import FileSerializer

User = get_user_model()


class FileModelTests(TestCase):
    def setUp(self):
        """Инициализация тестовых данных для проверки модели File."""
        # Создаем тестового пользователя с квотой хранилища 10 KB
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            full_name='Test User',
            password='TestPass123!'
        )
        self.user.storage_quota = 10000  # 10 KB
        self.user.save()

        # Базовые данные для создания файла
        self.file_data = {
            'owner': self.user,
            'original_name': 'testfile.txt',
            'file': ContentFile(b'Test content', name='testfile.txt'),
            'size': 12,  # Размер содержимого в байтах
            'is_public': False
        }

    def test_create_file_success(self):
        """Проверка успешного создания файла с корректными данными."""
        file_instance = File.objects.create(**self.file_data)
        self.assertEqual(file_instance.original_name, 'testfile.txt')
        self.assertEqual(file_instance.owner, self.user)
        self.assertGreater(file_instance.size, 0)
        self.assertFalse(file_instance.is_public)
        self.assertEqual(file_instance.file_type, 'TEXT')

    def test_file_without_content(self):
        """Проверка ошибки при создании файла без содержимого."""
        invalid_data = self.file_data.copy()
        invalid_data['file'] = None
        with self.assertRaises(ValidationError):
            file_instance = File(**invalid_data)
            file_instance.full_clean()  # Должна сработать валидация

    def test_file_owner_relationship(self):
        """Проверка связи файла с владельцем через related_name."""
        file_instance = File.objects.create(**self.file_data)
        self.assertIn(file_instance, self.user.files.all())

    def test_file_upload_date(self):
        """Проверка автоматической установки даты загрузки файла."""
        file_instance = File.objects.create(**self.file_data)
        self.assertIsNotNone(file_instance.upload_date)

    def test_file_str_method(self):
        """Проверка строкового представления объекта File."""
        file_instance = File.objects.create(**self.file_data)
        expected_str = f"testfile.txt (Владелец: {self.user.username})"
        self.assertEqual(str(file_instance), expected_str)

    def test_file_type_detection(self):
        """Проверка корректного определения типа файла по расширению."""
        pdf_data = self.file_data.copy()
        pdf_data['file'] = ContentFile(b'PDF content', name='document.pdf')
        pdf_file = File.objects.create(**pdf_data)
        self.assertEqual(pdf_file.file_type, 'PDF')

    def test_storage_used_and_left(self):
        """Проверка расчета использованного и оставшегося пространства хранилища."""
        content = b'Test content'  # 12 байт
        file_data = self.file_data.copy()
        file_data['size'] = len(content)
        File.objects.create(**file_data)
        self.assertEqual(self.user.storage_used, len(content))
        self.assertEqual(self.user.storage_left, self.user.storage_quota - len(content))


class FileAPITests(TestCase):
    def setUp(self):
        """Инициализация тестовых данных для проверки API-эндпоинтов."""
        self.client = APIClient()
        # Создаем обычного пользователя с квотой 10 KB
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            full_name='Test User',
            password='TestPass123!'
        )
        self.user.storage_quota = 10000  # 10 KB
        self.user.save()

        # Создаем администратора
        self.admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@example.com',
            full_name='Admin User',
            password='AdminPass123!',
            is_admin=True
        )

        # Создаем тестовый файл для пользователя
        self.file_data = {
            'owner': self.user,
            'original_name': 'testfile.txt',
            'file': ContentFile(b'Test content', name='testfile.txt'),
            'is_public': False
        }
        self.file = File.objects.create(**self.file_data)

    def test_access_user_list_unauthenticated(self):
        """Проверка запрета доступа к списку пользователей без аутентификации."""
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_access_user_list_as_regular_user(self):
        """Проверка запрета доступа к списку пользователей для обычного пользователя."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_access_user_list_as_admin(self):
        """Проверка доступа к списку пользователей для администратора."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_upload_file_authenticated(self):
        """Проверка успешной загрузки файла аутентифицированным пользователем."""
        self.client.force_authenticate(user=self.user)
        upload_data = {
            'file': ContentFile(b'New content', name='newfile.txt'),
            'original_name': 'newfile.txt'
        }
        response = self.client.post('/api/files/', upload_data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['original_name'], 'newfile.txt')

    def test_upload_file_unauthenticated(self):
        """Проверка запрета загрузки файла без аутентификации."""
        upload_data = {
            'file': ContentFile(b'New content', name='newfile.txt'),
            'original_name': 'newfile.txt'
        }
        response = self.client.post('/api/files/', upload_data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_upload_file_exceeding_quota(self):
        """Проверка ошибки при загрузке файла, превышающего квоту хранилища."""
        self.user.storage_quota = 10  # Очень маленькая квота
        self.user.save()
        self.client.force_authenticate(user=self.user)
        large_file_data = {
            'file': ContentFile(b'Large content' * 100, name='largefile.txt'),
            'original_name': 'largefile.txt'
        }
        response = self.client.post('/api/files/', large_file_data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Файл превышает квоту хранилища', str(response.data))

    def test_get_file_list_authenticated(self):
        """Проверка получения списка файлов для аутентифицированного пользователя."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/files/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_get_file_detail_authenticated(self):
        """Проверка получения деталей файла для аутентифицированного пользователя."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/files/{self.file.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['original_name'], 'testfile.txt')

    def test_delete_file_authenticated(self):
        """Проверка успешного удаления файла аутентифицированным пользователем."""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/files/{self.file.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(File.objects.filter(pk=self.file.pk).exists())

    def test_share_file_authenticated(self):
        """Проверка создания публичной ссылки на файл для аутентифицированного пользователя."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/files/{self.file.id}/share/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data.get('shared_link'))
        updated_file = File.objects.get(pk=self.file.pk)
        self.assertTrue(updated_file.is_public)
        self.assertIsNotNone(updated_file.shared_link)

    def test_download_file_authenticated(self):
        """Проверка скачивания файла аутентифицированным пользователем."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/files/{self.file.id}/download/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers['Content-Type'], 'text/plain')
        self.assertIn('attachment; filename="testfile.txt"', response.headers['Content-Disposition'])

    def tearDown(self):
        """Очистка тестовых данных после выполнения тестов."""
        File.objects.all().delete()
        User.objects.all().delete()
