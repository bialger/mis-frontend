const { createApp } = Vue;

createApp({
  data() {
    return {
      loading: true,
      error: null,
      user: null,
      role: null,
      todayAppointments: [],
      onlineAppointments: [],
      totalAppointments: 0
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

      this.loading = true;
      this.error = null;

      try {
        const me = await window.api.getMe();
        this.user = me.user || window.apiUtils.getUser()?.user;

        if (!this.user) {
          this.error = 'Не удалось загрузить данные пользователя';
          this.loading = false;
          return;
        }

        this.role = this.user.role;

        if (this.role === 'DOCTOR') {
          await this.loadDoctorDashboard();
        } else if (this.role === 'ADMIN') {
          await this.loadAdminDashboard();
        } else if (this.role === 'HEAD') {
          // HEAD role - static content
        }

        this.loading = false;
      } catch (error) {
        console.error('Ошибка загрузки дашборда:', error);
        this.error = error.message || 'Ошибка загрузки данных';
        this.loading = false;
      }
    },
    async loadDoctorDashboard() {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      try {
        const me = await window.api.getMe();
        const branchId = me.branchScope && me.branchScope.length > 0 ? me.branchScope[0] : 1;
        const appointments = await window.api.getAppointments(
          branchId,
          today + 'T00:00:00Z',
          tomorrow + 'T00:00:00Z'
        );
        this.todayAppointments = appointments.filter(apt => apt.doctorId === this.user.id);
      } catch (error) {
        console.warn('Не удалось загрузить записи:', error);
      }
    },
    async loadAdminDashboard() {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      try {
        const me = await window.api.getMe();
        const branchId = me.branchScope && me.branchScope.length > 0 ? me.branchScope[0] : 1;
        const appointments = await window.api.getAppointments(
          branchId,
          today + 'T00:00:00Z',
          tomorrow + 'T00:00:00Z'
        );
        this.totalAppointments = appointments.length;
        this.onlineAppointments = appointments.filter(
          apt => apt.source === 'ONLINE' && apt.status === 'BOOKED'
        );
      } catch (error) {
        console.warn('Не удалось загрузить записи:', error);
      }
    },
    formatTime(dateString) {
      const date = new Date(dateString);
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    },
    getAppointmentWord(count) {
      if (count % 10 === 1 && count % 100 !== 11) return 'запись';
      if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
        return 'записи';
      }
      return 'записей';
    }
  }
}).mount('#dashboard-app');
