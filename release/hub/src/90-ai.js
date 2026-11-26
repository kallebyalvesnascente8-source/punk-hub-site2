/* ==========================================================
   PUNK AI: assistente local via Ollama (sem APIs externas)
   Estado persistente em S.ai (url, modelo, prompt, conversas).
   Estado temporario de tela em AI.
   ========================================================== */
const AI={ctl:null,sid:'',busy:0,status:'idle',models:[],err:'',side:0,cfg:0,arm:0,draft:''};
const TIPS=['Use Ctrl+R no terminal para buscar no histórico de comandos.','Faça backup do seu dotfiles num repositório git. Futuro você agradece.','zram é swap comprimida em RAM: ótimo em máquinas modestas.','Antes de trocar de distro, teste em uma live USB.','Instale tldr e leia exemplos em vez de manuais gigantes.','Atualize com frequência, mas leia os avisos se estiver no Arch.'],JOKES=['Por que o Linux nunca fica sozinho? Porque tem sempre um daemon por perto.','Ricing é só procrastinação com paleta de cores.','Funciona na minha máquina. Já tentou formatar a sua?'];
const aiConv=()=>S.ai.convs.find(c=>c.id===S.ai.cur),aiBase=()=>S.ai.url.replace(/\/+$/,''),aiScroll=()=>{const l=$('#log');if(l)l.scrollTop=l.scrollHeight};

function aiNew(){const c={id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),t:'Nova conversa',u:Date.now(),m:[]};S.ai.convs.unshift(c);S.ai.convs=S.ai.convs.slice(0,40);S.ai.cur=c.id;save();return c}

/* Markdown minimo e seguro: tudo passa por esc() antes de virar HTML */
function md(t,th='',open=0){
 t=String(t).replace(/<think>([\s\S]*?)(<\/think>|$)/g,(x,a)=>{th+=(th?'\n':'')+a.trim();return''}).replace(/^\s+/,'');
 const h=t.split('```').map((p,i)=>{
  if(i%2){const n=p.indexOf('\n'),code=n>=0?p.slice(n+1).replace(/\n$/,''):'';return`<pre><button class="cpb" data-a="cpcode">Copiar</button><code>${esc(code)}</code></pre>`}
  return esc(p).replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>').replace(/^#{1,4}\s+(.+)$/gm,'<b>$1</b>')
 }).join('').replace(/\n?(<pre>)/g,'$1').replace(/(<\/pre>)\n/g,'$1');
 return(th?`<details class="th"${open?' open':''}><summary>Raciocínio</summary>${esc(th)}</details>`:'')+h}

function aiErr(e){const m=String(e&&e.message||e);
 if(e&&e.name==='TimeoutError')return'Tempo esgotado ao falar com o Ollama em '+aiBase()+'.';
 if(e&&e.ollama)return'Erro do Ollama: '+m;
 if(/^HTTP 403/.test(m))return'O Ollama recusou a origem desta página (HTTP 403). Defina OLLAMA_ORIGINS e reinicie o Ollama.';
 if(/^HTTP/.test(m))return'O Ollama respondeu com erro ('+m+').';
 if(location.protocol==='https:'&&/^http:\/\//i.test(S.ai.url)&&!/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(S.ai.url))return'Esta página está em HTTPS e o navegador bloqueia chamadas HTTP para outros endereços. Abra o Hub por arquivo local ou HTTP.';
 return'Não consegui conectar ao Ollama em '+aiBase()+'. Confirme que ele está rodando e que esta página tem permissão (OLLAMA_ORIGINS).'}

/* Conexao: lista os modelos realmente instalados em /api/tags */
async function aiPing(){
 if(!/^https?:\/\/\S+$/i.test(S.ai.url||'')){AI.status='off';AI.models=[];AI.err='Endereço inválido. Use algo como http://localhost:11434';return aiUI()}
 AI.status='check';aiUI();
 try{
  const r=await fetch(aiBase()+'/api/tags',{signal:AbortSignal.timeout(6000)});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const j=await r.json();
  AI.models=arr(j.models).map(m=>({n:String(m.name||m.model||''),sz:+m.size||0})).filter(m=>m.n&&!/embed/i.test(m.n)).sort((a,b)=>a.n.localeCompare(b.n));
  AI.status='ok';AI.err='';
  if(!AI.models.some(m=>m.n===S.ai.model))S.ai.model=AI.models[0]?.n||'';
  save();
 }catch(e){AI.status='off';AI.models=[];AI.err=aiErr(e)}
 aiUI()}

/* Envio com streaming (NDJSON de /api/chat) */
async function aiSend(text){
 const q=text.trim();if(!q)return;
 if(q[0]==='/')return aiCmd(q);
 if(AI.status!=='ok'||!S.ai.model){toast(AI.status==='ok'?'Nenhum modelo instalado no Ollama.':'Ollama desconectado. Veja as instruções na conversa.');aiPing();return}
 const c=aiConv()||aiNew(),a={r:'assistant',c:'',th:''};
 c.m.push({r:'user',c:q},a);if(c.t==='Nova conversa')c.t=q.slice(0,40);c.u=Date.now();
 AI.busy=1;AI.sid=c.id;AI.ctl=new AbortController();aiUI();aiScroll();
 try{
  const msgs=[...(S.ai.sys.trim()?[{role:'system',content:S.ai.sys}]:[]),...c.m.filter(m=>m!==a&&!m.loc&&!m.err&&m.c).slice(-40).map(m=>({role:m.r,content:m.c}))];
  const r=await fetch(aiBase()+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:AI.ctl.signal,body:JSON.stringify({model:S.ai.model,messages:msgs,stream:true,options:{temperature:S.ai.temp}})});
  if(!r.ok){let t='';try{t=(await r.json()).error||''}catch(x){}throw new Error('HTTP '+r.status+(t?': '+t:''))}
  const rd=r.body.getReader(),dc=new TextDecoder();let buf='';
  const line=l=>{const j=JSON.parse(l);if(j.error)throw Object.assign(new Error(j.error),{ollama:1});
   a.c+=j.message?.content||'';a.th+=j.message?.thinking||'';
   if(j.done&&j.eval_count&&j.eval_duration)a.s=(j.eval_count/(j.eval_duration/1e9)).toFixed(1)+' tokens/s';
   aiPaint(c,a)};
  for(;;){const{done,value}=await rd.read();if(done)break;buf+=dc.decode(value,{stream:true});let i;while((i=buf.indexOf('\n'))>=0){const l=buf.slice(0,i).trim();buf=buf.slice(i+1);if(l)line(l)}}
  if(buf.trim())line(buf.trim());
  if(!a.c&&!a.th)a.c='(resposta vazia)';
 }catch(e){
  if(e.name==='AbortError'){if(a.c||a.th)a.s=(a.s?a.s+' · ':'')+'interrompido';else c.m.splice(c.m.indexOf(a),1)}
  else{a.err=aiErr(e);if(e instanceof TypeError){AI.status='off';AI.err=a.err}}
 }
 c.m=c.m.slice(-200);AI.busy=0;AI.ctl=null;save();aiUI();if(S.ai.cur===c.id)aiScroll()}

/* Comandos locais (nao vao para o modelo) */
function aiCmd(q){
 const c=aiConv()||aiNew(),[k,...r]=q.slice(1).trim().split(/\s+/),arg=r.join(' ').toLowerCase();let out;
 if(k==='limpar'){c.m=[];c.t='Nova conversa';save();return aiUI()}
 if(k==='ajuda')out='Comandos locais:\n/modelos lista os modelos instalados\n/tema <nome> troca o tema\n/tarefas resume suas tarefas\n/dica e /piada\n/limpar esvazia esta conversa\nQualquer outra mensagem vai para o modelo selecionado no Ollama.';
 else if(k==='modelos')out=AI.models.length?'Modelos instalados:\n'+AI.models.map(m=>'- '+m.n).join('\n'):'Nenhum modelo listado. Confira a conexão com o Ollama.';
 else if(k==='tema'){const m=Object.keys(allT()).find(x=>x.toLowerCase().includes(arg));if(!arg||!m)out='Temas: '+Object.keys(allT()).join(', ')+'. Use /tema <nome>.';else{useTheme(m);out='Tema '+cap(m)+' aplicado.'}}
 else if(k==='tarefas'){const p=S.todos.filter(t=>!t.d);out=p.length?`Você tem ${p.length} tarefa(s) pendente(s):\n`+p.map(t=>'- '+t.t).join('\n'):'Nenhuma tarefa pendente.'}
 else if(k==='dica')out=pick(TIPS);
 else if(k==='piada')out=pick(JOKES);
 else out='Comando desconhecido. Digite /ajuda.';
 c.m.push({r:'user',c:q,loc:1},{r:'assistant',c:out,loc:1});if(c.t==='Nova conversa')c.t=q.slice(0,40);c.u=Date.now();save();aiUI();aiScroll()}

/* ---------- Renderizacao ---------- */
const aiBubble=(m,pend)=>{const u=m.r==='user';return`<div class="b ${u?'u':m.err?'er':'k'}${pend?' pend':''}">${u?esc(m.c):m.err?esc(m.err)+(m.c?'<br>'+md(m.c):''):md(m.c,m.th,AI.busy&&!m.c)}${m.s&&!u?`<div class="m st">${esc(m.s)}</div>`:''}</div>`};
function aiHelp(){
 const nm=AI.status==='ok'&&!AI.models.length,c=v=>`<code>${esc(v)}</code> <button data-a="cp" data-v="${esc(v)}">Copiar</button>`;
 return`<div class="card"><h3>${nm?'Nenhum modelo instalado':'Conectar ao Ollama'}</h3>${AI.err&&!nm?`<p>${esc(AI.err)}</p>`:''}${MOB?`<ol class="hl"><li>Instale o <b>Termux</b> (F-Droid ou GitHub do Termux) e, nele, rode: ${c('pkg update && pkg upgrade -y && pkg install ollama -y')}</li><li>Inicie o servidor (deixe o Termux aberto): ${c('ollama serve')}<br>Se aparecer erro 403, use: ${c('OLLAMA_ORIGINS="*" ollama serve')}</li><li>Em outra sessão do Termux, baixe um modelo pequeno: ${c('ollama pull llama3.2:1b')}</li><li>Volte aqui e toque em Testar de novo. O endereço é <code>http://localhost:11434</code> e tudo roda no próprio celular.</li><li>Alternativa: use um Ollama de outro aparelho na mesma rede e informe o endereço em Ajustes.</li></ol>`:`<ol class="hl"><li>Instale o Ollama em <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" style="color:var(--ac2)">ollama.com/download</a> e deixe-o rodando.</li><li>Baixe um modelo: ${c('ollama pull llama3.2')}</li><li>Se o navegador bloquear (erro 403 ou CORS), libere esta página e reinicie o Ollama.<br>Linux/macOS: ${c('OLLAMA_ORIGINS="*" ollama serve')}<br>Windows: crie a variável de ambiente <code>OLLAMA_ORIGINS</code> com o valor <code>*</code> e reinicie o Ollama.</li><li>No celular: rode o Ollama no PC com ${c('OLLAMA_HOST=0.0.0.0 ollama serve')}, abra o Hub por HTTP (não HTTPS) e informe <code>http://IP-DO-PC:11434</code> em Ajustes.</li></ol>`}<div class="fl"><button data-a="aiping">Testar de novo</button></div><p class="m">Segurança: o asterisco libera qualquer site a falar com o seu Ollama. Se hospedar o Hub, use a origem exata dele no lugar do asterisco.</p></div>`}
function aiLog(){
 const c=aiConv();let h='';
 if(AI.status!=='ok'&&AI.status!=='check'||(AI.status==='ok'&&!AI.models.length))h+=aiHelp();
 if(!c||!c.m.length)h+=`<div class="card m">Converse com o PUNK. Ele roda no seu Ollama, sem nuvem. Digite <code>/ajuda</code> para ver os comandos locais.</div>`;
 return h+(c?c.m.map((m,i)=>aiBubble(m,AI.busy&&i===c.m.length-1&&m.r==='assistant'&&!m.c&&!m.th)).join(''):'')}
function aiPaint(c,a){
 if(cur!=='punk'||c.id!==S.ai.cur)return;const l=$('#log'),b=l&&l.lastElementChild;if(!b||!b.classList.contains('b'))return;
 const near=l.scrollHeight-l.scrollTop-l.clientHeight<80;b.outerHTML=aiBubble(a,0);if(near)aiScroll()}
function aiSide(){
 const cv=S.ai.convs;
 return`<button class="p" data-a="ainew">Nova conversa</button>`+(cv.map(c=>`<div class="cv"><button class="t${c.id===S.ai.cur?' on':''}" data-a="aisel" data-k="${esc(c.id)}" title="${esc(c.t)}">${esc(c.t)}</button><button data-a="aidel" data-k="${esc(c.id)}" aria-label="Apagar conversa">×</button></div>`).join('')||'<div class="m">Sem conversas ainda.</div>')+(cv.length?`<button data-a="aiclr">${AI.arm?'Clique de novo para apagar tudo':'Apagar histórico'}</button>`:'')}
function aiHead(){
 const st=AI.status,col=st==='ok'?'var(--ac)':st==='check'?'#e0b000':'#e5484d',txt=st==='ok'?'Ollama conectado':st==='check'?'Conectando...':'Desconectado';
 const ms=AI.models.length?AI.models:(S.ai.model?[{n:S.ai.model,sz:0}]:[]);
 return`<button class="ai-tg" data-a="aiside">Conversas</button><span class="dot" style="background:${col}"></span><span>${txt}</span><select data-i="aimodel" aria-label="Modelo" ${AI.busy?'disabled':''}>${ms.map(m=>`<option value="${esc(m.n)}" ${m.n===S.ai.model?'selected':''}>${esc(m.n)}${m.sz?' ('+(m.sz/1e9).toFixed(1)+' GB)':''}</option>`).join('')||'<option value="">Nenhum modelo</option>'}</select><button data-a="aiping">Atualizar</button><button data-a="aicfg" class="${AI.cfg?'on':''}" aria-expanded="${!!AI.cfg}">Ajustes</button>`}
const aiCfg=()=>`<div class="card"><label class="row"><span>Endereço do Ollama</span><input data-i="aiurl" value="${esc(S.ai.url)}" style="flex:1;min-width:14em" aria-label="Endereço do Ollama"></label><label class="row"><span>Temperatura <b id="v-aitemp" class="m">${S.ai.temp}</b></span><input type="range" data-i="aitemp" min="0" max="2" step=".1" value="${S.ai.temp}"></label><label>Instruções do sistema<textarea data-i="aisys" rows="3">${esc(S.ai.sys)}</textarea></label><div class="fl" style="margin-top:8px"><button class="p" data-a="aiping">Salvar e testar conexão</button><button data-a="aisysrst">Restaurar instruções padrão</button></div></div>`;
const aiBtn=()=>AI.busy?`<button class="p" data-a="aistop">Parar</button>`:`<button class="p" data-a="send">Enviar</button>`;
function aiView(){return`<div class="ai${AI.side?' side':''}"><aside class="ai-side" id="ai-side">${aiSide()}</aside><section class="ai-main"><div id="ai-head" class="fl">${aiHead()}</div><div id="ai-cfg">${AI.cfg?aiCfg():''}</div><div id="log" role="log" aria-live="polite">${aiLog()}</div><div class="fl ai-in"><textarea id="pi" data-i="aid" rows="1" placeholder="Pergunte algo ou use /ajuda" aria-label="Mensagem">${esc(AI.draft)}</textarea><span id="ai-btn">${aiBtn()}</span></div></section></div>`}
function aiUI(){
 if(cur!=='punk')return;const set=(id,h)=>{const e=$(id);if(e&&e.innerHTML!==h)e.innerHTML=h},l=$('#log'),near=l&&l.scrollHeight-l.scrollTop-l.clientHeight<80;
 set('#ai-side',aiSide());set('#ai-head',aiHead());if(!AI.cfg)set('#ai-cfg','');else if(!$('#ai-cfg').firstChild)set('#ai-cfg',aiCfg());set('#ai-btn',aiBtn());set('#log',aiLog());if(near)aiScroll()}

Object.assign(A,{
 send:()=>{const e=$('#pi');if(!e||!e.value.trim())return;if(AI.busy)return toast('Aguarde a resposta ou clique em Parar.');const q=e.value;e.value='';e.style.height='';AI.draft='';aiSend(q)},
 aistop:()=>AI.ctl?.abort(),
 ainew:()=>{const c=aiConv();if(!c||c.m.length)aiNew();AI.side=0;$('.ai')?.classList.remove('side');aiUI();aiScroll();$('#pi')?.focus()},
 aisel:a=>{S.ai.cur=a.dataset.k;save();AI.side=0;$('.ai')?.classList.remove('side');aiUI();aiScroll()},
 aidel:a=>{const id=a.dataset.k;if(AI.busy&&AI.sid===id)AI.ctl?.abort();S.ai.convs=S.ai.convs.filter(c=>c.id!==id);if(S.ai.cur===id)S.ai.cur=S.ai.convs[0]?.id||'';save();aiUI();aiScroll()},
 aiclr:()=>{if(!AI.arm){AI.arm=1;return aiUI()}AI.arm=0;AI.ctl?.abort();S.ai.convs=[];S.ai.cur='';save();aiUI()},
 aiside:()=>{AI.side=AI.side?0:1;$('.ai')?.classList.toggle('side',!!AI.side)},
 aicfg:()=>{AI.cfg=AI.cfg?0:1;aiUI()},
 aiping:()=>aiPing(),
 aisysrst:()=>{S.ai.sys=AI_SYS;save();AI.cfg=1;$('#ai-cfg').innerHTML=aiCfg()}});
Object.assign(I,{
 aid:e=>{AI.draft=e.value;e.style.height='auto';e.style.height=Math.min(e.scrollHeight,140)+'px'},
 aimodel:e=>{S.ai.model=e.value;save()},
 aiurl:e=>{S.ai.url=e.value.trim();save()},
 aitemp:e=>{S.ai.temp=+e.value;const o=$('#v-aitemp');if(o)o.textContent=S.ai.temp;save()},
 aisys:e=>{S.ai.sys=e.value;save()}});

