import {lorenzTrajectory,waveHeight} from './dynamics.js';
import {ATTRACTORS} from './attractors.js';
import {createScene,sectionPosition,alternatingSide,sceneExitY} from './attractor-scene.js';
import {smoothstep,normalFrame} from './attractors.js';
import {createChaosIntro} from './intro.js';
import {createDust} from './dust.js';
const canvas=document.querySelector('#system-canvas');
const mode=document.body.dataset.concept,reduced=matchMedia('(prefers-reduced-motion: reduce)');
const ctx=mode==='combined'?null:canvas.getContext('2d',{alpha:true});
const button=document.querySelector('#motion-toggle');
let running=!reduced.matches,requested=running,frame=0,time=0,last=0,width=0,height=0,progress=0,target=0;
let worker,texture,textureContext,reactionStep=1400,disposed=false;
const trajectory=mode==='attractor'?lorenzTrajectory():null;
let scene=null,heldAttractor=null,shapePosition=0,shapeTarget=0,heroBlend=0;
let anchors=[],heroEnd=0,available=1,lastName='',lastPercent=-1,metricsAt=0,metricsFrames=0,metricsDraw=0;
let sceneRows=[],sceneView=null,layoutPosition=0,viewHero=0;
let pointerX=0,pointerY=0,tiltX=0,tiltY=0;
addEventListener('pointermove',event=>{if(event.pointerType==='mouse'){pointerX=event.clientX/width*2-1;pointerY=event.clientY/height*2-1;shedDust(event);}},{passive:true});
// ?intro=off and ?dust=off switch the two experiments off for comparison.
const options=new URLSearchParams(location.search),introEnabled=options.get('intro')!=='off',dustEnabled=options.get('dust')!=='off';
let spin=0,chaos=null,chaosEnd=null,introPlayed=false,dust=null,dustIndex=-1,lastPointer=null,lastRho='';
const rhoReadout=document.querySelector('[data-rho]');
const busyTarget='a,button,summary,details,input,textarea,select,label,p,li,h1,h2,h3,h4,figure,img,video,iframe,table,dialog,header,footer,.project-body,.essay-body,.engineering-body,.hero-system-label,.attractor-console,.system-controls,.personality-section,.notes-section';
function heldIndex(){
  const held=Math.round(shapePosition);
  return Math.abs(shapePosition-held)>.02?-1:((held%ATTRACTORS.length)+ATTRACTORS.length)%ATTRACTORS.length;
}
// Moving near a shape sheds dust that the system's own equations pull onto the attractor.
function shedDust(event){
  if(!dustEnabled||!scene||!sceneView||!running||reduced.matches||(chaos&&!introPlayed)||event.target.closest?.(busyTarget))return;
  const index=heldIndex(),x=event.clientX,y=event.clientY;
  if(index<0||Math.hypot(x-sceneView.x,y-sceneView.y)>sceneView.scale*1.15){lastPointer=null;return;}
  if(dustIndex!==index){const definition=ATTRACTORS[index];dust=createDust(definition,normalFrame(definition),scene.stepLength(index));dustIndex=index;}
  const moved=lastPointer?Math.hypot(x-lastPointer[0],y-lastPointer[1]):8;lastPointer=[x,y];
  for(let i=0,n=Math.min(5,Math.ceil(moved/7));i<n;i++){
    const point=scene.unproject(sceneView,time,index,x+(Math.random()-.5)*12,y+(Math.random()-.5)*12,(Math.random()-.5)*.7);
    if(point&&point.every(v=>Math.abs(v)<1.3))dust.spawn(point);
  }
}
const panels=[...document.querySelectorAll('[data-scene]')],railLabel=document.querySelector('.attractor-rail');
const personalSection=document.querySelector('#notes,.personality-section');
let personalTop=Infinity,exitClearance=100;
const names=[...document.querySelectorAll('[data-attractor-name]')];
const bar=document.querySelector('#reading-progress'),scrollValue=document.querySelector('#scroll-value');
document.querySelectorAll('[data-attractor]').forEach(control=>control.addEventListener('click',()=>{
  heldAttractor=control.dataset.attractor==='auto'?null:Number(control.dataset.attractor);
  document.querySelectorAll('[data-attractor]').forEach(node=>node.setAttribute('aria-pressed',String(node===control)));
  if(!running||reduced.matches)shapePosition=heldAttractor??shapeTarget;
  draw();
}));
function size(){
  width=document.documentElement.clientWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.6);
  if(scene)scene.resize(width,height,dpr);
  if(ctx){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
  available=Math.max(1,document.documentElement.scrollHeight-height);
  personalTop=personalSection?personalSection.getBoundingClientRect().top+scrollY:Infinity;
  exitClearance=(railLabel?.getBoundingClientRect().height??0)+42;
  sceneRows=panels.map(el=>{
    const body=el.querySelector('.project-body,.essay-body,.engineering-body').getBoundingClientRect();
    return {top:el.getBoundingClientRect().top+scrollY,bodyTop:body.top+scrollY,bodyBottom:body.bottom+scrollY,window:el.querySelector('.scene-window').getBoundingClientRect().top+scrollY};
  });
  anchors=mode==='combined'?sceneRows.slice(1).map((row,i)=>width<900?row.window+160:(row.bodyTop+sceneRows[i].bodyBottom)/2+height*.05):['#research','#essays','#about'].map(id=>document.querySelector(id).getBoundingClientRect().top+scrollY);
  heroEnd=sceneRows[0]?.top??anchors[0];scroll();draw();
}
function scroll(){
  target=Math.max(0,Math.min(1,scrollY/available));
  shapeTarget=sectionPosition(scrollY,anchors,height);
  heroBlend=smoothstep(Math.max(0,Math.min(1,(scrollY-(heroEnd-height*.8))/(height*.5))));
  document.body.style.setProperty('--hero-blend',heroBlend.toFixed(4));
  document.body.dataset.journey=heroBlend>.95?'work':'hero';
  if(reduced.matches)progress=0;else if(!running)progress=target;
  bar.style.transform='scaleX('+target+')';
  const percent=Math.round(target*100);
  if(percent!==lastPercent){scrollValue.textContent=String(percent).padStart(2,'0');lastPercent=percent;}
  if(!running){shapePosition=heldAttractor??(reduced.matches?Math.round(shapeTarget):shapeTarget);layoutPosition=reduced.matches?Math.round(shapeTarget):shapeTarget;viewHero=heroBlend;draw();}
}
function label(){
  button.textContent=running?'Pause motion':'Resume motion';button.setAttribute('aria-pressed',String(!running));
  canvas.dataset.state=running?'playing':'paused';
}
function start(){
  if(disposed||frame||!running||document.hidden)return;frame=requestAnimationFrame(animate);
}
function sync(){
  if(worker)worker.postMessage({type:'running',value:running&&!document.hidden});
  if(!running||document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}
  else start();label();
}
button.addEventListener('click',()=>{requested=!running;running=requested;sync();draw();});
reduced.addEventListener('change',()=>{requested=!reduced.matches;running=requested;if(reduced.matches)progress=0;sync();draw();});
document.addEventListener('visibilitychange',sync);
addEventListener('scroll',scroll,{passive:true});addEventListener('resize',size);
function animate(now){
  frame=0;if(!running||document.hidden)return;
  if(!last){metricsAt=now;metricsFrames=0;metricsDraw=0;}
  const delta=last?Math.min((now-last)/1000,.06):0;time+=delta;last=now;
  progress+=(target-progress)*(1-Math.exp(-delta*12));
  layoutPosition+=(shapeTarget-layoutPosition)*(1-Math.exp(-delta*12));
  viewHero+=(heroBlend-viewHero)*(1-Math.exp(-delta*12));
  shapePosition+=((heldAttractor??shapeTarget)-shapePosition)*(1-Math.exp(-delta*16));
  tiltX+=(pointerX-tiltX)*(1-Math.exp(-delta*2.5));tiltY+=(pointerY-tiltY)*(1-Math.exp(-delta*2.5));
  chaos?.step(delta);
  // The turn waits for the opening, which reads best from the composed camera angle.
  if(!chaos||chaosEnd!==null)spin+=delta;
  dust?.step(delta);
  const before=performance.now();draw();metricsDraw+=performance.now()-before;metricsFrames++;
  if(now-metricsAt>1500){
    canvas.dataset.fps=(metricsFrames*1000/(now-metricsAt)).toFixed(1);
    canvas.dataset.drawMs=(metricsDraw/metricsFrames).toFixed(2);
    canvas.dataset.progress=progress.toFixed(3);canvas.dataset.elapsed=time.toFixed(3);
    canvas.dataset.shapePosition=shapePosition.toFixed(3);
    metricsAt=now;metricsFrames=0;metricsDraw=0;
  }
  start();
}
function drawAttractor(){
  const mobile=width<700,cx=width*(mobile?.69:.75)-progress*width*.16,cy=height*.49+progress*height*.04;
  const scale=Math.min(width*(mobile?.025:.014),height*.014);
  const angle=-.35+progress*1.9+Math.sin(time*.09)*.025,c=Math.cos(angle),s=Math.sin(angle);
  const count=Math.min(trajectory.length,3300+Math.floor(progress*3200));
  ctx.lineWidth=mobile?.9:1.1;
  for(let strand=0;strand<2;strand++){
    ctx.beginPath();
    for(let i=0;i<count;i++){
      const [x,y,z]=trajectory[i],a=x*c-y*s,b=x*s+y*c;
      const px=cx+a*scale,py=cy+(b*.33-(z-25)*.96)*scale;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.strokeStyle=strand?'rgba(55,101,194,.14)':'rgba(31,78,174,.27)';
    ctx.stroke();ctx.translate(strand?0:3,strand?0:3);
  }
  ctx.translate(-3,-3);
  const i=Math.floor((2500+progress*3500+time*12)%count),[x,y,z]=trajectory[i];
  ctx.beginPath();ctx.arc(cx+(x*c-y*s)*scale,cy+((x*s+y*c)*.33-(z-25)*.96)*scale,4,0,Math.PI*2);
  ctx.fillStyle='#2455b6';ctx.fill();
}
function drawWave(){
  const cx=width*.63,cy=height*.68,unit=Math.min(width*.02,height*.038);
  const angle=-.48+progress*.55,c=Math.cos(angle),s=Math.sin(angle);
  const phase=progress*7+(reduced.matches?0:time*.11),project=(x,y)=>{
    const z=waveHeight(x,y,phase),a=x*c-y*s,b=x*s+y*c;
    return [cx+a*unit*1.65,cy+b*unit*.69-z*unit*4.3];
  };
  ctx.lineWidth=.8;
  for(let j=0;j<=34;j++){
    const y=-10+j*.59;ctx.beginPath();
    for(let i=0;i<=76;i++){const [px,py]=project(-16+i*.42,y);if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);}
    ctx.strokeStyle='rgba(111,162,219,'+(.1+j/34*.25)+')';ctx.stroke();
  }
  for(let i=0;i<=47;i++){
    const x=-16+i*.68;ctx.beginPath();
    for(let j=0;j<=58;j++){const [px,py]=project(x,-10+j*.35);if(j)ctx.lineTo(px,py);else ctx.moveTo(px,py);}
    ctx.strokeStyle='rgba(76,129,191,.14)';ctx.stroke();
  }
}
function drawField(){
  if(!texture)return;
  const size=Math.max(width,height)*1.2,scale=1+progress*.28;
  ctx.save();ctx.translate(width*.69,height*.46);ctx.rotate(progress*.35-.12);ctx.scale(scale,scale);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.globalAlpha=.65;
  ctx.drawImage(texture,-size*.55-progress*size*.08,-size*.38,size,size*.7);
  ctx.restore();
}
function draw(){
  if(mode==='combined'){
    if(!scene)return;
    const mobile=width<900,t=viewHero,side=alternatingSide(layoutPosition);
    const heroScale=Math.min(width*(mobile?.40:.26),height*(mobile?.21:.33));
    const workScale=mobile?Math.min(width*.39,145):Math.min(width*.23,height*.32);
    let displayScale=workScale;
    const active=Math.max(0,Math.min(sceneRows.length-1,Math.round(shapeTarget)));
    const from=Math.min(sceneRows.length-1,Math.floor(layoutPosition)),to=Math.min(sceneRows.length-1,from+1),blend=layoutPosition-from;
    const centerFor=index=>Math.max(height*.44,(sceneRows[index]?.top??0)-scrollY+workScale+12);
    let workY=mobile?(sceneRows[active]?.window??0)-scrollY+170:centerFor(from)*(1-blend)+centerFor(to)*blend;
    if(!mobile&&blend>0&&from!==to){
      // Cross the centre in the empty space between entries, not through their prose.
      const crossing=Math.sin(Math.PI*blend),gapCenter=(sceneRows[from].bodyBottom+sceneRows[to].bodyTop)/2-scrollY;
      workY=workY*(1-crossing)+gapCenter*crossing;
      displayScale=workScale*(1-.38*crossing);
    }
    const workX=mobile?width*.5:width*(.255+side*.49);
    sceneView={width,height,x:width*(mobile?.52:.75)*(1-t)+workX*t,
      y:height*(mobile?.74:.41)*(1-t)+workY*t,
      scale:heroScale+(displayScale-heroScale)*t,opacity:1};
    if(mobile){
      // On narrow screens the drawing occupies its own slot above the prose.
      const inWork=(sceneRows[0]?.window??Infinity)-scrollY<height;
      sceneView.x=width*.5;
      sceneView.y=inWork?workY:height*.74-scrollY;
      sceneView.scale=inWork?workScale:heroScale;
    }
    sceneView.y=sceneExitY(sceneView.y,sceneView.scale,personalTop-scrollY,exitClearance);
    // Opening: one Lorenz trajectory lives through rising rho, then the full shape draws in beneath it.
    sceneView.intro=null;sceneView.live=null;
    if(chaos){
      // Once the tracers have separated, the full curve fades in behind them; the tracers carry on as the ambient ones.
      if(chaosEnd===null&&(chaos.progress>=.73||Math.abs(shapePosition)>.02||heroBlend>.05||!running))chaosEnd=time;
      const after=chaosEnd===null?0:Math.min(1,(time-chaosEnd)/3.5);
      sceneView.reveal=1;sceneView.guide=smoothstep(after);sceneView.arrive=1;sceneView.live=chaos;
      const text='ρ = '+chaos.rho.toFixed(1)+' · '+chaos.phase;
      if(text!==lastRho){rhoReadout.textContent=text;lastRho=text;}
      rhoReadout.classList.toggle('visible',after<.4);
      if(after>=1)introPlayed=true;
      if(shapePosition>.5){chaos=null;introPlayed=true;sceneView.live=null;}
    }else{
      // Without the opening, the first shape draws itself in; paused or reduced motion shows it complete.
      const intro=Math.min(1,time/4.2);
      sceneView.reveal=introPlayed||!running||reduced.matches?1:1-Math.pow(1-intro,3);
      sceneView.guide=1;sceneView.arrive=undefined;
    }
    if(dust&&dustIndex!==heldIndex()){dust=null;dustIndex=-1;}
    sceneView.dust=dust&&dust.active?{index:dustIndex,fill:dust.fill}:null;
    sceneView.tiltX=tiltX*.1;sceneView.tiltY=tiltY*.05;sceneView.spin=spin;
    scene.draw(sceneView,shapePosition,time);
    if(railLabel){railLabel.style.transform='translate3d('+(sceneView.x-150)+'px,'+(sceneView.y+sceneView.scale+18)+'px,0)';railLabel.style.opacity=String(t);}
    const index=Math.max(0,Math.round(shapePosition))%ATTRACTORS.length,name=ATTRACTORS[index].name;
    if(name!==lastName){names.forEach(node=>node.textContent=name);canvas.dataset.attractor=name;lastName=name;}
    if(!running)canvas.dataset.shapePosition=shapePosition.toFixed(3);
  }else{
    ctx.clearRect(0,0,width,height);
    if(mode==='attractor')drawAttractor();else if(mode==='wave')drawWave();else drawField();
  }
}
if(mode==='field'){
  texture=document.createElement('canvas');textureContext=texture.getContext('2d');
  worker=new Worker('./reaction-worker.js',{type:'module'});
  worker.onmessage=event=>{
    const {pixels,width:w,height:h,step}=event.data;
    texture.width=w;texture.height=h;reactionStep=step;canvas.dataset.reactionStep=String(step);
    textureContext.putImageData(new ImageData(pixels,w,h),0,0);draw();
  };
  worker.postMessage({type:'running',value:running&&!document.hidden});
}
const reveals=[...document.querySelectorAll('[data-reveal]')];
if(!reduced.matches&&'IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}},{threshold:.07});
  reveals.forEach(el=>{el.classList.add('will-reveal');observer.observe(el);});
}
const dialog=document.querySelector('#case-dialog'),detail=document.querySelector('#case-content');
const personality=document.querySelector('.personality-section');
if(personality&&'IntersectionObserver' in window){
  new IntersectionObserver(entries=>{
    document.body.classList.toggle('viewing-about',entries[0].isIntersecting);
  },{rootMargin:'0px 0px -25% 0px',threshold:0}).observe(personality);
}
let returnFocus;
document.querySelectorAll('[data-case]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();returnFocus=link;detail.replaceChildren(document.querySelector('#case-'+link.dataset.case).content.cloneNode(true));dialog.showModal();
}));
document.querySelector('#close-case').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
dialog.addEventListener('close',()=>returnFocus?.focus());
document.querySelector('#menu-toggle').addEventListener('click',event=>{
  const open=event.currentTarget.getAttribute('aria-expanded')!=='true';event.currentTarget.setAttribute('aria-expanded',String(open));document.querySelector('#main-nav').classList.toggle('open',open);
});
document.querySelectorAll('#main-nav a').forEach(link=>link.addEventListener('click',()=>{
  document.querySelector('#main-nav').classList.remove('open');document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');
}));
addEventListener('pagehide',event=>{
  cancelAnimationFrame(frame);frame=0;last=0;
  if(event.persisted)worker?.postMessage({type:'running',value:false});
  else{disposed=true;worker?.terminate();}
});
addEventListener('pageshow',event=>{if(event.persisted){scroll();sync();draw();}});
new ResizeObserver(()=>size()).observe(document.querySelector('main'));
document.querySelectorAll('.project-notes').forEach(el=>el.addEventListener('toggle',()=>size()));
document.querySelectorAll('.why-info').forEach(el=>{
  let pinned=false;
  el.querySelector('summary').addEventListener('click',event=>{event.preventDefault();pinned=!pinned;el.open=pinned;});
  el.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')el.open=true;});
  el.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'&&!pinned&&!el.contains(document.activeElement))el.open=false;});
  el.addEventListener('focusout',event=>{if(!el.contains(event.relatedTarget)){pinned=false;el.open=false;}});
  el.addEventListener('keydown',event=>{if(event.key==='Escape'){pinned=false;el.open=false;el.querySelector('summary').focus();}});
});
if(mode==='combined')createScene(canvas).then(value=>{scene=value;
  if(introEnabled&&running&&!reduced.matches&&scrollY<innerHeight*.3&&Math.round(shapeTarget)===0)chaos=createChaosIntro(normalFrame(ATTRACTORS[0]));
  size();shapePosition=heldAttractor??(reduced.matches?Math.round(shapeTarget):shapeTarget);layoutPosition=reduced.matches?Math.round(shapeTarget):shapeTarget;viewHero=heroBlend;draw();label();start();}).catch(error=>{canvas.dataset.renderer='unavailable';console.warn(error.message);});
else{size();label();start();}
