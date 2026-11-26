/* =====================================================================
   70 AGENTE LOCAL E MONITORAMENTO
   O navegador não enxerga CPU, RAM, disco, rede nem processos. Para isso o
   Hub conversa com o punk-agent.py (127.0.0.1, token). Sem agente, nada é
   inventado: os widgets mostram só o que o navegador expõe e dizem isso.
   ===================================================================== */
const AG={state:'off',msg:'',info:null,st:null,procs:[],ping:null,busy:0,last:0,tm:0,sort:'cpu'};
const agBase=()=>S.agent.url.replace(/\/+$/,'');
async function agGet(p,ms=4000,opt){
 const r=await fetch(agBase()+p,{signal:AbortSignal.timeout(ms),headers:{Authorization:'Bearer '+S.agent.token,...(opt&&opt.body?{'Content-Type':'application/json'}:{})},...(opt||{})});
 let j={};try{j=await r.json()}catch(e){}
 if(!r.ok){const e=new Error(j.error||'HTTP '+r.status);e.status=r.status;throw e}return j}
function agErr(e){const m=String(e&&e.message||e);
 if(e&&e.name==='TimeoutError')return'O agente não respondeu a tempo.';
 if(e&&e.status===401)return'Token recusado pelo agente.';
 if(e instanceof TypeError)return'Não consegui falar com o agente. Ele está rodando? Se o Hub foi aberto por https ou de outro endereço, o navegador pode bloquear; veja a aba Sistema.';
 return m}
/* Conecta: ping aberto -> info -> primeira amostra */
async function agConnect(quiet){
 if(!/^https?:\/\/\S+$/i.test(S.agent.url||'')){AG.state='off';AG.msg='Endereço do agente inválido.';return agPaint()}
 AG.state='check';agPaint();
 try{
  const p=await agGet('/api/ping',3000);AG.ping=p;
  if(!S.agent.token||p.auth==='required'){AG.state='auth';AG.msg=S.agent.token?'Token recusado pelo agente.':'O agente está no ar. Cole o token que ele mostrou ao iniciar.';return agPaint()}
  AG.info=await agGet('/api/info');AG.state='ok';AG.msg='';await agPoll(1);
  if(!quiet)notify('Agente local conectado: '+AG.info.hostname)
 }catch(e){AG.state=e.status===401?'auth':'off';AG.msg=agErr(e);AG.st=null;AG.procs=[]}
 agPaint();agSched()}
/* Coleta periódica, só quando algo na tela usa os dados */
function agWanted(){
 if(AG.state!=='ok'||document.hidden)return 0;
 if(cur==='monitor')return 2;
 return S.widgets.some(w=>w.type==='monitor'||w.type==='procs'||(w.type==='sysinfo'))?1:0}
async function agPoll(force){
 if(AG.busy||AG.state!=='ok')return;if(!force&&!agWanted())return;AG.busy=1;
 try{
  AG.st=await agGet('/api/stats?hist=120');
  const big=cur==='monitor'||AG.sort,need=S.widgets.some(w=>w.type==='procs')||cur==='monitor';
  if(need){const n=cur==='monitor'?40:Math.max(6,...S.widgets.filter(w=>w.type==='procs').map(w=>w.cfg.n));AG.procs=(await agGet(`/api/procs?sort=${AG.sort}&n=${n}`)).procs||[]}
  AG.last=Date.now();
 }catch(e){if(e.status===401){AG.state='auth';AG.msg='Token recusado pelo agente.'}else if(e.status!==503){AG.state='off';AG.msg=agErr(e);AG.st=null}}
 AG.busy=0;agPaint()}
function agSched(){clearInterval(AG.tm);AG.tm=setInterval(()=>{if(AG.state==='ok')agPoll();else if(S.agent.token&&AG.state==='off'&&!document.hidden&&agNeedRetry())agConnect(1)},2000)}
/* Reconecta sozinho no máximo a cada 15 s, e só se algum widget/app depende do agente */
let _retry=0;function agNeedRetry(){if(Date.now()-_retry<15000)return 0;_retry=Date.now();return S.widgets.some(w=>['monitor','procs','sysinfo','search'].includes(w.type))||cur==='monitor'}
function agPaint(){rw('monitor');rw('procs');rw('sysinfo');if(cur==='monitor')monRen();if(cur==='settings'&&sTab==='sys')ren()}

/* ---- Formatação ---- */
const pct=v=>(+v||0).toFixed(v<10?1:0)+'%',rate=v=>fmtB(v||0)+'/s';
const lvl=v=>v>=90?'cr':v>=75?'hi':'';
function spark(a,max,cls=''){
 a=(a||[]).slice(-120);if(a.length<2)return'<svg class="spk" viewBox="0 0 100 40"></svg>';
 const m=max||Math.max(1,...a),pts=a.map((v,i)=>`${(i/(a.length-1)*100).toFixed(1)},${(40-Math.min(1,v/m)*38-1).toFixed(1)}`).join(' ');
 return`<svg class="spk" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0,40 L${pts.replace(/ /g,' L')} L100,40Z"/><polyline class="${cls}" points="${pts}"/></svg>`}
const meter=(v,t)=>`<div class="mt"><span>${t}</span><b>${pct(v)}</b></div><div class="bar ${lvl(v)}"><i style="width:${Math.min(100,Math.max(0,v))}%"></i></div>`;
function browserInfo(){
 const n=navigator,sc=screen,c=n.connection;
 return[['Núcleos lógicos',String(n.hardwareConcurrency||'?')],['Memória (aprox.)',n.deviceMemory?n.deviceMemory+' GB':'não informada'],['Tela',`${sc.width}x${sc.height} @${devicePixelRatio}x`],['Plataforma',(n.userAgentData&&n.userAgentData.platform)||n.platform||'?'],['Idioma',n.language],['Fuso',Intl.DateTimeFormat().resolvedOptions().timeZone],c&&c.effectiveType&&['Rede (estimada)',c.effectiveType+(c.downlink?', '+c.downlink+' Mb/s':'')],['Fonte','navegador']]}
const noAgent=()=>`<div class="empty m">${AG.state==='check'?'Conectando ao agente...':AG.state==='auth'?esc(AG.msg):'Agente local desligado.<br>CPU, RAM, disco e rede reais exigem o punk-agent.py.'}<br><br><button data-a="gosys">${AG.state==='auth'?'Informar token':'Conectar'}</button></div>`;

/* ---- Conteúdo dos widgets de monitor ---- */
function monBody(m,cfg={}){
 const s=AG.st;if(AG.state!=='ok')return noAgent();if(!s)return'<div class="empty m">Coletando a primeira amostra...</div>';
 const h=s.hist||{},cpu=s.cpu,mem=s.mem,rd=s.disks||[],cores=cfg.cores&&cpu.cores?`<div class="m sm" style="margin-top:4px">${cpu.cores.map((c,i)=>`#${i} ${Math.round(c)}%`).join('  ')}</div>`:'';
 const CPU=()=>meter(cpu.pct,'CPU')+spark(h.cpu,100)+(cpu.load&&cpu.load[0]!=null?`<div class="m sm">Carga ${cpu.load.map(x=>x.toFixed(2)).join(' ')}${cpu.mhz?' | '+Math.round(cpu.mhz)+' MHz':''}</div>`:'')+cores;
 const RAM=()=>meter(mem.pct,'Memória')+spark(h.mem,100)+`<div class="m sm">${fmtB(mem.used)} de ${fmtB(mem.total)}${mem.swap_total?` | swap ${fmtB(mem.swap_used)}/${fmtB(mem.swap_total)}`:''}</div>`;
 const DSK=()=>rd.map(d=>meter(d.pct,esc(d.mount))+`<div class="m sm">${fmtB(d.used)} de ${fmtB(d.total)} (${esc(d.fs)})</div>`).join('')+(s.io?`<div class="m sm" style="margin-top:4px">Leitura ${rate(s.io.read)} | gravação ${rate(s.io.write)}</div>`:'');
 const NET=()=>`<div class="mt"><span>Rede</span><b>${rate(s.net.rx)} <small class="m">baixando</small></b></div>`+spark(h.rx,0)+`<div class="mt"><span></span><b>${rate(s.net.tx)} <small class="m">enviando</small></b></div>`+spark(h.tx,0,'b2')+`<div class="m sm">Total desde o boot: ${fmtB(s.net.rx_total)} recebidos, ${fmtB(s.net.tx_total)} enviados</div>`;
 if(m==='cpu')return CPU();if(m==='ram')return RAM();if(m==='disk')return DSK();if(m==='net')return NET();
 return meter(cpu.pct,'CPU')+meter(mem.pct,'Memória')+(rd[0]?meter(rd[0].pct,'Disco '+esc(rd[0].mount)):'')+`<div class="mt"><span>Rede</span><b>${fmtB(s.net.rx)}/s ↓ ${fmtB(s.net.tx)}/s ↑</b></div>`+(s.battery?`<div class="m sm">Bateria ${Math.round(s.battery.pct)}%${s.battery.plugged?' (carregando)':''}</div>`:'')}
const procRows=(L,full)=>L.map(p=>`<tr><td class="n">${p.pid}</td><td title="${esc(p.name)}">${esc(p.name.slice(0,full?40:22))}</td>${full?`<td>${esc(p.user||'')}</td>`:''}<td class="n">${p.cpu.toFixed(1)}</td><td class="n">${fmtB(p.rss)}</td>${full?`<td class="n">${p.threads||''}</td><td><button data-a="pkill" data-k="${p.pid}" data-n="${esc(p.name)}" ${AG.ping&&AG.ping.allow_kill?'':'disabled title="Inicie o agente com --allow-kill para encerrar processos"'} aria-label="Encerrar ${esc(p.name)}">Encerrar</button></td>`:''}</tr>`).join('');
function procBody(cfg){
 if(AG.state!=='ok')return noAgent();
 const L=AG.procs.slice().sort((a,b)=>cfg.sort==='mem'?b.rss-a.rss:b.cpu-a.cpu).slice(0,cfg.n||6);
 return L.length?`<table class="tb"><tr><th class="n">PID</th><th>Nome</th><th class="n">CPU%</th><th class="n">Mem</th></tr>${procRows(L)}</table>`:'<div class="empty m">Coletando...</div>'}

/* ---- App Monitor: resumo, processos, sistema ---- */
let mTab='res';
function monRen(){const b=$('#mon');if(!b)return;const keep=$('#mon input:focus');if(keep)return;b.innerHTML=monView()}
function monView(){
 if(AG.state!=='ok')return noAgent()+`<div class="card"><h3>O que o navegador consegue ver</h3>${kv(browserInfo())}</div>`;
 const s=AG.st;if(!s)return'<div class="empty m">Coletando a primeira amostra...</div>';
 if(mTab==='proc'){const L=AG.procs;return`<div class="fl"><span class="m">Ordenar por</span><button data-a="psort" data-k="cpu" class="${AG.sort==='cpu'?'on':''}">CPU</button><button data-a="psort" data-k="mem" class="${AG.sort==='mem'?'on':''}">Memória</button><span class="m sm">${AG.ping&&AG.ping.allow_kill?'Encerrar liberado pelo agente.':'Encerrar desligado (agente sem --allow-kill).'}</span></div><table class="tb" style="margin-top:8px"><tr><th class="n">PID</th><th>Nome</th><th>Usuário</th><th class="n">CPU%</th><th class="n">Mem</th><th class="n">Threads</th><th></th></tr>${procRows(L,1)}</table>`}
 if(mTab==='sys')return`<div class="card">${sysBody()}</div>`+(s.temps&&s.temps.length?`<div class="card"><h3>Temperaturas</h3>${kv(s.temps.map(t=>[t.label||t.name||'sensor',Math.round(t.c??t.current)+' °C']))}</div>`:'')+(s.net.ifaces&&s.net.ifaces.length?`<div class="card"><h3>Interfaces de rede</h3>${kv(s.net.ifaces.map(i=>[i.name,`↓ ${rate(i.rx)} ↑ ${rate(i.tx)}`]))}</div>`:'');
 return`<div class="grid"><div class="card">${monBody('cpu',{cores:1})}</div><div class="card">${monBody('ram')}</div><div class="card">${monBody('disk')}</div><div class="card">${monBody('net')}</div></div>`}
const tabsH=(cur_,L,a)=>`<div class="tabs">${L.map(([k,n])=>`<button data-a="${a}" data-k="${k}" class="${cur_===k?'on':''}">${n}</button>`).join('')}</div>`;
const monApp=()=>tabsH(mTab,[['res','Resumo'],['proc','Processos'],['sys','Sistema']],'mtab')+`<div id="mon">${monView()}</div>`;

/* ---- Pesquisa: apps do Hub, apps do sistema, arquivos, tarefas, atalhos, lembretes ---- */
const FS={items:[],name:'',busy:0,h:null};
async function fsWalk(dir,pre,depth){
 if(depth>6||FS.items.length>=20000)return;
 for await(const[n,h]of dir.entries()){
  if(n[0]==='.'||n==='node_modules')continue;
  FS.items.push({name:n,path:pre+n,dir:h.kind==='directory',h});
  if(h.kind==='directory')await fsWalk(h,pre+n+'/',depth+1)}}
async function fsPick(){
 if(!window.showDirectoryPicker)return notify('Este navegador não permite escolher pastas. Use o agente local para pesquisar arquivos.');
 try{const d=await showDirectoryPicker({mode:'read'});FS.busy=1;FS.items=[];FS.h=d;FS.name=d.name;toast('Indexando '+d.name+'...');await fsWalk(d,d.name+'/',0);FS.busy=0;notify(`Pasta ${d.name}: ${FS.items.length} itens indexados (só nesta sessão).`)}
 catch(e){FS.busy=0;if(e.name!=='AbortError')notify('Não foi possível ler a pasta: '+(e.message||e))}}
let _sq=0;
function srLocal(q){
 const l=q.toLowerCase(),has=s=>String(s).toLowerCase().includes(l),r={apps:[],tasks:[],links:[],ev:[],files:[]};
 r.apps=APPS.filter(a=>has(a[1])||has(a[0])).map(a=>({t:'hub',k:a[0],n:a[1],i:icon(S.icons[a[0]],a[3],a[2])}));
 r.tasks=S.todos.filter(t=>has(t.t)).slice(0,6).map(t=>({t:'task',k:t.id,n:t.t,s:t.d?'concluída':t.due?dBR(t.due):''}));
 r.links=S.links.filter(x=>has(x.n)||has(x.u)).slice(0,6).map(x=>({t:'link',k:x.id,n:x.n,s:x.u||''}));
 r.ev=S.ev.filter(e=>has(e.t)).slice(0,5).map(e=>({t:'ev',k:e.d,n:e.t,s:dBR(e.d)+(e.h?' '+e.h:'')}));
 r.files=FS.items.filter(f=>has(f.name)).slice(0,25).map(f=>({t:'fsh',k:String(FS.items.indexOf(f)),n:f.name,s:f.path,dir:f.dir}));return r}
async function srRemote(q,r){
 if(AG.state!=='ok')return;const[a,f]=await Promise.allSettled([agGet('/api/apps?n=15&q='+encodeURIComponent(q)),agGet('/api/files?n=25&q='+encodeURIComponent(q))]);
 if(a.status==='fulfilled')r.sys=a.value.apps.map(x=>({t:'sys',k:x.id,n:x.name,s:x.comment||''}));
 if(f.status==='fulfilled')r.files=[...r.files,...f.value.files.map(x=>({t:'file',k:x.path,n:x.name,s:x.path,dir:x.dir}))].slice(0,40)}
const srSec=(h,L)=>L&&L.length?`<h3>${h}</h3>`+L.map(x=>`<button class="it" data-a="sropen" data-t="${x.t}" data-k="${esc(x.k)}"><span>${x.i||''} ${esc(x.n)}</span><small>${esc(x.s||'')}</small></button>`).join(''):'';
function srHtml(q,r){
 if(!q)return`<div class="m sm">Digite para procurar em apps, ${AG.state==='ok'?'aplicativos instalados, arquivos das pastas do agente':FS.items.length?'arquivos de '+esc(FS.name):'tarefas, atalhos e lembretes'}.</div>${srSrc()}`;
 const h=srSec('Aplicativos do Hub',r.apps)+srSec('Aplicativos instalados',r.sys)+srSec('Arquivos',r.files.map(f=>({...f,n:(f.dir?'[pasta] ':'')+f.n})))+srSec('Tarefas',r.tasks)+srSec('Atalhos',r.links)+srSec('Lembretes',r.ev);
 return(h||'<div class="m">Nada encontrado.</div>')+srSrc()}
const srSrc=()=>`<div class="m sm" style="margin-top:8px">${AG.state==='ok'?`Arquivos: pastas do agente${AG.ping&&AG.ping.roots?' ('+AG.ping.roots.map(esc).join(', ')+')':''}.`:'Sem agente: arquivos só da pasta que você escolher.'} ${window.showDirectoryPicker?`<button data-a="fspick">${FS.items.length?'Trocar pasta ('+esc(FS.name)+')':'Escolher pasta'}</button>`:''}</div>`;
let _srt;
function srRun(inp,out){
 const q=inp.value.trim(),id=++_sq;out.innerHTML=srHtml(q,srLocal(q));clearTimeout(_srt);if(!q||q.length<2||AG.state!=='ok')return;
 _srt=setTimeout(async()=>{const r=srLocal(q);try{await srRemote(q,r)}catch(e){}if(id===_sq&&document.body.contains(out))out.innerHTML=srHtml(q,r)},180)}
Object.assign(I,{
 sqw:e=>srRun(e,e.closest('.w').querySelector('.srr')),
 sqa:e=>srRun(e,$('#sra'))});
Object.assign(A,{
 mtab:a=>{mTab=a.dataset.k;if(mTab==='proc')agPoll(1);monRen();$$('[data-a=mtab]').forEach(b=>b.classList.toggle('on',b.dataset.k===mTab))},
 psort:a=>{AG.sort=a.dataset.k;agPoll(1)},
 pkill:async a=>{const pid=+a.dataset.k;if(a.dataset.arm!==String(pid)){$$('[data-a=pkill]').forEach(b=>{delete b.dataset.arm;b.textContent='Encerrar'});a.dataset.arm=pid;a.textContent='Confirmar?';return}
  try{await agGet('/api/kill',4000,{method:'POST',body:JSON.stringify({pid})});actLog('kill',a.dataset.n+' (PID '+pid+')');notify('Processo encerrado: '+a.dataset.n);agPoll(1)}catch(e){notify('Não foi possível encerrar: '+agErr(e))}},
 gosys:()=>{sTab='sys';openApp('settings')},
 agcon:()=>agConnect(),
 fspick:()=>fsPick().then(()=>{const i=$('#sri')||$('.sqw');if(i)i.dispatchEvent(new Event('input',{bubbles:true}))}),
 sropen:async a=>{const t=a.dataset.t,k=a.dataset.k;
  try{
   if(t==='hub')return openApp(k);
   if(t==='sys'){const r=await agGet('/api/launch',5000,{method:'POST',body:JSON.stringify({id:k})});return notify('Abrindo '+r.name)}
   if(t==='file'){const f=AG.lastFiles&&AG.lastFiles[k];await agGet('/api/open',5000,{method:'POST',body:JSON.stringify({path:k})});return toast('Abrindo arquivo...')}
   if(t==='fsh'){const it=FS.items[+k];if(!it||it.dir)return;const f=await it.h.getFile();window.open(URL.createObjectURL(f),'_blank','noopener');return}
   if(t==='task')return openApp('tasks');
   if(t==='link'){const l=S.links.find(x=>x.id===k);return l&&l.u&&window.open(l.u,'_blank','noopener')}
   if(t==='ev'){calSel=k;calD=new Date(k+'T12:00');pop('cal')}
  }catch(e){notify('Não foi possível abrir: '+agErr(e))}}});
const searchApp=()=>`<input id="sri" data-i="sqa" placeholder="Apps, arquivos, tarefas, atalhos..." aria-label="Pesquisar" style="width:100%" autofocus><div id="sra" class="sr">${srHtml('',{})}</div>`;

/* ---- Ollama (detector) usa o módulo PUNK AI; aqui só o extra: versão e modelos carregados ---- */
const OL={ver:'',run:[]};
async function olRefresh(){
 await aiPing();OL.ver='';OL.run=[];
 if(AI.status==='ok'){const b=aiBase();
  const[v,p]=await Promise.allSettled([fetch(b+'/api/version',{signal:AbortSignal.timeout(4000)}).then(r=>r.json()),fetch(b+'/api/ps',{signal:AbortSignal.timeout(4000)}).then(r=>r.json())]);
  if(v.status==='fulfilled')OL.ver=String(v.value.version||'');if(p.status==='fulfilled')OL.run=(p.value.models||[]).map(m=>({name:String(m.name||m.model||'')}));}
 rw('ollama');if(cur==='settings'&&sTab==='sys')ren()}
A.olref=()=>olRefresh();
