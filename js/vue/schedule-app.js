import { formatDateFull, formatTime, getStatusText } from '../modules/utils.js';

const { createApp } = Vue;

createApp({
  data() {
    return {
      branches: [],
      currentBranchId: null,
      currentDate: new Date().toISOString().split('T')[0],
      appointments: [],
      loading: false,
      error: null
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

      try {
        const me = await window.api.getMe();
        const branches = await window.api.getBranches();

        const availableBranches = branches.filter(
          b => !me.branchScope || me.branchScope.length === 0 ||
            me.branchScope.includes(b.id)
        );

        if (availableBranches.length === 0 && branches.length > 0) {
          this.branches = branches;
        } else {
          this.branches = availableBranches;
        }

        if (this.branches.length > 0) {
          this.currentBranchId = this.branches[0].id;
          await this.loadSchedule();
        }
      } catch (error) {
        console.error('Ошибка инициализации расписания:', error);
        this.error = 'Ошибка загрузки данных';
      }
    },
    async loadSchedule() {
      if (!this.currentBranchId || !this.currentDate || !window.api) return;

      this.loading = true;
      this.error = null;

      try {
        const from = new Date(this.currentDate + 'T00:00:00Z').toISOString();
        const to = new Date(this.currentDate + 'T23:59:59Z').toISOString();

        let appointments = await window.api.getAppointments(this.currentBranchId, from, to);

        appointments.sort((a, b) => new Date(a.start) - new Date(b.start));

        for (let apt of appointments) {
          if (apt.patient?.icons && apt.patient.icons.length > 0) {
            apt.patient.iconsEmoji = await window.apiUtils.getIconsEmoji(apt.patient.icons);
          }
        }

        this.appointments = appointments;
      } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
        this.error = error.message || 'Ошибка загрузки расписания';
        window.apiUtils.showError(
          document.getElementById('schedule-content'),
          this.error,
          error.type || 'default'
        );
      } finally {
        this.loading = false;
      }
    },
    formatDateFull,
    formatTime,
    getStatusText
  },
  watch: {
    currentBranchId() {
      if (this.currentBranchId && this.currentDate) {
        this.loadSchedule();
      }
    },
    currentDate() {
      if (this.currentBranchId && this.currentDate) {
        this.loadSchedule();
      }
    }
  }
}).mount('#schedule-app');
