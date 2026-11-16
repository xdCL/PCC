export class Dialogs {
  constructor() {
    this.modeDialog = document.querySelector('#presentation-mode-dialog');
    this.modeDocumentName = document.querySelector('#mode-document-name');
    this.modeSlides = document.querySelector('#mode-slides');
    this.modeDocument = document.querySelector('#mode-document');
    this.modeCancel = document.querySelector('#mode-cancel');
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

  requestPresentationMode({ fileName, pageCount }) {
    this.modeDocumentName.textContent =
      `${fileName} · ${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}`;

    return new Promise((resolve) => {
      let settled = false;
      const cleanup = () => {
        this.modeSlides.removeEventListener('click', onSlides);
        this.modeDocument.removeEventListener('click', onDocument);
        this.modeCancel.removeEventListener('click', onCancel);
        this.modeDialog.removeEventListener('cancel', onCancel);
      };
      const choose = (mode) => {
        if (settled) return;
        settled = true;
        cleanup();
        this.modeDialog.close();
        resolve(mode);
      };
      const onSlides = () => choose('slides');
      const onDocument = () => choose('document');
      const onCancel = (event) => {
        event?.preventDefault();
        choose(null);
      };

      this.modeSlides.addEventListener('click', onSlides);
      this.modeDocument.addEventListener('click', onDocument);
      this.modeCancel.addEventListener('click', onCancel);
      this.modeDialog.addEventListener('cancel', onCancel);
      this.modeDialog.showModal();
      queueMicrotask(() => this.modeSlides.focus());
    });
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
