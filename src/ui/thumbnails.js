const MAX_RENDERED_THUMBNAILS = 60;

function isCancelled(error) {
  return error?.name === 'RenderingCancelledException';
}

export class ThumbnailPanel {
  constructor({ panel, list, count, onSelect }) {
    this.panel = panel;
    this.list = list;
    this.count = count;
    this.onSelect = onSelect;
    this.document = null;
    this.observer = null;
    this.rendered = new Map();
    this.tasks = new Map();
    this.generation = 0;

    this.list.addEventListener('click', (event) => {
      const button = event.target.closest('.thumbnail-item');
      if (button) this.onSelect(Number(button.dataset.page));
    });
  }

  setDocument(pdfDocument) {
    this.destroyContents();
    this.document = pdfDocument;
    this.count.textContent = String(pdfDocument.numPages);
    const fragment = window.document.createDocumentFragment();

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const button = window.document.createElement('button');
      button.type = 'button';
      button.className = 'thumbnail-item';
      button.dataset.page = String(pageNumber);
      button.setAttribute('aria-label', `Ir a la página ${pageNumber}`);
      button.innerHTML = `
        <span class="thumbnail-number">${pageNumber}</span>
        <span class="thumbnail-preview"><span class="thumbnail-placeholder" aria-hidden="true"></span></span>
      `;
      fragment.append(button);
    }
    this.list.append(fragment);

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) void this.renderThumbnail(entry.target);
        }
      },
      { root: this.list, rootMargin: '350px 0px', threshold: 0.01 },
    );

    for (const item of this.list.children) this.observer.observe(item);
  }

  setOpen(open) {
    this.panel.setAttribute('aria-hidden', String(!open));
    if (open) {
      this.refresh();
      const current = this.list.querySelector('[aria-current="page"]');
      current?.scrollIntoView({ block: 'nearest' });
    }
  }

  refresh() {
    for (const item of this.list.children) {
      if (!this.rendered.has(Number(item.dataset.page))) {
        this.observer?.unobserve(item);
        this.observer?.observe(item);
      }
    }
  }

  setCurrent(pageNumber, scroll = false) {
    this.list.querySelector('[aria-current="page"]')?.removeAttribute('aria-current');
    const item = this.list.querySelector(`[data-page="${pageNumber}"]`);
    item?.setAttribute('aria-current', 'page');
    if (scroll && this.panel.getAttribute('aria-hidden') === 'false') {
      item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  async renderThumbnail(item) {
    if (!this.document) return;
    const pageNumber = Number(item.dataset.page);
    if (this.rendered.has(pageNumber) || this.tasks.has(pageNumber)) {
      this.touch(pageNumber);
      return;
    }

    const generation = this.generation;
    try {
      const page = await this.document.getPage(pageNumber);
      if (generation !== this.generation) return;
      const base = page.getViewport({ scale: 1 });
      const cssWidth = 145;
      const cssScale = cssWidth / base.width;
      const outputScale = Math.min(window.devicePixelRatio || 1, 1.5);
      const viewport = page.getViewport({ scale: cssScale * outputScale });
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${base.height * cssScale}px`;
      const context = canvas.getContext('2d', { alpha: false });
      const task = page.render({ canvas, canvasContext: context, viewport, background: '#ffffff' });
      this.tasks.set(pageNumber, task);
      await task.promise;
      this.tasks.delete(pageNumber);
      page.cleanup();

      if (generation !== this.generation || !item.isConnected) {
        canvas.width = 1;
        canvas.height = 1;
        return;
      }

      item.querySelector('.thumbnail-preview').replaceChildren(canvas);
      this.rendered.set(pageNumber, { canvas, item });
      this.touch(pageNumber);
      this.evictIfNeeded(pageNumber);
    } catch (error) {
      this.tasks.delete(pageNumber);
      if (!isCancelled(error)) {
        item.querySelector('.thumbnail-placeholder')?.remove();
        item.querySelector('.thumbnail-preview')?.setAttribute('aria-label', 'Vista previa no disponible');
      }
    }
  }

  touch(pageNumber) {
    const entry = this.rendered.get(pageNumber);
    if (!entry) return;
    this.rendered.delete(pageNumber);
    this.rendered.set(pageNumber, entry);
  }

  evictIfNeeded(protectedPage) {
    while (this.rendered.size > MAX_RENDERED_THUMBNAILS) {
      const victimPage = this.rendered.keys().next().value;
      if (victimPage === protectedPage) break;
      const victim = this.rendered.get(victimPage);
      this.rendered.delete(victimPage);
      victim.canvas.width = 1;
      victim.canvas.height = 1;
      const placeholder = window.document.createElement('span');
      placeholder.className = 'thumbnail-placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      victim.item.querySelector('.thumbnail-preview').replaceChildren(placeholder);
      this.observer?.unobserve(victim.item);
      this.observer?.observe(victim.item);
    }
  }

  destroyContents() {
    this.generation += 1;
    this.observer?.disconnect();
    this.observer = null;
    for (const task of this.tasks.values()) task.cancel();
    this.tasks.clear();
    for (const entry of this.rendered.values()) {
      entry.canvas.width = 1;
      entry.canvas.height = 1;
    }
    this.rendered.clear();
    this.list.replaceChildren();
  }

  destroy() {
    this.destroyContents();
    this.document = null;
  }
}
