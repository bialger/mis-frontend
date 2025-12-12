(function() {
'use strict';


function checkAuth() {
  if (window.location.pathname.includes('login.html')) {
    return;
  }

  if (!window.apiUtils || !window.apiUtils.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}


function initAuth() {
  if (!checkAuth()) return;
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.apiUtils) {
      initAuth();
    } else {
      setTimeout(initAuth, 100);
    }
  });
} else {
  if (window.apiUtils) {
    initAuth();
  } else {
    setTimeout(initAuth, 100);
  }
}

window.checkAuth = checkAuth;
})();
