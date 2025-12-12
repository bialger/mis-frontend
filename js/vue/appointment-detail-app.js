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
      canManualEgiszSend: false,
      isDoctor: false,
      currentAppointmentId: null,
      editingMedical: false,
      editMedicalData: {
        sections: {
          complaints: '',
          anamnesis: '',
          examination: '',
          diagnoses: [],
          orders: '',
          procedures: '',
          epicrisis: ''
        }
      },
      editingPayment: false,
      editPaymentData: {
        total: 0,
        paid: 0,
        method: null,
        flags: {
          noCashbox: false,
          payLater: false,
          partial: false
        }
      },
      templates: [],
      selectedTemplate: null,
      files: [],
      filesLoading: false,
      statusHistory: [],
      statusHistoryLoading: false
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
        this.canManualEgiszSend = permissions.canManualEgiszSend ||
          user?.role === 'HEAD';
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
            if (this.medicalRecord && this.medicalRecord.sections) {
              this.initEditMedicalData(this.medicalRecord);
            }
          } catch (error) {
            console.warn('Не удалось загрузить медицинскую запись:', error);
          }
        }

        await this.loadStatusHistory();
        await this.loadFiles();

        this.loading = false;
      } catch (error) {
        console.error('Ошибка загрузки записи:', error);
        this.error = error.message || 'Ошибка загрузки записи';
        this.loading = false;
      }
    },
    initEditMedicalData(record) {
      this.editMedicalData = {
        sections: {
          complaints: record.sections?.complaints || '',
          anamnesis: record.sections?.anamnesis || '',
          examination: record.sections?.examination || '',
          diagnoses: record.sections?.diagnoses ? [...record.sections.diagnoses] : [],
          orders: record.sections?.orders || '',
          procedures: record.sections?.procedures || '',
          epicrisis: record.sections?.epicrisis || ''
        }
      };
    },
    initEditPaymentData() {
      if (this.appointment.payment) {
        this.editPaymentData = {
          total: this.appointment.payment.total || 0,
          paid: this.appointment.payment.paid || 0,
          method: this.appointment.payment.method || null,
          flags: {
            noCashbox: this.appointment.payment.flags?.noCashbox || false,
            payLater: this.appointment.payment.flags?.payLater || false,
            partial: this.appointment.payment.flags?.partial || false
          }
        };
      }
    },
    async loadStatusHistory() {
      if (!this.currentAppointmentId) return;
      this.statusHistoryLoading = true;
      try {
        this.statusHistory = await window.api.getStatusHistory(this.currentAppointmentId);
      } catch (error) {
        console.warn('Не удалось загрузить историю статусов:', error);
        this.statusHistory = [];
      } finally {
        this.statusHistoryLoading = false;
      }
    },
    async loadFiles() {
      if (!this.currentAppointmentId) return;
      this.filesLoading = true;
      try {
        this.files = await window.api.getFiles('APPOINTMENT', this.currentAppointmentId);
      } catch (error) {
        console.warn('Не удалось загрузить файлы:', error);
        this.files = [];
      } finally {
        this.filesLoading = false;
      }
    },
    async loadTemplates() {
      try {
        this.templates = await window.api.getTemplates();
      } catch (error) {
        console.warn('Не удалось загрузить шаблоны:', error);
        this.templates = [];
      }
    },
    startEditMedical() {
      if (this.medicalRecord && this.medicalRecord.locked) {
        alert('Редактирование заблокировано: ' + (this.medicalRecord.lockReason || 'Истёк срок редактирования'));
        return;
      }
      this.editingMedical = true;
      if (this.medicalRecord) {
        this.initEditMedicalData(this.medicalRecord);
      }
      this.loadTemplates();
    },
    cancelEditMedical() {
      this.editingMedical = false;
      if (this.medicalRecord) {
        this.initEditMedicalData(this.medicalRecord);
      }
    },
    async saveMedicalRecord() {
      if (!this.currentAppointmentId || !window.api) return;

      try {
        await window.api.saveMedicalRecord(this.currentAppointmentId, this.editMedicalData);
        alert('Медицинская запись сохранена');
        await this.init();
        this.editingMedical = false;
      } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка'));
      }
    },
    async saveAsTemplate() {
      const name = prompt('Введите название шаблона:');
      if (!name) return;

      try {
        await window.api.saveTemplate({
          name: name,
          specialty: null,
          sections: this.editMedicalData.sections
        });
        alert('Шаблон сохранён');
      } catch (error) {
        console.error('Ошибка сохранения шаблона:', error);
        alert('Ошибка сохранения шаблона');
      }
    },
    applyTemplate() {
      if (!this.selectedTemplate) return;
      const template = this.templates.find(t => t.id === parseInt(this.selectedTemplate));
      if (template && template.sections) {
        this.editMedicalData.sections = { ...template.sections };
        if (template.sections.diagnoses) {
          this.editMedicalData.sections.diagnoses = [...template.sections.diagnoses];
        }
      }
    },
    addDiagnosis() {
      this.editMedicalData.sections.diagnoses.push({ text: '', code: '' });
    },
    removeDiagnosis(idx) {
      this.editMedicalData.sections.diagnoses.splice(idx, 1);
    },
    startEditPayment() {
      this.editingPayment = true;
      this.initEditPaymentData();
    },
    cancelEditPayment() {
      this.editingPayment = false;
      this.initEditPaymentData();
    },
    async savePayment() {
      if (!this.currentAppointmentId || !window.api) return;

      try {
        await window.api.updatePayment(this.currentAppointmentId, this.editPaymentData);
        alert('Оплата обновлена');
        await this.init();
        this.editingPayment = false;
      } catch (error) {
        console.error('Ошибка сохранения оплаты:', error);
        alert('Ошибка сохранения оплаты: ' + (error.message || 'Неизвестная ошибка'));
      }
    },
    async updateStatus(status) {
      if (!this.currentAppointmentId || !window.api) return;

      try {
        await window.api.updateAppointmentStatus(this.currentAppointmentId, status);
        await this.init();
        await this.loadStatusHistory();
      } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        alert('Ошибка обновления статуса: ' + (error.message || 'Неизвестная ошибка'));
      }
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file || !this.currentAppointmentId) return;

      try {
        await window.api.uploadFile(file, 'APPOINTMENT', this.currentAppointmentId);
        alert('Файл загружен');
        await this.loadFiles();
        event.target.value = '';
      } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        alert('Ошибка загрузки файла: ' + (error.message || 'Неизвестная ошибка'));
      }
    },
    async deleteFile(fileId) {
      if (!confirm('Удалить файл?')) return;

      try {
        await window.api.deleteFile(fileId);
        alert('Файл удалён');
        await this.loadFiles();
      } catch (error) {
        console.error('Ошибка удаления файла:', error);
        alert('Ошибка удаления файла');
      }
    },
    async sendToEgisz() {
      if (!this.currentAppointmentId || !window.api) return;
      if (!confirm('Отправить медицинскую запись в ЕГИСЗ?')) return;

      try {
        await window.api.sendToEgisz(this.currentAppointmentId);
        alert('Отправлено в ЕГИСЗ');
      } catch (error) {
        console.error('Ошибка отправки в ЕГИСЗ:', error);
        alert('Ошибка отправки в ЕГИСЗ: ' + (error.message || 'Неизвестная ошибка'));
      }
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
    }
  }
}).mount('#appointment-detail-app');
