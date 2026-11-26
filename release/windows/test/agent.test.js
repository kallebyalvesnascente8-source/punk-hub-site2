const http=require('http'),os=require('os'),fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const {createAgent}=require('../agent');
let pass=0,fail=0;const ok=(n,c,x='')=>{c?pass++:fail++;console.log(c?'  ok  ':'  FAIL',n,c?'':x)};
const TOK='tok_0123456789abcdefghijklmnop';
function req(port,p,{method='GET',token=TOK,headers={},body}={}){return new Promise(res=>{const h={...headers};if(token)h.Authorization='Bearer '+token;if(body)h['Content-Type']='application/json';
 const r=http.request({host:'127.0.0.1',port,path:p,method,headers:h},x=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>{let j={};try{j=JSON.parse(d)}catch(e){}res({s:x.statusCode,j,h:x.headers})})});r.on('error',e=>res({s:0,err:e.message}));if(body)r.write(JSON.stringify(body));r.end()})}
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ag-'));fs.writeFileSync(root+'/relatorio-final.txt','x');fs.writeFileSync(root+'/script.sh','#!/bin/sh');fs.mkdirSync(root+'/sub');fs.writeFileSync(root+'/sub/foto.png','x');
 const outside=fs.mkdtempSync(path.join(os.tmpdir(),'out-'));fs.writeFileSync(outside+'/segredo.txt','s');
 const opened=[];const a=createAgent({token:TOK,roots:[root],allowKill:false,origins:['app://hub'],openPath:async p=>{opened.push(p)}});
 const {port}=await a.start(0);
 const r1=await req(port,'/api/ping',{token:''});ok('ping sem token: mínimo e auth=required',r1.s===200&&r1.j.auth==='required'&&!r1.j.platform);
 ok('ping com token traz detalhes',(await req(port,'/api/ping')).j.collector==='node');
 ok('401 sem token',(await req(port,'/api/info',{token:''})).s===401);
 ok('401 token errado',(await req(port,'/api/info',{token:'x'.repeat(30)})).s===401);
 ok('403 Host de DNS rebinding',(await req(port,'/api/info',{headers:{Host:'evil.com'}})).s===403);
 ok('403 Origin estranha',(await req(port,'/api/info',{headers:{Origin:'https://evil.com'}})).s===403);
 const co=await req(port,'/api/info',{headers:{Origin:'app://hub'}});ok('Origin app://hub liberada com CORS',co.s===200&&co.h['access-control-allow-origin']==='app://hub');
 const pre=await req(port,'/api/stats',{method:'OPTIONS',token:'',headers:{Origin:'app://hub'}});ok('preflight com Private Network Access',pre.s===204&&pre.h['access-control-allow-private-network']==='true');
 const info=(await req(port,'/api/info')).j;ok('info bate com o sistema',info.hostname===os.hostname()&&info.cores_logical===os.cpus().length&&info.mem_total===os.totalmem());
 let st=await req(port,'/api/stats');ok('1ª amostra devolve 503 (sem inventar)',st.s===503);
 const NB=Math.max(2,Math.min(4,os.cpus().length)),burners=[];for(let k=0;k<NB;k++)burners.push(spawn(process.execPath,['-e','const t=Date.now();while(Date.now()-t<9000);']));
 const burn=burners[0],burn2=burners[1];
 for(let k=0;k<30;k++){await new Promise(r=>setTimeout(r,500));st=await req(port,'/api/stats');if(st.s===200&&st.j.hist&&st.j.hist.cpu.length>=2)break}
 await new Promise(r=>setTimeout(r,2000));st=await req(port,'/api/stats');
 ok('stats com formato esperado',st.s===200&&st.j.cpu&&Array.isArray(st.j.cpu.cores)&&st.j.mem&&Array.isArray(st.j.disks)&&st.j.net&&st.j.hist.cpu.length>=2,JSON.stringify(st.j).slice(0,200));
 ok('RAM total = os.totalmem()',st.j.mem.total===os.totalmem());
 let availRef=os.freemem();if(process.platform==='linux'){const m=/^MemAvailable:\s+(\d+)/m.exec(fs.readFileSync('/proc/meminfo','utf8'));if(m)availRef=+m[1]*1024}
 ok('RAM disponível confere com o sistema (±10%)',Math.abs(st.j.mem.avail-availRef)/availRef<.10,st.j.mem.avail+' vs '+availRef);
 const d0=st.j.disks[0],sf=fs.statfsSync(process.platform==='win32'?d0.mount+'\\':d0.mount);ok('disco '+d0.mount+' confere com statfs (±1%)',Math.abs(d0.total-sf.blocks*sf.bsize)/(sf.blocks*sf.bsize)<.01,JSON.stringify(d0));
 const expMin=Math.min(40,50*NB/os.cpus().length*0.8*1);ok('CPU reage a carga real ('+st.j.cpu.pct.toFixed(0)+'% >= '+expMin.toFixed(0)+'%)',st.j.cpu.pct>=expMin);
 ok('rede disponível ('+process.platform+')',st.j.net.available===true);
 const pr=await req(port,'/api/procs?n=100&sort=cpu');ok('processos incluem o que está queimando CPU',pr.j.procs.some(p=>p.pid===burn.pid),JSON.stringify(pr.j).slice(0,100));
 ok('lista de processos tem campos',pr.j.procs[0].name&&typeof pr.j.procs[0].rss==='number');
 await new Promise(r=>setTimeout(r,1500));
 const fl=await req(port,'/api/files?q=relatorio');ok('busca de arquivo nas pastas liberadas',fl.s===200&&fl.j.files.some(f=>f.name==='relatorio-final.txt'),JSON.stringify(fl.j));
 ok('busca não vaza arquivo fora das raízes',!(await req(port,'/api/files?q=segredo')).j.files.length);
 ok('busca acha em subpasta',(await req(port,'/api/files?q=foto')).j.files.length===1);
 ok('abrir arquivo fora das raízes = 403',(await req(port,'/api/open',{method:'POST',body:{path:outside+'/segredo.txt'}})).s===403);
 ok('abrir com travessia ../ = 403',(await req(port,'/api/open',{method:'POST',body:{path:root+'/../'+path.basename(outside)+'/segredo.txt'}})).s===403);
 let symOk=true;try{fs.symlinkSync(outside+'/segredo.txt',root+'/atalho.txt')}catch(e){symOk=false;console.log('  SKIP symlink para fora = 403 (sem permissão para criar symlink neste sistema: '+e.code+'; no Windows ative o Modo Desenvolvedor ou rode como administrador)')}
 if(symOk)ok('symlink para fora = 403',(await req(port,'/api/open',{method:'POST',body:{path:root+'/atalho.txt'}})).s===403);
 ok('script .sh bloqueado',(await req(port,'/api/open',{method:'POST',body:{path:root+'/script.sh'}})).s===403&&!opened.length);
 ok('abrir arquivo permitido chama openPath',(await req(port,'/api/open',{method:'POST',body:{path:root+'/relatorio-final.txt'}})).s===200&&opened[0].endsWith('relatorio-final.txt'));
 ok('kill desligado = 403',(await req(port,'/api/kill',{method:'POST',body:{pid:burn2.pid}})).s===403);
 a.setAllowKill(true);
 ok('kill com PID inválido = 400',(await req(port,'/api/kill',{method:'POST',body:{pid:'1; rm'}})).s===400&&(await req(port,'/api/kill',{method:'POST',body:{pid:1}})).s===400);
 ok('kill não encerra o próprio agente',(await req(port,'/api/kill',{method:'POST',body:{pid:process.pid}})).s===403);
 ok('kill liberado encerra processo',(await req(port,'/api/kill',{method:'POST',body:{pid:burn2.pid}})).s===200);
 await new Promise(r=>setTimeout(r,500));let alive=true;try{process.kill(burn2.pid,0)}catch(e){alive=false}ok('processo realmente morreu',!alive);
 ok('rota desconhecida 404',(await req(port,'/api/xyz')).s===404);
 ok('launch de app inexistente 404',(await req(port,'/api/launch',{method:'POST',body:{id:'nada'}})).s===404);
 burners.forEach(b=>{try{b.kill()}catch(e){}});
 // sem requisições a coleta para (economia)
 console.log(`${pass} ok, ${fail} falhas`);a.stop();process.exit(fail?1:0)})().catch(e=>{console.error('ERRO NO TESTE:',e&&e.stack||e);process.exit(1)});
