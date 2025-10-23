# Инструкция по развертыванию проекта Cloud Storage на VPS
## Системные требования

- Python 3.8+
- Django 5.2.1
- PostgreSql 12+
- Node 18+ (22.14.0)
- React 18+ (19.1.0)
- Yarn 1.22+
- Nginx 1.18+
- Gunicorn 20.0+
- ОС: Ubuntu 20.04 LTS или выше

## Развертывание на VPS
### 1. Подготовка сервера

    # Обновление системы
    sudo apt update && sudo apt upgrade -y

    # Установка необходимых пакетов
    sudo apt install python3 python3-pip python3-venv nginx gunicorn postgresql postgresql-contrib git -y

### 2. Клонирование репозитория 
    
    # Клонирование репозитория с GitHub
    git clone https://github.com/Mikhail15011976/cloud_storage
    cd cloud_storage/
    # Структура проекта:
    # backend/ - Django приложение
    # frontend/ - React приложение

### 3. Настройка базы данных

    # Вход в PostgreSQL от имени пользователя postgres    
    sudo -u postgres psql

    # Создание базы данных и пользователя согласно .env файлу
    CREATE DATABASE cloud_storage;
    CREATE USER mikhail WITH PASSWORD '0404' CREATEDB;
    -- Даем все привилегии на базу данных
    GRANT ALL PRIVILEGES ON DATABASE cloud_storage TO mikhail;
    -- Подключаемся к базе данных и настраиваем права схемы
    \c cloud_storage
    -- Даем права на схему public
    GRANT ALL ON SCHEMA public TO mikhail;
    GRANT CREATE ON SCHEMA public TO mikhail;
    -- Даем права на все таблицы в схеме public
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mikhail;
    -- Даем права на все последовательности
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mikhail;
    -- Устанавливаем права по умолчанию для будущих таблиц
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mikhail;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mikhail;
    -- Устанавливаем путь поиска
    ALTER USER mikhail SET search_path TO public;
    -- Выход из PostgreSQL
    \q

### 4. Настройка бекенда

    # Переход в директорию backend
    cd ~/cloud_storage/backend

    # Копирование примера конфигурации
    cp .env.example .env    

    # Настройка переменных окружения
    # Создайте файл `.env` в корне backend с содержимым:    
    nano .env
    # Укажите свои значения:
    # Основные настройки Django
    DJANGO_SECRET_KEY=your-secret-key-here
    DJANGO_DEBUG=True
    DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,your-server-ip,your-domain.com
    DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://your-domain.com

    # Настройки базы данных PostgreSQL
    DB_ENGINE=django.db.backends.postgresql
    DB_NAME=cloud_storage
    DB_USER=mikhail
    DB_PASSWORD=0404
    DB_HOST=localhost
    DB_PORT=5432

    # Настройки REST Framework
    REST_FRAMEWORK_DEFAULT_THROTTLE_RATES_ANON=100/day
    REST_FRAMEWORK_DEFAULT_THROTTLE_RATES_USER=1000/day
    REST_FRAMEWORK_PAGE_SIZE=20

    # Настройки CORS
    CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://your-domain.com
    CORS_ALLOW_CREDENTIALS=True

    # Настройки файлового хранилища
    MEDIA_ROOT=media
    MAX_UPLOAD_SIZE=52428800
    FILE_UPLOAD_PERMISSIONS=644

    # Настройки JWT (опционально)
    JWT_ACCESS_TOKEN_LIFETIME_HOURS=1
    JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
    JWT_ROTATE_REFRESH_TOKENS=True
    JWT_BLACKLIST_AFTER_ROTATION=True

    # Настройки паролей
    PASSWORD_MIN_LENGTH=8

    # Настройки логирования
    LOG_MAX_BYTES=5242880
    LOG_BACKUP_COUNT=5
    ROOT_LOG_LEVEL=INFO
    DJANGO_LOG_LEVEL=INFO
    ACCOUNTS_LOG_LEVEL=ERROR

    # Безопасность для продакшн
    SECURE_HSTS_SECONDS=31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS=True
    SECURE_SSL_REDIRECT=False
    SESSION_COOKIE_SECURE=True
    CSRF_COOKIE_SECURE=True
    SECURE_BROWSER_XSS_FILTER=True
    SECURE_CONTENT_TYPE_NOSNIFF=True
    X_FRAME_OPTIONS=DENY     

    # Создание и активация виртуального окружения

    python3 -m venv venv
    source venv/bin/activate

    # Установка зависимостей
    pip install --upgrade pip
    pip install -r requirements.txt

    # Создание необходимых директорий
    mkdir -p logs media static

    # Создание миграций
    python manage.py makemigrations accounts
    python manage.py makemigrations authtoken
    python manage.py makemigrations

    # Применение миграций
    python manage.py migrate

    # Создание суперпользователя
    python manage.py createsuperuser

    # Сбор статических файлов
    python manage.py collectstatic --noinput 

    # Установите Gunicorn в виртуальном окружении
    pip install gunicorn  

    # Проверьте установку
    which gunicorn
    gunicorn --version
    deactivate

### 5. Настройка фронтенда

    cd ../frontend

    # Установка yarn
    
    npm install --global yarn

    # Создание .env файла для фронтенда
    echo "REACT_APP_API_URL=http://your-domain.com/api" > .env
    
    # Установка зависимостей через Yarn
    yarn install --frozen-lockfile

    # Сборка проекта для продакшена
    yarn build

### 6. Настройка gunicorn
#### Создайте systemd-сервис для запуска Gunicorn:
    sudo nano /etc/systemd/system/gunicorn.service
#### Вставьте следующее содержимое, заменив пути и пользователя на свои:
    [Unit]
    Description=Gunicorn instance to serve Cloud Storage
    After=network.target

    [Service]
    User=mikhail
    Group=www-data
    WorkingDirectory=/home/mikhail/cloud_storage/backend
    Environment="PATH=/home/mikhail/cloud_storage/backend/venv/bin"
    ExecStart=/home/mikhail/cloud_storage/backend/venv/bin/gunicorn --workers 3 --bind unix:/home/mikhail/cloud_storage/backend/cloud_storage.sock core.wsgi:application

    [Install]
    WantedBy=multi-user.target

#### Запустите и включите сервис Gunicorn:
    sudo systemctl daemon-reload
    sudo systemctl start gunicorn
    sudo systemctl enable gunicorn
    sudo systemctl status gunicorn

#### Настройка прав доступа для статических файлов и сокета
    # Настройка прав доступа для всего проекта
    sudo chown -R mikhail:www-data /home/mikhail/cloud_storage
    sudo chmod -R 755 /home/mikhail/cloud_storage
    sudo chmod 750 /home/mikhail/cloud_storage/backend

    # Настройка прав на sock-файл (ВАЖНО!)
    sudo chmod 660 /home/mikhail/cloud_storage/backend/cloud_storage.sock
    sudo chown mikhail:www-data /home/mikhail/cloud_storage/backend/cloud_storage.sock

    # Добавление www-data в группу mikhail для доступа к файлам
    sudo usermod -a -G mikhail www-data

    # Перезагрузка служб для применения изменений
    sudo systemctl restart gunicorn
    sudo systemctl restart nginx

#### Проверка работоспособности:

    # Проверка статических файлов Django
    curl -I http://your_domain/static/rest_framework/css/bootstrap.min.css

    # Проверка API
    curl -I http://your_domain/api/

    # Проверка фронтенда
    curl -I http://your_domain/

### 7. Настройка Nginx
#### Настройте Nginx как обратный прокси для Gunicorn и для обслуживания статических файлов фронтенда:
    sudo nano /etc/nginx/sites-available/cloud_storage

#### Вставьте следующую конфигурацию, заменив пути и IP-адрес/домен на свои:
    server {
    listen 80;
    server_name your_domain_or_ip;
    client_max_body_size 50M;

    # Статические файлы Django - ДОЛЖЕН БЫТЬ ПЕРВЫМ
    location /static/ {
        alias /home/mikhail/cloud_storage/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Медиа файлы Django
    location /media/ {
        alias /home/mikhail/cloud_storage/backend/media/;
        expires 7d;
        add_header Cache-Control "public";
        access_log off;
    }

    # Статические файлы React (после Django static)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json|manifest|map|txt)$ {
        root /home/mikhail/cloud_storage/frontend/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://unix:/home/mikhail/cloud_storage/backend/cloud_storage.sock;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Админка Django
    location /admin/ {
        proxy_pass http://unix:/home/mikhail/cloud_storage/backend/cloud_storage.sock;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Документация API
    location /swagger/ {
        proxy_pass http://unix:/home/mikhail/cloud_storage/backend/cloud_storage.sock;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /redoc/ {
        proxy_pass http://unix:/home/mikhail/cloud_storage/backend/cloud_storage.sock;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Главная страница React SPA
    location / {
        root /home/mikhail/cloud_storage/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
}

#### Активируйте конфигурацию и перезапустите Nginx:
    sudo ln -s /etc/nginx/sites-available/cloud_storage /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx
    sudo systemctl status nginx

### 8. Настройка брандмауэра
#### Разрешите доступ к портам 80 (HTTP) и, при необходимости, 443 (HTTPS):
    sudo ufw enable
    sudo ufw allow 'Nginx HTTP'
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

    # 1. Проверка статических файлов Django
    echo "=== Проверка статических файлов Django ==="
    curl -I http://your_domain/static/rest_framework/css/bootstrap.min.css
    curl -I http://your_domain/static/admin/css/base.css

    # 2. Проверка API endpoints
    echo "=== Проверка API ==="
    curl -I http://your_domain/api/
    curl http://your_domain/api/ | head -20

    # 3. Проверка фронтенда
    echo "=== Проверка фронтенда ==="
    curl -I http://your_domain/

    # 4. Проверка админки
    echo "=== Проверка админки ==="
    curl -I http://your_domain/admin/

    # 5. Проверка документации API
    echo "=== Проверка документации API ==="
    curl -I http://your_domain/swagger/
    curl -I http://your_domain/redoc/

### 11. Устранение неполадок
#### Если что-то не работает, проверьте логи:
    # Логи Gunicorn
    sudo journalctl -u gunicorn -f

    # Логи Nginx
    sudo tail -f /var/log/nginx/error.log
    sudo tail -f /var/log/nginx/access.log

    # Логи Django
    tail -f /home/your_username/cloud_storage/backend/logs/django.log 

    # Проверка процессов
    sudo netstat -tlnp | grep -E '(80|8000)'
    sudo ps aux | grep gunicorn
    sudo ps aux | grep nginx

    # Проверка конфигурации
    sudo nginx -T
    sudo systemctl cat gunicorn

    # Проверка прав доступа
    namei -l /home/mikhail/cloud_storage/backend/cloud_storage.sock
    sudo -u www-data ls -la /home/mikhail/cloud_storage/backend/staticfiles/

    # Проверка базы данных
    sudo -u postgres psql -d cloud_storage -c "\dt"
    sudo -u postgres psql -d cloud_storage -c "SELECT version();"   

#### Убедитесь, что все пути в конфигурационных файлах указаны правильно.
#### Проверьте права доступа к файлам и директориям:
    sudo chown -R your_username:www-data /home/your_username/cloud_storage
    sudo chmod -R 755 /home/your_username/cloud_storage
    sudo chmod 660 /home/your_username/cloud_storage/backend/core.sock
      

### 12. Обновление приложения
    # Перед обновлением сделайте резервную копию
    sudo -u postgres pg_dump -Fc cloud_storage > /tmp/cloud_storage_backup_$(date +%Y-%m-%d).dump

    # Остановите службы перед обновлением
    sudo systemctl stop gunicorn
    sudo systemctl stop nginx

#### Для обновления приложения после внесения изменений в код:
    cd /home/your_username/cloud_storage
    git pull origin main

    # Бэкенд
    cd backend
    source venv/bin/activate
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py collectstatic --noinput    

    # Фронтенд
    cd ../frontend
    yarn install --frozen-lockfile
    yarn build    

    # После обновления проверьте конфигурацию
    sudo nginx -t
    sudo systemctl daemon-reload

    # Запустите службы
    sudo systemctl start nginx
    sudo systemctl start gunicorn

    # Проверьте статус
    sudo systemctl status nginx
    sudo systemctl status gunicorn

### 13. Резервное копирование и восстановление

#### Создание директории для бэкапов
    sudo mkdir -p /path/to/backups
    sudo chown your_username:your_username /path/to/backups
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
        /path/to/cloud_storage/backend \
        /path/to/cloud_storage/frontend \
        /path/to/cloud_storage/README.md

    # Автоматическое резервное копирование в cron (ежедневно в 3:00)
    0 3 * * * tar -czvf /path/to/backups/cloud_storage_backup_$(date +\%Y-\%m-\%d).tar.gz /path/to/cloud_storage

#### Восстановление из резервной копии
    # Восстановление базы данных
    sudo -u postgres pg_restore -d cloud_storage /path/to/backups/cloud_storage_2025-08-01.dump

    # Восстановление файлов проекта
    tar -xzvf /path/to/backups/cloud_storage_backup_2025-08-01.tar.gz -C /
    