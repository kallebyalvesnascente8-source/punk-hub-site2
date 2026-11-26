'use strict';
/* Agente local do PUNK HUB em Node (mesma API HTTP do punk-agent.py).
   Escuta só em 127.0.0.1, exige token, confere Host e Origin. Sem dependências.
   Só coleta dados enquanto o Hub pede (economiza CPU e RAM). */
const http=require('http'),os=require('os'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFile}=require('child_process');
const {isInside,insideAny,BLOCKED_EXT}=require('./lib');
const VERSION='1.0-node',WIN=process.platform==='win32',LIN=process.platform==='linux';
const sh=(cmd,args,ms=6000)=>new Promise(res=>execFile(cmd,args,{timeout:ms,windowsHide:true,maxBuffer:8e6},(e,out)=>res(e?'':String(out))));
const rd=f=>{try{return fs.readFileSync(f,'utf8')}catch(e){return''}};

function createAgent(o){
 const S={token:String(o.token||''),roots:(o.roots||[]).slice(),allowKill:!!o.allowKill,origins:(o.origins||[]).slice(),openPath:o.openPath||(async()=>{throw new Error('indisponível')}),showItem:o.showItem||null};
 const tokHash=crypto.createHash('sha256').update(S.token).digest();
 /* ---- amostragem (CPU, memória, rede, disco) ---- */
 let timer=null,last=0,prevCpu=null,prevNet=null,prevIo=null,snap=null,dTick=0,disksC={t:0,v:[]};
 const H={cpu:[],mem:[],rx:[],tx:[],dr:[],dw:[]},push=(k,v)=>{H[k].push(+v.toFixed(2));if(H[k].length>300)H[k].shift()};
 const memInfo=()=>{
  const t=os.totalmem();let avail=os.freemem(),st=0,su=0;
  if(LIN){const m=rd('/proc/meminfo'),g=k=>{const x=new RegExp('^'+k+':\\s+(\\d+)','m').exec(m);return x?+x[1]*1024:0};if(g('MemAvailable'))avail=g('MemAvailable');st=g('SwapTotal');su=st-g('SwapFree')}
  return{total:t,used:t-avail,avail,swap_total:st,swap_used:su,pct:(t-avail)/t*100}};
 function cpuTick(){
  const c=os.cpus(),now=c.map(x=>{const t=x.times;return{i:t.idle,t:t.user+t.nice+t.sys+t.idle+t.irq}});let cores=c.map(()=>0);
  if(prevCpu&&prevCpu.length===now.length)cores=now.map((n,i)=>{const dt=n.t-prevCpu[i].t,di=n.i-prevCpu[i].i;return dt>0?Math.max(0,Math.min(100,100*(1-di/dt))):0});
  prevCpu=now;return{cores,mhz:c[0]?c[0].speed:0}}
 async function netTotals(){
  if(LIN){let rx=0,tx=0;const ifs=[];for(const l of rd('/proc/net/dev').split('\n').slice(2)){const m=/^\s*([^:]+):\s*(.*)$/.exec(l);if(!m||m[1]==='lo')continue;const f=m[2].trim().split(/\s+/).map(Number);rx+=f[0];tx+=f[8];ifs.push({name:m[1],rx_total:f[0],tx_total:f[8]})}return{rx,tx,ifs,ok:true}}
  if(WIN){const out=await sh('netstat',['-e'],4000);for(const l of out.split(/\r?\n/)){const m=/^\S+\s+(\d{3,})\s+(\d{3,})\s*$/.exec(l);if(m)return{rx:+m[1],tx:+m[2],ifs:[],ok:true}}}
  return{rx:0,tx:0,ifs:[],ok:false}}
 function ioTotals(){if(!LIN)return null;let r=0,w=0;for(const l of rd('/proc/diskstats').split('\n')){const f=l.trim().split(/\s+/);if(f.length<10||!/^(sd[a-z]+|vd[a-z]+|xvd[a-z]+|nvme\d+n\d+|mmcblk\d+)$/.test(f[2]))continue;r+=+f[5]*512;w+=+f[9]*512}return{r,w}}
 async function disks(){
  if(Date.now()-disksC.t<15000)return disksC.v;const out=[],cand=WIN?'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l=>l+':\\'):['/'];
  for(const m of cand){try{const s=await fs.promises.statfs(m),total=s.blocks*s.bsize;if(!total)continue;const used=(s.blocks-s.bfree)*s.bsize;out.push({dev:m,mount:WIN?m.slice(0,2):m,fs:'',total,used,pct:used/total*100})}catch(e){}}
  disksC={t:Date.now(),v:out};return out}
 let busy=0;
 async function tick(){
  if(busy)return;busy=1;try{
   const now=Date.now(),c=cpuTick(),pct=c.cores.length?c.cores.reduce((a,b)=>a+b,0)/c.cores.length:0,mem=memInfo();
   let net={rx:0,tx:0,ifaces:[],rx_total:0,tx_total:0,available:false};
   if(!WIN||(dTick++%2===0)){const n=await netTotals();if(n.ok){let r=0,t=0;if(prevNet){const dt=(now-prevNet.t)/1000;if(dt>0){r=Math.max(0,(n.rx-prevNet.rx)/dt);t=Math.max(0,(n.tx-prevNet.tx)/dt)}}
     const ifaces=n.ifs.map(i=>{const p=prevNet&&prevNet.m&&prevNet.m[i.name],dt=prevNet?(now-prevNet.t)/1000:0;return{name:i.name,rx_total:i.rx_total,tx_total:i.tx_total,rx:p&&dt>0?Math.max(0,(i.rx_total-p.rx_total)/dt):0,tx:p&&dt>0?Math.max(0,(i.tx_total-p.tx_total)/dt):0}});
     prevNet={t:now,rx:n.rx,tx:n.tx,m:Object.fromEntries(n.ifs.map(i=>[i.name,i]))};net={rx:r,tx:t,ifaces,rx_total:n.rx,tx_total:n.tx,available:true}}}
   else if(snap)net=snap.net;
   let io=null;const it=ioTotals();if(it){if(prevIo){const dt=(now-prevIo.t)/1000;if(dt>0)io={read:Math.max(0,(it.r-prevIo.r)/dt),write:Math.max(0,(it.w-prevIo.w)/dt)}}else io={read:0,write:0};prevIo={t:now,r:it.r,w:it.w}}
   if(prevCpu&&snap){push('cpu',pct);push('mem',mem.pct);push('rx',net.rx);push('tx',net.tx);if(io){push('dr',io.read);push('dw',io.write)}}
   snap={t:now/1000,cpu:{pct,cores:c.cores,load:WIN?[]:os.loadavg(),mhz:c.mhz},mem,disks:await disks(),io,net,uptime:os.uptime(),temps:[],battery:null}
  }finally{busy=0}}
 const touch=()=>{last=Date.now();if(!timer){timer=setInterval(()=>{if(Date.now()-last>15000){clearInterval(timer);timer=null;snap=null;prevCpu=prevNet=prevIo=null;Object.values(H).forEach(a=>a.length=0);return}tick()},1000);tick()}};
 /* ---- processos ---- */
 let procC={t:0,v:[]},prevP=new Map(),prevPT=0;
 async function procs(){
  if(Date.now()-procC.t<1800)return procC.v;let L=[];const now=Date.now();
  if(WIN){
   const out=await sh('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',"Get-Process | ForEach-Object { '{0}|{1}|{2}|{3}|{4}' -f $_.Id,$_.ProcessName,[math]::Round($_.CPU,3),$_.WorkingSet64,$_.Threads.Count }"],12000),dt=(now-prevPT)/1000,n=Math.max(1,os.cpus().length),cur=new Map();
   for(const l of out.split(/\r?\n/)){const f=l.split('|');if(f.length<5)continue;const pid=+f[0],cpu=parseFloat(String(f[2]).replace(',','.'))||0;cur.set(pid,cpu);const p=prevP.get(pid);
    L.push({pid,name:f[1],cpu:p!==undefined&&prevPT&&dt>0?Math.max(0,Math.min(100,(cpu-p)/dt/n*100)):0,rss:+f[3]||0,user:'',state:'running',threads:+f[4]||0})}
   prevP=cur;prevPT=now}
  else{
   const out=await sh('ps',LIN?['-eo','pid=,pcpu=,rss=,user=,nlwp=,comm=']:['-Ao','pid=,pcpu=,rss=,user=,comm='],6000);
   for(const l of out.split('\n')){const m=(LIN?/^\s*(\d+)\s+([\d.]+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(.+)$/:/^\s*(\d+)\s+([\d.]+)\s+(\d+)\s+(\S+)\s+()(.+)$/).exec(l);if(m)L.push({pid:+m[1],name:path.basename(m[6].trim()),cpu:+m[2],rss:+m[3]*1024,user:m[4],state:'running',threads:+m[5]||0})}}
  procC={t:Date.now(),v:L};return L}
 /* ---- apps instalados (atalhos do Menu Iniciar, Windows) ---- */
 let APPS=null;
 async function loadApps(){
  if(APPS)return APPS;const out=[];
  if(WIN){const dirs=[path.join(process.env.ProgramData||'C:\\ProgramData','Microsoft','Windows','Start Menu','Programs'),path.join(process.env.APPDATA||'','Microsoft','Windows','Start Menu','Programs')].filter(Boolean);
   const walk=async(d,dep)=>{if(dep>3)return;let es;try{es=await fs.promises.readdir(d,{withFileTypes:true})}catch(e){return}for(const e of es){const f=path.join(d,e.name);if(e.isDirectory())await walk(f,dep+1);else if(/\.lnk$/i.test(e.name)&&!/uninstall|desinstal/i.test(e.name))out.push({id:crypto.createHash('sha1').update(f).digest('hex').slice(0,12),name:e.name.replace(/\.lnk$/i,''),comment:'',icon:'',cats:[],path:f})}};
   for(const d of dirs)await walk(d,0);const seen=new Set();APPS=out.filter(a=>!seen.has(a.name.toLowerCase())&&seen.add(a.name.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name))}
  else APPS=[];return APPS}
 /* ---- índice de arquivos das pastas liberadas ---- */
 const FI={items:[],indexing:0,run:0};
 async function indexFiles(){
  const run=++FI.run;FI.indexing=1;const out=[],skip=/^(node_modules|\$recycle\.bin|system volume information|appdata)$/i;
  const walk=async(d,dep)=>{if(dep>6||out.length>=60000||run!==FI.run)return;let it;try{it=await fs.promises.opendir(d)}catch(e){return}
   for await(const e of it){if(e.name[0]==='.'||skip.test(e.name)||e.isSymbolicLink())continue;const f=path.join(d,e.name);out.push({n:e.name,l:e.name.toLowerCase(),p:f,d:e.isDirectory()});if(e.isDirectory())await walk(f,dep+1);if(out.length>=60000||run!==FI.run)return}};
  for(const r of S.roots)await walk(r,0);if(run===FI.run){FI.items=out;FI.indexing=0}}
 async function searchFiles(q,n){
  q=q.toLowerCase().trim();if(!q)return[];const hits=[];
  for(const it of FI.items){const i=it.l.indexOf(q);if(i>=0)hits.push([i===0?0:1,it.l.length,it])}
  hits.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const out=[];
  for(const[,,it]of hits.slice(0,n)){let s={size:0,mtimeMs:0};try{s=await fs.promises.stat(it.p)}catch(e){}out.push({name:it.n,path:it.p,dir:it.d,size:it.d?0:s.size,mtime:s.mtimeMs/1000})}return out}
 /* ---- info estática ---- */
 let GPUS=[];if(WIN)sh('powershell.exe',['-NoProfile','-NonInteractive','-Command','(Get-CimInstance Win32_VideoController).Name'],8000).then(o=>{GPUS=o.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)});
 const info=()=>{const c=os.cpus(),ips=[];for(const[n,a]of Object.entries(os.networkInterfaces()))for(const x of a||[])if(x.family==='IPv4'&&!x.internal)ips.push({iface:n,ip:x.address});
  let user='';try{user=os.userInfo().username}catch(e){}
  return{hostname:os.hostname(),os:(os.version?os.version():'')+' '+os.release(),kernel:os.release(),arch:os.arch(),cpu:c[0]?c[0].model.trim():'?',cores_logical:c.length,cores_physical:0,mem_total:os.totalmem(),gpus:GPUS,ips,user,desktop:'',session:'',shell:process.env.SHELL||process.env.ComSpec||'',python:'',collector:'node',boot:Date.now()/1000-os.uptime()}};
 /* ---- HTTP ---- */
 const HOST_RE=/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/,ORIG_RE=/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
 const originOk=o=>o===undefined||o==='null'||ORIG_RE.test(o)||S.origins.includes(o);
 const authed=req=>{const m=/^Bearer (.+)$/.exec(req.headers.authorization||'');if(!m||!S.token)return false;return crypto.timingSafeEqual(crypto.createHash('sha256').update(m[1]).digest(),tokHash)};
 function send(req,res,code,obj){
  const b=Buffer.from(JSON.stringify(obj)),h={'Content-Type':'application/json; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},o=req.headers.origin;
  if(o&&originOk(o)){h['Access-Control-Allow-Origin']=o;h.Vary='Origin';h['Access-Control-Allow-Headers']='authorization, content-type';h['Access-Control-Allow-Methods']='GET, POST, OPTIONS';h['Access-Control-Allow-Private-Network']='true';h['Access-Control-Max-Age']='600'}
  res.writeHead(code,h);res.end(b)}
 const body=req=>new Promise(res=>{let d='';req.on('data',c=>{d+=c;if(d.length>16384){d='';req.destroy()}});req.on('end',()=>{try{res(JSON.parse(d||'{}'))}catch(e){res({})}})});
 async function route(req,res){
  try{
   if(!HOST_RE.test(req.headers.host||''))return send(req,res,403,{error:'host não permitido'});
   if(!originOk(req.headers.origin))return send(req,res,403,{error:'origem não permitida'});
   if(req.method==='OPTIONS')return send(req,res,204,{});
   const u=new URL(req.url,'http://x'),p=u.pathname,q=Object.fromEntries(u.searchParams);
   if(p==='/api/ping'){const b={agent:'punk',version:VERSION};if(!authed(req))return send(req,res,200,{...b,auth:'required'});return send(req,res,200,{...b,auth:'ok',collector:'node',platform:process.platform,allow_kill:S.allowKill,roots:S.roots,apps:WIN})}
   if(!authed(req))return send(req,res,401,{error:'token inválido ou ausente'});
   if(req.method==='GET'&&p==='/api/info')return send(req,res,200,info());
   if(req.method==='GET'&&p==='/api/stats'){touch();if(!snap||!prevCpu)return send(req,res,503,{error:'coletando a primeira amostra, tente de novo em 1s'});
    const n=Math.max(10,Math.min(300,+q.hist||120)),hist=Object.fromEntries(Object.entries(H).map(([k,v])=>[k,v.slice(-n)]));return send(req,res,200,{...snap,hist})}
   if(req.method==='GET'&&p==='/api/procs'){touch();const L=(await procs()).slice(),k=q.sort==='mem'?(a,b)=>b.rss-a.rss:(a,b)=>b.cpu-a.cpu;return send(req,res,200,{procs:L.sort(k).slice(0,Math.max(1,Math.min(100,+q.n||15)))})}
   if(req.method==='GET'&&p==='/api/apps'){const ql=(q.q||'').toLowerCase(),A=(await loadApps()).filter(a=>!ql||a.name.toLowerCase().includes(ql));return send(req,res,200,{apps:A.slice(0,Math.min(100,+q.n||50)).map(({path:_p,...a})=>a),total:(await loadApps()).length})}
   if(req.method==='GET'&&p==='/api/files'){if(!FI.items.length&&!FI.indexing)indexFiles();return send(req,res,200,{files:await searchFiles(q.q||'',Math.max(1,Math.min(100,+q.n||30))),indexing:!!FI.indexing,count:FI.items.length})}
   if(req.method==='POST'&&p==='/api/reindex'){indexFiles();return send(req,res,200,{ok:true})}
   if(req.method==='POST'&&p==='/api/launch'){const b=await body(req),a=(await loadApps()).find(x=>x.id===String(b.id||''));if(!a)return send(req,res,404,{error:'aplicativo não encontrado'});await S.openPath(a.path);return send(req,res,200,{ok:true,name:a.name})}
   if(req.method==='POST'&&p==='/api/open'){const b=await body(req);let real;try{real=fs.realpathSync(String(b.path||''))}catch(e){return send(req,res,403,{error:'arquivo fora das pastas indexadas ou inexistente'})}
    if(!S.roots.some(r=>{try{return isInside(fs.realpathSync(r),real)}catch(e){return false}}))return send(req,res,403,{error:'arquivo fora das pastas indexadas ou inexistente'});
    const dir=fs.statSync(real).isDirectory();
    if(b.reveal&&S.showItem){S.showItem(real);return send(req,res,200,{ok:true})}
    if(!dir&&BLOCKED_EXT.has(path.extname(real).toLowerCase()))return send(req,res,403,{error:'tipo executável/script bloqueado por segurança; use "Abrir pasta"'});
    await S.openPath(dir||!b.reveal?real:path.dirname(real));return send(req,res,200,{ok:true})}
   if(req.method==='POST'&&p==='/api/kill'){if(!S.allowKill)return send(req,res,403,{error:'encerrar processos está desligado (ative em Configurações > Sistema)'});
    const b=await body(req),pid=+b.pid;if(!Number.isInteger(pid)||pid<5)return send(req,res,400,{error:'PID inválido'});if(pid===process.pid)return send(req,res,403,{error:'não encerro o próprio Hub'});
    try{process.kill(pid)}catch(e){return send(req,res,e.code==='ESRCH'?404:403,{error:e.code==='ESRCH'?'processo não existe mais':'sem permissão para encerrar este processo'})}procC.t=0;return send(req,res,200,{ok:true})}
   return send(req,res,404,{error:'rota desconhecida'})
  }catch(e){try{send(req,res,500,{error:String(e&&e.message||e)})}catch(x){}}}
 let srv=null;
 return{
  async start(port=0){srv=http.createServer(route);await new Promise((ok,no)=>{srv.once('error',no);srv.listen(port,'127.0.0.1',ok)});indexFiles();return{port:srv.address().port,url:'http://127.0.0.1:'+srv.address().port}},
  stop(){if(timer)clearInterval(timer);timer=null;FI.run++;if(srv)srv.close()},
  setAllowKill(b){S.allowKill=!!b},setRoots(r){S.roots=r.slice();indexFiles()},
  _state:S};
}
module.exports={createAgent,VERSION};
