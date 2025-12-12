const { createApp } = Vue;

createApp({
  data() {
    return {
      loading: true,
      error: null,
      patient: null,
      appointments: [],
      patientIcons: '',
      activeTab: 'main',
      editing: false,
      editData: {},
      availableIcons: [],
      files: [],
      filesLoading: false,
      auditLog: [],
      auditLoading: false,
      tabs: [
        { id: 'main', label: 'Основная информация' },
        { id: 'icons', label: 'Пометки' },
        { id: 'consents', label: 'Согласия' },
        { id: 'history', label: 'История' },
        { id: 'files', label: 'Файлы' },
        { id: 'audit', label: 'Лог изменений' }
      ]
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
        this.initEditData(patient);

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

        await this.loadAvailableIcons();
        await this.loadFiles();
        await this.loadAudit();

        this.loading = false;
      } catch (error) {
        console.error('Ошибка загрузки пациента:', error);
        this.error = error.message || 'Ошибка загрузки пациента';
        this.loading = false;
      }
    },
    initEditData(patient) {
      this.editData = {
        fullName: patient.fullName || '',
        phone: patient.phone || '',
        email: patient.email || '',
        dob: patient.dob || '',
        gender: patient.gender || '',
        localityType: patient.localityType || '',
        citizenship: patient.citizenship || '',
        registrationAddress: {
          region: patient.registrationAddress?.region || '',
          district: patient.registrationAddress?.district || '',
          city: patient.registrationAddress?.city || '',
          street: patient.registrationAddress?.street || '',
          house: patient.registrationAddress?.house || '',
          apartment: patient.registrationAddress?.apartment || ''
        },
        residenceAddress: {
          region: patient.residenceAddress?.region || '',
          district: patient.residenceAddress?.district || '',
          city: patient.residenceAddress?.city || '',
          street: patient.residenceAddress?.street || '',
          house: patient.residenceAddress?.house || '',
          apartment: patient.residenceAddress?.apartment || ''
        },
        identityDocument: {
          type: patient.identityDocument?.type || '',
          series: patient.identityDocument?.series || '',
          number: patient.identityDocument?.number || '',
          issuedBy: patient.identityDocument?.issuedBy || '',
          issuedAt: patient.identityDocument?.issuedAt || ''
        },
        omsSeries: patient.omsSeries || '',
        omsPolicy: patient.omsPolicy || '',
        insuranceCompany: patient.insuranceCompany || '',
        snils: patient.snils || '',
        guardian: {
          fullName: patient.guardian?.fullName || '',
          phone: patient.guardian?.phone || ''
        },
        profession: patient.profession || '',
        workplace: patient.workplace || ''
      };
    },
    async loadAvailableIcons() {
      try {
        this.availableIcons = await window.api.getPatientIcons();
      } catch (error) {
        console.warn('Не удалось загрузить доступные иконки:', error);
        this.availableIcons = [];
      }
    },
    async loadFiles() {
      if (!this.patient?.id) return;
      this.filesLoading = true;
      try {
        this.files = await window.api.getFiles('PATIENT', this.patient.id);
      } catch (error) {
        console.warn('Не удалось загрузить файлы:', error);
        this.files = [];
      } finally {
        this.filesLoading = false;
      }
    },
    async loadAudit() {
      if (!this.patient?.id) return;
      this.auditLoading = true;
      try {
        this.auditLog = await window.api.getAudit(this.patient.id);
      } catch (error) {
        console.warn('Не удалось загрузить лог изменений:', error);
        this.auditLog = [];
      } finally {
        this.auditLoading = false;
      }
    },
    startEdit() {
      this.editing = true;
      this.initEditData(this.patient);
    },
    cancelEdit() {
      this.editing = false;
      this.initEditData(this.patient);
    },
    async savePatient() {
      if (!this.patient?.id || !window.api) return;

      try {
        await window.api.updatePatient(this.patient.id, this.editData);
        alert('Данные сохранены');
        await this.init();
        this.editing = false;
      } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка'));
      }
    },
    async toggleIcon(iconId) {
      if (!this.patient?.id || !window.api) return;

      const currentIcons = this.patient.icons || [];
      const hasIcon = currentIcons.includes(iconId);
      const action = hasIcon ? 'REMOVE' : 'ADD';

      try {
        await window.api.updatePatientIcon(this.patient.id, iconId, action);
        if (action === 'ADD') {
          this.patient.icons = [...currentIcons, iconId];
        } else {
          this.patient.icons = currentIcons.filter(id => id !== iconId);
        }
        this.patientIcons = await window.apiUtils.getIconsEmoji(this.patient.icons) || '';
      } catch (error) {
        console.error('Ошибка обновления иконки:', error);
        alert('Ошибка обновления иконки');
      }
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file || !this.patient?.id) return;

      try {
        await window.api.uploadFile(file, 'PATIENT', this.patient.id);
        alert('Файл загружен');
        await this.loadFiles();
        event.target.value = '';
      } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        alert('Ошибка загрузки файла: ' + (error.message || 'Неизвестная ошибка'));
      }
    },
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU');
    },
    formatDateTime(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU');
    },
    formatFileSize(bytes) {
      if (!bytes) return '0 Б';
      if (bytes < 1024) return bytes + ' Б';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
      return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
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
    },
    getGenderText(gender) {
      const genderMap = {
        'MALE': 'Мужской',
        'FEMALE': 'Женский'
      };
      return genderMap[gender] || '';
    },
    getLocalityText(localityType) {
      const localityMap = {
        'URBAN': 'Городская',
        'RURAL': 'Сельская'
      };
      return localityMap[localityType] || '';
    }
  }
}).mount('#patient-detail-app');
