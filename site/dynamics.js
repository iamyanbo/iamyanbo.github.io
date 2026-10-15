export function lorenzDerivative([x,y,z],sigma=10,rho=28,beta=8/3){
  return [sigma*(y-x),x*(rho-z)-y,x*y-beta*z];
}
export function rk4(state,dt=.006,derivative=lorenzDerivative){
  const a=derivative(state),b=derivative(state.map((v,i)=>v+a[i]*dt/2));
  const c=derivative(state.map((v,i)=>v+b[i]*dt/2)),d=derivative(state.map((v,i)=>v+c[i]*dt));
  return state.map((v,i)=>v+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6);
}
export function lorenzTrajectory(count=6500,initial=[.1,.1,.1]){
  let state=initial;const result=[];
  for(let i=0;i<count+500;i++){state=rk4(state);if(i>=500)result.push(state);}
  return result;
}
export function waveHeight(x,y,t){
  // A superposition of exact solutions of u_tt = Laplacian(u), with c = 1.
  return .65*Math.sin(.72*x)*Math.sin(.58*y)*Math.cos(Math.hypot(.72,.58)*t)
    +.3*Math.sin(1.25*x+.5)*Math.sin(.42*y)*Math.cos(Math.hypot(1.25,.42)*t+.8);
}
export function createReaction(width=240,height=168){
  const u=new Float32Array(width*height).fill(1),v=new Float32Array(width*height);
  const positions=[];
  for(let row=0;row<4;row++)for(let col=0;col<5;col++)positions.push([.12+col*.19+.025*Math.sin(row*3+col),.12+row*.25+.025*Math.sin(col*2+row)]);
  for(const [px,py] of positions)for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if((x-px*width)**2+(y-py*height)**2<36){const i=y*width+x;u[i]=.5;v[i]=.25+.012*Math.sin(x*.71+y*1.37);}
  }
  return {width,height,u,v,nextU:new Float32Array(u.length),nextV:new Float32Array(v.length),step:0};
}
export function stepReaction(state,feed=.035,kill=.062){
  const {width:w,height:h,u,v,nextU:a,nextV:b}=state;
  for(let y=0;y<h;y++){
    const up=(y+h-1)%h*w,down=(y+1)%h*w,center=y*w;
    for(let x=0;x<w;x++){
      const left=(x+w-1)%w,right=(x+1)%w,i=center+x;
      const lapU=-u[i]+.2*(u[center+left]+u[center+right]+u[up+x]+u[down+x])+.05*(u[up+left]+u[up+right]+u[down+left]+u[down+right]);
      const lapV=-v[i]+.2*(v[center+left]+v[center+right]+v[up+x]+v[down+x])+.05*(v[up+left]+v[up+right]+v[down+left]+v[down+right]);
      const reaction=u[i]*v[i]*v[i];
      a[i]=u[i]+.16*lapU-reaction+feed*(1-u[i]);
      b[i]=v[i]+.08*lapV+reaction-(feed+kill)*v[i];
    }
  }
  state.u=a;state.v=b;state.nextU=u;state.nextV=v;state.step++;
}
