import type { Frame, Point } from './index.js';
import type { MountFrame } from './attachments.js';
import { createMountContext } from './attachments.js';
const NS = 'http://www.w3.org/2000/svg';
/** Browser-only diagnostic overlay, based on the same mount frames as accessories. */
export function renderMountDebug(layer: SVGGElement, frame: Frame) {
  layer.setAttribute('data-mount-debug', '');
  layer.setAttribute('pointer-events', 'none');
  const node = (parent: SVGElement, tag: string, attrs: Record<string, string | number>, text?: string) => {
    const el = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    if (text) el.textContent = text;
    parent.append(el);
    return el;
  };
  const draw = (id: string, mount: MountFrame, visibility: number) => {
    const alpha = Math.min(visibility, mount.visibility);
    if (alpha < .01) return;
    if (mount.members) {
      for (const [member, child] of Object.entries(mount.members)) draw(`${id}/${member}`, child, alpha);
      return;
    }
    const group = node(layer, 'g', {'data-mount': id, opacity: alpha});
    const context = mount.volume ? createMountContext(mount) : undefined;
    const point = (x: number, y: number, z = 0): Point => context ? context.project([x, y, z]) : {
      x: mount.matrix[0] * x + mount.matrix[2] * y + mount.matrix[4],
      y: mount.matrix[1] * x + mount.matrix[3] * y + mount.matrix[5],
    };
    const origin = point(0, 0);
    const path = (points: Point[], color: string, dash = '') => node(group, 'path', {
      d: points.map((p,i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' '),
      fill: 'none', stroke: color, 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', 'stroke-dasharray': dash,
    });
    for (const [label, end, color] of [
      ['X', point(.24,0), '#b87562'], ['Y', point(0,.24), '#527b61'],
      ...(context ? [['Z', point(0,0,.24), '#8472a2']] : []),
    ] as [string, Point, string][]) {
      path([origin, end], color);
      node(group, 'text', {x:end.x+2,y:end.y-2,fill:color,'font-size':7},label);
    }
    if (context && mount.surface) {
      // A local sampling guide, not a claimed region boundary (the protocol has no extents).
      const samples = Array.from({length:33}, (_,i) => {
        const angle = i*Math.PI*2/32;
        return context.surface([.18*Math.cos(angle),.18*Math.sin(angle)]);
      });
      path(samples, '#527b61', '2 2');
      node(group, 'title', {}, 'Dashed outline: local surface sample, not a boundary');
    }
    if (id === 'character.orbit') path(Array.from({length:49},(_,i)=>point(Math.cos(i*Math.PI/24),Math.sin(i*Math.PI/24))), '#8472a2', '3 3');
    node(group,'circle',{cx:origin.x,cy:origin.y,r:1.8,fill:'#fdfdfb',stroke:'#466c56','stroke-width':.8});
    const left = id.endsWith('/left');
    const label = id.replace(/^head\./, '').replace(/^character\./, '').replace('/left',' L').replace('/right',' R');
    node(group,'title',{},id);
    node(group,'text',{x:origin.x+(left?-5:5),y:origin.y-7,fill:'#28332d','font-size':8,'text-anchor':left?'end':'start','font-family':'monospace',stroke:'#fdfdfb','stroke-width':1.4,'paint-order':'stroke'},label);
  };
  for (const [id,mount] of Object.entries(frame.mounts ?? {})) draw(id,mount,1);
}
