'use strict';
/* Confere se www/index.html existe, e se e o Hub com o modulo mobile. */
const fs=require('fs'),path=require('path');
const f=path.join(__dirname,'..','www','index.html');
if(!fs.existsSync(f)){console.error('ERRO: www/index.html ausente');process.exit(1)}
const s=fs.readFileSync(f,'utf8');
const need=['PUNK HUB','const MOB=','mobSave','backButton','PUNK Photos'];
const miss=need.filter(n=>!s.includes(n));
if(miss.length){console.error('ERRO: www/index.html nao parece o Hub mobile. Faltam:',miss.join(', '));process.exit(1)}
console.log('OK: www/index.html ('+(s.length/1024).toFixed(0)+' KB) contem o Hub com modulo mobile.');
