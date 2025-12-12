(function() {
'use strict';

async function initAppointmentForm() {
  const form = document.getElementById('appointment-form');
  const listContainer = document.getElementById('appointment-list');

  if (!form || !window.api) return;


  try {
    const me = await window.api.getMe();
    const branchId =
        me.branchScope && me.branchScope[0] ? me.branchScope[0] : 1;

    const services = await window.api.getServices(branchId);
    const serviceSelect = document.getElementById('service');
    if (serviceSelect && services.length > 0) {
      serviceSelect.innerHTML = '<option value="">Выберите услугу</option>';
      services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent =
            `${service.name} - ${service.price} ₽ (${service.durationMin} мин)`;
        serviceSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.warn('Не удалось загрузить услуги:', error);
  }


  const dateInput = document.getElementById('date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }


  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
      fullname: form.fullname.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      service: form.service.value,
      doctor: form.doctor.value,
      date: form.date.value,
      time: form.time.value,
      message: form.message.value.trim()
    };


    if (!formData.fullname || formData.fullname.length < 3) {
      alert('ФИО должно содержать не менее 3 символов');
      return;
    }

    if (!formData.phone) {
      alert('Введите телефон');
      return;
    }

    if (!formData.service) {
      alert('Выберите услугу');
      return;
    }

    if (!formData.date || !formData.time) {
      alert('Выберите дату и время');
      return;
    }


    try {
      let patients = await window.api.searchPatients(formData.phone);
      let patientId = null;

      if (patients.length > 0) {
        patientId = patients[0].id;
      } else {
        const newPatient = await window.api.createPatient(
            {fullName: formData.fullname, phone: formData.phone});
        patientId = newPatient.id;
      }


      const me = await window.api.getMe();
      const branchId =
          me.branchScope && me.branchScope[0] ? me.branchScope[0] : 1;

      const startDateTime = new Date(formData.date + 'T' + formData.time);
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);

      await window.api.createAppointment({
        branchId: branchId,
        doctorId: 1,
        roomId: 1,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        patientId: patientId
      });

      alert('Запись успешно создана!');
      form.reset();


      if (listContainer) {
        loadAppointmentsList();
      }
    } catch (error) {
      console.error('Ошибка создания записи:', error);
      alert(
          'Ошибка создания записи: ' + (error.message || 'Неизвестная ошибка'));
    }
  });


  if (listContainer) {
    loadAppointmentsList();
  }
}

async function loadAppointmentsList() {
  const container = document.getElementById('appointment-list');
  if (!container || !window.api) return;

  window.apiUtils.showPreloader(container);

  try {
    const me = await window.api.getMe();
    const branchId =
        me.branchScope && me.branchScope[0] ? me.branchScope[0] : 1;

    const today = new Date();
    const from =
        new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const to =
        new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
            .toISOString();

    const appointments = await window.api.getAppointments(branchId, from, to);

    const template = document.getElementById('appointment-item-template');

    if (appointments.length === 0) {
      container.innerHTML =
          '<p class="m-appointment-empty">Пока нет записей. Создайте первую запись!</p>';
      return;
    }

    container.innerHTML = '';

    appointments.sort((a, b) => new Date(a.start) - new Date(b.start));

    appointments.forEach(apt => {
      if (!template) return;

      const clone = template.content.cloneNode(true);
      const article = clone.querySelector('.m-appointment-item');

      article.setAttribute('data-id', apt.id);

      article.querySelector('.m-appointment-name').textContent =
          apt.patient?.fullName || 'Пациент';
      article.querySelector('.m-appointment-email').textContent =
          apt.patient?.phone || '';
      article.querySelector('.m-appointment-date').textContent =
          formatDate(apt.start);
      article.querySelector('.m-appointment-status').innerHTML =
          formatStatus(apt.status);
      article.querySelector('.m-appointment-service-name').textContent =
          'Услуга';
      article.querySelector('.m-appointment-doctor-name').textContent = 'Врач';
      article.querySelector('.m-appointment-datetime-value').textContent =
          formatDateTime(apt.start);
      article.querySelector('.m-appointment-phone-value').textContent =
          apt.patient?.phone || '';

      const editButton = article.querySelector('.m-button--edit');
      const deleteButton = article.querySelector('.m-button--delete');

      if (editButton) {
        editButton.addEventListener('click', function() {
          window.location.href = `appointment-detail.html?id=${apt.id}`;
        });
      }

      if (deleteButton) {
        deleteButton.style.display = 'none';
      }

      container.appendChild(clone);
    });
  } catch (error) {
    console.error('Ошибка загрузки записей:', error);
    window.apiUtils.showError(
        container, error.message || 'Ошибка загрузки записей',
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

function formatStatus(status) {
  const statusMap = {
    'BOOKED': {text: 'Записан', class: 'm-status-booked'},
    'CONFIRMED': {text: 'Подтверждён', class: 'm-status-confirmed'},
    'ARRIVED': {text: 'Пришёл', class: 'm-status-arrived'},
    'NO_SHOW': {text: 'Не пришёл', class: 'm-status-no_show'},
    'CANCELED': {text: 'Отменён', class: 'm-status-canceled'}
  };
  const statusInfo =
      statusMap[status] || {text: status, class: 'm-status-booked'};
  return `<span class="${statusInfo.class}">${statusInfo.text}</span>`;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.api && window.apiUtils) {
      initAppointmentForm();
    } else {
      setTimeout(initAppointmentForm, 200);
    }
  });
} else {
  if (window.api && window.apiUtils) {
    initAppointmentForm();
  } else {
    setTimeout(initAppointmentForm, 200);
  }
}
})();
