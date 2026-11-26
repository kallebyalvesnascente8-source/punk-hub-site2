/* =====================================================================
   94 MÚSICA (PUNK Music)
   - Um único <audio> global: a música continua com qualquer janela aberta.
   - Visual 100% herdado das variáveis do tema ativo (nada de tema próprio).
   - Fontes de áudio: 'a' = cópia na biblioteca do app (IndexedDB, funciona no navegador
     e no futuro Android) ou 'p' = arquivo no PC lido onde está (Electron, sem copiar).
   - Formatos: MP3, WAV, FLAC, OGG. Tags e capa lidas direto dos bytes (sem bibliotecas).
   ===================================================================== */
const MU_EXT={mp3:'mp3',wav:'wav',flac:'flac',ogg:'ogg'},MU_MAX=3000;
const muExt=n=>{const m=/\.([a-z0-9]+)$/i.exec(n||'');return m&&MU_EXT[m[1].toLowerCase()]||''};
const MU={a:new Audio(),url:'',q:[],base:[],i:-1,cur:'',view:'all',search:'',sort:'add',n:100,menu:'',arm:'',imp:null,keys:new Set(),cv:new Map(),tok:0,seq:0,err:0,hlog:'',loaded:'',tm:0,ts:0,rt:new Map()};
MU.a.preload='metadata';
const muId=p=>p+uid()+(MU.seq++).toString(36),muM=()=>S.music;
const muT=id=>muM().tracks.find(t=>t.id===id)||MU.rt.get(id)||null;
const muTm=s=>{s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
/* ---- ícones (herdam a cor do tema via currentColor) ---- */
const MI={play:'<path d="M8 5v14l11-7z"/>',pause:'<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',next:'<path d="M6 5l9 7-9 7zM17 5h2v14h-2z"/>',prev:'<path d="M18 5l-9 7 9 7zM5 5h2v14H5z"/>',
 shuf:'<path d="M3 7h3c4 0 5 10 9 10h3M3 17h3c1.5 0 2.6-1.2 3.6-2.8M13.5 9.2C14.4 8 15.6 7 17 7h1M16 4l3 3-3 3M16 14l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
 rep:'<path d="M4 11V9a3 3 0 013-3h11M15 3l3 3-3 3M20 13v2a3 3 0 01-3 3H6M9 21l-3-3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
 rep1:'<path d="M4 11V9a3 3 0 013-3h11M15 3l3 3-3 3M20 13v2a3 3 0 01-3 3H6M9 21l-3-3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 10l1.5-1v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
 heart:'<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
 heartf:'<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
 note:'<path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="16.5" cy="16" r="2.5" fill="currentColor"/>',
 vol:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8a5 5 0 010 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
 mute:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
 more:'<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>'};
const mi=(k,s=18)=>`<svg class="mi" viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true">${MI[k]}</svg>`;

/* ---- leitura de tags: ID3 (MP3), Vorbis/FLAC, OGG, WAV ---- */
const ascii=(b,o,n)=>{let s='';for(let i=0;i<n&&o+i<b.length;i++)s+=String.fromCharCode(b[o+i]);return s};
const be32=(b,o)=>b[o]*16777216+(b[o+1]<<16)+(b[o+2]<<8)+b[o+3],le32=(b,o)=>b[o]+(b[o+1]<<8)+(b[o+2]<<16)+b[o+3]*16777216,sync4=(b,o)=>((b[o]&127)<<21)|((b[o+1]&127)<<14)|((b[o+2]&127)<<7)|(b[o+3]&127);
const u8=(x)=>x instanceof Uint8Array?x:new Uint8Array(x);
const rdFile=f=>async(o,l)=>new Uint8Array(await f.slice(o,o+l).arrayBuffer());
const rdUrl=u=>async(o,l)=>{try{const r=await fetch(u,{headers:{Range:`bytes=${o}-${o+l-1}`}});if(!r.ok)return new Uint8Array(0);const b=new Uint8Array(await r.arrayBuffer());return r.status===206?b:b.subarray(o,o+l)}catch(e){return new Uint8Array(0)}};
const decText=(b,enc)=>{let s;try{if(enc===1){let le=true,o=0;if(b[0]===0xFE&&b[1]===0xFF){le=false;o=2}else if(b[0]===0xFF&&b[1]===0xFE)o=2;s=new TextDecoder(le?'utf-16le':'utf-16be').decode(b.subarray(o))}else if(enc===2)s=new TextDecoder('utf-16be').decode(b);else if(enc===3)s=new TextDecoder('utf-8').decode(b);else s=new TextDecoder('windows-1252').decode(b)}catch(e){s=''}return s.split('\0')[0].trim()};
const picFrom=(b,o)=>{ /* estrutura FLAC PICTURE (também usada no OGG) */
 try{const type=be32(b,o);let p=o+4;const ml=be32(b,p);p+=4;const mime=ascii(b,p,ml);p+=ml;const dl=be32(b,p);p+=4+dl+16;const n=be32(b,p);p+=4;return{type,mime,data:b.subarray(p,p+n)}}catch(e){return null}};
function vorbisC(b,o){const m={};try{const vl=le32(b,o);o+=4+vl;const n=Math.min(le32(b,o),2000);o+=4;for(let i=0;i<n&&o+4<=b.length;i++){const l=le32(b,o);o+=4;if(o+l>b.length)break;const s=new TextDecoder('utf-8').decode(b.subarray(o,o+l));o+=l;const k=s.indexOf('=');if(k>0){const key=s.slice(0,k).toUpperCase();if(!(key in m))m[key]=s.slice(k+1)}}}catch(e){}return m}
function fromVorbis(m){const r={title:m.TITLE||'',artist:m.ARTIST||m.ALBUMARTIST||'',album:m.ALBUM||'',year:(m.DATE||m.YEAR||'').slice(0,4),tn:parseInt(m.TRACKNUMBER)||0};if(m.METADATA_BLOCK_PICTURE){try{const bin=atob(m.METADATA_BLOCK_PICTURE),b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);const p=picFrom(b,0);if(p&&p.data.length)r.pic=p}catch(e){}}return r}
async function tagId3(rd,h){
 const ver=h[3],fl=h[5],size=sync4(h,6),b=await rd(10,Math.min(size,8388608)),out={};let o=0;
 if((fl&0x40)&&ver>=3&&b.length>4)o=ver===4?sync4(b,0):be32(b,0)+4;
 const hl=ver===2?6:10;
 while(o+hl<=b.length){
  const id=ver===2?ascii(b,o,3):ascii(b,o,4);let fs;
  if(ver===2)fs=(b[o+3]<<16)|(b[o+4]<<8)|b[o+5];else fs=ver===4?sync4(b,o+4):be32(b,o+4);
  if(!/^[A-Z0-9]{3,4}$/.test(id)||fs<=0||o+hl+fs>b.length)break;
  const d=b.subarray(o+hl,o+hl+fs);o+=hl+fs;
  const txt=()=>decText(d.subarray(1),d[0]);
  if(id==='TIT2'||id==='TT2')out.title=txt();else if(id==='TPE1'||id==='TP1')out.artist=txt();else if(id==='TPE2'||id==='TP2')out.artist2=txt();else if(id==='TALB'||id==='TAL')out.album=txt();
  else if(id==='TDRC'||id==='TYER'||id==='TYE')out.year=(txt()||'').slice(0,4);else if(id==='TRCK'||id==='TRK')out.tn=parseInt(txt())||0;
  else if((id==='APIC'||id==='PIC')&&!out.pic){
   try{const enc=d[0];let p=1,mime;if(id==='PIC'){mime='image/'+ascii(d,1,3).toLowerCase().replace('jpg','jpeg');p=4}else{let e=p;while(e<d.length&&d[e]!==0)e++;mime=ascii(d,p,e-p);p=e+1}
    p++;if(enc===1||enc===2){while(p+1<d.length&&!(d[p]===0&&d[p+1]===0))p+=2;p+=2}else{while(p<d.length&&d[p]!==0)p++;p++}
    if(p<d.length)out.pic={mime:/^image\//.test(mime)?mime:'image/jpeg',data:d.subarray(p)}}catch(e){}}}
 if(!out.artist&&out.artist2)out.artist=out.artist2;
 return{out,end:10+size}}
async function tagFlac(rd,base){
 const out={};let off=base+4;
 for(let i=0;i<64;i++){const hd=await rd(off,4);if(hd.length<4)break;const last=hd[0]&128,type=hd[0]&127,len=(hd[1]<<16)|(hd[2]<<8)|hd[3];
  if(type===0&&len>=18){const b=await rd(off+4,18),sr=(b[10]<<12)|(b[11]<<4)|(b[12]>>4),tot=(b[13]&15)*4294967296+be32(b,14);if(sr&&tot)out.dur=tot/sr}
  else if(type===4&&len<4e6){const b=await rd(off+4,len);Object.assign(out,fromVorbis(vorbisC(b,0)))}
  else if(type===6&&len<16e6&&!out.pic){const b=await rd(off+4,len),p=picFrom(b,0);if(p&&p.data.length)out.pic={mime:p.mime,data:p.data}}
  off+=4+len;if(last)break}
 return out}
async function tagOgg(rd){
 for(const sz of[262144,4194304]){
  const b=await rd(0,sz);if(ascii(b,0,4)!=='OggS')return{};
  let o=0,cur=[],pk=[];
  while(o+27<=b.length&&pk.length<2){if(ascii(b,o,4)!=='OggS')break;const ns=b[o+26];let p=o+27+ns;
   for(let k=0;k<ns;k++){const sl=b[o+27+k];cur.push(b.subarray(p,p+sl));p+=sl;if(sl<255){const n=cur.reduce((a,x)=>a+x.length,0),j=new Uint8Array(n);let q=0;for(const x of cur){j.set(x,q);q+=x.length}pk.push(j);cur=[]}}
   o=p}
  if(pk.length<2){if(b.length<sz)return{};continue}
  const c=pk[1];let off=-1;if(c[0]===3&&ascii(c,1,6)==='vorbis')off=7;else if(ascii(c,0,8)==='OpusTags')off=8;
  return off<0?{}:fromVorbis(vorbisC(c,off))}
 return{}}
async function tagWav(rd){
 const out={};let off=12,rate=0;
 for(let i=0;i<24;i++){const h=await rd(off,8);if(h.length<8)break;const id=ascii(h,0,4),sz=le32(h,4);
  if(id==='fmt '){const b=await rd(off+8,16);rate=le32(b,8)}
  else if(id==='data'){if(rate)out.dur=sz/rate}
  else if(id==='LIST'&&sz<65536){const b=await rd(off+8,sz);if(ascii(b,0,4)==='INFO'){let p=4;while(p+8<=b.length){const k=ascii(b,p,4),l=le32(b,p+4),v=decText(b.subarray(p+8,p+8+l),3);p+=8+l+(l&1);if(k==='INAM')out.title=v;else if(k==='IART')out.artist=v;else if(k==='IPRD')out.album=v;else if(k==='ICRD')out.year=v.slice(0,4);else if(k==='ITRK')out.tn=parseInt(v)||0}}}
  off+=8+sz+(sz&1)}
 return out}
async function readTags(rd){
 const h=await rd(0,10);if(h.length<4)return{};
 if(ascii(h,0,3)==='ID3'&&h.length>=10){const{out,end}=await tagId3(rd,h);const n=await rd(end,4);if(ascii(n,0,4)==='fLaC')Object.assign(out,await tagFlac(rd,end));return out}
 if(ascii(h,0,4)==='fLaC')return tagFlac(rd,0);
 if(ascii(h,0,4)==='OggS')return tagOgg(rd);
 if(ascii(h,0,4)==='RIFF')return tagWav(rd);
 return{}}
/* ---- capa: reduz para 256 px (poucos KB), repete por álbum ---- */
async function muCoverBlob(pic){
 try{const bmp=await createImageBitmap(new Blob([pic.data],{type:pic.mime||'image/jpeg'})),sc=Math.min(1,256/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(bmp.width*sc));c.height=Math.max(1,Math.round(bmp.height*sc));c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);bmp.close&&bmp.close();
  return await new Promise(r=>c.toBlob(r,'image/jpeg',.82))}catch(e){return null}}
const cvKey=(al,ar)=>al?(al+'|'+ar).toLowerCase():'';
const muCvp=new Map();
async function muCover(pic,al,ar){
 if(!pic||!pic.data||!pic.data.length)return'';const k=cvKey(al,ar);
 if(k){if(MU.cv.has(k))return MU.cv.get(k);if(muCvp.has(k))return muCvp.get(k)}
 const job=(async()=>{const b=await muCoverBlob(pic);if(!b)return'';const id=await IMG.add(b,'cv');if(k)MU.cv.set(k,id);return id})();
 if(k){muCvp.set(k,job);job.finally(()=>muCvp.delete(k))}
 return job}
function muDur(url,rev){return new Promise(res=>{const a=new Audio();let done=0;const end=v=>{if(done)return;done=1;clearTimeout(t);a.removeAttribute('src');a.load();if(rev)URL.revokeObjectURL(url);res(v)};const t=setTimeout(()=>end(0),6000);a.preload='metadata';a.onloadedmetadata=()=>end(isFinite(a.duration)?a.duration:0);a.onerror=()=>end(0);a.src=url})}
async function muMeta(name,rd,urlFn,rev){
 let m={};try{m=await readTags(rd)}catch(e){}
 const base=String(name).replace(/\.[^.]+$/,'');
 const t={n:(m.title||base).slice(0,200),ar:(m.artist||'').slice(0,150),al:(m.album||'').slice(0,150),y:/^\d{4}$/.test(m.year||'')?+m.year:0,tn:Math.min(999,m.tn|0),d:m.dur||0};
 if(!t.d)t.d=await muDur(urlFn(),rev);
 t.c=m.pic?await muCover(m.pic,t.al,t.ar):'';
 return t}
/* ---- biblioteca: importar ---- */
const PXM=PX&&PX.listAudio?PX:null;
function muIndexKeys(){MU.keys=new Set(muM().tracks.map(t=>t.k).filter(Boolean));MU.cv=new Map();for(const t of muM().tracks)if(t.c&&t.al)MU.cv.set(cvKey(t.al,t.ar),t.c)}
async function muRun(list,fn){
 MU.imp={done:0,total:list.length,add:0,skip:0};muPaintImp();let i=0;
 const w=async()=>{while(i<list.length){const x=list[i++];try{const r=await fn(x);if(r)MU.imp.add++;else MU.imp.skip++}catch(e){MU.imp.skip++}MU.imp.done++;muPaintImp();if(MU.imp.done%25===0)save()}};
 await Promise.all([w(),w()]);const r=MU.imp;MU.imp=null;save();muListPaint();muPaintImp();
 toast(r.add?`${r.add} música(s) adicionada(s)`+(r.skip?`, ${r.skip} ignorada(s)`:''):'Nada novo para adicionar.')}
const muRoom=()=>MU_MAX-muM().tracks.length;
async function muAddFile(f){
 if(muRoom()<=0)throw 0;const ext=muExt(f.name);if(!ext)return 0;
 const k=f.name+'|'+f.size+'|'+f.lastModified;if(MU.keys.has(k))return 0;MU.keys.add(k);
 const aid=muId('au');await IMG.tx('readwrite',s=>s.put(f,aid));
 const m=await muMeta(f.name,rdFile(f),()=>URL.createObjectURL(f),1);
 muM().tracks.push({id:muId('mu'),...m,s:f.size,t:ext,a:aid,p:'',k,ad:Date.now()});return 1}
async function muAddPath(it){
 if(muRoom()<=0)throw 0;const ext=muExt(it.name);if(!ext)return 0;if(MU.keys.has(it.path))return 0;MU.keys.add(it.path);
 const u=PX.audioUrl(it.path),m=await muMeta(it.name,rdUrl(u),()=>u,0);
 muM().tracks.push({id:muId('mu'),...m,s:it.size||0,t:ext,a:'',p:it.path,k:it.path,ad:Date.now()});return 1}
async function muImport(files){
 const L=[...files].filter(f=>muExt(f.name));
 if(!L.length){toast('Escolha arquivos MP3, WAV, FLAC ou OGG.');return}
 if(muRoom()<=0){toast('Limite de '+MU_MAX+' músicas na biblioteca.');return}
 await muRun(L,muAddFile)}
async function muImportPaths(items){if(muRoom()<=0){toast('Limite de '+MU_MAX+' músicas na biblioteca.');return}await muRun(items.filter(i=>muExt(i.name)),muAddPath)}
async function muScan(silent){
 if(!PXM)return;const m=muM();let dirs=m.dirs.slice(),all=[],ok=new Set();
 for(const d of dirs){try{const l=await PXM.listAudio(d);ok.add(d);all.push(...l)}catch(e){}}
 const have=new Set(all.map(x=>x.path)),rm=m.tracks.filter(t=>t.p&&[...ok].some(d=>t.p.toLowerCase().startsWith(d.toLowerCase()))&&!have.has(t.p));
 if(rm.length)muDrop(rm.map(t=>t.id));
 const nw=all.filter(x=>!MU.keys.has(x.path));
 if(nw.length)await muImportPaths(nw);else{muListPaint();if(!silent||rm.length)toast(rm.length?`${rm.length} música(s) que não existem mais saíram da biblioteca.`:'Biblioteca já está atualizada.')}}
function muDrop(ids){
 const m=muM(),set=new Set(ids),del=m.tracks.filter(t=>set.has(t.id));
 m.tracks=m.tracks.filter(t=>!set.has(t.id));m.fav=m.fav.filter(x=>!set.has(x));m.hist=m.hist.filter(h=>!set.has(h.id));m.pls.forEach(p=>p.t=p.t.filter(x=>!set.has(x)));
 MU.q=MU.q.filter(x=>!set.has(x));MU.base=MU.base.filter(x=>!set.has(x));
 if(set.has(MU.cur)){muStop();MU.cur='';m.cur='';m.pos=0}
 MU.i=Math.max(-1,MU.q.indexOf(MU.cur));
 const still=new Set(m.tracks.map(t=>t.c).filter(Boolean));
 for(const t of del){if(t.a)IMG.del(t.a);if(t.c&&!still.has(t.c)){IMG.del(t.c);for(const[k,v]of MU.cv)if(v===t.c)MU.cv.delete(k)}MU.keys.delete(t.k)}
 save()}
/* ---- reprodução ---- */
const muShuf=(a,first)=>{const r=a.filter(x=>x!==first);for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]]}return first&&a.includes(first)?[first,...r]:r};
function muStop(){const a=MU.a;a.pause();a.removeAttribute('src');a.load();if(MU.url){URL.revokeObjectURL(MU.url);MU.url=''}MU.loaded=''}
async function muLoad(id,play,pos){
 const t=muT(id);if(!t)return false;const tok=++MU.tok,a=MU.a;let url='';
 if(t.a){const b=await IMG.get(t.a);if(tok!==MU.tok)return null;if(!b){toast('Arquivo da biblioteca não encontrado: '+t.n);return false}url=URL.createObjectURL(b)}
 else if(t.u)url=t.u;else if(t.p&&PXM)url=PX.audioUrl(t.p);else{toast('Esta música está no PC e só abre no app para Windows.');return false}
 const old=MU.url;MU.url=t.a?url:'';a.src=url;if(old)URL.revokeObjectURL(old);
 MU.cur=id;MU.loaded=id;muM().cur=id;muM().pos=pos||0;
 if(pos)a.addEventListener('loadedmetadata',()=>{try{a.currentTime=pos}catch(e){}},{once:true});
 await IMG.load([t.c]);muMedia(t);muPaint();muListPaint();
 if(play){try{await a.play();MU.err=0}catch(e){if(e&&e.name==='NotAllowedError')toast('Toque em Play para iniciar.')}}
 return true}
async function muGo(i){
 for(let n=0;n<MU.q.length;n++){const k=((i+n)%MU.q.length+MU.q.length)%MU.q.length;if(muT(MU.q[k])){MU.i=k;const r=await muLoad(MU.q[k],true);if(r||r===null)return}}
 muStop();muPaint()}
function muPlayList(ids,start,shuffle){
 ids=ids.filter(x=>muT(x));if(!ids.length)return;start=start&&ids.includes(start)?start:ids[0];
 if(shuffle!==undefined)muM().shuf=!!shuffle;
 MU.base=ids.slice();MU.q=muM().shuf?muShuf(ids,start):ids.slice();MU.i=MU.q.indexOf(start);muSaveQ();muGo(MU.i)}
function muNext(auto){
 const a=MU.a,m=muM();if(!MU.q.length)return;
 if(auto&&m.rep==='one'){a.currentTime=0;a.play().catch(()=>{});return}
 let i=MU.i+1;if(i>=MU.q.length){if(m.rep==='all'||!auto)i=0;else{a.pause();a.currentTime=0;muSavePos();muPaint();return}}
 muGo(i)}
function muPrev(){const a=MU.a;if(!MU.q.length)return;if(a.currentTime>3||MU.i<=0){a.currentTime=0;if(MU.i<=0&&a.paused)a.play().catch(()=>{});return}muGo(MU.i-1)}
async function muToggle(){
 const a=MU.a,m=muM();
 if(!MU.cur){const l=muList();if(l.length)muPlayList(l.map(t=>t.id),l[0].id);else{openApp('music')}return}
 if(MU.loaded!==MU.cur){await muLoad(MU.cur,true,m.pos);return}
 if(a.paused)a.play().catch(()=>{});else a.pause()}
function muSaveQ(){muM().q=MU.q.slice(0,500);save()}
function muSavePos(){const m=muM();m.cur=MU.cur;m.pos=Math.floor(MU.a.currentTime||0);save()}
function muHist(){if(MU.hlog===MU.cur||!MU.cur||MU.cur.startsWith('rd'))return;MU.hlog=MU.cur;const m=muM();m.hist=[{id:MU.cur,t:Date.now()},...m.hist.filter(h=>h.id!==MU.cur)].slice(0,200);save();if(MU.view==='hist')muListPaint()}
function muMedia(t){
 if(!('mediaSession'in navigator))return;
 try{const u=t.c?IMG.url(t.c):'';navigator.mediaSession.metadata=new MediaMetadata({title:t.n,artist:t.ar,album:t.al,artwork:u?[{src:u,sizes:'256x256',type:'image/jpeg'}]:[]})}catch(e){}}
if('mediaSession'in navigator){const ms=navigator.mediaSession,set=(n,f)=>{try{ms.setActionHandler(n,f)}catch(e){}};
 set('play',()=>muToggle());set('pause',()=>MU.a.pause());set('previoustrack',()=>muPrev());set('nexttrack',()=>muNext(0));
 set('seekto',d=>{if(d.seekTime!=null)MU.a.currentTime=d.seekTime});set('seekbackward',()=>{MU.a.currentTime=Math.max(0,MU.a.currentTime-10)});set('seekforward',()=>{MU.a.currentTime+=10})}
{const a=MU.a;
 a.addEventListener('play',()=>{if('mediaSession'in navigator)navigator.mediaSession.playbackState='playing';muPaint()});
 a.addEventListener('playing',()=>{muHist();MU.err=0;muPaint()});
 a.addEventListener('pause',()=>{if('mediaSession'in navigator)navigator.mediaSession.playbackState='paused';muSavePos();muPaint()});
 a.addEventListener('ended',()=>muNext(1));
 a.addEventListener('loadedmetadata',()=>{const t=muT(MU.cur);if(t&&isFinite(a.duration)&&Math.abs((t.d||0)-a.duration)>1){t.d=a.duration;save();muListPaint()}muTime(1)});
 a.addEventListener('timeupdate',()=>muTime(0));
 a.addEventListener('volumechange',muPaint);
 a.addEventListener('error',()=>{if(!MU.cur||!a.getAttribute('src'))return;const t=muT(MU.cur);toast(t&&t.live?'A rádio não respondeu: '+t.n+'. Verifique a internet ou tente outra estação.':'Não foi possível tocar: '+(t?t.n:'arquivo'));if(++MU.err<3&&MU.q.length>1)muNext(0);else{MU.err=0;muPaint()}})}
/* ---- listas ---- */
function muFilter(L){const q=MU.search.trim().toLowerCase();return q?L.filter(t=>(t.n+' '+t.ar+' '+t.al).toLowerCase().includes(q)):L}
function muList(){
 const m=muM(),by=new Map(m.tracks.map(t=>[t.id,t])),v=MU.view;let L;
 if(v==='fav')L=m.fav.map(id=>by.get(id)).filter(Boolean).reverse();
 else if(v==='hist')L=m.hist.map(h=>by.get(h.id)).filter(Boolean);
 else if(v==='queue')L=MU.q.map(id=>by.get(id)).filter(Boolean);
 else if(v.startsWith('pl:')){const p=m.pls.find(x=>x.id===v.slice(3));L=p?p.t.map(id=>by.get(id)).filter(Boolean):[]}
 else if(v.startsWith('al:')){const k=v.slice(3);L=m.tracks.filter(t=>(t.al||'Sem álbum')===k).sort((a,b)=>(a.tn||999)-(b.tn||999)||a.n.localeCompare(b.n))}
 else{L=m.tracks.slice();const s=MU.sort;if(s==='add')L.sort((a,b)=>b.ad-a.ad);else{const f=s==='title'?'n':s==='artist'?'ar':'al';L.sort((a,b)=>(a[f]||'￿').localeCompare(b[f]||'￿')||a.n.localeCompare(b.n))}}
 return muFilter(L)}
function muAlbums(){const g=new Map();for(const t of muM().tracks){const k=t.al||'Sem álbum';if(!g.has(k))g.set(k,{k,ar:t.ar,c:t.c,n:0});const o=g.get(k);o.n++;if(!o.c&&t.c)o.c=t.c}return muFilter2([...g.values()].sort((a,b)=>a.k.localeCompare(b.k)))}
const muFilter2=L=>{const q=MU.search.trim().toLowerCase();return q?L.filter(a=>(a.k+' '+a.ar).toLowerCase().includes(q)):L};
/* ---- interface ---- */
function muRow(t,pl){
 const f=muM().fav.includes(t.id),on=t.id===MU.cur,mn=MU.menu===t.id;
 return`<div class="mur${on?' on':''}" data-t="${t.id}"><button class="muplay" data-a="muplay" data-id="${t.id}" aria-label="Tocar ${esc(t.n)}"><span class="muth" ${t.c?`data-c="${t.c}"`:''}>${t.c?'':mi('note',16)}</span><span class="mun"><b>${esc(t.n)}</b><i>${esc(t.ar||'Artista desconhecido')}</i></span></button>
 <span class="mual">${esc(t.al)}</span><button class="mubi${f?' on':''}" data-a="mufav" data-id="${t.id}" aria-label="${f?'Desfavoritar':'Favoritar'}" aria-pressed="${f}">${mi(f?'heartf':'heart',16)}</button><span class="mud">${t.d?muTm(t.d):''}</span><button class="mubi" data-a="mumenu" data-id="${t.id}" aria-label="Mais opções" aria-expanded="${mn}">${mi('more',16)}</button>
 ${mn?`<div class="mumn" role="menu"><button data-a="munx" data-id="${t.id}">Tocar a seguir</button><button data-a="muq" data-id="${t.id}">Adicionar à fila</button>${muM().pls.map(p=>`<button data-a="mupl" data-id="${t.id}" data-p="${p.id}">+ ${esc(p.n)}</button>`).join('')}${MU.view.startsWith('pl:')?`<button data-a="muplrm" data-id="${t.id}">Remover desta playlist</button>`:''}${MU.view==='queue'?`<button data-a="muqrm" data-id="${t.id}">Tirar da fila</button>`:''}<button data-a="mudel" data-id="${t.id}">Remover da biblioteca</button></div>`:''}</div>`}
function muPlayer(){
 const m=muM(),t=muT(MU.cur),pl=!MU.a.paused&&!!MU.cur;
 return`<div class="mup" role="region" aria-label="Player">
 <div class="mup1"><span class="muth big mu-c0">${t&&t.c&&IMG.url(t.c)?`<img class="mu-c" alt="" src="${IMG.url(t.c)}">`:mi('note',22)}</span><span class="mun"><b class="mu-t">${esc(t?t.n:'Nada tocando')}</b><i class="mu-a">${esc(t?t.ar:'')}</i></span><button class="mubi mu-f${t&&m.fav.includes(t.id)?' on':''}" data-a="mufav" data-id="${t?t.id:''}" aria-label="Favoritar">${mi(t&&m.fav.includes(t.id)?'heartf':'heart',18)}</button></div>
 <div class="mup2"><div class="mubt"><button class="mubi${m.shuf?' on':''}" data-a="mushuf" aria-label="Aleatório" aria-pressed="${!!m.shuf}">${mi('shuf')}</button><button class="mubi" data-a="muprev" aria-label="Anterior">${mi('prev',20)}</button><button class="p mupp mu-pp" data-a="mupt" aria-label="${pl?'Pausar':'Tocar'}">${mi(pl?'pause':'play',22)}</button><button class="mubi" data-a="munext" aria-label="Próxima">${mi('next',20)}</button><button class="mubi${m.rep!=='off'?' on':''}" data-a="murep" aria-label="Repetir: ${m.rep==='one'?'uma':m.rep==='all'?'todas':'desligado'}">${mi(m.rep==='one'?'rep1':'rep')}</button></div>
 <div class="mubr"><span class="mu-tc">0:00</span><input type="range" class="mu-bar" data-i="museek" min="0" max="1000" value="0" aria-label="Posição"><span class="mu-td">${t&&t.d?muTm(t.d):'0:00'}</span></div></div>
 <div class="mup3"><button class="mubi" data-a="mumute" aria-label="Mudo">${mi(MU.a.muted||!m.vol?'mute':'vol',18)}</button><input type="range" data-i="muvol" min="0" max="100" value="${Math.round(m.vol*100)}" aria-label="Volume"></div></div>`}
function musicView(){
 const m=muM(),v=MU.view,pls=m.pls,L=v==='albums'?[]:muList();
 const nav=(k,n)=>`<button data-a="muview" data-v="${k}" class="${v===k?'on':''}">${n}</button>`;
 const title=v==='all'?'Músicas':v==='albums'?'Álbuns':v==='fav'?'Favoritas':v==='hist'?'Histórico':v==='queue'?'Fila de reprodução':v.startsWith('pl:')?(pls.find(p=>p.id===v.slice(3))||{n:'Playlist'}).n:v.startsWith('al:')?v.slice(3):'';
 const pl=v.startsWith('pl:')?pls.find(p=>p.id===v.slice(3)):null;
 return`<div class="mu"><nav class="mus" aria-label="Biblioteca">
 <div class="mut">Biblioteca</div>${nav('all','Músicas')}${nav('albums','Álbuns')}${nav('fav','Favoritas')}${nav('hist','Histórico')}${nav('queue','Fila')}
 <div class="mut">Descobrir</div>${nav('radio','Rádios online')}${nav('spt','Transferir do Spotify')}
 <div class="mut">Playlists</div>${pls.map(p=>`<button data-a="muview" data-v="pl:${p.id}" class="${v==='pl:'+p.id?'on':''}">${esc(p.n)}</button>`).join('')}
 <div class="fl" style="margin-top:4px"><input id="munpl" maxlength="40" placeholder="Nova playlist" aria-label="Nome da nova playlist" size="12" style="min-width:0;flex:1"><button data-a="muplnew" aria-label="Criar playlist">+</button></div></nav>
 <div class="mumain">${v==='radio'||v==='spt'?muxPanel(v):''}<div class="fl muhd"${v==='radio'||v==='spt'?' hidden':''}><h3 style="margin:0">${esc(title)}</h3>
 <input type="search" data-i="musearch" value="${esc(MU.search)}" placeholder="Pesquisar músicas, artistas, álbuns" aria-label="Pesquisar na biblioteca" style="flex:1;min-width:140px">
 ${v==='all'?`<select data-i="musort" aria-label="Ordenar">${optH({add:'Recentes',title:'Título',artist:'Artista',album:'Álbum'},MU.sort)}</select>`:''}</div>
 <div class="fl muhd"${v==='radio'||v==='spt'?' hidden':''}>${v==='all'||v==='albums'?`<button class="p" data-a="muimp">Importar músicas</button><input type="file" id="muf" accept=".mp3,.wav,.flac,.ogg,audio/mpeg,audio/wav,audio/flac,audio/ogg" multiple hidden data-i="mufile">
 ${PXM?`<button data-a="mudir">Adicionar pasta</button><button data-a="mumusic" title="Procura músicas na pasta Músicas do Windows">Pasta Músicas</button>${m.dirs.length?`<button data-a="muscan" title="Procura músicas novas e tira as que sumiram">Atualizar pastas</button>`:''}`:(MOB?'':`<button data-a="mudir">Importar pasta</button><input type="file" id="mud" webkitdirectory multiple hidden data-i="mudirf">`)}`:''}
 ${L.length&&v!=='albums'?`<button class="p" data-a="muall" data-v="0">Tocar</button><button data-a="muall" data-v="1">Aleatório</button>`:''}
 ${v==='queue'&&MU.q.length?`<button data-a="muqclr">Limpar fila</button>`:''}
 ${pl?`<input data-i="muplren" value="${esc(pl.n)}" maxlength="40" aria-label="Renomear playlist" size="14"><button data-a="mupldel" class="${MU.arm===pl.id?'on':''}">${MU.arm===pl.id?'Confirmar exclusão':'Excluir playlist'}</button>`:''}
 <span class="m sm" id="muc"></span><span class="m sm" id="muimp" role="status"></span></div>
 <div id="mul" class="mul"${v==='radio'||v==='spt'?' hidden':''}></div></div>${muPlayer()}</div>`}
R.music=musicView;
function muListPaint(){
 const el=$('#mul');if(!el)return;const m=muM();
 if(MU.view==='albums'){const A_=muAlbums();el.className='mua';el.innerHTML=A_.map(a=>`<button class="muac" data-a="muview" data-v="al:${esc(a.k)}"><span class="muim" ${a.c?`data-c="${a.c}"`:''}>${a.c?'':mi('note',34)}</span><b>${esc(a.k)}</b><i>${esc(a.ar||'')}</i></button>`).join('')||`<div class="empty m">Nenhum álbum.</div>`;
  const c=$('#muc');if(c)c.textContent=A_.length+' álbum(ns)';muCovers();return}
 el.className='mul';const L=muList(),sh=L.slice(0,MU.n);
 el.innerHTML=sh.map(t=>muRow(t)).join('')+(L.length>MU.n?`<button class="phm" data-a="mumore" style="width:100%">Mostrar mais (${L.length-MU.n})</button>`:'')||
  `<div class="empty m">${m.tracks.length?(MU.search?'Nada encontrado.':MU.view==='fav'?'Toque no coração de uma música para favoritar.':MU.view==='hist'?'Ainda não tocou nada.':MU.view==='queue'?'A fila está vazia. Toque uma música ou use <b>Adicionar à fila</b>.':'Esta lista está vazia.'):'Sua biblioteca está vazia.<br>Use <b>Importar músicas</b>'+(PXM?' ou <b>Adicionar pasta</b>':MOB?'':' ou <b>Importar pasta</b>')+'. Formatos: MP3, WAV, FLAC e OGG. Funciona offline e sem anúncios.'}</div>`;
 const c=$('#muc');if(c)c.textContent=L.length+' música(s)';muCovers()}
async function muCovers(){
 const els=[...document.querySelectorAll('#mul [data-c]')];const ids=[...new Set(els.map(e=>e.dataset.c))];if(!ids.length)return;
 await IMG.load(ids);for(const e of els){const u=IMG.url(e.dataset.c);if(u&&!e.firstChild)e.innerHTML=`<img alt="" src="${u}" draggable="false">`}}
function muPaintImp(){const e=$('#muimp');if(e)e.textContent=MU.imp?`Importando ${MU.imp.done}/${MU.imp.total}...`:''}
function muAfter(){muListPaint();muTime(1)}
/* Atualiza em lugar (sem recriar a janela): janela, widgets e chip da barra */
function muPaint(){
 const t=muT(MU.cur),pl=!MU.a.paused&&!!MU.cur,m=muM();
 document.querySelectorAll('.mu-t').forEach(e=>e.textContent=t?t.n:'Nada tocando');
 document.querySelectorAll('.mu-a').forEach(e=>e.textContent=t?t.ar:'');
 document.querySelectorAll('.mu-pp').forEach(e=>{e.innerHTML=mi(pl?'pause':'play',e.classList.contains('mupp')?22:16);e.setAttribute('aria-label',pl?'Pausar':'Tocar')});
 const u=t&&t.c?IMG.url(t.c):'';
 document.querySelectorAll('.mu-c0').forEach(e=>{e.innerHTML=u?`<img class="mu-c" alt="" src="${u}">`:mi('note',e.classList.contains('big')?22:18)});
 document.querySelectorAll('.mu-td').forEach(e=>e.textContent=t&&t.live?'AO VIVO':t&&t.d?muTm(t.d):'0:00');
 document.querySelectorAll('.mu-bar').forEach(e=>{e.disabled=!!(t&&t.live)});
 document.querySelectorAll('.mu-f').forEach(e=>{const f=t&&m.fav.includes(t.id);e.dataset.id=t?t.id:'';e.classList.toggle('on',!!f);e.innerHTML=mi(f?'heartf':'heart',18)});
 document.querySelectorAll('[data-a=mushuf]').forEach(e=>{e.classList.toggle('on',!!m.shuf);e.setAttribute('aria-pressed',!!m.shuf)});
 document.querySelectorAll('[data-a=murep]').forEach(e=>{e.classList.toggle('on',m.rep!=='off');e.innerHTML=mi(m.rep==='one'?'rep1':'rep');e.setAttribute('aria-label','Repetir: '+(m.rep==='one'?'uma':m.rep==='all'?'todas':'desligado'))});
 document.querySelectorAll('[data-a=mumute] ').forEach(e=>e.innerHTML=mi(MU.a.muted||!m.vol?'mute':'vol',18));
 const chip=$('#mub');if(chip){chip.hidden=!t}
 document.querySelectorAll('.mur').forEach(e=>e.classList.toggle('on',e.dataset.t===MU.cur));
 document.querySelectorAll('.mu-mini').forEach(e=>e.classList.toggle('idle',!t));
 muTime(1)}
function muTime(force){
 const now=performance.now();if(!force&&now-MU.tm<250)return;MU.tm=now;
 const a=MU.a,d=isFinite(a.duration)&&a.duration>0?a.duration:(muT(MU.cur)||{}).d||0,c=a.currentTime||0;
 document.querySelectorAll('.mu-bar').forEach(e=>{if(document.activeElement===e)return;e.value=d?Math.min(1000,c/d*1000):0;e.style.setProperty('--p',(d?c/d*100:0)+'%')});
 document.querySelectorAll('.mu-tc').forEach(e=>e.textContent=muTm(c));
 if('mediaSession'in navigator&&d&&now-MU.ts>2000){MU.ts=now;try{navigator.mediaSession.setPositionState({duration:d,position:Math.min(c,d),playbackRate:a.playbackRate||1})}catch(e){}}}
/* ---- widget: mini-player na tela inicial ---- */
function musicWBody(w){
 const t=muT(MU.cur),pl=!MU.a.paused&&!!MU.cur,u=t&&t.c?IMG.url(t.c):'';
 return`<div class="mu-mini${t?'':' idle'}">${w.cfg.cover?`<button class="muth big mu-c0" data-a="open" data-k="music" aria-label="Abrir Música">${u?`<img class="mu-c" alt="" src="${u}">`:mi('note',22)}</button>`:''}
 <div class="mum2"><button class="mun mulink" data-a="open" data-k="music"><b class="mu-t">${esc(t?t.n:'Nada tocando')}</b><i class="mu-a">${esc(t?t.ar:'Abrir Música')}</i></button>
 <div class="mubr"><input type="range" class="mu-bar" data-i="museek" min="0" max="1000" value="0" aria-label="Posição"></div>
 <div class="mubt"><button class="mubi" data-a="muprev" aria-label="Anterior">${mi('prev',16)}</button><button class="p mubp mu-pp" data-a="mupt" aria-label="${pl?'Pausar':'Tocar'}">${mi(pl?'pause':'play',16)}</button><button class="mubi" data-a="munext" aria-label="Próxima">${mi('next',16)}</button><button class="mubi mu-f${t&&muM().fav.includes(t.id)?' on':''}" data-a="mufav" data-id="${t?t.id:''}" aria-label="Favoritar">${mi(t&&muM().fav.includes(t.id)?'heartf':'heart',16)}</button></div></div></div>`}
/* ---- ações ---- */
const muSel=a=>a.dataset.id;
Object.assign(A,{
 muview:a=>{MU.view=a.dataset.v;MU.n=100;MU.menu='';MU.arm='';ren()},
 muplay:a=>{const id=muSel(a),l=muList();muPlayList(l.map(t=>t.id),id)},
 muall:a=>{const l=muList();if(l.length)muPlayList(l.map(t=>t.id),a.dataset.v==='1'?pick(l).id:l[0].id,a.dataset.v==='1')},
 mupt:()=>muToggle(),munext:()=>muNext(0),muprev:()=>muPrev(),
 mushuf:()=>{const m=muM();m.shuf=!m.shuf;if(MU.q.length){const c=MU.cur;if(m.shuf)MU.q=muShuf(MU.q,c);else{const b=MU.base.filter(x=>MU.q.includes(x));MU.q=b.length?b:MU.q}MU.i=MU.q.indexOf(c)}muSaveQ();muPaint();if(MU.view==='queue')muListPaint()},
 murep:()=>{const m=muM();m.rep=m.rep==='off'?'all':m.rep==='all'?'one':'off';save();muPaint()},
 mufav:a=>{const id=muSel(a);if(!id)return;if(id.startsWith('rd')){muRadFav(id);return}const m=muM(),i=m.fav.indexOf(id);if(i<0)m.fav.push(id);else m.fav.splice(i,1);save();muPaint();if(MU.view==='fav'||(a.closest&&a.closest('#mul')))muListPaint();document.querySelectorAll(`.mubi[data-a=mufav][data-id="${id}"]`).forEach(e=>{const f=m.fav.includes(id);e.classList.toggle('on',f);e.innerHTML=mi(f?'heartf':'heart',e.closest('.mur')?16:18)})},
 mumenu:a=>{const id=muSel(a);MU.menu=MU.menu===id?'':id;muListPaint()},
 munx:a=>{const id=muSel(a);if(!MU.q.length){muPlayList([id],id)}else{MU.q=MU.q.filter(x=>x!==id);const i=MU.q.indexOf(MU.cur);MU.q.splice(i+1,0,id);MU.base.push(id);MU.i=MU.q.indexOf(MU.cur);muSaveQ();toast('Toca a seguir')}MU.menu='';muListPaint()},
 muq:a=>{const id=muSel(a);if(!MU.q.length){muPlayList([id],id);MU.menu='';muListPaint();return}MU.q.push(id);MU.base.push(id);muSaveQ();toast('Adicionada à fila');MU.menu='';muListPaint()},
 muqrm:a=>{const id=muSel(a),c=MU.cur;let j=MU.q.findIndex((x,k)=>x===id&&k!==MU.i);if(j<0&&id!==c)j=MU.q.indexOf(id);if(j>=0){MU.q.splice(j,1);const b=MU.base.indexOf(id);if(b>=0&&(id!==c||MU.q.indexOf(id)<0))MU.base.splice(b,1)}MU.i=MU.q.indexOf(c);muSaveQ();MU.menu='';muListPaint()},
 muqclr:()=>{const c=MU.cur;MU.q=c?[c]:[];MU.base=MU.q.slice();MU.i=c?0:-1;muSaveQ();muListPaint()},
 mupl:a=>{const p=muM().pls.find(x=>x.id===a.dataset.p);if(p&&!p.t.includes(muSel(a))){p.t.push(muSel(a));save();toast('Adicionada a '+p.n)}else toast('Já está nessa playlist.');MU.menu='';muListPaint()},
 muplrm:a=>{const p=muM().pls.find(x=>x.id===MU.view.slice(3));if(p){p.t=p.t.filter(x=>x!==muSel(a));save()}MU.menu='';muListPaint()},
 mudel:a=>{muDrop([muSel(a)]);MU.menu='';muListPaint();muPaint()},
 muplnew:()=>{const i=$('#munpl'),m=muM();if(m.pls.length>=50){toast('Limite de 50 playlists.');return}const n=(i&&i.value.trim()||'Playlist '+(m.pls.length+1)).slice(0,40),p={id:muId('pl'),n,t:[]};m.pls.push(p);save();MU.view='pl:'+p.id;ren()},
 mupldel:()=>{const id=MU.view.slice(3);if(MU.arm!==id){MU.arm=id;ren();return}const m=muM();m.pls=m.pls.filter(p=>p.id!==id);MU.arm='';MU.view='all';save();ren()},
 mumore:()=>{MU.n+=100;muListPaint()},
 muimp:()=>$('#muf').click(),
 mudir:()=>PXM?muAddDir(()=>PXM.pickMusicDir()):$('#mud').click(),mumusic:()=>muAddDir(()=>PXM.musicDir()),
 muscan:()=>muScan(),
 mumute:()=>{MU.a.muted=!MU.a.muted;muPaint()}});
Object.assign(I,{
 mufile:e=>{const f=[...e.files];e.value='';muImport(f)},mudirf:e=>{const f=[...e.files];e.value='';muImport(f)},
 musearch:e=>{MU.search=e.value;MU.n=100;muListPaint()},musort:e=>{MU.sort=e.value;MU.n=100;muListPaint()},
 museek:e=>{const a=MU.a,d=isFinite(a.duration)&&a.duration>0?a.duration:(muT(MU.cur)||{}).d||0;if(d){a.currentTime=e.value/1000*d;muTime(1)}},
 muvol:e=>{const m=muM();m.vol=+e.value/100;MU.a.volume=m.vol;if(m.vol>0)MU.a.muted=false;save();muPaint()},
 muplren:e=>{const p=muM().pls.find(x=>x.id===MU.view.slice(3));const n=e.value.trim().slice(0,40);if(p&&n){p.n=n;save();document.querySelectorAll('.mus button[data-v^="pl:"]').forEach(b=>{if(b.dataset.v==='pl:'+p.id)b.textContent=n});const h=$('.muhd h3');if(h)h.textContent=n}}});
/* arrastar e soltar arquivos na janela de Música */
document.addEventListener('dragover',e=>{if(cur==='music'&&e.dataTransfer&&[...e.dataTransfer.types].includes('Files'))e.preventDefault()});
document.addEventListener('drop',e=>{if(cur!=='music'||!e.dataTransfer||!e.dataTransfer.files.length)return;e.preventDefault();muImport([...e.dataTransfer.files])});
/* guarda posição ao sair/minimizar */
window.addEventListener('pagehide',muSavePos);document.addEventListener('visibilitychange',()=>{if(document.hidden)muSavePos()});
/* inicialização: restaura fila e última música (sem carregar o arquivo até o Play) */
function muBoot(){
 setTimeout(()=>{if(PXM&&S.music.dirs.length)muScan(true)},2500);
 const m=muM();muIndexKeys();MU.a.volume=m.vol;
 MU.q=m.q.filter(id=>muT(id));MU.base=MU.q.slice();if(m.cur&&muT(m.cur)){MU.cur=m.cur;MU.hlog=m.cur;MU.i=MU.q.indexOf(m.cur);if(MU.i<0){MU.q=[m.cur,...MU.q];MU.base=MU.q.slice();MU.i=0}IMG.load([muT(m.cur).c]).then(()=>muPaint())}}
