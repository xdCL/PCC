import { PdfRenderer } from '../pdf/pdf-renderer.js';
import { Controls } from '../ui/controls.js';
import { ThumbnailPanel } from '../ui/thumbnails.js';
import { clamp, debounce, formatFileSize, nextFrame, safeFileName } from '../utils/helpers.js';
import { setupKeyboard } from './keyboard.js';
import { toggleFullscreen, onFullscreenChange } from './fullscreen.js';
import { setupGestures } from './gestures.js';
import { CanvasPan } from './pan.js';
import { LaserPointer } from './pointer.js';
import { PresentationTimer } from './timer.js';

export class PresentationController {
  constructor({ dialogs, onOpenFile }) {
    this.dialogs = dialogs;
    this.onOpenFile = onOpenFile;
    this.screen = document.querySelector('#presentation-screen');
    this.welcome = document.querySelector('#welcome-screen');
    this.stage = document.querySelector('#stage');
    this.canvasScroll = document.querySelector('#canvas-scroll');
    this.thumbnailPanelElement = document.querySelector('#thumbnail-panel');
    this.loading = document.querySelector('#loading-indicator');
    this.loadingText = document.querySelector('#loading-text');
    this.blankScreen = document.querySelector('#blank-screen');
    this.blankLabel = document.querySelector('#blank-label');
    this.documentName = document.querySelector('#document-name');
    this.documentMeta = document.querySelector('#document-meta');

    this.currentDocument = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.viewMode = 'fit-page';
    this.zoom = 100;
    this.thumbnailsOpen = false;
    this.blankMode = null;
    this.viewBeforeFullscreen = null;
    this.active = false;

    this.controls = new Controls(this.stage);
    this.renderer = new PdfRenderer({
      canvas: document.querySelector('#pdf-canvas'),
      container: this.canvasScroll,
      frame: document.querySelector('#canvas-frame'),
      onLoadingChange: (visible, page) => this.setLoading(visible, page ? `Preparando página ${page}…` : ''),
      onQualityLimited: () => this.dialogs.toast('La resolución se ajustó para proteger la memoria del dispositivo.'),
    });
    this.thumbnails = new ThumbnailPanel({
      panel: this.thumbnailPanelElement,
      list: document.querySelector('#thumbnail-list'),
      count: document.querySelector('#thumbnail-count'),
      onSelect: (page) => {
        this.goTo(page);
        if (window.innerWidth < 650) this.setThumbnails(false);
      },
    });
    this.pan = new CanvasPan(this.canvasScroll, document.querySelector('#canvas-frame'));
    this.pointer = new LaserPointer(
      this.stage,
      document.querySelector('#laser-pointer'),
      document.querySelector('#pointer-indicator'),
    );
    this.timer = new PresentationTimer((time, running) => this.controls.setTimer(time, running));

    this.bindControls();
    this.removeKeyboard = setupKeyboard(this.keyboardActions());
    this.removeGestures = setupGestures(this.stage, {
      next: () => this.next(),
      previous: () => this.previous(),
    });
    this.removeFullscreenListener = onFullscreenChange((isFullscreen) => this.handleFullscreenChange(isFullscreen));

    this.onResize = debounce(() => {
      if (!this.active) return;
      if (window.innerWidth < 650) this.controls.toggleTimerPopover(false);
      this.renderer.invalidate();
      void this.renderCurrent(false);
    }, 180);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
  }

  bindControls() {
    this.controls.bind({
      previous: () => this.previous(),
      next: () => this.next(),
      goToPage: (page) => this.goTo(page),
      toggleThumbnails: () => this.toggleThumbnails(),
      cycleFit: () => this.cycleFit(),
      fitPage: () => this.setView('fit-page', 100),
      zoom: (amount) => this.changeZoom(amount),
      togglePointer: () => this.togglePointer(),
      present: () => void this.present(),
      openFile: this.onOpenFile,
      toggleTimer: () => this.timer.toggle(),
      resetTimer: () => this.timer.reset(),
    });
  }

  keyboardActions() {
    return {
      isActive: () => this.active,
      next: () => this.next(),
      previous: () => this.previous(),
      first: () => this.goTo(1),
      last: () => this.goTo(this.totalPages),
      present: () => void this.present(),
      toggleThumbnails: () => this.toggleThumbnails(),
      togglePointer: () => this.togglePointer(),
      blank: (color) => this.toggleBlank(color),
      fitPage: () => this.setView('fit-page', 100),
      zoom: (amount) => this.changeZoom(amount),
      revealControls: () => this.controls.reveal(),
    };
  }

  async open(pdfDocument, file) {
    await this.closeCurrent();
    this.currentDocument = pdfDocument;
    this.currentPage = 1;
    this.totalPages = pdfDocument.numPages;
    this.viewMode = 'fit-page';
    this.zoom = 100;
    this.blankMode = null;
    this.active = true;

    this.documentName.textContent = safeFileName(file.name);
    this.documentMeta.textContent = `${this.totalPages} ${this.totalPages === 1 ? 'página' : 'páginas'} · ${formatFileSize(file.size)}`;
    document.title = `${safeFileName(file.name)} · PresentaCualquierCosa`;
    this.blankScreen.hidden = true;
    this.renderer.setDocument(pdfDocument);
    this.thumbnails.setDocument(pdfDocument);
    this.thumbnails.setCurrent(1);
    this.setThumbnails(false);
    this.pointer.setActive(false);
    this.pan.setEnabled(true);
    this.controls.setPointer(false);
    this.controls.setPage(1, this.totalPages);
    this.controls.setView(this.viewMode, this.zoom);
    this.updateViewClass();

    this.welcome.hidden = true;
    this.screen.hidden = false;
    await nextFrame();
    await this.renderCurrent(false);
    this.stage.focus({ preventScroll: true });
    this.controls.reveal();
  }

  async closeCurrent() {
    if (!this.currentDocument) return;
    const oldDocument = this.currentDocument;
    this.currentDocument = null;
    this.renderer.destroy();
    this.thumbnails.destroy();
    try {
      await oldDocument.destroy();
    } catch {
      // A cancelled render can already have released the worker.
    }
  }

  async renderCurrent(transition = true) {
    if (!this.currentDocument) return;
    try {
      await this.renderer.render(this.currentPage, { transition });
      this.pan.refresh();
    } catch (error) {
      console.error(error);
      this.dialogs.error('Ocurrió un error al preparar esta página. Intenta cambiar de página o volver a abrir el PDF.');
    }
  }

  goTo(page) {
    if (!Number.isFinite(page) || !this.totalPages) {
      this.controls.setPage(this.currentPage, this.totalPages);
      return;
    }
    const target = clamp(Math.trunc(page), 1, this.totalPages);
    if (target === this.currentPage) {
      this.controls.setPage(this.currentPage, this.totalPages);
      return;
    }
    this.currentPage = target;
    this.controls.setPage(target, this.totalPages);
    this.thumbnails.setCurrent(target, true);
    void this.renderCurrent(true);
  }

  next() {
    this.goTo(this.currentPage + 1);
  }

  previous() {
    this.goTo(this.currentPage - 1);
  }

  cycleFit() {
    const mode = this.viewMode === 'fit-width' ? 'fit-page' : 'fit-width';
    this.setView(mode, 100);
  }

  changeZoom(amount) {
    const baseZoom = this.viewMode === 'manual' ? this.zoom : 100;
    this.setView('manual', clamp(baseZoom + amount, 25, 300));
  }

  setView(mode, zoom) {
    this.viewMode = mode;
    this.zoom = zoom;
    this.renderer.setView(mode, zoom);
    this.renderer.invalidate();
    this.updateViewClass();
    this.controls.setView(mode, zoom);
    this.canvasScroll.scrollTo({ top: 0, left: 0 });
    void this.renderCurrent(false);
  }

  updateViewClass() {
    this.canvasScroll.classList.toggle('fit-page', this.viewMode === 'fit-page');
    this.canvasScroll.classList.toggle('fit-width', this.viewMode === 'fit-width');
    this.canvasScroll.classList.toggle('manual-zoom', this.viewMode === 'manual');
  }

  toggleThumbnails() {
    if (document.fullscreenElement) {
      this.dialogs.toast('Las miniaturas permanecen ocultas durante la proyección.');
      return;
    }
    this.setThumbnails(!this.thumbnailsOpen);
  }

  setThumbnails(open) {
    this.thumbnailsOpen = open;
    this.controls.setThumbnails(open);
    this.thumbnails.setOpen(open);
    window.setTimeout(() => {
      if (!this.active) return;
      this.renderer.invalidate();
      void this.renderCurrent(false);
    }, 200);
  }

  togglePointer() {
    const active = this.pointer.toggle();
    this.pan.setEnabled(!active);
    this.controls.setPointer(active);
    this.dialogs.toast(active ? 'Puntero activado · pulsa P para desactivarlo' : 'Puntero desactivado', 1800);
  }

  toggleBlank(color) {
    if (this.blankMode === color) {
      this.blankMode = null;
      this.blankScreen.hidden = true;
      return;
    }
    this.blankMode = color;
    this.blankLabel.textContent = color === 'white' ? 'Pantalla blanca' : 'Pantalla negra';
    this.blankScreen.classList.toggle('is-white', color === 'white');
    this.blankScreen.hidden = false;
    this.stage.classList.add('controls-hidden');
  }

  async present() {
    try {
      if (!document.fullscreenElement) {
        this.setThumbnails(false);
        this.timer.start();
      }
      await toggleFullscreen(document.documentElement);
    } catch (error) {
      console.error(error);
      this.dialogs.error('El navegador no permitió activar la pantalla completa. Puedes intentarlo de nuevo desde el botón Presentar.');
    }
  }

  async handleFullscreenChange(isFullscreen) {
    this.screen.classList.toggle('is-fullscreen', isFullscreen);
    if (isFullscreen) {
      this.setThumbnails(false);
      this.viewBeforeFullscreen = { mode: this.viewMode, zoom: this.zoom };
      this.viewMode = 'fit-page';
      this.zoom = 100;
    } else if (this.viewBeforeFullscreen) {
      this.viewMode = this.viewBeforeFullscreen.mode;
      this.zoom = this.viewBeforeFullscreen.zoom;
      this.viewBeforeFullscreen = null;
    }
    this.renderer.setView(this.viewMode, this.zoom);
    this.updateViewClass();
    this.controls.setView(this.viewMode, this.zoom);
    await nextFrame();
    await nextFrame();
    this.renderer.invalidate();
    void this.renderCurrent(false);
    this.controls.reveal();
  }

  setLoading(visible, message = 'Preparando página…') {
    this.loadingText.textContent = message;
    this.loading.hidden = !visible;
  }

  destroy() {
    this.active = false;
    this.removeKeyboard?.();
    this.removeGestures?.();
    this.removeFullscreenListener?.();
    this.pan.destroy();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    void this.closeCurrent();
  }
}
