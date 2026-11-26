'use strict';
/* Roda depois de "cap add android". Idempotente. Ajusta o projeto gerado:
   - permite HTTP (Ollama em localhost ou na rede local) via usesCleartextTraffic
   - instala os icones do PUNK HUB e a cor de fundo do icone adaptativo */
const fs=require('fs'),path=require('path');
const A=path.join(__dirname,'..','android','app','src','main'),R=path.join(__dirname,'..','resources');
const man=path.join(A,'AndroidManifest.xml');
if(!fs.existsSync(man)){console.error('ERRO: '+man+' nao existe. Rode "npx cap add android" primeiro.');process.exit(1)}
let x=fs.readFileSync(man,'utf8');
if(!/usesCleartextTraffic/.test(x)){
 const y=x.replace(/<application\b/,'<application android:usesCleartextTraffic="true"');
 if(y===x){console.error('ERRO: nao achei <application> no manifest');process.exit(1)}x=y;fs.writeFileSync(man,x);console.log('manifest: usesCleartextTraffic=true')}
else console.log('manifest: usesCleartextTraffic ja presente');
let n=0;
for(const d of fs.readdirSync(R)){
 if(!d.startsWith('mipmap-'))continue;const dst=path.join(A,'res',d);fs.mkdirSync(dst,{recursive:true});
 for(const f of fs.readdirSync(path.join(R,d))){fs.copyFileSync(path.join(R,d,f),path.join(dst,f));n++}}
console.log('icones copiados:',n);
const vals=path.join(A,'res','values');fs.mkdirSync(vals,{recursive:true});
fs.writeFileSync(path.join(vals,'ic_launcher_background.xml'),'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0D0F0E</color>\n</resources>\n');
console.log('cor de fundo do icone: #0D0F0E');
/* versao do app = package.json (versionCode sobe a cada versao, senao o Android recusa atualizar por cima) */
{const v=require('../package.json').version,m=/^(\d+)\.(\d+)\.(\d+)/.exec(v);
 const gp=path.join(__dirname,'..','android','app','build.gradle');
 if(m&&fs.existsSync(gp)){const code=(+m[1])*10000+(+m[2])*100+(+m[3]);let g=fs.readFileSync(gp,'utf8'),o=g;
  g=g.replace(/versionCode\s+\d+/,'versionCode '+code).replace(/versionName\s+"[^"]*"/,'versionName "'+v+'"');
  if(g!==o){fs.writeFileSync(gp,g);console.log('versao do app: '+v+' (versionCode '+code+')')}else if(/versionCode\s+\d+/.test(g)&&g.includes('versionName "'+v+'"'))console.log('versao do app ja em '+v);else console.log('AVISO: nao achei versionCode/versionName em build.gradle; ajuste manualmente.')}}
