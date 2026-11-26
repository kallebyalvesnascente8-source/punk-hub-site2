'use strict';
const {app,BrowserWindow,ipcMain,dialog,shell,protocol,net,session}=require('electron');
const path=require('path'),fs=require('fs'),{pathToFileURL}=require('url');
const L=require('./lib'),{createAgent}=require('./agent');

/* app://hub serve a interface; punkimg:// serve SÓ imagens de pastas que o usuário escolheu */
protocol.registerSchemesAsPrivileged([
 {scheme:'app',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}},
 {scheme:'punkimg',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}},
 {scheme:'punkaudio',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);

const APP_ORIGIN='app://hub',APP_DIR=path.join(__dirname,'app');
const CSP="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: blob: https://fonts.gstatic.com; img-src 'self' data: blob: punkimg: https://i.scdn.co; media-src blob: punkaudio: https:; connect-src http: https: data: blob: punkimg: punkaudio:; worker-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
let win=null,agent=null,SET={allowKill:false,token:'',roots:[],mroots:[],bounds:null,max:false},setFile='';

/* ---- Configurações do app (userData/settings.json) ---- */
function loadSettings(){
 setFile=path.join(app.getPath('userData'),'settings.json');
 try{const j=JSON.parse(fs.readFileSync(setFile,'utf8'));
  SET.allowKill=!!j.allowKill;SET.token=typeof j.token==='string'&&j.token.length>=24?j.token:'';
  SET.roots=Array.isArray(j.roots)?j.roots.filter(r=>typeof r==='string'&&path.isAbsolute(r)).slice(0,20):[];
  SET.mroots=Array.isArray(j.mroots)?j.mroots.filter(r=>typeof r==='string'&&path.isAbsolute(r)).slice(0,20):[];
  SET.bounds=j.bounds&&Number.isFinite(j.bounds.width)&&Number.isFinite(j.bounds.height)?{width:Math.max(900,j.bounds.width|0),height:Math.max(600,j.bounds.height|0),x:Number.isFinite(j.bounds.x)?j.bounds.x|0:undefined,y:Number.isFinite(j.bounds.y)?j.bounds.y|0:undefined}:null;SET.max=!!j.max}catch(e){}
 if(!SET.token)SET.token=require('crypto').randomBytes(24).toString('base64url')}
let _sv;function saveSettings(){clearTimeout(_sv);_sv=setTimeout(()=>{try{fs.mkdirSync(path.dirname(setFile),{recursive:true});fs.writeFileSync(setFile,JSON.stringify(SET))}catch(e){}},400)}
const photoRoots=()=>SET.roots;
const realOr=p=>{try{return fs.realpathSync(p)}catch(e){return null}};
/* uma pasta é "permitida" se está dentro de uma pasta que o usuário escolheu (resolvendo links simbólicos) */
function allowed(p){const r=realOr(p);if(!r)return false;return photoRoots().some(x=>{const rr=realOr(x);return rr&&L.isInside(rr,r)})}
function allowedMusic(p){const r=realOr(p);if(!r)return false;return SET.mroots.some(x=>{const rr=realOr(x);return rr&&L.isInside(rr,r)})}
function addMusicRoot(d){const r=realOr(d);if(!r)return null;if(!SET.mroots.some(x=>L.same(x,r))){SET.mroots.push(r);SET.mroots=SET.mroots.slice(-20);saveSettings()}return r}
function addRoot(d){const r=realOr(d);if(!r)return null;if(!SET.roots.some(x=>L.same(x,r))){SET.roots.push(r);SET.roots=SET.roots.slice(-20);saveSettings();syncAgentRoots()}return r}
function agentRoots(){const out=[];for(const n of['documents','pictures','desktop','downloads']){try{out.push(app.getPath(n))}catch(e){}}return[...new Set([...out,...SET.roots])].filter(r=>fs.existsSync(r))}
function syncAgentRoots(){if(agent)agent.setRoots(agentRoots())}

/* ---- Protocolos ---- */
function registerProtocols(){
 protocol.handle('app',async req=>{
  const u=new URL(req.url);if(u.host!=='hub')return new Response('nope',{status:404});
  const f=L.safeAppFile(APP_DIR,u.pathname);if(!f||!fs.existsSync(f)||!fs.statSync(f).isFile())return new Response('não encontrado',{status:404});
  const type={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml'}[path.extname(f).toLowerCase()]||'application/octet-stream';
  return new Response(fs.readFileSync(f),{headers:{'content-type':type,'content-security-policy':CSP,'x-content-type-options':'nosniff'}})});
/* punkaudio://f/<caminho em base64url>: SÓ áudio de pastas de música escolhidas; Range/206 para busca e baixo uso de RAM */
 protocol.handle('punkaudio',async req=>{
  try{const u=new URL(req.url);if(u.host!=='f')throw 0;const p=L.b64uDecode(u.pathname.slice(1));
   if(!L.AUDIO_RE.test(p)||!allowedMusic(p))return new Response('proibido',{status:403});
   const real=realOr(p);if(!real)return new Response('não encontrado',{status:404});const st=fs.statSync(real);if(!st.isFile())return new Response('não encontrado',{status:404});
   const h={'content-type':L.AUDIO_MIME[path.extname(real).toLowerCase()]||'application/octet-stream','accept-ranges':'bytes','access-control-allow-origin':APP_ORIGIN,'cache-control':'private, max-age=60'};
   const r=L.parseRange(req.headers.get('range'),st.size);
   if(r==='bad')return new Response('intervalo inválido',{status:416,headers:{...h,'content-range':'bytes */'+st.size}});
   const a=r?r.start:0,b=r?r.end:st.size-1;
   if(st.size===0)return new Response(null,{status:200,headers:{...h,'content-length':'0'}});
   const body=require('stream').Readable.toWeb(fs.createReadStream(real,{start:a,end:b}));
   return new Response(body,{status:r?206:200,headers:{...h,'content-length':String(b-a+1),...(r?{'content-range':`bytes ${a}-${b}/${st.size}`}:{})}})}
  catch(e){return new Response('inválido',{status:400})}});
 protocol.handle('punkimg',async req=>{
  try{const u=new URL(req.url);if(u.host!=='f')throw 0;const p=L.b64uDecode(u.pathname.slice(1));
   if(!L.IMG_RE.test(p)||!allowed(p))return new Response('proibido',{status:403});
   const real=realOr(p);if(!real||!fs.statSync(real).isFile())return new Response('não encontrado',{status:404});
   const buf=fs.readFileSync(real);
   return new Response(buf,{headers:{'content-type':L.MIME[path.extname(real).toLowerCase()]||'application/octet-stream','access-control-allow-origin':APP_ORIGIN,'cache-control':'private, max-age=60'}})}
  catch(e){return new Response('inválido',{status:400})}})}

/* ---- IPC: só aceita chamadas da nossa página ---- */
const trusted=e=>!!(e&&e.senderFrame&&typeof e.senderFrame.url==='string'&&e.senderFrame.url.startsWith(APP_ORIGIN+'/'));
function H(ch,fn){ipcMain.handle('punk:'+ch,(e,...a)=>{if(!trusted(e))throw new Error('origem não confiável');return fn(...a)})}
async function walkImgs(dir,out,depth){
 if(depth>3||out.length>=4000)return;let ents;try{ents=await fs.promises.readdir(dir,{withFileTypes:true})}catch(e){return}
 for(const d of ents){
  if(d.name[0]==='.'||d.isSymbolicLink())continue;const f=path.join(dir,d.name);
  if(d.isDirectory())await walkImgs(f,out,depth+1);
  else if(L.IMG_RE.test(d.name)){try{const s=await fs.promises.stat(f);out.push({path:f,name:d.name,size:s.size,mt:s.mtimeMs})}catch(e){}}
  if(out.length>=4000)return}}
async function walkAudio(dir,out,depth){
 if(depth>6||out.length>=3000)return;let ents;try{ents=await fs.promises.readdir(dir,{withFileTypes:true})}catch(e){return}
 for(const d of ents){
  if(d.name[0]==='.'||d.isSymbolicLink())continue;const f=path.join(dir,d.name);
  if(d.isDirectory())await walkAudio(f,out,depth+1);
  else if(L.AUDIO_RE.test(d.name)){try{const s=await fs.promises.stat(f);out.push({path:f,name:d.name,size:s.size,mt:s.mtimeMs})}catch(e){}}
  if(out.length>=3000)return}}
function registerIpc(){
 H('pickMusicDir',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openDirectory'],title:'Escolha uma pasta de músicas'});return r.canceled||!r.filePaths[0]?'':addMusicRoot(r.filePaths[0])||''});
 H('musicDir',()=>addMusicRoot(app.getPath('music'))||'');
 H('listAudio',async d=>{if(!allowedMusic(d))throw new Error('pasta não autorizada');const out=[];await walkAudio(realOr(d),out,0);return out});
 H('agent',async()=>{const a=await startAgent();return{url:a.url,token:SET.token}});
 H('allowKill',b=>{SET.allowKill=!!b;if(agent)agent.setAllowKill(SET.allowKill);saveSettings();return SET.allowKill});
 H('pickFolder',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openDirectory'],title:'Escolha uma pasta de fotos'});return r.canceled||!r.filePaths[0]?'':addRoot(r.filePaths[0])||''});
 H('pics',()=>addRoot(app.getPath('pictures'))||'');
 H('list',async d=>{if(!allowed(d))throw new Error('pasta não autorizada');const out=[];await walkImgs(realOr(d),out,0);return out});
 H('saveCopy',async o=>{
  if(!o||typeof o.orig!=='string'||!allowed(o.orig))throw new Error('arquivo não autorizado');
  const ext=L.cleanExt(o.ext),buf=Buffer.from(o.bytes);if(!buf.length||buf.length>300e6)throw new Error('imagem inválida');
  const dir=path.dirname(realOr(o.orig)||o.orig),base=path.basename(o.orig).replace(/\.[^.]+$/,'');
  for(let i=0;i<5;i++){const f=L.uniqueName(dir,base,ext,fs.existsSync);try{await fs.promises.writeFile(f,buf,{flag:'wx'});return f}catch(e){if(e.code!=='EEXIST')throw e}}
  throw new Error('não foi possível criar um nome livre')});
 H('saveAs',async o=>{
  if(!o||typeof o.name!=='string')throw new Error('pedido inválido');const ext=L.cleanExt(o.ext),buf=Buffer.from(o.bytes);if(!buf.length||buf.length>300e6)throw new Error('imagem inválida');
  const start=path.join(typeof o.orig==='string'&&o.orig&&allowed(o.orig)?path.dirname(o.orig):app.getPath('pictures'),path.basename(o.name).replace(/[\\/:*?"<>|]/g,'_'));
  const r=await dialog.showSaveDialog(win,{defaultPath:start,filters:[{name:ext.toUpperCase(),extensions:[ext]}]});
  if(r.canceled||!r.filePath)return'';
  const dest=path.resolve(r.filePath);if(!L.IMG_RE.test(dest))throw new Error('use PNG, JPG ou WEBP');
  if(typeof o.orig==='string'&&o.orig&&L.same(path.resolve(o.orig),dest))throw new Error('Não é permitido sobrescrever o arquivo original. Escolha outro nome.');
  await fs.promises.writeFile(dest,buf);return dest});
 H('reveal',p=>{if(!allowed(p))throw new Error('arquivo não autorizado');shell.showItemInFolder(realOr(p));return true})}

/* ---- Agente embutido (monitor, processos, apps, arquivos) ---- */
async function startAgent(){
 if(agent&&agent.info)return agent.info;
 agent=createAgent({token:SET.token,roots:agentRoots(),allowKill:SET.allowKill,origins:[APP_ORIGIN],openPath:p=>shell.openPath(p).then(e=>{if(e)throw new Error(e)}),showItem:p=>shell.showItemInFolder(p)});
 agent.info=await agent.start(0);return agent.info}

/* ---- Janela ---- */
function createWindow(){
 const b=SET.bounds||{width:1280,height:820};
 win=new BrowserWindow({...b,minWidth:900,minHeight:600,backgroundColor:'#0d0f0e',title:'PUNK HUB',show:false,autoHideMenuBar:true,icon:path.join(__dirname,'build','icon.ico'),
  webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:false,webSecurity:true,devTools:!app.isPackaged}});
 win.removeMenu();if(SET.max)win.maximize();
 win.once('ready-to-show',()=>win.show());
 const keep=()=>{if(win.isDestroyed()||win.isMinimized()||win.isFullScreen())return;SET.max=win.isMaximized();if(!SET.max)SET.bounds=win.getBounds();saveSettings()};
 win.on('resize',keep);win.on('move',keep);win.on('maximize',keep);win.on('unmaximize',keep);
 win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//i.test(url))shell.openExternal(url);return{action:'deny'}});
 win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith(APP_ORIGIN+'/')){e.preventDefault();if(/^https?:\/\//i.test(url))shell.openExternal(url)}});
 win.on('closed',()=>{win=null});
 win.loadURL(APP_ORIGIN+'/index.html')}

if(!app.requestSingleInstanceLock()){app.quit()}
else{
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus()}});
 app.commandLine.appendSwitch('js-flags','--max-old-space-size=384');
 app.whenReady().then(()=>{
  loadSettings();registerProtocols();registerIpc();
  session.defaultSession.setPermissionRequestHandler((wc,perm,cb)=>cb(perm==='fullscreen'));
  createWindow();
  app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow()})});
 app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
 app.on('before-quit',()=>{if(agent)agent.stop()})}
