import {ATTRACTORS,POINT_COUNT,smoothstep} from './attractors.js';
import {TRACER_COLORS,TRACE_STEPS,TRACE_STRIDE,RIBBON_STRIDE,trajectoryLength,fillTracers,fillTraceRibbon} from './tracers.js';
const SYSTEM_COUNT=ATTRACTORS.length;
const palettes=[
  [[.09,.29,.75],[.55,.25,.76],[.87,.40,.28]],
  [[.22,.24,.69],[.04,.53,.68],[.79,.35,.56]],
  [[.12,.36,.75],[.68,.28,.62],[.90,.51,.24]],
  [[.20,.29,.69],[.80,.37,.23],[.43,.28,.74]],
  [[.43,.23,.67],[.07,.52,.68],[.84,.37,.46]],
  [[.10,.30,.72],[.77,.29,.48],[.54,.33,.77]]
];

// Long, complete shapes with short transitions at actual section boundaries.
export function sectionPosition(y,anchors,viewport){
  let position=0;
  for(let i=0;i<anchors.length;i++){
    const t=Math.max(0,Math.min(1,(y-(anchors[i]-viewport*.7))/(viewport*.42)));
    position+=smoothstep(t);
  }
  return Math.min(anchors.length,position);
}
export function sceneWeights(position){
  const p=Math.max(0,position),from=Math.floor(p)%SYSTEM_COUNT,to=(from+1)%SYSTEM_COUNT,t=p-Math.floor(p);
  // Keep a visible trajectory throughout the handoff; never fade to blank.
  return {from,to,a:1-t,b:t};
}
export function alternatingSide(position){
  const p=Math.max(0,position),from=Math.floor(p),blend=p-from;
  return from%2+(from%2===0?1:-1)*blend;
}
export function sceneExitY(center,scale,boundary,clearance=100){
  // Release the pinned drawing before the following full-width section reaches it.
  return Math.min(center,boundary-scale-clearance);
}
export function ribbonData(points){
  const count=points.length/3,result=new Float32Array((count-1)*6*9);
  let cursor=0;
  for(let i=0;i<count-1;i++)for(const [end,side] of [[0,-1],[1,-1],[1,1],[0,-1],[1,1],[0,1]]){
    result.set(points.subarray(i*3,i*3+3),cursor);cursor+=3;
    result.set(points.subarray((i+1)*3,(i+1)*3+3),cursor);cursor+=3;
    result[cursor++]=end;result[cursor++]=side;result[cursor++]=(i+end)/(count-1);
  }
  return result;
}
const cameras=[[-.38,.38],[-.35,1.0],[.3,.75],[-.35,.58],[.6,.72],[-.38,.4]];
function projectPoint(x,y,z,yaw,pitch){
  const c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const a=x*c-y*s,b=x*s+y*c,factor=1+.08*(b*cp+z*sp);
  return [a*factor,(b*sp-z*cp)*factor];
}
export function framing(points,index){
  const [yaw,pitch]=cameras[index];let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  // Fit the gentle orbit once. Rotating never makes the shape invade the prose column.
  for(let pose=0;pose<24;pose++)for(const tilt of [-.06,.06])for(let i=0;i<points.length;i+=9){
    const [x,y]=projectPoint(points[i],points[i+1],points[i+2],yaw-.28+pose*.56/23,pitch+tilt);
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  }
  return {yaw,pitch,x:(minX+maxX)/2,y:(minY+maxY)/2,scale:1.75/Math.max(maxX-minX,maxY-minY)};
}
function framedPoints(points,index,frame=framing(points,index)){
  const result=[];
  for(let i=0;i<points.length;i+=3){
    const p=projectPoint(points[i],points[i+1],points[i+2],frame.yaw,frame.pitch);
    result.push([(p[0]-frame.x)*frame.scale,(p[1]-frame.y)*frame.scale,i/(points.length-3)]);
  }
  return result;
}
// A spatial ordering pairs nearby regions rather than unrelated path indices.
// This is a display correspondence, not an interpolation of the ODEs.
export function transportData(a,b){
  const code=p=>{
    const x=Math.max(0,Math.min(4095,Math.round((p[0]+1)*2047.5))),y=Math.max(0,Math.min(4095,Math.round((p[1]+1)*2047.5)));
    let key=0;for(let bit=0;bit<12;bit++)key|=((x>>bit)&1)<<(bit*2)|((y>>bit)&1)<<(bit*2+1);
    return key;
  };
  const sort=points=>points.map((p,i)=>({p,i,key:code(p)})).sort((x,y)=>x.key-y.key||x.i-y.i);
  const from=sort(a),to=sort(b),data=new Float32Array(a.length*6);
  for(let i=0;i<a.length;i++){data.set(from[i].p,i*6);data.set(to[i].p,i*6+3);}
  return data;
}
export function transport3DData(a,b,projectedA,projectedB){
  const pairs=transportData(projectedA,projectedB),result=new Float32Array(projectedA.length*8);
  for(let i=0,j=0;i<pairs.length;i+=6,j+=8){
    const origin=Math.round(pairs[i+2]*(projectedA.length-1)),destination=Math.round(pairs[i+5]*(projectedB.length-1));
    result.set(a.subarray(origin*3,origin*3+3),j);
    result.set(b.subarray(destination*3,destination*3+3),j+3);
    result[j+6]=pairs[i+2];result[j+7]=pairs[i+5];
  }
  return result;
}
const colorFunction=`
vec3 pointColor(float coordinate){
  float p=clamp(coordinate,0.,1.);
  if(p<.5)return mix(uColorA,uColorB,smoothstep(0.,.5,p));
  return mix(uColorB,uColorC,smoothstep(.5,1.,p));
}`;
const particleVertex=`
attribute vec3 aOrigin; attribute vec3 aDestination; attribute vec2 aAlong;
uniform vec2 uViewport; uniform vec2 uCenter;
uniform float uScale; uniform float uBlend; uniform float uDpr;
uniform vec2 uOriginAngles; uniform vec2 uDestinationAngles;
uniform vec3 uOriginFrame; uniform vec3 uDestinationFrame;
varying float vAlong;
varying float vColorPosition;
vec2 projected(vec3 p,vec2 angles,vec3 frame){
  float c=cos(angles.x),s=sin(angles.x),cp=cos(angles.y),sp=sin(angles.y);
  float a=p.x*c-p.y*s,b=p.x*s+p.y*c;
  vec2 q=vec2(a,b*sp-p.z*cp)*(1.+.08*(b*cp+p.z*sp));
  return (q-frame.xy)*frame.z;
}
void main(){
  vec2 p=mix(projected(aOrigin,uOriginAngles,uOriginFrame),projected(aDestination,uDestinationAngles,uDestinationFrame),uBlend);
  vec2 pixel=uCenter+p*uScale;
  gl_Position=vec4(pixel.x/uViewport.x*2.-1.,1.-pixel.y/uViewport.y*2.,0.,1.);
  gl_PointSize=2.4*uDpr;
  vAlong=mix(aAlong.x,aAlong.y,uBlend);
  vec3 state=mix(aOrigin,aDestination,uBlend);
  vColorPosition=.5+.5*(state.z*.7+state.x*.3);
}`;
const particleFragment=`
precision mediump float;
uniform float uOpacity; uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorC;
varying float vAlong;
varying float vColorPosition;
${colorFunction}
void main(){
  float r=length(gl_PointCoord-vec2(.5))*2.;
  float edge=1.-smoothstep(.45,1.,r);
  float trail=1.-smoothstep(.0,.18,fract(uTime*.075-vAlong*3.));
  gl_FragColor=vec4(pointColor(vColorPosition),edge*uOpacity*(.62+trail*.3));
}`;
const tracerVertex=`
attribute vec3 aOrigin; attribute vec3 aDestination; attribute vec3 aColor; attribute vec3 aStyle;
uniform vec2 uViewport; uniform vec2 uCenter; uniform float uScale; uniform float uBlend; uniform float uDpr;
uniform vec2 uOriginAngles; uniform vec2 uDestinationAngles;
uniform vec3 uOriginFrame; uniform vec3 uDestinationFrame;
varying vec3 vColor; varying float vOpacity; varying float vSize;
vec2 projected(vec3 p,vec2 angles,vec3 frame){
  float c=cos(angles.x),s=sin(angles.x),cp=cos(angles.y),sp=sin(angles.y);
  float a=p.x*c-p.y*s,b=p.x*s+p.y*c;
  return (vec2(a,b*sp-p.z*cp)*(1.+.08*(b*cp+p.z*sp))-frame.xy)*frame.z;
}
void main(){
  vec2 p=mix(projected(aOrigin,uOriginAngles,uOriginFrame),projected(aDestination,uDestinationAngles,uDestinationFrame),uBlend);
  vec2 pixel=uCenter+p*uScale;
  gl_Position=vec4(pixel.x/uViewport.x*2.-1.,1.-pixel.y/uViewport.y*2.,0.,1.);
  gl_PointSize=aStyle.z*uDpr;
  vColor=aColor;vOpacity=mix(aStyle.x,aStyle.y,uBlend);vSize=aStyle.z;
}`;
const tracerFragment=`
precision mediump float;
uniform float uOpacity;
varying vec3 vColor; varying float vOpacity; varying float vSize;
void main(){
  float r=length(gl_PointCoord-vec2(.5))*2.;
  float core=1.-smoothstep(.57,.72,r);
  float halo=(1.-smoothstep(.72,1.,r))*.18;
  vec3 color=vColor;
  if(vSize>10.)color=mix(color,vec3(1.),smoothstep(.54,.70,r)*.85);
  gl_FragColor=vec4(color,max(core,halo)*vOpacity*uOpacity);
}`;
const trailVertex=tracerVertex
  .replace('attribute vec3 aOrigin;', 'attribute vec3 aNextOrigin; attribute vec3 aNextDestination; attribute float aSide; attribute vec3 aOrigin;')
  .replace('varying vec3 vColor;', 'varying float vSide; varying vec3 vColor;')
  .replace('vec2 pixel=uCenter+p*uScale;', `
  vec2 q=mix(projected(aNextOrigin,uOriginAngles,uOriginFrame),projected(aNextDestination,uDestinationAngles,uDestinationFrame),uBlend);
  vec2 direction=normalize(q-p+vec2(.000001));
  vec2 pixel=uCenter+p*uScale+vec2(-direction.y,direction.x)*aSide*aStyle.z;
  vSide=aSide;`);
const trailFragment=`
precision mediump float;
uniform float uOpacity;
varying vec3 vColor; varying float vOpacity; varying float vSide;
void main(){
  float edge=1.-smoothstep(.48,1.,abs(vSide));
  gl_FragColor=vec4(vColor,edge*vOpacity*uOpacity);
}`;
const vertex=`
attribute vec3 aStart; attribute vec3 aEnd; attribute vec3 aEdge;
uniform vec2 uViewport; uniform vec2 uCenter; uniform float uScale;
uniform float uYaw; uniform float uPitch; uniform float uWidth;
varying float vSide; varying float vAlong; varying float vDepth;
varying float vColorPosition;
vec3 project(vec3 p){
  float c=cos(uYaw),s=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);
  vec3 q=vec3(p.x*c-p.y*s,(p.x*s+p.y*c)*sp-p.z*cp,(p.x*s+p.y*c)*cp+p.z*sp);
  q.xy*=1.0+q.z*.08; return q;
}
void main(){
  vec3 a=project(aStart),b=project(aEnd),p=mix(a,b,aEdge.x);
  vec2 direction=normalize(b.xy-a.xy+vec2(.000001));
  vec2 normal=vec2(-direction.y,direction.x);
  vec2 pixel=uCenter+p.xy*uScale+normal*aEdge.y*uWidth;
  gl_Position=vec4(pixel.x/uViewport.x*2.0-1.0,1.0-pixel.y/uViewport.y*2.0,0.,1.);
  vSide=aEdge.y; vAlong=aEdge.z; vDepth=p.z;
  vec3 state=mix(aStart,aEnd,aEdge.x);
  vColorPosition=.5+.5*(state.z*.7+state.x*.3);
}`;
const fragment=`
precision mediump float;
uniform float uTime; uniform float uOpacity; uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorC;
varying float vSide; varying float vAlong; varying float vDepth;
varying float vColorPosition;
${colorFunction}
void main(){
  float trail=1.0-smoothstep(.0,.18,fract(uTime*.075-vAlong*3.0));
  float edge=1.0-smoothstep(.48,1.0,abs(vSide));
  float depth=clamp(vDepth*.35+.55,.15,1.);
  vec3 color=vec3(.25,.39,.61);
  gl_FragColor=vec4(color,edge*uOpacity*(.32+depth*.28+trail*.40));
}`;
function shader(gl,type,code){
  const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;
}
export async function createScene(canvas){
  const [response,traceResponse]=await Promise.all(['curves.bin','tracer-curves.bin'].map(name=>fetch('./'+name+new URL(import.meta.url).search)));
  if(!response.ok||!traceResponse.ok)throw Error('Could not load attractor geometry');
  const [geometry,traceGeometry]=await Promise.all([response.arrayBuffer(),traceResponse.arrayBuffer()]);
  const flat=new Float32Array(geometry),traceFlat=new Float32Array(traceGeometry),size=POINT_COUNT*3;
  if(flat.length!==size*SYSTEM_COUNT||!flat.every(Number.isFinite))throw Error('Invalid attractor geometry');
  const bank=ATTRACTORS.map((_,i)=>flat.subarray(i*size,(i+1)*size));
  if(traceFlat.length!==size*SYSTEM_COUNT*TRACER_COLORS.length||!traceFlat.every(Number.isFinite))throw Error('Invalid tracer geometry');
  const traceBank=ATTRACTORS.map((_,i)=>TRACER_COLORS.map((_,j)=>{const start=(i*TRACER_COLORS.length+j)*size;return traceFlat.subarray(start,start+size);}));
  const frames=bank.map(framing);
  const rates=traceBank.map(paths=>paths.map(points=>.45/trajectoryLength(points)));
  let gl;
  try{if(new URLSearchParams(location.search).get('renderer')!=='canvas')gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:false,powerPreference:'low-power'});}catch{}
  if(!gl)return createFallback(canvas,bank,frames,rates,traceBank);
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffers=bank.map(points=>{
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,ribbonData(points),gl.STATIC_DRAW);return buffer;
  });
  const particles=gl.createProgram();
  gl.attachShader(particles,shader(gl,gl.VERTEX_SHADER,particleVertex));gl.attachShader(particles,shader(gl,gl.FRAGMENT_SHADER,particleFragment));gl.linkProgram(particles);
  if(!gl.getProgramParameter(particles,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(particles));
  const particleAttributes=['aOrigin','aDestination','aAlong'].map(name=>gl.getAttribLocation(particles,name));
  const particleUniforms=Object.fromEntries(['Viewport','Center','Scale','Blend','Dpr','Opacity','Time','ColorA','ColorB','ColorC','OriginAngles','DestinationAngles','OriginFrame','DestinationFrame'].map(name=>[name,gl.getUniformLocation(particles,'u'+name)]));
  const projected=bank.map((points,index)=>framedPoints(points,index,frames[index])),transports=projected.map((points,index)=>{
    const next=(index+1)%SYSTEM_COUNT,buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,transport3DData(bank[index],bank[next],points,projected[next]),gl.STATIC_DRAW);return buffer;
  });
  const attributes=['aStart','aEnd','aEdge'].map(name=>gl.getAttribLocation(program,name));
  const uniforms=Object.fromEntries(['Viewport','Center','Scale','Yaw','Pitch','Width','Time','Opacity','ColorA','ColorB','ColorC'].map(name=>[name,gl.getUniformLocation(program,'u'+name)]));
  const tracers=gl.createProgram();
  gl.attachShader(tracers,shader(gl,gl.VERTEX_SHADER,tracerVertex));gl.attachShader(tracers,shader(gl,gl.FRAGMENT_SHADER,tracerFragment));gl.linkProgram(tracers);
  if(!gl.getProgramParameter(tracers,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(tracers));
  const tracerAttributes=['aOrigin','aDestination','aColor','aStyle'].map(name=>gl.getAttribLocation(tracers,name));
  const tracerUniforms=Object.fromEntries(['Viewport','Center','Scale','Blend','Dpr','Opacity','OriginAngles','DestinationAngles','OriginFrame','DestinationFrame'].map(name=>[name,gl.getUniformLocation(tracers,'u'+name)]));
  const trails=gl.createProgram();
  gl.attachShader(trails,shader(gl,gl.VERTEX_SHADER,trailVertex));gl.attachShader(trails,shader(gl,gl.FRAGMENT_SHADER,trailFragment));gl.linkProgram(trails);
  if(!gl.getProgramParameter(trails,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(trails));
  const trailAttributes=['aOrigin','aDestination','aColor','aStyle','aNextOrigin','aNextDestination','aSide'].map(name=>gl.getAttribLocation(trails,name));
  const trailUniforms=Object.fromEntries(['Viewport','Center','Scale','Blend','Opacity','OriginAngles','DestinationAngles','OriginFrame','DestinationFrame'].map(name=>[name,gl.getUniformLocation(trails,'u'+name)]));
  const trailData=new Float32Array(TRACER_COLORS.length*TRACE_STEPS*4*RIBBON_STRIDE),trailRanges=[],trailBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,trailBuffer);gl.bufferData(gl.ARRAY_BUFFER,trailData.byteLength,gl.DYNAMIC_DRAW);
  const traceData=new Float32Array(TRACER_COLORS.length*TRACE_STEPS*TRACE_STRIDE),traceBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,traceBuffer);gl.bufferData(gl.ARRAY_BUFFER,traceData.byteLength,gl.DYNAMIC_DRAW);
  // Store premultiplied RGB with full coverage alpha for canvas compositing.
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  canvas.dataset.renderer='webgl';
  return {resize(width,height,dpr){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);gl.viewport(0,0,canvas.width,canvas.height);},
    draw(view,position,time){
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(uniforms.Viewport,view.width,view.height);
      gl.uniform1f(uniforms.Width,.85);gl.uniform1f(uniforms.Time,time);
      const w=sceneWeights(position);
      const t=position-Math.floor(position),bridge=Math.sin(Math.PI*t);
      for(const [index,opacity] of [[w.from,w.a*(1-bridge)],[w.to,w.b*(1-bridge)]]){
        if(opacity<.002)continue;
        const frame=frames[index],scale=view.scale*frame.scale;
        gl.uniform3fv(uniforms.ColorA,palettes[index][0]);gl.uniform3fv(uniforms.ColorB,palettes[index][1]);
        gl.uniform3fv(uniforms.ColorC,palettes[index][2]);
        gl.uniform2f(uniforms.Center,view.x-frame.x*scale,view.y-frame.y*scale);
        gl.uniform1f(uniforms.Scale,scale);gl.uniform1f(uniforms.Yaw,frame.yaw+Math.sin(time*.07)*.28);
        gl.uniform1f(uniforms.Pitch,frame.pitch+Math.sin(time*.05)*.06);
        gl.bindBuffer(gl.ARRAY_BUFFER,buffers[index]);
        attributes.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,36,i*12);});
        gl.uniform1f(uniforms.Opacity,opacity*view.opacity*.22);gl.drawArrays(gl.TRIANGLES,0,(POINT_COUNT-1)*6);
      }
      if(bridge>.001&&w.from!==w.to){
        gl.useProgram(particles);gl.bindBuffer(gl.ARRAY_BUFFER,transports[w.from]);
        // Programs may assign different attribute locations. Reset both layouts.
        attributes.forEach(a=>gl.disableVertexAttribArray(a));
        particleAttributes.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,i===2?2:3,gl.FLOAT,false,32,i*12);});
        gl.uniform2f(particleUniforms.Viewport,view.width,view.height);gl.uniform2f(particleUniforms.Center,view.x,view.y);
        gl.uniform1f(particleUniforms.Scale,view.scale);gl.uniform1f(particleUniforms.Blend,t);
        gl.uniform1f(particleUniforms.Dpr,canvas.width/view.width);gl.uniform1f(particleUniforms.Time,time);
        for(const [prefix,index] of [['Origin',w.from],['Destination',w.to]]){
          const frame=frames[index];
          gl.uniform2f(particleUniforms[prefix+'Angles'],frame.yaw+Math.sin(time*.07)*.28,frame.pitch+Math.sin(time*.05)*.06);
          gl.uniform3f(particleUniforms[prefix+'Frame'],frame.x,frame.y,frame.scale);
        }
        const color=(channel)=>palettes[w.from][channel].map((value,j)=>value+(palettes[w.to][channel][j]-value)*t);
        gl.uniform3fv(particleUniforms.ColorA,color(0));gl.uniform3fv(particleUniforms.ColorB,color(1));
        gl.uniform3fv(particleUniforms.ColorC,color(2));
        gl.uniform1f(particleUniforms.Opacity,bridge*view.opacity*.22);gl.drawArrays(gl.POINTS,0,POINT_COUNT);
        particleAttributes.forEach(a=>gl.disableVertexAttribArray(a));
      }
      // Independent coloured histories retain the shape, with small moving heads.
      attributes.forEach(a=>gl.disableVertexAttribArray(a));
      fillTracers(traceBank[w.from],traceBank[w.to],time,rates[w.from],rates[w.to],traceData);
      fillTraceRibbon(traceData,trailData,trailRanges);
      gl.useProgram(trails);gl.bindBuffer(gl.ARRAY_BUFFER,trailBuffer);
      const trailCount=trailRanges.at(-1).reduce((a,b)=>a+b,0);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,trailData.subarray(0,trailCount*RIBBON_STRIDE));
      trailAttributes.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,i===6?1:3,gl.FLOAT,false,RIBBON_STRIDE*4,i*12);});
      gl.uniform2f(trailUniforms.Viewport,view.width,view.height);gl.uniform2f(trailUniforms.Center,view.x,view.y);
      gl.uniform1f(trailUniforms.Scale,view.scale);gl.uniform1f(trailUniforms.Blend,t);gl.uniform1f(trailUniforms.Opacity,view.opacity);
      for(const [prefix,index] of [['Origin',w.from],['Destination',w.to]]){
        const frame=frames[index];
        gl.uniform2f(trailUniforms[prefix+'Angles'],frame.yaw+Math.sin(time*.07)*.28,frame.pitch+Math.sin(time*.05)*.06);
        gl.uniform3f(trailUniforms[prefix+'Frame'],frame.x,frame.y,frame.scale);
      }
      for(const [first,count] of trailRanges)gl.drawArrays(gl.TRIANGLE_STRIP,first,count);
      trailAttributes.forEach(a=>gl.disableVertexAttribArray(a));
      gl.useProgram(tracers);gl.bindBuffer(gl.ARRAY_BUFFER,traceBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,traceData);
      tracerAttributes.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,48,i*12);});
      gl.uniform2f(tracerUniforms.Viewport,view.width,view.height);gl.uniform2f(tracerUniforms.Center,view.x,view.y);
      gl.uniform1f(tracerUniforms.Scale,view.scale);gl.uniform1f(tracerUniforms.Blend,t);
      gl.uniform1f(tracerUniforms.Dpr,canvas.width/view.width);gl.uniform1f(tracerUniforms.Opacity,view.opacity);
      for(const [prefix,index] of [['Origin',w.from],['Destination',w.to]]){
        const frame=frames[index];
        gl.uniform2f(tracerUniforms[prefix+'Angles'],frame.yaw+Math.sin(time*.07)*.28,frame.pitch+Math.sin(time*.05)*.06);
        gl.uniform3f(tracerUniforms[prefix+'Frame'],frame.x,frame.y,frame.scale);
      }
      for(let tracer=0;tracer<TRACER_COLORS.length;tracer++)gl.drawArrays(gl.POINTS,(tracer+1)*TRACE_STEPS-1,1);
      tracerAttributes.forEach(a=>gl.disableVertexAttribArray(a));
    }};
}
function createFallback(canvas,bank,frames,rates,traceBank){
  const ctx=canvas.getContext('2d'),paths=[];
  const traceData=new Float32Array(TRACER_COLORS.length*TRACE_STEPS*TRACE_STRIDE);
  bank.forEach((points,index)=>{
    const frame=frames[index],segments=[];
    const count=points.length/3,chunk=Math.ceil(count/48);
    for(let start=0;start<count-1;start+=chunk){
      const path=new Path2D(),end=Math.min(count-1,start+chunk);
      for(let i=start;i<=end;i++){
        const p=projectPoint(points[i*3],points[i*3+1],points[i*3+2],frame.yaw,frame.pitch);
        const x=(p[0]-frame.x)*frame.scale,y=(p[1]-frame.y)*frame.scale;
        if(i===start)path.moveTo(x,y);else path.lineTo(x,y);
      }
      const phase=(((start+end)/2/(count-1))*4)%1*3,from=Math.floor(phase),to=(from+1)%3,t=smoothstep(phase-from);
      const color=palettes[index][from].map((v,j)=>Math.round((v+(palettes[index][to][j]-v)*t)*255));
      segments.push({path,color:'rgb('+color.join(',')+')'});
    }paths[index]=segments;
  });
  const projected=bank.map((points,index)=>framedPoints(points,index,frames[index])),transports=projected.map((points,i)=>transportData(points,projected[(i+1)%SYSTEM_COUNT]));
  canvas.dataset.renderer='canvas-fallback';
  return {resize(width,height,dpr){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);},
    draw(view,position,time){
      ctx.clearRect(0,0,view.width,view.height);ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);
      // Cached paths keep the fallback inexpensive; its orbit is in the display plane.
      ctx.rotate(Math.sin(time*.045)*.16);
      ctx.lineWidth=1/view.scale;ctx.strokeStyle='#2459d3';const w=sceneWeights(position);
      const t=position-Math.floor(position),bridge=Math.sin(Math.PI*t);
      for(const [index,opacity] of [[w.from,w.a*(1-bridge)],[w.to,w.b*(1-bridge)]])if(opacity>.002){ctx.globalAlpha=.10*opacity*view.opacity;ctx.strokeStyle='#637da8';for(const strand of paths[index])ctx.stroke(strand.path);}
      if(bridge>.001&&w.from!==w.to){
        const data=transports[w.from],dot=1.5/view.scale;ctx.globalAlpha=bridge*.65*view.opacity;ctx.fillStyle='#2459d3';ctx.beginPath();
        for(let i=0;i<data.length;i+=6){
          const x=data[i]+(data[i+3]-data[i])*t,y=data[i+1]+(data[i+4]-data[i+1])*t;
          ctx.rect(x-dot/2,y-dot/2,dot,dot);
        }ctx.fill();
      }
      fillTracers(traceBank[w.from],traceBank[w.to],time,rates[w.from],rates[w.to],traceData);
      const projectedTrace=(offset,index)=>{
        const frame=frames[index],p=projectPoint(traceData[offset],traceData[offset+1],traceData[offset+2],frame.yaw,frame.pitch);
        return [(p[0]-frame.x)*frame.scale,(p[1]-frame.y)*frame.scale];
      };
      for(let tracer=0;tracer<TRACER_COLORS.length;tracer++){
        const start=tracer*TRACE_STEPS*TRACE_STRIDE,color='rgb('+TRACER_COLORS[tracer].map(v=>Math.round(v*255)).join(',')+')';
        ctx.strokeStyle=color;ctx.lineWidth=1.8/view.scale;
        // A few strokes preserve the fading tail without thousands of canvas draw calls.
        for(let part=0;part<32;part++){
          const first=Math.floor(part*(TRACE_STEPS-1)/32),last=Math.floor((part+1)*(TRACE_STEPS-1)/32),middle=start+Math.floor((first+last)/2)*TRACE_STRIDE;
          ctx.globalAlpha=(traceData[middle+9]+(traceData[middle+10]-traceData[middle+9])*t)*view.opacity;ctx.beginPath();
          let previous;
          for(let step=first;step<=last;step++){
            const i=start+step*TRACE_STRIDE,a=projectedTrace(i,w.from),b=projectedTrace(i+3,w.to),x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
            if(step===first||Math.hypot(x-previous[0],y-previous[1])>.4)ctx.moveTo(x,y);else ctx.lineTo(x,y);
            previous=[x,y];
          }ctx.stroke();
        }
        const i=start+(TRACE_STEPS-1)*TRACE_STRIDE,a=projectedTrace(i,w.from),b=projectedTrace(i+3,w.to);
        ctx.globalAlpha=(traceData[i+9]+(traceData[i+10]-traceData[i+9])*t)*view.opacity;
        ctx.fillStyle=color;ctx.beginPath();ctx.arc(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,4/view.scale,0,Math.PI*2);ctx.fill();
        ctx.lineWidth=1.2/view.scale;ctx.strokeStyle='#fff';ctx.stroke();
      }
      ctx.restore();
    }};
}
