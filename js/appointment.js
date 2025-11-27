(function() {
'use strict';

const STORAGE_KEY = 'medical-crm-appointments';
let appointmentItems = [];
let editingId = null;

function loadAppointmentsFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      appointmentItems = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Ошибка загрузки данных из localStorage:', e);
    appointmentItems = [];
  }
}

function saveAppointmentsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointmentItems));
  } catch (e) {
    console.error('Ошибка сохранения данных в localStorage:', e);
  }
}

function validateForm(formData) {
  const errors = {};

  if (!formData.fullname || formData.fullname.trim().length < 3) {
    errors.fullname = 'ФИО должно содержать не менее 3 символов';
  } else if (!/^[А-Яа-яЁёA-Za-z\s]+$/.test(formData.fullname.trim())) {
    errors.fullname = 'ФИО должно содержать только буквы';
  }

  if (!formData.phone || !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
    errors.phone = 'Введите корректный номер телефона';
  }

  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Введите корректный email адрес';
  }

  if (!formData.service) {
    errors.service = 'Выберите услугу';
  }

  if (!formData.doctor) {
    errors.doctor = 'Выберите врача';
  }

  if (!formData.date) {
    errors.date = 'Выберите дату приема';
  } else {
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      errors.date = 'Дата не может быть в прошлом';
    }
  }

  if (!formData.time) {
    errors.time = 'Выберите время приема';
  }

  if (formData.message && formData.message.trim().length > 500) {
    errors.message = 'Комментарий не должен превышать 500 символов';
  }

  return errors;
}

function displayFormErrors(errors) {
  Object.keys(errors).forEach(function(fieldName) {
    const errorElement = document.getElementById(fieldName + '-error');
    const inputElement = document.getElementById(fieldName);
    
    if (errorElement) {
      errorElement.textContent = errors[fieldName] || '';
      errorElement.style.display = errors[fieldName] ? 'block' : 'none';
    }
    
    if (inputElement) {
      if (errors[fieldName]) {
        inputElement.classList.add('is-invalid');
      } else {
        inputElement.classList.remove('is-invalid');
      }
    }
  });
}

function clearFormErrors() {
  const errorElements = document.querySelectorAll('.m-form-error');
  errorElements.forEach(function(el) {
    el.textContent = '';
    el.style.display = 'none';
  });
  
  const inputElements = document.querySelectorAll('.m-input, .m-textarea, .m-select');
  inputElements.forEach(function(el) {
    el.classList.remove('is-invalid');
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatDateTime(dateString, timeString) {
  const date = formatDate(dateString);
  return `${date} в ${timeString}`;
}

function formatStatus(status) {
  const statusMap = {
    'new': { text: 'Новая', class: 'm-status-new' },
    'confirmed': { text: 'Подтверждена', class: 'm-status-confirmed' },
    'cancelled': { text: 'Отменена', class: 'm-status-cancelled' }
  };
  const statusInfo = statusMap[status] || statusMap['new'];
  return `<span class="${statusInfo.class}">${statusInfo.text}</span>`;
}

function createAppointmentElement(item) {
  const template = document.getElementById('appointment-item-template');
  if (!template) return null;

  const clone = template.content.cloneNode(true);
  const article = clone.querySelector('.m-appointment-item');
  
  article.setAttribute('data-id', item.id);
  
  article.querySelector('.m-appointment-name').textContent = item.fullname;
  
  const emailElement = article.querySelector('.m-appointment-email');
  if (item.email) {
    emailElement.textContent = item.email;
    emailElement.style.display = 'block';
  } else {
    emailElement.style.display = 'none';
  }
  
  article.querySelector('.m-appointment-date').textContent = formatDate(item.createdDate);
  article.querySelector('.m-appointment-status').innerHTML = formatStatus(item.status || 'new');
  
  article.querySelector('.m-appointment-service-name').textContent = item.service;
  article.querySelector('.m-appointment-doctor-name').textContent = item.doctor;
  article.querySelector('.m-appointment-datetime-value').textContent = formatDateTime(item.date, item.time);
  
  const phoneElement = article.querySelector('.m-appointment-phone');
  const phoneValueElement = article.querySelector('.m-appointment-phone-value');
  if (item.phone) {
    phoneValueElement.textContent = item.phone;
    phoneElement.style.display = 'block';
  } else {
    phoneElement.style.display = 'none';
  }

  const messageElement = article.querySelector('.m-appointment-message');
  if (item.message && item.message.trim()) {
    messageElement.innerHTML = `<strong>Комментарий:</strong> ${item.message}`;
    messageElement.style.display = 'block';
  } else {
    messageElement.style.display = 'none';
  }

  const editButton = article.querySelector('.m-button--edit');
  const deleteButton = article.querySelector('.m-button--delete');

  editButton.addEventListener('click', function() {
    editAppointmentItem(item.id);
  });

  deleteButton.addEventListener('click', function() {
    deleteAppointmentItem(item.id);
  });

  return article;
}

function renderAppointmentList() {
  const listContainer = document.getElementById('appointment-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  if (appointmentItems.length === 0) {
    listContainer.innerHTML = '<p class="m-appointment-empty">Пока нет записей. Создайте первую запись!</p>';
    return;
  }

  appointmentItems.sort(function(a, b) {
    const dateA = new Date(a.date + 'T' + a.time);
    const dateB = new Date(b.date + 'T' + b.time);
    return dateA - dateB;
  });

  appointmentItems.forEach(function(item) {
    const element = createAppointmentElement(item);
    if (element) {
      listContainer.appendChild(element);
    }
  });
}

function addAppointmentItem(formData) {
  const newItem = {
    id: Date.now().toString(),
    fullname: formData.fullname.trim(),
    phone: formData.phone.trim(),
    email: formData.email ? formData.email.trim() : '',
    service: formData.service,
    doctor: formData.doctor,
    date: formData.date,
    time: formData.time,
    message: formData.message ? formData.message.trim() : '',
    status: 'new',
    createdDate: new Date().toISOString()
  };

  appointmentItems.push(newItem);
  saveAppointmentsToStorage();
  renderAppointmentList();
}

function editAppointmentItem(id) {
  const item = appointmentItems.find(function(i) {
    return i.id === id;
  });

  if (!item) return;

  editingId = id;

  const form = document.getElementById('appointment-form');
  if (!form) return;

  document.getElementById('fullname').value = item.fullname;
  document.getElementById('phone').value = item.phone;
  document.getElementById('email').value = item.email;
  document.getElementById('service').value = item.service;
  document.getElementById('doctor').value = item.doctor;
  document.getElementById('date').value = item.date;
  document.getElementById('time').value = item.time;
  document.getElementById('message').value = item.message;

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = 'Сохранить изменения';
  }

  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateAppointmentItem(id, formData) {
  const itemIndex = appointmentItems.findIndex(function(i) {
    return i.id === id;
  });

  if (itemIndex === -1) return;

  appointmentItems[itemIndex] = {
    id: id,
    fullname: formData.fullname.trim(),
    phone: formData.phone.trim(),
    email: formData.email ? formData.email.trim() : '',
    service: formData.service,
    doctor: formData.doctor,
    date: formData.date,
    time: formData.time,
    message: formData.message ? formData.message.trim() : '',
    status: appointmentItems[itemIndex].status,
    createdDate: appointmentItems[itemIndex].createdDate
  };

  saveAppointmentsToStorage();
  renderAppointmentList();
  editingId = null;

  const form = document.getElementById('appointment-form');
  if (form) {
    form.reset();
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Создать запись';
    }
  }
}

function deleteAppointmentItem(id) {
  if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
    return;
  }

  appointmentItems = appointmentItems.filter(function(item) {
    return item.id !== id;
  });

  saveAppointmentsToStorage();
  renderAppointmentList();
}

function handleFormSubmit(e) {
  e.preventDefault();
  clearFormErrors();

  const form = e.target;
  const formData = {
    fullname: form.fullname.value,
    phone: form.phone.value,
    email: form.email.value,
    service: form.service.value,
    doctor: form.doctor.value,
    date: form.date.value,
    time: form.time.value,
    message: form.message.value
  };

  const errors = validateForm(formData);
  
  if (Object.keys(errors).length > 0) {
    displayFormErrors(errors);
    return;
  }

  if (editingId) {
    updateAppointmentItem(editingId, formData);
  } else {
    addAppointmentItem(formData);
  }

  form.reset();
  clearFormErrors();
  
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = 'Создать запись';
  }
}

function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      loadAppointmentsFromStorage();
      renderAppointmentList();
      
      const form = document.getElementById('appointment-form');
      if (form) {
        form.addEventListener('submit', handleFormSubmit);
        
        const dateInput = document.getElementById('date');
        if (dateInput) {
          const today = new Date().toISOString().split('T')[0];
          dateInput.setAttribute('min', today);
        }
      }
    });
  } else {
    loadAppointmentsFromStorage();
    renderAppointmentList();
    
    const form = document.getElementById('appointment-form');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
      
      const dateInput = document.getElementById('date');
      if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
      }
    }
  }
}

init();
})();

