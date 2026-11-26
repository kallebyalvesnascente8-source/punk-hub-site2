/* =====================================================================
   60 WIDGETS: catálogo, quadro, arrastar, redimensionar, estilo individual
   Cada widget é uma instância em S.widgets: {id,type,x,y,w,h,z,st,cfg}
     st  = estilo próprio (cores, opacidade, blur, borda, fonte, título, ícone)
     cfg = opções do tipo (ex.: relógio com segundos, métrica do monitor)
   ===================================================================== */
const wById=id=>S.widgets.find(w=>w.id===id);
const kv=a=>`<div class="kv">${a.filter(Boolean).map(([k,v])=>`<span>${esc(k)}</span><span>${esc(v)}</span>`).join('')}</div>`;

function todoRow(t){const od=!t.d&&t.due&&t.due<nowKey()[0];
 return`<div class="lrow"><input type="checkbox" data-i="tck" data-k="${esc(t.id)}" ${t.d?'checked':''} aria-label="Concluir"><span class="${t.d?'todo-done':''}">${t.p?`<b class="pri-${t.p}" title="Prioridade ${t.p===2?'alta':'média'}">!</b> `:''}${esc(t.t)}${t.due?` <small class="${od?'pri-2':'m'}">${dBR(t.due)}</small>`:''}</span><button data-a="tdel" data-k="${esc(t.id)}" aria-label="Remover tarefa">×</button></div>`}
function todoWBody(w){
 const L=S.todos.filter(t=>w.cfg.done||!t.d).sort((a,b)=>a.d-b.d||b.p-a.p||(a.due||'9').localeCompare(b.due||'9'));
 return`<div class="fl"><input class="ti" placeholder="Nova tarefa" aria-label="Nova tarefa" style="flex:1"><button data-a="tadd" aria-label="Adicionar tarefa">+</button></div>`+(L.map(todoRow).join('')||'<div class="m">Nada pendente. Suspeito.</div>')}

const lnkIcon=l=>icon(l.ic,l.k==='app'?(APPS.find(a=>a[0]===l.a)||[])[3]:'globe',l.k==='app'?'':'↗');
function lnkEl(l,list){
 const ic=lnkIcon(l),inner=list?`${ic} ${esc(l.n)}`:`${ic}<span>${esc(l.n)}</span>`;
 const a=l.k==='app'?`<a href="#" data-a="open" data-k="${esc(l.a)}">${inner}</a>`:`<a href="${esc(safe(l.u))}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
 return list?`<div class="lrow"><span>${a}</span><button data-a="ldel" data-k="${esc(l.id)}" aria-label="Remover atalho">×</button></div>`:`<div class="lki">${a}<button class="lx" data-a="ldel" data-k="${esc(l.id)}" aria-label="Remover atalho">×</button></div>`}
function linksBody(w){
 return(w.cfg.view==='list'?S.links.map(l=>lnkEl(l,1)).join(''):`<div class="lk">${S.links.map(l=>lnkEl(l)).join('')}</div>`)+
 `<div class="fl" style="margin-top:8px"><input class="ln" placeholder="Nome" size="6" aria-label="Nome do atalho"><input class="lu" placeholder="https://..." size="10" aria-label="Endereço do atalho"><button data-a="ladd" aria-label="Adicionar atalho">+</button></div>`}

function sysBody(){
 if(AG.state==='ok'&&AG.info){const i=AG.info,st=AG.st;
  return kv([['Host',i.hostname],['Sistema',i.os],['Kernel',i.kernel+' '+i.arch],['CPU',i.cpu],['Núcleos',i.cores_logical+(i.cores_physical?` (${i.cores_physical} físicos)`:'')],['Memória',fmtB(i.mem_total)],i.gpus.length&&['GPU',i.gpus.join(' | ')],st&&['Ligado há',fmtDur(st.uptime)],i.ips.length&&['IP',i.ips.map(x=>x.ip).join(', ')],(i.desktop||i.session)&&['Desktop',[i.desktop,i.session].filter(Boolean).join(' / ')],['Fonte','agente local ('+i.collector+')']])}
 return kv(browserInfo())+`<div class="m sm" style="margin-top:6px">Dados do navegador. CPU, RAM, disco e rede reais exigem o agente local. <button data-a="gosys">Conectar</button></div>`}

function olBody(){
 const ok=AI.status==='ok',col=ok?'var(--ac)':AI.status==='check'?'#e0b000':'#e5484d';
 return`<div class="stat"><span class="dot" style="background:${col}"></span><b>${ok?'Ollama online':AI.status==='check'?'Verificando...':'Ollama offline'}</b></div>`+
 (ok?kv([['Versão',OL.ver||'?'],['Endereço',S.ai.url],['Modelos',String(AI.models.length)],['Em uso no chat',S.ai.model||'nenhum'],['Carregados na memória',OL.run.length?OL.run.map(r=>r.name).join(', '):'nenhum']]):`<div class="m sm" style="margin:6px 0">${esc(AI.err||'Ainda não verificado.')}</div>`)+
 `<div class="fl" style="margin-top:8px"><button data-a="olref">Atualizar</button><button class="p" data-a="open" data-k="punk">Abrir PUNK AI</button></div>`}

const imgBody=w=>{const u=IMG.url(w.cfg.img);return u?`<img src="${u}" alt="" style="width:100%;height:100%;object-fit:${w.cfg.fit==='cover'?'cover':'contain'};display:block">`:`<div class="empty m">Sem imagem.<br><br><input type="file" accept="image/*" data-i="wimgf" data-w="${esc(w.id)}" aria-label="Escolher imagem"></div>`};

/* Catálogo. opts descrevem os controles do editor: [chave,rótulo,tipo,extra...] */
const W={
 clock:{n:'Relógio',bi:'clock',w:290,h:190,mw:170,mh:90,cfg:{sec:0,greet:1},opts:[['sec','Mostrar segundos','chk'],['greet','Mostrar saudação','chk']],
  body:w=>`<div class="big wc">${fmt(new Date(),w.cfg.sec)}</div><div class="m wd"></div>${w.cfg.greet?'<p class="wgr"></p>':''}`},
 calendar:{n:'Calendário',bi:'calendar',w:300,h:390,mw:250,mh:280,cfg:{},opts:[],body:()=>calHtml()},
 notes:{n:'Bloco de notas',bi:'note',w:290,h:190,mw:160,mh:100,cfg:{text:'',mono:0},opts:[['mono','Fonte monoespaçada','chk']],
  body:w=>`<textarea class="wn" data-i="wnote" data-w="${esc(w.id)}" aria-label="Notas" placeholder="Escreva aqui..." style="${w.cfg.mono?'font-family:var(--fm)':''}">${esc(w.cfg.text)}</textarea>`},
 todo:{n:'Tarefas',bi:'list',w:290,h:250,mw:200,mh:120,cfg:{done:0},opts:[['done','Mostrar concluídas','chk']],body:todoWBody},
 links:{n:'Atalhos rápidos',bi:'star',w:290,h:210,mw:180,mh:100,cfg:{view:'grid'},opts:[['view','Visual','sel',{grid:'Grade de ícones',list:'Lista'}]],body:linksBody},
 sysinfo:{n:'Informações do computador',bi:'cpu',w:300,h:290,mw:220,mh:110,cfg:{},opts:[],body:sysBody},
 monitor:{n:'Monitor do sistema',bi:'chart',w:310,h:170,mw:200,mh:100,cfg:{m:'all',cores:0},opts:[['m','Métrica','sel',{all:'Resumo',cpu:'CPU',ram:'Memória',disk:'Disco',net:'Rede'}],['cores','Mostrar núcleos (CPU)','chk']],body:w=>monBody(w.cfg.m,w.cfg)},
 procs:{n:'Processos',bi:'layers',w:310,h:200,mw:240,mh:110,cfg:{n:6,sort:'cpu'},opts:[['sort','Ordenar por','sel',{cpu:'CPU',mem:'Memória'}],['n','Quantidade','num',3,15]],body:w=>procBody(w.cfg)},
 music:{n:'Música (mini-player)',bi:'music',w:320,h:150,mw:230,mh:120,cfg:{cover:1},opts:[['cover','Mostrar capa','chk']],body:musicWBody},
 ollama:{n:'Ollama / PUNK AI',bi:'bot',w:300,h:210,mw:220,mh:120,cfg:{},opts:[],body:olBody},
 search:{n:'Pesquisa',bi:'search',w:300,h:240,mw:220,mh:100,cfg:{},opts:[],body:()=>`<input class="sqw" data-i="sqw" placeholder="Apps, arquivos, tarefas..." aria-label="Pesquisar" style="width:100%"><div class="sr srr"></div>`},
 quick:{n:'Configurações rápidas',bi:'toggle',w:290,h:170,mw:200,mh:90,cfg:{},opts:[],body:()=>qsBtns()},
 image:{n:'Imagem',bi:'image',w:240,h:260,mw:80,mh:60,cfg:{img:'',fit:'contain'},opts:[['fit','Ajuste','sel',{contain:'Conter',cover:'Preencher'}],['img','Imagem (PNG)','img']],body:imgBody}};

/* Layouts prontos (S.layouts guarda os seus) */
const PRESETS=['Padrão','Produtividade','Monitor','Minimal','Ricing'];
function presetW(name){
 const m=(t,x,y,w,h,cfg={})=>{const d=W[t];return{id:uid()+Math.random().toString(36).slice(2,4),type:t,x,y,w:w||d.w,h:h||d.h,z:0,st:{},cfg:{...d.cfg,...cfg}}};
 const P={'Padrão':()=>[m('clock',20,20),m('notes',330,20),m('todo',20,230),m('links',330,230),m('sysinfo',640,20)],
  'Produtividade':()=>[m('clock',20,20,270,150),m('calendar',20,190,270,390),m('todo',310,20,320,320),m('notes',310,360,320,210),m('search',650,20,300,260)],
  'Monitor':()=>[m('monitor',20,20,310,170,{m:'cpu'}),m('monitor',350,20,310,170,{m:'ram'}),m('monitor',20,210,310,180,{m:'disk'}),m('monitor',350,210,310,180,{m:'net'}),m('sysinfo',680,20,320,370),m('ollama',20,410,310,190),m('procs',350,410,310,210)],
  'Minimal':()=>[m('clock',20,20,300,170)],
  'Ricing':()=>[m('clock',20,20,300,180),m('monitor',20,220,300,210,{m:'all'}),m('ollama',20,450,300,190),m('image',1000,40,240,300)]};
 return(P[name]||P['Padrão'])().map((w,i)=>({...w,z:i+1}))}

/* ---- Estilo individual: variáveis CSS no próprio elemento ---- */
function wst(w){
 const s=w.st,v=[],tx=s.tx||S.t.tx,bg=s.bg||S.t.bg;
 if(s.ac)v.push(`--ac:${s.ac}`,`--act:${lum(s.ac)>.55?'#000':'#fff'}`);if(s.tx)v.push(`--tx:${s.tx}`);
 if(s.bg||s.tx||s.al!=null)v.push(`--pn:${mix(bg,tx,.07,(s.al!=null?s.al:S.t.al)/100)}`);
 if(s.bl!=null)v.push(`--bl:${s.bl}px`);if(s.r!=null)v.push(`--r:${s.r}px`);if(s.bw!=null)v.push(`--bw:${s.bw}px`);if(s.bc)v.push(`--bc:${s.bc}`);if(s.fs)v.push(`font-size:${s.fs}px`);
 return v.join(';')}
function wFrame(w,anim){
 const d=W[w.type],s=w.st;
 return`<section class="w g${anim?' in':''}" data-id="${esc(w.id)}" data-type="${w.type}" data-hd="${s.hd===0?0:1}" style="left:${w.x}px;top:${w.y}px;width:${w.w}px;height:${w.h}px;z-index:${w.z};${wst(w)}"><div class="wh"><span class="wt2">${icon(s.ic,d.bi,'')}${esc(s.tt||d.n)}</span><span class="wc2"><button data-a="wcfg" aria-label="Configurar widget" title="Configurar">⚙</button><button data-a="wdel" aria-label="Remover widget" title="Remover">×</button></span></div><div class="wbd">${d.body(w)}</div><i class="rz" aria-hidden="true"></i></section>`}
function wRestyle(w){const el=$(`#wg .w[data-id="${w.id}"]`);if(el)el.style.cssText=`left:${w.x}px;top:${w.y}px;width:${w.w}px;height:${w.h}px;z-index:${w.z};${wst(w)}`;fit()}
function widgets(anim){
 $('#wg').innerHTML=S.widgets.map(w=>wFrame(w,anim)).join('');
 [...S.widgets].sort((a,b)=>a.y-b.y||a.x-b.x).forEach((w,i)=>{const e=$(`#wg .w[data-id="${w.id}"]`);if(e)e.style.order=i});
 fit();tick()}
/* Atualiza só o conteúdo de um tipo (ou id) de widget, sem mexer no resto */
function rw(t){
 $$('#wg .w').forEach(e=>{if(e.dataset.type!==t&&e.dataset.id!==t)return;const w=wById(e.dataset.id);if(!w)return;
  const b=e.querySelector('.wbd'),ae=document.activeElement;if(ae&&b.contains(ae)&&/INPUT|TEXTAREA/.test(ae.tagName)&&ae.type!=='checkbox'&&ae.value)return;
  const sc=b.scrollTop;b.innerHTML=W[w.type].body(w);b.scrollTop=sc})}
/* Mantém os widgets dentro da área visível (sem alterar o que está salvo) */
function fit(){
 if(innerWidth<=700)return;const g=$('#wg'),gw=g.clientWidth,gh=g.clientHeight;
 $$('#wg .w').forEach(e=>{const w=wById(e.dataset.id);if(!w)return;const ww=Math.min(w.w,gw);e.style.width=ww+'px';e.style.left=clamp(w.x,0,Math.max(0,gw-ww))+'px';e.style.top=clamp(w.y,0,Math.max(0,gh-40))+'px'})}
addEventListener('resize',fit);
function freeSpot(w,h){
 const g=$('#wg'),gw=g.clientWidth||innerWidth,gh=g.clientHeight||innerHeight;
 for(let y=10;y+h<=gh;y+=10)for(let x=10;x+w<=gw;x+=10)if(!S.widgets.some(o=>x<o.x+o.w+8&&x+w+8>o.x&&y<o.y+o.h+8&&y+h+8>o.y))return[x,y];
 const n=S.widgets.length*24%240;return[20+n,20+n]}
const topZ=()=>Math.max(0,...S.widgets.map(w=>w.z));
function bringFront(w,el){if(w.z===topZ()&&S.widgets.filter(x=>x.z===w.z).length===1)return;w.z=topZ()+1;if(el)el.style.zIndex=w.z}

/* ---- Arrastar e redimensionar (ponteiro: mouse, toque e caneta) ---- */
$('#desk').addEventListener('pointerdown',e=>{
 const rz=e.target.closest('.rz'),h=e.target.closest('.wh');
 if((!rz&&!h)||S.l.lock||e.target.closest('.wc2')||e.button||innerWidth<=700)return;
 const el=(rz||h).closest('.w'),w=wById(el.dataset.id);if(!w)return;
 e.preventDefault();bringFront(w,el);
 const g=$('#wg'),gr=S.l.snap?Math.max(4,S.l.gap):1,sn=v=>Math.round(v/gr)*gr,d=W[w.type],sx=e.clientX,sy=e.clientY,ox=w.x,oy=w.y,ow=w.w,oh=w.h,t=rz||h;
 t.setPointerCapture(e.pointerId);
 t.onpointermove=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy;
  if(rz){w.w=Math.max(d.mw,Math.min(sn(ow+dx),g.clientWidth-w.x));w.h=Math.max(d.mh,Math.min(sn(oh+dy),Math.max(d.mh,g.clientHeight-w.y)));el.style.width=w.w+'px';el.style.height=w.h+'px'}
  else{w.x=clamp(sn(ox+dx),0,Math.max(0,g.clientWidth-w.w));w.y=clamp(sn(oy+dy),0,Math.max(0,g.clientHeight-40));el.style.left=w.x+'px';el.style.top=w.y+'px'}};
 t.onpointerup=t.onpointercancel=()=>{t.onpointermove=t.onpointerup=t.onpointercancel=null;save();if(cur==='settings'&&sTab==='widgets')ren()}});

/* ---- Ações de widget ---- */
let selW='';
Object.assign(A,{
 wadd:a=>{const t=a.dataset.k,d=W[t];if(!d||S.widgets.length>=60)return;const[x,y]=freeSpot(d.w,d.h),w=cw({type:t,x,y,w:d.w,h:d.h,z:topZ()+1,cfg:{...d.cfg}});S.widgets.push(w);selW=w.id;save();widgets(1);toast(d.n+' adicionado');ren()},
 wdel:a=>{const id=a.dataset.k||a.closest('.w')?.dataset.id,w=wById(id);if(!w)return;S.widgets=S.widgets.filter(x=>x!==w);if(selW===id)selW='';save();widgets();ren();gcImgs()},
 wdup:a=>{const w=wById(a.dataset.k);if(!w)return;const c=structuredClone(w);c.id=uid();c.x+=24;c.y+=24;c.z=topZ()+1;S.widgets.push(c);selW=c.id;save();widgets();ren()},
 wcfg:a=>{selW=a.closest('.w').dataset.id;sTab='widgets';openApp('settings')},
 wsel:a=>{selW=a.dataset.k;ren()},
 wz:a=>{const w=wById(a.dataset.k);if(!w)return;if(a.dataset.v==='front')w.z=topZ()+1;else{S.widgets.forEach(x=>x.z++);w.z=0}save();widgets();ren()},
 wst0:a=>{const w=wById(a.dataset.k);if(!w)return;w.st={};save();widgets();ren()},
 wclr:a=>{const w=wById(selW);if(!w)return;delete w.st[a.dataset.k];save();widgets();ren()},
 wgeo0:a=>{const w=wById(a.dataset.k),d=W[w.type];w.w=d.w;w.h=d.h;save();widgets();ren()},
 warr:()=>{const g=$('#wg'),gw=g.clientWidth||innerWidth,gap=Math.max(8,S.l.gap);let x=gap,y=gap,rh=0;
  [...S.widgets].sort((a,b)=>a.y-b.y||a.x-b.x).forEach(w=>{if(x+w.w>gw&&x>gap){x=gap;y+=rh+gap;rh=0}w.x=x;w.y=y;x+=w.w+gap;rh=Math.max(rh,w.h)});save();widgets();toast('Widgets organizados')},
 tadd:a=>{const c=a.closest('.w,#wbody'),i=c.querySelector('.ti');if(!i||!i.value.trim())return;todoAdd(i.value);const n=(c.matches('.w')?c:$('#wbody')).querySelector('.ti');if(n)n.focus()},
 tdel:a=>todoDel(a.dataset.k),
 ladd:a=>{const c=a.closest('.w'),n=c.querySelector('.ln').value.trim(),u=c.querySelector('.lu').value.trim();if(!n||!/^https?:\/\//i.test(u))return notify('Informe um nome e uma URL começando com http:// ou https://');S.links.push(cleanLink({n,u,k:'url'}));save();rw('links')},
 ldel:a=>{S.links=S.links.filter(l=>l.id!==a.dataset.k);S.bar.links=S.bar.links.filter(i=>i!==a.dataset.k);save();rw('links');bar();if(cur==='settings')ren()}});
Object.assign(I,{
 wnote:e=>{const w=wById(e.dataset.w);if(w){w.cfg.text=e.value;save()}},
 tck:e=>todoSet(e.dataset.k,{d:e.checked?1:0}),
 wimgf:e=>{const f=e.files[0],w=wById(e.dataset.w);f&&w&&imgFromFile(f).then(id=>{if(!id)return;w.cfg.img=id;save();rw(w.id);ren();gcImgs()})}});
