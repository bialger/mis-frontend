import { formatDate } from '../modules/utils.js';

const { createApp } = Vue;

createApp({
  data() {
    return {
      searchQuery: '',
      patients: [],
      loading: false,
      error: null
    };
  },
  async mounted() {
    await this.loadAllPatients();
  },
  methods: {
    async loadAllPatients() {
      await this.searchPatients('');
    },
    async searchPatients(query) {
      if (!window.api) {
        setTimeout(() => this.searchPatients(query), 200);
        return;
      }

      const searchQuery = query !== undefined ? query : this.searchQuery.trim();
      this.loading = true;
      this.error = null;

      try {
        let patients = await window.api.searchPatients(searchQuery);

        const randomFilter = Math.random() > 0.5 ? 'all' : 'with-icons';
        if (randomFilter === 'with-icons' && patients.length > 0) {
          patients = patients.filter(p => p.icons && p.icons.length > 0);
        }

        for (let patient of patients) {
          if (patient.icons && patient.icons.length > 0) {
            patient.iconsEmoji = await window.apiUtils.getIconsEmoji(patient.icons);
          }
        }

        this.patients = patients;
      } catch (error) {
        console.error('Ошибка поиска пациентов:', error);
        this.error = error.message || 'Ошибка загрузки пациентов';
        window.apiUtils.showError(
          document.getElementById('patients-content'),
          this.error,
          error.type || 'default'
        );
      } finally {
        this.loading = false;
      }
    },
    async createPatient() {
      const fullName = prompt('Введите ФИО пациента:');
      const phone = prompt('Введите телефон пациента:');

      if (fullName && phone) {
        try {
          const result = await window.api.createPatient({ fullName, phone });
          if (result && result.id) {
            alert('Пациент успешно создан!');
            await this.searchPatients(this.searchQuery);
          }
        } catch (error) {
          console.error('Ошибка создания пациента:', error);
          alert('Ошибка создания пациента: ' + (error.message || 'Неизвестная ошибка'));
        }
      }
    },
    formatDate
  }
}).mount('#patients-app');
