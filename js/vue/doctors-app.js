const { createApp } = Vue;

createApp({
  data() {
    return {
      loading: true,
      error: null,
      doctors: [],
      doctorStats: {},
      branchMap: {},
      totalDoctors: 0,
      activeDoctors: 0,
      totalAppointments: 0,
      avgLoad: 0
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
        const [users, branches] = await Promise.all([
          window.api.getUsers(),
          window.api.getBranches()
        ]);

        this.doctors = users.filter(u => u.role === 'DOCTOR' || u.role === 'HEAD');

        branches.forEach(b => {
          this.branchMap[b.id] = b.name;
        });

        const today = new Date().toISOString().split('T')[0];
        const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        let appointments = [];
        try {
          const me = await window.api.getMe();
          const branchId = me.branchScope && me.branchScope.length > 0 ? me.branchScope[0] : 1;
          appointments = await window.api.getAppointments(
            branchId,
            today + 'T00:00:00Z',
            weekFromNow + 'T23:59:59Z'
          );
        } catch (e) {
          console.warn('Не удалось загрузить записи для статистики:', e);
        }

        const stats = {};
        appointments.forEach(apt => {
          if (apt.doctorId) {
            if (!stats[apt.doctorId]) {
              stats[apt.doctorId] = { total: 0, booked: 0, confirmed: 0 };
            }
            stats[apt.doctorId].total++;
            if (apt.status === 'BOOKED') stats[apt.doctorId].booked++;
            if (apt.status === 'CONFIRMED') stats[apt.doctorId].confirmed++;
          }
        });
        this.doctorStats = stats;

        this.totalDoctors = this.doctors.length;
        this.activeDoctors = this.doctors.filter(d => (stats[d.id]?.total || 0) > 0).length;
        this.totalAppointments = Object.values(stats).reduce((sum, s) => sum + s.total, 0);
        this.avgLoad = this.totalDoctors > 0
          ? Math.round((this.totalAppointments / this.totalDoctors) * 10) / 10
          : 0;

        this.loading = false;
      } catch (error) {
        console.error('Ошибка загрузки врачей:', error);
        this.error = error.message || 'Ошибка загрузки данных врачей';
        this.loading = false;
      }
    },
    getBranchNames(doctor) {
      const branchNames = (doctor.branchScope || [])
        .map(id => this.branchMap[id] || `Филиал ${id}`)
        .join(', ');
      return branchNames || 'Не указан';
    },
    getRoleText(role) {
      return role === 'HEAD' ? 'Главный врач' : 'Врач';
    },
    getStats(doctorId) {
      return this.doctorStats[doctorId] || { total: 0, booked: 0, confirmed: 0 };
    },
    getStatusText(doctorId) {
      const stats = this.getStats(doctorId);
      return stats.total > 0 ? 'Активен' : 'Нет записей';
    }
  }
}).mount('#doctors-app');
