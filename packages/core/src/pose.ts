/** Numeric pose controller: bounded easing, live departing pose, interrupted-pose capture.
 * Setters are dated; sampling does not advance the clock. Not a historical event log.
 */
export class PoseController<P extends Record<string, number>> {
  private from: ((time: number) => P) | null = null;
  private at = 0;
  constructor(
    private target: (time: number) => P,
    readonly duration = 0.5,
  ) {
    if (!Number.isFinite(duration) || duration <= 0)
      throw new Error("Invalid pose duration");
  }
  sample(time: number): P {
    if (!Number.isFinite(time) || time < 0)
      throw new Error("Invalid pose time");
    const to = this.target(time);
    if (!Object.values(to).every(Number.isFinite))
      throw new Error("Invalid pose values");
    if (!this.from || time >= this.at + this.duration) return { ...to };
    const from = this.from(time),
      u = Math.max(0, Math.min(1, (time - this.at) / this.duration));
    const k = 1 - (1 - u) ** 5;
    return Object.fromEntries(
      Object.keys(to).map((key) => [
        key,
        from[key]! + (to[key]! - from[key]!) * k,
      ]),
    ) as P;
  }
  redirect(target: (time: number) => P, time: number): PoseController<P> {
    if (!Number.isFinite(time) || time < this.at)
      throw new Error("Pose changes must be monotonic");
    const next = new PoseController(target, this.duration);
    const snapshot = this.sample(time);
    next.from =
      this.from && time < this.at + this.duration
        ? () => snapshot
        : this.target;
    next.at = time;
    return next;
  }
}
