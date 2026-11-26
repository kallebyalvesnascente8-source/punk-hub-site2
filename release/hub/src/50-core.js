/* =====================================================================
   50 NÚCLEO: avisos, notificações, relógio, calendário, tarefas
   ===================================================================== */
let cur='home',calD=new Date(),calSel='',rs=0,UNREAD=0;
function copyText(t){const f=()=>{const e=document.createElement('textarea');e.value=t;e.style.cssText='position:fixed;opacity:0';document.body.appendChild(e);e.select();let ok=0;try{ok=document.execCommand('copy')}catch(x){}e.remove();return ok};return(navigator.clipboard?navigator.clipboard.writeText(t).then(()=>1,f):Promise.resolve(f())).then(ok=>toast(ok?'Copiado':'Não foi possível copiar'))}
let tt;function toast(m){const e=$('#toast');e.textContent=m;e.hidden=0;clearTimeout(tt);tt=setTimeout(()=>e.hidden=1,2600)}
/* notify: registra no painel de notificações; "Não perturbar" só silencia o aviso na tela */
function notify(m){if(!S){console.warn(m);return}S.inbox.unshift({m,t:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});S.inbox=S.inbox.slice(0,30);if(!S.l.dnd)toast(m);UNREAD=1;const n=$('#nb');if(n)n.hidden=0;saveNow()}
function download(name,text,type='application/json'){if(MOB){mobSave(new Blob([text],{type}),name).then(ok=>{if(!ok)notify('Não foi possível compartilhar o arquivo.')}).catch(()=>notify('Não foi possível compartilhar o arquivo.'));return}const a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type}));a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}

const fmt=(d,sec)=>d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',...(sec?{second:'2-digit'}:{}),hour12:!S.h24});
function greet(){const h=new Date().getHours(),g=h<5?['Ainda acordado','Dormir é um recurso renovável.']:h<12?['Bom dia','Café primeiro, kernel depois.']:h<18?['Boa tarde','Hora de customizar só mais um pouquinho.']:['Boa noite','O tema escuro já está de plantão.'];return`${g[0]}${S.name_?', '+esc(S.name_):''}.<div class="m">${g[1]}</div>`}
const dk=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,nowKey=()=>{const n=new Date();return[dk(n.getFullYear(),n.getMonth(),n.getDate()),String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')]};
const dBR=d=>d.split('-').reverse().join('/');

/* ---- Lembretes do calendário e tarefas com prazo viram notificações ---- */
function chkEv(){const[d,h]=nowKey();let ch=0;S.ev.forEach(e=>{if(e.f||!e.h)return;if(e.d<d||(e.d===d&&e.h<=h)){e.f=1;ch=1;notify((e.d<d?'Lembrete atrasado ('+dBR(e.d)+'): ':'Lembrete: ')+e.t+(e.d===d?' ('+e.h+')':''))}});if(ch)save()}
function chkDue(){const d=nowKey()[0];if(S.lastDue===d)return;S.lastDue=d;const p=S.todos.filter(t=>!t.d&&t.due),hoje=p.filter(t=>t.due===d).length,atr=p.filter(t=>t.due<d).length;if(hoje||atr)notify(`Tarefas: ${hoje} para hoje e ${atr} atrasada(s).`);save()}

/* ---- Tarefas (compartilhadas pelo app Tarefas, widget Tarefas e calendário) ---- */
const actLog=(k,t)=>{S.act.unshift({ts:Date.now(),k,t:String(t).slice(0,300)});S.act=S.act.slice(0,200)};
function todoChanged(){save();rw('todo');rw('calendar');if(cur==='tasks')ren();if(!$('#cal').hidden)calr()}
function todoAdd(t,p=0,due=''){t=String(t||'').trim();if(!t)return null;const o={id:uid()+Math.random().toString(36).slice(2,5),t:t.slice(0,300),d:0,p:p|0,due:DATE_RE.test(due)?due:'',c:Date.now(),dn:0};S.todos.push(o);actLog('add',t);todoChanged();return o}
function todoSet(id,f){const o=S.todos.find(x=>x.id===id);if(!o)return;if('d' in f){f.d=f.d?1:0;if(f.d!==o.d){f.dn=f.d?Date.now():0;actLog(f.d?'done':'undo',o.t)}}if('t' in f){f.t=String(f.t).trim().slice(0,300);if(!f.t)return;if(f.t!==o.t)actLog('edit',f.t)}Object.assign(o,f);todoChanged()}
function todoDel(id){const o=S.todos.find(x=>x.id===id);if(!o)return;S.todos=S.todos.filter(x=>x!==o);actLog('del',o.t);todoChanged()}

/* ---- Calendário (popup da barra e widget usam o mesmo HTML) ---- */
function calHtml(){
 const y=calD.getFullYear(),m=calD.getMonth(),f=new Date(y,m,1).getDay(),n=new Date(y,m+1,0).getDate(),t=nowKey()[0],sel=calSel||t;
 const has=new Set([...S.ev.map(e=>e.d),...S.todos.filter(x=>!x.d&&x.due).map(x=>x.due)]);let c='';for(let i=0;i<f;i++)c+='<b></b>';
 for(let d=1;d<=n;d++){const k=dk(y,m,d);c+=`<button data-a="cday" data-k="${k}" class="${k===t?'td ':''}${k===sel?'sl ':''}${has.has(k)?'ev':''}">${d}</button>`}
 const L=S.ev.filter(e=>e.d===sel).sort((a,b)=>a.h.localeCompare(b.h)),T=S.todos.filter(x=>!x.d&&x.due===sel);
 return`<div class="calbox"><div class="row"><button data-a="cm" data-k="-1" aria-label="Mês anterior">‹</button><b>${cap(calD.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}))}</b><button data-a="cm" data-k="1" aria-label="Próximo mês">›</button></div><div class="cal m">${['D','S','T','Q','Q','S','S'].map(d=>`<b>${d}</b>`).join('')}</div><div class="cal">${c}</div><div class="row"><b>${dBR(sel)}</b><button data-a="ctoday">Hoje</button></div>`+
 T.map(x=>`<div class="lrow"><span><span class="m">Tarefa</span> ${esc(x.t)}</span></div>`).join('')+
 L.map(e=>`<div class="lrow"><span>${e.h?`<span class="m">${e.h}</span> `:''}${esc(e.t)}${e.f&&e.h?' <span class="m">(avisado)</span>':''}</span><button data-a="evdel" data-k="${esc(e.id)}" aria-label="Remover lembrete">×</button></div>`).join('')+
 (!L.length&&!T.length?'<div class="m">Nada neste dia.</div>':'')+
 `<div class="fl" style="margin-top:6px"><input class="evt" placeholder="Novo lembrete" aria-label="Novo lembrete" style="flex:1;min-width:6em"><input class="evh" type="time" aria-label="Horário (opcional)"><button data-a="evadd" aria-label="Adicionar lembrete">+</button></div><div class="m sm" style="margin-top:4px">Com horário, o lembrete vira uma notificação.</div></div>`}
const calr=()=>{$('#cal').innerHTML=calHtml()};
const calAll=()=>{if(!$('#cal').hidden)calr();rw('calendar')};
Object.assign(A,{
 cm:a=>{calD=new Date(calD.getFullYear(),calD.getMonth()+ +a.dataset.k,1);calAll()},
 ctoday:()=>{calD=new Date();calSel='';calAll()},
 cday:a=>{calSel=a.dataset.k;calAll()},
 evadd:a=>{const c=a.closest('.calbox'),t=c.querySelector('.evt').value.trim(),h=c.querySelector('.evh').value;if(!t)return;const[d0,h0]=nowKey(),d=calSel||d0;
  S.ev.push({id:uid(),d,h,t:t.slice(0,120),f:(!h||d<d0||(d===d0&&h<=h0))?1:0});save();calAll();$$('.calbox .evt').forEach(e=>{if(e.offsetParent)e.focus()})},
 evdel:a=>{S.ev=S.ev.filter(e=>e.id!==a.dataset.k);save();calAll()},
 nclr:()=>{S.inbox=[];save();noti()}});

/* ---- Relógio: roda a cada segundo, mexe só nos textos que mudam ---- */
function clkText(n){const b=S.bar;return(b.date?n.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})+' ':'')+fmt(n,b.sec)}
function tick(){
 const n=new Date(),c=$('#clk');if(c&&c.textContent!==clkText(n))c.textContent=clkText(n);
 $$('.w[data-type=clock]').forEach(e=>{const w=wById(e.dataset.id),t=e.querySelector('.wc'),d=e.querySelector('.wd'),g=e.querySelector('.wgr');
  if(t)t.textContent=fmt(n,w&&w.cfg.sec);if(d)d.textContent=n.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});if(g){const h=greet();if(g.dataset.h!==h){g.dataset.h=h;g.innerHTML=h}}});
 chkEv()}
