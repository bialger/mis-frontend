(function() {
'use strict';

let currentBranchId = null;
let currentCategory = null;
let currentTab = 'stock';

async function initInventory() {
  const container = document.getElementById('inventory-content');
  const branchSelect = document.getElementById('inventory-branch-select');
  const categoryFilter = document.getElementById('inventory-category-filter');
  const loadBtn = document.getElementById('load-inventory-btn');
  const tabButtons = document.querySelectorAll('.m-tab-button');

  if (!container || !window.api) return;


  try {
    const me = await window.api.getMe();
    const branches = await window.api.getBranches();

    if (branchSelect && branches.length > 0) {
      branchSelect.innerHTML = '';

      const availableBranches = branches.filter(
          b => !me.branchScope || me.branchScope.length === 0 ||
              me.branchScope.includes(b.id));

      if (availableBranches.length === 0 && branches.length > 0) {
        availableBranches.push(...branches);
      }

      availableBranches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = branch.name;
        branchSelect.appendChild(option);
      });

      if (availableBranches.length > 0) {
        currentBranchId = availableBranches[0].id;
        branchSelect.value = currentBranchId;
      }
    }


    if (branchSelect) {
      branchSelect.addEventListener('change', function() {
        currentBranchId = parseInt(this.value);
        loadInventory();
      });
    }

    if (categoryFilter) {
      categoryFilter.addEventListener('change', function() {
        currentCategory = this.value || null;
        loadInventory();
      });
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', loadInventory);
    }


    tabButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        tabButtons.forEach(b => b.classList.remove('is-active'));
        this.classList.add('is-active');
        currentTab = this.getAttribute('data-tab');
        loadInventory();
      });
    });


    if (currentBranchId) {
      loadInventory();
    }
  } catch (error) {
    console.error('Ошибка инициализации склада:', error);
    window.apiUtils.showError(container, 'Ошибка загрузки данных', 'default');
  }
}

async function loadInventory() {
  const container = document.getElementById('inventory-content');
  if (!container || !currentBranchId || !window.api) return;

  window.apiUtils.showPreloader(container);

  try {
    const me = await window.api.getMe();
    const permissions = me.permissions || {};
    const canViewInventory = permissions.canViewInventory ||
        me.user?.role === 'ADMIN' || me.user?.role === 'HEAD' ||
        me.user?.role === 'SYSADMIN';
    const canWriteInventory = permissions.canWriteInventory ||
        me.user?.role === 'ADMIN' || me.user?.role === 'HEAD';

    if (!canViewInventory) {
      container.innerHTML =
          '<p class="m-error-message">У вас нет прав для просмотра склада</p>';
      return;
    }

    if (currentTab === 'stock') {
      await loadStock(container, canWriteInventory);
    } else if (currentTab === 'movement') {
      await loadMovement(container);
    } else if (currentTab === 'operations') {
      await loadOperations(container, canWriteInventory);
    }
  } catch (error) {
    console.error('Ошибка загрузки склада:', error);
    window.apiUtils.showError(
        container, error.message || 'Ошибка загрузки склада',
        error.type || 'default');
  }
}

async function loadStock(container, canWriteInventory) {
  try {
    let items = await window.api.getInventory(currentBranchId);


    if (currentCategory) {
      items = items.filter(item => item.category === currentCategory);
    }

    if (items.length === 0) {
      container.innerHTML = '<p>На складе нет позиций</p>';
      return;
    }

    const getCategoryText = (category) => {
      const categories = {
        'DRUGS': 'Медикаменты',
        'MED_DEVICES': 'Медицинские изделия',
        'MED_CONSUMABLES': 'Медицинские расходники',
        'HOUSEHOLD_CONSUMABLES': 'Хозяйственные расходники'
      };
      return categories[category] || category;
    };

    const getUnitText = (unit) => {
      const units = {'pcs': 'шт', 'kg': 'кг', 'l': 'л', 'm': 'м'};
      return units[unit] || unit;
    };

    const columns = canWriteInventory ? 7 : 6;

    let html = `
      <div class="m-inventory-stock-wrapper">
        <table class="m-table" style="grid-template-columns: repeat(${
        columns}, minmax(120px, 1fr));">
          <thead>
            <tr style="grid-template-columns: repeat(${
        columns}, minmax(120px, 1fr));">
              <th>Наименование</th>
              <th>Категория</th>
              <th>Остаток</th>
              <th>Единица</th>
              <th>Порог "мало"</th>
              <th>Статус</th>
              ${canWriteInventory ? '<th>Действия</th>' : ''}
            </tr>
          </thead>
          <tbody>
    `;

    items.forEach(item => {
      const isLow = item.stock <= item.minStock;
      const statusClass = isLow ? 'm-status-warning' : 'm-status-ok';
      const statusText = isLow ? 'Мало' : 'Норма';

      html += `
        <tr class="${
          isLow ? 'm-row-warning' : ''}" style="grid-template-columns: repeat(${
          columns}, minmax(120px, 1fr));">
          <td><strong>${item.name}</strong></td>
          <td>${getCategoryText(item.category)}</td>
          <td>${item.stock}</td>
          <td>${getUnitText(item.unit)}</td>
          <td>${item.minStock}</td>
          <td><span class="m-badge ${statusClass}">${statusText}</span></td>
          ${
          canWriteInventory ?
              `
            <td>
              <button class="m-button m-button--small is-hoverable-button" onclick="showWriteOffModal(${
                  item.id}, '${item.name.replace(/'/g, '\\\'')}')">
                Списать
              </button>
            </td>
          ` :
              ''}
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <p style="margin-top: 1rem; color: #666;">Всего позиций: <strong>${
        items.length}</strong></p>
    `;

    container.innerHTML = html;
  } catch (error) {
    console.error('Ошибка загрузки остатков:', error);
    throw error;
  }
}

async function loadMovement(container) {
  try {
    let auditLogs = await window.api.getAudit();


    const inventoryActions =
        ['INVENTORY_WRITE_OFF', 'INVENTORY_RECEIPT', 'INVENTORY_ISSUE'];
    auditLogs = auditLogs.filter(
        log => log.entityType === 'INVENTORY' &&
            inventoryActions.includes(log.action));


    if (currentBranchId) {
      auditLogs = auditLogs.filter(log => log.branchId === currentBranchId);
    }


    auditLogs.sort((a, b) => new Date(b.ts) - new Date(a.ts));


    auditLogs = auditLogs.slice(0, 100);

    if (auditLogs.length === 0) {
      container.innerHTML = '<p>Движение по складу отсутствует</p>';
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

    const getActionText = (action) => {
      const actions = {
        'INVENTORY_WRITE_OFF': 'Списание',
        'INVENTORY_RECEIPT': 'Поступление',
        'INVENTORY_ISSUE': 'Выдача'
      };
      return actions[action] || action;
    };

    const columns = 4;

    let html = `
      <div class="m-inventory-movement-wrapper">
        <table class="m-table" style="grid-template-columns: repeat(${
        columns}, minmax(150px, 1fr));">
          <thead>
            <tr style="grid-template-columns: repeat(${
        columns}, minmax(150px, 1fr));">
              <th>Дата/Время</th>
              <th>Операция</th>
              <th>Пользователь</th>
              <th>Детали</th>
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

      const details = log.diff ? JSON.stringify(log.diff) : '-';

      html += `
        <tr style="grid-template-columns: repeat(${
          columns}, minmax(150px, 1fr));">
          <td>${dateStr}</td>
          <td>${getActionText(log.action)}</td>
          <td>${getUserName(log.userId)}</td>
          <td class="m-audit-diff">${details}</td>
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
    console.error('Ошибка загрузки движения:', error);
    throw error;
  }
}

async function loadOperations(container, canWriteInventory) {
  if (!canWriteInventory) {
    container.innerHTML =
        '<p class="m-error-message">У вас нет прав для выполнения операций со складом</p>';
    return;
  }

  container.innerHTML = `
    <div class="m-inventory-operations">
      <h3>Операции со складом</h3>
      <div class="m-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
        <article class="m-card is-hoverable">
          <h4>Списание</h4>
          <p>Списать расходники со склада</p>
          <button class="m-button is-hoverable-button" onclick="showWriteOffModal()">Списать</button>
        </article>
        <article class="m-card is-hoverable">
          <h4>Поступление</h4>
          <p>Зафиксировать поступление товара</p>
          <button class="m-button is-hoverable-button" onclick="showReceiptModal()">Принять</button>
        </article>
        <article class="m-card is-hoverable">
          <h4>Выдача</h4>
          <p>Выдать товар сотруднику</p>
          <button class="m-button is-hoverable-button" onclick="showIssueModal()">Выдать</button>
        </article>
      </div>
    </div>
  `;
}

function showWriteOffModal(itemId, itemName) {
  const modal = document.createElement('div');
  modal.className = 'm-modal';
  modal.innerHTML = `
    <div class="m-modal-content">
      <h3>Списание со склада</h3>
      ${itemName ? `<p><strong>Позиция:</strong> ${itemName}</p>` : `
        <label>
          Позиция:
          <select id="writeoff-item-select" class="m-select is-focusable"></select>
        </label>
      `}
      <label>
        Количество:
        <input type="number" id="writeoff-quantity" class="m-input is-focusable" min="0.01" step="0.01" required>
      </label>
      <label>
        Причина/Комментарий:
        <textarea id="writeoff-reason" class="m-textarea is-focusable" rows="3"></textarea>
      </label>
      <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
        <button class="m-button is-hoverable-button" onclick="performWriteOff(${
      itemId || 'null'})">Списать</button>
        <button class="m-button is-hoverable-button" onclick="closeModal()">Отмена</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);


  if (!itemId) {
    loadItemsForSelect('writeoff-item-select');
  }
}

function showReceiptModal() {
  const modal = document.createElement('div');
  modal.className = 'm-modal';
  modal.innerHTML = `
    <div class="m-modal-content">
      <h3>Поступление на склад</h3>
      <label>
        Позиция:
        <select id="receipt-item-select" class="m-select is-focusable"></select>
      </label>
      <label>
        Количество:
        <input type="number" id="receipt-quantity" class="m-input is-focusable" min="0.01" step="0.01" required>
      </label>
      <label>
        Комментарий:
        <textarea id="receipt-comment" class="m-textarea is-focusable" rows="3"></textarea>
      </label>
      <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
        <button class="m-button is-hoverable-button" onclick="performReceipt()">Принять</button>
        <button class="m-button is-hoverable-button" onclick="closeModal()">Отмена</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  loadItemsForSelect('receipt-item-select');
}

function showIssueModal() {
  const modal = document.createElement('div');
  modal.className = 'm-modal';
  modal.innerHTML = `
    <div class="m-modal-content">
      <h3>Выдача со склада</h3>
      <label>
        Позиция:
        <select id="issue-item-select" class="m-select is-focusable"></select>
      </label>
      <label>
        Количество:
        <input type="number" id="issue-quantity" class="m-input is-focusable" min="0.01" step="0.01" required>
      </label>
      <label>
        Комментарий:
        <textarea id="issue-comment" class="m-textarea is-focusable" rows="3"></textarea>
      </label>
      <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
        <button class="m-button is-hoverable-button" onclick="performIssue()">Выдать</button>
        <button class="m-button is-hoverable-button" onclick="closeModal()">Отмена</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  loadItemsForSelect('issue-item-select');
}

async function loadItemsForSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select || !window.api) return;

  try {
    const items = await window.api.getInventory(currentBranchId);
    select.innerHTML = '<option value="">Выберите позицию</option>';
    items.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.name} (остаток: ${item.stock})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Ошибка загрузки позиций:', error);
  }
}

async function performWriteOff(itemId) {
  const select = document.getElementById('writeoff-item-select');
  const quantityInput = document.getElementById('writeoff-quantity');
  const reasonInput = document.getElementById('writeoff-reason');

  const finalItemId = itemId || (select ? parseInt(select.value) : null);
  const quantity = quantityInput ? parseFloat(quantityInput.value) : null;
  const reason = reasonInput ? reasonInput.value : '';

  if (!finalItemId || !quantity || quantity <= 0) {
    alert('Заполните все обязательные поля');
    return;
  }

  try {
    await window.api.writeOffInventory(
        finalItemId, quantity, reason, currentBranchId);
    alert('Списание выполнено успешно');
    closeModal();
    loadInventory();
  } catch (error) {
    console.error('Ошибка списания:', error);
    alert('Ошибка списания: ' + (error.message || 'Неизвестная ошибка'));
  }
}

async function performReceipt() {
  const select = document.getElementById('receipt-item-select');
  const quantityInput = document.getElementById('receipt-quantity');
  const commentInput = document.getElementById('receipt-comment');

  const itemId = select ? parseInt(select.value) : null;
  const quantity = quantityInput ? parseFloat(quantityInput.value) : null;
  const comment = commentInput ? commentInput.value : '';

  if (!itemId || !quantity || quantity <= 0) {
    alert('Заполните все обязательные поля');
    return;
  }

  try {
    await window.api.receiptInventory(
        itemId, quantity, comment, currentBranchId);
    alert('Поступление зафиксировано успешно');
    closeModal();
    loadInventory();
  } catch (error) {
    console.error('Ошибка поступления:', error);
    alert('Ошибка поступления: ' + (error.message || 'Неизвестная ошибка'));
  }
}

async function performIssue() {
  const select = document.getElementById('issue-item-select');
  const quantityInput = document.getElementById('issue-quantity');
  const commentInput = document.getElementById('issue-comment');

  const itemId = select ? parseInt(select.value) : null;
  const quantity = quantityInput ? parseFloat(quantityInput.value) : null;
  const comment = commentInput ? commentInput.value : '';

  if (!itemId || !quantity || quantity <= 0) {
    alert('Заполните все обязательные поля');
    return;
  }

  try {
    await window.api.issueInventory(itemId, quantity, comment, currentBranchId);
    alert('Выдача выполнена успешно');
    closeModal();
    loadInventory();
  } catch (error) {
    console.error('Ошибка выдачи:', error);
    alert('Ошибка выдачи: ' + (error.message || 'Неизвестная ошибка'));
  }
}

function closeModal() {
  const modal = document.querySelector('.m-modal');
  if (modal) {
    modal.remove();
  }
}


window.showWriteOffModal = showWriteOffModal;
window.showReceiptModal = showReceiptModal;
window.showIssueModal = showIssueModal;
window.performWriteOff = performWriteOff;
window.performReceipt = performReceipt;
window.performIssue = performIssue;
window.closeModal = closeModal;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.api && window.apiUtils) {
      initInventory();
    } else {
      setTimeout(initInventory, 200);
    }
  });
} else {
  if (window.api && window.apiUtils) {
    initInventory();
  } else {
    setTimeout(initInventory, 200);
  }
}
})();
