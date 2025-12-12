import { getCategoryText, getUnitText, getActionText } from '../modules/utils.js';

const { createApp } = Vue;

createApp({
  data() {
    return {
      branches: [],
      currentBranchId: null,
      currentCategory: null,
      currentTab: 'stock',
      stockItems: [],
      movementLogs: [],
      users: [],
      loading: false,
      error: null,
      canViewInventory: false,
      canWriteInventory: false,
      showWriteOffModal: false,
      showReceiptModal: false,
      showIssueModal: false,
      writeOffData: { itemId: null, quantity: null, reason: '' },
      receiptData: { itemId: null, quantity: null, comment: '' },
      issueData: { itemId: null, quantity: null, comment: '' }
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

        const permissions = me.permissions || {};
        this.canViewInventory = permissions.canViewInventory ||
          me.user?.role === 'ADMIN' || me.user?.role === 'HEAD' ||
          me.user?.role === 'SYSADMIN';
        this.canWriteInventory = permissions.canWriteInventory ||
          me.user?.role === 'ADMIN' || me.user?.role === 'HEAD';

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
        }

        try {
          this.users = await window.api.getUsers();
        } catch (error) {
          console.warn('Не удалось загрузить пользователей:', error);
        }

        if (this.currentBranchId) {
          await this.loadInventory();
        }
      } catch (error) {
        console.error('Ошибка инициализации склада:', error);
        this.error = 'Ошибка загрузки данных';
      }
    },
    async loadInventory() {
      if (!this.currentBranchId || !window.api) return;

      if (!this.canViewInventory) {
        this.error = 'У вас нет прав для просмотра склада';
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        if (this.currentTab === 'stock') {
          await this.loadStock();
        } else if (this.currentTab === 'movement') {
          await this.loadMovement();
        } else if (this.currentTab === 'operations') {
          await this.loadStock();
        }
      } catch (error) {
        console.error('Ошибка загрузки склада:', error);
        this.error = error.message || 'Ошибка загрузки склада';
      } finally {
        this.loading = false;
      }
    },
    async loadStock() {
      let items = await window.api.getInventory(this.currentBranchId);

      if (this.currentCategory) {
        items = items.filter(item => item.category === this.currentCategory);
      }

      this.stockItems = items;
    },
    async loadMovement() {
      let auditLogs = await window.api.getAudit();

      const inventoryActions = ['INVENTORY_WRITE_OFF', 'INVENTORY_RECEIPT', 'INVENTORY_ISSUE'];
      auditLogs = auditLogs.filter(
        log => log.entityType === 'INVENTORY' &&
          inventoryActions.includes(log.action)
      );

      if (this.currentBranchId) {
        auditLogs = auditLogs.filter(log => log.branchId === this.currentBranchId);
      }

      auditLogs.sort((a, b) => new Date(b.ts) - new Date(a.ts));
      auditLogs = auditLogs.slice(0, 100);

      this.movementLogs = auditLogs;
    },
    setTab(tab) {
      this.currentTab = tab;
      this.loadInventory();
    },
    async performWriteOff() {
      const itemId = this.writeOffData.itemId;
      const quantity = parseFloat(this.writeOffData.quantity);
      const reason = this.writeOffData.reason;

      if (!itemId || !quantity || quantity <= 0) {
        alert('Заполните все обязательные поля');
        return;
      }

      try {
        await window.api.writeOffInventory(itemId, quantity, reason, this.currentBranchId);
        alert('Списание выполнено успешно');
        this.showWriteOffModal = false;
        this.writeOffData = { itemId: null, quantity: null, reason: '' };
        await this.loadInventory();
      } catch (error) {
        console.error('Ошибка списания:', error);
        alert('Ошибка списания: ' + (error.message || 'Неизвестная ошибка'));
      }
    },
    async openReceiptModal() {
      this.showReceiptModal = true;
      if (this.currentTab !== 'stock') {
        await this.loadStock();
      }
    },
    async openIssueModal() {
      this.showIssueModal = true;
      if (this.currentTab !== 'stock') {
        await this.loadStock();
      }
    },
    async performReceipt() {
      const itemId = this.receiptData.itemId;
      const quantity = parseFloat(this.receiptData.quantity);
      const comment = this.receiptData.comment;

      if (!itemId || !quantity || quantity <= 0) {
        alert('Заполните все обязательные поля');
        return;
      }

      try {
        await window.api.receiptInventory(itemId, quantity, comment, this.currentBranchId);
        alert('Поступление зафиксировано успешно');
        this.showReceiptModal = false;
        this.receiptData = { itemId: null, quantity: null, comment: '' };
        await this.loadInventory();
      } catch (error) {
        console.error('Ошибка поступления:', error);
        alert('Ошибка поступления: ' + (error.message || 'Неизвестная ошибка'));
      }
    },
    async performIssue() {
      const itemId = this.issueData.itemId;
      const quantity = parseFloat(this.issueData.quantity);
      const comment = this.issueData.comment;

      if (!itemId || !quantity || quantity <= 0) {
        alert('Заполните все обязательные поля');
        return;
      }

      try {
        await window.api.issueInventory(itemId, quantity, comment, this.currentBranchId);
        alert('Выдача выполнена успешно');
        this.showIssueModal = false;
        this.issueData = { itemId: null, quantity: null, comment: '' };
        await this.loadInventory();
      } catch (error) {
        console.error('Ошибка выдачи:', error);
        alert('Ошибка выдачи: ' + (error.message || 'Неизвестная ошибка'));
      }
    },
    async openWriteOffModal(itemId = null, itemName = null) {
      this.writeOffData = { itemId, itemName, quantity: null, reason: '' };
      this.showWriteOffModal = true;
      
      if (!itemId && this.currentTab === 'stock') {
        await this.loadStock();
      }
    },
    getUserName(userId) {
      const user = this.users.find(u => u.id === userId);
      return user ? user.name : `ID: ${userId}`;
    },
    formatDateTime(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    getCategoryText,
    getUnitText,
    getActionText
  },
  watch: {
    currentBranchId() {
      if (this.currentBranchId) {
        this.loadInventory();
      }
    },
    currentCategory() {
      if (this.currentTab === 'stock') {
        this.loadInventory();
      }
    }
  }
}).mount('#inventory-app');
