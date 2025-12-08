// timer.ts
export class CircularTimer {
  private duration: number;
  private remaining: number;
  private intervalId: NodeJS.Timeout | null = null;

  private tickCallbacks: ((remaining: number, ratio: number) => void)[] = [];
  private endCallbacks: (() => void)[] = [];

  constructor(duration: number) {
    this.duration = duration;
    this.remaining = duration;
  }

  start() {
    const startTime = Date.now();

    this.intervalId = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      this.remaining = Math.max(this.duration - elapsed, 0);

      const ratio = this.remaining / this.duration;

      this.tickCallbacks.forEach(cb => cb(this.remaining, ratio));

      if (this.remaining <= 0) {
        this.stop();
        this.endCallbacks.forEach(cb => cb());
      }
    }, 50);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  onTick(cb: (remaining: number, ratio: number) => void) {
    this.tickCallbacks.push(cb);
  }

  onEnd(cb: () => void) {
    this.endCallbacks.push(cb);
  }
}
