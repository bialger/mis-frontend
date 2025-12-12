(function() {
'use strict';

async function loadAppointmentDetail() {
  const container = document.getElementById('appointment-detail-content');
  if (!container || !window.api) return;

  const urlParams = new URLSearchParams(window.location.search);
  const appointmentId = urlParams.get('id');

  if (!appointmentId) {
    container.innerHTML = '<p>ID записи не указан</p>';
    return;
  }

  window.apiUtils.showPreloader(container);

  try {
    const appointment = await window.api.getAppointment(appointmentId);

    if (!appointment) {
      window.apiUtils.showError(container, 'Запись не найдена', 'notFound');
      return;
    }

    const me = await window.api.getMe();
    const user = me.user || window.apiUtils.getUser()?.user;
    const permissions = me.permissions || {};

    const canViewFinance = permissions.canViewFinance ||
        user?.role === 'ADMIN' || user?.role === 'HEAD';
    const canEditFinance = permissions.canEditFinance ||
        user?.role === 'ADMIN' || user?.role === 'HEAD';
    const isDoctor = user?.role === 'DOCTOR';

    let content = `
      <div class="m-appointment-detail">
        <div class="m-appointment-header">
          <h3>Запись #${appointment.id}</h3>
          <div class="m-appointment-meta">
            <p><strong>Дата и время:</strong> ${
        formatDateTime(appointment.start)}</p>
            <p><strong>Статус:</strong> <span class="m-status-${
        appointment.status.toLowerCase()}">${
        getStatusText(appointment.status)}</span></p>
          </div>
        </div>
        
        <div class="m-appointment-patient">
          <h4>Пациент</h4>
          <p><strong>ФИО:</strong> ${
        appointment.patient?.fullName || 'Не указано'}</p>
          <p><strong>Телефон:</strong> ${
        appointment.patient?.phone || 'Не указано'}</p>
          ${
        appointment.patient?.icons && appointment.patient.icons.length > 0 ?
            '<p><strong>Пометки:</strong> <span id="patient-icons-' +
                appointment.id + '">Загрузка...</span></p>' :
            ''}
          ${
        appointment.patient?.id ?
            `<p><a href="patient-detail.html?id=${
                appointment.patient
                    .id}" class="m-link">Открыть карточку пациента</a></p>` :
            ''}
        </div>
    `;


    if (canViewFinance && appointment.payment) {
      content += `
        <div class="m-appointment-payment">
          <h4>Оплата</h4>
          <p><strong>Сумма:</strong> ${appointment.payment.total || 0} ₽</p>
          <p><strong>Оплачено:</strong> ${appointment.payment.paid || 0} ₽</p>
          ${
          appointment.payment.method ?
              `<p><strong>Способ:</strong> ${appointment.payment.method}</p>` :
              ''}
          ${
          appointment.payment.flags ?
              `
            <div class="m-payment-flags">
              ${
                  appointment.payment.flags.noCashbox ?
                      '<span class="m-badge">Без кассы</span>' :
                      ''}
              ${
                  appointment.payment.flags.payLater ?
                      '<span class="m-badge">Оплата позже</span>' :
                      ''}
              ${
                  appointment.payment.flags.partial ?
                      '<span class="m-badge">Частичная оплата</span>' :
                      ''}
            </div>
          ` :
              ''}
        </div>
      `;
    }


    if (canEditFinance) {
      content += `
        <div class="m-appointment-status-control">
          <h4>Изменение статуса</h4>
          <div class="m-status-buttons">
            <button class="m-button" onclick="updateStatus('CONFIRMED')">Подтвердить</button>
            <button class="m-button" onclick="updateStatus('ARRIVED')">Пришёл</button>
            <button class="m-button" onclick="updateStatus('NO_SHOW')">Не пришёл</button>
            <button class="m-button" onclick="updateStatus('CANCELED')">Отменить</button>
          </div>
        </div>
      `;
    }


    if (isDoctor || user?.role === 'HEAD') {
      try {
        const medicalRecord = await window.api.getMedicalRecord(appointmentId);

        content += `
          <div class="m-appointment-medical">
            <h4>Медицинская запись</h4>
            ${
            medicalRecord && !medicalRecord.locked ?
                `
              <div class="m-medical-sections">
                ${
                    medicalRecord.sections ?
                        `
                  <div><strong>Жалобы:</strong> ${
                            medicalRecord.sections.complaints ||
                            'Не указано'}</div>
                  <div><strong>Анамнез:</strong> ${
                            medicalRecord.sections.anamnesis ||
                            'Не указано'}</div>
                  <div><strong>Осмотр:</strong> ${
                            medicalRecord.sections.examination ||
                            'Не указано'}</div>
                  ${
                            medicalRecord.sections.diagnoses &&
                                    medicalRecord.sections.diagnoses.length >
                                        0 ?
                                `
                    <div><strong>Диагнозы:</strong>
                      <ul>
                        ${
                                    medicalRecord.sections.diagnoses
                                        .map(
                                            d => `<li>${d.text} (${
                                                d.code || ''})</li>`)
                                        .join('')}
                      </ul>
                    </div>
                  ` :
                                ''}
                  <div><strong>Назначения:</strong> ${
                            medicalRecord.sections.orders || 'Не указано'}</div>
                  <div><strong>Процедуры:</strong> ${
                            medicalRecord.sections.procedures ||
                            'Не указано'}</div>
                  <div><strong>Эпикриз:</strong> ${
                            medicalRecord.sections.epicrisis ||
                            'Не указано'}</div>
                ` :
                        '<p>Медицинская запись пуста</p>'}
              </div>
            ` :
                `
              <p class="m-locked-message">${
                    medicalRecord?.lockReason || 'Редактирование закрыто'}</p>
            `}
          </div>
        `;
      } catch (error) {
        content += `
          <div class="m-appointment-medical">
            <h4>Медицинская запись</h4>
            <p>Медицинская запись отсутствует</p>
          </div>
        `;
      }
    }

    content += '</div>';

    container.innerHTML = content;


    if (appointment.patient?.icons && appointment.patient.icons.length > 0) {
      const iconsElement =
          document.getElementById('patient-icons-' + appointment.id);
      if (iconsElement) {
        window.apiUtils.getIconsEmoji(appointment.patient.icons)
            .then(emojis => {
              iconsElement.textContent = emojis || 'нет';
            });
      }
    }


    window.currentAppointmentId = appointmentId;
  } catch (error) {
    console.error('Ошибка загрузки записи:', error);
    window.apiUtils.showError(
        container, error.message || 'Ошибка загрузки записи',
        error.type || 'default');
  }
}

async function updateStatus(status) {
  if (!window.currentAppointmentId || !window.api) return;

  try {
    await window.api.updateAppointmentStatus(
        window.currentAppointmentId, status);
    alert('Статус обновлён');
    loadAppointmentDetail();
  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
    alert(
        'Ошибка обновления статуса: ' +
        (error.message || 'Неизвестная ошибка'));
  }
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

window.updateStatus = updateStatus;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.api && window.apiUtils) {
      loadAppointmentDetail();
    } else {
      setTimeout(loadAppointmentDetail, 200);
    }
  });
} else {
  if (window.api && window.apiUtils) {
    loadAppointmentDetail();
  } else {
    setTimeout(loadAppointmentDetail, 200);
  }
}
})();
