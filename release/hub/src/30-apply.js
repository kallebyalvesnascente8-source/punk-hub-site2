/* =====================================================================
   30 MOTOR DE APARÊNCIA: variáveis CSS, papel de parede, personagem, efeitos
   apply() é barato: só reconstrói camadas pesadas quando elas mudam.
   ===================================================================== */
const fam=n=>{n=String(n||'');if(FF[n])return FF[n];const c=cleanFont(n);return`"${c}",${/mono|code|hack|courier/i.test(c)?'ui-monospace,monospace':'system-ui,sans-serif'}`};
const ANKF={fade:'kfade',slide:'kslide',scale:'kscale',none:'none'};

function applyVars(){
 const t=S.t,l=S.l,b=S.bar,r=document.documentElement.style,on=l.anim&&t.as>0&&t.an!=='none';
 Object.entries({'--ac':t.ac,'--ac2':t.ac2,'--bg':t.bg,'--tx':t.tx,'--act':lum(t.ac)>.55?'#000':'#fff','--ff':fam(t.ff),'--fm':fam(t.fm),'--fs':t.fs+'px','--r':t.r+'px','--bl':t.bl+'px','--pn':mix(t.bg,t.tx,.07,t.al/100),
  '--gap':l.gap+'px','--u':l.sc/100,'--bw':t.bw+'px','--bo':t.bo+'%','--gl':t.gl+'px','--sd':t.sh?`0 10px ${t.sh}px rgba(0,0,0,.45)`:'0 0 0 transparent','--as':t.as||1,'--ak':on?ANKF[t.an]:'none','--bm':b.float?'10px':'0px'}).forEach(([k,v])=>r.setProperty(k,v));
 const d=document.body;d.dataset.bar=l.bar;d.dataset.anim=on?1:0;d.dataset.bf=b.float?1:0;d.dataset.al=b.align;d.dataset.lb=b.labels;d.classList.toggle('lock',!!l.lock)}

function applyLayers(){
 const t=S.t,u=IMG.url(t.wimg),wp=$('#wp'),c='color-mix(in srgb,var(--tx) 6%,transparent)',bl=t.wall==='img'&&u?t.wbl:0;
 const bg={aurora:'radial-gradient(circle at 15% 20%,color-mix(in srgb,var(--ac) 30%,transparent),transparent 45%),radial-gradient(circle at 85% 80%,color-mix(in srgb,var(--ac2) 26%,transparent),transparent 50%),var(--bg)',
  grid:`linear-gradient(${c} 1px,transparent 1px) 0 0/32px 32px,linear-gradient(90deg,${c} 1px,transparent 1px) 0 0/32px 32px,radial-gradient(circle at 50% 0,color-mix(in srgb,var(--ac) 18%,transparent),transparent 60%),var(--bg)`,
  plain:'var(--bg)',
  mesh:'radial-gradient(at 20% 15%,color-mix(in srgb,var(--ac) 38%,transparent) 0,transparent 50%),radial-gradient(at 85% 25%,color-mix(in srgb,var(--ac2) 32%,transparent) 0,transparent 50%),radial-gradient(at 60% 92%,color-mix(in srgb,var(--ac) 22%,transparent) 0,transparent 55%),var(--bg)',
  sunset:'linear-gradient(180deg,var(--bg) 0%,color-mix(in srgb,var(--ac) 32%,var(--bg)) 65%,color-mix(in srgb,var(--ac2) 52%,var(--bg)) 100%)',
  img:u?({cover:`center/cover no-repeat url(${u})`,contain:`center/contain no-repeat url(${u}),var(--bg)`,center:`center no-repeat url(${u}),var(--bg)`,tile:`0 0/auto repeat url(${u}),var(--bg)`})[t.wfit]:'var(--bg)'}[t.wall];
 wp.style.cssText=`background:${bg};inset:${-bl*2}px;filter:${bl?`blur(${bl}px)`:'none'};--wd:${t.wdim/100}`;
 $('#ovl').style.background=[t.vig?`radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,${t.vig/100}) 100%)`:'',t.scan?`repeating-linear-gradient(0deg,rgba(0,0,0,${t.scan/100}) 0 1px,transparent 1px 3px)`:''].filter(Boolean).join(',')||'none';
 const ch=t.ch,cu=IMG.url(ch.img),e=$('#chr');
 if(!cu){e.hidden=1;e.removeAttribute('src')}
 else{e.hidden=0;if(e.getAttribute('src')!==cu)e.src=cu;
  const pos=ch.side==='left'?`left:${ch.x}%;right:auto`:ch.side==='right'?`right:${ch.x}%;left:auto`:'left:50%;right:auto',tr=[ch.side==='center'?'translateX(-50%)':'',ch.flip?'scaleX(-1)':''].filter(Boolean).join(' ');
  e.style.cssText=`${pos};height:${ch.sz}vh;opacity:${ch.op/100};transform:${tr||'none'};filter:${ch.gl?`drop-shadow(0 0 ${ch.gl}px var(--ac))`:'none'}`}}

/* ---- Efeitos animados de fundo (canvas, ~30 fps, pausam com a aba oculta) ---- */
const RAINCH='ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ0123456789';
const FX={k:'',n:0,raf:0,ps:[],cols:[],last:0,w:0,h:0};
function fxSeed(){
 const c=$('#fx'),w=c.width=innerWidth,h=c.height=innerHeight,n=S.t.fxn,R=Math.random;FX.w=w;FX.h=h;
 const cnt={stars:n*3,snow:n*2.5,petals:n*.8}[FX.k]|0;
 FX.ps=Array.from({length:cnt},()=>({x:R()*w,y:R()*h,r:R()*2+.6,ph:R()*6.28,sp:R()*2+.5,vy:25+R()*45,vx:(R()-.5)*30,s:4+R()*5,rot:R()*6.28,vr:(R()-.5)*2}));
 FX.cols=FX.k==='rain'?Array.from({length:Math.ceil(w/16)},()=>({y:R()*h,v:60+R()*140,on:R()*100<n})):[];
 c.getContext('2d').clearRect(0,0,w,h)}
function fxStep(ts){
 FX.raf=requestAnimationFrame(fxStep);if(document.hidden||ts-FX.last<33)return;
 const dt=Math.min(.1,(ts-FX.last)/1000||.033);FX.last=ts;
 const c=$('#fx'),x=c.getContext('2d'),w=FX.w,h=FX.h,t=S.t;
 if(FX.k==='rain'){
  x.globalCompositeOperation='destination-out';x.fillStyle='rgba(0,0,0,.14)';x.fillRect(0,0,w,h);x.globalCompositeOperation='source-over';x.font='15px monospace';x.fillStyle=t.ac;
  FX.cols.forEach((o,i)=>{if(!o.on)return;o.y+=o.v*dt;if(o.y>h+40){o.y=-20;o.v=60+Math.random()*140}x.fillText(RAINCH[(Math.random()*RAINCH.length)|0],i*16,o.y)});return}
 x.clearRect(0,0,w,h);
 FX.ps.forEach(p=>{
  if(FX.k==='stars'){p.ph+=p.sp*dt;x.globalAlpha=.25+.75*Math.abs(Math.sin(p.ph));x.fillStyle=t.tx;x.fillRect(p.x,p.y,p.r,p.r)}
  else if(FX.k==='snow'){p.y+=p.vy*dt*.8;p.x+=Math.sin(p.ph+=dt)*12*dt+p.vx*dt*.3;if(p.y>h)p.y=-5;x.globalAlpha=.8;x.fillStyle=t.ac2;x.beginPath();x.arc(p.x,p.y,p.r,0,6.283);x.fill()}
  else{p.y+=p.vy*dt;p.x+=p.vx*dt+Math.sin(p.ph+=dt)*14*dt;p.rot+=p.vr*dt;if(p.y>h+10){p.y=-10;p.x=Math.random()*w}if(p.x>w+10)p.x=-10;if(p.x<-10)p.x=w+10;
   x.save();x.translate(p.x,p.y);x.rotate(p.rot);x.globalAlpha=.75;x.fillStyle=t.ac;x.beginPath();x.ellipse(0,0,p.s,p.s*.55,0,0,6.283);x.fill();x.restore()}});
 x.globalAlpha=1}
function fxApply(){
 const c=$('#fx'),k=S.l.fxon?S.t.fx:'none',red=matchMedia('(prefers-reduced-motion:reduce)').matches;
 if(k==='none'||red){cancelAnimationFrame(FX.raf);FX.raf=0;FX.k='';c.hidden=1;return}
 c.hidden=0;if(FX.k===k&&FX.n===S.t.fxn&&FX.raf)return;
 FX.k=k;FX.n=S.t.fxn;fxSeed();cancelAnimationFrame(FX.raf);FX.last=0;FX.raf=requestAnimationFrame(fxStep)}
let _rz;addEventListener('resize',()=>{clearTimeout(_rz);_rz=setTimeout(()=>{if(FX.k)fxSeed()},200)});

/* apply(): chame depois de mudar S.t, S.l ou S.bar */
let _sig='';
function apply(force){
 applyVars();const t=S.t,sig=JSON.stringify([t.wall,t.wimg,t.wfit,t.wbl,t.wdim,t.ch,t.scan,t.vig,t.fx,t.fxn,S.l.fxon]);
 if(force||sig!==_sig){_sig=sig;applyLayers();fxApply()}}
