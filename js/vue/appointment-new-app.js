import { formatDate, formatDateTime, getStatusText } from '../modules/utils.js';

const { createApp } = Vue;

createApp({
  data() {
    return {
      services: [],
      appointments: [],
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
        const branchId = me.branchScope && me.branchScope[0] ? me.branchScope[0] : 1;

        const services = await window.api.getServices(branchId);
        this.services = services;

        await this.loadAppointmentsList();
      } catch (error) {
        console.warn('Ошибка инициализации:', error);
      }
    },
    async loadAppointmentsList() {
      if (!window.api) return;

      this.loading = true;
      this.error = null;

      try {
        const me = await window.api.getMe();
        const branchId = me.branchScope && me.branchScope[0] ? me.branchScope[0] : 1;

        const today = new Date();
        const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const to = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();

        let appointments = await window.api.getAppointments(branchId, from, to);
        appointments.sort((a, b) => new Date(a.start) - new Date(b.start));

        this.appointments = appointments;
      } catch (error) {
        console.error('Ошибка загрузки записей:', error);
        this.error = error.message || 'Ошибка загрузки записей';
      } finally {
        this.loading = false;
      }
    },
    async handleSubmit(e) {
      e.preventDefault();

      if (!this.formData.fullname || this.formData.fullname.length < 3) {
        alert('ФИО должно содержать не менее 3 символов');
        return;
      }

      if (!this.formData.phone) {
        alert('Введите телефон');
        return;
      }

      if (!this.formData.service) {
        alert('Выберите услугу');
        return;
      }

      if (!this.formData.date || !this.formData.time) {
        alert('Выберите дату и время');
        return;
      }

      this.loading = true;

      try {
        let patients = await window.api.searchPatients(this.formData.phone);
        let patientId = null;

        if (patients.length > 0) {
          patientId = patients[0].id;
        } else {
          const newPatient = await window.api.createPatient({
            fullName: this.formData.fullname,
            phone: this.formData.phone
          });
          patientId = newPatient.id;
        }

        const me = await window.api.getMe();
        const branchId = me.branchScope && me.branchScope[0] ? me.branchScope[0] : 1;

        const startDateTime = new Date(this.formData.date + 'T' + this.formData.time);
        const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);

        await window.api.createAppointment({
          branchId: branchId,
          doctorId: 1,
          roomId: 1,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          patientId: patientId
        });

        alert('Запись успешно создана!');
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
        await this.loadAppointmentsList();
      } catch (error) {
        console.error('Ошибка создания записи:', error);
        alert('Ошибка создания записи: ' + (error.message || 'Неизвестная ошибка'));
      } finally {
        this.loading = false;
      }
    },
    getMinDate() {
      return new Date().toISOString().split('T')[0];
    },
    formatDate,
    formatDateTime,
    getStatusText
  }
}).mount('#appointment-app');
