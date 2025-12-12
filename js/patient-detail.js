(function() {
'use strict';

async function loadPatientDetail() {
  const container = document.getElementById('patient-detail-content');
  if (!container || !window.api) return;

  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('id');

  if (!patientId) {
    container.innerHTML = '<p>ID пациента не указан</p>';
    return;
  }

  window.apiUtils.showPreloader(container);

  try {
    const patient = await window.api.getPatient(patientId);

    if (!patient) {
      window.apiUtils.showError(container, 'Пациент не найден', 'notFound');
      return;
    }


    let appointments = [];
    try {
      const today = new Date();
      const from = new Date(today.getFullYear() - 1, 0, 1).toISOString();
      const to = new Date().toISOString();
      const allAppointments = await window.api.getAppointments(1, from, to);
      appointments = allAppointments.filter(
          apt => apt.patient?.id === parseInt(patientId));
    } catch (error) {
      console.warn('Не удалось загрузить историю визитов:', error);
    }

    let content = `
      <div class="m-patient-detail">
        <div class="m-patient-header">
          <h3>${patient.fullName || 'Без имени'}</h3>
          ${
        patient.icons && patient.icons.length > 0 ?
            '<div class="m-patient-icons" id="patient-icons-' + patient.id +
                '">Загрузка...</div>' :
            ''}
        </div>
        
        <div class="m-patient-info">
          <h4>Контактная информация</h4>
          <p><strong>Телефон:</strong> ${patient.phone || 'Не указано'}</p>
          ${
        patient.dob ? `<p><strong>Дата рождения:</strong> ${
                          formatDate(patient.dob)}</p>` :
                      ''}
        </div>
        
        <div class="m-patient-history">
          <h4>История визитов</h4>
          ${
        appointments.length > 0 ?
            `
            <p>Всего визитов: ${appointments.length}</p>
            <div class="m-appointments-list">
              ${
                appointments
                    .map(
                        apt => `
                <div class="m-appointment-item">
                  <p><strong>${formatDateTime(apt.start)}</strong> - ${
                            getStatusText(apt.status)}</p>
                  <a href="appointment-detail.html?id=${
                            apt.id}" class="m-link">Открыть запись</a>
                </div>
              `).join('')}
            </div>
          ` :
            '<p>История визитов отсутствует</p>'}
        </div>
      </div>
    `;

    container.innerHTML = content;


    if (patient.icons && patient.icons.length > 0) {
      const iconsElement =
          document.getElementById('patient-icons-' + patient.id);
      if (iconsElement) {
        window.apiUtils.getIconsEmoji(patient.icons).then(emojis => {
          iconsElement.innerHTML = emojis || 'нет';
        });
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки пациента:', error);
    window.apiUtils.showError(
        container, error.message || 'Ошибка загрузки пациента',
        error.type || 'default');
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU');
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU');
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
      loadPatientDetail();
    } else {
      setTimeout(loadPatientDetail, 200);
    }
  });
} else {
  if (window.api && window.apiUtils) {
    loadPatientDetail();
  } else {
    setTimeout(loadPatientDetail, 200);
  }
}
})();
