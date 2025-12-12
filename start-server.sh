#!/bin/bash

echo "Запуск локального веб-сервера..."
echo ""
echo "Выберите способ запуска:"
echo "1. Python (python -m http.server)"
echo "2. Node.js (npx http-server)"
echo "3. PHP (php -S)"
echo ""
read -p "Введите номер (1-3): " choice

case $choice in
    1)
        echo "Запуск Python сервера на порту 8000..."
        python3 -m http.server 8000
        ;;
    2)
        echo "Запуск Node.js сервера..."
        npx http-server -p 8000
        ;;
    3)
        echo "Запуск PHP сервера на порту 8000..."
        php -S localhost:8000
        ;;
    *)
        echo "Неверный выбор. Используется Python по умолчанию..."
        python3 -m http.server 8000
        ;;
esac
