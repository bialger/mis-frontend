(function() {
'use strict';

async function loadDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container || !window.api) return;

  window.apiUtils.showPreloader(container);

  try {
    const me = await window.api.getMe();
    const user = me.user || window.apiUtils.getUser()?.user;

    if (!user) {
      window.apiUtils.showError(
          container, 'Не удалось загрузить данные пользователя', 'default');
      return;
    }

    const role = user.role;
    let content = '';

    if (role === 'DOCTOR') {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow =
          new Date(Date.now() + 86400000).toISOString().split('T')[0];

      try {
        const appointments = await window.api.getAppointments(
            me.branchScope[0] || 1, today + 'T00:00:00Z',
            tomorrow + 'T00:00:00Z');
        const myAppointments =
            appointments.filter(apt => apt.doctorId === user.id);

        content = `
          <div class="m-dashboard-welcome">
            <h3>Добро пожаловать, ${user.name}!</h3>
            <p>Сегодня у вас ${myAppointments.length} ${
            getAppointmentWord(myAppointments.length)}</p>
          </div>
          <div class="m-dashboard-section">
            <h3>Сегодня</h3>
            <div id="today-appointments" class="m-appointments-list">
              ${
            myAppointments.length > 0 ?
                myAppointments
                    .map(
                        apt => `
                  <div class="m-appointment-card">
                    <strong>${formatTime(apt.start)}</strong> - ${
                            apt.patient?.fullName || 'Пациент'}
                    <a href="appointment-detail.html?id=${
                            apt.id}" class="m-link">Открыть</a>
                  </div>
                `).join('') :
                '<p>Нет записей на сегодня</p>'}
            </div>
            <a href="schedule.html" class="m-button is-hoverable-button">Перейти к расписанию</a>
          </div>
        `;
      } catch (error) {
        content = `
          <div class="m-dashboard-welcome">
            <h3>Добро пожаловать, ${user.name}!</h3>
            <p>Врач</p>
          </div>
          <div class="m-dashboard-section">
            <a href="schedule.html" class="m-button is-hoverable-button">Перейти к расписанию</a>
          </div>
        `;
      }
    } else if (role === 'ADMIN') {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow =
          new Date(Date.now() + 86400000).toISOString().split('T')[0];

      try {
        const appointments = await window.api.getAppointments(
            me.branchScope[0] || 1, today + 'T00:00:00Z',
            tomorrow + 'T00:00:00Z');
        const onlineAppointments = appointments.filter(
            apt => apt.source === 'ONLINE' && apt.status === 'BOOKED');

        content = `
          <div class="m-dashboard-welcome">
            <h3>Добро пожаловать, ${user.name}!</h3>
          </div>
          <div class="m-dashboard-section">
            <h3>Онлайн-записи</h3>
            <div id="online-appointments" class="m-appointments-list">
              ${
            onlineAppointments.length > 0 ?
                onlineAppointments
                    .map(
                        apt => `
                  <div class="m-appointment-card m-appointment-card--online">
                    <strong>${formatTime(apt.start)}</strong> - ${
                            apt.patient?.fullName || 'Пациент'}
                    <span class="m-badge m-badge--new">Новая</span>
                    <a href="appointment-detail.html?id=${
                            apt.id}" class="m-link">Открыть</a>
                  </div>
                `).join('') :
                '<p>Нет новых онлайн-записей</p>'}
            </div>
          </div>
          <div class="m-dashboard-section">
            <h3>Сегодня</h3>
            <p>Всего записей: ${appointments.length}</p>
            <a href="schedule.html" class="m-button is-hoverable-button">Перейти к расписанию</a>
          </div>
          <div class="m-dashboard-actions">
            <a href="schedule.html" class="m-button is-hoverable-button">Создать запись</a>
            <a href="patients.html" class="m-button is-hoverable-button">Найти пациента</a>
          </div>
        `;
      } catch (error) {
        content = `
          <div class="m-dashboard-welcome">
            <h3>Добро пожаловать, ${user.name}!</h3>
            <p>Администратор</p>
          </div>
          <div class="m-dashboard-actions">
            <a href="schedule.html" class="m-button is-hoverable-button">Создать запись</a>
            <a href="patients.html" class="m-button is-hoverable-button">Найти пациента</a>
          </div>
        `;
      }
    } else if (role === 'HEAD') {
      content = `
        <div class="m-dashboard-welcome">
          <h3>Добро пожаловать, ${user.name}!</h3>
          <p>Руководитель / Главный врач</p>
        </div>
        <div class="m-dashboard-section">
          <h3>KPI за период</h3>
          <p>Данные загружаются...</p>
        </div>
        <div class="m-dashboard-actions">
          <a href="reports.html" class="m-button is-hoverable-button">Отчёты</a>
          <a href="schedule.html" class="m-button is-hoverable-button">Расписание</a>
        </div>
      `;
    } else {
      content = `
        <div class="m-dashboard-welcome">
          <h3>Добро пожаловать, ${user.name}!</h3>
          <p>Используйте навигацию для перехода к различным разделам системы.</p>
        </div>
      `;
    }

    container.innerHTML = content;
  } catch (error) {
    console.error('Ошибка загрузки дашборда:', error);
    window.apiUtils.showError(
        container, error.message || 'Ошибка загрузки данных',
        error.type || 'default');
  }
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
}

function getAppointmentWord(count) {
  if (count % 10 === 1 && count % 100 !== 11) return 'запись';
  if (count % 10 >= 2 && count % 10 <= 4 &&
      (count % 100 < 10 || count % 100 >= 20))
    return 'записи';
  return 'записей';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.api && window.apiUtils) {
      loadDashboard();
    } else {
      setTimeout(loadDashboard, 200);
    }
  });
} else {
  if (window.api && window.apiUtils) {
    loadDashboard();
  } else {
    setTimeout(loadDashboard, 200);
  }
}
})();
