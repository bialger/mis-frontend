const { createApp } = Vue;

createApp({
  data() {
    return {
      formData: {
        login: '',
        password: ''
      },
      loading: false,
      error: null
    };
  },
  mounted() {
    if (window.apiUtils && window.apiUtils.isAuthenticated()) {
      window.location.href = 'index.html';
      return;
    }
  },
  methods: {
    async handleSubmit() {
      if (!this.formData.login.trim() || !this.formData.password.trim()) {
        this.error = 'Заполните все поля';
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const result = await window.api.login(this.formData.login.trim(), this.formData.password.trim());

        if (result && result.accessToken) {
          window.location.href = 'index.html';
        } else {
          this.error = 'Ошибка входа. Попробуйте снова.';
        }
      } catch (error) {
        console.error('Ошибка входа:', error);
        this.error = error.message || 'Неверный логин или пароль';
      } finally {
        this.loading = false;
      }
    }
  }
}).mount('#login-app');
