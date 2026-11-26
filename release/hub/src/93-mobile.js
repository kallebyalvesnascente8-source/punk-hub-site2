/* =====================================================================
   93 MOBILE (Android, via Capacitor). Só ativa dentro do app Android;
   no Windows e no navegador nada aqui muda o comportamento.
   - botão Voltar do Android fecha visualizador, painéis e janelas
   - salvar/exportar arquivos pela folha de compartilhamento do Android
   - rótulos e orientações próprios do celular
   ===================================================================== */
const MOB=!!(window.Capacitor&&typeof Capacitor.isNativePlatform==='function'&&Capacitor.isNativePlatform());
const CP=n=>MOB&&Capacitor.Plugins&&Capacitor.Plugins[n]||null;
async function mobSave(blob,name){
 const FS=CP('Filesystem'),SH=CP('Share');if(!FS||!SH)return false;
 const b64=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=no;r.readAsDataURL(blob)});
 const safe=String(name).replace(/[^\w.\- ]/g,'_').slice(0,100)||'punk-hub';
 const r=await FS.writeFile({path:safe,data:b64,directory:'CACHE'});
 await SH.share({title:safe,files:[r.uri]});return true}
if(MOB){
 document.documentElement.dataset.mob='1';
 W.sysinfo.n='Informações do dispositivo';
 const AP=CP('App');
 if(AP&&AP.addListener)AP.addListener('backButton',()=>{
  const pv=$('#pv');
  if(pv&&!pv.hidden){document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));return}
  if(['#menu','#cal','#noti','#qs','#ctx'].some(s=>{const e=$(s);return e&&!e.hidden})){closePops();return}
  if(!$('#win').hidden){openApp('home');return}
  if(AP.minimizeApp)AP.minimizeApp()});
 const SB=CP('StatusBar');if(SB){try{SB.setStyle({style:'DARK'});SB.setBackgroundColor({color:'#0d0f0e'})}catch(e){}}
 const SP=CP('SplashScreen');if(SP)setTimeout(()=>SP.hide(),200)}
