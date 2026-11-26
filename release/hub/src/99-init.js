/* =====================================================================
   99 INICIALIZAÇÃO
   ===================================================================== */
async function boot(){
 try{S=merge(JSON.parse(localStorage.getItem(K)))}catch(e){S=merge()}
 /* migração da v1: papel de parede em data URL vira arquivo no IndexedDB */
 if(MIG.img){try{S.t.wimg=await IMG.add(await IMG.fromData(MIG.img))}catch(e){S.t.wall='aurora'}}
 await IMG.load(usedIds());await Promise.all(S.fonts.map(fontReg));
 muBoot();
 apply(1);widgets();bar();tick();setInterval(tick,1000);chkDue();
 if(PX){try{const a=await PX.agent();S.agent={url:a.url,token:a.token};save()}catch(e){}}
 if(S.agent.token)agConnect(1);else agSched();
 aiPing().then(()=>{if(AI.status==='ok')olRefresh()});
 setInterval(()=>{if(!document.hidden&&AI.status==='ok'&&S.widgets.some(w=>w.type==='ollama'))olRefresh()},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();chkEv();agPoll()}});
 matchMedia('(prefers-reduced-motion:reduce)').addEventListener&&matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change',()=>fxApply());
 relBoot();document.body.dataset.ready=1}
boot();
