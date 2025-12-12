import { formatDateFull, formatTime, getStatusText } from '../modules/utils.js';

const { createApp } = Vue;

const app = createApp({
  data() {
    const now = new Date();
    return {
      branches: [],
      branchWorkingHours: { startTime: '08:00', endTime: '20:00' },
      doctors: [],
      currentBranchId: null,
      currentDoctorId: null,
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      currentWeekStart: null,
      loading: false,
      error: null,
      user: null,
      showCreateModal: false,
      selectedSlot: null,
      selectedPatientId: null,
      selectedRoomId: null,
      patients: [],
      rooms: [],
      searchQuery: '',
      filteredPatients: [],
      workingHours: null,
      weekAppointments: [],
      dayOffDate: '',
      dayOffReason: '',
      showWorkingHoursModal: false
    };
  },
  async mounted() {
    await this.init();
  },
  computed: {
    canSelectDoctor() {
      return this.user && (this.user.role === 'ADMIN' || this.user.role === 'HEAD');
    },
    canEditWorkingHours() {
      if (!this.user) return false;
      if (this.user.role === 'DOCTOR') {
        return this.currentDoctorId === this.user.id;
      }
      return this.user.role === 'ADMIN' || this.user.role === 'HEAD';
    },
    weekDays() {
      if (!this.currentWeekStart) return [];
      const days = [];
      const start = new Date(this.currentWeekStart);
      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        days.push({
          date: dateStr,
          dayName: this.getDayName(date.getDay()),
          dayNumber: date.getDate(),
          fullDate: date
        });
      }
      return days;
    },
    weekRange() {
      if (!this.currentWeekStart) return '';
      const start = new Date(this.currentWeekStart);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
      ];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
      } else {
        return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]} ${start.getFullYear()}`;
      }
    },
    timeGridSlots() {
      if (!this.currentWeekStart) return [];
      const duration = Math.max(this.workingHours?.slotDurationMin || 30, 5);
      const startMinutes = this.timeToMinutes(this.branchWorkingHours.startTime || '08:00');
      const endMinutes = this.timeToMinutes(this.branchWorkingHours.endTime || '20:00');
      if (endMinutes <= startMinutes) return [];

      const slots = [];
      for (let minutes = startMinutes; minutes < endMinutes; minutes += duration) {
        slots.push({ minutes, label: this.minutesToTime(minutes) });
      }
      return slots;
    },
    weekSlotMatrix() {
      const matrix = {};
      this.weekDays.forEach(day => {
        const slots = this.buildSlotsForDay(day.date);
        const byMinutes = {};
        slots.forEach(slot => {
          byMinutes[this.getMinutesFromDate(slot.start)] = slot;
        });
        matrix[day.date] = { slots, byMinutes };
      });
      return matrix;
    },
    branchWorkingHoursText() {
      return `${this.branchWorkingHours.startTime || '--:--'}-${this.branchWorkingHours.endTime || '--:--'}`;
    },
    firstGridMinute() {
      return this.timeGridSlots[0]?.minutes ?? null;
    }
  },
  methods: {
    openWorkingHoursModal() {
      if (!this.workingHours) {
        this.loadWorkingHours();
      }
      this.showWorkingHoursModal = true;
    },
    closeWorkingHoursModal() {
      this.showWorkingHoursModal = false;
    },
    async init() {
      if (!window.api) {
        setTimeout(() => this.init(), 200);
        return;
      }

      try {
        const me = await window.api.getMe();
        const currentUser = me?.user || me || {};
        const branchScope = me?.branchScope || currentUser.branchScope || [];
        this.user = currentUser;

        const [branches, users] = await Promise.all([
          window.api.getBranches().catch(() => []),
          window.api.getUsers().catch(() => [])
        ]);

        const availableBranches = branches.filter(
          b => !branchScope || branchScope.length === 0 ||
            branchScope.includes(b.id)
        );

        if (availableBranches.length === 0 && branches.length > 0) {
          this.branches = branches;
        } else {
          this.branches = availableBranches;
        }

        this.updateBranchWorkingHours();

        this.doctors = users.filter(u => u.role === 'DOCTOR' || u.role === 'HEAD');
        if ((currentUser.role === 'DOCTOR' || currentUser.role === 'HEAD') &&
            !this.doctors.find(d => d.id === currentUser.id)) {
          this.doctors.push(currentUser);
        }

        if (currentUser.role === 'DOCTOR' || currentUser.role === 'HEAD') {
          this.currentDoctorId = currentUser.id;
        } else if (this.doctors.length > 0) {
          this.currentDoctorId = this.doctors[0].id;
        }

        if (this.branches.length > 0) {
          this.currentBranchId = this.branches[0].id;
          this.updateBranchWorkingHours();
        }

        if (this.currentDoctorId && this.currentBranchId) {
          await this.loadWorkingHours();
          this.setWeekStart(new Date());
        }
      } catch (error) {
        console.error('Ошибка инициализации расписания:', error);
        this.error = 'Ошибка загрузки данных';
      }
    },
    async loadWorkingHours() {
      if (!this.currentDoctorId || !this.currentBranchId) return;
      try {
        const workingHours = await window.api.getDoctorWorkingHours(this.currentDoctorId, this.currentBranchId);
        this.workingHours = this.normalizeWorkingHours(workingHours);
      } catch (error) {
        console.error('Ошибка загрузки рабочего времени:', error);
        this.workingHours = this.normalizeWorkingHours(null);
      }
    },
    normalizeWorkingHours(data) {
      const defaultSchedule = Array.from({ length: 7 }, (_, day) => ({
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00',
        isWorking: day >= 1 && day <= 5
      }));

      const schedule = defaultSchedule.map(def => {
        const current = data?.schedule?.find(s => s.dayOfWeek === def.dayOfWeek);
        return { ...def, ...(current || {}) };
      });

      return {
        branchId: data?.branchId || this.currentBranchId,
        slotDurationMin: data?.slotDurationMin || 30,
        schedule,
        exceptions: data?.exceptions || []
      };
    },
    updateBranchWorkingHours() {
      const branch = this.branches.find(b => b.id === this.currentBranchId);
      this.branchWorkingHours = {
        startTime: branch?.startTime || '08:00',
        endTime: branch?.endTime || '20:00'
      };
    },
    async reloadSchedule(fetchWorkingHours = false) {
      if (!this.currentBranchId || !this.currentDoctorId || !this.currentWeekStart) return;
      this.loading = true;
      this.error = null;
      try {
        if (fetchWorkingHours) {
          await this.loadWorkingHours();
        }
        await this.loadAppointmentsForWeek();
      } catch (error) {
        console.error('Ошибка обновления расписания:', error);
        this.error = error.message || 'Ошибка загрузки расписания';
      } finally {
        this.loading = false;
      }
    },
    async loadAppointmentsForWeek() {
      if (!this.currentWeekStart || !this.currentBranchId || !this.currentDoctorId) return;
      try {
        const from = new Date(this.currentWeekStart);
        const to = new Date(from);
        to.setDate(from.getDate() + 6);
        to.setHours(23, 59, 59, 999);
        const appointments = await window.api.getAppointments(
          this.currentBranchId,
          from.toISOString(),
          to.toISOString()
        );
        this.weekAppointments = (appointments || []).filter(a => a.doctorId === this.currentDoctorId);
      } catch (error) {
        console.error('Ошибка загрузки записей недели:', error);
        this.weekAppointments = [];
      }
    },
    setWeekStart(date) {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      this.currentWeekStart = new Date(d.setDate(diff));
      this.currentWeekStart.setHours(0, 0, 0, 0);
      this.currentYear = this.currentWeekStart.getFullYear();
      this.currentMonth = this.currentWeekStart.getMonth() + 1;
      this.reloadSchedule(false);
    },
    prevWeek() {
      if (!this.currentWeekStart) return;
      const newDate = new Date(this.currentWeekStart);
      newDate.setDate(newDate.getDate() - 7);
      this.setWeekStart(newDate);
    },
    nextWeek() {
      if (!this.currentWeekStart) return;
      const newDate = new Date(this.currentWeekStart);
      newDate.setDate(newDate.getDate() + 7);
      this.setWeekStart(newDate);
    },
    goToToday() {
      this.setWeekStart(new Date());
    },
    buildSlotsForDay(dateStr) {
      if (!this.workingHours) return [];
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();

      if (this.isDayOff(dateStr)) return [];

      const daySchedule = this.workingHours.schedule.find(s => s.dayOfWeek === dayOfWeek);
      if (!daySchedule || !daySchedule.isWorking) return [];

      const branchStart = this.timeToMinutes(this.branchWorkingHours.startTime || '08:00');
      const branchEnd = this.timeToMinutes(this.branchWorkingHours.endTime || '20:00');
      const startMinutes = Math.max(branchStart, this.timeToMinutes(daySchedule.startTime));
      const endMinutes = Math.min(branchEnd, this.timeToMinutes(daySchedule.endTime));
      const duration = Math.max(this.workingHours.slotDurationMin || 30, 5);

      if (endMinutes <= startMinutes) return [];

      const slots = [];
      for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += duration) {
        const slotStartDate = this.buildDateWithMinutes(dateStr, minutes);
        const slotEndDate = this.buildDateWithMinutes(dateStr, minutes + duration);
        const appointment = this.findAppointmentForSlot(slotStartDate, slotEndDate);

        slots.push({
          start: slotStartDate.toISOString(),
          end: slotEndDate.toISOString(),
          free: !appointment,
          appointmentId: appointment?.id
        });
      }
      return slots;
    },
    getSlotForCell(date, minutes) {
      const dayMap = this.weekSlotMatrix[date];
      if (!dayMap) return null;
      return dayMap.byMinutes[minutes] || null;
    },
    isSlotFree(slot) {
      return slot.free === true;
    },
    isDayOff(dateStr) {
      return (this.workingHours?.exceptions || []).some(ex => ex.date === dateStr);
    },
    isWorkingDay(dateStr) {
      const dayOfWeek = new Date(dateStr).getDay();
      const daySchedule = this.workingHours?.schedule?.find(s => s.dayOfWeek === dayOfWeek);
      return !!(daySchedule && daySchedule.isWorking && !this.isDayOff(dateStr));
    },
    async openCreateModal(slot) {
      if (!slot.free) {
        if (slot.appointmentId) {
          window.location.href = `appointment-detail.html?id=${slot.appointmentId}`;
        }
        return;
      }

      this.selectedSlot = slot;
      this.showCreateModal = true;

      // Загружаем пациентов и кабинеты
      try {
        const [patients, rooms] = await Promise.all([
          window.api.searchPatients('').catch(() => []),
          window.api.getRooms(this.currentBranchId).catch(() => [])
        ]);
        this.patients = patients;
        this.rooms = rooms;
        this.filteredPatients = patients;
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      }
    },
    closeCreateModal() {
      this.showCreateModal = false;
      this.selectedSlot = null;
      this.selectedPatientId = null;
      this.selectedRoomId = null;
      this.searchQuery = '';
      this.filteredPatients = this.patients;
    },
    filterPatients() {
      if (!this.searchQuery.trim()) {
        this.filteredPatients = this.patients;
        return;
      }
      const query = this.searchQuery.toLowerCase();
      this.filteredPatients = this.patients.filter(p =>
        p.fullName.toLowerCase().includes(query) ||
        (p.phone && p.phone.includes(query))
      );
    },
    async createAppointment(patientId, roomId) {
      if (!this.selectedSlot || !patientId) return;

      try {
        const appointment = await window.api.createAppointment({
          branchId: this.currentBranchId,
          doctorId: this.currentDoctorId,
          roomId: roomId || this.rooms[0]?.id,
          start: this.selectedSlot.start,
          end: this.selectedSlot.end,
          patientId: patientId
        });

        this.closeCreateModal();
        await this.reloadSchedule(false);
        
        window.location.href = `appointment-detail.html?id=${appointment.id}`;
      } catch (error) {
        console.error('Ошибка создания записи:', error);
        alert('Ошибка создания записи: ' + (error.message || 'Неизвестная ошибка'));
      }
    },
    formatDateFull,
    formatTime,
    getStatusText,
    formatSlotTime(slot) {
      if (!slot || !slot.start) return '';
      const date = new Date(slot.start);
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    },
    getDateFromString(dateStr) {
      const date = new Date(dateStr);
      return date.getDate();
    },
    isToday(dateStr) {
      const today = new Date();
      const date = new Date(dateStr);
      return date.toDateString() === today.toDateString();
    },
    getDayName(dayIndex) {
      const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      return days[dayIndex];
    },
    getFullDayName(dayIndex) {
      const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      return days[dayIndex];
    },
    timeToMinutes(timeStr) {
      if (!timeStr || typeof timeStr !== 'string') return 0;
      const [hours, minutes] = timeStr.split(':').map(n => parseInt(n, 10));
      return (hours || 0) * 60 + (minutes || 0);
    },
    minutesToTime(minutes) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },
    buildDateWithMinutes(dateStr, minutes) {
      const base = new Date(`${dateStr}T00:00:00`);
      base.setMinutes(base.getMinutes() + minutes);
      return base;
    },
    getMinutesFromDate(dateStr) {
      const date = new Date(dateStr);
      return date.getHours() * 60 + date.getMinutes();
    },
    findAppointmentForSlot(slotStart, slotEnd) {
      return this.weekAppointments.find(app => {
        const start = new Date(app.start);
        const end = new Date(app.end);
        return start.getTime() <= slotStart.getTime() && end.getTime() > slotStart.getTime();
      });
    },
    addDayOff() {
      if (!this.dayOffDate) return;
      const exists = (this.workingHours.exceptions || []).some(ex => ex.date === this.dayOffDate);
      if (exists) return;
      this.workingHours.exceptions.push({
        date: this.dayOffDate,
        reason: this.dayOffReason || 'Нерабочий день'
      });
      this.dayOffDate = '';
      this.dayOffReason = '';
    },
    removeDayOff(date) {
      this.workingHours.exceptions = (this.workingHours.exceptions || []).filter(ex => ex.date !== date);
    },
    async saveWorkingHours() {
      if (!this.canEditWorkingHours || !this.workingHours) return;
      try {
        const payload = {
          branchId: this.currentBranchId,
          slotDurationMin: Math.max(parseInt(this.workingHours.slotDurationMin, 10) || 30, 5),
          schedule: this.workingHours.schedule,
          exceptions: this.workingHours.exceptions
        };
        await window.api.setDoctorWorkingHours(this.currentDoctorId, payload);
        await this.reloadSchedule(true);
        this.closeWorkingHoursModal();
      } catch (error) {
        console.error('Ошибка сохранения рабочего времени:', error);
        alert('Не удалось сохранить график: ' + (error.message || 'Ошибка'));
      }
    }
  },
  watch: {
    async currentBranchId() {
      if (this.currentBranchId && this.currentDoctorId) {
        this.updateBranchWorkingHours();
        await this.reloadSchedule(true);
      }
    },
    async currentDoctorId() {
      if (this.currentBranchId && this.currentDoctorId) {
        await this.reloadSchedule(true);
      }
    },
    searchQuery() {
      this.filterPatients();
    }
  }
});

const scheduleRoot = document.querySelector('#schedule-app');
if (scheduleRoot) {
  app.mount(scheduleRoot);
} else {
  console.warn('schedule-app mount target not found');
}
