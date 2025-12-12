const {createApp} = Vue;

createApp({
  data() {
    return {
      loading: true,
      error: null,
      activeTab: 'users',
      user: null,
      permissions: null,

      users: [],
      roles: [],
      editingUser: null,
      showUserModal: false,
      userForm: {
        name: '',
        login: '',
        password: '',
        role: 'DOCTOR',
        branchScope: [],
        disabled: false
      },

      rolePermissions: {},

      branches: [],
      editingBranch: null,
      showBranchModal: false,
      branchForm: {name: '', address: '', phone: '', startTime: '08:00', endTime: '20:00'},

      rooms: [],
      editingRoom: null,
      showRoomModal: false,
      roomForm: {branchId: null, name: '', number: ''},

      services: [],
      editingService: null,
      showServiceModal: false,
      serviceForm: {
        branchId: null,
        name: '',
        price: 0,
        durationMin: 30,
        inventoryAutoWriteOff: []
      },

      templates: [],
      editingTemplate: null,
      showTemplateModal: false,
      templateForm: {
        name: '',
        specialty: '',
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

      patientIcons: [],
      editingIcon: null,
      showIconModal: false,
      iconForm: {id: '', emoji: '', label: '', isActive: true},

      integrations: {sms: {}, labs: []},
      showSmsModal: false,
      smsForm: {provider: '', apiKey: '', apiUrl: '', enabled: false}
    };
  },
  async mounted() {
    await this.init();
    // Обработчик клавиши Escape для закрытия модальных окон
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.showUserModal) this.closeUserModal();
        else if (this.showBranchModal) this.closeBranchModal();
        else if (this.showRoomModal) this.closeRoomModal();
        else if (this.showServiceModal) this.closeServiceModal();
        else if (this.showTemplateModal) this.closeTemplateModal();
        else if (this.showIconModal) this.closeIconModal();
        else if (this.showSmsModal) this.closeSmsModal();
      }
    });
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
        this.user = me.user || me;
        this.permissions = me.permissions || {};


        if (!this.user || (this.user.role !== 'SYSADMIN' && this.user.role !== 'HEAD')) {
          this.error = 'У вас нет прав для доступа к настройкам';
          this.loading = false;
          return;
        }

        await this.loadUsers();
        await this.loadRoles();
        await this.loadBranches();
        await this.loadRooms();
        await this.loadServices();
        await this.loadTemplates();
        await this.loadPatientIcons();
        await this.loadIntegrations();

        this.loading = false;
      } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
        this.error = error.message || 'Ошибка загрузки данных';
        this.loading = false;
      }
    },


    async loadUsers() {
      try {
        this.users = await window.api.getUsers();
      } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        this.users = [];
      }
    },

    async loadRoles() {
      try {
        this.roles = await window.api.getRoles();
      } catch (error) {
        console.error('Ошибка загрузки ролей:', error);
        this.roles = [];
      }
    },

    openUserModal(user = null) {
      this.editingUser = user;
      if (user) {
        this.userForm = {
          name: user.name || '',
          login: user.login || '',
          password: '',
          role: user.role || 'DOCTOR',
          branchScope: user.branchScope || [],
          disabled: user.disabled || false
        };
      } else {
        this.userForm = {
          name: '',
          login: '',
          password: '',
          role: 'DOCTOR',
          branchScope: [],
          disabled: false
        };
      }
      this.showUserModal = true;
    },

    closeUserModal() {
      this.showUserModal = false;
      this.editingUser = null;
      this.userForm = {
        name: '',
        login: '',
        password: '',
        role: 'DOCTOR',
        branchScope: [],
        disabled: false
      };
    },

    async saveUser() {
      try {
        if (this.editingUser) {
          await window.api.updateUser(this.editingUser.id, this.userForm);
        } else {
          await window.api.createUser(this.userForm);
        }
        await this.loadUsers();
        this.closeUserModal();
      } catch (error) {
        alert(
            'Ошибка сохранения пользователя: ' +
            (error.message || 'Неизвестная ошибка'));
      }
    },

    getRoleLabel(role) {
      const roleMap = {
        'ADMIN': 'Администратор',
        'DOCTOR': 'Врач',
        'HEAD': 'Руководитель',
        'SYSADMIN': 'Системный администратор'
      };
      return roleMap[role] || role;
    },


    async loadBranches() {
      try {
        this.branches = await window.api.getBranches();
      } catch (error) {
        console.error('Ошибка загрузки филиалов:', error);
        this.branches = [];
      }
    },

    openBranchModal(branch = null) {
      this.editingBranch = branch;
      if (branch) {
        this.branchForm = {
          name: branch.name || '',
          address: branch.address || '',
          phone: branch.phone || '',
          startTime: branch.startTime || '08:00',
          endTime: branch.endTime || '20:00'
        };
      } else {
        this.branchForm = {name: '', address: '', phone: '', startTime: '08:00', endTime: '20:00'};
      }
      this.showBranchModal = true;
    },

    closeBranchModal() {
      this.showBranchModal = false;
      this.editingBranch = null;
      this.branchForm = {name: '', address: '', phone: '', startTime: '08:00', endTime: '20:00'};
    },

    async saveBranch() {
      try {
        if (this.editingBranch) {
          await window.api.updateBranch(this.editingBranch.id, this.branchForm);
        } else {
          await window.api.createBranch(this.branchForm);
        }
        await this.loadBranches();
        await this.loadRooms();
        this.closeBranchModal();
      } catch (error) {
        alert(
            'Ошибка сохранения филиала: ' +
            (error.message || 'Неизвестная ошибка'));
      }
    },


    async loadRooms() {
      try {
        this.rooms = await window.api.getRooms();
      } catch (error) {
        console.error('Ошибка загрузки кабинетов:', error);
        this.rooms = [];
      }
    },

    openRoomModal(room = null) {
      this.editingRoom = room;
      if (room) {
        this.roomForm = {
          branchId: room.branchId || null,
          name: room.name || '',
          number: room.number || ''
        };
      } else {
        this.roomForm = {
          branchId: this.branches.length > 0 ? this.branches[0].id : null,
          name: '',
          number: ''
        };
      }
      this.showRoomModal = true;
    },

    closeRoomModal() {
      this.showRoomModal = false;
      this.editingRoom = null;
      this.roomForm = {branchId: null, name: '', number: ''};
    },

    async saveRoom() {
      try {
        if (this.editingRoom) {
          await window.api.updateRoom(this.editingRoom.id, this.roomForm);
        } else {
          await window.api.createRoom(this.roomForm);
        }
        await this.loadRooms();
        this.closeRoomModal();
      } catch (error) {
        alert(
            'Ошибка сохранения кабинета: ' +
            (error.message || 'Неизвестная ошибка'));
      }
    },

    async deleteRoom(roomId) {
      if (!confirm('Удалить кабинет?')) return;
      try {
        await window.api.deleteRoom(roomId);
        await this.loadRooms();
      } catch (error) {
        alert(
            'Ошибка удаления кабинета: ' +
            (error.message || 'Неизвестная ошибка'));
      }
    },

    getBranchName(branchId) {
      const branch = this.branches.find(b => b.id === branchId);
      return branch ? branch.name : `Филиал ${branchId}`;
    },


    async loadServices() {
      try {
        this.services = await window.api.getServices();
      } catch (error) {
        console.error('Ошибка загрузки услуг:', error);
        this.services = [];
      }
    },

    openServiceModal(service = null) {
      this.editingService = service;
      if (service) {
        this.serviceForm = {
          branchId: service.branchId || null,
          name: service.name || '',
          price: service.price || 0,
          durationMin: service.durationMin || 30,
          inventoryAutoWriteOff: service.inventoryAutoWriteOff || []
        };
      } else {
        this.serviceForm = {
          branchId: this.branches.length > 0 ? this.branches[0].id : null,
          name: '',
          price: 0,
          durationMin: 30,
          inventoryAutoWriteOff: []
        };
      }
      this.showServiceModal = true;
    },

    closeServiceModal() {
      this.showServiceModal = false;
      this.editingService = null;
      this.serviceForm = {
        branchId: null,
        name: '',
        price: 0,
        durationMin: 30,
        inventoryAutoWriteOff: []
      };
    },

    async saveService() {
      try {
        if (this.editingService) {
          await window.api.updateService(
              this.editingService.id, this.serviceForm);
        } else {
          await window.api.createService(this.serviceForm);
        }
        await this.loadServices();
        this.closeServiceModal();
      } catch (error) {
        alert(
            'Ошибка сохранения услуги: ' +
            (error.message || 'Неизвестная ошибка'));
      }
    },

    async deleteService(serviceId) {
      if (!confirm('Удалить услугу?')) return;
      try {
        await window.api.deleteService(serviceId);
        await this.loadServices();
      } catch (error) {
        alert(
            'Ошибка удаления услуги: ' +
            (error.message || 'Неизвестная ошибка'));
      }
    },


    async loadTemplates() {
      try {
        this.templates = await window.api.getTemplates();
      } catch (error) {
        console.error('Ошибка загрузки шаблонов:', error);
        this.templates = [];
      }
    },

    openTemplateModal(template = null) {
      this.editingTemplate = template;
      if (template) {
        this.templateForm = {
          name: template.name || '',
          specialty: template.specialty || '',
          sections: template.sections ||
              {
                complaints: '', anamnesis: '', examination: '', diagnoses: [],
                    orders: '', procedures: '', epicrisis: ''
              }
        };
      } else {
        this.templateForm = {
          name: '',
          specialty: '',
          sections: {
            complaints: '',
            anamnesis: '',
            examination: '',
            diagnoses: [],
            orders: '',
            procedures: '',
            epicrisis: ''
          }
        };
      }
      this.showTemplateModal = true;
    },

    closeTemplateModal() {
      this.showTemplateModal = false;
      this.editingTemplate = null;
      this.templateForm = {
        name: '',
        specialty: '',
        sections: {
          complaints: '',
          anamnesis: '',
          examination: '',
          diagnoses: [],
          orders: '',
          procedures: '',
          epicrisis: ''
        }
      };
    },

    async saveTemplate() {
      try {
        if (this.editingTemplate) {
          await window.api.saveTemplate(this.templateForm);
        } else {
          await window.api.saveTemplate(this.templateForm);
        }
        await this.loadTemplates();
        this.closeTemplateModal();
      } catch (error) {
        alert(
            'Ошибка сохранения шаблона: ' +
            (error.message || 'Неизвестная ошибка'));
      }
    },

    async deleteTemplate(templateId) {
      if (!confirm('Удалить шаблон?')) return;
      try {
        await window.api.deleteTemplate(templateId);
        await this.loadTemplates();
      } catch (error) {
        alert(
            'Ошибка удаления шаблона: ' +
            (error.message || 'Неизвестная ошибка'));
      }
    },

    addDiagnosis() {
      this.templateForm.sections.diagnoses.push({text: '', code: ''});
    },

    removeDiagnosis(index) {
      this.templateForm.sections.diagnoses.splice(index, 1);
    },


    async loadPatientIcons() {
      try {
        this.patientIcons = await window.api.getPatientIcons();
      } catch (error) {
        console.error('Ошибка загрузки значков:', error);
        this.patientIcons = [];
      }
    },

    openIconModal(icon = null) {
      this.editingIcon = icon;
      if (icon) {
        this.iconForm = {
          id: icon.id || '',
          emoji: icon.emoji || '',
          label: icon.label || '',
          isActive: icon.isActive !== false
        };
      } else {
        this.iconForm = {id: '', emoji: '', label: '', isActive: true};
      }
      this.showIconModal = true;
    },

    closeIconModal() {
      this.showIconModal = false;
      this.editingIcon = null;
      this.iconForm = {id: '', emoji: '', label: '', isActive: true};
    },

    async saveIcon() {
      try {
        if (this.editingIcon) {
          await window.api.updatePatientIcon(
              this.editingIcon.id, this.iconForm);
        } else {
          await window.api.createPatientIcon(this.iconForm);
        }
        await this.loadPatientIcons();
        this.closeIconModal();
      } catch (error) {
        alert(
            'Ошибка сохранения значка: ' +
            (error.message || 'Неизвестная ошибка'));
      }
    },

    async deleteIcon(iconId) {
      if (!confirm('Удалить значок?')) return;
      try {
        await window.api.deletePatientIcon(iconId);
        await this.loadPatientIcons();
      } catch (error) {
        alert(
            'Ошибка удаления значка: ' +
            (error.message || 'Неизвестная ошибка'));
      }
    },


    async loadIntegrations() {
      try {
        this.integrations = await window.api.getIntegrations();
        if (this.integrations.sms) {
          this.smsForm = {
            provider: this.integrations.sms.provider || '',
            apiKey: this.integrations.sms.apiKey || '',
            apiUrl: this.integrations.sms.apiUrl || '',
            enabled: this.integrations.sms.enabled || false
          };
        }
      } catch (error) {
        console.error('Ошибка загрузки интеграций:', error);
        this.integrations = {sms: {}, labs: []};
      }
    },

    openSmsModal() {
      this.showSmsModal = true;
    },

    closeSmsModal() {
      this.showSmsModal = false;
    },

    async saveSmsIntegration() {
      try {
        await window.api.updateSmsIntegration(this.smsForm);
        await this.loadIntegrations();
        this.closeSmsModal();
        alert('Настройки SMS сохранены');
      } catch (error) {
        alert(
            'Ошибка сохранения настроек SMS: ' +
            (error.message || 'Неизвестная ошибка'));
      }
    }
  }
}).mount('#settings-app');
