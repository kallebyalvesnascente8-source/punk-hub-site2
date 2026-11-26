'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const inv=(c,...a)=>ipcRenderer.invoke('punk:'+c,...a);
const b64u=s=>btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
/* Única ponte entre a página e o sistema. Cada função é validada no processo principal. */
contextBridge.exposeInMainWorld('punk',{
 electron:true,platform:process.platform,
 agent:()=>inv('agent'),
 setAllowKill:b=>inv('allowKill',!!b),
 pickFolder:()=>inv('pickFolder'),
 picturesDir:()=>inv('pics'),
 listImages:d=>inv('list',String(d)),
 saveCopy:o=>inv('saveCopy',o),
 saveAs:o=>inv('saveAs',o),
 reveal:p=>inv('reveal',String(p)),
 imgUrl:p=>'punkimg://f/'+b64u(String(p)),
 pickMusicDir:()=>inv('pickMusicDir'),
 musicDir:()=>inv('musicDir'),
 listAudio:d=>inv('listAudio',String(d)),
 audioUrl:p=>'punkaudio://f/'+b64u(String(p))});
