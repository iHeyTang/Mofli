import type { Point } from './index.js';
/** Rig-authored hit areas use a rendered silhouette and normalized subregions. */
export interface HitArea {
  shape: string;
  regions: { id: string; x: number; y: number; width: number; height: number }[];
}
export interface ClickHit { region: string; point: Point }
export interface ClickReaction extends ClickHit { variant: number; count: number; intense: boolean; delay?: number; from?: { reaction: ClickReaction; elapsed: number } }
const CLICK_CONFIRM_SECONDS = .25;
/** Event-time bookkeeping. Sampling never consumes randomness or advances this state. */
export class ClickTracker {
  private times: number[] = [];
  private last = -Infinity;
  private cooldown = -Infinity;
  private normalUntil = -Infinity;
  private confirmUntil = -Infinity;
  private previous = -1;
  private serial = 0;
  next(hit: ClickHit, at: number, choice?: number): ClickReaction | undefined {
    if (!Number.isFinite(at) || at < this.last || !Number.isFinite(hit.point.x) || !Number.isFinite(hit.point.y)) return;
    if (choice !== undefined && (!Number.isFinite(choice) || choice < 0 || choice >= 1)) return;
    this.last = at;
    if (at < this.cooldown) return;
    if (hit.region === 'outside') return at < this.normalUntil ? undefined : { ...hit, variant: 0, count: 0, intense: false };
    this.times = this.times.filter(t => at-t <= 1.2);
    this.times.push(at);
    const intense = this.times.length >= 4;
    // Every click inside the window replaces the pending response and restarts confirmation.
    const repeated = at < this.confirmUntil;
    if (!intense && !repeated && at < this.normalUntil) return;
    const random = choice === undefined ? ((++this.serial * 2654435761) >>> 0) / 4294967296 : choice;
    if (!Number.isFinite(random) || random < 0 || random >= 1) return;
    let variant = Math.floor(random*3);
    if (variant === this.previous) variant = (variant+1)%3;
    this.previous = variant;
    const count = this.times.length;
    if (intense) { this.cooldown = at+1.4; this.times = []; }
    const delay = intense ? 0 : CLICK_CONFIRM_SECONDS;
    this.confirmUntil = delay ? at+delay : -Infinity;
    if (!intense) this.normalUntil = at+delay+.8;
    return { ...hit, variant, count, intense, delay };
  }
}
