(function() {
'use strict';

let lastSearchQuery = '';

async function initPatients() {
  const container = document.getElementById('patients-content');
  const searchInput = document.getElementById('patient-search');
  const searchBtn = document.getElementById('search-btn');
  const createBtn = document.getElementById('create-patient-btn');

  if (!container || !window.api) return;


  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        searchPatients();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', searchPatients);
  }

  if (createBtn) {
    createBtn.addEventListener('click', function() {
      const fullName = prompt('Введите ФИО пациента:');
      const phone = prompt('Введите телефон пациента:');

      if (fullName && phone) {
        createPatient({fullName, phone});
      }
    });
  }


  loadAllPatients();
}

async function loadAllPatients() {
  await searchPatients('');
}

async function searchPatients(query) {
  const container = document.getElementById('patients-content');
  const searchInput = document.getElementById('patient-search');

  if (!container || !window.api) return;

  const searchQuery = query !== undefined ?
      query :
      (searchInput ? searchInput.value.trim() : '');
  lastSearchQuery = searchQuery;


  const randomFilter = Math.random() > 0.5 ? 'all' : 'with-icons';

  window.apiUtils.showPreloader(container);

  try {
    let patients = await window.api.searchPatients(searchQuery);


    if (randomFilter === 'with-icons' && patients.length > 0) {
      patients = patients.filter(p => p.icons && p.icons.length > 0);
    }

    if (patients.length === 0) {
      container.innerHTML = '<p>Пациенты не найдены</p>';
      return;
    }

    const template = document.getElementById('patient-item-template');
    if (!template) {
      container.innerHTML = '<p>Шаблон не найден</p>';
      return;
    }

    container.innerHTML = `<h3>Найдено пациентов: ${
        patients
            .length}</h3><div class="m-patients-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem;"></div>`;
    const grid = container.querySelector('.m-patients-grid');

    patients.forEach(patient => {
      const clone = template.content.cloneNode(true);
      const card = clone.querySelector('.m-patient-card');

      card.setAttribute('data-patient-id', patient.id);

      const name = clone.querySelector('.m-patient-name');
      const icons = clone.querySelector('.m-patient-icons');
      const phone = clone.querySelector('.m-patient-phone');
      const dob = clone.querySelector('.m-patient-dob');
      const link = clone.querySelector('.m-button--view');

      if (name) {
        name.textContent = patient.fullName || 'Без имени';
      }

      if (icons && patient.icons && patient.icons.length > 0) {
        window.apiUtils.getIconsEmoji(patient.icons).then(emojis => {
          icons.innerHTML = emojis;
        });
      }

      if (phone) {
        phone.textContent = 'Телефон: ' + (patient.phone || 'не указан');
      }

      if (dob && patient.dob) {
        dob.textContent = 'Дата рождения: ' + formatDate(patient.dob);
      }

      if (link) {
        link.href = `patient-detail.html?id=${patient.id}`;
      }

      grid.appendChild(clone);
    });
  } catch (error) {
    console.error('Ошибка поиска пациентов:', error);
    window.apiUtils.showError(
        container, error.message || 'Ошибка загрузки пациентов',
        error.type || 'default');
  }
}

async function createPatient(data) {
  if (!window.api) return;

  try {
    const result = await window.api.createPatient(data);
    if (result && result.id) {
      alert('Пациент успешно создан!');
      searchPatients(lastSearchQuery);
    }
  } catch (error) {
    console.error('Ошибка создания пациента:', error);
    alert(
        'Ошибка создания пациента: ' + (error.message || 'Неизвестная ошибка'));
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.api && window.apiUtils) {
      initPatients();
    } else {
      setTimeout(initPatients, 200);
    }
  });
} else {
  if (window.api && window.apiUtils) {
    initPatients();
  } else {
    setTimeout(initPatients, 200);
  }
}
})();
