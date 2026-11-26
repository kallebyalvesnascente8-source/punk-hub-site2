/* =====================================================================
   92 PUNK PHOTOS: galeria, visualizador, editor básico, wallpaper
   Fontes de fotos: "lib" (importadas, no IndexedDB), "pc:<pasta>" (app desktop,
   via ponte window.punk) e "fs" (pasta escolhida no navegador, só na sessão).
   Os arquivos originais nunca são alterados: editar gera uma CÓPIA.
   ===================================================================== */
const PX=window.punk||null;
const PH_EXT=/\.(png|jpe?g|webp|bmp)$/i,PH_MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',bmp:'image/bmp'};
const PH={src:'lib',list:[],sort:'new',n:80,i:-1,th:new Map(),q:[],run:0,fs:null,url:'',v:{z:1,x:0,y:0,nw:0,nh:0},ed:null,load:0};
const phExt=n=>(/\.([a-z0-9]+)$/i.exec(n)||[,''])[1].toLowerCase(),phBase=n=>String(n).replace(/\.[^.]+$/,'');
const phMime=n=>PH_MIME[phExt(n)]||'';
const b64u=s=>btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const phKey=it=>it.k+':'+(it.id||it.path||it.name)+':'+(it.mt||0);

/* ---- Listagem ---- */
async function fsWalkImgs(dir,out,depth){
 if(depth>4||out.length>=5000)return;
 for await(const[n,h]of dir.entries()){
  if(n[0]==='.')continue;
  if(h.kind==='directory')await fsWalkImgs(h,out,depth+1);else if(PH_EXT.test(n))out.push({k:'fs',h,name:n,mt:0,size:0});
  if(out.length>=5000)return}}
async function phLoad(){
 const run=++PH.run;let L=[];PH.load=1;
 try{
  if(PH.src==='lib')L=S.photos.map(p=>({k:'lib',id:p.id,name:p.n,mt:p.c,size:p.s,w:p.w,h:p.h,type:p.t}));
  else if(PH.src.startsWith('pc:')&&PX){L=(await PX.listImages(PH.src.slice(3))).map(f=>({k:'pc',path:f.path,name:f.name,mt:f.mt,size:f.size}))}
  else if(PH.src==='fs'&&PH.fs){await fsWalkImgs(PH.fs,L,0)}
 }catch(e){notify('Não foi possível ler as fotos: '+(e.message||e));L=[]}
 if(run!==PH.run)return;PH.load=0;
 const so=PH.sort,cmp={new:(a,b)=>b.mt-a.mt,old:(a,b)=>a.mt-b.mt,name:(a,b)=>a.name.localeCompare(b.name,'pt',{numeric:true}),size:(a,b)=>b.size-a.size}[so]||(()=>0);
 PH.list=L.sort(cmp);PH.n=80;PH.q=[];if(cur==='photos')phGrid()}
const phName=s=>s==='lib'?'Importadas':s==='fs'?'Pasta do navegador':(s.slice(3).split(/[\\/]/).filter(Boolean).pop()||s.slice(3));

/* ---- Acesso aos bytes ---- */
function phUrl(it){return it.k==='lib'?IMG.load([it.id]).then(()=>IMG.url(it.id)):it.k==='pc'?Promise.resolve(PX.imgUrl(it.path)):it.h.getFile().then(f=>URL.createObjectURL(new File([f],it.name,{type:phMime(it.name)||f.type})))}
async function phBlob(it){
 if(it.k==='lib')return IMG.get(it.id);
 if(it.k==='pc'){const r=await fetch(PX.imgUrl(it.path));if(!r.ok)throw new Error('arquivo indisponível');return r.blob()}
 const f=await it.h.getFile();return new Blob([f],{type:phMime(it.name)||f.type})}

/* ---- Miniaturas: decodificadas já reduzidas, 3 por vez, cache LRU ---- */
let _pact=0;
function phThumb(it){const k=phKey(it);if(PH.th.has(k)){const u=PH.th.get(k);PH.th.delete(k);PH.th.set(k,u);return Promise.resolve(u)}return new Promise(res=>{PH.q.push({it,k,res});phPump()})}
function phPump(){while(_pact<3&&PH.q.length){const j=PH.q.shift();_pact++;(async()=>{
 try{const b=await phBlob(j.it),bm=await createImageBitmap(b,{resizeWidth:300,resizeQuality:'medium'}),c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;c.getContext('2d').drawImage(bm,0,0);bm.close();
  const tb=await new Promise(r=>c.toBlob(r,'image/jpeg',.72)),u=URL.createObjectURL(tb);PH.th.set(j.k,u);
  if(PH.th.size>500){const o=PH.th.keys().next().value;URL.revokeObjectURL(PH.th.get(o));PH.th.delete(o)}j.res(u)}catch(e){j.res('')}
 _pact--;phPump()})()}}
let _pio;
function phObserve(){
 if(_pio)_pio.disconnect();const root=$('#wbody');if(!root)return;
 _pio=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting)return;const t=e.target;_pio.unobserve(t);
  if(t.dataset.more){A.phmore();return}
  const it=PH.list[+t.dataset.i],im=t.querySelector('img');if(!it||!im)return;
  phThumb(it).then(u=>{if(u&&im.isConnected){im.src=u;t.classList.add('ok')}else if(!u)t.classList.add('bad')})}),{root,rootMargin:'300px'});
 $$('#phg .pht,#phg .phm').forEach(t=>_pio.observe(t))}

/* ---- Tela principal (R.photos) ---- */
function phGrid(){
 const g=$('#phg');if(!g)return;const L=PH.list.slice(0,PH.n);
 g.innerHTML=L.map((it,i)=>`<button class="pht" data-a="phopen" data-i="${i}" title="${esc(it.name)}" aria-label="${esc(it.name)}"><img alt="" draggable="false"><span>${esc(it.name)}</span></button>`).join('')+(PH.list.length>PH.n?`<div class="phm" data-more="1">Carregando mais...</div>`:'');
 if(!L.length)g.innerHTML=`<div class="empty m" style="grid-column:1/-1">${PH.load?'Carregando...':PH.src==='lib'?'Nenhuma foto importada ainda.<br>Use <b>Importar fotos</b> ou arraste arquivos PNG, JPG, WEBP ou BMP para esta janela.':'Nenhuma imagem nesta pasta.'}</div>`;
 const c=$('#phc');if(c)c.textContent=PH.load?'':PH.list.length+' foto(s)';phObserve()}
function photosView(){
 const dirs=(PX?S.phdirs:[]).map(d=>'pc:'+d),opts=['lib',...dirs,...(PH.fs?['fs']:[])];
 if(!opts.includes(PH.src)){PH.src='lib';phLoad()}
 return`<div class="fl phbar"><select data-i="phsrc" aria-label="Fonte das fotos">${opts.map(o=>`<option value="${esc(o)}" ${o===PH.src?'selected':''} title="${esc(o.startsWith('pc:')?o.slice(3):'')}">${esc(phName(o))}</option>`).join('')}</select>
 <button class="p" data-a="phimp">Importar fotos</button><input type="file" id="phf" accept=".png,.jpg,.jpeg,.webp,.bmp,image/png,image/jpeg,image/webp,image/bmp" multiple hidden data-i="phfile">
 ${PX?`<button data-a="phdir">Adicionar pasta</button><button data-a="phpics">Pasta Imagens</button>`:window.showDirectoryPicker?`<button data-a="phdir">Abrir pasta</button>`:''}
 <select data-i="phsort" aria-label="Ordenar">${optH({new:'Mais recentes',old:'Mais antigas',name:'Nome',size:'Tamanho'},PH.sort)}</select>
 ${PH.src.startsWith('pc:')?`<button data-a="phdirrm" title="Tira a pasta da lista (não apaga nada)">Remover pasta da lista</button>`:''}<span class="m sm" id="phc"></span></div>
 <div id="phg" class="phg" aria-live="polite"></div>
 <div class="m sm" style="margin-top:8px">Formatos: PNG, JPG, JPEG, WEBP e BMP. Editar nunca altera o arquivo original: o resultado vira uma cópia.</div>`}
R.photos=photosView;
/* ---- Importar ---- */
async function phImport(files){
 let n=0,bad=0;
 for(const f of files){
  const mime=phMime(f.name)||(/^image\/(png|jpeg|webp|bmp)$/.test(f.type)?f.type:'');
  if(!mime){bad++;continue}
  if(S.photos.length>=1000){notify('Biblioteca cheia (1000 fotos).');break}
  try{const blob=f.type===mime?f:f.slice(0,f.size,mime),bm=await createImageBitmap(blob),w=bm.width,h=bm.height;bm.close();
   const id=await IMG.add(blob,'ph');S.photos.unshift({id,n:f.name.slice(0,120),t:mime,s:f.size,w,h,c:Date.now()});n++}
  catch(e){bad++}}
 save();if(n||bad)notify(`${n} foto(s) importada(s)${bad?`, ${bad} ignorada(s) (formato inválido)`:''}.`);
 if(PH.src==='lib')phLoad()}
document.addEventListener('dragover',e=>{if(cur==='photos'&&e.dataTransfer&&[...e.dataTransfer.types].includes('Files'))e.preventDefault()});
document.addEventListener('drop',e=>{if(cur!=='photos'||!e.dataTransfer||!e.dataTransfer.files.length)return;e.preventDefault();PH.src='lib';phImport([...e.dataTransfer.files])});

/* ---- Wallpaper ---- */
async function phSetWall(blob){
 try{const f=new File([blob],'wall',{type:blob.type||'image/png'}),id=await IMG.add(await imgProc(f,2600));S.t.wimg=id;S.t.wall='img';apply();save();notify('Wallpaper do PUNK HUB atualizado.');gcImgs()}
 catch(e){notify('Não consegui usar esta imagem: '+(e.message||e))}}

/* ---- Visualizador ---- */
function pvEnsure(){
 if($('#pv'))return;const d=document.createElement('div');d.id='pv';d.hidden=true;d.className='g';d.setAttribute('role','dialog');d.setAttribute('aria-label','Visualizador de fotos');
 d.innerHTML=`<div class="pvt"><b id="pvn"></b><span class="m sm" id="pvi2"></span><span class="fl" id="pvb"></span></div><div id="pvs"><img id="pvi" alt="" draggable="false"><canvas id="pec" hidden></canvas><div id="pcr" hidden></div></div>
 <button class="pvn l" data-a="phprev" aria-label="Foto anterior">‹</button><button class="pvn r" data-a="phnext" aria-label="Próxima foto">›</button><aside id="pep" hidden></aside>`;
 document.body.appendChild(d);
 const s=$('#pvs');
 s.addEventListener('wheel',e=>{if(PH.ed)return;e.preventDefault();pvZoomAt(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY)},{passive:false});
 let drag=null;
 s.addEventListener('pointerdown',e=>{if(PH.ed||e.button)return;drag={x:e.clientX,y:e.clientY,ox:PH.v.x,oy:PH.v.y};s.setPointerCapture(e.pointerId);s.classList.add('dg')});
 s.addEventListener('pointermove',e=>{if(!drag)return;PH.v.x=drag.ox+e.clientX-drag.x;PH.v.y=drag.oy+e.clientY-drag.y;pvApply()});
 s.addEventListener('pointerup',()=>{drag=null;s.classList.remove('dg')});s.addEventListener('pointercancel',()=>{drag=null;s.classList.remove('dg')});
 s.addEventListener('dblclick',e=>{if(PH.ed)return;const f=pvFit();if(Math.abs(PH.v.z-f)<.01)pvZoomAt(1/PH.v.z,e.clientX,e.clientY);else pvFitView()});
 let idle;d.addEventListener('pointermove',()=>{d.classList.remove('idle');clearTimeout(idle);if(document.fullscreenElement===d)idle=setTimeout(()=>d.classList.add('idle'),2500)});
 d.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)d.classList.remove('idle');pvFitView()});
 new ResizeObserver(()=>{if(!d.hidden&&!PH.ed)pvFitView(true)}).observe(s)}
const pvFit=()=>{const s=$('#pvs'),v=PH.v;return v.nw?Math.min(s.clientWidth/v.nw,s.clientHeight/v.nh,1):1};
function pvApply(){const v=PH.v,i=$('#pvi');i.style.width=v.nw+'px';i.style.height=v.nh+'px';i.style.transform=`translate(${v.x}px,${v.y}px) scale(${v.z})`;$('#pvi2').textContent=v.nw?`${v.nw}x${v.nh} | ${Math.round(v.z*100)}%`:''}
function pvFitView(keep){const s=$('#pvs'),v=PH.v;if(!v.nw)return;if(keep&&Math.abs(v.z-v._f)>.001&&v._f)return;v.z=pvFit();v._f=v.z;v.x=(s.clientWidth-v.nw*v.z)/2;v.y=(s.clientHeight-v.nh*v.z)/2;pvApply()}
function pvZoomAt(f,cx,cy){const s=$('#pvs'),r=s.getBoundingClientRect(),v=PH.v,z=clamp(v.z*f,.02,32),k=z/v.z,px=cx-r.left,py=cy-r.top;v.x=px-(px-v.x)*k;v.y=py-(py-v.y)*k;v.z=z;pvApply()}
function pvButtons(){
 const it=PH.list[PH.i];if(!it)return;
 $('#pvb').innerHTML=`<button data-a="pvz" data-k="out" aria-label="Diminuir zoom">-</button><button data-a="pvz" data-k="in" aria-label="Aumentar zoom">+</button><button data-a="pvz" data-k="fit">Ajustar</button><button data-a="pvz" data-k="one">100%</button><button data-a="pvfs">Tela cheia</button>
 <button class="p" data-a="phwall">Definir como wallpaper</button><button data-a="phedit">Editar</button>${it.k==='pc'&&PX?'<button data-a="phreveal">Mostrar na pasta</button>':''}${it.k==='lib'?`<button data-a="phrm" class="${PH.arm?'on':''}">${PH.arm?'Confirmar remoção':'Remover da biblioteca'}</button>`:''}<button data-a="pvclose" aria-label="Fechar">×</button>`}
async function pvShow(i){
 pvEnsure();const L=PH.list;if(!L.length)return pvClose();i=(i+L.length)%L.length;PH.i=i;PH.arm=0;const it=L[i],v=PH.v;
 if(PH.url&&PH.url.startsWith('blob:')&&it.k==='fs')URL.revokeObjectURL(PH.url);
 $('#pv').hidden=false;$('#pvn').textContent=`${it.name} (${i+1}/${L.length})`;pvButtons();
 const im=$('#pvi');im.hidden=false;$('#pec').hidden=true;
 try{PH.url=await phUrl(it)}catch(e){return notify('Não foi possível abrir: '+(e.message||e))}
 if(PH.i!==i)return;
 im.onload=()=>{v.nw=im.naturalWidth;v.nh=im.naturalHeight;v._f=0;pvFitView()};im.onerror=()=>notify('Não foi possível exibir esta imagem.');im.src=PH.url}
function pvClose(){
 if(document.fullscreenElement===$('#pv'))document.exitFullscreen().catch(()=>{});
 const p=$('#pv');if(!p)return;if(PH.ed)edDrop();p.hidden=true;const im=$('#pvi');im.removeAttribute('src');if(PH.url&&PH.url.startsWith('blob:')&&PH.list[PH.i]&&PH.list[PH.i].k==='fs')URL.revokeObjectURL(PH.url);PH.url='';PH.v.nw=0}
document.addEventListener('keydown',e=>{
 const p=$('#pv');if(!p||p.hidden||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 const k=e.key;
 if(PH.ed){if(k==='Escape'){e.stopImmediatePropagation();A.edcancel()}return}
 if(k==='Escape'){e.stopImmediatePropagation();if(!document.fullscreenElement)pvClose()}
 else if(k==='ArrowRight')pvShow(PH.i+1);else if(k==='ArrowLeft')pvShow(PH.i-1);
 else if(k==='+'||k==='=')A.pvz({dataset:{k:'in'}});else if(k==='-')A.pvz({dataset:{k:'out'}});else if(k==='0')pvFitView();else if(k==='1')A.pvz({dataset:{k:'one'}});else if(k==='f'||k==='F')A.pvfs()},true);

/* ---- Editor ---- */
const ED_MAX=6000;
const cnv=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
function edDrop(){if(PH.ed){PH.ed.cur=null;PH.ed.stack=[];PH.ed=null}const c=$('#pec');if(c){c.width=c.height=1;c.hidden=true}$('#pep').hidden=true;$('#pcr').hidden=true;$('#pv').classList.remove('editing')}
async function edStart(){
 const it=PH.list[PH.i];if(!it)return;let blob;try{blob=await phBlob(it)}catch(e){return notify('Não foi possível ler a foto: '+(e.message||e))}
 let bm=await createImageBitmap(blob),sc=Math.min(1,ED_MAX/Math.max(bm.width,bm.height));
 if(sc<1){const b2=await createImageBitmap(blob,{resizeWidth:Math.round(bm.width*sc),resizeHeight:Math.round(bm.height*sc),resizeQuality:'high'});bm.close();bm=b2;toast('Foto muito grande: a edição trabalha em até '+ED_MAX+' px')}
 const c=cnv(bm.width,bm.height);c.getContext('2d').drawImage(bm,0,0);bm.close();
 const ext=phExt(it.name),fmt={jpg:'jpeg',jpeg:'jpeg',webp:'webp'}[ext]||'png';
 PH.ed={it,cur:c,stack:[],b:100,c:100,fmt,q:92,lock:1,crop:null,asp:0,base:phBase(it.name)};
 $('#pvi').hidden=true;$('#pec').hidden=false;$('#pv').classList.add('editing');$('#pep').hidden=false;edUI();edDraw()}
function edDraw(){
 const e=PH.ed,s=$('#pvs'),cv=$('#pec'),W=s.clientWidth-30,H=s.clientHeight-30,k=Math.min(W/e.cur.width,H/e.cur.height,1);
 cv.width=Math.max(1,Math.round(e.cur.width*k));cv.height=Math.max(1,Math.round(e.cur.height*k));cv.getContext('2d').drawImage(e.cur,0,0,cv.width,cv.height);
 cv.style.filter=edFilter();cv.style.left=(s.clientWidth-cv.width)/2+'px';cv.style.top=(s.clientHeight-cv.height)/2+'px';
 const sz=$('#edsz');if(sz)sz.textContent=`${e.cur.width} x ${e.cur.height} px`;
 const w=$('#edw'),h=$('#edh');if(w){w.value=e.cur.width;h.value=e.cur.height}}
const edFilter=()=>`brightness(${PH.ed.b}%) contrast(${PH.ed.c}%)`;
function edPush(n){const e=PH.ed;e.stack.push(e.cur);if(e.stack.length>6)e.stack.shift();e.cur=n;edCrop(0);edDraw();edUI(1)}
function edUI(soft){
 const e=PH.ed,p=$('#pep');if(soft){const u=$('#edundo');if(u)u.disabled=!e.stack.length;return}
 p.innerHTML=`<h3>Editar</h3><div class="m sm" id="edsz"></div>
 <div class="fl"><button data-a="edrot" data-k="-1" aria-label="Girar à esquerda">↺ 90</button><button data-a="edrot" data-k="1" aria-label="Girar à direita">↻ 90</button><button data-a="edflip" data-k="h">Espelhar H</button><button data-a="edflip" data-k="v">Espelhar V</button></div>
 <h3>Cortar</h3><div class="fl"><select data-i="edasp" aria-label="Proporção"><option value="0">Livre</option><option value="1">1:1</option><option value="1.3333">4:3</option><option value="1.7778">16:9</option><option value="0.75">3:4</option><option value="0.5625">9:16</option></select><button data-a="edcropt">Selecionar área</button><button class="p" data-a="edcropok" id="edcok" disabled>Aplicar corte</button></div><div class="m sm">Arraste sobre a foto para marcar a área.</div>
 <h3>Redimensionar</h3><div class="fl"><input type="number" id="edw" data-i="edw" min="8" max="8000" style="width:5.5em" aria-label="Largura"> x <input type="number" id="edh" data-i="edh" min="8" max="8000" style="width:5.5em" aria-label="Altura"><label><input type="checkbox" data-i="edlock" ${e.lock?'checked':''}> manter proporção</label></div><div class="fl" style="margin-top:6px"><button data-a="edpct" data-k="50">50%</button><button data-a="edpct" data-k="75">75%</button><button data-a="edpct" data-k="200">200%</button><button class="p" data-a="edresize">Aplicar tamanho</button></div>
 <h3>Cor</h3><label class="row"><span>Brilho <b class="m" id="v-edb">${e.b}</b>%</span><input type="range" data-i="edb" min="20" max="200" value="${e.b}"></label><label class="row"><span>Contraste <b class="m" id="v-edc">${e.c}</b>%</span><input type="range" data-i="edc" min="20" max="200" value="${e.c}"></label>
 <div class="fl"><button data-a="edundo" id="edundo" ${e.stack.length?'':'disabled'}>Desfazer</button><button data-a="edreset">Restaurar original</button></div>
 <h3>Salvar</h3><div class="fl"><select data-i="edfmt" aria-label="Formato">${optH({png:'PNG',jpeg:'JPG',webp:'WEBP'},e.fmt)}</select><label>Qualidade <input type="range" data-i="edq" min="40" max="100" value="${e.q}" style="width:7em"></label></div>
 <div class="fl" style="margin-top:6px"><button class="p" data-a="edsave">${e.it.k==='pc'&&PX?'Salvar cópia ao lado do original':'Salvar cópia na biblioteca'}</button><button data-a="edsaveas">${PX?'Salvar como...':'Baixar'}</button><button data-a="edwall">Usar como wallpaper</button><button data-a="edcancel">Sair do editor</button></div><div class="m sm">O arquivo original não é alterado. BMP é salvo como PNG.</div>`;
 edDraw()}
function edRender(){const e=PH.ed,o=cnv(e.cur.width,e.cur.height),x=o.getContext('2d');
 if(e.fmt==='jpeg'){x.fillStyle='#fff';x.fillRect(0,0,o.width,o.height)}x.filter=edFilter();x.drawImage(e.cur,0,0);
 return new Promise(r=>o.toBlob(r,'image/'+e.fmt,e.q/100))}
/* recorte: retângulo em coordenadas do canvas exibido */
function edCrop(on){const r=$('#pcr'),e=PH.ed;if(!e)return;if(!on){e.crop=null;r.hidden=true;const b=$('#edcok');if(b)b.disabled=true;e.cropOn=0;return}e.cropOn=1;toast('Arraste sobre a foto para marcar a área')}
document.addEventListener('pointerdown',ev=>{
 const e=PH.ed;if(!e||!e.cropOn)return;const cv=$('#pec');if(!ev.target.closest('#pvs'))return;const cr=cv.getBoundingClientRect();
 if(ev.clientX<cr.left||ev.clientX>cr.right||ev.clientY<cr.top||ev.clientY>cr.bottom)return;ev.preventDefault();
 const x0=ev.clientX-cr.left,y0=ev.clientY-cr.top,box=$('#pcr'),st=$('#pvs').getBoundingClientRect();let ptr=ev.pointerId;
 const mv=m=>{let x1=clamp(m.clientX-cr.left,0,cr.width),y1=clamp(m.clientY-cr.top,0,cr.height),w=x1-x0,h=y1-y0;
  if(e.asp){const a=e.asp;if(Math.abs(w)/a>Math.abs(h))w=Math.sign(w||1)*Math.abs(h)*a;else h=Math.sign(h||1)*Math.abs(w)/a;
   if(x0+w<0||x0+w>cr.width)w=Math.sign(w)*Math.min(Math.abs(w),w<0?x0:cr.width-x0),h=Math.sign(h||1)*Math.abs(w)/a;
   if(y0+h<0||y0+h>cr.height)h=Math.sign(h)*Math.min(Math.abs(h),h<0?y0:cr.height-y0),w=Math.sign(w||1)*Math.abs(h)*a}
  const l=Math.min(x0,x0+w),t=Math.min(y0,y0+h),W=Math.abs(w),H=Math.abs(h);e.crop={l,t,w:W,h:H};
  box.hidden=false;box.style.cssText=`left:${cr.left-st.left+l}px;top:${cr.top-st.top+t}px;width:${W}px;height:${H}px`;const b=$('#edcok');if(b)b.disabled=!(W>6&&H>6)};
 const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up)};addEventListener('pointermove',mv);addEventListener('pointerup',up)},true);
const edDownload=async(blob,name)=>{if(MOB&&await mobSave(blob,name).catch(()=>false))return;const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000)};
Object.assign(A,{
 phopen:a=>{pvShow(+a.dataset.i)},phprev:()=>pvShow(PH.i-1),phnext:()=>pvShow(PH.i+1),pvclose:()=>pvClose(),
 phmore:()=>{if(PH.n>=PH.list.length)return;PH.n+=80;phGrid()},
 phimp:()=>$('#phf').click(),
 phdir:async()=>{
  if(PX){const d=await PX.pickFolder();if(!d)return;if(!S.phdirs.includes(d)){S.phdirs.push(d);S.phdirs=S.phdirs.slice(-10);save()}PH.src='pc:'+d;ren();phLoad();return}
  try{PH.fs=await showDirectoryPicker({mode:'read'});PH.src='fs';ren();phLoad()}catch(e){if(e.name!=='AbortError')notify('Não foi possível abrir a pasta.')}},
 phpics:async()=>{const d=await PX.picturesDir();if(!d)return;if(!S.phdirs.includes(d)){S.phdirs.push(d);save()}PH.src='pc:'+d;ren();phLoad()},
 phdirrm:()=>{const d=PH.src.slice(3);S.phdirs=S.phdirs.filter(x=>x!==d);save();PH.src='lib';ren();phLoad()},
 pvz:a=>{const s=$('#pvs'),r=s.getBoundingClientRect(),k=a.dataset.k;if(k==='fit')return pvFitView();const cx=r.left+r.width/2,cy=r.top+r.height/2;if(k==='in')pvZoomAt(1.25,cx,cy);else if(k==='out')pvZoomAt(.8,cx,cy);else pvZoomAt(1/PH.v.z,cx,cy)},
 pvfs:()=>{const p=$('#pv');(document.fullscreenElement?document.exitFullscreen():p.requestFullscreen()).catch(()=>notify('Tela cheia indisponível.'))},
 phwall:async()=>{const it=PH.list[PH.i];if(it)phSetWall(await phBlob(it))},
 phreveal:()=>{const it=PH.list[PH.i];if(it&&PX)PX.reveal(it.path)},
 phrm:()=>{if(!PH.arm){PH.arm=1;return pvButtons()}const it=PH.list[PH.i];S.photos=S.photos.filter(p=>p.id!==it.id);save();PH.list.splice(PH.i,1);gcImgs();phGrid();PH.arm=0;if(PH.list.length)pvShow(Math.min(PH.i,PH.list.length-1));else pvClose()},
 phedit:()=>edStart(),
 edrot:a=>{const e=PH.ed,s=e.cur,n=cnv(s.height,s.width),x=n.getContext('2d');x.translate(n.width/2,n.height/2);x.rotate(+a.dataset.k*Math.PI/2);x.drawImage(s,-s.width/2,-s.height/2);edPush(n)},
 edflip:a=>{const e=PH.ed,s=e.cur,n=cnv(s.width,s.height),x=n.getContext('2d');if(a.dataset.k==='h'){x.translate(n.width,0);x.scale(-1,1)}else{x.translate(0,n.height);x.scale(1,-1)}x.drawImage(s,0,0);edPush(n)},
 edcropt:()=>edCrop(1),
 edcropok:()=>{const e=PH.ed,c=e.crop,cv=$('#pec');if(!c||c.w<6||c.h<6)return;const k=e.cur.width/cv.width,sx=Math.round(c.l*k),sy=Math.round(c.t*k),sw=Math.max(1,Math.min(e.cur.width-sx,Math.round(c.w*k))),sh=Math.max(1,Math.min(e.cur.height-sy,Math.round(c.h*k))),n=cnv(sw,sh);n.getContext('2d').drawImage(e.cur,sx,sy,sw,sh,0,0,sw,sh);edPush(n)},
 edpct:a=>{const e=PH.ed,k=+a.dataset.k/100;$('#edw').value=Math.round(e.cur.width*k);$('#edh').value=Math.round(e.cur.height*k)},
 edresize:()=>{const e=PH.ed,w=Math.round(clamp($('#edw').value,8,8000)),h=Math.round(clamp($('#edh').value,8,8000));if(w===e.cur.width&&h===e.cur.height)return;const n=cnv(w,h),x=n.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(e.cur,0,0,w,h);edPush(n)},
 edundo:()=>{const e=PH.ed;if(!e.stack.length)return;e.cur=e.stack.pop();edCrop(0);edDraw();edUI(1)},
 edreset:()=>edStart(),
 edcancel:()=>{edDrop();$('#pvi').hidden=false;pvFitView()},
 edsave:async()=>{const e=PH.ed,blob=await edRender(),it=e.it,ext=e.fmt==='jpeg'?'jpg':e.fmt;
  if(it.k==='pc'&&PX){try{const p=await PX.saveCopy({orig:it.path,ext,bytes:await blob.arrayBuffer()});notify('Cópia salva em '+p);if(PH.src.startsWith('pc:'))phLoad()}catch(x){notify('Não foi possível salvar: '+(x.message||x))}return}
  await phImport([new File([blob],`${e.base}-editado.${ext}`,{type:blob.type})]);toast('Cópia adicionada à biblioteca')},
 edsaveas:async()=>{const e=PH.ed,blob=await edRender(),ext=e.fmt==='jpeg'?'jpg':e.fmt;
  if(PX){try{const p=await PX.saveAs({name:`${e.base}-editado.${ext}`,orig:e.it.path||'',ext,bytes:await blob.arrayBuffer()});if(p)notify('Salvo em '+p)}catch(x){notify('Não foi possível salvar: '+(x.message||x))}return}
  edDownload(blob,`${e.base}-editado.${ext}`)},
 edwall:async()=>phSetWall(await edRender())});
Object.assign(I,{
 phsrc:e=>{PH.src=e.value;phLoad();ren()},phsort:e=>{PH.sort=e.value;phLoad()},
 phfile:e=>{const f=[...e.files];e.value='';phImport(f)},
 edasp:e=>{PH.ed.asp=+e.value;edCrop(0);edCrop(1)},
 edb:e=>{PH.ed.b=+e.value;$('#v-edb').textContent=e.value;$('#pec').style.filter=edFilter()},
 edc:e=>{PH.ed.c=+e.value;$('#v-edc').textContent=e.value;$('#pec').style.filter=edFilter()},
 edq:e=>{PH.ed.q=+e.value},edfmt:e=>{PH.ed.fmt=e.value},edlock:e=>{PH.ed.lock=e.checked?1:0},
 edw:e=>{const c=PH.ed.cur;if(PH.ed.lock)$('#edh').value=Math.max(8,Math.round(e.value*c.height/c.width))},
 edh:e=>{const c=PH.ed.cur;if(PH.ed.lock)$('#edw').value=Math.max(8,Math.round(e.value*c.width/c.height))}});
