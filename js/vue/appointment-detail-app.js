const { createApp } = Vue;

createApp({
  data() {
    return {
      loading: true,
      error: null,
      appointment: null,
      medicalRecord: null,
      patientIcons: '',
      canViewFinance: false,
      canEditFinance: false,
      isDoctor: false,
      currentAppointmentId: null
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
      const appointmentId = urlParams.get('id');

      if (!appointmentId) {
        this.error = 'ID записи не указан';
        this.loading = false;
        return;
      }

      this.currentAppointmentId = appointmentId;
      this.loading = true;
      this.error = null;

      try {
        const [appointment, me] = await Promise.all([
          window.api.getAppointment(appointmentId),
          window.api.getMe()
        ]);

        if (!appointment) {
          this.error = 'Запись не найдена';
          this.loading = false;
          return;
        }

        this.appointment = appointment;

        const user = me.user || window.apiUtils.getUser()?.user;
        const permissions = me.permissions || {};

        this.canViewFinance = permissions.canViewFinance ||
          user?.role === 'ADMIN' || user?.role === 'HEAD';
        this.canEditFinance = permissions.canEditFinance ||
          user?.role === 'ADMIN' || user?.role === 'HEAD';
        this.isDoctor = user?.role === 'DOCTOR';

        if (appointment.patient?.icons && appointment.patient.icons.length > 0) {
          try {
            this.patientIcons = await window.apiUtils.getIconsEmoji(appointment.patient.icons) || 'нет';
          } catch (e) {
            console.warn('Не удалось загрузить иконки:', e);
          }
        }

        if (this.isDoctor || user?.role === 'HEAD') {
          try {
            this.medicalRecord = await window.api.getMedicalRecord(appointmentId);
          } catch (error) {
            console.warn('Не удалось загрузить медицинскую запись:', error);
          }
        }

        this.loading = false;
      } catch (error) {
        console.error('Ошибка загрузки записи:', error);
        this.error = error.message || 'Ошибка загрузки записи';
        this.loading = false;
      }
    },
    async updateStatus(status) {
      if (!this.currentAppointmentId || !window.api) return;

      try {
        await window.api.updateAppointmentStatus(this.currentAppointmentId, status);
        alert('Статус обновлён');
        await this.init();
      } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        alert('Ошибка обновления статуса: ' + (error.message || 'Неизвестная ошибка'));
      }
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
}).mount('#appointment-detail-app');
