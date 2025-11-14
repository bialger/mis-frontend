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
    // Fallback на старый API
    return performance.timing.loadEventEnd - performance.timing.fetchStart;
  } else {
    return Date.now() - pageLoadStart;
  }
}

function formatLoadTime(ms) {
  return ms.toFixed(2) + ' мс';
}

function displayLoadTime() {
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
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.m-nav-menu a');

  navLinks.forEach(function(link) {
    if (link.tagName !== 'A') {
      return;
    }
    
    const dataHref = link.getAttribute('data-href');
    if (dataHref) {
      link.href = dataHref;
      link.removeAttribute('data-href');
    }
    link.classList.remove('is-active');
    
    const linkHref = link.getAttribute('href');

    if (!linkHref) {
      return;
    }

    const normalizedLinkHref = linkHref.replace(/^\.\//, '').replace(/^\//, '');
    
    const linkFile = normalizedLinkHref.split('/').pop() || normalizedLinkHref;
    
    let shouldBeActive = false;
    
    if ((currentFile === '' || currentFile === 'index.html' || currentPath === '/' || currentPath.endsWith('/')) && 
        (linkFile === 'index.html' || normalizedLinkHref === '' || normalizedLinkHref === '/')) {
      shouldBeActive = true;
    }
    else if (currentFile === linkFile && currentFile !== '') {
      shouldBeActive = true;
    }
    else if (currentPath.endsWith('/' + linkFile) || currentPath === '/' + linkFile) {
      shouldBeActive = true;
    }
    
    if (shouldBeActive) {
      link.setAttribute('data-href', linkHref);
      link.classList.add('is-active');
    }
  });
}

function setupNavigationClickHandler() {
  const navMenu = document.querySelector('.m-nav-menu');
  if (navMenu) {
    navMenu.addEventListener('click', function(e) {
      const link = e.target.closest('a');
      if (link && link.classList.contains('is-active')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });
  }
}

addEventListenerSafe(window, 'DOMContentLoaded', function() {
  setupNavigationClickHandler();
  setActiveNavigationItem();
});

addEventListenerSafe(window, 'load', function() {
  displayLoadTime();
  setActiveNavigationItem();
});
})();
