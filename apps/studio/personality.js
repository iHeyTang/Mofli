import {PetEngine} from '@mofli/core';
import {createSvgRenderer} from '@mofli/core/browser';
import {bloubRig} from '@mofli/grove/rigs/bloub';
import {doughSkin} from '@mofli/grove/skins/mofli-dough';
import {beanSkin} from '@mofli/grove/skins/mofli-bean';
import {stoneSkin} from '@mofli/grove/skins/mofli-stone';
const moods=[['Idle',-1],['Curious',11],['Happy',4],['受惊',2],['Irritated',16],['Love',17]];
const renderers=[];let paused=false,time=0,last=performance.now(),raf;
for(const [skin,description] of [[doughSkin,'柔软 / 缓慢伸缩 / 对称眼神'],[beanSkin,'机灵 / 偏头 / 左右眼不同步'],[stoneSkin,'沉稳 / 半闭眼 / 瞳孔收放']]){
 const row=document.createElement('article');row.className='study';const intro=document.createElement('div');intro.className='identity';intro.innerHTML=`<h2>${skin.name}</h2><p>${description}</p>`;row.append(intro);
 for(const [name,expression] of moods){const fig=document.createElement('figure');fig.className='portrait';const host=document.createElement('div');const renderer=createSvgRenderer(host);const engine=new PetEngine(bloubRig,skin,{pose:{state:0,expression}});renderer.svg.setAttribute('aria-label',`${skin.name} · ${name}`);const caption=document.createElement('figcaption');caption.textContent=name;fig.append(host,caption);row.append(fig);renderers.push({renderer,engine});}
 document.querySelector('#studies').append(row);
}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function tick(now){if(!paused)time+=Math.max(0,Math.min(.05,(now-last)/1000));last=now;for(const {engine,renderer} of renderers)renderer.render(engine.sample(time,reduced.matches));raf=requestAnimationFrame(tick)}
document.querySelector('#pause').onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?'播放微动作':'暂停微动作';e.currentTarget.setAttribute('aria-pressed',String(paused))};raf=requestAnimationFrame(tick);window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);renderers.forEach(({renderer})=>renderer.destroy())});
