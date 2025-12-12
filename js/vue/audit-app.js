const { createApp } = Vue;

createApp({
  data() {
    return {
      loading: false,
      error: null,
      auditLogs: [],
      users: [],
      filters: {
        entityType: null,
        dateFrom: null,
        dateTo: null
      }
    };
  },
  async mounted() {
    await this.init();
  },
  methods: {
    async init() {
      if (!window.api) {
        setTimeout(() => this.init(), 200);
        return;
      }

      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      this.filters.dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
      this.filters.dateTo = today.toISOString().split('T')[0];

      try {
        this.users = await window.api.getUsers();
      } catch (error) {
        console.warn('Не удалось загрузить пользователей:', error);
      }

      await this.loadAudit();
    },
    async loadAudit() {
      if (!window.api) return;

      this.loading = true;
      this.error = null;

      try {
        let auditLogs = await window.api.getAudit();

        if (this.filters.entityType) {
          auditLogs = auditLogs.filter(log => log.entityType === this.filters.entityType);
        }

        if (this.filters.dateFrom) {
          const fromDate = new Date(this.filters.dateFrom + 'T00:00:00Z');
          auditLogs = auditLogs.filter(log => {
            const logDate = new Date(log.ts);
            return logDate >= fromDate;
          });
        }

        if (this.filters.dateTo) {
          const toDate = new Date(this.filters.dateTo + 'T23:59:59Z');
          auditLogs = auditLogs.filter(log => {
            const logDate = new Date(log.ts);
            return logDate <= toDate;
          });
        }

        auditLogs.sort((a, b) => new Date(b.ts) - new Date(a.ts));
        this.auditLogs = auditLogs;

        this.loading = false;
      } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        this.error = error.message || 'Ошибка загрузки логов';
        this.loading = false;
      }
    },
    getUserName(userId) {
      const user = this.users.find(u => u.id === userId);
      return user ? user.name : `ID: ${userId}`;
    },
    getEntityTypeText(type) {
      const types = {
        'APPOINTMENT': 'Запись',
        'PATIENT': 'Пациент',
        'INVENTORY': 'Склад',
        'USER': 'Пользователь',
        'MEDICAL_RECORD': 'Медицинская запись',
        'FILE': 'Файл'
      };
      return types[type] || type;
    },
    getActionText(action) {
      const actions = {
        'APPOINTMENT_CREATE': 'Создание записи',
        'APPOINTMENT_UPDATE': 'Обновление записи',
        'APPOINTMENT_STATUS_CHANGE': 'Изменение статуса записи',
        'APPOINTMENT_DELETE': 'Удаление записи',
        'PATIENT_CREATE': 'Создание пациента',
        'PATIENT_UPDATE': 'Обновление пациента',
        'PATIENT_DELETE': 'Удаление пациента',
        'INVENTORY_WRITE_OFF': 'Списание со склада',
        'INVENTORY_RECEIPT': 'Поступление на склад',
        'INVENTORY_ISSUE': 'Выдача со склада',
        'USER_CREATE': 'Создание пользователя',
        'USER_UPDATE': 'Обновление пользователя',
        'USER_DELETE': 'Удаление пользователя',
        'MEDICAL_RECORD_CREATE': 'Создание медицинской записи',
        'MEDICAL_RECORD_UPDATE': 'Обновление медицинской записи',
        'FILE_UPLOAD': 'Загрузка файла',
        'FILE_DELETE': 'Удаление файла'
      };
      return actions[action] || action;
    },
    formatDiff(diff) {
      if (!diff || typeof diff !== 'object') return '';

      const parts = [];
      for (const [key, value] of Object.entries(diff)) {
        if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
          const from = value.from !== null && value.from !== undefined
            ? String(value.from)
            : 'пусто';
          const to = value.to !== null && value.to !== undefined
            ? String(value.to)
            : 'пусто';
          parts.push(`${key}: ${from} → ${to}`);
        }
      }

      return parts.length > 0 ? parts.join(', ') : JSON.stringify(diff);
    },
    formatDateTime(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
}).mount('#audit-app');
