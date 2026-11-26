/* =====================================================================
   00 UTILIDADES, ARMAZENAMENTO DE IMAGENS E FONTES
   ===================================================================== */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),K='punkhub:v1';
const hex=v=>/^#[0-9a-f]{6}$/i.test(v),clamp=(v,a,b)=>Math.min(b,Math.max(a,+v||0)),arr=a=>Array.isArray(a)?a:[],safe=u=>/^https?:\/\//i.test(u)?u:'#';
const num=(v,a,b,d)=>{const n=parseFloat(v);return Number.isFinite(n)?Math.min(b,Math.max(a,n)):d};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6),cap=s=>s?s[0].toUpperCase()+s.slice(1):s,pick=a=>a[Math.floor(Math.random()*a.length)];
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),mix=(a,b,p,al)=>{const x=rgb(a),y=rgb(b);return`rgba(${x.map((v,i)=>Math.round(v+(y[i]-v)*p)).join()},${al})`},lum=h=>{const[r,g,b]=rgb(h);return(.299*r+.587*g+.114*b)/255};
const A={},I={},R={};   /* A: ações de clique (data-a) | I: ações de input (data-i) | R: telas das janelas */
const fmtB=(n,d=1)=>{n=+n||0;const u=['B','KB','MB','GB','TB'];let i=0;while(n>=1024&&i<4){n/=1024;i++}return(i?n.toFixed(d):Math.round(n))+' '+u[i]};
const fmtDur=s=>{s=Math.floor(s);const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return(d?d+'d ':'')+(h||d?h+'h ':'')+m+'min'};

/* Imagens e fontes importadas ficam no IndexedDB (não estouram o limite do localStorage).
   IMG.url(id) devolve uma URL de blob já carregada; IMG.load(ids) carrega antes de usar. */
const IMG={urls:new Map(),mem:new Map(),db:null,warned:0,
 open(){return this.db||(this.db=new Promise((ok,no)=>{try{const r=indexedDB.open('punkhub',1);r.onupgradeneeded=()=>r.result.createObjectStore('f');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}}))},
 async tx(mode,fn){const d=await this.open();return new Promise((ok,no)=>{const t=d.transaction('f',mode),q=fn(t.objectStore('f'));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error)})},
 async put(id,blob){this.mem.set(id,blob);try{await this.tx('readwrite',s=>s.put(blob,id))}catch(e){if(!this.warned++)notify('Não foi possível gravar arquivos no navegador. Eles valem só nesta sessão.')}},
 async get(id){if(this.mem.has(id))return this.mem.get(id);try{return await this.tx('readonly',s=>s.get(id))}catch(e){return null}},
 async del(id){this.mem.delete(id);const u=this.urls.get(id);if(u)URL.revokeObjectURL(u);this.urls.delete(id);try{await this.tx('readwrite',s=>s.delete(id))}catch(e){}},
 async keys(){try{return await this.tx('readonly',s=>s.getAllKeys())}catch(e){return[...this.mem.keys()]}},
 async load(ids){for(const id of ids){if(!id||this.urls.has(id))continue;const b=await this.get(id);if(b)this.urls.set(id,URL.createObjectURL(b))}},
 url(id){return this.urls.get(id)||''},
 async add(blob,pre='im'){const id=pre+uid();await this.put(id,blob);await this.load([id]);return id},
 async dataURL(id){const b=await this.get(id);return b?await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)}):''},
 async fromData(du){
  /* Decodifica data: URL sem fetch (WebViews Android/Capacitor podem interceptar ou bloquear fetch de data:) */
  const m=/^data:([^;,]*)((?:;[^;,]*)*?),(.*)$/s.exec(String(du));
  if(!m)return(await fetch(du)).blob();
  const type=m[1]||'application/octet-stream',b64=/;base64/i.test(m[2]);
  if(!b64)return new Blob([decodeURIComponent(m[3])],{type});
  const bin=atob(m[3].replace(/\s/g,'')),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  return new Blob([u],{type})}};

/* Prepara uma imagem escolhida pelo usuário. PNG com transparência continua PNG; só reduz se passar de `max` px. */
async function imgProc(f,max=2200){
 if(!f||!/^image\//.test(f.type))throw new Error('O arquivo não é uma imagem.');
 if(f.size>30e6)throw new Error('Imagem maior que 30 MB.');
 if(/gif|svg/.test(f.type))return f;
 const bmp=await createImageBitmap(f),s=Math.min(1,max/Math.max(bmp.width,bmp.height));
 if(s===1)return f;
 const c=document.createElement('canvas');c.width=Math.round(bmp.width*s);c.height=Math.round(bmp.height*s);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
 return new Promise(r=>c.toBlob(b=>r(b),f.type==='image/jpeg'?'image/jpeg':'image/png',.9))}
async function imgFromFile(f,max){try{return await IMG.add(await imgProc(f,max))}catch(e){notify(e.message||'Imagem inválida.');return''}}

/* Fonte personalizada (.ttf/.otf/.woff/.woff2): registra no documento com a FontFace API. */
const FONTS_OK=new Set();
async function fontReg(f){if(!f||FONTS_OK.has(f.id))return;try{const b=await IMG.get(f.id);if(!b)return;const ff=new FontFace(f.name,await b.arrayBuffer());await ff.load();document.fonts.add(ff);FONTS_OK.add(f.id)}catch(e){notify('Fonte inválida: '+f.name)}}
