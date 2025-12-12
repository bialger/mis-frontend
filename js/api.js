(function() {
'use strict';

const API_BASE = 'https://my-json-server.typicode.com/bialger/mis-mock-data';
const MOCK_API_PATH = 'api_data/mock_api.json';

let mockApiData = null;
let patientIconsCache = null;


async function loadMockApi() {
  if (mockApiData) return mockApiData;
  try {
    const response = await fetch(MOCK_API_PATH);
    if (response.ok) {
      mockApiData = await response.json();
      return mockApiData;
    }
  } catch (e) {
    console.warn('Не удалось загрузить локальные мок-данные:', e);
  }
  return null;
}


function getToken() {
  return localStorage.getItem('authToken');
}


function setToken(token) {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}


function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}


function setUser(user) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
}


function isAuthenticated() {
  return !!getToken();
}


function logout() {
  setToken(null);
  setUser(null);
  window.location.href = 'login.html';
}


function showPreloader(container) {
  if (!container) return;
  const preloader = document.createElement('div');
  preloader.className = 'm-preloader';
  preloader.innerHTML = `
    <div class="m-preloader-spinner"></div>
    <p class="m-preloader-text">Загрузка данных...</p>
  `;
  container.innerHTML = '';
  container.appendChild(preloader);
}


function hidePreloader(container) {
  if (!container) return;
  const preloader = container.querySelector('.m-preloader');
  if (preloader) {
    preloader.remove();
  }
}


function showError(container, message, type = 'network') {
  if (!container) return;
  const errorMessages = {
    network: 'Ошибка сети. Проверьте подключение к интернету.',
    notFound: 'Запрашиваемый ресурс не найден.',
    server: 'Ошибка сервера. Попробуйте позже.',
    unauthorized: 'Требуется авторизация. Пожалуйста, войдите в систему.',
    forbidden: 'У вас нет прав для выполнения этого действия.',
    default: message || 'Произошла ошибка при загрузке данных.'
  };

  const errorText = errorMessages[type] || errorMessages.default;

  const errorDiv = document.createElement('div');
  errorDiv.className = 'm-error-message';
  errorDiv.innerHTML = `
    <div class="m-error-icon">⚠️</div>
    <p class="m-error-text">${errorText}</p>
    <button class="m-button m-button--retry is-hoverable-button" onclick="location.reload()">Повторить</button>
  `;
  container.innerHTML = '';
  container.appendChild(errorDiv);
}


async function apiRequest(endpoint, options = {}) {
  const url =
      endpoint.startsWith('http') ? endpoint : `${API_BASE}/${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const token = getToken();
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {...defaultOptions.headers, ...(options.headers || {})}
  };

  try {
    const response = await fetch(url, finalOptions);

    if (response.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      let errorType = 'server';
      if (response.status === 404)
        errorType = 'notFound';
      else if (response.status === 403)
        errorType = 'forbidden';
      else if (response.status === 401)
        errorType = 'unauthorized';

      const errorData = await response.json().catch(() => ({}));
      const error =
          new Error(errorData.error?.message || `HTTP ${response.status}`);
      error.type = errorType;
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      error.type = 'network';
    }
    throw error;
  }
}


async function getFromMockApi(path) {
  const mockData = await loadMockApi();
  if (!mockData) return null;

  const parts = path.split('/').filter(p => p);
  let data = mockData;

  for (const part of parts) {
    if (data && typeof data === 'object' && part in data) {
      data = data[part];
    } else {
      return null;
    }
  }

  return Array.isArray(data) ? data : (data ? [data] : []);
}


const api = {

  async login(login, password) {
    try {
      const response = await apiRequest('users', {method: 'GET'});
      const user = Array.isArray(response) ?
          response.find(
              u => (u.name &&
                    u.name.toLowerCase().includes(login.toLowerCase())) ||
                  (u.id && u.id.toString() === login)) :
          null;

      if (user) {
        const meData = await getFromMockApi('me');
        const me = meData && meData[0] ? meData[0] : {
          user: user,
          branchScope: user.branchScope || [1],
          permissions: {
            canViewFinance: user.role === 'ADMIN' || user.role === 'HEAD',
            canEditFinance: user.role === 'ADMIN' || user.role === 'HEAD',
            canViewInventory: user.role === 'ADMIN' || user.role === 'HEAD' ||
                user.role === 'SYSADMIN',
            canWriteInventory: user.role === 'ADMIN' || user.role === 'HEAD',
            canManualEgiszSend: user.role === 'HEAD',
            canEditBackdateDays: user.role === 'DOCTOR' ? 90 : 0
          }
        };

        setToken('mock-token-' + user.id);
        setUser(me);
        return {accessToken: 'mock-token-' + user.id, user: me.user, me: me};
      }

      throw new Error('Неверный логин или пароль');
    } catch (error) {
      const mockData = await loadMockApi();
      if (mockData && mockData.users) {
        const user = mockData.users.find(
            u => (u.name &&
                  u.name.toLowerCase().includes(login.toLowerCase())) ||
                (u.id && u.id.toString() === login));

        if (user) {
          const meData = mockData.me && mockData.me[0] ? mockData.me[0] : {
            user: user,
            branchScope: user.branchScope || [1],
            permissions: {
              canViewFinance: user.role === 'ADMIN' || user.role === 'HEAD',
              canEditFinance: user.role === 'ADMIN' || user.role === 'HEAD',
              canViewInventory: user.role === 'ADMIN' || user.role === 'HEAD' ||
                  user.role === 'SYSADMIN',
              canWriteInventory: user.role === 'ADMIN' || user.role === 'HEAD',
              canManualEgiszSend: user.role === 'HEAD',
              canEditBackdateDays: user.role === 'DOCTOR' ? 90 : 0
            }
          };

          setToken('mock-token-' + user.id);
          setUser(meData);
          return {accessToken: 'mock-token-' + user.id, user: user, me: meData};
        }
      }
      throw new Error('Неверный логин или пароль');
    }
  },


  async getMe() {
    try {
      const response = await apiRequest('me');
      return Array.isArray(response) ? response[0] : response;
    } catch (error) {
      const mockData = await getFromMockApi('me');
      return mockData && mockData[0] ? mockData[0] : getUser();
    }
  },


  async getAppointments(branchId, from, to) {
    try {
      const response =
          await apiRequest(`appointments?branchId=${branchId}&from=${
              encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      const mockData = await getFromMockApi('appointments');
      if (!mockData) return [];


      const fromDate = new Date(from);
      const toDate = new Date(to);
      return mockData.filter(apt => {
        const aptDate = new Date(apt.start);
        return aptDate >= fromDate && aptDate <= toDate &&
            apt.branchId === branchId;
      });
    }
  },


  async getAppointment(id) {
    try {
      return await apiRequest(`appointments/${id}`);
    } catch (error) {
      const mockData = await getFromMockApi('appointments');
      if (mockData) {
        return mockData.find(a => a.id === parseInt(id)) || null;
      }
      return null;
    }
  },


  async createAppointment(data) {
    try {
      return await apiRequest(
          'appointments', {method: 'POST', body: JSON.stringify(data)});
    } catch (error) {
      return {id: Date.now()};
    }
  },


  async updateAppointmentStatus(id, status) {
    try {
      return await apiRequest(
          `appointments/${id}/status`,
          {method: 'POST', body: JSON.stringify({status})});
    } catch (error) {
      return {success: true};
    }
  },


  async searchPatients(query) {
    try {
      const response = await apiRequest(
          `patients${query ? `?query=${encodeURIComponent(query)}` : ''}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      const mockData = await getFromMockApi('patients');
      if (!mockData) return [];

      if (!query) return mockData;

      const q = query.toLowerCase();
      return mockData.filter(
          p => (p.fullName && p.fullName.toLowerCase().includes(q)) ||
              (p.phone && p.phone.includes(q)));
    }
  },


  async getPatient(id) {
    try {
      return await apiRequest(`patients/${id}`);
    } catch (error) {
      const mockData = await getFromMockApi('patients');
      if (mockData) {
        return mockData.find(p => p.id === parseInt(id)) || null;
      }
      return null;
    }
  },


  async createPatient(data) {
    try {
      return await apiRequest(
          'patients', {method: 'POST', body: JSON.stringify(data)});
    } catch (error) {
      return {id: Date.now()};
    }
  },


  async updatePatient(id, data) {
    try {
      return await apiRequest(
          `patients/${id}`, {method: 'PUT', body: JSON.stringify(data)});
    } catch (error) {
      return {success: true};
    }
  },


  async updatePatientIcon(id, iconId, action) {
    try {
      return await apiRequest(
          `patients/${id}/icons`,
          {method: 'POST', body: JSON.stringify({iconId, action})});
    } catch (error) {
      return {success: true};
    }
  },


  async getMedicalRecord(appointmentId) {
    try {
      return await apiRequest(`appointments/${appointmentId}/medical-record`);
    } catch (error) {
      const mockData = await getFromMockApi('medicalRecords');
      if (mockData) {
        return mockData.find(
                   mr => mr.appointmentId === parseInt(appointmentId)) ||
            null;
      }
      return null;
    }
  },


  async saveMedicalRecord(appointmentId, data) {
    try {
      return await apiRequest(
          `appointments/${appointmentId}/medical-record`,
          {method: 'PUT', body: JSON.stringify(data)});
    } catch (error) {
      return {success: true};
    }
  },


  async updatePayment(appointmentId, data) {
    try {
      return await apiRequest(
          `appointments/${appointmentId}/payment`,
          {method: 'PUT', body: JSON.stringify(data)});
    } catch (error) {
      return {success: true};
    }
  },


  async getStatusHistory(appointmentId) {
    try {
      return await apiRequest(`appointments/${appointmentId}/status-history`);
    } catch (error) {
      const mockData = await loadMockApi();
      if (mockData && mockData.statusHistory && mockData.statusHistory[appointmentId]) {
        return mockData.statusHistory[appointmentId];
      }
      return [];
    }
  },


  async getTemplates(specialty) {
    try {
      const query = specialty ? `?specialty=${encodeURIComponent(specialty)}` : '';
      const response = await apiRequest(`templates${query}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      const mockData = await getFromMockApi('templates');
      if (!mockData) return [];
      return specialty ?
          mockData.filter(t => t.specialty === specialty) :
          mockData;
    }
  },


  async saveTemplate(data) {
    try {
      return await apiRequest(
          'templates', {method: 'POST', body: JSON.stringify(data)});
    } catch (error) {
      return {id: Date.now()};
    }
  },


  async signMedicalRecord(appointmentId) {
    try {
      return await apiRequest(
          `appointments/${appointmentId}/sign`, {method: 'POST'});
    } catch (error) {
      return {success: true};
    }
  },


  async sendToEgisz(appointmentId) {
    try {
      return await apiRequest(
          `appointments/${appointmentId}/egisz-send`, {method: 'POST'});
    } catch (error) {
      return {success: true};
    }
  },


  async getInventory(branchId) {
    try {
      const response = await apiRequest(`inventory/items?branchId=${branchId}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      const mockData = await getFromMockApi('inventoryItems');
      if (!mockData) return [];
      return mockData.filter(item => item.branchId === branchId);
    }
  },


  async writeOffInventory(itemId, quantity, reason, branchId) {
    try {
      return await apiRequest(
          `inventory/items/${itemId}/write-off`,
          {method: 'POST', body: JSON.stringify({quantity, reason, branchId})});
    } catch (error) {
      console.log('Списание (мок):', {itemId, quantity, reason, branchId});
      return {success: true};
    }
  },


  async receiptInventory(itemId, quantity, comment, branchId) {
    try {
      return await apiRequest(`inventory/items/${itemId}/receipt`, {
        method: 'POST',
        body: JSON.stringify({quantity, comment, branchId})
      });
    } catch (error) {
      console.log('Поступление (мок):', {itemId, quantity, comment, branchId});
      return {success: true};
    }
  },


  async issueInventory(itemId, quantity, comment, branchId) {
    try {
      return await apiRequest(`inventory/items/${itemId}/issue`, {
        method: 'POST',
        body: JSON.stringify({quantity, comment, branchId})
      });
    } catch (error) {
      console.log('Выдача (мок):', {itemId, quantity, comment, branchId});
      return {success: true};
    }
  },


  async getBranches() {
    try {
      const response = await apiRequest('branches');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      return await getFromMockApi('branches') || [];
    }
  },


  async getServices(branchId) {
    try {
      const response = await apiRequest(
          `services${branchId ? `?branchId=${branchId}` : ''}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      const mockData = await getFromMockApi('services');
      if (!mockData) return [];
      return branchId ? mockData.filter(s => s.branchId === branchId) :
                        mockData;
    }
  },


  async getAudit(entityId) {
    try {
      const response =
          await apiRequest(`audit${entityId ? `?entityId=${entityId}` : ''}`);
      return Array.isArray(response) ? response : (response.items || []);
    } catch (error) {
      const mockData = await getFromMockApi('audit');
      if (!mockData) return [];
      return entityId ?
          mockData.filter(a => a.entityId === parseInt(entityId)) :
          mockData;
    }
  },


  async getPatientIcons() {
    if (patientIconsCache) return patientIconsCache;

    try {
      const response = await apiRequest('patientIcons');
      patientIconsCache = Array.isArray(response) ? response : [];
      return patientIconsCache;
    } catch (error) {
      const mockData = await getFromMockApi('patientIcons');
      if (mockData) {
        patientIconsCache = mockData;
        return mockData;
      }
      return [];
    }
  },


  async getRooms(branchId) {
    try {
      const response =
          await apiRequest(`rooms${branchId ? `?branchId=${branchId}` : ''}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      const mockData = await getFromMockApi('rooms');
      if (!mockData) return [];
      return branchId ? mockData.filter(r => r.branchId === branchId) :
                        mockData;
    }
  },


  async getUsers() {
    try {
      const response = await apiRequest('users');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      return await getFromMockApi('users') || [];
    }
  },


  async getFiles(entityType, entityId) {
    try {
      const params = [];
      if (entityType)
        params.push(`entityType=${encodeURIComponent(entityType)}`);
      if (entityId) params.push(`entityId=${entityId}`);
      const query = params.length > 0 ? '?' + params.join('&') : '';
      const response = await apiRequest(`files${query}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      const mockData = await getFromMockApi('files');
      if (!mockData) return [];
      return mockData.filter(
          f => (!entityType || f.entityType === entityType) &&
              (!entityId || f.entityId === parseInt(entityId)));
    }
  },


  async uploadFile(file, entityType, entityId) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);

      const token = getToken();
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
          `${API_BASE}/files`,
          {method: 'POST', headers, body: formData});
      if (!response.ok) throw new Error('Upload failed');
      return await response.json();
    } catch (error) {
      return {id: Date.now(), success: true};
    }
  },


  async deleteFile(fileId) {
    try {
      return await apiRequest(`files/${fileId}`, {method: 'DELETE'});
    } catch (error) {
      return {success: true};
    }
  },


  async getScheduleSlots(doctorId, branchId, from, to) {
    try {
      const params = [];
      if (doctorId) params.push(`doctorId=${doctorId}`);
      if (branchId) params.push(`branchId=${branchId}`);
      if (from) params.push(`from=${encodeURIComponent(from)}`);
      if (to) params.push(`to=${encodeURIComponent(to)}`);
      const query = params.length > 0 ? '?' + params.join('&') : '';
      const response = await apiRequest(`scheduleSlots${query}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      const mockData = await getFromMockApi('scheduleSlots');
      if (!mockData) return [];
      return mockData.filter(
          slot => (!doctorId || slot.doctorId === doctorId) &&
              (!branchId || slot.branchId === branchId));
    }
  }
};


async function getIconEmoji(iconId) {
  if (!iconId) return '';

  try {
    const icons = await api.getPatientIcons();
    const icon = icons.find(i => i.id === iconId && i.isActive);
    return icon ? icon.emoji : '';
  } catch (error) {
    console.warn('Ошибка получения иконки:', error);
    return '';
  }
}


async function getIconsEmoji(iconIds) {
  if (!iconIds || !Array.isArray(iconIds) || iconIds.length === 0) return '';

  try {
    const icons = await api.getPatientIcons();
    const emojis = iconIds
                       .map(id => {
                         const icon =
                             icons.find(i => i.id === id && i.isActive);
                         return icon ? icon.emoji : '';
                       })
                       .filter(Boolean);
    return emojis.join(' ');
  } catch (error) {
    console.warn('Ошибка получения иконок:', error);
    return '';
  }
}


window.api = api;
window.apiUtils = {
  showPreloader,
  hidePreloader,
  showError,
  getToken,
  setToken,
  getUser,
  setUser,
  isAuthenticated,
  logout,
  getIconEmoji,
  getIconsEmoji
};
})();
