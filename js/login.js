(function() {
'use strict';

function init() {
  if (window.apiUtils && window.apiUtils.isAuthenticated()) {
    window.location.href = 'index.html';
    return;
  }

  const form = document.getElementById('login-form');
  const errorDiv = document.getElementById('login-error');
  const submitButton = document.getElementById('login-submit');

  if (!form || !window.api) {
    console.error('Не найдены необходимые элементы или API');
    return;
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const login = form.login.value.trim();
    const password = form.password.value.trim();

    if (!login || !password) {
      showError('Заполните все поля');
      return;
    }


    submitButton.disabled = true;
    submitButton.textContent = 'Вход...';
    hideError();

    try {
      const result = await window.api.login(login, password);

      if (result && result.accessToken) {
        window.location.href = 'index.html';
      } else {
        showError('Ошибка входа. Попробуйте снова.');
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      showError(error.message || 'Неверный логин или пароль');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Войти';
    }
  });
}

function showError(message) {
  const errorDiv = document.getElementById('login-error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.add('is-visible');
  }
}

function hideError() {
  const errorDiv = document.getElementById('login-error');
  if (errorDiv) {
    errorDiv.classList.remove('is-visible');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
})();
