(function() {
'use strict';

let currentBranchId = null;
let currentDate = null;

async function initSchedule() {
  const container = document.getElementById('schedule-content');
  const branchSelect = document.getElementById('branch-select');
  const dateInput = document.getElementById('schedule-date');
  const loadBtn = document.getElementById('load-schedule-btn');

  if (!container || !window.api) return;


  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    currentDate = today;
  }


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
        loadSchedule();
      });
    }

    if (dateInput) {
      dateInput.addEventListener('change', function() {
        currentDate = this.value;
        loadSchedule();
      });
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', loadSchedule);
    }


    if (currentBranchId && currentDate) {
      loadSchedule();
    }
  } catch (error) {
    console.error('Ошибка инициализации расписания:', error);
    window.apiUtils.showError(container, 'Ошибка загрузки данных', 'default');
  }
}

async function loadSchedule() {
  const container = document.getElementById('schedule-content');
  if (!container || !currentBranchId || !currentDate || !window.api) return;

  window.apiUtils.showPreloader(container);

  try {
    const from = new Date(currentDate + 'T00:00:00Z').toISOString();
    const to = new Date(currentDate + 'T23:59:59Z').toISOString();

    const appointments =
        await window.api.getAppointments(currentBranchId, from, to);


    appointments.sort((a, b) => new Date(a.start) - new Date(b.start));

    const template = document.getElementById('schedule-slot-template');

    if (appointments.length === 0) {
      container.innerHTML = '<p>На выбранную дату нет записей</p>';
      return;
    }

    container.innerHTML = '<h3>Записи на ' + formatDate(currentDate) + '</h3>';

    appointments.forEach(apt => {
      if (!template) return;

      const clone = template.content.cloneNode(true);
      const slot = clone.querySelector('.m-schedule-slot');

      slot.setAttribute('data-appointment-id', apt.id);

      const time = clone.querySelector('.m-schedule-slot-time');
      const patient = clone.querySelector('.m-schedule-slot-patient');
      const status = clone.querySelector('.m-schedule-slot-status');
      const icons = clone.querySelector('.m-schedule-slot-icons');
      const link = clone.querySelector('.m-schedule-slot-link');

      if (time) {
        time.textContent = formatTime(apt.start);
      }

      if (patient) {
        patient.textContent = apt.patient?.fullName || 'Пациент не указан';
      }

      if (status) {
        status.textContent = getStatusText(apt.status);
        status.className =
            'm-schedule-slot-status m-status-' + apt.status.toLowerCase();
      }

      if (icons && apt.patient?.icons && apt.patient.icons.length > 0) {
        window.apiUtils.getIconsEmoji(apt.patient.icons).then(emojis => {
          icons.innerHTML = emojis;
        });
      }

      if (link) {
        link.href = `appointment-detail.html?id=${apt.id}`;
      }

      container.appendChild(clone);
    });
  } catch (error) {
    console.error('Ошибка загрузки расписания:', error);
    window.apiUtils.showError(
        container, error.message || 'Ошибка загрузки расписания',
        error.type || 'default');
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(
      'ru-RU',
      {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
}

function getStatusText(status) {
  const statusMap = {
    'BOOKED': 'Записан',
    'CONFIRMED': 'Подтверждён',
    'ARRIVED': 'Пришёл',
    'NO_SHOW': 'Не пришёл',
    'CANCELED': 'Отменён'
  };
  return statusMap[status] || status;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.api && window.apiUtils) {
      initSchedule();
    } else {
      setTimeout(initSchedule, 200);
    }
  });
} else {
  if (window.api && window.apiUtils) {
    initSchedule();
  } else {
    setTimeout(initSchedule, 200);
  }
}
})();
