export class Dialogs {
  constructor() {
    this.passwordDialog = document.querySelector('#password-dialog');
    this.passwordForm = document.querySelector('#password-form');
    this.passwordInput = document.querySelector('#password-input');
    this.passwordError = document.querySelector('#password-error');
    this.passwordCancel = document.querySelector('#password-cancel');
    this.errorDialog = document.querySelector('#error-dialog');
    this.errorMessage = document.querySelector('#error-message');
    this.errorClose = document.querySelector('#error-close');
    this.toastElement = document.querySelector('#toast');
    this.toastTimer = 0;

    this.errorClose.addEventListener('click', () => this.errorDialog.close());
  }

  requestPassword({ incorrect = false } = {}) {
    return new Promise((resolve) => {
      this.passwordInput.value = '';
      this.passwordError.hidden = !incorrect;
      this.passwordDialog.showModal();
      queueMicrotask(() => this.passwordInput.focus());

      const cleanup = () => {
        this.passwordForm.removeEventListener('submit', submit);
        this.passwordCancel.removeEventListener('click', cancel);
        this.passwordDialog.removeEventListener('cancel', cancel);
      };

      const submit = (event) => {
        event.preventDefault();
        const password = this.passwordInput.value;
        if (!password) {
          this.passwordInput.focus();
          return;
        }
        cleanup();
        this.passwordDialog.close();
        this.passwordInput.value = '';
        resolve(password);
      };

      const cancel = (event) => {
        event.preventDefault();
        cleanup();
        this.passwordDialog.close();
        this.passwordInput.value = '';
        resolve(null);
      };

      this.passwordForm.addEventListener('submit', submit);
      this.passwordCancel.addEventListener('click', cancel);
      this.passwordDialog.addEventListener('cancel', cancel);
    });
  }

  error(message) {
    this.errorMessage.textContent = message;
    if (!this.errorDialog.open) this.errorDialog.showModal();
  }

  toast(message, duration = 3200) {
    window.clearTimeout(this.toastTimer);
    this.toastElement.textContent = message;
    this.toastElement.hidden = false;
    this.toastTimer = window.setTimeout(() => {
      this.toastElement.hidden = true;
    }, duration);
  }
}
