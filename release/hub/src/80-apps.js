/* =====================================================================
   80 APPS, BARRA, MENU, NOTIFICAÇÕES, CONFIGURAÇÕES RÁPIDAS, EVENTOS
   APPS: [chave, nome, glifo, ícone-linha]
   ===================================================================== */
const APPS=[['home','Home','⌂','home'],['tasks','Tarefas','☑','list'],['monitor','Monitor','◔','chart'],['search','Pesquisa','⌕','search'],['photos','Fotos','▤','image'],['music','Música','♪','music'],['tech','Tech','◈','cpu'],['gaming','Gaming','▣','gamepad'],['tools','Tools','✦','sliders'],['projects','Projects','❖','folder'],['punk','PUNK AI','☻','bot'],['settings','Settings','⚙','gear']];
let sTab='look',xo='';
const appIcon=k=>{const a=APPS.find(x=>x[0]===k);return a?icon(S.icons[k],a[3],a[2]):''};

/* ---- Barra de tarefas ---- */
function bar(){
 const b=S.bar,L=[];
 b.pins.forEach(k=>{const a=APPS.find(x=>x[0]===k);if(a)L.push(`<button data-a="open" data-k="${k}" class="${cur===k?'on':''}" aria-label="${a[1]}" title="${a[1]}">${appIcon(k)}<span>${a[1]}</span></button>`)});
 b.links.forEach(id=>{const l=S.links.find(x=>x.id===id);if(!l)return;
  L.push(l.k==='app'?`<button data-a="open" data-k="${esc(l.a)}" title="${esc(l.n)}" aria-label="${esc(l.n)}">${lnkIcon(l)}<span>${esc(l.n)}</span></button>`:`<button data-a="olink" data-u="${esc(safe(l.u))}" title="${esc(l.n)}" aria-label="${esc(l.n)}">${lnkIcon(l)}<span>${esc(l.n)}</span></button>`)});
 const sh=b.show,ml=b.menuLabel;
 $('#bar').innerHTML=`<button data-a="pop" data-k="menu" class="p" aria-label="Menu de aplicativos" title="Aplicativos">${icon(S.icons.menu,'menu','⌘')}${ml?'<span style="display:inline">'+esc(ml)+'</span>':''}</button><div id="tasks">${L.join('')}</div>`+
  (sh.search?`<button data-a="open" data-k="search" aria-label="Pesquisar" title="Pesquisar">${icon(S.icons.searchbtn,'search','⌕')}</button>`:'')+
  `<button id="mub" class="mubc" data-a="mupt" aria-label="Tocar ou pausar música" title="Música" hidden><span class="mu-pp">${mi('play',16)}</span><span class="mu-t"></span></button>`+
  (sh.notif?`<button data-a="pop" data-k="noti" aria-label="Notificações" title="Notificações">${icon(S.icons.bell,'bell','!')}<span id="nb" class="dot" ${UNREAD?'':'hidden'}></span></button>`:'')+
  (sh.qs?`<button data-a="pop" data-k="qs" aria-label="Configurações rápidas" title="Configurações rápidas">${icon(S.icons.qs,'toggle','☰')}</button>`:'')+
  (sh.clock?`<button data-a="pop" data-k="cal" id="clk" aria-label="Calendário"></button>`:'');
 tick();muPaint()}

function openApp(k){
 const a=APPS.find(x=>x[0]===k);closePops();
 if(k==='home'||!a){cur='home';$('#win').hidden=1;bar();return}
 cur=k;const w=$('#win');w.hidden=0;
 w.innerHTML=`<div class="wt"><b>${appIcon(k)} ${a[1]}</b><button data-a="open" data-k="home" aria-label="Fechar janela">×</button></div><div class="wb" id="wbody"></div>`;
 ren();
 if(k==='punk'&&AI.status!=='ok'&&AI.status!=='check')aiPing();
 if(k==='monitor')agPoll(1);
 if(k==='photos')phLoad();
 bar()}
function ren(){
 if(cur==='home')return;const b=$('#wbody');if(!b||!R[cur])return;const s=b.scrollTop;
 b.classList.toggle('ai-wb',cur==='punk');b.innerHTML=R[cur]();b.scrollTop=s;
 if(cur==='punk')aiScroll();
 if(cur==='photos'){phGrid();if(!PH.list.length&&!PH.load)phLoad()}
 if(cur==='music')muAfter()}
const closePops=()=>{['menu','cal','noti','qs','ctx'].forEach(i=>$('#'+i).hidden=1)};
function pop(k){const e=$('#'+k),o=e.hidden;closePops();if(!o)return;e.hidden=0;
 if(k==='menu')menu();if(k==='cal')calr();if(k==='noti'){UNREAD=0;noti()}if(k==='qs'){qs();if(AI.status==='idle')aiPing()}
 const n=$('#nb');if(n&&UNREAD===0)n.hidden=1}

/* ---- Menu de aplicativos (também pesquisa tudo) ---- */
function menuBody(q){
 const m=$('#mbody');if(!m)return;
 if(q.trim()){m.innerHTML='<div id="msr" class="sr"></div>';srRun($('#mq'),$('#msr'));return}
 const l=S.l.menu==='list',f=APPS,lk=S.links.filter(x=>x.k==='app'||x.u);
 m.innerHTML=`<div class="${l?'ml':'mg'}">${f.map(a=>`<button data-a="open" data-k="${a[0]}">${appIcon(a[0])} ${a[1]}</button>`).join('')}</div>`+
  (lk.length?`<h3 style="margin-top:10px">Atalhos</h3><div class="${l?'ml':'mg'}">${lk.map(x=>x.k==='app'?`<button data-a="open" data-k="${esc(x.a)}">${lnkIcon(x)} ${esc(x.n)}</button>`:`<button data-a="olink" data-u="${esc(safe(x.u))}">${lnkIcon(x)} ${esc(x.n)}</button>`).join('')}</div>`:'')}
function menu(){$('#menu').innerHTML=`<input id="mq" data-i="mq" placeholder="Buscar apps, arquivos, tarefas..." aria-label="Buscar" style="width:100%;margin-bottom:8px"><div id="mbody"></div>`;menuBody('');setTimeout(()=>{const i=$('#mq');i&&i.focus()},0)}

function noti(){$('#noti').innerHTML=`<div class="row"><b>Notificações</b><span class="fl"><button data-a="dnd" aria-pressed="${!!S.l.dnd}" class="${S.l.dnd?'on':''}">Não perturbar</button><button data-a="nclr">Limpar</button></span></div>`+(S.inbox.map(n=>`<div class="card"><span class="m">${esc(n.t)}</span><br>${esc(n.m)}</div>`).join('')||'<div class="m">Tudo calmo por aqui.</div>')+(S.l.dnd?'<div class="m sm">Não perturbar: avisos na tela silenciados, tudo continua aqui.</div>':'')}

/* ---- Configurações rápidas (popup e widget compartilham os botões) ---- */
const QSV={bl:18};
const QS=[['anim','Animações',()=>!!S.l.anim,'layers'],['blur','Desfoque',()=>S.t.bl>0,'image'],['fx','Efeitos de fundo',()=>!!S.l.fxon,'star'],['lock','Travar widgets',()=>!!S.l.lock,'gear'],['dnd','Não perturbar',()=>!!S.l.dnd,'bell'],['float','Barra flutuante',()=>!!S.bar.float,'menu'],['h24','Relógio 24h',()=>!!S.h24,'clock'],['fs','Tela cheia',()=>!!document.fullscreenElement,'power'],['theme','Próximo tema',()=>0,'palette']];
const qsBtns=()=>`<div class="fl">${QS.map(([k,n,f,ic])=>{const on=f();return`<button data-a="q" data-k="${k}" aria-pressed="${on}" class="${on?'on':''}">${svg(ic)} ${n}</button>`}).join('')}</div>`;
function qs(){
 const st=(ok,t)=>`<div class="stat"><span class="dot" style="background:${ok==='ok'?'var(--ac)':ok==='check'?'#e0b000':'#e5484d'}"></span><span class="m sm">${t}</span></div>`;
 $('#qs').innerHTML=`<b>Configurações rápidas</b><div style="margin-top:8px">${qsBtns()}</div>
 <label class="row"><span>Tema</span><select data-i="qtheme" aria-label="Tema">${Object.keys(allT()).map(k=>`<option value="${esc(k)}" ${k===S.name?'selected':''}>${esc(k)}</option>`).join('')}</select></label>
 <div style="margin-top:6px">${st(AI.status,AI.status==='ok'?'Ollama online ('+AI.models.length+' modelos)':AI.status==='check'?'Ollama: verificando':'Ollama offline')}${st(AG.state,AG.state==='ok'?'Agente local conectado':AG.state==='auth'?'Agente: falta o token':'Agente local desligado')}</div>
 <div class="fl" style="margin-top:8px"><button data-a="open" data-k="settings">Todas as configurações</button></div>`}
const qsAll=()=>{if(!$('#qs').hidden)qs();if(!$('#noti').hidden)noti();rw('quick')};
function nextTheme(){const k=Object.keys(allT());return useTheme(k[(k.indexOf(S.name)+1)%k.length])}
async function useTheme(n){const t=allT()[n];if(!t)return;S.t=structuredClone(t);S.name=n;await IMG.load([S.t.wimg,S.t.ch&&S.t.ch.img].filter(Boolean));apply(1);save();if(cur==='settings')ren();qsAll()}
Object.assign(A,{
 open:a=>openApp(a.dataset.k),pop:a=>pop(a.dataset.k),
 olink:a=>{const u=a.dataset.u;if(/^https?:\/\//i.test(u))window.open(u,'_blank','noopener,noreferrer')},
 dnd:()=>{S.l.dnd=S.l.dnd?0:1;save();noti();qsAll()},
 q:a=>{const k=a.dataset.k;
  if(k==='anim')S.l.anim=S.l.anim?0:1;
  else if(k==='blur'){if(S.t.bl>0){QSV.bl=S.t.bl;S.t.bl=0}else S.t.bl=QSV.bl||18}
  else if(k==='fx')S.l.fxon=S.l.fxon?0:1;
  else if(k==='lock')S.l.lock=S.l.lock?0:1;
  else if(k==='dnd')S.l.dnd=S.l.dnd?0:1;
  else if(k==='float'){S.bar.float=S.bar.float?0:1}
  else if(k==='h24'){S.h24=S.h24?0:1;tick()}
  else if(k==='fs'){(document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()).catch(()=>notify('Tela cheia indisponível neste ambiente.'));return}
  else if(k==='theme')return nextTheme();
  apply();save();qsAll()},
 ctx:a=>{closePops();({set:()=>openApp('settings'),theme:()=>nextTheme(),lock:()=>{S.l.lock=S.l.lock?0:1;apply();save();toast(S.l.lock?'Widgets travados':'Widgets liberados');qsAll()},arr:()=>A.warr(),addw:()=>{sTab='widgets';openApp('settings')},fs:()=>A.q({dataset:{k:'fs'}})}[a.dataset.k]||(()=>{}))()}});
Object.assign(I,{
 mq:e=>menuBody(e.value),
 qtheme:e=>useTheme(e.value)});

/* ---- Tarefas (app) ---- */
let tkTab='list',tkF='open';
const PRI=['Normal','Média','Alta'],ACT={add:'Adicionada',done:'Concluída',undo:'Reaberta',edit:'Editada',del:'Removida',kill:'Processo encerrado'};
function tkView(){
 const d=nowKey()[0],pend=S.todos.filter(t=>!t.d),atr=pend.filter(t=>t.due&&t.due<d).length;
 const L=S.todos.filter(t=>tkF==='all'||(tkF==='open'?!t.d:t.d)).sort((a,b)=>a.d-b.d||b.p-a.p||(a.due||'9').localeCompare(b.due||'9')||a.c-b.c);
 return`<div class="fl"><input id="tn1" placeholder="Nova tarefa" aria-label="Nova tarefa" style="flex:1;min-width:10em"><select id="tp" aria-label="Prioridade">${PRI.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select><input id="td" type="date" aria-label="Prazo (opcional)"><button class="p" data-a="tnew">Adicionar</button></div>
 <div class="row"><span class="fl">${[['open','Pendentes'],['done','Concluídas'],['all','Todas']].map(([k,n])=>`<button data-a="tkf" data-k="${k}" class="${tkF===k?'on':''}">${n}</button>`).join('')}</span><span class="m sm">${pend.length} pendentes${atr?`, <b class="pri-2">${atr} atrasadas</b>`:''}, ${S.todos.length-pend.length} concluídas</span></div>`+
 (L.map(t=>`<div class="card fl"><input type="checkbox" data-i="tck" data-k="${esc(t.id)}" ${t.d?'checked':''} aria-label="Concluir"><input data-i="ttext" data-ch="1" data-k="${esc(t.id)}" value="${esc(t.t)}" aria-label="Texto da tarefa" style="flex:1;min-width:8em;${t.d?'text-decoration:line-through;opacity:.6':''}"><select data-i="tpri" data-k="${esc(t.id)}" aria-label="Prioridade">${PRI.map((n,i)=>`<option value="${i}" ${t.p===i?'selected':''}>${n}</option>`).join('')}</select><input type="date" data-i="tdue" data-k="${esc(t.id)}" value="${esc(t.due)}" aria-label="Prazo"><button data-a="tdel" data-k="${esc(t.id)}" aria-label="Remover tarefa">×</button></div>`).join('')||'<div class="m" style="margin-top:10px">Nada aqui.</div>')+
 (S.todos.some(t=>t.d)?`<div class="fl" style="margin-top:8px"><button data-a="tclr">Remover concluídas</button></div>`:'')}
function actView(){return`<div class="row"><span class="m">Registro de tarefas e ações do Hub (guardado só neste navegador).</span><button data-a="actclr">Limpar</button></div>`+(S.act.map(a=>`<div class="lrow"><span><span class="m">${new Date(a.ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span> <b>${ACT[a.k]||esc(a.k)}</b> ${esc(a.t)}</span></div>`).join('')||'<div class="m">Nenhuma atividade ainda.</div>')}
R.tasks=()=>tabsH(tkTab,[['list','Tarefas'],['act','Atividade']],'tktab')+(tkTab==='act'?actView():tkView());
R.monitor=monApp;R.search=searchApp;R.punk=()=>aiView();
Object.assign(A,{
 tktab:a=>{tkTab=a.dataset.k;ren()},tkf:a=>{tkF=a.dataset.k;ren()},
 tnew:()=>{const i=$('#tn1');if(!i||!i.value.trim())return;todoAdd(i.value,+$('#tp').value,$('#td').value);const n=$('#tn1');n&&n.focus()},
 tclr:()=>{const n=S.todos.filter(t=>t.d).length;S.todos=S.todos.filter(t=>!t.d);actLog('del',n+' concluída(s) removida(s)');todoChanged()},
 actclr:()=>{S.act=[];save();ren()}});
Object.assign(I,{
 ttext:e=>{const o=S.todos.find(x=>x.id===e.dataset.k),v=e.value.trim();if(!o)return;if(!v){e.value=o.t;return}if(v===o.t)return;o.t=v.slice(0,300);actLog('edit',o.t);save();rw('todo');rw('calendar')},
 tpri:e=>todoSet(e.dataset.k,{p:+e.value}),
 tdue:e=>todoSet(e.dataset.k,{due:DATE_RE.test(e.value)?e.value:''})});

/* ---- Limpeza: apaga do IndexedDB imagens e fontes que nada mais usa ---- */
const usedIds=()=>[...JSON.stringify(S).matchAll(/(?:"|i:)((?:im|ft)[a-z0-9]{8,})"/g)].map(m=>m[1]);
async function gcImgs(){try{const ks=await IMG.keys();if(!ks.length)return;const j=JSON.stringify(S);for(const k of ks)if(!j.includes(k))await IMG.del(k)}catch(e){}}

/* ---- Eventos globais ---- */
document.addEventListener('click',e=>{
 const a=e.target.closest('[data-a]'),inside=!!e.target.closest('.pop,#bar,#ctx');
 if(a)A[a.dataset.a]?.(a,e);
 if(!inside)closePops();
 if(rs&&!(a&&a.dataset.a==='reset')){rs=0;if(cur==='settings')ren()}
 if(AI.arm&&!(a&&a.dataset.a==='aiclr')){AI.arm=0;aiUI()}});
['input','change'].forEach(ev=>document.addEventListener(ev,e=>{
 const t=e.target.closest('[data-i]');if(!t)return;
 const live=!t.dataset.ch&&(t.type==='range'||t.type==='color'||t.tagName==='TEXTAREA'||t.type==='text'||t.type==='search'||!t.type);
 if((ev==='input')!==live)return;I[t.dataset.i]?.(t)}));
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){closePops();if(!$('#win').hidden)openApp('home')}
 if(e.key==='Enter'&&!e.isComposing){const t=e.target,id=t.id,c=t.classList;
  if(id==='pi'&&!e.shiftKey){e.preventDefault();A.send()}
  else if(c.contains('ti'))A.tadd(t);else if(id==='tn1')A.tnew();
  else if(c.contains('ln'))t.parentElement.querySelector('.lu').focus();else if(c.contains('lu'))A.ladd(t);
  else if(id==='cx')A.calc();else if(c.contains('evt'))A.evadd(t);
  else if(t.dataset.i==='aiurl')aiPing();else if(t.dataset.i==='agurl'||t.dataset.i==='agtok')A.agcon();
  else if(t.dataset.i==='ttext')t.blur()}});
document.addEventListener('contextmenu',e=>{
 if(e.target.closest('#win,.pop,input,textarea,.w,#bar'))return;e.preventDefault();closePops();
 const c=$('#ctx');c.innerHTML=[['set','Configurações'],['addw','Adicionar widget'],['arr','Organizar widgets'],['theme','Próximo tema'],['lock',S.l.lock?'Destravar widgets':'Travar widgets'],['fs','Tela cheia']].map(i=>`<button role="menuitem" data-a="ctx" data-k="${i[0]}">${i[1]}</button>`).join('');
 c.hidden=0;c.style.left=Math.min(e.clientX,innerWidth-220)+'px';c.style.top=Math.min(e.clientY,innerHeight-240)+'px'});
document.addEventListener('fullscreenchange',qsAll);
