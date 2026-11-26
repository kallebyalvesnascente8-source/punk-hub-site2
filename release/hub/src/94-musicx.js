/* =====================================================================
   94x MÚSICA: descobrir (rádios online, transferir do Spotify) e pastas
   - Rádios: diretório aberto Radio Browser (https://www.radio-browser.info). Só estações https.
   - Spotify: NÃO baixa nem converte áudio do Spotify. Lê só nomes públicos (oEmbed oficial)
     dos links colados e procura os arquivos que o usuário JÁ tem na biblioteca.
   - Versões legais: busca no Internet Archive (domínio público / licença livre).
   ===================================================================== */
const RB='https://all.api.radio-browser.info/json';
const MX={rs:null,rq:'',rbusy:0,rerr:'',sp:null,spbusy:0,ia:{}};
const muNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\(.*?\)|\[.*?\]/g,' ').replace(/\s[-–]\s(remaster(ed)?|live|ao vivo|radio edit|version|versão|mono|stereo).*$/,' ').replace(/[^a-z0-9]+/g,' ').trim();
/* ---- pasta (Windows): escolher e importar ---- */
async function muAddDir(get){
 if(!PXM)return;try{const d=await get();if(!d)return;const m=muM();if(!m.dirs.includes(d)&&m.dirs.length<20){m.dirs.push(d);save()}
  const l=await PXM.listAudio(d);const nw=l.filter(x=>!MU.keys.has(x.path));if(!l.length)toast('Nenhuma música MP3, WAV, FLAC ou OGG nessa pasta.');else if(!nw.length)toast('Essas músicas já estão na biblioteca.');else await muImportPaths(nw);ren()}
 catch(e){toast('Não foi possível ler a pasta. Escolha outra ou verifique se ela ainda existe.')}}
/* ---- rádios ---- */
const rdId=u=>{let h=0;for(let i=0;i<u.length;i++)h=(h*31+u.charCodeAt(i))>>>0;return'rd'+h.toString(36).padStart(8,'0')+(u.length%36).toString(36)};
function rdTrack(r){return{id:r.id,n:r.n,ar:'Rádio ao vivo'+(r.cc?' · '+r.cc:''),al:'',d:0,c:'',u:r.u,live:1}}
function muRadList(){return muM().rads.map(r=>{const t=rdTrack(r);MU.rt.set(r.id,t);return t})}
async function radSearch(q){
 MX.rbusy=1;MX.rerr='';MX.rq=q;muxPaint();
 try{
  const p=new URLSearchParams({limit:'40',hidebroken:'true',order:'clickcount',reverse:'true',is_https:'true'});
  if(q)p.set('name',q);else p.set('countrycode','BR');
  const r=await fetch(RB+'/stations/search?'+p,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('http');
  const j=await r.json();if(!Array.isArray(j))throw new Error('fmt');
  MX.rs=j.filter(x=>x&&typeof x.url_resolved==='string'&&/^https:\/\//.test(x.url_resolved)&&x.url_resolved.length<500).slice(0,40).map(x=>({id:rdId(x.url_resolved),n:String(x.name||'Rádio').trim().slice(0,80)||'Rádio',u:x.url_resolved,cc:String(x.countrycode||'').slice(0,3),tg:String(x.tags||'').split(',').slice(0,3).join(', '),br:+x.bitrate||0}))}
 catch(e){MX.rs=null;MX.rerr=navigator.onLine?'Não foi possível carregar a lista de rádios agora. Tente de novo em instantes.':'Rádios precisam de internet. Suas rádios salvas aparecem abaixo e voltam a tocar quando houver conexão.'}
 MX.rbusy=0;muxPaint()}
function radPlay(id){
 const r=(MX.rs||[]).find(x=>x.id===id)||muM().rads.find(x=>x.id===id);if(!r)return;
 const t=rdTrack(r);MU.rt.set(id,t);muPlayList([id],id)}
function muRadFav(id){
 const m=muM(),i=m.rads.findIndex(r=>r.id===id);
 if(i>=0){m.rads.splice(i,1);toast('Rádio removida das suas rádios.')}
 else{const r=(MX.rs||[]).find(x=>x.id===id)||(MU.rt.get(id)&&{id,n:MU.rt.get(id).n,u:MU.rt.get(id).u,cc:''});if(!r)return;if(m.rads.length>=60){toast('Limite de 60 rádios salvas.');return}m.rads.push({id:r.id,n:r.n,u:r.u,cc:r.cc||''});toast('Rádio salva.')}
 save();muPaint();muxPaint()}
const radRow=(r,saved)=>`<div class="mur${r.id===MU.cur?' on':''}" data-t="${r.id}"><button class="muplay" data-a="radplay" data-id="${r.id}" aria-label="Ouvir ${esc(r.n)}"><span class="muth">${mi('note',16)}</span><span class="mun"><b>${esc(r.n)}</b><i>${esc([r.cc,r.tg,r.br?r.br+' kbps':''].filter(Boolean).join(' · '))}</i></span></button><span></span><button class="mubi${saved?' on':''}" data-a="mufav" data-id="${r.id}" aria-label="${saved?'Tirar das minhas rádios':'Salvar rádio'}" aria-pressed="${saved}">${mi(saved?'heartf':'heart',16)}</button></div>`;
function radPanel(){
 const sv=new Set(muM().rads.map(r=>r.id));
 return`<div class="fl muhd"><h3 style="margin:0">Rádios online</h3><input type="search" id="muradq" data-i="muradq" value="${esc(MX.rq)}" placeholder="Buscar rádio pelo nome" aria-label="Buscar rádio" style="flex:1;min-width:140px"><button data-a="radtop">Populares do Brasil</button></div>
 <p class="m sm">Rádios gratuitas e sem anúncios do app. Precisam de internet para tocar. Só estações com conexão segura (https) são listadas.</p>
 ${muM().rads.length?`<div class="mut">Minhas rádios</div>`+muRadList().map(t=>radRow({id:t.id,n:t.n,cc:'',tg:'',br:0},true)).join(''):''}
 <div class="mut">${MX.rq?'Resultados':'Populares'}</div><div id="radl">${MX.rbusy?'<div class="empty m">Carregando...</div>':MX.rerr?`<div class="empty m">${esc(MX.rerr)}</div>`:MX.rs?(MX.rs.length?MX.rs.map(r=>radRow(r,sv.has(r.id))).join(''):'<div class="empty m">Nenhuma rádio encontrada.</div>'):'<div class="empty m">Toque em Populares do Brasil ou busque pelo nome.</div>'}</div>`}
/* ---- Spotify: ler links colados e casar com a biblioteca ---- */
const SPT_RE=/https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]{22})(?:[?#]\S*)?|spotify:(track|album|playlist):([A-Za-z0-9]{22})/g;
function sptParse(txt){
 const out=[],seen=new Set();let m;const re=new RegExp(SPT_RE.source,'g'),links=new Set();
 while((m=re.exec(txt))){const kind=m[1]||m[3],id=m[2]||m[4],k=kind+id;if(seen.has(k))continue;seen.add(k);out.push({kind,id,url:`https://open.spotify.com/${kind}/${id}`});links.add(m[0])}
 let rest=txt;links.forEach(l=>{rest=rest.split(l).join('\n')});
 for(const ln of rest.split(/\r?\n/)){const x=ln.trim();if(!x||x.length>200||/^https?:/i.test(x))continue;const mm=/^(.{1,100}?)\s+[-–]\s+(.{1,100})$/.exec(x);if(mm)out.push({kind:'text',artist:mm[1].trim(),title:mm[2].trim()});else out.push({kind:'text',artist:'',title:x})}
 return out.slice(0,300)}
async function sptMeta(it){
 if(it.kind==='text')return;
 try{const r=await fetch('https://open.spotify.com/oembed?url='+encodeURIComponent(it.url),{signal:AbortSignal.timeout(9000)});
  if(r.status===404){it.err='Link não encontrado ou privado.';return}
  if(!r.ok)throw 0;const j=await r.json();it.title=String(j.title||'').slice(0,200);it.cover=/^https:\/\/[a-z0-9.-]*scdn\.co\//.test(j.thumbnail_url||'')?j.thumbnail_url:''}
 catch(e){it.err=navigator.onLine?'O Spotify não respondeu para este link.':'Sem internet para ler este link.'}}
function sptMatch(it){
 const T=muM().tracks,nt=muNorm(it.title),na=muNorm(it.artist);if(!nt){it.st='miss';return}
 let c=T.filter(t=>muNorm(t.n)===nt);if(!c.length)c=T.filter(t=>{const x=muNorm(t.n);return x.length>3&&(x.includes(nt)||nt.includes(x))&&Math.min(x.length,nt.length)/Math.max(x.length,nt.length)>.6});
 if(na&&c.length>1){const d=c.filter(t=>muNorm(t.ar).includes(na)||na.includes(muNorm(t.ar)));if(d.length)c=d}
 if(na&&c.length===1&&c[0].ar&&!(muNorm(c[0].ar).includes(na)||na.includes(muNorm(c[0].ar)))){it.st='miss';return}
 if(!c.length)it.st='miss';else{it.st=c.length>1?'amb':'ok';it.tid=c[0].id}}
async function sptRun(){
 const ta=$('#muspt');if(!ta)return;const items=sptParse(ta.value);if(!items.length){toast('Cole links de músicas do Spotify (ou linhas "Artista - Música").');return}
 MX.sp={items,done:0,raw:ta.value,name:($('#musptn')||{}).value||'Transferidas do Spotify',pl:''};MX.spbusy=1;muxPaint();
 let i=0;const w=async()=>{while(i<items.length){const it=items[i++];
  if(it.kind==='album'||it.kind==='playlist'){await sptMeta(it);it.st='list'}
  else{await sptMeta(it);if(!it.err){sptMatch(it)}else it.st='err'}
  MX.sp.done++;if(MX.sp.done%5===0)muxPaint()}};
 await Promise.all([w(),w(),w()]);
 const ids=[...new Set(items.filter(x=>x.tid).map(x=>x.tid))];
 if(ids.length){const m=muM();if(m.pls.length<50){const p={id:muId('pl'),n:String(MX.sp.name||'Transferidas do Spotify').slice(0,40),t:ids};m.pls.push(p);MX.sp.pl=p.id;save()}}
 MX.spbusy=0;muxPaint()}
function sptCopyMissing(){
 const L=(MX.sp?MX.sp.items:[]).filter(x=>x.st==='miss'||x.st==='err').map(x=>(x.artist?x.artist+' - ':'')+(x.title||x.url));
 if(!L.length)return;navigator.clipboard&&navigator.clipboard.writeText(L.join('\n')).then(()=>toast('Lista copiada.'),()=>toast('Não foi possível copiar.'))}
function sptPanel(){
 const s=MX.sp,it=s?s.items:[],c=k=>it.filter(x=>x.st===k).length;
 const row=x=>{const nm=x.kind==='text'?((x.artist?x.artist+' - ':'')+x.title):(x.title||x.url);
  const st=x.st==='ok'?'Encontrada na biblioteca':x.st==='amb'?'Encontrada (mais de uma versão, usei a primeira)':x.st==='list'?(x.err||'Lista de faixas não disponível (veja a nota acima)'):x.st==='err'?x.err:'Não encontrada na biblioteca';
  const ia=MX.ia[nm];
  return`<div class="mur sptr" data-st="${x.st||''}"><span class="mun" style="padding:6px 8px"><b>${esc(nm)}</b><i>${esc(st)}</i></span><span></span>${x.st==='miss'?`<button data-a="iafind" data-q="${esc(nm)}">Buscar versão legal</button>`:''}
  ${ia?`<div class="sptia">${ia.busy?'<span class="m sm">Buscando no Internet Archive...</span>':ia.err?`<span class="m sm">${esc(ia.err)}</span>`:ia.l.length?ia.l.map(o=>`<div class="fl"><span class="m sm" style="flex:1">${esc(o.t)}${o.c?' · '+esc(o.c):''}</span><button data-a="iadl" data-q="${esc(nm)}" data-id="${esc(o.id)}">Baixar e adicionar</button></div>`).join(''):'<span class="m sm">Nenhuma versão com licença livre encontrada.</span>'}</div>`:''}</div>`};
 return`<div class="fl muhd"><h3 style="margin:0">Transferir do Spotify</h3></div>
 <p class="m sm">Cole links de músicas, álbuns ou playlists do Spotify, ou linhas "Artista - Música". O PUNK HUB lê só os nomes públicos e procura as músicas que <b>você já tem</b> na biblioteca, depois monta uma playlist. Ele não baixa nem converte áudio do Spotify.<br>Para playlists inteiras: abra a playlist no Spotify, selecione as faixas (Ctrl+A), copie (Ctrl+C) e cole aqui. Links de playlist ou álbum sozinhos só trazem o nome, porque listar as faixas exige autorizar a sua conta Spotify, o que esta versão não faz.</p>
 <textarea id="muspt" rows="6" placeholder="https://open.spotify.com/track/..." aria-label="Links do Spotify" style="width:100%" ${MX.spbusy?'disabled':''}>${s?esc(s.raw||''):''}</textarea>
 <div class="fl"><input id="musptn" maxlength="40" value="${esc(s?s.name:'Transferidas do Spotify')}" aria-label="Nome da playlist" style="flex:1;min-width:140px"><button class="p" data-a="sptgo" ${MX.spbusy?'disabled':''}>${MX.spbusy?`Lendo ${s?s.done:0}/${s?it.length:0}...`:'Transferir'}</button></div>
 ${s&&!MX.spbusy?`<div class="card"><b>${c('ok')+c('amb')} de ${it.length} encontradas</b><span class="m sm"> · ${c('miss')} não encontradas${c('err')?' · '+c('err')+' com erro':''}${c('list')?' · '+c('list')+' lista(s) sem faixas':''}</span>
 <div class="fl">${s.pl?`<button class="p" data-a="muview" data-v="pl:${s.pl}">Abrir playlist criada</button>`:''}${c('miss')+c('err')?'<button data-a="sptcopy">Copiar lista das não encontradas</button>':''}</div></div>`:''}
 <div id="sptl">${s?it.map(row).join(''):''}</div>`}
/* ---- versões legais: Internet Archive ---- */
async function iaFind(q){
 MX.ia[q]={busy:1,l:[]};muxPaint();
 try{const w=q.replace(/["\\()]/g,' ').slice(0,100);
  const p=new URLSearchParams({q:`title:(${w}) AND mediatype:audio AND (licenseurl:*creativecommons* OR licenseurl:*publicdomain*)`,rows:'5',output:'json'});['identifier','title','creator'].forEach(f=>p.append('fl[]',f));
  const r=await fetch('https://archive.org/advancedsearch.php?'+p,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw 0;const j=await r.json();
  MX.ia[q]={l:((j.response||{}).docs||[]).filter(d=>/^[\w.-]{1,100}$/.test(d.identifier||'')).map(d=>({id:d.identifier,t:String(Array.isArray(d.title)?d.title[0]:d.title||d.identifier).slice(0,80),c:String(Array.isArray(d.creator)?d.creator[0]:d.creator||'').slice(0,50)}))}}
 catch(e){MX.ia[q]={l:[],err:navigator.onLine?'Não foi possível buscar agora.':'Sem internet.'}}
 muxPaint()}
async function iaGet(q,id){
 if(muRoom()<=0){toast('Limite de '+MU_MAX+' músicas na biblioteca.');return}
 toast('Baixando...');
 try{const r=await fetch('https://archive.org/metadata/'+encodeURIComponent(id),{signal:AbortSignal.timeout(10000)});if(!r.ok)throw 0;const j=await r.json();
  const f=(j.files||[]).find(x=>/\.(mp3|ogg|flac)$/i.test(x.name||'')&&+x.size>0&&+x.size<80e6);if(!f)throw new Error('Esta obra não tem um arquivo de áudio compatível.');
  const d=await fetch('https://archive.org/download/'+encodeURIComponent(id)+'/'+f.name.split('/').map(encodeURIComponent).join('/'),{signal:AbortSignal.timeout(120000)});if(!d.ok)throw 0;
  const b=await d.blob(),file=new File([b],f.name.split('/').pop(),{type:b.type});
  if(await muAddFile(file)){save();toast('Adicionada à biblioteca.');const it=((MX.sp||{}).items||[]).find(x=>((x.artist?x.artist+' - ':'')+(x.title||x.url))===q);if(it){sptMatch(it);if(it.st==='miss'){const t=muM().tracks[muM().tracks.length-1];it.st='ok';it.tid=t.id}}muxPaint()}else toast('Essa música já está na biblioteca.')}
 catch(e){toast(e&&e.message&&e.message.length<90?e.message:'Não foi possível baixar. Verifique a internet.')}}
/* ---- painel e eventos ---- */
function muxPanel(v){return`<div id="mux">${v==='radio'?radPanel():sptPanel()}</div>`}
function muxPaint(){const e=$('#mux');if(!e)return;const ae=document.activeElement,id=ae&&ae.id,ss=ae&&ae.selectionStart;
 e.innerHTML=MU.view==='radio'?radPanel():sptPanel();if(id){const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(ss,ss)}catch(x){}}}}
let _rdq;
Object.assign(A,{radplay:a=>radPlay(a.dataset.id),radtop:()=>{MX.rq='';radSearch('')},sptgo:()=>sptRun(),sptcopy:sptCopyMissing,iafind:a=>iaFind(a.dataset.q),iadl:a=>iaGet(a.dataset.q,a.dataset.id)});
Object.assign(I,{muradq:e=>{clearTimeout(_rdq);const q=e.value.trim();MX.rq=q;_rdq=setTimeout(()=>{if(q.length>=2||!q)radSearch(q)},450)}});
/* ao abrir a aba Rádios pela primeira vez, carrega as populares */
{const o=A.muview;A.muview=a=>{o(a);if(a.dataset.v==='radio'&&!MX.rs&&!MX.rbusy)radSearch('')}}
