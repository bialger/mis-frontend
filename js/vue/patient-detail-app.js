const { createApp } = Vue;

createApp({
  data() {
    return {
      loading: true,
      error: null,
      patient: null,
      appointments: [],
      patientIcons: ''
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

      const urlParams = new URLSearchParams(window.location.search);
      const patientId = urlParams.get('id');

      if (!patientId) {
        this.error = 'ID пациента не указан';
        this.loading = false;
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const patient = await window.api.getPatient(patientId);

        if (!patient) {
          this.error = 'Пациент не найден';
          this.loading = false;
          return;
        }

        this.patient = patient;

        if (patient.icons && patient.icons.length > 0) {
          try {
            this.patientIcons = await window.apiUtils.getIconsEmoji(patient.icons) || 'нет';
          } catch (e) {
            console.warn('Не удалось загрузить иконки:', e);
          }
        }

        try {
          const today = new Date();
          const from = new Date(today.getFullYear() - 1, 0, 1).toISOString();
          const to = new Date().toISOString();
          const allAppointments = await window.api.getAppointments(1, from, to);
          this.appointments = allAppointments.filter(
            apt => apt.patient?.id === parseInt(patientId)
          );
        } catch (error) {
          console.warn('Не удалось загрузить историю визитов:', error);
        }

        this.loading = false;
      } catch (error) {
        console.error('Ошибка загрузки пациента:', error);
        this.error = error.message || 'Ошибка загрузки пациента';
        this.loading = false;
      }
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU');
    },
    formatDateTime(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU');
    },
    getStatusText(status) {
      const statusMap = {
        'BOOKED': 'Записан',
        'CONFIRMED': 'Подтверждён',
        'ARRIVED': 'Пришёл',
        'NO_SHOW': 'Не пришёл',
        'CANCELED': 'Отменён'
      };
      return statusMap[status] || status;
    }
  }
}).mount('#patient-detail-app');
