(function() {
'use strict';

async function initDoctors() {
  const container = document.getElementById('doctors-content');
  if (!container || !window.api) return;

  window.apiUtils.showPreloader(container);

  try {
    const users = await window.api.getUsers();
    const doctors = users.filter(u => u.role === 'DOCTOR' || u.role === 'HEAD');


    const branches = await window.api.getBranches();
    const branchMap = {};
    branches.forEach(b => branchMap[b.id] = b.name);


    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                            .toISOString()
                            .split('T')[0];

    let appointments = [];
    try {
      const me = await window.api.getMe();
      const branchId =
          me.branchScope && me.branchScope.length > 0 ? me.branchScope[0] : 1;
      appointments = await window.api.getAppointments(
          branchId, today + 'T00:00:00Z', weekFromNow + 'T23:59:59Z');
    } catch (e) {
      console.warn('Не удалось загрузить записи для статистики:', e);
    }


    const doctorStats = {};
    appointments.forEach(apt => {
      if (apt.doctorId) {
        if (!doctorStats[apt.doctorId]) {
          doctorStats[apt.doctorId] = {total: 0, booked: 0, confirmed: 0};
        }
        doctorStats[apt.doctorId].total++;
        if (apt.status === 'BOOKED') doctorStats[apt.doctorId].booked++;
        if (apt.status === 'CONFIRMED') doctorStats[apt.doctorId].confirmed++;
      }
    });

    if (doctors.length === 0) {
      container.innerHTML = '<p>Врачи не найдены</p>';
      return;
    }


    let doctorsHTML = `
      <div class="m-grid m-grid--doctors" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
    `;

    doctors.forEach(doctor => {
      const stats =
          doctorStats[doctor.id] || {total: 0, booked: 0, confirmed: 0};
      const branchNames = (doctor.branchScope || [])
                              .map(id => branchMap[id] || `Филиал ${id}`)
                              .join(', ') ||
          'Не указан';

      doctorsHTML += `
        <article class="m-card is-hoverable">
          <h3>${doctor.name || 'Без имени'}</h3>
          <p><strong>Роль:</strong> ${
          doctor.role === 'HEAD' ? 'Главный врач' : 'Врач'}</p>
          <p><strong>Филиалы:</strong> ${branchNames}</p>
          <p><strong>Записей на неделю:</strong> ${stats.total}</p>
          <p><strong>Подтверждено:</strong> ${stats.confirmed}</p>
        </article>
      `;
    });

    doctorsHTML += '</div>';


    let scheduleHTML = `
      <h3 style="margin-top: 2rem;">Расписание врачей</h3>
      <table class="m-table m-table--doctors">
        <thead>
          <tr>
            <th>Врач</th>
            <th>Роль</th>
            <th>Филиалы</th>
            <th>Записей на неделю</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
    `;

    doctors.forEach(doctor => {
      const stats =
          doctorStats[doctor.id] || {total: 0, booked: 0, confirmed: 0};
      const branchNames = (doctor.branchScope || [])
                              .map(id => branchMap[id] || `Филиал ${id}`)
                              .join(', ') ||
          'Не указан';
      const roleText = doctor.role === 'HEAD' ? 'Главный врач' : 'Врач';
      const statusText = stats.total > 0 ? 'Активен' : 'Нет записей';

      scheduleHTML += `
        <tr>
          <td>${doctor.name || 'Без имени'}</td>
          <td>${roleText}</td>
          <td>${branchNames}</td>
          <td>${stats.total}</td>
          <td>${statusText}</td>
        </tr>
      `;
    });

    scheduleHTML += `
        </tbody>
      </table>
    `;


    const totalDoctors = doctors.length;
    const activeDoctors =
        doctors.filter(d => (doctorStats[d.id]?.total || 0) > 0).length;
    const totalAppointments =
        Object.values(doctorStats).reduce((sum, s) => sum + s.total, 0);
    const avgLoad = totalDoctors > 0 ?
        Math.round((totalAppointments / totalDoctors) * 10) / 10 :
        0;

    const statsHTML = `
      <article class="m-card is-hoverable" style="margin-bottom: 2rem;">
        <h3>Статистика врачей</h3>
        <ul>
          <li>Всего врачей: <strong>${totalDoctors}</strong></li>
          <li>Активных специалистов: <strong>${activeDoctors}</strong></li>
          <li>Всего записей на неделю: <strong>${
        totalAppointments}</strong></li>
          <li>Средняя загруженность: <strong>${
        avgLoad} записей/врач</strong></li>
        </ul>
      </article>
    `;

    container.innerHTML = statsHTML + doctorsHTML + scheduleHTML;
  } catch (error) {
    console.error('Ошибка загрузки врачей:', error);
    window.apiUtils.showError(
        container, error.message || 'Ошибка загрузки данных врачей',
        error.type || 'default');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.api && window.apiUtils) {
      initDoctors();
    } else {
      setTimeout(initDoctors, 200);
    }
  });
} else {
  if (window.api && window.apiUtils) {
    initDoctors();
  } else {
    setTimeout(initDoctors, 200);
  }
}
})();
