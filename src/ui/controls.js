export class Controls {
  constructor(stage) {
    this.stage = stage;
    this.bar = document.querySelector('#control-bar');
    this.elements = {
      previous: document.querySelector('#previous-page'),
      next: document.querySelector('#next-page'),
      pageInput: document.querySelector('#page-input'),
      pageTotal: document.querySelector('#page-total'),
      thumbnails: document.querySelector('#toggle-thumbnails'),
      closeThumbnails: document.querySelector('#close-thumbnails'),
      fit: document.querySelector('#fit-button'),
      fitLabel: document.querySelector('#fit-label'),
      zoomOut: document.querySelector('#zoom-out'),
      zoomIn: document.querySelector('#zoom-in'),
      zoomValue: document.querySelector('#zoom-value'),
      zoomValueText: document.querySelector('#zoom-value span'),
      pointer: document.querySelector('#pointer-button'),
      fullscreen: document.querySelector('#fullscreen-button'),
      present: document.querySelector('#present-button'),
      openFile: document.querySelector('#open-file-header'),
      timer: document.querySelector('#timer-button'),
      timerDisplay: document.querySelector('#timer-display'),
      timerPopover: document.querySelector('#timer-popover'),
      timerToggle: document.querySelector('#timer-toggle'),
      timerToggleIcon: document.querySelector('#timer-toggle-icon'),
      timerReset: document.querySelector('#timer-reset'),
    };
    this.hideTimer = 0;
    this.interacting = false;
    this.setupAutoHide();
  }

  bind(actions) {
    const el = this.elements;
    el.previous.addEventListener('click', actions.previous);
    el.next.addEventListener('click', actions.next);
    el.thumbnails.addEventListener('click', actions.toggleThumbnails);
    el.closeThumbnails.addEventListener('click', actions.toggleThumbnails);
    el.fit.addEventListener('click', actions.cycleFit);
    el.zoomOut.addEventListener('click', () => actions.zoom(-10));
    el.zoomIn.addEventListener('click', () => actions.zoom(10));
    el.zoomValue.addEventListener('click', actions.fitPage);
    el.pointer.addEventListener('click', actions.togglePointer);
    el.fullscreen.addEventListener('click', actions.present);
    el.present.addEventListener('click', actions.present);
    el.openFile.addEventListener('click', actions.openFile);
    el.timer.addEventListener('click', () => this.toggleTimerPopover());
    el.timerToggle.addEventListener('click', actions.toggleTimer);
    el.timerReset.addEventListener('click', actions.resetTimer);

    const submitPage = () => actions.goToPage(Number(el.pageInput.value));
    el.pageInput.addEventListener('change', submitPage);
    el.pageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitPage();
        el.pageInput.select();
      }
    });
  }

  setupAutoHide() {
    const markInteracting = (value) => {
      this.interacting = value;
      if (value) this.reveal(false);
      else this.scheduleHide();
    };

    this.bar.addEventListener('pointerenter', () => markInteracting(true));
    this.bar.addEventListener('pointerleave', () => markInteracting(false));
    this.bar.addEventListener('focusin', () => markInteracting(true));
    this.bar.addEventListener('focusout', () => {
      queueMicrotask(() => markInteracting(this.bar.contains(document.activeElement)));
    });
    this.elements.timerPopover.addEventListener('pointerenter', () => markInteracting(true));
    this.elements.timerPopover.addEventListener('pointerleave', () => markInteracting(false));
    this.stage.addEventListener('pointermove', () => this.reveal());
    this.stage.addEventListener('pointerdown', () => this.reveal());
  }

  reveal(schedule = true) {
    this.stage.classList.remove('controls-hidden');
    window.clearTimeout(this.hideTimer);
    if (schedule) this.scheduleHide();
  }

  scheduleHide() {
    window.clearTimeout(this.hideTimer);
    if (this.interacting) return;
    this.hideTimer = window.setTimeout(() => {
      if (!this.interacting && this.elements.timerPopover.hidden) {
        this.stage.classList.add('controls-hidden');
      }
    }, 2500);
  }

  setPage(current, total) {
    const el = this.elements;
    el.pageInput.value = String(current);
    el.pageInput.max = String(total);
    el.pageTotal.textContent = String(total);
    el.previous.disabled = current <= 1;
    el.next.disabled = current >= total;
  }

  setView(mode, zoom) {
    const labels = {
      'fit-page': 'Ajustar',
      'fit-width': 'Ancho',
      manual: 'Manual',
    };
    this.elements.fitLabel.textContent = labels[mode] || 'Ajustar';
    this.elements.zoomValueText.textContent = `${Math.round(zoom)}%`;
    this.elements.zoomOut.disabled = zoom <= 25;
    this.elements.zoomIn.disabled = zoom >= 300;
  }

  setThumbnails(open) {
    this.elements.thumbnails.setAttribute('aria-expanded', String(open));
    this.elements.thumbnails.setAttribute('aria-label', `${open ? 'Ocultar' : 'Mostrar'} miniaturas`);
  }

  setPointer(active) {
    this.elements.pointer.setAttribute('aria-pressed', String(active));
    this.elements.pointer.setAttribute('aria-label', `${active ? 'Desactivar' : 'Activar'} puntero`);
  }

  setTimer(time, running) {
    this.elements.timerDisplay.textContent = time;
    this.elements.timerToggle.setAttribute('aria-label', running ? 'Pausar temporizador' : 'Iniciar temporizador');
    this.elements.timerToggleIcon.setAttribute('href', running ? '#icon-pause' : '#icon-play');
  }

  toggleTimerPopover(force) {
    const shouldOpen = force ?? this.elements.timerPopover.hidden;
    this.elements.timerPopover.hidden = !shouldOpen;
    this.elements.timer.setAttribute('aria-expanded', String(shouldOpen));
    if (shouldOpen) this.reveal(false);
    else this.scheduleHide();
  }
}
