'use strict';
/* Junta hub/src/*.js + head.html no Hub de arquivo unico e copia para o app Windows e Android.
   Uso: node hub/build.js */
const fs=require('fs'),path=require('path');
const SRC=path.join(__dirname,'src'),ROOT=path.join(__dirname,'..');
const PARTS=['00-util', '10-theme-data', '20-state', '30-apply', '40-icons', '50-core', '60-widgets', '70-agent', '80-apps', '85-legacy', '90-ai', '92-photos', '93-mobile', '94-music', '94-musicx', '96-release', '95-settings', '99-init'];
let out=fs.readFileSync(path.join(SRC,'head.html'),'utf8');if(!out.endsWith('\n'))out+='\n';
for(const p of PARTS)out+=fs.readFileSync(path.join(SRC,p+'.js'),'utf8').replace(/\n+$/,'')+'\n';
out+='</script></body></html>\n';
try{new Function(out.slice(out.indexOf('<script>')+8,out.lastIndexOf('</script>')))}catch(e){console.error('ERRO de sintaxe no Hub: '+e.message);process.exit(1)}
const dist=path.join(__dirname,'dist');fs.mkdirSync(dist,{recursive:true});fs.writeFileSync(path.join(dist,'index.html'),out);
for(const d of ['windows/app/index.html','android/www/index.html']){const f=path.join(ROOT,d);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,out)}
console.log('Hub gerado ('+(out.length/1024).toFixed(0)+' KB) e copiado para windows/app e android/www');
