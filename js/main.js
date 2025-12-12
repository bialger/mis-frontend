(function() {
'use strict';

const pageLoadStart =
    performance.timing.navigationStart || performance.timeOrigin || Date.now();

function addEventListenerSafe(element, event, handler) {
  if (element && typeof handler === 'function') {
    element.addEventListener(event, handler);
  }
}

function getPageLoadTime() {
  const navigationTiming = performance.getEntriesByType('navigation')[0];

  if (navigationTiming && navigationTiming.loadEventEnd) {
    return navigationTiming.loadEventEnd - navigationTiming.fetchStart;
  } else if (performance.timing && performance.timing.loadEventEnd) {
    return performance.timing.loadEventEnd - performance.timing.fetchStart;
  } else {
    return Date.now() - pageLoadStart;
  }
}

function formatLoadTime(ms) {
  return ms.toFixed(2) + ' мс';
}

function isDOMReady() {
  return document.readyState === 'complete' ||
      document.readyState === 'interactive';
}

function displayLoadTime() {
  while (!isDOMReady()) {
    continue;
  }

  const footer = document.querySelector('.l-footer-info address');
  if (footer) {
    const existingLoadTime = footer.querySelector('[data-load-time]');
    if (existingLoadTime) {
      return;
    }

    const loadTime = getPageLoadTime();
    const loadTimeElement = document.createElement('p');
    loadTimeElement.setAttribute('data-load-time', 'true');
    loadTimeElement.innerHTML = 'Время загрузки страницы: <strong>' +
        formatLoadTime(loadTime) + '</strong>';
    footer.appendChild(loadTimeElement);
  }
}

function setActiveNavigationItem() {
  while (!isDOMReady()) {
    continue;
  }

  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.m-nav-menu a');

  if (navLinks.length === 0) {
    return;
  }

  navLinks.forEach(function(link) {
    if (link.tagName !== 'A') {
      return;
    }


    const dataHref = link.getAttribute('data-href');
    const wasActive = link.classList.contains('is-active');

    if (wasActive && dataHref) {
      const newLink = link.cloneNode(true);
      link.parentNode.replaceChild(newLink, link);

      const restoredLink = newLink;
      restoredLink.href = dataHref;
      restoredLink.removeAttribute('data-href');
      restoredLink.classList.remove('is-active');
      restoredLink.removeAttribute('aria-current');
      restoredLink.removeAttribute('tabindex');

      link = restoredLink;
    } else if (dataHref) {
      link.href = dataHref;
      link.removeAttribute('data-href');
    }

    if (!wasActive) {
      link.classList.remove('is-active');
    }

    const linkHref = link.getAttribute('href');

    if (!linkHref || linkHref === '#' || linkHref === 'javascript:void(0)') {
      return;
    }

    const normalizedLinkHref = linkHref.replace(/^\.\//, '').replace(/^\//, '');

    const linkFile = normalizedLinkHref.split('/').pop() || normalizedLinkHref;

    let shouldBeActive = false;

    if ((currentFile === '' || currentFile === 'index.html' ||
         currentPath === '/' || currentPath.endsWith('/')) &&
        (linkFile === 'index.html' || normalizedLinkHref === '' ||
         normalizedLinkHref === '/')) {
      shouldBeActive = true;
    } else if (currentFile === linkFile && currentFile !== '') {
      shouldBeActive = true;
    } else if (
        currentPath.endsWith('/' + linkFile) ||
        currentPath === '/' + linkFile) {
      shouldBeActive = true;
    }

    if (shouldBeActive) {
      link.setAttribute('data-href', linkHref);
      link.removeAttribute('href');
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
      link.setAttribute('tabindex', '-1');


      const blockClick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      };


      if (!link.hasAttribute('data-blocked')) {
        link.addEventListener('click', blockClick, true);
        link.addEventListener('click', blockClick, false);
        link.onclick = blockClick;
        link.setAttribute('data-blocked', 'true');
      }
    }
  });
}


let navigationClickHandler = null;

function setupNavigationClickHandler() {
  if (!isDOMReady()) {
    return;
  }


  if (navigationClickHandler) {
    document.removeEventListener('click', navigationClickHandler, true);
  }


  navigationClickHandler = function(e) {
    const link = e.target.closest('.m-nav-menu a');
    if (link && link.classList.contains('is-active')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  };


  document.addEventListener('click', navigationClickHandler, true);
}

function init() {
  if (isDOMReady()) {
    setupNavigationClickHandler();
    setActiveNavigationItem();
  } else {
    addEventListenerSafe(document, 'DOMContentLoaded', function() {
      setupNavigationClickHandler();
      setActiveNavigationItem();
    });
  }
}

init();

addEventListenerSafe(window, 'load', function() {
  displayLoadTime();
  setActiveNavigationItem();
  setupNavigationClickHandler();
});


window.setActiveNavigationItem = setActiveNavigationItem;
window.setupNavigationClickHandler = setupNavigationClickHandler;
})();
