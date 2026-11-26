'use strict';
/* Gera o APK instalavel (debug, assinado com a chave de depuracao do Android).
   Requisitos: Node 20+, JDK 21 (17 minimo), Android SDK (ANDROID_HOME) com plataforma e build-tools.
   Uso: node scripts/build-apk.js            (completo)
        node scripts/build-apk.js --sync-only (so atualiza www e o projeto nativo) */
const {spawnSync}=require('child_process'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),WIN=process.platform==='win32',npx=WIN?'npx.cmd':'npx';
const run=(cmd,args,cwd=ROOT,label)=>{console.log('\n> '+(label||cmd+' '+args.join(' ')));const r=spawnSync(cmd,args,{cwd,stdio:'inherit',shell:WIN});if(r.status!==0){console.error('\nFALHOU ('+(r.status)+'): '+(label||cmd+' '+args.join(' ')));process.exit(r.status||1)}};
run(process.execPath,['scripts/check-web.js'],ROOT,'conferir www/index.html');
if(!fs.existsSync(path.join(ROOT,'node_modules','@capacitor','cli')))run(WIN?'npm.cmd':'npm',['install','--no-audit','--no-fund'],ROOT,'npm install');
if(!fs.existsSync(path.join(ROOT,'android','app','src','main','AndroidManifest.xml')))run(npx,['cap','add','android']);
run(npx,['cap','sync','android']);
run(process.execPath,['scripts/patch-android.js'],ROOT,'ajustar projeto Android');
if(process.argv.includes('--sync-only')){console.log('\nSincronizado.');process.exit(0)}
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
if(!sdk||!fs.existsSync(sdk)){console.error('\nERRO: Android SDK nao encontrado. Instale o Android Studio (ele baixa o SDK) e defina ANDROID_HOME (ex.: %LOCALAPPDATA%\\Android\\Sdk), ou use o workflow do GitHub.');process.exit(1)}
const lp=path.join(ROOT,'android','local.properties');
fs.writeFileSync(lp,'sdk.dir='+sdk.replace(/\\/g,'\\\\')+'\n');
const droid=path.join(ROOT,'android');
run(WIN?'gradlew.bat':'./gradlew',['assembleDebug','--no-daemon'],droid,'gradlew assembleDebug');
const apk=path.join(droid,'app','build','outputs','apk','debug','app-debug.apk');
if(!fs.existsSync(apk)){console.error('ERRO: APK nao encontrado em '+apk);process.exit(1)}
const out=path.join(ROOT,'dist-apk');fs.mkdirSync(out,{recursive:true});
const dst=path.join(out,'PUNK-HUB-'+require('../package.json').version+'.apk');fs.copyFileSync(apk,dst);
console.log('\nPRONTO: '+dst+' ('+(fs.statSync(dst).size/1e6).toFixed(1)+' MB)');
