export class LaserPointer {
  constructor(stage, element, indicator) {
    this.stage = stage;
    this.element = element;
    this.indicator = indicator;
    this.active = false;

    this.onMove = this.onMove.bind(this);
    this.onLeave = this.onLeave.bind(this);
    stage.addEventListener('pointermove', this.onMove);
    stage.addEventListener('pointerdown', this.onMove);
    stage.addEventListener('pointerleave', this.onLeave);
    stage.addEventListener('pointerup', (event) => {
      if (event.pointerType !== 'mouse') this.element.classList.remove('is-visible');
    });
  }

  setActive(active) {
    this.active = active;
    this.stage.classList.toggle('pointer-active', active);
    this.indicator.hidden = !active;
    if (!active) this.element.classList.remove('is-visible');
  }

  toggle() {
    this.setActive(!this.active);
    return this.active;
  }

  onMove(event) {
    if (!this.active || event.target.closest('nav, button, input')) {
      this.element.classList.remove('is-visible');
      return;
    }
    const rect = this.stage.getBoundingClientRect();
    this.element.style.transform = `translate(${event.clientX - rect.left - 8}px, ${event.clientY - rect.top - 8}px)`;
    this.element.classList.add('is-visible');
  }

  onLeave() {
    this.element.classList.remove('is-visible');
  }
}
