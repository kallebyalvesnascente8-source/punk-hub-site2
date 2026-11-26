/* =====================================================================
   95 CONFIGURAÇÕES: temas, aparência, fundo/personagem, ícones/fontes,
   barra, widgets/layouts, sistema (agente + Ollama), backup
   ===================================================================== */
let thCat='Todos',icTarget='',icOn='',arm='',layOn='';
const STABS=[['themes','Temas'],['look','Cores e estilo'],['wall','Fundo e personagem'],['icons','Ícones e fontes'],['bar','Barra e menu'],['widgets','Widgets e layouts'],['sys','Sistema'],['bk','Geral e backup']];
const uniq=b=>{let n=b,i=2;while(allT()[n])n=b+' '+i++;return n};
const isDirty=()=>JSON.stringify(S.t)!==JSON.stringify(allT()[S.name]);
const fname=s=>String(s||'tema').normalize('NFD').replace(/[^\w-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30)||'tema';

/* ---- Controles genéricos. scope: tv (tema) lv (layout) bv (barra) wv (estilo do widget) wc (opções do widget) ---- */
const gv=(sc,k)=>k.startsWith('ch.')?S.t.ch[k.slice(3)]:sc==='tv'?S.t[k]:sc==='lv'?S.l[k]:sc==='bv'?S.bar[k]:null;
const optH=(o,v)=>Object.entries(o).map(([k,n])=>`<option value="${esc(k)}" ${String(k)===String(v)?'selected':''}>${esc(n)}</option>`).join('');
function ctl(sc,k,n,ty,a,b,step,extra=''){
 const v=gv(sc,k),at=`data-i="${sc}" data-k="${k}"${extra}`;
 if(ty==='c')return`<label class="row"><span>${n}</span><input type="color" ${at} value="${esc(v)}"></label>`;
 if(ty==='k')return`<label class="row"><span>${n}</span><input type="checkbox" ${at} ${v?'checked':''}></label>`;
 if(ty==='s')return`<label class="row"><span>${n}</span><select ${at}>${optH(a,v)}</select></label>`;
 return`<label class="row"><span>${n} <b class="m" id="v-${sc}-${k}">${v}</b></span><input type="range" ${at} min="${a}" max="${b}" step="${step||1}" value="${v}"></label>`}
function ctlVal(e){return e.type==='checkbox'?+e.checked:e.type==='range'||e.type==='number'?+e.value:e.value}
function after(e,sc){const o=$('#v-'+sc+'-'+e.dataset.k);if(o)o.textContent=e.value;apply();save();if(e.tagName==='SELECT'||e.type==='checkbox'){ren();bar();qsAll()}}
Object.assign(I,{
 tv:e=>{const k=e.dataset.k;if(k.startsWith('ch.'))S.t.ch[k.slice(3)]=ctlVal(e);else S.t[k]=ctlVal(e);after(e,'tv');if(k==='is')widgets()},
 lv:e=>{S.l[e.dataset.k]=ctlVal(e);after(e,'lv');if(['gap','sc'].includes(e.dataset.k))fit()},
 bv:e=>{S.bar[e.dataset.k]=e.type==='text'?e.value.slice(0,12):ctlVal(e);save();bar();if(e.tagName==='SELECT'||e.type==='checkbox'){apply();ren()}else apply()},
 nm:e=>{S.name_=e.value;save();tick()},h24:e=>{S.h24=+e.checked;save();tick()}});

/* ---- Temas: galeria ---- */
function themeCard(k,t){
 const own=!!S.themes[k],u=t.wall==='img'?IMG.url(t.wimg):'',bg=u?`center/cover url(${u})`:`radial-gradient(circle at 85% 15%,${t.ac}66,transparent 55%),radial-gradient(circle at 10% 90%,${t.ac2}33,transparent 55%),${t.bg}`,cu=IMG.url(t.ch.img);
 return`<div class="tc ${S.name===k?'on':''}"><div class="tp" style="background:${bg}">${cu?`<img src="${cu}" alt="" style="position:absolute;right:4px;bottom:0;height:96%;opacity:${t.ch.op/100}">`:''}<div class="pp" style="background:${mix(t.bg,t.tx,.09,t.al/100)};color:${t.tx};border-radius:${Math.min(t.r,12)}px;font-family:${fam(t.ff)}">${esc(k)}<i style="background:${t.ac}"></i></div><span class="bd">${esc(THCAT[k]||'Meu')}${t.fx!=='none'?' + '+FXS[t.fx]:''}</span></div>
 <div class="tb2"><div class="fl"><button class="p" data-a="tapply" data-k="${esc(k)}">${S.name===k?'Ativo':'Aplicar'}</button><button data-a="tedit" data-k="${esc(k)}">Editar</button></div><div class="fl"><button data-a="tdup" data-k="${esc(k)}">Duplicar</button><button data-a="texp" data-k="${esc(k)}">Exportar</button>${own?`<button data-a="tdel2" data-k="${esc(k)}">Excluir</button>`:''}</div></div></div>`}
function themesTab(){
 const all=allT(),cats=['Todos','Hub','Linux','Anime','Efeitos','Meus'],L=Object.entries(all).filter(([k])=>thCat==='Todos'||(thCat==='Meus'?!!S.themes[k]:THCAT[k]===thCat));
 return`<p class="m">Tema ativo: <b>${esc(S.name)}</b>${isDirty()?' <span class="pri-1">(com alterações não salvas)</span>':''}</p>
 <div class="tabs">${cats.map(c=>`<button data-a="thcat" data-k="${c}" class="${thCat===c?'on':''}">${c}</button>`).join('')}</div>
 ${thCat==='Anime'?'<div class="card m sm">Estes temas já vêm com cores, brilho e efeitos pensados para uma personagem. Eu não incluo arte de personagens existentes: importe seu próprio PNG (de preferência com fundo transparente) em <b>Fundo e personagem</b> e salve no tema.</div>':''}
 <div class="tg">${L.map(([k,t])=>themeCard(k,t)).join('')||'<div class="m">Nenhum tema nesta aba.</div>'}</div>
 <div class="card"><h3>Salvar os ajustes atuais</h3><div class="fl"><input id="tn" placeholder="Nome do tema" aria-label="Nome do tema" maxlength="30" value="${esc(S.themes[S.name]?S.name:'')}"><button class="p" data-a="tsave">Salvar como novo tema</button>${S.themes[S.name]?`<button data-a="tupd">Atualizar "${esc(S.name)}"</button>`:''}${isDirty()?'<button data-a="trev">Desfazer alterações</button>':''}</div><div class="m sm" style="margin-top:6px">O tema guarda cores, fontes, bordas, fundo, personagem e efeitos. Widgets e barra ficam no layout.</div></div>
 ${imp('timp','Importar tema')}`}
Object.assign(A,{
 thcat:a=>{thCat=a.dataset.k;ren()},
 tapply:a=>useTheme(a.dataset.k),
 tedit:async a=>{await useTheme(a.dataset.k);sTab='look';ren()},
 tdup:a=>{const n=uniq(a.dataset.k+' copia'),t=structuredClone(allT()[a.dataset.k]);S.themes[n]=t;save();notify('Tema duplicado: '+n);ren()},
 tdel2:a=>{delete S.themes[a.dataset.k];if(S.name===a.dataset.k){S.name='dark'}save();ren();gcImgs()},
 texp:async a=>{const k=a.dataset.k,t=allT()[k],ids=[t.wimg,t.ch.img].filter(Boolean),images={};for(const id of ids)images[id]=await IMG.dataURL(id);
  const ft=[];for(const f of S.fonts)if([t.ff,t.fm].includes(f.name))ft.push({name:f.name,data:await IMG.dataURL(f.id)});
  download('punkhub-tema-'+fname(k)+'.json',JSON.stringify({punkhub:'theme',v:2,name:k,theme:t,images,fonts:ft}));toast('Tema exportado'+(ids.length?' com as imagens':''))},
 tsave:()=>{const v=($('#tn').value||'').trim().slice(0,30);if(!v)return notify('Dê um nome ao tema.');const n=TH[v]?uniq(v):v;S.themes[n]=structuredClone(S.t);S.name=n;save();notify('Tema salvo: '+n);ren()},
 tupd:()=>{S.themes[S.name]=structuredClone(S.t);save();notify('Tema atualizado: '+S.name);ren()},
 trev:()=>useTheme(S.name),
 timp:()=>impT($('#ti2').value)});
async function impT(s){
 try{const j=JSON.parse(s);if(j.punkhub!=='theme')throw 0;const t=clean(j.theme);if(!t)throw 0;
  const map={};for(const[id,du]of Object.entries(j.images||{})){if(!/^data:image\//.test(du))continue;map[id]=await IMG.add(await IMG.fromData(du))}
  if(map[t.wimg])t.wimg=map[t.wimg];else if(t.wimg)t.wimg='';if(map[t.ch.img])t.ch.img=map[t.ch.img];else if(t.ch.img)t.ch.img='';
  for(const f of arr(j.fonts)){const nm=cleanFont(f.name);if(!nm||!/^data:/.test(f.data||'')||S.fonts.some(x=>x.name===nm))continue;const id=await IMG.add(await IMG.fromData(f.data),'ft');const o={id,name:nm};S.fonts.push(o);await fontReg(o)}
  const n=uniq(String(j.name||'importado').slice(0,30));S.themes[n]=t;save();await useTheme(n);notify('Tema importado e aplicado: '+n);ren()}
 catch(e){notify('Arquivo de tema inválido.')}}

/* ---- Cores e estilo ---- */
const fontOpts=()=>({...Object.fromEntries(Object.keys(FF).map(k=>[k,k+(FF_LOCAL.includes(k)?' (se instalada)':'')])),...Object.fromEntries(S.fonts.map(f=>[f.name,f.name+' (importada)']))});
function lookTab(){return`<div class="card"><h3>Cores</h3>${ctl('tv','ac','Cor principal','c')}${ctl('tv','ac2','Cor secundária','c')}${ctl('tv','bg','Fundo','c')}${ctl('tv','tx','Texto','c')}</div>
 <div class="card"><h3>Texto</h3>${ctl('tv','ff','Fonte da interface','s',fontOpts())}${ctl('tv','fm','Fonte monoespaçada','s',fontOpts())}${ctl('tv','fs','Tamanho do texto','r',12,20)}<div class="m sm">Para usar outras fontes, importe o arquivo em Ícones e fontes.</div></div>
 <div class="card"><h3>Painéis</h3>${ctl('tv','al','Opacidade dos painéis (%)','r',20,100)}${ctl('tv','bl','Desfoque do vidro (px)','r',0,40)}${ctl('tv','r','Arredondamento (px)','r',0,28)}${ctl('tv','sh','Sombra','r',0,40)}${ctl('tv','gl','Brilho nas bordas (px)','r',0,40)}</div>
 <div class="card"><h3>Bordas</h3>${ctl('tv','bw','Espessura (px)','r',0,4)}${ctl('tv','bo','Opacidade da borda (%)','r',0,100)}</div>
 <div class="card"><h3>Animações</h3>${ctl('lv','anim','Animações ligadas','k')}${ctl('tv','an','Estilo de entrada','s',ANS)}${ctl('tv','as','Velocidade (0 = sem animar)','r',0,3,.1)}<div class="m sm">Respeita a preferência "reduzir movimento" do sistema nos efeitos de fundo.</div></div>
 <div class="card"><h3>Ícones, tela e espaçamento</h3>${ctl('tv','is','Estilo padrão dos ícones','s',{glyph:'Símbolos',line:'Linhas (SVG)'})}${ctl('lv','sc','Tamanho dos elementos (%)','r',80,130)}${ctl('lv','gap','Espaçamento / grade dos widgets (px)','r',4,40)}${ctl('lv','snap','Encaixar na grade ao mover','k')}${ctl('tv','scan','Linhas de monitor antigo (%)','r',0,50)}${ctl('tv','vig','Vinheta (%)','r',0,80)}</div>`}

/* ---- Fundo e personagem ---- */
function wallTab(){const t=S.t,ch=t.ch;
 return`<div class="card"><h3>Papel de parede</h3>${ctl('tv','wall','Tipo','s',WALLS)}${t.wall==='img'?`<div class="row"><span>Imagem (JPG, PNG, WebP)</span><input type="file" accept="image/*" data-i="wallf" aria-label="Escolher papel de parede"></div>${t.wimg?`<div class="fl"><img src="${IMG.url(t.wimg)}" alt="" style="height:60px;border-radius:6px"><button data-a="wallrm">Remover imagem</button></div>`:'<div class="m sm">Escolha uma imagem do seu computador. Ela fica guardada só neste navegador.</div>'}${ctl('tv','wfit','Ajuste','s',{cover:'Preencher',contain:'Conter',center:'Centralizar',tile:'Repetir'})}${ctl('tv','wbl','Desfoque da imagem (px)','r',0,20)}`:''}${ctl('tv','wdim','Escurecer o fundo (%)','r',0,80)}</div>
 <div class="card"><h3>Efeito animado</h3>${ctl('tv','fx','Efeito','s',FXS)}${t.fx!=='none'?ctl('tv','fxn','Quantidade','r',10,100):''}${ctl('lv','fxon','Efeitos ligados (geral)','k')}<div class="m sm">Roda a ~30 quadros por segundo e pausa quando a aba fica oculta.</div></div>
 <div class="card"><h3>Personagem (PNG)</h3><div class="row"><span>Importar PNG</span><input type="file" accept="image/png,image/webp,image/*" data-i="chf" aria-label="Importar personagem"></div>
 ${ch.img?`<div class="fl"><img src="${IMG.url(ch.img)}" alt="" style="height:90px"><button data-a="chrm">Remover</button></div>${ctl('tv','ch.side','Lado','s',{left:'Esquerda',right:'Direita',center:'Centro'})}${ctl('tv','ch.x','Distância da borda (%)','r',-30,50)}${ctl('tv','ch.sz','Tamanho (altura, % da tela)','r',20,120)}${ctl('tv','ch.op','Opacidade (%)','r',10,100)}${ctl('tv','ch.gl','Brilho ao redor (px)','r',0,40)}${ctl('tv','ch.flip','Espelhar','k')}`:'<div class="m sm">Use uma imagem sua ou com licença para uso. PNG com fundo transparente fica melhor. Depois, salve no tema (aba Temas) para guardar a personagem junto.</div>'}</div>`}
Object.assign(I,{
 wallf:async e=>{const f=e.files[0];if(!f)return;const id=await imgFromFile(f,2400);if(!id)return;S.t.wimg=id;S.t.wall='img';apply();save();ren();gcImgs()},
 chf:async e=>{const f=e.files[0];if(!f)return;const id=await imgFromFile(f,2000);if(!id)return;S.t.ch.img=id;apply();save();ren();gcImgs()}});
Object.assign(A,{wallrm:()=>{S.t.wimg='';apply();save();ren();gcImgs()},chrm:()=>{S.t.ch.img='';apply();save();ren();gcImgs()}});

/* ---- Ícones e fontes ---- */
const ICT=[...APPS.map(a=>[a[0],a[1]]),['menu','Botão do menu'],['searchbtn','Botão de pesquisa'],['bell','Notificações'],['qs','Configurações rápidas']];
function specOf(t){if(t.startsWith('w:')){const w=wById(t.slice(2));return w?w.st.ic||'':''}if(t.startsWith('l:')){const l=S.links.find(x=>x.id===t.slice(2));return l?l.ic:''}return S.icons[t]||''}
function setSpec(t,v){
 if(t.startsWith('w:')){const w=wById(t.slice(2));if(w){if(v)w.st.ic=v;else delete w.st.ic}widgets()}
 else if(t.startsWith('l:')){const l=S.links.find(x=>x.id===t.slice(2));if(l)l.ic=v||'';rw('links')}
 else{if(v)S.icons[t]=v;else delete S.icons[t]}
 save();bar();ren();if(!$('#menu').hidden)menuBody($('#mq')?$('#mq').value:'');gcImgs()}
function iconPicker(t){
 const sp=specOf(t);
 return`<div class="card"><div class="fl"><b>Ícone de: ${esc(icLabel(t))}</b><span>${sp?icon(sp):'(padrão do estilo)'}</span><button data-a="icset" data-v="">Voltar ao padrão</button></div>
 <div class="ipk">${Object.keys(ICONS).map(n=>`<button data-a="icset" data-v="b:${n}" title="${n}" aria-label="${n}" class="${sp==='b:'+n?'on':''}">${svg(n)}</button>`).join('')}</div>
 <div class="fl"><input id="ict" placeholder="Símbolo ou letras (até 6)" maxlength="6" size="14" aria-label="Símbolo personalizado"><button data-a="ictxt">Usar símbolo</button><label>ou imagem <input type="file" accept="image/*" data-i="icf" aria-label="Imagem do ícone"></label></div><div class="m sm">Dica: emojis, letras japonesas ou símbolos do Nerd Font funcionam como símbolo se a fonte os tiver.</div></div>`}
const icLabel=t=>t.startsWith('w:')?'widget '+((wById(t.slice(2))||{}).type||''):t.startsWith('l:')?'atalho '+((S.links.find(x=>x.id===t.slice(2))||{}).n||''):(ICT.find(x=>x[0]===t)||[0,t])[1];
function iconsTab(){
 return`<div class="card"><h3>Ícones do painel</h3><div class="fl">${ICT.map(([k,n])=>`<button data-a="ictg" data-k="${k}" class="${icTarget===k?'on':''}" title="${n}">${icon(S.icons[k],(APPS.find(a=>a[0]===k)||[])[3]||({menu:'menu',searchbtn:'search',bell:'bell',qs:'toggle'})[k],(APPS.find(a=>a[0]===k)||[])[2]||'')} ${n}</button>`).join('')}</div></div>`+(icTarget?iconPicker(icTarget):'<div class="m">Escolha acima o que quer trocar. Ícones de widgets e atalhos se trocam nas abas Widgets e Barra.</div>')+
 `<div class="card"><h3>Fontes importadas</h3><div class="row"><span>Arquivo .ttf, .otf, .woff ou .woff2</span><input type="file" accept=".ttf,.otf,.woff,.woff2,font/*" data-i="fontf" aria-label="Importar fonte"></div>${S.fonts.map(f=>`<div class="lrow"><span style="font-family:'${esc(f.name)}'">${esc(f.name)} - Aa Bb 123</span><button data-a="fdel" data-k="${esc(f.id)}">Remover</button></div>`).join('')||'<div class="m sm">Nenhuma. Depois de importar, escolha a fonte em Cores e estilo.</div>'}</div>`}
Object.assign(A,{
 ictg:a=>{icTarget=a.dataset.k;ren()},
 ictg2:a=>{icTarget=a.dataset.k;sTab=a.dataset.s||sTab;ren()},
 icset:a=>{if(icTarget)setSpec(icTarget,a.dataset.v)},
 ictxt:()=>{const v=($('#ict').value||'').trim().slice(0,6);if(v&&icTarget)setSpec(icTarget,'t:'+v)},
 fdel:a=>{const f=S.fonts.find(x=>x.id===a.dataset.k);if(!f)return;S.fonts=S.fonts.filter(x=>x!==f);['ff','fm'].forEach(k=>{if(S.t[k]===f.name)S.t[k]=TD[k]});Object.values(S.themes).forEach(t=>['ff','fm'].forEach(k=>{if(t[k]===f.name)t[k]=TD[k]}));save();apply();ren();gcImgs()}});
Object.assign(I,{
 icf:async e=>{const f=e.files[0];if(!f||!icTarget)return;const id=await imgFromFile(f,128);if(id)setSpec(icTarget,'i:'+id)},
 fontf:async e=>{const f=e.files[0];if(!f)return;if(f.size>5e6)return notify('Fonte maior que 5 MB.');if(S.fonts.length>=10)return notify('Limite de 10 fontes.');
  const nm=cleanFont(f.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' '))||'Fonte';if(S.fonts.some(x=>x.name===nm)||FF[nm])return notify('Já existe uma fonte com o nome "'+nm+'".');
  const id=await IMG.add(f,'ft'),o={id,name:nm};await fontReg(o);if(!FONTS_OK.has(id)){await IMG.del(id);return}S.fonts.push(o);save();notify('Fonte importada: '+nm);ren()}});

/* ---- Barra e menu ---- */
function barTab(){
 const b=S.bar,pinned=b.pins.map(k=>APPS.find(a=>a[0]===k)).filter(Boolean),rest=APPS.filter(a=>!b.pins.includes(a[0])),row=(a,i,on)=>`<div class="lrow"><label><input type="checkbox" data-i="pin" data-k="${a[0]}" ${on?'checked':''}> ${appIcon(a[0])} ${a[1]}</label>${on?`<span class="fl"><button data-a="pinmv" data-k="${a[0]}" data-d="-1" aria-label="Mover para antes" ${i===0?'disabled':''}>↑</button><button data-a="pinmv" data-k="${a[0]}" data-d="1" aria-label="Mover para depois" ${i===pinned.length-1?'disabled':''}>↓</button></span>`:''}</div>`;
 return`<div class="card"><h3>Barra de tarefas</h3>${ctl('lv','bar','Posição','s',{bottom:'Embaixo',top:'Em cima',left:'Esquerda',right:'Direita'})}${ctl('bv','float','Flutuante (solta da borda)','k')}${ctl('bv','align','Alinhamento dos itens','s',{start:'Início',center:'Centro',end:'Fim'})}${ctl('bv','labels','Rótulos dos apps','s',{auto:'Automático',show:'Sempre',hide:'Só ícones'})}
 <label class="row"><span>Texto do botão do menu</span><input data-i="bv" data-k="menuLabel" value="${esc(b.menuLabel)}" maxlength="12" size="10"></label></div>
 <div class="card"><h3>Relógio e áreas</h3>${ctl('bv','sec','Mostrar segundos','k')}${ctl('bv','date','Mostrar a data ao lado da hora','k')}<label class="row"><span>Relógio 24 horas</span><input type="checkbox" data-i="h24" ${S.h24?'checked':''}></label>
 ${[['clock','Relógio e calendário'],['notif','Notificações'],['qs','Configurações rápidas'],['search','Botão de pesquisa']].map(([k,n])=>`<label class="row"><span>${n}</span><input type="checkbox" data-i="bshow" data-k="${k}" ${b.show[k]?'checked':''}></label>`).join('')}</div>
 <div class="card"><h3>Apps na barra</h3>${pinned.map((a,i)=>row(a,i,1)).join('')}${rest.map(a=>row(a,0,0)).join('')}</div>
 <div class="card"><h3>Menu de aplicativos</h3>${ctl('lv','menu','Estilo','s',{grid:'Grade',list:'Lista'})}</div>
 <div class="card"><h3>Atalhos rápidos</h3><div class="m sm">Aparecem no menu e no widget Atalhos. Marque para fixar também na barra.</div>
 ${S.links.map(l=>`<div class="lrow"><label><input type="checkbox" data-i="lkbar" data-k="${esc(l.id)}" ${b.links.includes(l.id)?'checked':''}> ${lnkIcon(l)} ${esc(l.n)} <small class="m">${l.k==='app'?'app do Hub':esc(l.u)}</small></label><span class="fl"><button data-a="ictg2" data-k="l:${esc(l.id)}" data-s="bar">Ícone</button><button data-a="ldel" data-k="${esc(l.id)}" aria-label="Remover atalho">×</button></span></div>`).join('')||'<div class="m sm">Nenhum atalho.</div>'}
 ${icTarget.startsWith('l:')?iconPicker(icTarget):''}
 <div class="fl" style="margin-top:8px"><input id="lkn" placeholder="Nome" size="10" aria-label="Nome do atalho"><select id="lkk" aria-label="Destino"><option value="">Site (URL)</option>${APPS.filter(a=>a[0]!=='home').map(a=>`<option value="${a[0]}">App: ${a[1]}</option>`).join('')}</select><input id="lku" placeholder="https://..." size="16" aria-label="Endereço"><button data-a="lknew">Adicionar</button></div></div>`}
Object.assign(I,{
 pin:e=>{const k=e.dataset.k;S.bar.pins=e.checked?[...S.bar.pins,k]:S.bar.pins.filter(x=>x!==k);save();bar();ren()},
 bshow:e=>{S.bar.show[e.dataset.k]=+e.checked;save();bar()},
 lkbar:e=>{const k=e.dataset.k;S.bar.links=e.checked?[...S.bar.links,k].slice(0,20):S.bar.links.filter(x=>x!==k);save();bar()}});
Object.assign(A,{
 pinmv:a=>{const p=S.bar.pins,i=p.indexOf(a.dataset.k),j=i+ +a.dataset.d;if(i<0||j<0||j>=p.length)return;[p[i],p[j]]=[p[j],p[i]];save();bar();ren()},
 lknew:()=>{const n=$('#lkn').value.trim(),k=$('#lkk').value,u=$('#lku').value.trim();
  if(k){const l=cleanLink({n:n||(APPS.find(a=>a[0]===k)||[])[1],k:'app',a:k});if(l){S.links.push(l);save();rw('links');bar();ren()}return}
  if(!n||!/^https?:\/\//i.test(u))return notify('Informe um nome e uma URL começando com http:// ou https://');S.links.push(cleanLink({n,u,k:'url',ic:'b:globe'}));save();rw('links');ren()}});

/* ---- Widgets e layouts ---- */
function wEditor(w){
 const d=W[w.type],s=w.st,cc=(k,n)=>`<label class="row"><span>${n}${s[k]?'':' <span class="m sm">(do tema)</span>'}</span><span class="fl"><input type="color" data-i="wv" data-k="${k}" value="${esc(s[k]||S.t[k]||'#000000')}">${s[k]?`<button data-a="wclr" data-k="${k}" aria-label="Voltar à cor do tema">×</button>`:''}</span></label>`,
  rr=(k,n,a,b,df)=>`<label class="row"><span>${n} <b class="m" id="v-wv-${k}">${s[k]!=null?s[k]:df}</b>${s[k]!=null?'':' <span class="m sm">(tema)</span>'}</span><span class="fl"><input type="range" data-i="wv" data-k="${k}" min="${a}" max="${b}" value="${s[k]!=null?s[k]:df}">${s[k]!=null?`<button data-a="wclr" data-k="${k}" aria-label="Voltar ao tema">×</button>`:''}</span></label>`;
 return`<div class="card"><h3>${icon(s.ic,d.bi)} ${esc(s.tt||d.n)}</h3>
 <label class="row"><span>Título</span><input data-i="wtt" value="${esc(s.tt||'')}" placeholder="${esc(d.n)}" maxlength="40"></label>
 <label class="row"><span>Mostrar barra de título</span><input type="checkbox" data-i="whd" ${s.hd===0?'':'checked'}></label>
 <div class="fl"><button data-a="ictg2" data-k="w:${esc(w.id)}" data-s="widgets">Trocar ícone</button>${s.ic?`<button data-a="wclr" data-k="ic">Ícone padrão</button>`:''}</div>${icTarget==='w:'+w.id?iconPicker(icTarget):''}
 <h3 style="margin-top:10px">Aparência individual</h3>${cc('ac','Cor de destaque')}${cc('tx','Cor do texto')}${cc('bg','Cor do painel')}${cc('bc','Cor da borda')}
 ${rr('al','Opacidade do painel (%)',20,100,S.t.al)}${rr('bl','Desfoque (px)',0,40,S.t.bl)}${rr('r','Arredondamento (px)',0,40,S.t.r)}${rr('bw','Espessura da borda (px)',0,6,S.t.bw)}${rr('fs','Tamanho do texto (px)',10,28,S.t.fs)}
 <h3 style="margin-top:10px">Tamanho e posição</h3><div class="fl">${[['x','X'],['y','Y'],['w','Largura'],['h','Altura']].map(([k,n])=>`<label>${n} <input type="number" data-i="wgeo" data-k="${k}" value="${w[k]}" min="0" max="8000" style="width:5.5em"></label>`).join('')}<button data-a="wgeo0" data-k="${esc(w.id)}">Tamanho padrão</button></div>
 ${d.opts.length?`<h3 style="margin-top:10px">Opções do widget</h3>`+d.opts.map(([k,n,ty,a,b])=>ty==='chk'?`<label class="row"><span>${n}</span><input type="checkbox" data-i="wc" data-k="${k}" ${w.cfg[k]?'checked':''}></label>`:ty==='sel'?`<label class="row"><span>${n}</span><select data-i="wc" data-k="${k}">${optH(a,w.cfg[k])}</select></label>`:ty==='num'?`<label class="row"><span>${n}</span><input type="number" data-i="wc" data-k="${k}" min="${a}" max="${b}" value="${w.cfg[k]}" style="width:5em"></label>`:`<div class="row"><span>${n}</span><input type="file" accept="image/*" data-i="wimgf" data-w="${esc(w.id)}"></div>`).join(''):''}
 <div class="fl" style="margin-top:10px"><button data-a="wz" data-k="${esc(w.id)}" data-v="front">Trazer para frente</button><button data-a="wz" data-k="${esc(w.id)}" data-v="back">Enviar para trás</button><button data-a="wdup" data-k="${esc(w.id)}">Duplicar</button><button data-a="wst0" data-k="${esc(w.id)}">Limpar estilo</button><button data-a="wdel" data-k="${esc(w.id)}">Remover</button></div></div>`}
function widgetsTab(){
 const sel=wById(selW)||null,pre=PRESETS.map(p=>`<button data-a="lpre" data-k="${esc(p)}" class="${arm==='pre:'+p?'on':''}">${arm==='pre:'+p?'Confirmar: ':''}${esc(p)}</button>`).join('');
 return`<div class="card"><h3>Adicionar widget</h3><div class="fl">${Object.entries(W).map(([k,d])=>`<button data-a="wadd" data-k="${k}">${svg(d.bi)} ${d.n}</button>`).join('')}</div><div class="m sm" style="margin-top:6px">Arraste pelo título, redimensione pelo canto, ⚙ configura e × remove. Em telas pequenas os widgets viram uma coluna.</div></div>
 <div class="card"><h3>Widgets na tela (${S.widgets.length})</h3>${S.widgets.map(w=>`<div class="lrow"><button data-a="wsel" data-k="${esc(w.id)}" class="${selW===w.id?'on':''}">${icon(w.st.ic,W[w.type].bi)} ${esc(w.st.tt||W[w.type].n)}</button><span class="m sm">${w.w}x${w.h}</span></div>`).join('')||'<div class="m">Nenhum widget. Adicione acima.</div>'}</div>`+(sel?wEditor(sel):'')+
 `<div class="card"><h3>Layouts</h3><div class="m sm">Layout = widgets + barra + grade. Aplicar um modelo substitui os widgets atuais.</div><div class="fl" style="margin:6px 0">${pre}<button data-a="warr">Organizar automaticamente</button></div>
 <div class="fl"><input id="ln1" placeholder="Nome do layout" maxlength="30" aria-label="Nome do layout"><button class="p" data-a="lsave">Salvar layout atual</button></div>
 ${Object.keys(S.layouts).map(k=>`<div class="lrow"><span>${esc(k)} <small class="m">${S.layouts[k].widgets.length} widgets</small></span><span class="fl"><button data-a="lload" data-k="${esc(k)}" class="${arm==='lay:'+k?'on':''}">${arm==='lay:'+k?'Confirmar':'Aplicar'}</button><button data-a="lexp" data-k="${esc(k)}">Exportar</button><button data-a="ldel2" data-k="${esc(k)}">Excluir</button></span></div>`).join('')}
 ${xport('layout')}${imp('limp','Importar layout')}</div>
 <div class="card"><h3>Edição</h3>${ctl('lv','lock','Travar widgets (sem mover/redimensionar)','k')}${ctl('lv','snap','Encaixar na grade','k')}${ctl('lv','gap','Grade (px)','r',4,40)}</div>`}
Object.assign(I,{
 wv:e=>{const w=wById(selW);if(!w)return;const k=e.dataset.k;w.st[k]=e.type==='color'?e.value:+e.value;const o=$('#v-wv-'+k);if(o)o.textContent=e.value;save();wRestyle(w)},
 wtt:e=>{const w=wById(selW);if(!w)return;const v=e.value.trim().slice(0,40);if(v)w.st.tt=v;else delete w.st.tt;save();widgets()},
 whd:e=>{const w=wById(selW);if(!w)return;if(e.checked)delete w.st.hd;else w.st.hd=0;save();widgets()},
 wgeo:e=>{const w=wById(selW);if(!w)return;const d=W[w.type],k=e.dataset.k;w[k]=Math.round(clamp(e.value,k==='w'?d.mw:k==='h'?d.mh:0,8000));save();const el=$(`#wg .w[data-id="${w.id}"]`);if(el){el.style.left=w.x+'px';el.style.top=w.y+'px';el.style.width=w.w+'px';el.style.height=w.h+'px'}},
 wc:e=>{const w=wById(selW);if(!w)return;w.cfg[e.dataset.k]=e.type==='checkbox'?e.checked?1:0:e.type==='number'?+e.value:e.value;save();widgets();ren()}});
Object.assign(A,{
 lsave:()=>{const n=($('#ln1').value||'').trim().slice(0,30);if(!n)return notify('Dê um nome ao layout.');S.layouts[n]={widgets:structuredClone(S.widgets),bar:structuredClone(S.bar),l:{gap:S.l.gap,snap:S.l.snap,menu:S.l.menu}};save();notify('Layout salvo: '+n);ren()},
 lload:a=>{const k=a.dataset.k;if(arm!=='lay:'+k){arm='lay:'+k;return ren()}arm='';const L=S.layouts[k];if(!L)return;S.widgets=structuredClone(L.widgets);S.bar=cleanBar(L.bar);Object.assign(S.l,L.l);selW='';save();apply();widgets(1);bar();ren();gcImgs()},
 lpre:a=>{const k=a.dataset.k;if(arm!=='pre:'+k){arm='pre:'+k;return ren()}arm='';S.widgets=presetW(k);selW='';save();widgets(1);ren();gcImgs()},
 ldel2:a=>{delete S.layouts[a.dataset.k];save();ren()},
 lexp:a=>{const L=S.layouts[a.dataset.k];if(!L)return;xo=JSON.stringify({punkhub:'layout',name:a.dataset.k,layout:L},null,1);ren()},
 limp:()=>{try{const j=JSON.parse($('#ti2').value);if(j.punkhub!=='layout'||!j.layout)throw 0;const n=uniq2(String(j.name||'importado').slice(0,30)),L=j.layout;S.layouts[n]={widgets:arr(L.widgets).map(cw).filter(Boolean).slice(0,60),bar:cleanBar(L.bar),l:{gap:num(L.l&&L.l.gap,4,40,14),snap:L.l&&L.l.snap===0?0:1,menu:L.l&&L.l.menu==='list'?'list':'grid'}};save();notify('Layout importado: '+n);ren()}catch(e){notify('Layout inválido.')}}});
const uniq2=b=>{let n=b,i=2;while(S.layouts[n])n=b+' '+i++;return n};

/* ---- Sistema: agente local e Ollama ---- */
function sysTab(){
 const ok=AG.state==='ok',col=ok?'var(--ac)':AG.state==='check'?'#e0b000':'#e5484d',p=AG.ping||{},c=(v)=>`<code>${esc(v)}</code> <button data-a="cp" data-v="${esc(v)}">Copiar</button>`;
 const ol=AI.status;
 return relCard()+`<div class="card"><h3>Agente local (monitoramento real)</h3><div class="stat"><span class="dot" style="background:${col}"></span><b>${ok?'Conectado':AG.state==='check'?'Conectando...':AG.state==='auth'?'Falta o token':'Desligado'}</b></div>
 ${AG.msg?`<p class="m">${esc(AG.msg)}</p>`:''}${ok?kv([['Versão',p.version],['Coletor',p.collector],['Plataforma',p.platform],['Pastas pesquisáveis',(p.roots||[]).join(', ')],['Encerrar processos',p.allow_kill?'liberado':'desligado'],['Aplicativos do sistema',p.apps?'indexados (.desktop)':'não suportado']]):''}
 <label class="row"><span>Endereço</span><input data-i="agurl" value="${esc(S.agent.url)}" style="flex:1;min-width:12em" aria-label="Endereço do agente"></label>
 <label class="row"><span>Token</span><input type="password" data-i="agtok" value="${esc(S.agent.token)}" style="flex:1;min-width:12em" autocomplete="off" aria-label="Token do agente"></label>
 <div class="fl"><button class="p" data-a="agcon">Conectar</button>${ok?'<button data-a="agoff">Desconectar</button>':''}</div></div>
 ${PX?`<div class="card"><h3>Agente embutido (app desktop)</h3><p class="m">O agente já roda dentro do aplicativo e conecta sozinho, sem Python. Ele só atende este computador e exige token.</p><label class="row"><span>Permitir encerrar processos pela lista do Monitor</span><input type="checkbox" data-i="pxkill" ${p.allow_kill?'checked':''}></label></div>`:`<div class="card"><h3>Como ligar o agente</h3><ol class="hl"><li>Baixe o <b>punk-agent.py</b> (entregue junto com este arquivo) e rode no computador que você quer monitorar. Precisa de Python 3.8 ou mais novo. No Linux não precisa instalar nada; no Windows e macOS: <code>pip install psutil</code>.</li><li>${c('python3 punk-agent.py')}</li><li>Ele mostra uma URL e um <b>token</b>. Cole acima e clique em Conectar.</li><li>Para pesquisar arquivos de uma pasta: ${c('python3 punk-agent.py --root ~/Documentos')}. Para liberar o botão Encerrar: <code>--allow-kill</code>.</li><li>Se o Hub estiver hospedado num site (https), libere a origem: ${c('python3 punk-agent.py --origin https://seu-site.com')}. O agente só aceita conexões locais e exige o token.</li></ol></div>`}
 <div class="card"><h3>Ollama (PUNK AI)</h3><div class="stat"><span class="dot" style="background:${ol==='ok'?'var(--ac)':ol==='check'?'#e0b000':'#e5484d'}"></span><b>${ol==='ok'?'Online, '+AI.models.length+' modelo(s)':ol==='check'?'Verificando...':'Offline'}</b></div>${ol==='ok'?kv([['Versão',OL.ver||'?'],['Modelos',AI.models.map(m=>m.n).join(', ')||'nenhum'],['Carregados agora',OL.run.map(r=>r.name).join(', ')||'nenhum']]):`<p class="m">${esc(AI.err||'Ainda não verificado.')}</p>`}
 <label class="row"><span>Endereço</span><input data-i="aiurl" value="${esc(S.ai.url)}" style="flex:1;min-width:12em" aria-label="Endereço do Ollama"></label><div class="fl"><button class="p" data-a="olref">Verificar agora</button><button data-a="open" data-k="punk">Abrir PUNK AI</button></div>
 <div class="m sm" style="margin-top:6px">Se o navegador bloquear, inicie o Ollama liberando este site: ${c('OLLAMA_ORIGINS="*" ollama serve')}</div></div>`}
Object.assign(I,{pxkill:async e=>{await PX.setAllowKill(e.checked);agConnect(1)},agurl:e=>{S.agent.url=e.value.trim();save()},agtok:e=>{S.agent.token=e.value.trim();save()}});
Object.assign(A,{agoff:()=>{S.agent.token='';AG.state='off';AG.st=null;AG.procs=[];AG.info=null;save();agPaint();toast('Agente desconectado e token apagado.')}});

/* ---- Geral e backup ---- */
async function exportAll(){
 const d=structuredClone(S);delete d.inbox;delete d.photos;delete d.music;const j=JSON.stringify(d),images={};
 for(const k of await IMG.keys())if(j.includes(k))images[k]=await IMG.dataURL(k);
 download('punkhub-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({punkhub:'backup',v:2,data:d,images}));toast('Backup gerado'+(Object.keys(images).length?' com '+Object.keys(images).length+' imagem(ns)/fonte(s)':''))}
async function impB(s){
 try{const j=JSON.parse(s);if(j.punkhub!=='backup')throw 0;
  for(const[id,du]of Object.entries(j.images||{}))if(/^[\w-]{1,60}$/.test(id)&&/^data:/.test(du))await IMG.put(id,await IMG.fromData(du));
  const keep={photos:S.photos,phdirs:S.phdirs,music:S.music};
  S=merge(j.data);S.photos=keep.photos;S.phdirs=keep.phdirs;S.music=keep.music;await IMG.load([S.t.wimg,S.t.ch.img,...Object.values(S.themes).flatMap(t=>[t.wimg,t.ch.img]),...S.widgets.map(w=>w.cfg.img)].filter(Boolean));
  await IMG.load(usedIds());await Promise.all(S.fonts.map(fontReg));
  selW='';apply(1);save();widgets();bar();ren();notify('Backup restaurado.')}
 catch(e){notify('Backup inválido.')}}
function bkTab(){return`<div class="card"><h3>Geral</h3><label class="row">Seu nome<input data-i="nm" value="${esc(S.name_)}" maxlength="30"></label><label class="row"><span>Relógio 24 horas</span><input type="checkbox" data-i="h24" ${S.h24?'checked':''}></label></div>
 <div class="card"><h3>Backup</h3><p class="m">Salva tudo: temas, imagens de tema, fontes, layouts, tarefas, notas, jogos, projetos e conversas da PUNK AI. As fotos do PUNK Photos e a biblioteca do PUNK Music ficam de fora (podem ser muito grandes); restaurar um backup não apaga nenhuma das duas. O token do agente também vai junto, guarde o arquivo com cuidado.</p><div class="fl"><button class="p" data-a="bexp">Baixar backup (.json)</button><button data-a="reset" class="${arm==='reset'?'on':''}">${arm==='reset'?'Clique de novo para confirmar':'Restaurar padrão'}</button></div></div>${imp('bimp','Restaurar backup')}`}
Object.assign(A,{
 bexp:()=>exportAll(),bimp:()=>impB($('#ti2').value),copy:()=>copyText($('#xo').value),
 reset:()=>{if(arm!=='reset'){arm='reset';return ren()}arm='';localStorage.removeItem(K);S=merge();IMG.keys().then(ks=>ks.forEach(k=>IMG.del(k)));selW='';apply(1);save();widgets(1);bar();ren();notify('Tudo restaurado ao padrão.')}});
Object.assign(I,{file:e=>{const f=e.files[0];if(!f)return;f.text().then(t=>({timp:impT,bimp:impB,limp:s=>{$('#ti2').value=s;A.limp()}})[e.dataset.k]?.(t))}});
const xport=n=>xo&&xo.includes(`"punkhub": "${n}"`)||xo.includes(`"punkhub":"${n}"`)?`<div class="card"><textarea id="xo" rows="5" readonly aria-label="Exportação">${esc(xo)}</textarea><button data-a="copy">Copiar</button></div>`:'';
const imp=(a,n)=>`<div class="card"><b>${n}</b><textarea id="ti2" rows="3" placeholder="Cole o JSON aqui" aria-label="${n}"></textarea><div class="fl"><button data-a="${a}">Importar texto</button><label>ou arquivo .json <input type="file" accept=".json,application/json" data-i="file" data-k="${a}"></label></div></div>`;
const SET={themes:themesTab,look:lookTab,wall:wallTab,icons:iconsTab,bar:barTab,widgets:widgetsTab,sys:sysTab,bk:bkTab};
R.settings=()=>tabsH(sTab,STABS,'stab')+(SET[sTab]||themesTab)();
Object.assign(A,{stab:a=>{sTab=a.dataset.k;arm='';icTarget='';if(sTab==='sys'&&AI.status==='idle')aiPing();ren()}});
