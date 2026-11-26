'use strict';
/* Funções puras (sem Electron) para validar caminhos e nomes. Testadas em test/unit.js */
const path=require('path');
const IMG_RE=/\.(png|jpe?g|webp|bmp)$/i;
const MIME={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.bmp':'image/bmp'};
const AUDIO_RE=/\.(mp3|wav|flac|ogg|oga)$/i;
const AUDIO_MIME={'.mp3':'audio/mpeg','.wav':'audio/wav','.flac':'audio/flac','.ogg':'audio/ogg','.oga':'audio/ogg'};
/* Range: HTTP "bytes=a-b" | "bytes=a-" | "bytes=-n". Retorna {start,end} (inclusive), null (sem Range) ou 'bad' (416) */
function parseRange(h,size){
 if(h==null||h==='')return null;const m=/^bytes=(\d*)-(\d*)$/.exec(String(h).trim());
 if(!m||(m[1]===''&&m[2]===''))return 'bad';if(size<=0)return 'bad';
 let a,b;
 if(m[1]===''){const n=+m[2];if(!n)return 'bad';a=Math.max(0,size-n);b=size-1}
 else{a=+m[1];b=m[2]===''?size-1:Math.min(+m[2],size-1)}
 if(!Number.isFinite(a)||!Number.isFinite(b)||a>b||a>=size)return 'bad';
 return{start:a,end:b}}
const BLOCKED_EXT=new Set(['.desktop','.sh','.bash','.bat','.cmd','.exe','.msi','.jar','.appimage','.run','.ps1','.scr','.com','.vbs','.vbe','.js','.jse','.wsf','.hta','.py','.pl','.lnk','.reg','.dll','.command','.app','.dmg','.url']);
const same=(a,b)=>process.platform==='win32'||process.platform==='darwin'?a.toLowerCase()===b.toLowerCase():a===b;
function isInside(root,p){
 const r=path.resolve(root),q=path.resolve(p),rel=path.relative(r,q);
 if(rel==='')return true;
 return !rel.startsWith('..')&&!path.isAbsolute(rel)}
const insideAny=(roots,p)=>roots.some(r=>isInside(r,p));
function b64uDecode(s){return Buffer.from(String(s).replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8')}
function b64uEncode(s){return Buffer.from(String(s),'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function cleanExt(e){e=String(e||'').toLowerCase().replace(/^\./,'');return e==='jpeg'?'jpg':['png','jpg','webp'].includes(e)?e:'png'}
function uniqueName(dir,base,ext,exists){
 base=String(base).replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,100)||'foto';
 for(let n=0;n<1000;n++){const f=path.join(dir,`${base}-editado${n?'-'+(n+1):''}.${ext}`);if(!exists(f))return f}
 throw new Error('nomes esgotados')}
/* mapeia a URL app://hub/<arquivo> para um arquivo dentro de rootDir, ou null */
function safeAppFile(rootDir,urlPath){
 let p;try{p=decodeURIComponent(urlPath||'/')}catch(e){return null}
 if(p==='/'||p==='')p='/index.html';
 if(p.includes('\0')||p.includes('\\'))return null;
 const f=path.resolve(rootDir,'.'+p);return isInside(rootDir,f)?f:null}
module.exports={IMG_RE,MIME,AUDIO_RE,AUDIO_MIME,parseRange,BLOCKED_EXT,isInside,insideAny,same,b64uDecode,b64uEncode,cleanExt,uniqueName,safeAppFile};
