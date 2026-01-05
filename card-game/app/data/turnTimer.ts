// turnTimer.ts

export type TickCallback = (remainingSeconds: number) => void;
export type EndCallback = () => void;

export class TurnTimer {
  private duration: number;
  private remaining: number;
  private running: boolean = false;
  private endAt: number | null = null; // timestamp in ms
  private timerId: number | null = null;

  private tickCallbacks: TickCallback[] = [];
  private endCallbacks: EndCallback[] = [];

  constructor(durationSeconds: number = 60) {
    this.duration = durationSeconds;
    this.remaining = durationSeconds;
  }

  setDuration(seconds: number) {
    this.duration = seconds;
    this.reset();
  }

  getDuration() {
    return this.duration;
  }

  getRemaining() {
    return this.remaining;
  }

  isRunning() {
    return this.running;
  }

  start() {
    if (this.running) return;
    this.running = true;
    // compute endAt based on remaining
    this.endAt = Date.now() + this.remaining * 1000;
    this.scheduleTick();
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    if (this.timerId != null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.endAt != null) {
      const remMs = Math.max(0, this.endAt - Date.now());
      this.remaining = Math.max(0, Math.ceil(remMs / 1000));
    }
    this.endAt = null;
  }

  stop() {
    this.pause();
  }

  reset() {
    this.pause();
    this.remaining = this.duration;
    this.notifyTick();
  }

  private scheduleTick() {
    // schedule with a short interval for accuracy
    this.timerId = window.setTimeout(() => this.tick(), 250) as unknown as number;
  }

  private tick() {
    if (!this.running || this.endAt == null) return;
    const remMs = Math.max(0, this.endAt - Date.now());
    const nextRemaining = Math.max(0, Math.ceil(remMs / 1000));

    if (nextRemaining !== this.remaining) {
      this.remaining = nextRemaining;
      this.notifyTick();
    }

    if (remMs <= 0) {
      this.running = false;
      this.endAt = null;
      if (this.timerId != null) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
      this.notifyEnd();
      return;
    }

    // continue
    this.scheduleTick();
  }

  onTick(cb: TickCallback) {
    this.tickCallbacks.push(cb);
    return () => this.offTick(cb);
  }

  offTick(cb: TickCallback) {
    this.tickCallbacks = this.tickCallbacks.filter((c) => c !== cb);
  }

  onEnd(cb: EndCallback) {
    this.endCallbacks.push(cb);
    return () => this.offEnd(cb);
  }

  offEnd(cb: EndCallback) {
    this.endCallbacks = this.endCallbacks.filter((c) => c !== cb);
  }

  private notifyTick() {
    this.tickCallbacks.forEach((cb) => cb(this.remaining));
  }

  private notifyEnd() {
    this.endCallbacks.forEach((cb) => cb());
  }
}
