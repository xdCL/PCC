import { RenderCache } from './render-cache.js';

const MAX_CANVAS_DIMENSION = 8192;
const MAX_CANVAS_PIXELS = 24_000_000;
const MAX_DEVICE_SCALE = 2.5;

function isCancelled(error) {
  return error?.name === 'RenderingCancelledException';
}

export class PdfRenderer {
  constructor({ canvas, container, frame, onLoadingChange, onQualityLimited }) {
    this.canvas = canvas;
    this.container = container;
    this.frame = frame;
    this.onLoadingChange = onLoadingChange;
    this.onQualityLimited = onQualityLimited;
    this.cache = new RenderCache(3);
    this.document = null;
    this.currentPage = 1;
    this.mode = 'fit-page';
    this.zoom = 100;
    this.renderToken = 0;
    this.mainTask = null;
    this.prefetchTasks = new Map();
    this.loadingTimer = 0;
    this.lastQualityNotice = 0;
  }

  setDocument(document) {
    this.cancelAll();
    this.cache.clear();
    this.document = document;
    this.currentPage = 1;
    this.mode = 'fit-page';
    this.zoom = 100;
  }

  setView(mode, zoom = this.zoom) {
    this.mode = mode;
    this.zoom = Math.min(300, Math.max(25, zoom));
  }

  invalidate() {
    this.cancelAll();
    this.cache.clear();
  }

  cancelAll() {
    this.renderToken += 1;
    this.mainTask?.cancel();
    this.mainTask = null;
    for (const task of this.prefetchTasks.values()) task.cancel();
    this.prefetchTasks.clear();
    window.clearTimeout(this.loadingTimer);
    this.onLoadingChange?.(false);
  }

  async render(pageNumber, { transition = true } = {}) {
    if (!this.document) return;

    const token = ++this.renderToken;
    this.currentPage = pageNumber;
    this.mainTask?.cancel();
    this.mainTask = null;
    for (const task of this.prefetchTasks.values()) task.cancel();
    this.prefetchTasks.clear();
    window.clearTimeout(this.loadingTimer);
    this.loadingTimer = window.setTimeout(() => this.onLoadingChange?.(true, pageNumber), 110);

    try {
      const page = await this.document.getPage(pageNumber);
      if (token !== this.renderToken) return;

      const metrics = this.calculateMetrics(page);
      const key = this.cacheKey(pageNumber, metrics);
      const cached = this.cache.get(key);

      if (cached) {
        this.present(cached, transition);
      } else {
        const rendered = await this.renderPageToCanvas(page, metrics, 'main');
        if (!rendered || token !== this.renderToken) {
          if (rendered?.canvas) this.cache.release(rendered);
          return;
        }
        this.cache.set(key, rendered);
        this.present(rendered, transition);
      }

      window.clearTimeout(this.loadingTimer);
      this.onLoadingChange?.(false);
      void this.prefetchNeighbors(pageNumber, token);
    } catch (error) {
      window.clearTimeout(this.loadingTimer);
      this.onLoadingChange?.(false);
      if (!isCancelled(error) && token === this.renderToken) throw error;
    }
  }

  calculateMetrics(page) {
    const baseViewport = page.getViewport({ scale: 1 });
    const styles = getComputedStyle(this.container);
    const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const availableWidth = Math.max(80, this.container.clientWidth - horizontalPadding);
    const availableHeight = Math.max(80, this.container.clientHeight - verticalPadding);
    const fitScale = Math.min(
      availableWidth / baseViewport.width,
      availableHeight / baseViewport.height,
    );

    let cssScale = fitScale;
    if (this.mode === 'fit-width') cssScale = availableWidth / baseViewport.width;
    if (this.mode === 'manual') cssScale = fitScale * (this.zoom / 100);

    const cssWidth = Math.max(1, baseViewport.width * cssScale);
    const cssHeight = Math.max(1, baseViewport.height * cssScale);
    const requestedScale = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_SCALE);
    const dimensionScale = Math.min(
      MAX_CANVAS_DIMENSION / cssWidth,
      MAX_CANVAS_DIMENSION / cssHeight,
    );
    const pixelScale = Math.sqrt(MAX_CANVAS_PIXELS / (cssWidth * cssHeight));
    const outputScale = Math.max(0.5, Math.min(requestedScale, dimensionScale, pixelScale));

    if (outputScale < requestedScale * 0.9 && Date.now() - this.lastQualityNotice > 12_000) {
      this.lastQualityNotice = Date.now();
      this.onQualityLimited?.();
    }

    return {
      cssScale,
      cssWidth,
      cssHeight,
      outputScale,
      renderViewport: page.getViewport({ scale: cssScale * outputScale }),
      layoutWidth: Math.round(availableWidth),
      layoutHeight: Math.round(availableHeight),
    };
  }

  cacheKey(pageNumber, metrics) {
    return [
      pageNumber,
      this.mode,
      Math.round(this.zoom),
      metrics.layoutWidth,
      metrics.layoutHeight,
      metrics.outputScale.toFixed(2),
    ].join(':');
  }

  async renderPageToCanvas(page, metrics, kind, key = '') {
    const output = document.createElement('canvas');
    output.width = Math.max(1, Math.floor(metrics.renderViewport.width));
    output.height = Math.max(1, Math.floor(metrics.renderViewport.height));
    const context = output.getContext('2d', { alpha: false, desynchronized: true });
    const task = page.render({
      canvas: output,
      canvasContext: context,
      viewport: metrics.renderViewport,
      background: '#ffffff',
      intent: 'display',
    });

    if (kind === 'main') this.mainTask = task;
    else this.prefetchTasks.set(key, task);

    try {
      await task.promise;
      return {
        canvas: output,
        cssWidth: metrics.cssWidth,
        cssHeight: metrics.cssHeight,
      };
    } catch (error) {
      output.width = 1;
      output.height = 1;
      if (!isCancelled(error)) throw error;
      return null;
    } finally {
      if (kind === 'main' && this.mainTask === task) this.mainTask = null;
      if (kind !== 'main') this.prefetchTasks.delete(key);
      page.cleanup();
    }
  }

  present(entry, transition) {
    this.canvas.width = entry.canvas.width;
    this.canvas.height = entry.canvas.height;
    this.canvas.style.width = `${entry.cssWidth}px`;
    this.canvas.style.height = `${entry.cssHeight}px`;
    this.frame.style.width = `${entry.cssWidth}px`;
    this.frame.style.height = `${entry.cssHeight}px`;
    const context = this.canvas.getContext('2d', { alpha: false });
    context.drawImage(entry.canvas, 0, 0);

    this.canvas.classList.remove('page-enter');
    if (transition) {
      void this.canvas.offsetWidth;
      this.canvas.classList.add('page-enter');
    }
  }

  async prefetchNeighbors(pageNumber, token) {
    const candidates = [pageNumber + 1, pageNumber - 1].filter(
      (number) => number >= 1 && number <= this.document.numPages,
    );

    for (const number of candidates) {
      if (token !== this.renderToken) return;
      try {
        const page = await this.document.getPage(number);
        if (token !== this.renderToken) return;
        const metrics = this.calculateMetrics(page);
        const key = this.cacheKey(number, metrics);
        if (this.cache.has(key)) continue;
        const entry = await this.renderPageToCanvas(page, metrics, 'prefetch', key);
        if (entry && token === this.renderToken) this.cache.set(key, entry);
        else if (entry) this.cache.release(entry);
      } catch (error) {
        if (!isCancelled(error)) console.warn('No se pudo precargar una página.', error);
      }
    }
  }

  destroy() {
    this.cancelAll();
    this.cache.clear();
    this.canvas.width = 1;
    this.canvas.height = 1;
    this.document = null;
  }
}
