(function() {
'use strict';

let currentFilters = {entityType: null, dateFrom: null, dateTo: null};

async function initAudit() {
  const container = document.getElementById('audit-content');
  const entityTypeFilter = document.getElementById('entity-type-filter');
  const dateFromInput = document.getElementById('audit-date-from');
  const dateToInput = document.getElementById('audit-date-to');
  const loadBtn = document.getElementById('load-audit-btn');

  if (!container || !window.api) return;


  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  if (dateFromInput) {
    dateFromInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    currentFilters.dateFrom = dateFromInput.value;
  }

  if (dateToInput) {
    dateToInput.value = today.toISOString().split('T')[0];
    currentFilters.dateTo = dateToInput.value;
  }


  if (entityTypeFilter) {
    entityTypeFilter.addEventListener('change', function() {
      currentFilters.entityType = this.value || null;
    });
  }

  if (dateFromInput) {
    dateFromInput.addEventListener('change', function() {
      currentFilters.dateFrom = this.value || null;
    });
  }

  if (dateToInput) {
    dateToInput.addEventListener('change', function() {
      currentFilters.dateTo = this.value || null;
    });
  }

  if (loadBtn) {
    loadBtn.addEventListener('click', loadAudit);
  }


  loadAudit();
}

async function loadAudit() {
  const container = document.getElementById('audit-content');
  if (!container || !window.api) return;

  window.apiUtils.showPreloader(container);

  try {
    let auditLogs = await window.api.getAudit();


    if (currentFilters.entityType) {
      auditLogs =
          auditLogs.filter(log => log.entityType === currentFilters.entityType);
    }

    if (currentFilters.dateFrom) {
      const fromDate = new Date(currentFilters.dateFrom + 'T00:00:00Z');
      auditLogs = auditLogs.filter(log => {
        const logDate = new Date(log.ts);
        return logDate >= fromDate;
      });
    }

    if (currentFilters.dateTo) {
      const toDate = new Date(currentFilters.dateTo + 'T23:59:59Z');
      auditLogs = auditLogs.filter(log => {
        const logDate = new Date(log.ts);
        return logDate <= toDate;
      });
    }


    auditLogs.sort((a, b) => new Date(b.ts) - new Date(a.ts));

    if (auditLogs.length === 0) {
      container.innerHTML = '<p>Логи не найдены для выбранных фильтров</p>';
      return;
    }


    let users = [];
    try {
      users = await window.api.getUsers();
    } catch (error) {
      console.warn('Не удалось загрузить пользователей:', error);
    }

    const getUserName = (userId) => {
      const user = users.find(u => u.id === userId);
      return user ? user.name : `ID: ${userId}`;
    };

    const getEntityTypeText = (type) => {
      const types = {
        'APPOINTMENT': 'Запись',
        'PATIENT': 'Пациент',
        'INVENTORY': 'Склад',
        'USER': 'Пользователь',
        'MEDICAL_RECORD': 'Медицинская запись',
        'FILE': 'Файл'
      };
      return types[type] || type;
    };

    const getActionText = (action) => {
      const actions = {
        'APPOINTMENT_CREATE': 'Создание записи',
        'APPOINTMENT_UPDATE': 'Обновление записи',
        'APPOINTMENT_STATUS_CHANGE': 'Изменение статуса записи',
        'APPOINTMENT_DELETE': 'Удаление записи',
        'PATIENT_CREATE': 'Создание пациента',
        'PATIENT_UPDATE': 'Обновление пациента',
        'PATIENT_DELETE': 'Удаление пациента',
        'INVENTORY_WRITE_OFF': 'Списание со склада',
        'INVENTORY_RECEIPT': 'Поступление на склад',
        'INVENTORY_ISSUE': 'Выдача со склада',
        'USER_CREATE': 'Создание пользователя',
        'USER_UPDATE': 'Обновление пользователя',
        'USER_DELETE': 'Удаление пользователя',
        'MEDICAL_RECORD_CREATE': 'Создание медицинской записи',
        'MEDICAL_RECORD_UPDATE': 'Обновление медицинской записи',
        'FILE_UPLOAD': 'Загрузка файла',
        'FILE_DELETE': 'Удаление файла'
      };
      return actions[action] || action;
    };

    const formatDiff = (diff) => {
      if (!diff || typeof diff !== 'object') return '';

      const parts = [];
      for (const [key, value] of Object.entries(diff)) {
        if (value && typeof value === 'object' && 'from' in value &&
            'to' in value) {
          const from = value.from !== null && value.from !== undefined ?
              String(value.from) :
              'пусто';
          const to = value.to !== null && value.to !== undefined ?
              String(value.to) :
              'пусто';
          parts.push(`${key}: ${from} → ${to}`);
        }
      }

      return parts.length > 0 ? parts.join(', ') : JSON.stringify(diff);
    };


    const columns = 6;

    let html = `
      <div class="m-audit-table-wrapper">
        <table class="m-table" style="grid-template-columns: repeat(${
        columns}, minmax(120px, 1fr));">
          <thead>
            <tr style="grid-template-columns: repeat(${
        columns}, minmax(120px, 1fr));">
              <th>Дата/Время</th>
              <th>Пользователь</th>
              <th>Действие</th>
              <th>Сущность</th>
              <th>ID сущности</th>
              <th>Изменения</th>
            </tr>
          </thead>
          <tbody>
    `;

    auditLogs.forEach(log => {
      const date = new Date(log.ts);
      const dateStr = date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      html += `
        <tr style="grid-template-columns: repeat(${
          columns}, minmax(120px, 1fr));">
          <td>${dateStr}</td>
          <td>${getUserName(log.userId)}</td>
          <td>${getActionText(log.action)}</td>
          <td>${getEntityTypeText(log.entityType)}</td>
          <td>${log.entityId || '-'}</td>
          <td class="m-audit-diff">${formatDiff(log.diff)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <p style="margin-top: 1rem; color: #666;">Всего записей: <strong>${
        auditLogs.length}</strong></p>
    `;

    container.innerHTML = html;
  } catch (error) {
    console.error('Ошибка загрузки логов:', error);
    window.apiUtils.showError(
        container, error.message || 'Ошибка загрузки логов',
        error.type || 'default');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.api && window.apiUtils) {
      initAudit();
    } else {
      setTimeout(initAudit, 200);
    }
  });
} else {
  if (window.api && window.apiUtils) {
    initAudit();
  } else {
    setTimeout(initAudit, 200);
  }
}
})();
