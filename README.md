# Инструкция по развертыванию проекта Cloud Storage на VPS
## Системные требования
- Python 3.13.3
- Django 5.2.1
- PostgreSql 17.5
- Node 22.14.0
- React 19.1.0
- Nginx 1.28.0
- Gunicorn 23.0.0
- ОС: Ubuntu 20.04 LTS или выше (рекомендуется)

## Развертывание на VPS
### 1. Подготовка сервера
    # Обновление системы
    sudo apt update && sudo apt upgrade -y

    # Установка необходимых пакетов
    sudo apt install python3 python3-pip python3-venv nginx gunicorn postgresql postgresql-contrib git -y

### 2. Клонирование репозитория

    # Клонирование репозитория с GitHub
    git clone https://github.com/Mikhail15011976/cloud_storage
    cd cloud_storage\

### 3. Настройка базы данных

    # Вход в PostgreSQL от имени пользователя postgres
    sudo -u postgres psql

    # Создание базы данных и пользователя согласно проекту
    CREATE DATABASE cloud_storage;
    CREATE USER mikhail WITH PASSWORD '0404';
    ALTER ROLE mikhail SET client_encoding TO 'utf8';
    ALTER ROLE mikhail SET default_transaction_isolation TO 'read committed';
    ALTER ROLE mikhail SET timezone TO 'UTC';
    GRANT ALL PRIVILEGES ON DATABASE cloud_storage TO mikhail;
    \q

### 4. Настройка бекенда
    # Переход в директорию backend
    cd backend

    # Создание и активация виртуального окружения
    python3 -m venv env
    source env/bin/activate

    # Установка зависимостей
    pip install -r requirements.txt

    # Настройка переменных окружения
    # Создайте файл .env или настройте переменные окружения в системе
    nano .env
    # Укажите свои значения для DJANGO_SECRET_KEY, DB_NAME, DB_USER, DB_PASSWORD и т.д.
    # Пример содержимого файла .env:
    # DJANGO_SECRET_KEY=your-secret-key-here
    # DJANGO_DEBUG=False
    # DB_ENGINE=django.db.backends.postgresql
    # DB_NAME=cloud_storage
    # DB_USER=mikhail
    # DB_PASSWORD=0404
    # DB_HOST=localhost
    # DB_PORT=5432

    # Применение миграций
    python manage.py migrate

    # Создание суперпользователя (администратора)
    python manage.py createsuperuser

    # Сбор статических файлов
    python manage.py collectstatic --noinput    

### 5. Настройка фронтенда
    cd ../frontend

    # Установка зависимостей
    npm install

    # Сборка проекта для продакшена
    npm run build

### 6. Настройка gunicorn
#### Создайте systemd-сервис для запуска Gunicorn:
    sudo nano /etc/systemd/system/gunicorn.service
#### Вставьте следующее содержимое, заменив пути и пользователя на свои:
    [Unit]
    Description=Gunicorn instance to serve Cloud Storage
    After=network.target

    [Service]
    User=your_username
    Group=www-data
    WorkingDirectory=/path/to/CloudStorage/backend
    Environment="PATH=/path/to/CloudStorage/backend/env/bin"
    ExecStart=/path/to/CloudStorage/backend/env/bin/gunicorn --workers 3 --bind unix:/path/to/CloudStorage/backend/cloud_storage.sock core.wsgi:application

    [Install]
    WantedBy=multi-user.target

#### Запустите и включите сервис Gunicorn:
    sudo systemctl start gunicorn
    sudo systemctl enable gunicorn
    sudo systemctl status gunicorn

### 7. Настройка Nginx
#### Настройте Nginx как обратный прокси для Gunicorn и для обслуживания статических файлов фронтенда:
    sudo nano /etc/nginx/sites-available/cloud_storage

#### Вставьте следующую конфигурацию, заменив пути и IP-адрес/домен на свои:
    server {
        listen 80;
        server_name your_domain_or_ip;
    
    # Обслуживание фронтенда
        location / {
            root /path/to/CloudStorage/frontend/build;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # Обратный прокси к Gunicorn для API
        location /api/ {
            proxy_pass http://unix:/path/to/CloudStorage/backend/cloud_storage.sock;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection keep-alive;
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Обслуживание статических файлов Django
        location /static/ {
            alias /path/to/CloudStorage/backend/staticfiles/;
        }

        # Обслуживание медиа-файлов
        location /media/ {
            alias /path/to/CloudStorage/backend/media/;
            expires 7d;
        }
    }

#### Активируйте конфигурацию и перезапустите Nginx:
    sudo ln -s /etc/nginx/sites-available/cloud_storage /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx

### 8. Настройка брандмауэра
#### Разрешите доступ к портам 80 (HTTP) и, при необходимости, 443 (HTTPS):
    sudo ufw allow 'Nginx Full'
    sudo ufw status

### 9. Дополнительные настройки безопасности (опционально)
#### Настройте SSL/TLS с помощью Let's Encrypt для HTTPS:
    sudo apt install certbot python3-certbot-nginx -y
    sudo certbot --nginx -d your_domain

#### Настройте автоматическое обновление сертификатов:
    sudo systemctl status certbot.timer

### 10. Проверка работы приложения
#### Откройте браузер и перейдите по вашему домену или IP-адресу.
#### Убедитесь, что фронтенд загружается, и вы можете войти в систему через созданного суперпользователя.
#### Проверьте доступ к админ-панели по адресу http://your_domain/admin/.

### 11. Устранение неполадок
#### Если что-то не работает, проверьте логи:
    # Логи Gunicorn
    sudo journalctl -u gunicorn -f

    # Логи Nginx
    sudo tail -f /var/log/nginx/error.log
    sudo tail -f /var/log/nginx/access.log

    # Логи Django
    tail -f /path/to/CloudStorage/backend/logs/django.log

#### Убедитесь, что все пути в конфигурационных файлах указаны правильно.
#### Проверьте права доступа к файлам и директориям:
    sudo chown -R your_username:www-data /path/to/CloudStorage
    sudo chmod -R 755 /path/to/CloudStorage
    sudo chmod 660 /path/to/CloudStorage/backend/cloud_storage.sock

### 12. Обновление приложения
#### Для обновления приложения после внесения изменений в код:
    cd /path/to/CloudStorage
    git pull origin main

    # Бэкенд
    cd backend
    source env/bin/activate
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py collectstatic --noinput
    sudo systemctl restart gunicorn

    # Фронтенд
    cd ../frontend
    npm install
    npm run build
    sudo systemctl restart nginx   

### 13. Резервное копирование и восстановление
#### Создание резервных копий базы данных
    # Создание дампа базы данных PostgreSQL
    sudo -u postgres pg_dump -Fc cloud_storage > /path/to/backups/cloud_storage_$(date +%Y-%m-%d).dump

    # Для автоматического ежедневного резервного копирования добавьте в cron:
    crontab -e

    # Добавьте строку (выполняется каждый день в 2:00 ночи)
    0 2 * * * sudo -u postgres pg_dump -Fc cloud_storage > /path/to/backups/cloud_storage_$(date +\%Y-\%m-\%d).dump

#### Резервное копирование файлов проекта
    # Создание архива с проектом
    tar -czvf /path/to/backups/cloud_storage_backup_$(date +%Y-%m-%d).tar.gz \
        /path/to/CloudStorage/backend \
        /path/to/CloudStorage/frontend \
        /path/to/CloudStorage/README.md

    # Автоматическое резервное копирование в cron (ежедневно в 3:00)
    0 3 * * * tar -czvf /path/to/backups/cloud_storage_backup_$(date +\%Y-\%m-\%d).tar.gz /path/to/CloudStorage

#### Восстановление из резервной копии
    # Восстановление базы данных
    sudo -u postgres pg_restore -d cloud_storage /path/to/backups/cloud_storage_2025-08-01.dump

    # Восстановление файлов проекта
    tar -xzvf /path/to/backups/cloud_storage_backup_2025-08-01.tar.gz -C /
    