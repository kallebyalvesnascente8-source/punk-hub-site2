/* =====================================================================
   20 ESTADO PERSISTENTE (localStorage) E VALIDAÇÃO
   Tudo que o usuário configura vive em S. merge() valida qualquer entrada
   (localStorage, backup importado) e migra versões antigas.
   Imagens e fontes ficam no IndexedDB; S só guarda os ids.
   ===================================================================== */
const AI_SYS='Voce e o PUNK, assistente do PUNK HUB, um ambiente pessoal inspirado em Linux. Responda em portugues do Brasil, de forma direta e objetiva. Use blocos de codigo para comandos e explique em uma frase o que cada um faz.';
const BAR_D=()=>({float:0,labels:'auto',align:'center',pins:['home','tasks','monitor','tech','gaming','tools','photos','music','projects','punk','settings'],links:[],sec:0,date:0,menuLabel:'PUNK',show:{search:1,notif:1,qs:1,clock:1}});
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/,icOk=v=>typeof v==='string'&&/^([bi]:[\w-]{1,40}|t:.{1,6})$/u.test(v);
const MU_TYPES={mp3:1,wav:1,flac:1,ogg:1};
function cleanMusic(j){
 j=j&&typeof j==='object'?j:{};const rx=(p,x)=>typeof x==='string'&&new RegExp('^'+p+'[a-z0-9]{8,}$').test(x);
 const tr=arr(j.tracks).slice(0,3000).filter(t=>t&&rx('mu',t.id)&&MU_TYPES[t.t]&&(rx('au',t.a)||(typeof t.p==='string'&&t.p&&t.p.length<500))).map(t=>({id:t.id,n:String(t.n||'Sem título').slice(0,200),ar:String(t.ar||'').slice(0,150),al:String(t.al||'').slice(0,150),y:num(t.y,0,3000,0)|0,tn:num(t.tn,0,999,0)|0,d:num(t.d,0,259200,0),s:+t.s||0,t:t.t,a:rx('au',t.a)?t.a:'',p:rx('au',t.a)?'':String(t.p).slice(0,500),c:rx('cv',t.c)?t.c:'',k:String(t.k||'').slice(0,500),ad:+t.ad||0}));
 const ids=new Set(tr.map(t=>t.id));
 return{tracks:tr,fav:arr(j.fav).filter(x=>ids.has(x)).slice(0,3000),pls:arr(j.pls).slice(0,50).filter(p=>p&&rx('pl',p.id)).map(p=>({id:p.id,n:String(p.n||'Playlist').slice(0,40),t:arr(p.t).filter(x=>ids.has(x)).slice(0,3000)})),
  hist:arr(j.hist).filter(h=>h&&ids.has(h.id)).slice(0,200).map(h=>({id:h.id,t:+h.t||0})),q:arr(j.q).filter(x=>ids.has(x)).slice(0,500),cur:ids.has(j.cur)?j.cur:'',pos:num(j.pos,0,259200,0),vol:num(j.vol,0,1,.8),rep:['off','all','one'].includes(j.rep)?j.rep:'off',shuf:j.shuf?1:0,dirs:arr(j.dirs).filter(x=>typeof x==='string'&&x.length<400).slice(0,20),rads:arr(j.rads).filter(r=>r&&rx('rd',r.id)&&typeof r.u==='string'&&/^https:\/\//.test(r.u)&&r.u.length<500).slice(0,60).map(r=>({id:r.id,n:String(r.n||'Rádio').slice(0,80),u:r.u,cc:String(r.cc||'').slice(0,3)}))}}
const defaults=()=>({v:2,t:structuredClone(TH.dark),name:'dark',themes:{},name_:'',h24:1,
 l:{bar:'bottom',menu:'grid',gap:14,sc:100,snap:1,anim:1,lock:0,dnd:0,fxon:1},bar:BAR_D(),icons:{},fonts:[],widgets:presetW('Padrão'),layouts:{},
 todos:[],act:[],photos:[],phdirs:[],tut:0,upd:1,music:{tracks:[],fav:[],pls:[],hist:[],q:[],cur:'',pos:0,vol:.8,rep:'off',shuf:0,dirs:[],rads:[]},links:[{id:'l1',n:'GitHub',k:'url',u:'https://github.com',a:'',ic:'b:code',pin:0},{id:'l2',n:'ArchWiki',k:'url',u:'https://wiki.archlinux.org',a:'',ic:'b:book',pin:0},{id:'l3',n:'r/unixporn',k:'url',u:'https://www.reddit.com/r/unixporn',a:'',ic:'b:globe',pin:0}],
 games:[],projs:[],inbox:[],ev:[],lastDue:'',agent:{url:'http://127.0.0.1:7788',token:''},
 ai:{url:'http://localhost:11434',model:'',sys:AI_SYS,temp:.7,convs:[],cur:''}});

function cleanBar(b){b=b&&typeof b==='object'?b:{};const d=BAR_D(),ks=APPS.map(a=>a[0]);
 return{float:b.float?1:0,labels:['auto','show','hide'].includes(b.labels)?b.labels:'auto',align:['start','center','end'].includes(b.align)?b.align:'center',pins:b.pins?arr(b.pins).filter(k=>ks.includes(k)):d.pins,links:arr(b.links).map(x=>String(x).slice(0,30)).slice(0,20),sec:b.sec?1:0,date:b.date?1:0,menuLabel:String(b.menuLabel??'PUNK').slice(0,12),
  show:Object.fromEntries(Object.keys(d.show).map(k=>[k,b.show&&b.show[k]===0?0:1]))}}
function wsClean(s){s=s&&typeof s==='object'?s:{};const o={};
 ['ac','bg','tx','bc'].forEach(k=>{if(hex(s[k]))o[k]=s[k]});
 [['al',20,100],['bl',0,40],['r',0,40],['bw',0,6],['fs',10,28]].forEach(([k,a,b])=>{if(s[k]!=null&&s[k]!=='')o[k]=num(s[k],a,b,a)});
 if(s.hd===0)o.hd=0;if(typeof s.tt==='string'&&s.tt)o.tt=s.tt.slice(0,40);if(icOk(s.ic))o.ic=s.ic;return o}
function cw(w,i=0){
 if(!w||typeof w!=='object'||!W[w.type])return null;const d=W[w.type],c={};
 Object.entries(d.cfg).forEach(([k,dv])=>{const v=w.cfg&&w.cfg[k];c[k]=typeof v===typeof dv?(typeof v==='string'?v.slice(0,k==='text'?20000:200):v):dv});
 return{id:String(w.id||uid()).slice(0,24),type:w.type,x:num(w.x,0,8000,20),y:num(w.y,0,8000,20),w:num(w.w,d.mw,4000,d.w),h:num(w.h,d.mh,4000,d.h),z:num(w.z,0,9999,i+1),st:wsClean(w.st),cfg:c}}
function cleanLink(x){if(!x||typeof x!=='object')return null;const k=x.k==='app'?'app':'url';
 if(k==='url'&&!/^https?:\/\//i.test(x.u))return null;if(k==='app'&&!APPS.some(a=>a[0]===x.a))return null;
 return{id:String(x.id||uid()).slice(0,24),n:String(x.n||x.a||'').slice(0,40),k,u:k==='url'?String(x.u).slice(0,500):'',a:k==='app'?x.a:'',ic:icOk(x.ic)?x.ic:'',pin:x.pin?1:0}}
let MIG={};   /* migração assíncrona de papel de parede da v1 */
function migW(j,l){
 const show={clock:1,notes:1,todo:1,links:1,sys:1,...(l.show||{})},pos=j.pos||{},T={clock:'clock',notes:'notes',todo:'todo',links:'links',sys:'sysinfo'},def=presetW('Padrão');
 return Object.keys(T).filter(k=>show[k]).map(k=>{const w=def.find(x=>x.type===T[k]),p=pos[k];if(Array.isArray(p)){w.x=num(p[0],0,8000,w.x);w.y=num(p[1],0,8000,w.y)}if(k==='notes')w.cfg.text=String(j.notes||'');return w})}

function merge(j){
 j=j&&typeof j==='object'?j:{};const s=defaults(),l=j.l&&typeof j.l==='object'?j.l:{},v1=!j.v;
 const t0=clean(j.t);if(t0){s.t=t0;if(v1){if(WALLS[l.wall]&&l.wall!=='img')s.t.wall=l.wall;if(/^data:image\//.test(l.img)){MIG.img=l.img;s.t.wall='img'}}}
 s.name=String(j.name||'dark').slice(0,30);
 s.themes={};Object.entries(j.themes||{}).forEach(([k,v])=>{const c=clean(v);if(c)s.themes[String(k).slice(0,30)]=c});
 s.l={bar:['top','bottom','left','right'].includes(l.bar)?l.bar:'bottom',menu:l.menu==='list'?'list':'grid',gap:num(l.gap,4,40,14),sc:num(l.sc,80,130,100),snap:l.snap===0?0:1,anim:l.anim===0?0:1,lock:l.lock?1:0,dnd:l.dnd?1:0,fxon:l.fxon===0?0:1};
 s.bar=cleanBar(j.bar);
 s.icons={};Object.entries(j.icons||{}).forEach(([k,v])=>{if(/^[\w:-]{1,40}$/.test(k)&&icOk(v))s.icons[k]=v});
 s.fonts=arr(j.fonts).filter(f=>f&&typeof f.id==='string'&&typeof f.name==='string'&&cleanFont(f.name)).slice(0,10).map(f=>({id:f.id.slice(0,40),name:cleanFont(f.name)}));
 s.widgets=j.widgets?arr(j.widgets).slice(0,60).map(cw).filter(Boolean):v1&&(j.l||j.pos||j.notes)?migW(j,l):s.widgets;
 s.layouts={};Object.entries(j.layouts||{}).slice(0,20).forEach(([k,v])=>{if(v&&typeof v==='object')s.layouts[String(k).slice(0,30)]={widgets:arr(v.widgets).map(cw).filter(Boolean).slice(0,60),bar:cleanBar(v.bar),l:{gap:num(v.l&&v.l.gap,4,40,14),snap:v.l&&v.l.snap===0?0:1,menu:v.l&&v.l.menu==='list'?'list':'grid'}}});
 s.name_=String(j.name_||'');s.h24=j.h24===0?0:1;
 s.todos=arr(j.todos).slice(0,500).map(t=>({id:String(t.id||uid()+Math.random().toString(36).slice(2,5)),t:String(t.t||'').slice(0,300),d:t.d?1:0,p:num(t.p,0,2,0)|0,due:DATE_RE.test(t.due)?t.due:'',c:+t.c||0,dn:+t.dn||0})).filter(t=>t.t);
 s.act=arr(j.act).slice(0,200).map(a=>({ts:+a.ts||0,k:String(a.k||'').slice(0,8),t:String(a.t||'').slice(0,300)}));
 if(j.links)s.links=arr(j.links).map(cleanLink).filter(Boolean).slice(0,60);
 s.photos=arr(j.photos).slice(0,1000).filter(p=>p&&/^ph[a-z0-9]{8,}$/.test(p.id)&&PH_MIME[String(p.t).split('/')[1]]).map(p=>({id:p.id,n:String(p.n||'foto').slice(0,120),t:String(p.t),s:+p.s||0,w:+p.w||0,h:+p.h||0,c:+p.c||0}));
 s.music=cleanMusic(j.music);s.tut=j.tut?1:0;s.upd=j.upd===0?0:1;
 s.phdirs=arr(j.phdirs).filter(x=>typeof x==='string'&&x.length<400).slice(0,10);
 s.games=arr(j.games).map(g=>({t:String(g.t),p:String(g.p),s:String(g.s),n:g.n,d:String(g.d||'')}));
 s.projs=arr(j.projs).map(p=>({n:String(p.n),d:String(p.d||''),s:String(p.s),u:/^https?:\/\//i.test(p.u)?p.u:'',i:/^data:image\//.test(p.i)?p.i:''}));
 s.inbox=arr(j.inbox).slice(0,30);
 s.ev=arr(j.ev).map(e=>({id:String(e.id||Math.random().toString(36).slice(2)),d:DATE_RE.test(e.d)?e.d:'',h:/^\d{2}:\d{2}$/.test(e.h)?e.h:'',t:String(e.t||'').slice(0,120),f:e.f?1:0})).filter(e=>e.d&&e.t);
 s.lastDue=DATE_RE.test(j.lastDue)?j.lastDue:'';
 const g=j.agent&&typeof j.agent==='object'?j.agent:{};s.agent={url:/^https?:\/\/\S+$/i.test(g.url)?String(g.url).slice(0,200):s.agent.url,token:String(g.token||'').slice(0,200)};
 const a=j.ai&&typeof j.ai==='object'?j.ai:{};
 s.ai={url:/^https?:\/\/\S+$/i.test(a.url)?String(a.url).slice(0,200):s.ai.url,model:String(a.model||'').slice(0,120),sys:typeof a.sys==='string'?a.sys.slice(0,4000):AI_SYS,temp:a.temp==null?.7:num(a.temp,0,2,.7),
  convs:arr(a.convs).slice(0,40).map(c=>({id:String(c.id||Math.random().toString(36).slice(2)),t:String(c.t||'Conversa').slice(0,60),u:+c.u||0,m:arr(c.m).slice(-200).map(m=>({r:m.r==='user'?'user':'assistant',c:String(m.c||''),th:String(m.th||''),loc:m.loc?1:0,err:m.err?String(m.err):'',s:String(m.s||'')}))})),cur:''};
 s.ai.cur=s.ai.convs.some(c=>c.id===a.cur)?String(a.cur):(s.ai.convs[0]?.id||'');
 return s}

let S;   /* estado ativo, criado na inicialização (99-init.js) */
const allT=()=>({...TH,...S.themes});
/* Gravação com atraso: sliders disparam dezenas de eventos por segundo. */
let _sT;const saveNow=()=>{clearTimeout(_sT);try{localStorage.setItem(K,JSON.stringify(S));return 1}catch(e){toast('Sem espaço no armazenamento do navegador.');return 0}};
const save=()=>{clearTimeout(_sT);_sT=setTimeout(saveNow,200);return 1};
addEventListener('pagehide',saveNow);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow()});
