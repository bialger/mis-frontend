const { createApp } = Vue;

createApp({
  data() {
    return {
      loading: false,
      error: null,
      stats: {
        totalPatients: 0,
        totalAppointments: 0,
        totalDoctors: 0,
        onlineAppointments: 0,
        frontDeskAppointments: 0,
        bookedCount: 0,
        confirmedCount: 0,
        canceledCount: 0,
        noShowCount: 0,
        totalRevenue: 0,
        paidRevenue: 0,
        avgAppointmentTime: 30,
        cancelRate: 0,
        noShowRate: 0,
        satisfactionRate: 95,
        scheduleLoad: 0
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

      this.loading = true;
      this.error = null;

      try {
        const me = await window.api.getMe();
        const branchId = me.branchScope && me.branchScope.length > 0 ? me.branchScope[0] : 1;

        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const from = thirtyDaysAgo.toISOString().split('T')[0] + 'T00:00:00Z';
        const to = today.toISOString().split('T')[0] + 'T23:59:59Z';

        const [appointments, patients, doctors] = await Promise.all([
          window.api.getAppointments(branchId, from, to).catch(() => []),
          window.api.searchPatients('').catch(() => []),
          window.api.getUsers()
            .then(users => users.filter(u => u.role === 'DOCTOR' || u.role === 'HEAD'))
            .catch(() => [])
        ]);

        this.stats.totalPatients = patients.length;
        this.stats.totalAppointments = appointments.length;
        this.stats.totalDoctors = doctors.length;

        const statusCounts = {};
        appointments.forEach(apt => {
          statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
        });

        this.stats.bookedCount = statusCounts['BOOKED'] || 0;
        this.stats.confirmedCount = statusCounts['CONFIRMED'] || 0;
        this.stats.canceledCount = statusCounts['CANCELED'] || 0;
        this.stats.noShowCount = statusCounts['NO_SHOW'] || 0;

        const sourceCounts = {};
        appointments.forEach(apt => {
          sourceCounts[apt.source] = (sourceCounts[apt.source] || 0) + 1;
        });

        this.stats.onlineAppointments = sourceCounts['ONLINE'] || 0;
        this.stats.frontDeskAppointments = sourceCounts['FRONT_DESK'] || 0;

        let totalRevenue = 0;
        let paidRevenue = 0;
        appointments.forEach(apt => {
          if (apt.payment) {
            totalRevenue += apt.payment.total || 0;
            paidRevenue += apt.payment.paid || 0;
          }
        });

        this.stats.totalRevenue = totalRevenue;
        this.stats.paidRevenue = paidRevenue;

        this.stats.cancelRate = this.stats.totalAppointments > 0 ?
          Math.round((this.stats.canceledCount / this.stats.totalAppointments) * 100) : 0;
        this.stats.noShowRate = this.stats.totalAppointments > 0 ?
          Math.round((this.stats.noShowCount / this.stats.totalAppointments) * 100) : 0;
        this.stats.scheduleLoad = this.stats.totalDoctors > 0 && this.stats.totalAppointments > 0 ?
          Math.round((this.stats.totalAppointments / (this.stats.totalDoctors * 20)) * 100) : 0;
      } catch (error) {
        console.error('Ошибка загрузки отчетов:', error);
        this.error = error.message || 'Ошибка загрузки отчетов';
      } finally {
        this.loading = false;
      }
    },
    formatCurrency(value) {
      return value.toLocaleString('ru-RU');
    }
  }
}).mount('#reports-app');
