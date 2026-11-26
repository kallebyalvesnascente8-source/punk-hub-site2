'use strict';
/* Garante que o binario do Electron exista (dist/electron.exe no Windows).
   Mostra TODO o erro do download, testa a rede, tenta de novo com cache limpo e com espelho,
   e aceita um .zip baixado manualmente (--zip caminho, ou colocado na pasta do projeto/Downloads).
   Uso: node scripts/ensure-electron.js [--zip arquivo.zip] [--check] */
const fs=require('fs'),os=require('os'),path=require('path'),https=require('https'),{spawnSync}=require('child_process');
const ROOT=path.join(__dirname,'..'),EL=path.join(ROOT,'node_modules','electron'),DIST=path.join(EL,'dist'),LOG=path.join(ROOT,'install-electron.log');
const EXE=process.platform==='win32'?'electron.exe':process.platform==='darwin'?'Electron.app/Contents/MacOS/Electron':'electron';
const EXE_PATH=path.join(DIST,EXE);
const log=s=>{console.log(s);try{fs.appendFileSync(LOG,s+'\n')}catch(e){}};
const has=()=>fs.existsSync(EXE_PATH);
const args=process.argv.slice(2),zipArg=args.includes('--zip')?args[args.indexOf('--zip')+1]:'';
try{fs.writeFileSync(LOG,`== ensure-electron ${new Date().toISOString()} node ${process.version} ${process.platform}/${process.arch}\n`)}catch(e){}

if(!fs.existsSync(path.join(EL,'package.json'))){log('ERRO: node_modules/electron nao existe. Rode "npm install" primeiro.');process.exit(2)}
const VER=JSON.parse(fs.readFileSync(path.join(EL,'package.json'),'utf8')).version;
const ZIPNAME=`electron-v${VER}-${process.platform==='win32'?'win32':process.platform}-${process.arch}.zip`;
if(has()){log(`OK: ${EXE_PATH} ja existe (Electron ${VER}).`);process.exit(0)}
if(args.includes('--check')){log('FALTA: '+EXE_PATH);process.exit(1)}
log(`Electron ${VER}: binario ausente em ${EXE_PATH}. Alvo do download: ${ZIPNAME}`);

const cacheDir=process.env.electron_config_cache||process.env.ELECTRON_CACHE||(process.platform==='win32'?path.join(process.env.LOCALAPPDATA||os.homedir(),'electron','Cache'):path.join(os.homedir(),'.cache','electron'));
const proxy=process.env.HTTPS_PROXY||process.env.https_proxy||process.env.HTTP_PROXY||process.env.http_proxy||'';
log(`Cache do Electron: ${cacheDir} (${fs.existsSync(cacheDir)?'existe':'nao existe'})`);
log(`Proxy no ambiente: ${proxy||'(nenhum)'}  ELECTRON_MIRROR=${process.env.ELECTRON_MIRROR||'(padrao: github.com)'}  ELECTRON_SKIP_BINARY_DOWNLOAD=${process.env.ELECTRON_SKIP_BINARY_DOWNLOAD||'(vazio)'}`);
if(process.env.ELECTRON_SKIP_BINARY_DOWNLOAD){log('>> ELECTRON_SKIP_BINARY_DOWNLOAD esta definido e impede o download. Removendo so para este processo.');}

function runInstall(extraEnv,label){
 log(`\n--- Tentativa: ${label} ---`);
 const env={...process.env,...extraEnv};delete env.ELECTRON_SKIP_BINARY_DOWNLOAD;
 if(proxy&&!env.ELECTRON_GET_USE_PROXY){env.ELECTRON_GET_USE_PROXY='1';env.GLOBAL_AGENT_HTTPS_PROXY=env.GLOBAL_AGENT_HTTPS_PROXY||proxy}
 const r=spawnSync(process.execPath,[path.join(EL,'install.js')],{cwd:EL,env,encoding:'utf8',maxBuffer:32e6,timeout:600000});
 log(`codigo de saida: ${r.status}${r.signal?' sinal '+r.signal:''}${r.error?' erro '+r.error.message:''}`);
 log('STDOUT:\n'+(r.stdout||'(vazio)'));log('STDERR:\n'+(r.stderr||'(vazio)'));
 return has()}
function probe(host,p='/'){return new Promise(res=>{const t0=Date.now(),q=https.request({host,path:p,method:'HEAD',timeout:8000},x=>{res(`${host}: HTTP ${x.statusCode} (${Date.now()-t0} ms)`);x.resume()});q.on('timeout',()=>{q.destroy();res(`${host}: TIMEOUT 8s`)});q.on('error',e=>res(`${host}: FALHOU ${e.code||''} ${e.message}`));q.end()})}
async function diagnose(){
 log('\n--- Diagnostico de rede (conexao direta, sem proxy) ---');
 for(const h of['registry.npmjs.org','github.com','objects.githubusercontent.com','release-assets.githubusercontent.com','npmmirror.com'])log('  '+await probe(h));
 log('  Leitura: ENOTFOUND = DNS; ECONNRESET/TIMEOUT = firewall, antivirus ou proxy; CERT_* = inspecao SSL (rede corporativa).');
 try{const l=fs.readdirSync(cacheDir);log(`  Itens no cache: ${l.length}`+(l.length?' -> '+l.slice(0,8).join(', '):''))}catch(e){}}
function extract(zip){
 log(`\n--- Extraindo ${zip} para ${DIST} ---`);fs.rmSync(DIST,{recursive:true,force:true});fs.mkdirSync(DIST,{recursive:true});
 let r=process.platform==='win32'?spawnSync('tar',['-xf',zip,'-C',DIST],{encoding:'utf8'}):spawnSync('unzip',['-o','-q',zip,'-d',DIST],{encoding:'utf8'});
 if(r.status!==0&&process.platform==='win32')r=spawnSync('powershell.exe',['-NoProfile','-Command',`Expand-Archive -LiteralPath '${zip.replace(/'/g,"''")}' -DestinationPath '${DIST.replace(/'/g,"''")}' -Force`],{encoding:'utf8'});
 log(`extracao: codigo ${r.status} ${r.stderr||''}`);
 if(has()){fs.writeFileSync(path.join(EL,'path.txt'),EXE);const d=path.join(EL,'dist','electron.d.ts');if(fs.existsSync(d))fs.renameSync(d,path.join(EL,'electron.d.ts'))}
 return has()}
function findZip(){
 const c=[zipArg,path.join(ROOT,ZIPNAME),path.join(os.homedir(),'Downloads',ZIPNAME),path.join(cacheDir,ZIPNAME)].filter(Boolean);
 return c.find(f=>fs.existsSync(f)&&fs.statSync(f).size>1e6)}

(async()=>{
 let ok=false;
 if(zipArg){if(!fs.existsSync(zipArg)){log('ERRO: --zip nao encontrado: '+zipArg);process.exit(2)}ok=extract(zipArg)}
 if(!ok)ok=runInstall({},'padrao (github.com)');
 if(!ok){const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'electron-cache-'));ok=runInstall({ELECTRON_CACHE:tmp,electron_config_cache:tmp},'cache limpo (descarta arquivo corrompido)')}
 if(!ok)ok=runInstall({ELECTRON_MIRROR:'https://npmmirror.com/mirrors/electron/'},'espelho npmmirror.com');
 if(!ok){const z=findZip();if(z){log('\nZip local encontrado: '+z);ok=extract(z)}}
 if(ok){log(`\nSUCESSO: ${EXE_PATH} existe (${(fs.statSync(EXE_PATH).size/1e6).toFixed(1)} MB).`);process.exit(0)}
 await diagnose();
 log(`\nFALHA: o binario nao foi baixado. Leia os erros acima (tambem salvos em ${LOG}).
SOLUCAO MANUAL (funciona mesmo com rede bloqueada):
  1. Em outro computador/rede, ou no navegador, baixe: https://github.com/electron/electron/releases/download/v${VER}/${ZIPNAME}
  2. Salve esse .zip na pasta do projeto (ou em Downloads).
  3. Rode de novo: node scripts/ensure-electron.js   (ou: node scripts/ensure-electron.js --zip "C:\\caminho\\${ZIPNAME}")`);
 process.exit(1)})();
