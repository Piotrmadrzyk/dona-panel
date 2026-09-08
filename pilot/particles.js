(function(){
'use strict';
// A projected particle surface. Audio energy is supplied by the existing voice meter.
window.drawDonaPresence=function(ctx,size,time,energy,hue,reduced){
 const c=size/2,r=size*.29,turn=reduced?.35:time*.14;
 ctx.clearRect(0,0,size,size);
 const glow=ctx.createRadialGradient(c,c,0,c,c,r*1.8);
 glow.addColorStop(0,'rgba(112,143,255,.14)');glow.addColorStop(.6,'rgba(104,85,224,.04)');glow.addColorStop(1,'rgba(10,14,30,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,size,size);
 const count=size<360?1500:2400,points=[];
 for(let i=0;i<count;i++){
  const y=1-2*(i+.5)/count,a=i*2.399963,rr=Math.sqrt(1-y*y);
  let x=Math.cos(a)*rr,z=Math.sin(a)*rr;
  const wave=1+.105*Math.sin(y*4+time*.55)+.065*Math.cos(a*3+y*5-time*.32)+energy*.24*Math.sin(y*7+a*2+time*2);
  const xx=x*Math.cos(turn)+z*Math.sin(turn);z=z*Math.cos(turn)-x*Math.sin(turn);x=xx;
  const tilt=.25,yy=y*Math.cos(tilt)-z*Math.sin(tilt);z=y*Math.sin(tilt)+z*Math.cos(tilt);
  const perspective=3/(3-z*.35);points.push({x:c+x*r*wave*perspective,y:c+yy*r*wave*perspective,z});
 }
 points.sort((a,b)=>a.z-b.z);
 for(const p of points){const front=(p.z+1)/2;ctx.fillStyle=`hsla(${hue+front*35},${40+front*35}%,${50+front*42}%,${.12+front*.76})`;ctx.beginPath();ctx.arc(p.x,p.y,(.48+front*1.03)*size/480,0,Math.PI*2);ctx.fill();}
};
})();
