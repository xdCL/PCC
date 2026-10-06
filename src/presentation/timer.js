import { formatDuration } from '../utils/helpers.js';

export class PresentationTimer {
  constructor(onChange) {
    this.onChange = onChange;
    this.elapsed = 0;
    this.startedAt = 0;
    this.running = false;
    this.animationFrame = 0;
    this.tick = this.tick.bind(this);
    this.emit();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.startedAt = performance.now();
    this.animationFrame = requestAnimationFrame(this.tick);
    this.emit();
  }

  pause() {
    if (!this.running) return;
    this.elapsed += performance.now() - this.startedAt;
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
    this.emit();
  }

  toggle() {
    if (this.running) this.pause();
    else this.start();
  }

  reset() {
    this.elapsed = 0;
    if (this.running) this.startedAt = performance.now();
    this.emit();
  }

  currentElapsed() {
    return this.elapsed + (this.running ? performance.now() - this.startedAt : 0);
  }

  tick() {
    if (!this.running) return;
    this.emit();
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  emit() {
    this.onChange(formatDuration(this.currentElapsed()), this.running);
  }
}
