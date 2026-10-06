export class CanvasPan {
  constructor(container, content) {
    this.container = container;
    this.content = content;
    this.enabled = true;
    this.drag = null;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    container.addEventListener('pointerdown', this.onPointerDown);
    container.addEventListener('pointermove', this.onPointerMove);
    container.addEventListener('pointerup', this.onPointerUp);
    container.addEventListener('pointercancel', this.onPointerUp);
    container.addEventListener('lostpointercapture', this.onPointerUp);

    this.resizeObserver = new ResizeObserver(() => this.refresh());
    this.resizeObserver.observe(container);
    this.resizeObserver.observe(content);
    this.refresh();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.cancel();
    this.refresh();
  }

  refresh() {
    const canPanX = this.enabled && this.container.scrollWidth > this.container.clientWidth + 1;
    const canPanY = this.enabled && this.container.scrollHeight > this.container.clientHeight + 1;
    const canPan = canPanX || canPanY;
    this.container.classList.toggle('is-pannable', canPan);
    this.container.classList.toggle('is-pannable-x', canPanX);
    this.container.classList.toggle('is-pannable-y', canPanY);
    if (!canPan) this.cancel();
  }

  onPointerDown(event) {
    if (
      !this.enabled
      || event.pointerType !== 'mouse'
      || event.button !== 0
      || !this.container.classList.contains('is-pannable')
    ) return;

    this.drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: this.container.scrollLeft,
      scrollTop: this.container.scrollTop,
    };
    this.container.setPointerCapture(event.pointerId);
    this.container.classList.add('is-panning');
    event.preventDefault();
  }

  onPointerMove(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.container.scrollLeft = this.drag.scrollLeft - (event.clientX - this.drag.x);
    this.container.scrollTop = this.drag.scrollTop - (event.clientY - this.drag.y);
    event.preventDefault();
  }

  onPointerUp(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.cancel();
  }

  cancel() {
    if (this.drag && this.container.hasPointerCapture(this.drag.pointerId)) {
      this.container.releasePointerCapture(this.drag.pointerId);
    }
    this.drag = null;
    this.container.classList.remove('is-panning');
  }

  destroy() {
    this.cancel();
    this.resizeObserver.disconnect();
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    this.container.removeEventListener('pointermove', this.onPointerMove);
    this.container.removeEventListener('pointerup', this.onPointerUp);
    this.container.removeEventListener('pointercancel', this.onPointerUp);
    this.container.removeEventListener('lostpointercapture', this.onPointerUp);
  }
}
