(function() {
'use strict';


function isFileProtocol() {
  return window.location.protocol === 'file:';
}


function showServerWarning() {
  if (isFileProtocol() && !sessionStorage.getItem('server-warning-shown')) {
    sessionStorage.setItem('server-warning-shown', 'true');
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f39c12;
      color: white;
      padding: 1rem;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    warning.innerHTML = `
      <strong>Внимание:</strong> Для корректной работы приложения необходимо использовать локальный веб-сервер.
      <br>Запустите: <code>python -m http.server 8000</code> или <code>npx http-server</code> в корне проекта,
      затем откройте <a href="http://localhost:8000" style="color: white; text-decoration: underline;">http://localhost:8000</a>
      <button onclick="this.parentElement.remove()" style="margin-left: 1rem; padding: 0.25rem 0.5rem; cursor: pointer;">✕</button>
    `;
    document.body.insertBefore(warning, document.body.firstChild);
  }
}


async function loadComponent(elementId, componentPath) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Элемент с id="${elementId}" не найден`);
    return;
  }


  if (isFileProtocol()) {
    showServerWarning();
    const currentFile = window.location.pathname.split('/').pop() ||
        window.location.href.split('/').pop() || 'index.html';
    element.innerHTML = `
      <div style="padding: 1rem; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; color: #856404;">
        <strong>Ошибка загрузки компонента:</strong> Браузер блокирует загрузку файлов через file:
        <br><br>
        <strong>Решение:</strong> Запустите локальный веб-сервер:
        <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
          <li><strong>Python:</strong> <code>python -m http.server 8000</code></li>
          <li><strong>Node.js:</strong> <code>npx http-server</code></li>
          <li><strong>PHP:</strong> <code>php -S localhost:8000</code></li>
        </ul>
        Затем откройте <a href="http://localhost:8000/${
        currentFile}" style="color: #856404; text-decoration: underline;">http://localhost:8000/${
        currentFile}</a>
      </div>
    `;
    return;
  }

  try {
    let fullPath = componentPath;
    if (!componentPath.startsWith('http://') &&
        !componentPath.startsWith('https://') &&
        !componentPath.startsWith('//')) {
      try {
        fullPath = new URL(componentPath, window.location.href).href;
      } catch (e) {
        const basePath = window.location.href.substring(
            0, window.location.href.lastIndexOf('/') + 1);
        fullPath = basePath + componentPath.replace(/^\.\//, '');
      }
    }


    const separator = fullPath.includes('?') ? '&' : '?';
    const urlWithCache = fullPath + separator + 'v=' + Date.now();


    const response = await fetch(urlWithCache, {
      cache: 'no-store',
      headers: {'Cache-Control': 'no-cache', 'Pragma': 'no-cache'}
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const html = await response.text();
    element.innerHTML = html;

    if (elementId === 'header-placeholder') {
      const initHeader = () => {
        const oldUserInfo = document.querySelector('.m-user-info');
        if (oldUserInfo) {
          oldUserInfo.remove();
        }


        if (window.setActiveNavigationItem) {
          window.setActiveNavigationItem();
        }
        if (window.setupNavigationClickHandler) {
          window.setupNavigationClickHandler();
        }


        const addUserInfo = () => {
          if (window.apiUtils && window.apiUtils.isAuthenticated &&
              window.apiUtils.isAuthenticated()) {
            const user = window.apiUtils.getUser();
            if (user && user.user) {
              const header = document.querySelector('.l-header-container');
              if (header && !header.querySelector('.m-user-info')) {
                const userInfo = document.createElement('div');
                userInfo.className = 'm-user-info';
                userInfo.style.cssText =
                    'display: flex; align-items: center; gap: 1rem; margin-left: auto;';
                const roleNames = {
                  'ADMIN': 'Администратор',
                  'DOCTOR': 'Врач',
                  'HEAD': 'Руководитель',
                  'SYSADMIN': 'Системный администратор'
                };
                userInfo.innerHTML = `
                  <span style="color: var(--white);">${user.user.name} (${
                    roleNames[user.user.role] || user.user.role})</span>
                  <button class="m-button" onclick="window.apiUtils.logout()" style="padding: 0.5rem 1rem; font-size: 0.875rem;">Выход</button>
                `;
                header.appendChild(userInfo);
              }
            }
          }
        };


        addUserInfo();
      };


      initHeader();
    }
  } catch (error) {
    console.error(`Ошибка загрузки компонента ${componentPath}:`, error);
    element.innerHTML =
        `<div class="m-error-message">Ошибка загрузки компонента: ${
            error.message}</div>`;
  }
}


async function loadComponents() {
  await Promise.all([
    loadComponent('header-placeholder', 'components/header.html'),
    loadComponent('footer-placeholder', 'components/footer.html'),
    loadComponent('sidebar-placeholder', 'components/sidebar.html')
  ]);


  setTimeout(() => {
    const lastUpdateEl = document.getElementById('sidebar-last-update');
    if (lastUpdateEl) {
      const now = new Date();
      lastUpdateEl.textContent = now.toLocaleTimeString('ru-RU');
    }
  }, 100);
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadComponents);
} else {
  loadComponents();
}


window.loadComponent = loadComponent;
window.loadComponents = loadComponents;
})();
