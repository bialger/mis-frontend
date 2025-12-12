@echo off
echo Запуск локального веб-сервера...
echo.
echo Выберите способ запуска:
echo 1. Python (python -m http.server)
echo 2. Node.js (npx http-server)
echo 3. PHP (php -S)
echo.
set /p choice="Введите номер (1-3): "

if "%choice%"=="1" (
    echo Запуск Python сервера на порту 8000...
    python -m http.server 8000
) else if "%choice%"=="2" (
    echo Запуск Node.js сервера...
    npx http-server -p 8000
) else if "%choice%"=="3" (
    echo Запуск PHP сервера на порту 8000...
    php -S localhost:8000
) else (
    echo Неверный выбор. Используется Python по умолчанию...
    python -m http.server 8000
)
