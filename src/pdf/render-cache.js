export class RenderCache {
  constructor(limit = 3) {
    this.limit = limit;
    this.entries = new Map();
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return null;

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  set(key, entry) {
    const existing = this.entries.get(key);
    if (existing && existing.canvas !== entry.canvas) this.release(existing);
    this.entries.delete(key);
    this.entries.set(key, entry);

    while (this.entries.size > this.limit) {
      const oldestKey = this.entries.keys().next().value;
      const oldest = this.entries.get(oldestKey);
      this.entries.delete(oldestKey);
      this.release(oldest);
    }
  }

  has(key) {
    return this.entries.has(key);
  }

  clear() {
    for (const entry of this.entries.values()) this.release(entry);
    this.entries.clear();
  }

  release(entry) {
    if (!entry?.canvas) return;
    entry.canvas.width = 1;
    entry.canvas.height = 1;
  }
}
