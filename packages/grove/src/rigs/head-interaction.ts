import type { ClickReaction, HitArea } from '@mofli/core';
export const headHitArea: HitArea = {
  shape: 'paper-body',
  regions: [
    {id:'crown',x:0,y:0,width:1,height:.3},
    {id:'left',x:0,y:.3,width:.25,height:.7},
    {id:'right',x:.75,y:.3,width:.25,height:.7},
    {id:'face',x:.25,y:.3,width:.5,height:.4},
    {id:'chin',x:.25,y:.7,width:.5,height:.3},
  ],
};
export interface HeadReaction { squash:number; lift:number; yaw:number; pitch:number; roll:number; lid:number; irritation:number }
/** All offsets return to neutral. No RNG, clock reads or mutation during sampling. */
function sampleReaction(click: ClickReaction | undefined, elapsed: number, cat = false): HeadReaction {
  const result: HeadReaction = {squash:0,lift:0,yaw:0,pitch:0,roll:0,lid:1,irritation:0};
  if (!click) return result;
  const duration = click.intense ? 1.25 : .8;
  if (elapsed<0 || elapsed>=duration) return result;
  const t = elapsed/duration, e = Math.sin(Math.PI*t)**2;
  const wobble = Math.sin(t*Math.PI*4)*e;
  if (click.region==='outside') {
    result.yaw = click.point.x*12*e; result.pitch=-click.point.y*9*e;
    return result;
  }
  if (click.intense || click.count > 1) {
    result.yaw = Math.sin(t*Math.PI*6)*(click.intense?22:12)*e; result.roll=wobble*5;
    result.squash=.13*e; result.irritation=e; result.lid=1-.8*e;
    return result;
  }
  const v=click.variant;
  const side = click.region==='left' ? -1 : click.region==='right' ? 1 : click.point.x>=0?1:-1;
  if (click.region==='crown') {
    result.squash=(.08+v*.025)*e; result.lid=1-.85*e;
    result.pitch=(v===1?-9:5)*e; result.roll=(v===2?6:2)*side*wobble;
  } else if (click.region==='chin') {
    result.pitch=-14*e; result.lift=-(.025+v*.012)*e; result.lid=1-.75*e;
    result.roll=side*(v+1)*2*e;
  } else if (click.region==='left'||click.region==='right') {
    result.yaw=side*(12+v*4)*e; result.roll=side*7*e;
    result.squash=.05*wobble; result.lid=1-.55*e;
  } else {
    result.yaw=(v===0?18:9)*wobble; result.roll=(v===2?7:3)*wobble;
    result.lift=v===1?-.07*e:0; result.squash=v===1?-.08*e:.05*e;
    result.irritation=cat&&v!==1?e:0; result.lid=1-(v===1?.25:.65)*e;
  }
  return result;
}

/** Upgrade a running response without snapping through the neutral pose. */
export function headReaction(click: ClickReaction | undefined, elapsed: number, cat = false): HeadReaction {
  const next = sampleReaction(click, elapsed, cat);
  if (!click?.from || elapsed < 0 || elapsed >= .16) return next;
  const previous = sampleReaction(click.from.reaction, click.from.elapsed, cat);
  const t = elapsed/.16, mix = t*t*(3-2*t);
  for (const key of Object.keys(next) as (keyof HeadReaction)[]) next[key] = previous[key]*(1-mix)+next[key]*mix;
  return next;
}
