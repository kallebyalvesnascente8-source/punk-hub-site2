/* =====================================================================
   96 VERSÃO, ATUALIZAÇÕES (GitHub Releases) E TUTORIAL INICIAL
   - HUB_REPO: "usuario/repositorio" dos Releases. Vazio = verificação desligada
     (a interface avisa isso em vez de fingir que funciona).
   - A verificação só LÊ a API pública do GitHub. A instalação continua manual:
     o botão abre o arquivo .exe/.apk do Release no navegador do sistema.
   ===================================================================== */
const HUB_VER='1.1.0',HUB_REPO='';
const REL={st:'idle',info:null,err:''};
const relPlat=()=>PX?'win':MOB?'apk':'web';
function relNum(v){const m=/^v?(\d+)\.(\d+)\.(\d+)/.exec(String(v||'').trim());return m?[+m[1],+m[2],+m[3]]:null}
function relNewer(a,b){const x=relNum(a),y=relNum(b);if(!x||!y)return false;for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i]}return false}
function relPick(r){
 const pl=relPlat(),re=pl==='win'?/\.exe$/i:pl==='apk'?/\.apk$/i:null,okU=u=>typeof u==='string'&&/^https:\/\/github\.com\//.test(u);
 const a=re&&Array.isArray(r.assets)?r.assets.find(x=>x&&re.test(String(x.name||''))&&okU(x.browser_download_url)):null;
 return{url:a?a.browser_download_url:(okU(r.html_url)?r.html_url:''),direct:!!a,name:a?a.name:''}}
async function relCheck(silent){
 if(!/^[\w.-]+\/[\w.-]+$/.test(HUB_REPO)){REL.st='off';if(!silent)toast('Atualizações ainda não configuradas (HUB_REPO vazio).');return}
 REL.st='check';REL.err='';if(!silent)relPaint();
 try{
  const r=await fetch('https://api.github.com/repos/'+HUB_REPO+'/releases/latest',{headers:{accept:'application/vnd.github+json'},signal:AbortSignal.timeout(8000)});
  if(r.status===404)throw new Error('Nenhuma versão publicada ainda neste repositório.');
  if(!r.ok)throw new Error('GitHub respondeu '+r.status+'.');
  const j=await r.json(),tag=String(j.tag_name||'');if(!relNum(tag))throw new Error('Versão publicada com nome inválido: '+tag.slice(0,20));
  const up=relNewer(tag,HUB_VER);REL.info={tag:tag.replace(/^v/,''),up,notes:String(j.body||'').slice(0,600),...relPick(j)};REL.st=up?'new':'ok';
  try{localStorage.setItem('punkhub:updchk',String(Date.now()))}catch(e){}
  if(up&&silent)notify('Nova versão do PUNK HUB disponível: '+REL.info.tag+'. Veja em Configurações > Sistema.')
 }catch(e){REL.st='err';REL.err=e&&e.name==='TimeoutError'?'Sem resposta do GitHub. Verifique a internet.':(e&&e.message&&e.message!=='Failed to fetch'?e.message:'Sem conexão com a internet.')}
 relPaint()}
function relAuto(){
 if(!S.upd||!HUB_REPO||!navigator.onLine)return;let t=0;try{t=+localStorage.getItem('punkhub:updchk')||0}catch(e){}
 if(Date.now()-t<864e5)return;setTimeout(()=>relCheck(1),6000)}
function relCard(){
 const i=REL.info,off=!HUB_REPO,pl=relPlat();
 let st=off?'<p class="m">A verificação de versões ainda não foi ligada nesta cópia (falta definir o repositório dos Releases).</p>'
  :REL.st==='check'?'<p class="m">Verificando...</p>'
  :REL.st==='err'?`<p class="m">${esc(REL.err)}</p>`
  :REL.st==='new'?`<div class="stat"><span class="dot" style="background:var(--ac)"></span><b>Nova versão ${esc(i.tag)} disponível</b></div>${i.notes?`<pre class="m sm" style="white-space:pre-wrap;max-height:9em;overflow:auto">${esc(i.notes)}</pre>`:''}${i.url?`<div class="fl"><a class="btn p" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">${i.direct?'Baixar '+esc(i.name):'Abrir página da versão'}</a></div><p class="m sm">${pl==='win'?'Feche o PUNK HUB, execute o instalador baixado e pronto: seus dados e temas são mantidos.':pl==='apk'?'Abra o arquivo baixado para atualizar por cima. Seus dados são mantidos.':''}</p>`:''}`
  :REL.st==='ok'?'<p class="m">Você está na versão mais recente.</p>':'';
 return`<div class="card" id="relc"><h3>Versão e atualizações</h3><div class="stat"><b>PUNK HUB ${HUB_VER}</b><span class="m sm"> ${pl==='win'?'Windows':pl==='apk'?'Android':'navegador'}</span></div>${st}
 <div class="fl">${off?'':'<button class="p" data-a="relchk">Verificar atualizações</button>'}<button data-a="tutopen">Rever o tutorial</button></div>
 ${off?'':`<label class="row"><span>Verificar sozinho uma vez por dia</span><input type="checkbox" data-i="relauto" ${S.upd?'checked':''}></label>`}</div>`}
function relPaint(){const e=$('#relc');if(e){const t=document.createElement('div');t.innerHTML=relCard();e.replaceWith(t.firstElementChild)}}
/* ---- tutorial ---- */
const TUT=[
 ['Bem-vindo ao PUNK HUB','Este é o seu painel pessoal. Tudo fica salvo neste aparelho e funciona sem internet. O tutorial leva menos de um minuto e você pode pular quando quiser.'],
 ['Deixe com a sua cara','Em Configurações > Temas você escolhe um tema pronto, ou ajusta cores, fundo, personagem, ícones e fontes. Um tema que você importa vale para o Hub inteiro, inclusive o player de música.'],
 ['Fotos e Música','Em Fotos você vê e edita imagens. Em Música você adiciona arquivos ou pastas, cria playlists e escuta com o player da barra, mesmo com outros apps do Hub abertos.'],
 ['PUNK AI e atalhos','O PUNK AI conversa usando um modelo no seu próprio aparelho (Ollama). Use o botão de pesquisa da barra para abrir qualquer coisa rápido.'],
 ['Pronto','Você pode rever este tutorial a qualquer hora em Configurações > Sistema.']];
let tutI=0;
function tutShow(){
 let e=$('#tut');if(!e){e=document.createElement('div');e.id='tut';e.className='tut';e.setAttribute('role','dialog');e.setAttribute('aria-modal','true');e.setAttribute('aria-labelledby','tutt');document.body.appendChild(e)}
 const[t,d]=TUT[tutI],last=tutI===TUT.length-1;
 e.innerHTML=`<div class="tutb g"><div class="m sm">${tutI+1} de ${TUT.length}</div><h2 id="tutt">${esc(t)}</h2><p>${esc(d)}</p><div class="fl">${tutI?'<button data-a="tutprev">Voltar</button>':''}<button class="p" data-a="${last?'tutend':'tutnext'}" id="tutgo">${last?'Começar':'Próximo'}</button>${last?'':'<button data-a="tutend">Pular</button>'}</div></div>`;
 const g=$('#tutgo');if(g)g.focus()}
function tutEnd(){const e=$('#tut');if(e)e.remove();if(!S.tut){S.tut=1;save()}}
Object.assign(A,{relchk:()=>relCheck(0),tutopen:()=>{tutI=0;tutShow()},tutnext:()=>{tutI=Math.min(TUT.length-1,tutI+1);tutShow()},tutprev:()=>{tutI=Math.max(0,tutI-1);tutShow()},tutend:tutEnd});
Object.assign(I,{relauto:e=>{S.upd=e.checked?1:0;save()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#tut')){e.stopPropagation();tutEnd()}},true);
/* navegador automatizado (testes) não recebe o tutorial, a menos que o teste peça (window.__TUT_TEST) */
function relBoot(){if(!S.tut&&!(navigator.webdriver&&!window.__TUT_TEST))setTimeout(()=>{if(!S.tut&&!$('#tut')){tutI=0;tutShow()}},700);relAuto()}
