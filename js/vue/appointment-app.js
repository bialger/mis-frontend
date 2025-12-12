const { createApp } = Vue;

const STORAGE_KEY = 'medical-crm-appointments';

createApp({
  data() {
    return {
      appointments: [],
      editingId: null,
      formData: {
        fullname: '',
        phone: '',
        email: '',
        service: '',
        doctor: '',
        date: '',
        time: '',
        message: ''
      },
      errors: {}
    };
  },
  mounted() {
    this.loadAppointmentsFromStorage();
  },
  methods: {
    loadAppointmentsFromStorage() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.appointments = JSON.parse(stored);
        }
      } catch (e) {
        console.error('Ошибка загрузки данных из localStorage:', e);
        this.appointments = [];
      }
    },
    saveAppointmentsToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.appointments));
      } catch (e) {
        console.error('Ошибка сохранения данных в localStorage:', e);
      }
    },
    validateForm() {
      this.errors = {};

      if (!this.formData.fullname || this.formData.fullname.trim().length < 3) {
        this.errors.fullname = 'ФИО должно содержать не менее 3 символов';
      } else if (!/^[А-Яа-яЁёA-Za-z\s]+$/.test(this.formData.fullname.trim())) {
        this.errors.fullname = 'ФИО должно содержать только буквы';
      }

      if (!this.formData.phone || !/^[\d\s\-\+\(\)]+$/.test(this.formData.phone)) {
        this.errors.phone = 'Введите корректный номер телефона';
      }

      if (this.formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email)) {
        this.errors.email = 'Введите корректный email адрес';
      }

      if (!this.formData.service) {
        this.errors.service = 'Выберите услугу';
      }

      if (!this.formData.doctor) {
        this.errors.doctor = 'Выберите врача';
      }

      if (!this.formData.date) {
        this.errors.date = 'Выберите дату приема';
      } else {
        const selectedDate = new Date(this.formData.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          this.errors.date = 'Дата не может быть в прошлом';
        }
      }

      if (!this.formData.time) {
        this.errors.time = 'Выберите время приема';
      }

      if (this.formData.message && this.formData.message.trim().length > 500) {
        this.errors.message = 'Комментарий не должен превышать 500 символов';
      }

      return Object.keys(this.errors).length === 0;
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    },
    formatDateTime(dateString, timeString) {
      const date = this.formatDate(dateString);
      return `${date} в ${timeString}`;
    },
    formatStatus(status) {
      const statusMap = {
        'new': { text: 'Новая', class: 'm-status-new' },
        'confirmed': { text: 'Подтверждена', class: 'm-status-confirmed' },
        'cancelled': { text: 'Отменена', class: 'm-status-cancelled' }
      };
      const statusInfo = statusMap[status] || statusMap['new'];
      return statusInfo;
    },
    getSortedAppointments() {
      return [...this.appointments].sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateA - dateB;
      });
    },
    handleSubmit() {
      if (!this.validateForm()) {
        return;
      }

      if (this.editingId) {
        this.updateAppointment();
      } else {
        this.addAppointment();
      }

      this.resetForm();
    },
    addAppointment() {
      const newItem = {
        id: Date.now().toString(),
        fullname: this.formData.fullname.trim(),
        phone: this.formData.phone.trim(),
        email: this.formData.email ? this.formData.email.trim() : '',
        service: this.formData.service,
        doctor: this.formData.doctor,
        date: this.formData.date,
        time: this.formData.time,
        message: this.formData.message ? this.formData.message.trim() : '',
        status: 'new',
        createdDate: new Date().toISOString()
      };

      this.appointments.push(newItem);
      this.saveAppointmentsToStorage();
    },
    editAppointment(id) {
      const item = this.appointments.find(i => i.id === id);
      if (!item) return;

      this.editingId = id;
      this.formData = {
        fullname: item.fullname,
        phone: item.phone,
        email: item.email,
        service: item.service,
        doctor: item.doctor,
        date: item.date,
        time: item.time,
        message: item.message
      };

      const form = document.getElementById('appointment-form');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    updateAppointment() {
      const itemIndex = this.appointments.findIndex(i => i.id === this.editingId);
      if (itemIndex === -1) return;

      const oldItem = this.appointments[itemIndex];
      this.appointments[itemIndex] = {
        id: this.editingId,
        fullname: this.formData.fullname.trim(),
        phone: this.formData.phone.trim(),
        email: this.formData.email ? this.formData.email.trim() : '',
        service: this.formData.service,
        doctor: this.formData.doctor,
        date: this.formData.date,
        time: this.formData.time,
        message: this.formData.message ? this.formData.message.trim() : '',
        status: oldItem.status,
        createdDate: oldItem.createdDate
      };

      this.saveAppointmentsToStorage();
      this.editingId = null;
    },
    deleteAppointment(id) {
      if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
        return;
      }

      this.appointments = this.appointments.filter(item => item.id !== id);
      this.saveAppointmentsToStorage();
    },
    resetForm() {
      this.formData = {
        fullname: '',
        phone: '',
        email: '',
        service: '',
        doctor: '',
        date: '',
        time: '',
        message: ''
      };
      this.errors = {};
      this.editingId = null;
    },
    getMinDate() {
      return new Date().toISOString().split('T')[0];
    }
  }
}).mount('#appointment-app');
