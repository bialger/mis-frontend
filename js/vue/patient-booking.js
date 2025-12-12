const { createApp } = Vue;

createApp({
  data() {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    return {
      branches: [],
      doctors: [],
      rooms: [],
      selectedBranchId: null,
      selectedDoctorId: null,
      selectedDate: iso,
      slots: [],
      workingHours: null,
      branchWorkingHours: { startTime: '08:00', endTime: '20:00' },
      loadingSlots: false,
      loadingBooking: false,
      error: null,
      bookingError: null,
      successMessage: '',
      selectedSlot: null,
      patientForm: { fullName: '', phone: '', comment: '' }
    };
  },
  async mounted() {
    await this.loadBaseData();
  },
  computed: {
    canSubmit() {
      return this.selectedSlot && this.patientForm.fullName.trim() && this.patientForm.phone.trim();
    }
  },
  methods: {
    async loadBaseData() {
      try {
        const [branches, users] = await Promise.all([
          window.api.getBranches().catch(() => []),
          window.api.getUsers().catch(() => [])
        ]);
        this.branches = branches;
        this.doctors = users.filter(u => u.role === 'DOCTOR' || u.role === 'HEAD');
        if (this.branches.length > 0) {
          this.selectedBranchId = this.branches[0].id;
          this.updateBranchWorkingHours();
        }
        if (this.doctors.length > 0) {
          this.selectedDoctorId = this.doctors[0].id;
        }
        await this.loadRooms();
        await this.loadWorkingHours();
        await this.loadSlots();
      } catch (e) {
        console.error(e);
        this.error = 'Не удалось загрузить данные. Попробуйте обновить страницу.';
      }
    },
    updateBranchWorkingHours() {
      const branch = this.branches.find(b => b.id === this.selectedBranchId);
      this.branchWorkingHours = {
        startTime: branch?.startTime || '08:00',
        endTime: branch?.endTime || '20:00'
      };
    },
    async loadWorkingHours() {
      if (!this.selectedDoctorId || !this.selectedBranchId) return;
      try {
        this.workingHours = await window.api.getDoctorWorkingHours(this.selectedDoctorId, this.selectedBranchId);
      } catch (e) {
        console.error(e);
        this.workingHours = null;
      }
    },
    async loadRooms() {
      try {
        this.rooms = await window.api.getRooms(this.selectedBranchId).catch(() => []);
      } catch (e) {
        this.rooms = [];
      }
    },
    async loadSlots() {
      if (!this.selectedDoctorId || !this.selectedBranchId || !this.selectedDate) return;
      this.loadingSlots = true;
      this.selectedSlot = null;
      this.bookingError = null;
      this.successMessage = '';
      try {
        await this.loadWorkingHours();
        const appointments = await this.loadAppointmentsForDate(this.selectedDate);
        this.slots = this.buildSlotsForDate(this.selectedDate, appointments);
      } catch (e) {
        console.error(e);
        this.error = 'Не удалось загрузить слоты. Попробуйте позже.';
      } finally {
        this.loadingSlots = false;
      }
    },
    async loadAppointmentsForDate(dateStr) {
      const start = new Date(`${dateStr}T00:00:00`);
      const end = new Date(`${dateStr}T23:59:59`);
      try {
        const data = await window.api.getAppointments(
          this.selectedBranchId,
          start.toISOString(),
          end.toISOString()
        );
        return Array.isArray(data) ? data.filter(a => a.doctorId === this.selectedDoctorId) : [];
      } catch (e) {
        return [];
      }
    },
    buildSlotsForDate(dateStr, appointments) {
      if (!this.workingHours) return [];
      const dayOfWeek = new Date(dateStr).getDay();
      const exception = (this.workingHours.exceptions || []).find(ex => ex.date === dateStr);
      if (exception) return [];
      const daySchedule = this.workingHours.schedule?.find(d => d.dayOfWeek === dayOfWeek);
      if (!daySchedule || !daySchedule.isWorking) return [];

      const toMinutes = (t) => {
        if (!t) return 0;
        const [h, m] = t.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      const duration = Math.max(this.workingHours.slotDurationMin || 30, 5);
      const startMinutes = Math.max(toMinutes(daySchedule.startTime), toMinutes(this.branchWorkingHours.startTime));
      const endMinutes = Math.min(toMinutes(daySchedule.endTime), toMinutes(this.branchWorkingHours.endTime));
      if (endMinutes <= startMinutes) return [];

      const slots = [];
      for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
        const start = new Date(`${dateStr}T00:00:00`);
        start.setMinutes(start.getMinutes() + m);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + duration);
        const busy = appointments.find(a => {
          const aStart = new Date(a.start);
          const aEnd = new Date(a.end);
          return aStart.getTime() <= start.getTime() && aEnd.getTime() > start.getTime();
        });
        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
          free: !busy
        });
      }
      return slots;
    },
    selectSlot(slot) {
      if (!slot.free) return;
      this.selectedSlot = slot;
    },
    formatSlot(iso) {
      return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    },
    async book() {
      if (!this.canSubmit) return;
      this.loadingBooking = true;
      this.bookingError = null;
      this.successMessage = '';
      try {
        const patient = await window.api.createPatient({
          fullName: this.patientForm.fullName,
          phone: this.patientForm.phone,
          comment: this.patientForm.comment
        });
        const roomId = this.rooms.find(r => r.branchId === this.selectedBranchId)?.id;
        await window.api.createAppointment({
          branchId: this.selectedBranchId,
          doctorId: this.selectedDoctorId,
          roomId: roomId || null,
          start: this.selectedSlot.start,
          end: this.selectedSlot.end,
          patientId: patient.id
        });
        this.successMessage = 'Запись успешно создана. Мы свяжемся с вами для подтверждения.';
        await this.loadSlots();
      } catch (e) {
        console.error(e);
        this.bookingError = 'Не удалось создать запись. Попробуйте позже.';
      } finally {
        this.loadingBooking = false;
      }
    }
  },
  watch: {
    selectedBranchId() {
      this.updateBranchWorkingHours();
      this.loadRooms();
      this.loadSlots();
    },
    selectedDoctorId() {
      this.loadSlots();
    },
    selectedDate() {
      this.loadSlots();
    }
  }
}).mount('#patient-booking-app');
