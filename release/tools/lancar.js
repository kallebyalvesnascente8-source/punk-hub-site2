'use strict';
/* Prepara uma nova versao: node tools/lancar.js 1.2.0
   Atualiza o numero em todos os lugares, regera o Hub e mostra os 3 comandos para publicar. */
const fs=require('fs'),path=require('path'),cp=require('child_process');
const R=path.join(__dirname,'..'),v=process.argv[2];
if(!/^\d+\.\d+\.\d+$/.test(v||'')){console.error('Use assim: node tools/lancar.js 1.2.0');process.exit(1)}
const cur=require('../windows/package.json').version,n=s=>s.split('.').map(Number);
const [a,b]=[n(cur),n(v)];if(!(b[0]-a[0]||b[1]-a[1]||b[2]-a[2])||(b[0]<a[0]||(b[0]===a[0]&&(b[1]<a[1]||(b[1]===a[1]&&b[2]<=a[2]))))){console.error('A nova versao ('+v+') precisa ser maior que a atual ('+cur+').');process.exit(1)}
const edit=(f,fn)=>{const p=path.join(R,f),s=fs.readFileSync(p,'utf8'),t=fn(s);if(t===s){console.error('Nao consegui atualizar '+f);process.exit(1)}fs.writeFileSync(p,t)};
for(const f of ['windows/package.json','android/package.json'])edit(f,s=>s.replace(/"version":\s*"[^"]*"/,'"version": "'+v+'"'));
edit('hub/src/96-release.js',s=>s.replace(/HUB_VER='[^']*'/,"HUB_VER='"+v+"'"));
const r=cp.spawnSync(process.execPath,[path.join(R,'hub','build.js')],{stdio:'inherit'});if(r.status)process.exit(1);
const t=cp.spawnSync(process.execPath,[path.join(R,'windows','test','unit.js')],{stdio:'inherit'});if(t.status){console.error('Os testes falharam. Nada foi publicado.');process.exit(1)}
console.log('\nVersao '+v+' pronta. Agora publique (cole no terminal, na pasta do projeto):\n\n  git add -A\n  git commit -m "PUNK HUB '+v+'"\n  git tag v'+v+'\n  git push && git push --tags\n\nO GitHub compila o EXE e o APK sozinho e cria o Release v'+v+' (leva uns 15 minutos).');
