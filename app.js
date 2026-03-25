
// === RICERCA FLESSIBILE ARTICOLI ===
function cercaArticolo(query){
  if(!query)return null;
  var q=query.toLowerCase().trim();
  // 1. Match esatto codice
  var exact=inventario.find(a=>a.code.toLowerCase()===q||(a.codeForn&&a.codeForn.toLowerCase()===q));
  if(exact)return exact;
  // 2. Match esatto descrizione
  var descExact=inventario.find(a=>a.desc.toLowerCase()===q);
  if(descExact)return descExact;
  // 3. Match parziale codice o descrizione
  var partial=inventario.find(a=>a.code.toLowerCase().indexOf(q)!==-1||a.desc.toLowerCase().indexOf(q)!==-1||(a.codeForn&&a.codeForn.toLowerCase().indexOf(q)!==-1));
  if(partial)return partial;
  // 4. Match parole singole (tutte le parole devono matchare)
  var words=q.split(/\s+/);
  if(words.length>1){var multi=inventario.find(a=>{var d=a.desc.toLowerCase();return words.every(w=>d.indexOf(w)!==-1);});if(multi)return multi;}
  // 5. Match fuzzy - almeno 3 caratteri consecutivi
  if(q.length>=3){var fuzzy=inventario.find(a=>a.desc.toLowerCase().indexOf(q.substring(0,3))!==-1);if(fuzzy)return fuzzy;}
  return null;
}
function cercaArticoliMultipli(query,max){
  if(!query)return[];var q=query.toLowerCase().trim();max=max||8;
  return inventario.filter(a=>a.code.toLowerCase().indexOf(q)!==-1||a.desc.toLowerCase().indexOf(q)!==-1||(a.codeForn&&a.codeForn.toLowerCase().indexOf(q)!==-1)||(a.fornitore||'').toLowerCase().indexOf(q)!==-1).slice(0,max);
}

window.addEventListener("unhandledrejection",e=>{e.preventDefault();return false});
window.onerror=(msg,src,line)=>{if(line===0||!src)return true};

// === UTILITY FUNCTIONS ===
function escapeHtml(str){if(!str)return'';return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}

// === COMPRESSIONE LOGHI (da ~3MB a ~15KB) ===
function compressImage(dataUrl,maxW,quality){return new Promise(function(resolve){var img=new Image();img.onload=function(){var canvas=document.createElement('canvas');var ratio=Math.min(maxW/img.width,1);canvas.width=Math.round(img.width*ratio);canvas.height=Math.round(img.height*ratio);var ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',quality||0.7));};img.onerror=function(){resolve(dataUrl);};img.src=dataUrl;});}

// === CALCOLA PESO LOCALSTORAGE ===
function getStorageSize(){var total=0;for(var k in localStorage){if(localStorage.hasOwnProperty(k))total+=localStorage[k].length;}return total;}
function getStorageSizeFormatted(){var bytes=getStorageSize()*2;if(bytes<1024)return bytes+' B';if(bytes<1048576)return(bytes/1024).toFixed(1)+' KB';return(bytes/1048576).toFixed(1)+' MB';}
function getStoragePercent(){return Math.round((getStorageSize()*2)/5242880*100);}

// === AVVISO SPAZIO ===
function checkStorageWarning(){
  var pct=getStoragePercent();
  if(pct>=80){
    setTimeout(function(){
      showToast('⚠️ Spazio dati all\''+pct+'%! Vai in ⚙️ per esportare un backup.');
    },3000);
  }
}

// === EXPORT JSON (backup completo) ===
function exportBackup(){
  var backup={
    versione:'magazzAI_v2',
    dataExport:new Date().toISOString(),
    inventario:inventario,
    movimenti:movimenti,
    archivioMovimenti:archivioMovimenti,
    ordiniFornitore:ordiniFornitore,
    storicoOrdini:storicoOrdini,
    stralci:stralci,
    note:note,
    fornitori:fornitori,
    clientiPersonalizzati:clientiPersonalizzati,
    clientiProfili:clientiProfili,
    nextId:nextId,
    nextNotaId:nextNotaId,
    parcoAuto:parcoAuto,nextVeicoloId:nextVeicoloId
  };
  var json=JSON.stringify(backup,null,2);
  var blob=new Blob([json],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  var oggi=new Date().toISOString().slice(0,10);
  a.href=url;
  a.download='magazzAI_backup_'+oggi+'.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✅ Backup scaricato: magazzAI_backup_'+oggi+'.json');
}

// === IMPORT JSON (ripristina backup) ===
function importBackup(){
  var input=document.createElement('input');
  input.type='file';
  input.accept='.json';
  input.onchange=function(e){
    var file=e.target.files[0];
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var data=JSON.parse(ev.target.result);
        if(!data.versione||!data.inventario){
          showToast('❌ File non valido — non è un backup MagazzAI');
          return;
        }
        var overlay=document.createElement('div');
        overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:1100;display:flex;align-items:center;justify-content:center;padding:20px';
        overlay.innerHTML='<div style="background:#313131;border:2px solid rgba(255,255,255,.9);border-radius:20px;padding:28px;width:90%;max-width:380px;text-align:center">'+
          '<div style="font-size:36px;margin-bottom:12px">📥</div>'+
          '<div style="font-family:var(--fh);font-size:18px;color:#fff;margin-bottom:8px">Ripristina backup</div>'+
          '<div style="font-size:13px;color:#c0c0c0;margin-bottom:6px">Data backup: '+new Date(data.dataExport).toLocaleDateString('it-IT')+'</div>'+
          '<div style="font-size:13px;color:#c0c0c0;margin-bottom:20px">'+data.inventario.length+' articoli · '+(data.archivioMovimenti||[]).length+' movimenti in archivio</div>'+
          '<div style="font-size:12px;color:var(--warn);margin-bottom:20px;padding:10px;background:rgba(245,197,24,.1);border-radius:8px">⚠️ Questo sostituirà TUTTI i dati attuali</div>'+
          '<div style="display:flex;gap:10px">'+
          '<button id="imp-no" style="flex:1;padding:12px;background:transparent;border:1.5px solid #555;border-radius:10px;color:#f0f0f0;font-family:var(--fm);font-size:14px;cursor:pointer">Annulla</button>'+
          '<button id="imp-si" style="flex:1;padding:12px;background:var(--accent);border:none;border-radius:10px;color:#000;font-family:var(--fm);font-size:14px;font-weight:700;cursor:pointer">Ripristina</button>'+
          '</div></div>';
        document.body.appendChild(overlay);
        document.getElementById('imp-no').onclick=function(){document.body.removeChild(overlay);};
        document.getElementById('imp-si').onclick=function(){
          document.body.removeChild(overlay);
          inventario=data.inventario||[];
          movimenti=data.movimenti||[];
          archivioMovimenti=data.archivioMovimenti||[];
          ordiniFornitore=data.ordiniFornitore||{};
          storicoOrdini=data.storicoOrdini||[];
          stralci=data.stralci||[];
          note=data.note||[];
          fornitori=data.fornitori||[];
          clientiPersonalizzati=data.clientiPersonalizzati||[];
          clientiProfili=data.clientiProfili||[];
          nextId=data.nextId||14;
          nextNotaId=data.nextNotaId||4;
          parcoAuto=data.parcoAuto||[];nextVeicoloId=data.nextVeicoloId||1;
          saveData();
          renderDashboard();popolaDatalistUscita();updateStralciBadge();updateNoteBadge();
          closeSettings();
          showToast('✅ Backup ripristinato! '+inventario.length+' articoli caricati.');
        };
      }catch(err){
        showToast('❌ Errore nel file: '+err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// === SVUOTA LOGHI (libera spazio, non tocca dati) ===
function svuotaLoghi(){
  var countF=fornitori.filter(f=>f.logo).length;
  var countC=clientiProfili.filter(c=>c.logo).length;
  var count=countF+countC;
  var countCorsia=inventario.filter(a=>a.corsiaFoto).length;
  var totale=count+countCorsia;
  if(totale===0){showToast('Nessun logo o foto da rimuovere');return;}
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:1100;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML='<div style="background:#313131;border:2px solid rgba(255,255,255,.9);border-radius:20px;padding:28px;width:90%;max-width:360px;text-align:center">'+
    '<div style="font-size:36px;margin-bottom:12px">🖼️</div>'+
    '<div style="font-family:var(--fh);font-size:18px;color:#fff;margin-bottom:10px">Svuota immagini</div>'+
    '<div style="font-size:13px;color:#c0c0c0;margin-bottom:20px">'+countF+' loghi fornitori · '+countC+' loghi clienti · '+countCorsia+' foto corsia<br>I dati del magazzino NON vengono toccati.</div>'+
    '<div style="display:flex;gap:10px">'+
    '<button id="sl-no" style="flex:1;padding:12px;background:transparent;border:1.5px solid #555;border-radius:10px;color:#f0f0f0;font-family:var(--fm);font-size:14px;cursor:pointer">Annulla</button>'+
    '<button id="sl-si" style="flex:1;padding:12px;background:var(--danger);border:none;border-radius:10px;color:#fff;font-family:var(--fm);font-size:14px;font-weight:700;cursor:pointer">Svuota</button>'+
    '</div></div>';
  document.body.appendChild(overlay);
  document.getElementById('sl-no').onclick=function(){document.body.removeChild(overlay);};
  document.getElementById('sl-si').onclick=function(){
    document.body.removeChild(overlay);
    fornitori.forEach(function(f){f.logo='';});
    clientiProfili.forEach(function(c){c.logo='';});
    inventario.forEach(function(a){if(a.corsiaFoto)a.corsiaFoto=null;});
    saveData();
    openSettings();
    showToast('✅ '+totale+' immagini rimosse — '+getStorageSizeFormatted()+' usati ora');
  };
}

// === RESET COMPLETO ===
function resetCompleto(){
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:1100;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML='<div style="background:#313131;border:2px solid rgba(240,62,62,.7);border-radius:20px;padding:28px;width:90%;max-width:360px;text-align:center">'+
    '<div style="font-size:36px;margin-bottom:12px">⚠️</div>'+
    '<div style="font-family:var(--fh);font-size:18px;color:var(--danger);margin-bottom:10px">Reset completo</div>'+
    '<div style="font-size:13px;color:#c0c0c0;margin-bottom:20px">Questo cancellerà TUTTI i dati:<br>inventario, movimenti, ordini, note, report.<br><strong style="color:var(--danger)">Azione irreversibile!</strong></div>'+
    '<div style="display:flex;gap:10px">'+
    '<button id="rs-no" style="flex:1;padding:12px;background:transparent;border:1.5px solid #555;border-radius:10px;color:#f0f0f0;font-family:var(--fm);font-size:14px;cursor:pointer">Annulla</button>'+
    '<button id="rs-si" style="flex:1;padding:12px;background:var(--danger);border:none;border-radius:10px;color:#fff;font-family:var(--fm);font-size:14px;font-weight:700;cursor:pointer">Cancella tutto</button>'+
    '</div></div>';
  document.body.appendChild(overlay);
  document.getElementById('rs-no').onclick=function(){document.body.removeChild(overlay);};
  document.getElementById('rs-si').onclick=function(){
    document.body.removeChild(overlay);
    try{localStorage.clear();}catch(e){}
    window.location.reload();
  };
}
function debounce(fn,ms){var timer;return function(){var a=arguments,c=this;clearTimeout(timer);timer=setTimeout(function(){fn.apply(c,a)},ms)}}
function popolaDatalistUscita(){
  // Uscita datalists
  var dl=document.getElementById('man-uscita-art-list');if(dl)dl.innerHTML=inventario.map(function(a){return'<option value="'+escapeHtml(a.code)+'">'+escapeHtml(a.desc)+'</option>'}).join('');
  var dld=document.getElementById('man-uscita-desc-list');if(dld)dld.innerHTML=inventario.map(function(a){return'<option value="'+escapeHtml(a.desc)+'">'+escapeHtml(a.code)+'</option>'}).join('');
  var cl=document.getElementById('man-uscita-cli-list');if(cl)cl.innerHTML=clientiPersonalizzati.map(function(c){return'<option value="'+escapeHtml(c)+'">'}).join('');
  // Entrata datalists
  var elc=document.getElementById('man-art-code-list');if(elc)elc.innerHTML=inventario.map(function(a){return'<option value="'+escapeHtml(a.code)+'">'+escapeHtml(a.desc)+'</option>'}).join('');
  var eld=document.getElementById('man-art-desc-list');if(eld)eld.innerHTML=inventario.map(function(a){return'<option value="'+escapeHtml(a.desc)+'">'+escapeHtml(a.code)+'</option>'}).join('');
}
function suggerisciEntrata(){
  var code=(document.getElementById('man-art')?.value||'').trim();
  var desc=(document.getElementById('man-art-desc')?.value||'').trim();
  if(code.length>=2){var art=cercaArticolo(code);if(art&&document.getElementById('man-art-desc'))document.getElementById('man-art-desc').value=art.desc;}
  else if(desc.length>=2){var art=cercaArticolo(desc);if(art&&document.getElementById('man-art'))document.getElementById('man-art').value=art.code;}
}
function suggerisciUscita(){
  var code=(document.getElementById('man-uscita-art')?.value||'').trim();
  var desc=(document.getElementById('man-uscita-desc')?.value||'').trim();
  if(code.length>=2){var art=cercaArticolo(code);if(art&&document.getElementById('man-uscita-desc'))document.getElementById('man-uscita-desc').value=art.desc;}
  else if(desc.length>=2){var art=cercaArticolo(desc);if(art&&document.getElementById('man-uscita-art'))document.getElementById('man-uscita-art').value=art.code;}
}

// ============================================================
// STATE
// ============================================================
let inventario = [
  {id:1,code:'PIATTI-23-BL',codeForn:'',desc:'Piatti monouso bianchi 23cm',cat:'Monouso',qty:24,min:10,preOrdine:12,fornitore:'Fabbri',cliente:''},
  {id:2,code:'PIATTI-27-BL',codeForn:'',desc:'Piatti monouso bianchi 27cm',cat:'Monouso',qty:6,min:10,preOrdine:12,fornitore:'Fabbri',cliente:''},
  {id:3,code:'BICCH-200-TR',codeForn:'',desc:'Bicchieri trasparenti 200ml',cat:'Monouso',qty:18,min:8,preOrdine:10,fornitore:'Domopak',cliente:''},
  {id:4,code:'FORK-MONO-B',desc:'Forchette monouso buste singole',cat:'Monouso',qty:3,min:8,preOrdine:10,fornitore:'Domopak',cliente:''},
  {id:5,code:'TOV-33x33-W',desc:'Tovaglioli 33x33 bianchi 2veli',cat:'Tovagliato',qty:30,min:10,preOrdine:13,fornitore:'Lucart',cliente:''},
  {id:6,code:'TOV-PIZZO-B',desc:'Tovagliette a pizzo bianche',cat:'Tovagliato',qty:12,min:5,preOrdine:7,fornitore:'Lucart',cliente:''},
  {id:7,code:'SACCO-70L-N',desc:'Sacchi immondizia 70L neri',cat:'Cleaning Solution',qty:2,min:6,preOrdine:8,fornitore:'Fater',cliente:''},
  {id:8,code:'DET-SGRAS-5L',codeForn:'',desc:'Detergente sgrassatore 5L',cat:'Cleaning Solution',qty:8,min:4,preOrdine:6,fornitore:'Fater',cliente:''},
  {id:9,code:'BOX-PIZZA-30',codeForn:'',desc:'Box pizza cartone 30x30',cat:'Food Packaging',qty:45,min:15,preOrdine:20,fornitore:'Packaging Italia',cliente:''},
  {id:10,code:'BOX-PIZZA-33',codeForn:'',desc:'Box pizza cartone 33x33',cat:'Food Packaging',qty:0,min:10,preOrdine:14,fornitore:'Packaging Italia',cliente:''},
  {id:11,code:'PIATTI-LOGO-RM',codeForn:'',desc:'Piatti personalizzati logo Ristorante Mario',cat:'Monouso',qty:8,min:5,preOrdine:7,fornitore:'Fabbri',cliente:'Ristorante Da Mario'},
  {id:12,code:'TOVAG-LOGO-PZ',desc:'Tovaglioli personalizzati Pizzeria Centrale',cat:'Tovagliato',qty:15,min:8,preOrdine:10,fornitore:'Lucart',cliente:'Pizzeria Centrale'},
  {id:13,code:'BOX-LOGO-HB',desc:'Box hamburger personalizzati Happy Burger',cat:'Food Packaging',qty:0,min:10,preOrdine:12,fornitore:'Packaging Italia',cliente:'Happy Burger'},
];
let fornitori=[{nome:'Fabbri',email:'',logo:''},{nome:'Domopak',email:'',logo:''},{nome:'Lucart',email:'',logo:''},{nome:'Fater',email:'',logo:''},{nome:'Packaging Italia',email:'',logo:''}];
let clientiPersonalizzati=['Ristorante Da Mario','Pizzeria Centrale','Happy Burger'];
let clientiProfili=[];
let ordiniFornitore={};
let storicoOrdini=[];
let stralci=[];
let movimenti=[];
let archivioMovimenti=[];
let nextId=14;
let filterMode='all';
let pendingItems=[];
let note=[
  {id:1,text:'Controllare ristampa logo cliente Ristorante Da Mario',reminder:new Date(Date.now()+60000).toISOString(),completata:false,ts:new Date().toISOString()},
  {id:2,text:'Riordinare sacchi immondizia 70L — scorta quasi esaurita',reminder:null,completata:false,ts:new Date().toISOString()},
  {id:3,text:'Chiamare Packaging Italia per preventivo box pizza personalizzati',reminder:null,completata:false,ts:new Date().toISOString()},
];
let nextNotaId=4;
let noteTab='tutte';
let selectedQuickTime=null;
let noteReminderInterval=null;
let reportArticolo=null;
let reportFilter='3m';
let activeInvTab='standard';
let ginoOpen=false;let ginoHistory=[];let ginoRecognition=null;let ginoListening=false;let ginoContinuous=false;
let alertedIds=new Set();
let lastAlertDate=localStorage.getItem('lastAlertDate')||'';
let lastAlertTs=parseInt(localStorage.getItem('lastAlertTs')||'0');
let alertAudioCtx=null;
let pendingAlertSound=false;
let _corsiaPhotoData=null;
let _artMenuId=null;
let consegnaFornCorrente=null;
let currentFornitoreEdit='';
let currentClienteEdit='';
let ordiniTab='attivi';
let parcoAuto=[];
let nextVeicoloId=1;
var debouncedRenderInventario=debounce(renderInventario,200);

function refreshViste(){
  try{renderInventario();}catch(e){}
  try{renderFornitori();}catch(e){}
  try{renderClienti();}catch(e){}
  try{renderOrdini();}catch(e){}
  try{renderDashboard();}catch(e){}
  try{renderMovimenti();}catch(e){}
}

function getClienteProfilo(nome){return clientiProfili.find(c=>c.nome===nome)||{nome,logo:''};}
function setLogoCliente(nome,logoDataUrl){compressImage(logoDataUrl,200,0.7).then(function(compressed){var c=clientiProfili.find(x=>x.nome===nome);if(c)c.logo=compressed;else clientiProfili.push({nome,logo:compressed});if(currentClienteEdit===nome)refreshClienteModal(nome);renderClienti();saveData();});}
function removeLogoCliente(nome){var c=clientiProfili.find(x=>x.nome===nome);if(c)c.logo='';renderClienti();}
function triggerLogoCliente(nome){var input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=e=>{var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=ev=>setLogoCliente(nome,ev.target.result);reader.readAsDataURL(file)};input.click();}

function openClienteModal(cliente,color){currentClienteEdit=cliente;refreshClienteModal(cliente,color);document.getElementById('modal-cliente').classList.add('active');}
function refreshClienteModal(cliente,color){
  var profilo=getClienteProfilo(cliente);var initials=cliente.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);var col=color||'var(--accent)';
  document.getElementById('mc-title').textContent=cliente;document.getElementById('mc-nome').value=cliente;
  var preview=document.getElementById('mc-avatar-preview');
  if(profilo.logo){preview.innerHTML='<img src="'+profilo.logo+'" style="width:100%;height:100%;object-fit:contain">';preview.style.cssText='width:72px;height:72px;border-radius:16px;overflow:hidden;border:1.5px solid var(--b2);cursor:pointer;display:flex;align-items:center;justify-content:center;background:transparent';document.getElementById('mc-remove-logo').style.display='inline-flex';}
  else{preview.innerHTML=initials;preview.className='gp-avatar';preview.style.cssText='width:72px;height:72px;font-size:26px;font-weight:700;cursor:pointer;--av-color:'+col;document.getElementById('mc-remove-logo').style.display='none';}
  var noteList=document.getElementById('mc-note-list');if(noteList){var noteArr=profilo.note||[];if(noteArr.length===0){noteList.innerHTML='<div style="font-size:12px;color:var(--tx2);padding:6px 0">Nessun appunto</div>';}else{noteList.innerHTML=noteArr.map((n,i)=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:8px;margin-bottom:6px;background:'+(n.risolta?'var(--s1)':'rgba(245,197,24,0.08)')+';border:1px solid '+(n.risolta?'var(--b2)':'rgba(245,197,24,0.3)')+'"><div><div style="font-size:12px;color:'+(n.risolta?'var(--tx2)':'var(--tx)')+';text-decoration:'+(n.risolta?'line-through':'')+'">'+ n.testo+'</div></div>'+(!n.risolta?'<button onclick="risolviNotaClienteModal(\''+cliente+'\','+i+')" style="background:none;border:1px solid var(--warn);border-radius:6px;padding:2px 8px;font-size:12px;color:var(--warn);cursor:pointer">✓</button>':'')+'</div>').join('');}}}

// ============================================================
// VIEWS
// ============================================================
function showView(v){document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));document.querySelectorAll('.nav-btn').forEach(el=>el.classList.remove('active'));document.querySelectorAll('.mobile-nav-btn').forEach(el=>el.classList.remove('active'));document.getElementById('view-'+v).classList.add('active');var navBtns=document.querySelectorAll('.nav-btn');var views=['dashboard','inventario','entrata','uscita','movimenti','report','note','ordini','parcoauto'];var idx=views.indexOf(v);if(idx>=0&&navBtns[idx])navBtns[idx].classList.add('active');var mBtn=document.getElementById('mnav-'+v);if(mBtn)mBtn.classList.add('active');if(v==='dashboard')renderDashboard();if(v==='inventario')renderInventario();if(v==='movimenti')renderMovimenti();if(v==='report')renderReport();if(v==='note'){renderNote();updateNotaClientiList();}if(v==='ordini')renderOrdini();if(v==='proforma')initProformaView();if(v==='parcoauto')renderParcoAuto();}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard(){
  var warn=inventario.filter(a=>a.qty>0&&a.qty<=a.min);var danger=inventario.filter(a=>a.qty===0);var today=new Date().toDateString();var movsToday=movimenti.filter(m=>new Date(m.ts).toDateString()===today);
  var ordiniInAttesa=Object.entries(ordiniFornitore).filter(([,o])=>o.inviato&&o.articoli.length>0);
  document.getElementById('kpi-articoli').textContent=inventario.length;document.getElementById('kpi-warn').textContent=warn.length;document.getElementById('kpi-danger').textContent=danger.length;document.getElementById('kpi-mov').textContent=movsToday.length;document.getElementById('kpi-ordini').textContent=ordiniInAttesa.length;document.getElementById('kpi-ordini-sub').textContent=ordiniInAttesa.length===1?'fornitore':'fornitori';
  var noteSospese=note.filter(n=>!n.completata).length;var elNS=document.getElementById('kpi-note-sospeso');if(elNS)elNS.textContent=noteSospese;
  document.getElementById('stat-total').textContent=inventario.length;document.getElementById('stat-sku').textContent=inventario.reduce((s,a)=>s+a.qty,0)+' unità';
  var alertCount=warn.length+danger.length;var aw=document.getElementById('alert-wrap');if(alertCount>0){aw.style.display='block';document.getElementById('alert-count').textContent=alertCount+' scorte basse';}else{aw.style.display='none';}
  var ac=document.getElementById('alerts-container');var critical=[...danger,...warn];
  var articoliOrdinati=new Set();Object.values(ordiniFornitore).forEach(o=>{if(o.inviato)o.articoli.forEach(x=>articoliOrdinati.add(x.id))});
  var daOrdinare=critical.filter(a=>!articoliOrdinati.has(a.id));var inOrdine=critical.filter(a=>articoliOrdinati.has(a.id));
  var html='';
  if(daOrdinare.length>0){html+='<div style="background:#2e2e2e;border:2px solid rgba(240,62,62,.75);border-radius:16px;padding:16px;margin-bottom:12px"><div style="color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;margin-bottom:12px">⚠️ Articoli da riordinare</div>'+daOrdinare.map(a=>'<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:#383838;border-radius:10px;margin-bottom:6px;border:1.5px solid '+(a.qty===0?'rgba(240,62,62,.5)':'rgba(245,197,24,.5)')+';box-shadow:inset 4px 0 0 '+(a.qty===0?'#f03e3e':'#f5c518')+'"><span style="font-size:14px;color:#fff;font-weight:500;flex:1">'+a.desc+'</span><span style="color:'+(a.qty===0?'#ff2222':'#f5c518')+';font-size:12px;font-weight:800;flex-shrink:0;white-space:nowrap">'+(a.qty===0?'ESAURITO':a.qty+' '+(a.udm||'cartoni'))+'</span></div>').join('')+'</div>';}
  if(inOrdine.length>0){html+='<div style="background:#2e2e2e;border:2px solid rgba(62,207,110,.75);border-radius:16px;padding:16px"><div style="color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;margin-bottom:12px">📦 In ordine — in arrivo</div>'+inOrdine.map(a=>'<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:#383838;border-radius:10px;margin-bottom:6px;border:1.5px solid rgba(62,207,110,.5);box-shadow:inset 4px 0 0 #3ecf6e"><span style="font-size:14px;color:#fff;font-weight:500;flex:1">'+a.desc+'</span><span style="color:#3ecf6e;font-size:13px;font-weight:700;flex-shrink:0;white-space:nowrap">'+(a.qty===0?'ESAURITO':a.qty+' '+(a.udm||'cartoni'))+'</span></div>').join('')+'</div>';}
  ac.innerHTML=html;
  var dm=document.getElementById('dash-movimenti');var oggi=new Date();var lunedi=new Date(oggi);lunedi.setDate(oggi.getDate()-((oggi.getDay()+6)%7));lunedi.setHours(0,0,0,0);var movSettimana=[...movimenti].reverse().filter(m=>new Date(m.ts)>=lunedi);
  if(movSettimana.length===0){dm.innerHTML='<div class="empty-state"><div class="empty-icon">📋</div><p>Nessun movimento questa settimana.</p></div>';}else{dm.innerHTML=movSettimana.map(m=>movItem(m)).join('');}
}
function movItem(m){var isIn=m.type==='entrata';var t=new Date(m.ts);var timeStr=t.toLocaleDateString('it-IT')+' '+t.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});return'<div class="mov-item"><div class="mov-icon '+(isIn?'in':'out')+'">'+(isIn?'📥':'📤')+'</div><div class="mov-info"><div class="mov-title">'+m.desc+'</div><div class="mov-sub">'+m.code+' · '+(isIn?'Carico':'Scarico')+'</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;flex-shrink:0"><div class="mov-qty '+(isIn?'in':'out')+'">'+(isIn?'+':'-')+m.qty+' <span style="font-size:13px">'+(m.udm||'')+'</span></div><div style="font-size:12px;color:'+(isIn?'var(--green)':'var(--danger)')+';font-family:var(--fm);text-transform:uppercase;letter-spacing:1px;margin-top:1px">'+(isIn?'entrata':'uscita')+'</div></div><div class="mov-time">'+timeStr+'</div></div>';}

// ============================================================
// INVENTORY
// ============================================================
function switchInvTab(tab){activeInvTab=tab;document.querySelectorAll('.inv-tab').forEach(t=>t.classList.remove('active'));document.getElementById('tab-'+tab).classList.add('active');document.getElementById('inv-panel-standard').style.display=tab==='standard'?'block':'none';document.getElementById('inv-panel-fornitori').style.display=tab==='fornitori'?'block':'none';document.getElementById('inv-panel-clienti').style.display=tab==='clienti'?'block':'none';if(tab==='standard')renderInventario();if(tab==='fornitori')renderFornitori();if(tab==='clienti')renderClienti();}
function setFilter(f){filterMode=f;document.getElementById('filter-all').classList.toggle('active',f==='all');document.getElementById('filter-warn').classList.toggle('active',f==='warn');renderInventario();}
function renderInventario(){var q=(document.getElementById('search-input')?.value||'').toLowerCase();var list=inventario.filter(a=>a.desc.toLowerCase().includes(q)||a.code.toLowerCase().includes(q)||a.cat.toLowerCase().includes(q)||(a.fornitore||'').toLowerCase().includes(q));if(filterMode==='warn')list=list.filter(a=>a.qty<=a.min);var tbody=document.getElementById('inv-tbody');if(!tbody)return;if(list.length===0){tbody.innerHTML='<div style="text-align:center;padding:40px;color:var(--tx2)">Nessun articolo trovato</div>';return;}
tbody.innerHTML=list.map(a=>{var st=a.qty===0?'danger':a.qty<=a.min?'warn':'ok';var stLabel=a.qty===0?'Esaurito':a.qty<=a.min?'Scorta bassa':'OK';var qColor=a.qty===0?'var(--danger)':a.qty<=a.min?'var(--warn)':'var(--green)';var lastMov=movimenti.filter(m=>m.code===a.code).reverse()[0];var lastStr=lastMov?new Date(lastMov.ts).toLocaleDateString('it-IT'):'—';var inOrdine=Object.values(ordiniFornitore).some(o=>o.inviato&&o.articoli.find(x=>x.id===a.id));var qtyInArrivo=0;Object.values(ordiniFornitore).forEach(o=>{if(o.inviato){var art=o.articoli.find(x=>x.id===a.id);if(art&&art.qtyDaOrdinare)qtyInArrivo+=parseInt(art.qtyDaOrdinare)||0;}});var ordinatoTag=inOrdine?'<span style="font-size:11px;color:var(--green);margin-left:6px">📦 In ordine'+(qtyInArrivo>0?' · '+qtyInArrivo+' ct':'')+'</span>':'';var corsiaTag=a.corsia?'<span style="background:rgba(167,139,250,.15);color:#f0f0f0;padding:2px 7px;border-radius:6px;font-size:11px">📍 '+a.corsia+'</span>':'';
return'<div onclick="quickEdit('+a.id+')" style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:14px;padding:16px;border-bottom:1.5px solid rgba(255,255,255,.65);cursor:pointer;transition:background .15s" onmouseenter="this.style.background=\'rgba(255,255,255,.04)\'" onmouseleave="this.style.background=\'transparent\'"><div style="min-width:0"><div style="font-size:11px;color:#c0c0c0;margin-bottom:4px;font-family:var(--fm)">'+a.code+(a.codeForn?' · <span style="color:#c0c0c0">'+a.codeForn+'</span>':'')+'</div><div style="font-size:14px;color:#fff;font-weight:600;line-height:1.4">'+a.desc+'</div><div style="font-size:11px;color:#c8c8c8;margin-top:4px">'+(a.fornitore||'—')+' · <span style="color:#90cdf4">'+(a.cat||'—')+'</span>'+ordinatoTag+'</div>'+(a.cliente?'<div style="font-size:11px;color:#90cdf4;margin-top:3px">👤 '+a.cliente+'</div>':'')+(corsiaTag?'<div style="margin-top:4px">'+corsiaTag+'</div>':'')+'<div style="font-size:10px;color:#c0c0c0;margin-top:4px">Ultimo mov: '+lastStr+' · Min: '+a.min+'</div></div><div style="text-align:right;flex-shrink:0"><div style="font-size:28px;font-weight:800;color:'+qColor+';line-height:1">'+a.qty+'</div><div style="font-size:10px;color:#c8c8c8;margin-top:2px">'+(a.udm||'cartoni')+(a.pezziPerCartone>0?' <span style="color:#90cdf4">('+a.qty*a.pezziPerCartone+' pz)</span>':'')+'</div><div style="font-size:11px;font-weight:700;color:'+qColor+';margin-top:4px">'+stLabel+'</div><button style="margin-top:8px;background:transparent;border:1px solid rgba(255,255,255,.3);border-radius:6px;padding:3px 8px;font-size:11px;color:#c8c8c8;cursor:pointer" onclick="event.stopPropagation();deleteArticle('+a.id+')">✕</button></div></div>';}).join('');}

function gpAvatarHtml(nome,color,size){size=size||38;var fornObj=fornitori.find(f=>f.nome===nome);var cliObj=clientiProfili.find(c=>c.nome===nome);var logo=fornObj?.logo||cliObj?.logo||'';var initials=nome.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);if(logo)return'<span class="gp-avatar" style="width:'+size+'px;height:'+size+'px;background:transparent;border:1.5px solid var(--b2);padding:2px"><img src="'+logo+'" style="width:100%;height:100%;object-fit:contain;border-radius:6px"></span>';return'<span class="gp-avatar" style="width:'+size+'px;height:'+size+'px;--av-color:'+color+'">'+initials+'</span>';}
function artCardCompact(a,cardId,hideCliente){var qColor=a.qty===0?'var(--danger)':a.qty<=a.min?'var(--warn)':'var(--green)';var stLabel=a.qty===0?'Esaurito':a.qty<=a.min?'Scorta bassa':'OK';var isAlert=a.qty<=a.min;var clienteTag=(!hideCliente&&a.cliente)?'<div style="font-size:11px;color:#90cdf4;margin-top:3px">👤 '+a.cliente+'</div>':'';return'<div class="art-card'+(isAlert?' art-card-alert':'')+'" id="'+cardId+'" onclick="showArtMenu(event,'+a.id+')" style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:14px;padding:16px"><div style="min-width:0"><div style="font-size:11px;color:#c0c0c0;margin-bottom:4px;font-family:var(--fm)">'+a.code+(a.codeForn?' · '+a.codeForn:'')+'</div><div style="font-size:14px;color:#fff;font-weight:600;line-height:1.4">'+a.desc+'</div>'+(a.cat?'<div style="font-size:11px;color:#c8c8c8;margin-top:3px"><span style="color:#90cdf4">'+a.cat+'</span></div>':'')+clienteTag+'</div><div style="text-align:right;flex-shrink:0"><div style="font-size:28px;font-weight:800;color:'+qColor+';line-height:1">'+a.qty+'</div><div style="font-size:10px;color:#c8c8c8;margin-top:2px">'+(a.udm||'cartoni')+(a.pezziPerCartone>0?' <span style="color:#90cdf4">('+a.qty*a.pezziPerCartone+' pz)</span>':'')+'</div><div style="font-size:11px;font-weight:700;color:'+qColor+';margin-top:4px">'+stLabel+'</div></div></div>';}

function renderFornitori(){var container=document.getElementById('fornitori-panels');var allFornitori=[...new Set(inventario.map(a=>a.fornitore).filter(Boolean))];var colors=['var(--accent)','var(--blue)','var(--green)','var(--warn)','#c084fc','#fb923c'];container.innerHTML=allFornitori.map((forn,fi)=>{var articoli=inventario.filter(a=>a.fornitore===forn);var totQty=articoli.reduce((s,a)=>s+a.qty,0);var critici=articoli.filter(a=>a.qty<=a.min).length;var color=colors[fi%colors.length];return'<div class="group-panel" id="gp-forn-'+fi+'"><div class="group-panel-header" onclick="togglePanel(\'forn-'+fi+'\')"><div class="group-panel-title">'+gpAvatarHtml(forn,color)+' '+forn+'</div><div class="group-panel-chips"><span class="gp-chip">'+articoli.length+' art.</span><span class="gp-chip">'+totQty+' ct.</span>'+(critici>0?'<span class="gp-chip gp-chip-danger" onclick="scrollToCritici(event,\'forn-'+fi+'\')">⚠ '+critici+' in alert</span>':'<span class="gp-chip gp-chip-ok">✓ OK</span>')+'<span class="gp-chip gp-chip-settings" onclick="event.stopPropagation();openFornModal(\''+forn+'\',\''+color+'\')">⚙</span><span class="gp-chevron">›</span></div></div><div class="group-panel-body open" id="forn-'+fi+'">'+articoli.map((a,ai)=>artCardCompact(a,'forn-'+fi+'-art-'+ai)).join('')+'</div></div>';}).join('')||'<div class="empty-state"><div class="empty-icon">🏭</div><p>Nessun fornitore ancora.</p></div>';}

function renderClienti(){var container=document.getElementById('clienti-panels');var colors=['#f472b6','#60a5fa','#34d399','#fbbf24','#a78bfa','#fb7185'];if(clientiPersonalizzati.length===0){container.innerHTML='<div class="empty-state"><div class="empty-icon">👤</div><p>Nessun cliente personalizzato.</p></div>';return;}container.innerHTML=clientiPersonalizzati.map((cliente,ci)=>{var articoli=inventario.filter(a=>a.cliente===cliente);var totQty=articoli.reduce((s,a)=>s+a.qty,0);var critici=articoli.filter(a=>a.qty<=a.min).length;var color=colors[ci%colors.length];return'<div class="group-panel"><div class="group-panel-header" onclick="togglePanel(\'cli-'+ci+'\')"><div class="group-panel-title">'+gpAvatarHtml(cliente,color)+' '+cliente+'</div><div class="group-panel-chips"><span class="gp-chip">'+articoli.length+' art.</span><span class="gp-chip">'+totQty+' ct.</span>'+(critici>0?'<span class="gp-chip gp-chip-danger">⚠ '+critici+' in alert</span>':articoli.length>0?'<span class="gp-chip gp-chip-ok">✓ OK</span>':'')+'<span class="gp-chip gp-chip-settings" onclick="event.stopPropagation();openClienteModal(\''+cliente+'\',\''+color+'\')">⚙</span><span class="gp-chevron">›</span></div></div><div class="group-panel-body open" id="cli-'+ci+'">'+(articoli.length===0?'<div style="padding:20px;text-align:center;color:var(--tx2);font-size:12px">Nessun articolo ancora.</div>':articoli.map((a,ai)=>artCardCompact(a,'cli-'+ci+'-art-'+ai,true)).join(''))+'</div></div>';}).join('');}

function scrollToCritici(e,panelId){e.stopPropagation();var body=document.getElementById(panelId);if(body&&!body.classList.contains('open'))togglePanel(panelId);setTimeout(()=>{var firstAlert=body?body.querySelector('.art-card-alert'):null;if(firstAlert){firstAlert.scrollIntoView({behavior:'smooth',block:'center'});firstAlert.classList.add('art-card-flash');setTimeout(()=>firstAlert.classList.remove('art-card-flash'),1800);}},150);}
function togglePanel(id){try{var body=document.getElementById(id);if(!body)return;var isOpen=body.classList.toggle('open');var parent=body.parentNode;if(parent){var headers=parent.querySelectorAll('.group-panel-header');if(headers&&headers.length>0)headers[0].setAttribute('aria-expanded',isOpen?'true':'false');}}catch(e){}}

function quickEdit(id){var a=inventario.find(x=>x.id===id);if(!a)return;document.getElementById('new-code').value=a.code;document.getElementById('new-code-forn').value=a.codeForn||'';document.getElementById('new-desc').value=a.desc;document.getElementById('new-cat').value=a.cat;document.getElementById('new-fornitore').value=a.fornitore||'';document.getElementById('new-cliente').value=a.cliente||'';document.getElementById('new-qty').value=a.qty;document.getElementById('new-min').value=a.min;var udmEl=document.getElementById('new-udm');if(udmEl)udmEl.value=a.udm||'cartoni';document.getElementById('new-preordine').value=a.preOrdine||'';var ppcEl=document.getElementById('new-pezzi-cartone');if(ppcEl)ppcEl.value=a.pezziPerCartone||'';var corsiaEl=document.getElementById('new-corsia');if(corsiaEl)corsiaEl.value=a.corsia||'';_corsiaPhotoData=a.corsiaFoto||null;var preview=document.getElementById('corsia-photo-preview');var imgEl=document.getElementById('corsia-photo-img');if(preview&&imgEl){if(_corsiaPhotoData){imgEl.src=_corsiaPhotoData;preview.style.display='block';}else{imgEl.src='';preview.style.display='none';}}document.getElementById('modal-overlay').dataset.editId=id;openModal();aggiornaLabelPezzi();}
function triggerCorsiaPhoto(){document.getElementById('corsia-photo-input').click();}
function handleCorsiaPhoto(input){var file=input.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(e){compressImage(e.target.result,400,0.6).then(function(compressed){_corsiaPhotoData=compressed;document.getElementById('corsia-photo-img').src=_corsiaPhotoData;document.getElementById('corsia-photo-preview').style.display='block';});};reader.readAsDataURL(file);}
function removeCorsiaPhoto(){_corsiaPhotoData=null;document.getElementById('corsia-photo-preview').style.display='none';document.getElementById('corsia-photo-img').src='';document.getElementById('corsia-photo-input').value='';}
function aggiornaLabelPezzi(){var udm=document.getElementById('new-udm')?.value||'cartoni';var row=document.getElementById('pezzi-cartone-row');var label=document.getElementById('pezzi-cartone-label');if(!row||!label)return;if(udm==='pezzi'){row.style.display='none';return;}row.style.display='block';var singolare={cartoni:'cartone',coppie:'coppia',confezioni:'confezione'};label.textContent='Pezzi per '+(singolare[udm]||udm)+' (opzionale)';}
function deleteArticle(id){inventario=inventario.filter(x=>x.id!==id);renderInventario();updateStats();showToast('Articolo eliminato');}

function openModal(type,clientePreset){var fl=document.getElementById('fornitori-list');fl.innerHTML=fornitori.map(f=>'<option value="'+f.nome+'">').join('');var cl=document.getElementById('clienti-list');cl.innerHTML=clientiPersonalizzati.map(c=>'<option value="'+c+'">').join('');if(clientePreset)document.getElementById('new-cliente').value=clientePreset;document.getElementById('modal-overlay').classList.add('active');}
function closeModal(){document.getElementById('modal-overlay').classList.remove('active');document.getElementById('modal-overlay').dataset.editId='';['new-code','new-desc','new-qty','new-min','new-fornitore','new-cliente','new-preordine','new-corsia'].forEach(id=>{var el=document.getElementById(id);if(el)el.value='';});_corsiaPhotoData=null;var preview=document.getElementById('corsia-photo-preview');if(preview)preview.style.display='none';}
function openNuovoClienteModal(){document.getElementById('cliente-modal-overlay').classList.add('active');}
function closeClienteModal(){document.getElementById('cliente-modal-overlay').classList.remove('active');document.getElementById('new-cliente-name').value='';}
function saveNewCliente(){var name=document.getElementById('new-cliente-name').value.trim();if(!name){showToast('Inserisci il nome del cliente');return;}if(!clientiPersonalizzati.includes(name))clientiPersonalizzati.push(name);closeClienteModal();renderClienti();showToast('Cliente aggiunto: '+name);saveData();popolaDatalistUscita();}
function saveNewArticle(){var code=document.getElementById('new-code').value.trim();var codeForn=document.getElementById('new-code-forn').value.trim();var desc=document.getElementById('new-desc').value.trim();var cat=document.getElementById('new-cat').value;var fornitore=document.getElementById('new-fornitore').value.trim();var cliente=document.getElementById('new-cliente').value.trim();var qty=parseInt(document.getElementById('new-qty').value)||0;var min=parseInt(document.getElementById('new-min').value)||5;var udm=document.getElementById('new-udm')?.value||'cartoni';var preOrdine=parseInt(document.getElementById('new-preordine').value)||Math.round(min*1.3);var corsia=document.getElementById('new-corsia')?.value.trim()||'';var corsiaFoto=_corsiaPhotoData;var pezziPerCartone=parseInt(document.getElementById('new-pezzi-cartone')?.value)||0;if(!code||!desc){alert('Inserisci codice e descrizione');return;}if(fornitore&&!fornitori.find(f=>f.nome===fornitore))fornitori.push({nome:fornitore,email:'',logo:''});var editId=parseInt(document.getElementById('modal-overlay').dataset.editId);if(editId){var a=inventario.find(x=>x.id===editId);if(a)Object.assign(a,{code,codeForn,desc,cat,fornitore,cliente,qty,min,preOrdine,corsia,corsiaFoto,udm,pezziPerCartone});showToast('Articolo aggiornato');}else{inventario.push({id:nextId++,code,codeForn,desc,cat,fornitore,cliente,qty,min,preOrdine,corsia,corsiaFoto,ordinato:false,udm,pezziPerCartone});showToast('Articolo aggiunto');}closeModal();if(activeInvTab==='fornitori')renderFornitori();else if(activeInvTab==='clienti')renderClienti();else renderInventario();updateStats();saveData();popolaDatalistUscita();}


// === NUOVO ARTICOLO DA FOTO ===
async function nuovoArticoloDaFoto(){
  var input=document.createElement('input');input.type='file';input.accept='image/*';input.capture='environment';
  input.onchange=async function(e){
    var file=e.target.files[0];if(!file)return;
    showToast('Analizzo la foto...');
    var apiKey=localStorage.getItem('mag_apikey');
    if(!apiKey){showToast('Inserisci prima la chiave API');return;}
    try{
      var b64=await fileToBase64(file);
      var prompt='Analizza questa foto di un prodotto/cartone. Estrai le informazioni visibili. Rispondi SOLO con JSON: {"code":"codice prodotto","desc":"descrizione","fornitore":"nome fornitore se visibile","qty":"quantita se visibile"}. Se un campo non e visibile, lascialo vuoto stringa.';
      var resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},body:JSON.stringify({model:'llama-3.2-11b-vision-preview',max_tokens:500,messages:[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+file.type+';base64,'+b64}}]}]})});
      var data=await resp.json();var text=data.choices?.[0]?.message?.content||'';
      var clean=text.replace(/```json|```/g,'').trim();var info=JSON.parse(clean);
      document.getElementById('new-code').value=info.code||'';
      document.getElementById('new-desc').value=info.desc||'';
      document.getElementById('new-fornitore').value=info.fornitore||'';
      if(info.qty)document.getElementById('new-qty').value=info.qty;
      openModal();showToast('Campi precompilati dalla foto');
    }catch(err){showToast('Errore lettura: '+err.message);openModal();}
  };input.click();
}

// ============================================================
// FILE HANDLING & AI
// ============================================================
function dragOver(e,id){e.preventDefault();document.getElementById(id).classList.add('dragover');}function dragLeave(id){document.getElementById(id).classList.remove('dragover');}function dropFile(e,type){e.preventDefault();var dropId=type==='foto'?'drop-foto':type==='foto-uscita'?'drop-foto-uscita':'drop-pdf';dragLeave(dropId);var file=e.dataTransfer.files[0];if(file)processFile(file,type).catch(()=>{});}function handleFile(e,type){var file=e.target.files[0];if(file)processFile(file,type);}
async function processFile(file,type){var isUscita=type==='pdf'||type==='foto-uscita';var procEl=document.getElementById('ai-proc-'+(isUscita?'uscita':'entrata'));var logEl=document.getElementById('ai-log-'+(isUscita?'uscita':'entrata'));procEl.classList.add('active');logEl.innerHTML='';var addLog=(msg,cls,delay)=>{setTimeout(()=>{var d=document.createElement('div');d.textContent=msg;logEl.appendChild(d);},delay||0);};addLog('File ricevuto: '+file.name,'ok',0);addLog('Invio all\'AI...','ok',400);var b64=await fileToBase64(file);var isImage=file.type.startsWith('image/');var prompt=type==='foto'?'Sei un sistema di gestione magazzino. Analizza questa bolla italiana. Estrai TUTTI gli articoli. Rispondi SOLO con JSON: [{"code":"CODICE","desc":"Descrizione","qty":NUMERO}]':'Sei un sistema di gestione magazzino. Analizza questo documento italiano. Estrai TUTTI gli articoli consegnati. Rispondi SOLO con JSON: [{"code":"CODICE","desc":"Descrizione","qty":NUMERO}]';try{addLog('Lettura in corso...',0,800);
var apiKey=localStorage.getItem('mag_apikey')||'';
if(!apiKey){addLog('\u26A0 Chiave API mancante! Vai in Impostazioni.','',1000);procEl.classList.remove('active');return;}
var messages=[];
if(isImage){
  // Comprimi immagine prima di inviarla
  var compB64=b64;
  try{compB64=await new Promise(function(resolve){var img=new Image();img.onload=function(){var c=document.createElement('canvas');var ratio=Math.min(1024/img.width,1);c.width=Math.round(img.width*ratio);c.height=Math.round(img.height*ratio);c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',0.8).split(',')[1]);};img.onerror=function(){resolve(b64);};img.src='data:'+file.type+';base64,'+b64;});}catch(ce){compB64=b64;}
  messages=[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:image/jpeg;base64,'+compB64}}]}];
}else{
  messages=[{role:'user',content:prompt}];
}
var modelToUse=isImage?'llama-3.2-11b-vision-preview':'llama-3.3-70b-versatile';
addLog('Modello: '+modelToUse,'',1000);
var resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},body:JSON.stringify({model:modelToUse,max_tokens:1000,messages:messages})});
var data=await resp.json();
if(!resp.ok){addLog('\u274C Errore API: '+(data.error?.message||resp.status),'',1200);setTimeout(function(){procEl.classList.remove('active');},2000);return;}
var text=data.choices?.[0]?.message?.content||'';
addLog('Risposta AI: '+text.substring(0,80)+'...','',1200);
var clean=text.replace(/```json|```/g,'').trim();
var jsonMatch=clean.match(/\[.*\]/s);
var items=[];
try{items=JSON.parse(jsonMatch?jsonMatch[0]:clean);}catch(e){addLog('\u26A0 Parsing fallito, nessun articolo estratto','',1400);items=[];}
addLog('Trovati '+items.length+' articoli','ok',1600);
setTimeout(()=>{procEl.classList.remove('active');if(items.length>0)showConfirm(items,isUscita?'uscita':'entrata');else showToast('Nessun articolo rilevato dalla foto');},2200);
}catch(err){addLog('\u274C Errore: '+err.message,'',1200);setTimeout(()=>{procEl.classList.remove('active');showToast('Errore elaborazione: '+err.message);},2500);}}
function fileToBase64(file){return new Promise((res,rej)=>{var r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=()=>rej(new Error('Read failed'));r.readAsDataURL(file);});}

// ============================================================
// CONFIRM
// ============================================================
function findArticolo(code,desc,type){var c=code.toLowerCase();var d=desc.toLowerCase().substring(0,12);if(type==='entrata')return inventario.find(a=>a.codeForn&&a.codeForn.toLowerCase()===c)||inventario.find(a=>a.code.toLowerCase()===c)||inventario.find(a=>a.desc.toLowerCase().includes(d));return inventario.find(a=>a.code.toLowerCase()===c)||inventario.find(a=>a.codeForn&&a.codeForn.toLowerCase()===c)||inventario.find(a=>a.desc.toLowerCase().includes(d));}
function showConfirm(items,type){pendingItems=items;var panel=document.getElementById('confirm-'+type);var tbody=document.getElementById('confirm-tbody-'+type);panel.classList.add('active');tbody.innerHTML=items.map((it,i)=>{var existing=findArticolo(it.code,it.desc,type);var isNew=!existing;var currentQty=existing?existing.qty:0;if(type==='entrata')return'<tr><td>'+it.desc+'</td><td style="color:var(--tx2)">'+it.code+'</td><td><input class="qty-input" id="pqty-'+i+'" value="'+it.qty+'" type="number" min="0"></td><td>'+(isNew?'<span style="color:var(--warn)">Nuovo — verrà creato</span>':'<span style="color:var(--green)">Aggiorna giacenza</span>')+'</td></tr>';return'<tr><td>'+it.desc+'</td><td style="color:var(--tx2)">'+it.code+'</td><td><input class="qty-input" id="pqty-'+i+'" value="'+it.qty+'" type="number" min="0"></td><td><span class="'+(currentQty<it.qty?'qty-danger':'qty-ok')+'">'+currentQty+' '+(existing?(existing.udm||'cartoni'):'cartoni')+'</span></td></tr>';}).join('');}
function cancelConfirm(type){document.getElementById('confirm-'+type).classList.remove('active');pendingItems=[];}
function applyConfirm(type){var now=new Date().toISOString();pendingItems.forEach((it,i)=>{var qEl=document.getElementById('pqty-'+i);var qty=parseInt(qEl?.value)||0;if(qty===0)return;var existing=findArticolo(it.code,it.desc,type);if(type==='entrata'){if(existing){existing.qty+=qty;if(!existing.codeForn&&it.code&&it.code!==existing.code)existing.codeForn=it.code;}else{inventario.push({id:nextId++,code:it.code,codeForn:it.code,desc:it.desc,cat:'Food Packaging',qty,min:5,preOrdine:7,fornitore:'',cliente:'',ordinato:false});}}else{if(existing)existing.qty=Math.max(0,existing.qty-qty);}var art=findArticolo(it.code,it.desc,type);movimenti.push({type,code:it.code,desc:it.desc,qty,ts:now,cliente:art?.cliente||'',fornitore:art?.fornitore||'',udm:art?.udm||'cartoni'});archivioMovimenti.push({type,code:it.code,desc:it.desc,qty,ts:now,cliente:art?.cliente||'',fornitore:art?.fornitore||'',udm:art?.udm||'cartoni'});});cancelConfirm(type);updateStats();showToast(type==='entrata'?'✓ Inventario aggiornato in entrata':'✓ Inventario aggiornato in uscita');if(type==='uscita')checkAlertDopoUscita();saveData();}

function addManUscita(){var artVal=document.getElementById('man-uscita-art').value.trim();var descVal=document.getElementById('man-uscita-desc')?.value.trim()||'';var qty=parseInt(document.getElementById('man-uscita-qty').value)||0;var cliente=document.getElementById('man-uscita-cliente').value.trim();var query=artVal||descVal;if(!query||qty<=0){showToast('Inserisci articolo e quantità');return;}var art=cercaArticolo(query);if(!art){showToast('Articolo non trovato: '+artVal);return;}if(art.qty<=0){showToast('Articolo esaurito: '+art.desc);return;}var qtyEff=Math.min(qty,art.qty);art.qty-=qtyEff;movimenti.push({type:'uscita',code:art.code,desc:art.desc,qty:qtyEff,ts:new Date().toISOString(),cliente:cliente||art.cliente||'',fornitore:art.fornitore||'',udm:art.udm||'cartoni'});archivioMovimenti.push({type:'uscita',code:art.code,desc:art.desc,qty:qtyEff,ts:new Date().toISOString(),cliente:cliente||art.cliente||'',fornitore:art.fornitore||'',udm:art.udm||'cartoni'});saveData();updateStats();checkAlertDopoUscita();document.getElementById('man-uscita-art').value='';document.getElementById('man-uscita-qty').value='';document.getElementById('man-uscita-cliente').value='';if(document.getElementById('man-uscita-desc'))document.getElementById('man-uscita-desc').value='';showToast('✓ Scaricati '+qtyEff+' '+(art.udm||'pz')+' di '+art.desc);}
function addManual(){var code=document.getElementById('man-art').value.trim();var desc=document.getElementById('man-art-desc')?.value.trim()||'';var qty=parseInt(document.getElementById('man-qty').value)||0;var query=code||desc;if(!query||qty<=0){showToast('Inserisci articolo e quantità');return;}var existing=cercaArticolo(query);if(existing){existing.qty+=qty;movimenti.push({type:'entrata',code:existing.code,desc:existing.desc,qty,ts:new Date().toISOString(),udm:existing.udm||'cartoni'});archivioMovimenti.push({type:'entrata',code:existing.code,desc:existing.desc,qty,ts:new Date().toISOString(),udm:existing.udm||'cartoni'});}else{inventario.push({id:nextId++,code,desc:code,cat:'Altro',qty,min:5});movimenti.push({type:'entrata',code,desc:code,qty,ts:new Date().toISOString()});archivioMovimenti.push({type:'entrata',code,desc:code,qty,ts:new Date().toISOString()});}document.getElementById('man-art').value='';document.getElementById('man-qty').value='';if(document.getElementById('man-art-desc'))document.getElementById('man-art-desc').value='';updateStats();showToast('Carico aggiunto: +'+qty+' '+code);saveData();}
function renderMovimenti(){var el=document.getElementById('all-movimenti');if(movimenti.length===0){el.innerHTML='<div class="empty-state"><div class="empty-icon">📋</div><p>Nessun movimento registrato.</p></div>';return;}el.innerHTML=[...movimenti].reverse().map(m=>movItem(m)).join('');}

// ============================================================
// ALERTS
// ============================================================
function getAudioCtx(){
  if(!alertAudioCtx){
    try{alertAudioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}
  }
  if(alertAudioCtx.state==='suspended'){alertAudioCtx.resume().catch(function(){});}
  return alertAudioCtx;
}
var _audioUnlocked=false;
function unlockAudio(){
  if(_audioUnlocked)return;
  var ctx=getAudioCtx();if(!ctx)return;
  if(ctx.state==='suspended')ctx.resume().catch(function(){});
  try{var buf=ctx.createBuffer(1,1,22050);var src=ctx.createBufferSource();src.buffer=buf;src.connect(ctx.destination);src.start(0);_audioUnlocked=true;}catch(e){}
  if(pendingAlertSound){pendingAlertSound=false;setTimeout(playAlertSound,300);}
}
document.addEventListener('touchstart',unlockAudio,{once:false});
document.addEventListener('click',unlockAudio,{once:false});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')unlockAudio();});
function playAlertSound(){
  var ctx=getAudioCtx();
  if(!ctx){pendingAlertSound=true;return;}
  if(ctx.state==='suspended'){ctx.resume().then(function(){_playAlertTones(ctx);}).catch(function(){});return;}
  _playAlertTones(ctx);
}
function _playAlertTones(ctx){
  try{[{freq:660,start:0,dur:.4},{freq:880,start:.3,dur:.4},{freq:660,start:.6,dur:.4},{freq:880,start:.9,dur:.4},{freq:1046,start:1.2,dur:.6}].forEach(function(n){
    var osc=ctx.createOscillator();var gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.type='sine';osc.frequency.setValueAtTime(n.freq,ctx.currentTime+n.start);
    gain.gain.setValueAtTime(0,ctx.currentTime+n.start);
    gain.gain.linearRampToValueAtTime(0.35,ctx.currentTime+n.start+0.02);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+n.start+n.dur);
    osc.start(ctx.currentTime+n.start);osc.stop(ctx.currentTime+n.start+n.dur);
  });}catch(e){console.warn('Audio error',e);}
}
function playNotaSound(){
  var ctx=getAudioCtx();
  if(!ctx||ctx.state==='suspended'){pendingAlertSound=true;return;}
  try{[{freq:523,start:0,dur:.3},{freq:659,start:.25,dur:.3},{freq:784,start:.5,dur:.5}].forEach(function(n){
    var osc=ctx.createOscillator();var gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.type='triangle';osc.frequency.setValueAtTime(n.freq,ctx.currentTime+n.start);
    gain.gain.setValueAtTime(0,ctx.currentTime+n.start);
    gain.gain.linearRampToValueAtTime(0.4,ctx.currentTime+n.start+0.02);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+n.start+n.dur);
    osc.start(ctx.currentTime+n.start);osc.stop(ctx.currentTime+n.start+n.dur);
  });}catch(e){}
}
function triggerAlerts(critici){if(critici.length===0)return;var fl=document.getElementById('flash-overlay');fl.classList.remove('flash');void fl.offsetWidth;fl.classList.add('flash');playAlertSound();renderAlertModal();document.getElementById('alert-modal-overlay').classList.add('active');}
function renderAlertModal(){var critici=inventario.filter(a=>a.qty<=a.min);document.getElementById('alert-modal-list').innerHTML=critici.map(a=>{var isZero=a.qty===0;var isOrdinato=Object.values(ordiniFornitore).some(o=>o.inviato&&o.articoli.find(x=>x.id===a.id));return'<div class="alert-modal-row" style="opacity:'+(isOrdinato?'0.6':'1')+'"><div style="flex:1"><div style="font-size:14px;font-weight:600;color:#fff;margin-bottom:4px">'+a.desc+'</div><div style="font-size:12px;color:rgba(255,255,255,.55)">'+a.code+(isOrdinato?' <span style="color:var(--blue)">📦 In ordine</span>':'')+'</div></div><span style="font-family:var(--fn);font-weight:700;font-size:18px;color:'+(isZero?'var(--danger)':'var(--warn)')+';flex-shrink:0;min-width:60px;text-align:right">'+(isZero?'ESAURITO':a.qty+'/'+a.min)+'</span></div>';}).join('');}
function closeAlertModal(){document.getElementById('alert-modal-overlay').classList.remove('active');}
function getCritici(){var articoliOrdinati=new Set();Object.values(ordiniFornitore).forEach(o=>{if(o.inviato)o.articoli.forEach(x=>articoliOrdinati.add(x.id))});return inventario.filter(a=>a.qty<=a.min&&!articoliOrdinati.has(a.id));}
function updateStats(){document.getElementById('stat-total').textContent=inventario.length;document.getElementById('stat-sku').textContent=inventario.reduce((s,a)=>s+a.qty,0)+' unità';var articoliOrdinati=new Set();Object.values(ordiniFornitore).forEach(o=>{if(o.inviato)o.articoli.forEach(x=>articoliOrdinati.add(x.id))});var critici=inventario.filter(a=>a.qty<=a.min&&!articoliOrdinati.has(a.id));alertedIds.forEach(id=>{var a=inventario.find(x=>x.id===id);if(!a||a.qty>a.min||articoliOrdinati.has(id))alertedIds.delete(id);});var nuoviCritici=critici.filter(a=>!alertedIds.has(a.id));if(nuoviCritici.length>0){nuoviCritici.forEach(a=>alertedIds.add(a.id));triggerAlerts(nuoviCritici);}var badge=document.getElementById('alert-count');if(badge){badge.textContent=critici.length>0?critici.length+' scorte basse':'';badge.style.display=critici.length>0?'inline-block':'none';}renderDashboard();}
function checkMorningAlert(){
  var oggi=new Date().toDateString();
  // Solo la prima volta del giorno
  if(lastAlertDate===oggi)return;
  var critici=getCritici();
  if(critici.length>0){
    lastAlertDate=oggi;lastAlertTs=Date.now();
    try{localStorage.setItem('lastAlertDate',oggi);localStorage.setItem('lastAlertTs',String(lastAlertTs));}catch(e){}
    setTimeout(function(){triggerAlerts(critici);},1500);
  }else{
    // Segna il giorno anche se non ci sono critici, così non ricontrolla
    lastAlertDate=oggi;
    try{localStorage.setItem('lastAlertDate',oggi);}catch(e){}
  }
}
function checkAlertDopoUscita(){var critici=getCritici();if(critici.length>0){lastAlertTs=Date.now();try{localStorage.setItem('lastAlertTs',String(lastAlertTs));}catch(e){}triggerAlerts(critici);}}
function testAlert(){lastAlertDate='';lastAlertTs=0;try{localStorage.removeItem('lastAlertDate');localStorage.removeItem('lastAlertTs');}catch(e){}checkMorningAlert();}
function showToast(msg,type){var t=document.getElementById('toast');var m=document.getElementById('toast-msg');m.textContent=msg;t.className='toast show '+(type||'');setTimeout(()=>{t.classList.remove('show');},3000);}

// ============================================================
// NOTES
// ============================================================
function switchNoteTab(tab){noteTab=tab;document.querySelectorAll('.note-tab').forEach(t=>t.classList.remove('active'));document.getElementById('ntab-'+tab).classList.add('active');renderNote();}
function setQuickTime(btn,type){document.querySelectorAll('.note-quick-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');selectedQuickTime=type;var reminderEl=document.getElementById('nota-reminder');if(type==='custom'){reminderEl.style.display='block';reminderEl.value='';return;}if(type==='oggi-ora'){var now=new Date();now.setMinutes(now.getMinutes()+30);var pad=n=>n<10?'0'+n:n;reminderEl.value=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())+'T'+pad(now.getHours())+':'+pad(now.getMinutes());reminderEl.style.display='block';return;}reminderEl.style.display='none';var target=new Date();if(type==='domani'){target.setDate(target.getDate()+1);target.setHours(8,0,0,0);}var pad=n=>n<10?'0'+n:n;reminderEl.value=target.getFullYear()+'-'+pad(target.getMonth()+1)+'-'+pad(target.getDate())+'T'+pad(target.getHours())+':'+pad(target.getMinutes());}
function selectPrio(btn){document.querySelectorAll('.prio-btn').forEach(b=>{b.style.border='2px solid #3a3a3a';b.style.background='#1a1a1a';b.style.color='#c8c8c8';b.classList.remove('selected');});btn.classList.add('selected');var colors={bassa:'#3ecf6e',media:'#f5c518',alta:'#f03e3e'};var bgs={bassa:'rgba(62,207,110,.12)',media:'rgba(245,197,24,.12)',alta:'rgba(240,62,62,.12)'};var p=btn.dataset.prio;btn.style.border='2px solid '+colors[p];btn.style.background=bgs[p];btn.style.color='#f0f0f0';}
function saveNota(){var text=document.getElementById('nota-text').value.trim();if(!text){showToast('Scrivi qualcosa prima di salvare');return;}var reminderEl=document.getElementById('nota-reminder');var reminder=reminderEl.value?reminderEl.value:null;var prioBtnSel=document.querySelector('.prio-btn.selected');var priorita=prioBtnSel?prioBtnSel.dataset.prio:'bassa';var cliente=(document.getElementById('nota-cliente')?.value||'').trim();note.unshift({id:nextNotaId++,text,reminder,completata:false,ts:new Date().toISOString(),priorita,cliente});document.getElementById('nota-text').value='';if(document.getElementById('nota-cliente'))document.getElementById('nota-cliente').value='';document.querySelectorAll('.note-quick-btn').forEach(b=>b.classList.remove('selected'));reminderEl.value='';reminderEl.style.display='none';renderNote();showToast('Nota salvata');saveData();}
function toggleNota(id){var n=note.find(x=>x.id===id);if(n)n.completata=!n.completata;renderNote();updateNoteBadge();saveData();}
function deleteNota(id){note=note.filter(x=>x.id!==id);renderNote();updateNoteBadge();saveData();}
function renderNote(){var list=document.getElementById('note-list');var q=(document.getElementById('note-search')?.value||'').toLowerCase();var filtered=noteTab==='completate'?note.filter(n=>n.completata):note.filter(n=>!n.completata);if(q)filtered=filtered.filter(n=>n.text.toLowerCase().includes(q));var prioOrder={alta:0,media:1,bassa:2};filtered.sort((a,b)=>(prioOrder[a.priorita]||2)-(prioOrder[b.priorita]||2));if(filtered.length===0){list.innerHTML='<div class="empty-state"><div class="empty-icon">📝</div><p>'+(q?'Nessuna nota trovata.':noteTab==='completate'?'Nessuna nota completata.':'Nessuna nota ancora.')+'</p></div>';return;}var prioColors={alta:'var(--danger)',media:'var(--warn)',bassa:'var(--green)'};var prioLabels={alta:'🔴 Alta',media:'🟡 Media',bassa:'🟢 Bassa'};var now=new Date();list.innerHTML=filtered.map(n=>{var isScaduta=n.reminder&&new Date(n.reminder)<now&&!n.completata;var reminderStr=n.reminder?'<span class="note-reminder-badge '+(isScaduta?'scaduta':'')+'">'+(isScaduta?'⏰ Scaduta':'🔔')+' '+formatReminderDate(n.reminder)+'</span>':'';var prioColor=prioColors[n.priorita||'bassa'];return'<div class="note-card '+(isScaduta?'scaduta':'')+' '+(n.completata?'completata':'')+'" style="border-left:3px solid '+prioColor+'"><div class="note-card-header"><div class="note-card-text">'+n.text+'</div><div class="note-card-actions"><button class="note-action-btn done" onclick="toggleNota('+n.id+')">'+(n.completata?'↩':'✓')+'</button><button class="note-action-btn del" onclick="deleteNota('+n.id+')">✕</button></div></div><div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">'+reminderStr+'<span style="font-size:12px;color:'+prioColor+'">'+prioLabels[n.priorita||'bassa']+'</span>'+(n.cliente?'<span style="font-size:11px;background:rgba(144,205,244,.12);border:1px solid rgba(144,205,244,.4);border-radius:20px;padding:2px 8px;color:#90cdf4">👤 '+n.cliente+'</span>':'')+'<span style="font-size:12px;color:var(--tx2);margin-left:auto">'+new Date(n.ts).toLocaleDateString('it-IT')+'</span></div></div>';}).join('');}
function formatReminderDate(iso){var d=new Date(iso);var now=new Date();var isToday=d.toDateString()===now.toDateString();var isTomorrow=d.toDateString()===new Date(now.getTime()+86400000).toDateString();var timeStr=d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});if(isToday)return'Oggi '+timeStr;if(isTomorrow)return'Domani '+timeStr;return d.toLocaleDateString('it-IT')+' '+timeStr;}
function updateNoteBadge(){var now=new Date();var scadute=note.filter(n=>!n.completata&&n.reminder&&new Date(n.reminder)<now).length;var mob=document.getElementById('note-badge');if(mob)mob.style.display=scadute>0?'block':'none';}
function checkNoteReminders(){var now=new Date();note.forEach(n=>{if(!n.completata&&n.reminder&&!n._alerted){var diff=new Date(n.reminder)-now;if(diff<=0&&diff>-300000){n._alerted=true;triggerNotaAlert(n);}}});updateNoteBadge();}
function startReminderCheck(){noteReminderInterval=setInterval(checkNoteReminders,5000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkNoteReminders();});window.addEventListener('focus',checkNoteReminders);}
function triggerNotaAlert(n){var fl=document.getElementById('flash-overlay');fl.style.background='rgba(96,200,240,0.15)';fl.classList.remove('flash');void fl.offsetWidth;fl.classList.add('flash');setTimeout(()=>{fl.style.background='rgba(240,88,88,0.18)';},1000);playNotaSound();document.getElementById('nota-alert-text').textContent=n.text;document.getElementById('nota-alert-overlay').classList.add('active');ginoParla('Promemoria: '+n.text);}
function closeNotaAlert(){document.getElementById('nota-alert-overlay').classList.remove('active');}
function snoozeNotaAlert(){var n=[...note].reverse().find(x=>x._alerted);if(n){n._alerted=false;n.reminder=new Date(Date.now()+10*60*1000).toISOString();showToast('⏰ Promemoria posticipato di 10 minuti');}document.getElementById('nota-alert-overlay').classList.remove('active');}
function updateNotaClientiList(){var dl=document.getElementById('nota-clienti-list');if(!dl)return;var nomiClienti=new Set();movimenti.forEach(m=>{if(m.cliente)nomiClienti.add(m.cliente)});inventario.forEach(a=>{if(a.cliente)nomiClienti.add(a.cliente)});clientiPersonalizzati.forEach(c=>nomiClienti.add(c));note.forEach(n=>{if(n.cliente)nomiClienti.add(n.cliente)});dl.innerHTML=[...nomiClienti].map(c=>'<option value="'+c+'">').join('');}
function risolviNotaClienteModal(nome,idx){var profilo=getClienteProfilo(nome);if(!profilo.note||!profilo.note[idx])return;profilo.note[idx].risolta=true;saveData();renderClienti();showToast('Nota risolta');}
function risolviNotaCliente(nome,idx){risolviNotaClienteModal(nome,idx);}
function aggiungiNotaCliente(nome){var input=document.getElementById('nc-nuova-nota-input');if(!input)return;var testo=input.value.trim();if(!testo)return;var profilo=getClienteProfilo(nome);if(!profilo.note)profilo.note=[];profilo.note.push({testo,risolta:false,ts:new Date().toISOString()});if(!clientiProfili.find(c=>c.nome===nome))clientiProfili.push({nome,logo:'',note:profilo.note});else{var c=clientiProfili.find(c=>c.nome===nome);if(c)c.note=profilo.note;}input.value='';refreshClienteModal(nome);renderClienti();showToast('Nota aggiunta');saveData();}

// ============================================================
// ORDINI
// ============================================================
function switchOrdiniTab(tab){ordiniTab=tab;['attivi','storico','stralci'].forEach(t=>{var btn=document.getElementById('otab-'+t);if(btn){btn.style.background=t===tab?'#90cdf4':'transparent';btn.style.color=t===tab?'#111':'#c0c0c0';}});document.getElementById('ordini-attivi-container').style.display=tab==='attivi'?'block':'none';document.getElementById('ordini-storico-container').style.display=tab==='storico'?'block':'none';document.getElementById('ordini-stralci-container').style.display=tab==='stralci'?'block':'none';if(tab==='storico')renderStoricoOrdini();if(tab==='stralci')renderStralci();}
function updateStralciBadge(){var attivi=stralci.filter(s=>!s.chiuso);var badge=document.getElementById('stralci-badge');if(badge){badge.style.display=attivi.length>0?'inline-block':'none';badge.textContent=attivi.length;}}
function renderStralci(){var list=document.getElementById('stralci-list');if(!list)return;var attivi=stralci.filter(s=>!s.chiuso);if(attivi.length===0){list.innerHTML='<div style="text-align:center;padding:40px;color:#c0c0c0"><div style="font-size:36px;margin-bottom:12px">✅</div>Nessuno stralcio aperto.</div>';return;}list.innerHTML=attivi.map(s=>{var giorni=Math.floor((Date.now()-new Date(s.ts).getTime())/86400000);return'<div style="background:#313131;border:2px solid rgba(245,197,24,.7);border-radius:16px;padding:16px;margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div style="flex:1"><div style="font-size:14px;font-weight:800;color:#fff;margin-bottom:5px">'+s.desc+'</div><div style="font-size:12px;color:#c0c0c0;margin-bottom:6px">'+s.fornitore+'</div><div style="display:flex;gap:14px;flex-wrap:wrap"><div style="font-size:11px;color:#c0c0c0">Ordinati: <span style="color:#fff;font-weight:700">'+s.qtyOrdinata+'</span></div><div style="font-size:11px;color:#c0c0c0">Ricevuti: <span style="color:#3ecf6e;font-weight:700">'+s.qtyRicevuta+'</span></div><div style="font-size:11px;color:#c0c0c0">Attesi: <span style="color:#f5c518;font-weight:700">'+s.qtyStralcio+'</span></div></div></div><div style="text-align:center;flex-shrink:0"><div style="font-size:30px;font-weight:800;color:#f5c518;line-height:1">'+s.qtyStralcio+'</div></div></div><div style="display:flex;gap:8px;margin-top:14px;padding-top:12px;border-top:1.5px solid rgba(255,255,255,.65)"><button onclick="cancellaStralcio('+s.id+')" style="flex:1;padding:9px;border-radius:10px;font-size:12px;font-weight:700;background:#383838;color:#c0c0c0;border:1.5px solid rgba(255,255,255,.65);cursor:pointer">🗑 Annulla</button><button onclick="riceviStralcio('+s.id+')" style="flex:1;padding:9px;border-radius:10px;font-size:12px;font-weight:700;background:rgba(62,207,110,.9);color:#111;border:none;cursor:pointer">📥 Ricevuto</button></div></div>';}).join('');}
function creaStralcio(articoloId,code,desc,fornitore,udm,qtyOrdinata,qtyRicevuta){var qtyStralcio=qtyOrdinata-qtyRicevuta;if(qtyStralcio<=0)return;stralci.push({id:Date.now(),articoloId,code,desc,fornitore,udm,qtyOrdinata,qtyRicevuta,qtyStralcio,ts:new Date().toISOString(),chiuso:false});saveData();updateStralciBadge();showToast('⏳ Stralcio creato: '+qtyStralcio+' di '+desc);}
function riceviStralcio(id){var s=stralci.find(x=>x.id===id);if(!s)return;var art=inventario.find(a=>a.id===s.articoloId);if(art){art.qty+=s.qtyStralcio;movimenti.push({type:'entrata',code:s.code,desc:s.desc,qty:s.qtyStralcio,ts:new Date().toISOString(),fornitore:s.fornitore,udm:art.udm||'cartoni'});archivioMovimenti.push({type:'entrata',code:s.code,desc:s.desc,qty:s.qtyStralcio,ts:new Date().toISOString(),fornitore:s.fornitore,udm:art.udm||'cartoni'});}s.chiuso=true;saveData();updateStats();updateStralciBadge();renderStralci();showToast('✅ Stralcio chiuso');}
function cancellaStralcio(id){var s=stralci.find(x=>x.id===id);if(!s)return;s.chiuso=true;s.annullato=true;saveData();updateStralciBadge();renderStralci();showToast('Stralcio annullato');}
function renderStoricoOrdini(){var el=document.getElementById('ordini-storico-list');if(storicoOrdini.length===0){el.innerHTML='<div class="empty-state"><div class="empty-icon">🕘</div><p>Nessun ordine inviato ancora.</p></div>';return;}el.innerHTML=[...storicoOrdini].reverse().map(o=>{var d=new Date(o.dataInvio);return'<div style="background:#313131;border:2px solid rgba(255,255,255,.9);border-radius:16px;padding:16px;margin-bottom:12px"><div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:8px">🏭 '+o.fornitore+'</div><div style="font-size:12px;color:#c0c0c0;margin-bottom:10px">'+d.toLocaleDateString('it-IT')+' · '+o.articoli.length+' articoli · '+(o.consegnato?'<span style="color:#3ecf6e">✓ Consegnato</span>':'<span style="color:#f5c518">⏳ In attesa</span>')+'</div>'+o.articoli.map(a=>'<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #383838"><span style="color:#fff">'+a.desc+'</span><span style="color:#90cdf4;font-weight:700">'+(a.qtyDaOrdinare||'—')+' ct</span></div>').join('')+'</div>';}).join('');}

function aggiornaOrdiniAuto(){inventario.forEach(a=>{if(!a.fornitore||!a.preOrdine)return;if(a.qty<=a.preOrdine){if(!ordiniFornitore[a.fornitore])ordiniFornitore[a.fornitore]={articoli:[],stato:'aperto',esclusi:[]};var ordine=ordiniFornitore[a.fornitore];if(!ordine.esclusi)ordine.esclusi=[];if(ordine.esclusi.includes(a.id))return;if(!ordine.articoli.find(x=>x.id===a.id)){var target=(a.preOrdine||a.min||0)+5;ordine.articoli.push({id:a.id,code:a.code,desc:a.desc,qtyDaOrdinare:Math.max(1,target-a.qty),auto:true,note:''});}}});renderOrdini();showToast('Lista ordini aggiornata');}

function renderOrdini(){inventario.forEach(a=>{if(!a.fornitore||!a.preOrdine)return;if(a.qty<=a.preOrdine){if(!ordiniFornitore[a.fornitore])ordiniFornitore[a.fornitore]={articoli:[],stato:'aperto',esclusi:[]};var ordine=ordiniFornitore[a.fornitore];if(!ordine.esclusi)ordine.esclusi=[];if(ordine.esclusi.includes(a.id))return;if(!ordine.articoli.find(x=>x.id===a.id)){var target=(a.preOrdine||a.min||0)+5;ordine.articoli.push({id:a.id,code:a.code,desc:a.desc,qtyDaOrdinare:Math.max(1,target-a.qty),auto:true,note:''});}}});Object.values(ordiniFornitore).forEach(ordine=>{if(ordine.inviato)return;ordine.articoli.forEach(oa=>{if(!oa.auto)return;var art=inventario.find(a=>a.id===oa.id);if(!art)return;var target=(art.preOrdine||art.min||0)+5;oa.qtyDaOrdinare=Math.max(1,target-art.qty);});});var container=document.getElementById('ordini-panels');var fornKeys=Object.keys(ordiniFornitore).filter(f=>ordiniFornitore[f].articoli.length>0);if(fornKeys.length===0){container.innerHTML='<div class="empty-state"><div class="empty-icon">🛒</div><p>Nessun ordine da fare al momento.</p></div>';return;}container.innerHTML=fornKeys.map(forn=>{var ordine=ordiniFornitore[forn];var nArt=ordine.articoli.length;var fornObj=fornitori.find(f=>f.nome===forn);var rows=ordine.articoli.map((oa,i)=>{var art=inventario.find(a=>a.id===oa.id);var giacenza=art?art.qty:'—';var soglia=art?art.min:'—';return'<tr style="border-bottom:1.5px solid rgba(255,255,255,.65)"><td style="padding:12px;color:rgba(255,255,255,.5);font-size:12px">'+oa.code+'</td><td style="padding:12px;color:#fff;font-size:13px">'+oa.desc+' <span class="'+(oa.auto?'badge-auto':'badge-manuale')+'">'+(oa.auto?'AUTO':'MAN')+'</span></td><td style="padding:12px;text-align:center;font-size:20px;color:'+(art&&art.qty===0?'var(--danger)':art&&art.qty<=art.min?'var(--warn)':'#fff')+'">'+giacenza+'</td><td style="padding:12px;text-align:center"><input class="ordine-qty-input" type="number" min="1" value="'+oa.qtyDaOrdinare+'" onchange="updateQtyOrdine(\''+forn+'\','+i+',this.value)"></td><td style="padding:12px"><button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;color:var(--danger);border-color:var(--danger)" onclick="rimuoviDaOrdine(\''+forn+'\','+i+')">🗑</button></td></tr>';}).join('');return'<div class="ordine-panel" style="border-top:3px solid var(--accent)"><div style="padding:16px 18px 12px;background:var(--s2);display:flex;align-items:center;gap:12px">'+gpAvatarHtml(forn,'var(--accent)',36)+'<div style="flex:1"><div style="font-family:var(--fh);font-size:16px;font-weight:700;color:#fff">'+forn+'</div><div style="font-size:12px;color:var(--tx2);margin-top:2px">'+nArt+' articoli</div></div></div><div style="padding:12px 18px;border-bottom:1.5px solid rgba(255,255,255,.65);background:var(--s2);display:flex;align-items:center;gap:8px;flex-wrap:wrap"><button class="btn btn-secondary" style="font-size:12px" onclick="esportaEmailOrdine(\''+forn+'\')">✉️ Email</button><button class="btn btn-secondary" style="font-size:12px" onclick="stampaOrdine(\''+forn+'\')">🖨️ Stampa</button><button class=\"btn btn-danger\" style=\"font-size:12px\" onclick=\"eliminaOrdine(\''+forn+'\')\">🗑️ Elimina</button><label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-left:auto;padding:6px 12px;border-radius:8px;background:'+(ordine.inviato?'rgba(62,207,110,.12)':'var(--s3)')+';border:1.5px solid '+(ordine.inviato?'rgba(62,207,110,.4)':'#888')+'"><input type="checkbox" '+(ordine.inviato?'checked':'')+' onchange="toggleInviato(\''+forn+'\',this.checked)" style="accent-color:var(--green);width:16px;height:16px"><span style="font-size:12px;font-family:var(--fm);color:'+(ordine.inviato?'var(--green)':'var(--tx2)')+'">'+(ordine.inviato?'✅ Inviato':'Segna inviato')+'</span></label></div>'+(ordine.inviato?'<div style="padding:12px 18px;border-bottom:1.5px solid rgba(255,255,255,.65)"><button onclick="apriConsegna(\''+forn+'\')" style="width:100%;padding:11px;border-radius:10px;border:1px dashed var(--green);background:rgba(62,207,110,.06);color:var(--green);font-family:var(--fm);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">📬 Registra consegna</button></div>':'')+'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1.5px solid rgba(255,255,255,.65)"><th style="padding:10px 12px;font-size:12px;text-align:left;color:rgba(255,255,255,.6)">Codice</th><th style="padding:10px 12px;font-size:12px;text-align:left;color:rgba(255,255,255,.6)">Articolo</th><th style="padding:10px 12px;font-size:12px;text-align:center;color:rgba(255,255,255,.6)">Giac.</th><th style="padding:10px 12px;font-size:12px;text-align:center;color:rgba(255,255,255,.6)">Qtà ordine</th><th style="padding:10px 12px;width:40px"></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';}).join('');}
function eliminaOrdine(forn){if(!ordiniFornitore[forn])return;if(!confirm('Eliminare l\'intero ordine di '+forn+'?'))return;delete ordiniFornitore[forn];renderOrdini();saveData();showToast('Ordine '+forn+' eliminato');}
function updateQtyOrdine(forn,idx,val){if(ordiniFornitore[forn])ordiniFornitore[forn].articoli[idx].qtyDaOrdinare=val?parseInt(val):'';}
function rimuoviDaOrdine(forn,idx){if(ordiniFornitore[forn]){var art=ordiniFornitore[forn].articoli[idx];if(art){if(!ordiniFornitore[forn].esclusi)ordiniFornitore[forn].esclusi=[];ordiniFornitore[forn].esclusi.push(art.id);}ordiniFornitore[forn].articoli.splice(idx,1);renderOrdini();showToast('Articolo rimosso');}}
function toggleInviato(forn,checked){if(!ordiniFornitore[forn])return;ordiniFornitore[forn].inviato=checked;ordiniFornitore[forn].dataInvio=checked?new Date().toISOString():null;if(checked){storicoOrdini.unshift({id:Date.now(),fornitore:forn,dataInvio:new Date().toISOString(),articoli:JSON.parse(JSON.stringify(ordiniFornitore[forn].articoli))});showToast('\u2705 Ordine '+forn+' segnato come inviato');
    // Controlla se ci sono altri fornitori dimenticati
    setTimeout(function(){
      var criticiRimasti=getCritici();
      if(criticiRimasti.length>0){triggerAlerts(criticiRimasti);}
    },2000);
  }renderOrdini();saveData();}
function esportaEmailOrdine(forn){var ordine=ordiniFornitore[forn];if(!ordine)return;var fornObj=fornitori.find(f=>f.nome===forn);var emailTo=fornObj?.email||'';var oggi=new Date().toLocaleDateString('it-IT');var body='Gentili '+forn+',%0A%0AOrdine del '+oggi+':%0A%0A';ordine.articoli.forEach(oa=>{body+='-'+oa.desc+' ('+oa.code+'): '+oa.qtyDaOrdinare+' cartoni%0A';});body+='%0ACordiali saluti.';window.location.href='mailto:'+emailTo+'?subject=Ordine '+forn+' - '+oggi+'&body='+body;}
function stampaOrdine(forn){var ordine=ordiniFornitore[forn];if(!ordine||ordine.articoli.length===0)return;var oggi=new Date().toLocaleDateString('it-IT');var righe=ordine.articoli.map(oa=>'<tr><td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px">'+oa.code+'</td><td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px">'+oa.desc+'</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold">'+(oa.qtyDaOrdinare||'—')+'</td></tr>').join('');var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ordine '+forn+'</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#222}h1{font-size:22px}table{width:100%;border-collapse:collapse}th{background:#f5f5f5;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;border-bottom:2px solid #ddd}@media print{body{margin:20px}}</style></head><body><h1>Ordine a: '+forn+'</h1><div style="color:#666;font-size:13px;margin-bottom:30px">Data: '+oggi+'</div><table><thead><tr><th>Codice</th><th>Articolo</th><th>Qtà</th></tr></thead><tbody>'+righe+'</tbody></table></body></html>';var win=window.open('','_blank');if(win){win.document.write(html);win.document.close();
  win.onafterprint=function(){win.close();};
  // Add close button after load
  win.addEventListener('load',function(){
    var s=win.document.createElement('style');s.textContent='.close-print{position:fixed;top:10px;right:10px;width:40px;height:40px;border-radius:50%;background:#333;color:#fff;border:none;font-size:22px;cursor:pointer;z-index:9999;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)}@media print{.close-print{display:none!important}}';win.document.head.appendChild(s);
    var b=win.document.createElement('button');b.className='close-print';b.textContent='\u2715';b.onclick=function(){win.close();};win.document.body.prepend(b);
    win.print();
  });
}}
function apriConsegna(forn){var ordine=ordiniFornitore[forn];if(!ordine||ordine.articoli.length===0)return;consegnaFornCorrente=forn;document.getElementById('consegna-fornitore-label').textContent='🏭 '+forn;document.getElementById('consegna-items').innerHTML=ordine.articoli.map((oa,i)=>'<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1.5px solid rgba(255,255,255,.65)"><div style="flex:1"><div style="font-size:12px;font-weight:600">'+oa.desc+'</div><div style="font-size:12px;color:var(--tx2)">'+oa.code+'</div></div><div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div style="font-size:12px;color:var(--tx2)">Qtà arrivata</div><input type="number" min="0" value="'+(oa.qtyDaOrdinare||'')+'" id="consegna-qty-'+i+'" style="width:70px;padding:6px;text-align:center;background:var(--s2);border:1px solid var(--b2);border-radius:6px;color:var(--tx);font-family:var(--fm);font-size:13px;font-weight:700;outline:none"></div></div>').join('');document.getElementById('consegna-overlay').style.display='flex';}
function chiudiConsegna(){document.getElementById('consegna-overlay').style.display='none';consegnaFornCorrente=null;}
function confermaConsegna(){var forn=consegnaFornCorrente;if(!forn||!ordiniFornitore[forn])return;var ordine=ordiniFornitore[forn];var aggiornati=0;ordine.articoli.forEach((oa,i)=>{var input=document.getElementById('consegna-qty-'+i);var qtyRicevuta=parseInt(input?.value)||0;var qtyOrdinata=parseInt(oa.qtyDaOrdinare)||0;if(qtyRicevuta<=0)return;var art=inventario.find(a=>a.id===oa.id);if(art){art.qty+=qtyRicevuta;movimenti.unshift({type:'entrata',desc:art.desc,code:art.code,qty:qtyRicevuta,ts:new Date().toISOString(),note:'Da ordine '+forn,udm:art.udm||'cartoni'});archivioMovimenti.unshift({type:'entrata',desc:art.desc,code:art.code,qty:qtyRicevuta,ts:new Date().toISOString(),note:'Da ordine '+forn,udm:art.udm||'cartoni'});aggiornati++;if(qtyOrdinata>0&&qtyRicevuta<qtyOrdinata)creaStralcio(art.id,art.code,art.desc,forn,art.udm||'ct',qtyOrdinata,qtyRicevuta);}});if(aggiornati===0){showToast('Inserisci almeno una quantità');return;}var stEntry=storicoOrdini.find(s=>s.fornitore===forn&&!s.consegnato);if(stEntry){stEntry.consegnato=true;stEntry.dataConsegna=new Date().toISOString();}delete ordiniFornitore[forn];chiudiConsegna();renderOrdini();renderInventario();updateStats();updateStralciBadge();showToast('📬 Consegna registrata!');saveData();}
function setEmailFornitore(nome,email){var f=fornitori.find(x=>x.nome===nome);if(f)f.email=email;else fornitori.push({nome,email,logo:''});}
function openFornModal(forn,color){currentFornitoreEdit=forn;refreshFornModal(forn,color);document.getElementById('modal-fornitore').classList.add('active');}
function refreshFornModal(forn,color){var fornObj=fornitori.find(f=>f.nome===forn)||{nome:forn,email:'',logo:''};var initials=forn.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);document.getElementById('mf-title').textContent=forn;document.getElementById('mf-nome').value=forn;document.getElementById('mf-email').value=fornObj.email||'';var preview=document.getElementById('mf-avatar-preview');if(fornObj.logo){preview.innerHTML='<img src="'+fornObj.logo+'" style="width:100%;height:100%;object-fit:contain">';preview.style.background='transparent';preview.style.border='1.5px solid var(--b2)';document.getElementById('mf-remove-logo').style.display='inline-flex';}else{preview.innerHTML=initials;preview.className='gp-avatar';preview.style.cssText='width:72px;height:72px;font-size:26px;cursor:pointer;--av-color:'+(color||'var(--accent)');document.getElementById('mf-remove-logo').style.display='none';}}
function setLogoFornitore(nome,logoDataUrl){compressImage(logoDataUrl,200,0.7).then(function(compressed){var f=fornitori.find(x=>x.nome===nome);if(f)f.logo=compressed;else fornitori.push({nome,email:'',logo:compressed});if(currentFornitoreEdit===nome)refreshFornModal(nome);renderOrdini();renderFornitori();saveData();});}
function triggerLogoUpload(nome){var input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=e=>{var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=ev=>setLogoFornitore(nome,ev.target.result);reader.readAsDataURL(file);};input.click();}
function removeLogoFornitore(nome){var f=fornitori.find(x=>x.nome===nome);if(f)f.logo='';renderOrdini();renderFornitori();}

// ============================================================
// CONTEXT MENU
// ============================================================
function showArtMenu(e,id){e.stopPropagation();_artMenuId=id;var menu=document.getElementById('art-ctx-menu');menu.style.display='block';var x=e.clientX||100,y=e.clientY||100;if(x+200>window.innerWidth)x=window.innerWidth-210;if(y+110>window.innerHeight)y=y-120;menu.style.left=x+'px';menu.style.top=y+'px';setTimeout(()=>document.addEventListener('click',closeArtMenu,{once:true}),50);}
function closeArtMenu(){document.getElementById('art-ctx-menu').style.display='none';}
function artMenuModifica(){closeArtMenu();if(_artMenuId)quickEdit(_artMenuId);}
function artMenuElimina(){closeArtMenu();if(!_artMenuId)return;var art=inventario.find(a=>a.id===_artMenuId);if(!art)return;if(confirm('Eliminare "'+art.desc+'"?')){inventario=inventario.filter(a=>a.id!==_artMenuId);saveData();updateStats();renderInventario();if(typeof renderFornitori==='function')renderFornitori();if(typeof renderClienti==='function')renderClienti();showToast('Articolo eliminato');}}

// ============================================================
// PROFORMA
// ============================================================
function initProformaView(){var dl=document.getElementById('proforma-clienti-list');if(dl)dl.innerHTML=clientiPersonalizzati.map(c=>'<option value="'+c+'">').join('');}
async function elaboraProforma(){var testo=document.getElementById('proforma-input').value.trim();var cliente=document.getElementById('proforma-cliente').value.trim();if(!testo){showToast('Incolla prima il messaggio');return;}var btn=document.getElementById('proforma-btn');btn.disabled=true;btn.textContent='⏳ Elaboro...';var invStr=inventario.map(a=>'- '+a.code+': '+a.desc+' | disp: '+a.qty).join('\n');var prompt='Sei un sistema magazzino italiano. Il cliente "'+cliente+'" ha scritto:\n"'+testo+'"\n\nInventario:\n'+invStr+'\n\nEstrai articoli. Rispondi SOLO JSON:\n[{"code":"CODICE","desc":"Desc","qty":NUM,"stato":"ok"|"scarso"|"mancante"}]';try{var resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(localStorage.getItem('mag_apikey')||'')},body:JSON.stringify({model:'llama-3.3-70b-versatile',max_tokens:1000,messages:[{role:'user',content:prompt}]})});var data=await resp.json();var text=data.choices?.[0]?.message?.content||'';var items=JSON.parse(text.replace(/```json|```/g,'').trim());renderProforma(items,cliente);}catch(e){var demoItems=inventario.slice(0,4).map(a=>({code:a.code,desc:a.desc,qty:Math.floor(Math.random()*3)+1,stato:a.qty<5?'scarso':'ok'}));renderProforma(demoItems,cliente);showToast('⚠️ API non raggiungibile — mostro demo');}finally{btn.disabled=false;btn.textContent='✨ Genera Proforma';}}
function renderProforma(items,cliente){var oggi=new Date().toLocaleDateString('it-IT');document.getElementById('proforma-result').style.display='block';document.getElementById('proforma-banner').innerHTML='';document.getElementById('proforma-cliente-label').textContent=cliente?'Cliente: '+cliente:'';document.getElementById('proforma-data-label').textContent='Data: '+oggi;document.getElementById('proforma-tbody').innerHTML=items.map((it,i)=>{var inv=inventario.find(a=>a.code===it.code);var disp=inv?inv.qty:0;var badge='';if(it.stato==='mancante')badge='<span style="font-size:12px;background:var(--danger);color:#fff;padding:2px 7px;border-radius:10px">Non in magazzino</span>';else if(it.stato==='scarso')badge='<span style="font-size:12px;background:var(--warn);color:#2e2e2e;padding:2px 7px;border-radius:10px">Scorta bassa</span>';return'<tr><td style="padding:10px 12px;font-size:12px">'+it.code+'</td><td style="padding:10px 12px;font-size:13px">'+it.desc+'</td><td style="padding:10px 12px;text-align:center"><input type="number" value="'+it.qty+'" min="0" id="pqty-proforma-'+i+'" style="width:56px;padding:4px 8px;background:var(--s2);border:1px solid var(--b2);border-radius:6px;color:var(--tx);font-size:16px;text-align:center"></td><td style="padding:10px 12px;font-size:12px">'+(disp>0?disp+' disp.':'—')+'</td></tr>';}).join('');document.getElementById('proforma-items-json').value=JSON.stringify(items);}
function applicaUscitaProforma(){var clienteUscita=document.getElementById('proforma-cliente').value.trim();var tbody=document.getElementById('proforma-tbody');if(!tbody||tbody.innerHTML==='')return;var now=new Date().toISOString();var aggiornati=0;document.querySelectorAll('#proforma-tbody tr').forEach(function(tr,i){var tds=tr.querySelectorAll('td');var code=tds[0]?tds[0].textContent.trim():'';var qtyEl=document.getElementById('pqty-proforma-'+i);var qty=parseInt(qtyEl?qtyEl.value:'0')||0;if(qty<=0)return;var art=inventario.find(a=>a.code===code);if(!art)return;art.qty=Math.max(0,art.qty-qty);movimenti.push({type:'uscita',code:art.code,desc:art.desc,qty,ts:now,cliente:clienteUscita||'',fornitore:art.fornitore||'',udm:art.udm||'cartoni'});archivioMovimenti.push({type:'uscita',code:art.code,desc:art.desc,qty,ts:now,cliente:clienteUscita||'',fornitore:art.fornitore||'',udm:art.udm||'cartoni'});aggiornati++;});if(aggiornati===0){showToast('Nessuna quantità');return;}saveData();updateStats();checkAlertDopoUscita();showToast('✓ '+aggiornati+' articoli scaricati');document.getElementById('proforma-result').style.display='none';document.getElementById('proforma-input').value='';document.getElementById('proforma-cliente').value='';}
function stampaProforma(){var cliente=document.getElementById('proforma-cliente').value.trim()||'N/A';var oggi=new Date().toLocaleDateString('it-IT');var rows=[...document.querySelectorAll('#proforma-tbody tr')].map((tr,i)=>{var tds=tr.querySelectorAll('td');return'<tr><td style="padding:8px;border-bottom:1px solid #eee">'+(tds[0]?.textContent||'')+'</td><td style="padding:8px;border-bottom:1px solid #eee">'+(tds[1]?.textContent||'')+'</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;font-weight:bold">'+(document.getElementById('pqty-proforma-'+i)?.value||'')+'</td></tr>';}).join('');var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Proforma '+cliente+'</title><style>body{font-family:Arial,sans-serif;margin:40px}table{width:100%;border-collapse:collapse}th{background:#f5f5f5;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;border-bottom:2px solid #ddd}</style></head><body><h1>Proforma DDT - '+cliente+'</h1><div style="color:#666;font-size:12px;margin-bottom:24px">Data: '+oggi+'</div><table><thead><tr><th>Codice</th><th>Articolo</th><th>Qtà</th></tr></thead><tbody>'+rows+'</tbody></table></body></html>';var w=window.open('','_blank');if(w){w.document.write(html);w.document.close();
  w.onafterprint=function(){w.close();};
  w.addEventListener('load',function(){
    var s=w.document.createElement('style');s.textContent='.close-print{position:fixed;top:10px;right:10px;width:40px;height:40px;border-radius:50%;background:#333;color:#fff;border:none;font-size:22px;cursor:pointer;z-index:9999;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)}@media print{.close-print{display:none!important}}';w.document.head.appendChild(s);
    var b=w.document.createElement('button');b.className='close-print';b.textContent='\u2715';b.onclick=function(){w.close();};w.document.body.prepend(b);
    w.print();
  });
}}
function emailProforma(){var cliente=document.getElementById('proforma-cliente').value.trim()||'';var oggi=new Date().toLocaleDateString('it-IT');var righe='';document.querySelectorAll('#proforma-tbody tr').forEach((tr,i)=>{var tds=tr.querySelectorAll('td');righe+=(tds[0]?.textContent||'')+' - '+(tds[1]?.textContent||'')+': '+(document.getElementById('pqty-proforma-'+i)?.value||'')+'%0A';});window.location.href='mailto:?subject=Proforma DDT - '+(cliente||'Cliente')+' - '+oggi+'&body='+encodeURIComponent('Fornitura del '+oggi+':%0A%0A')+righe;}
function gestisciNotaProforma(id){var n=note.find(x=>x.id===id);if(n){n.completata=true;saveData();renderNote();updateNoteBadge();showToast('✓ Nota gestita');}}

// ============================================================
// REPORT
// ============================================================
function renderReportSuggestions(){var q=document.getElementById('report-search').value.trim().toLowerCase();var sug=document.getElementById('report-suggestions');if(q.length<1){sug.style.display='none';return;}var clienteMatches=[];var _nomiCli=new Set();movimenti.concat(archivioMovimenti).forEach(function(m){if(m.cliente&&m.cliente.toLowerCase().includes(q))_nomiCli.add(m.cliente)});clientiPersonalizzati.forEach(function(c){if(c.toLowerCase().includes(q))_nomiCli.add(c)});[..._nomiCli].slice(0,3).forEach(function(c){clienteMatches.push({id:0,code:'\u{1F464} '+c,desc:'Cronologia cliente',_isCliente:true,_cliNome:c})});var matches=[...clienteMatches,...inventario.filter(a=>a.code.toLowerCase().includes(q)||(a.codeForn&&a.codeForn.toLowerCase().includes(q))||a.desc.toLowerCase().includes(q))].slice(0,8);if(matches.length===0){sug.style.display='none';return;}sug.innerHTML=matches.map(a=>'<div onclick="selectReportArticleById('+(a._isCliente?'\'cli_'+a._cliNome+'\'':a.id)+')" style="padding:12px 16px;border-bottom:1px solid #333;cursor:pointer;transition:background .1s" onmouseenter="this.style.background=\'#383838\'" onmouseleave="this.style.background=\'transparent\'"><div style="font-size:12px;color:#c0c0c0">'+a.code+'</div><div style="font-size:14px;color:#fff">'+a.desc+'</div></div>').join('');sug.style.display='block';}
function selectReportArticle(){var q=document.getElementById('report-search').value.trim().toLowerCase();var match=inventario.find(a=>a.code.toLowerCase()===q||(a.codeForn&&a.codeForn.toLowerCase()===q));if(match)selectReportArticleById(match.id);}
function selectReportArticleById(id){if(typeof id==='string'&&id.startsWith('cli_')){renderReportCliente(id.substring(4));return;}reportArticolo=inventario.find(a=>a.id===id);document.getElementById('report-search').value=reportArticolo.code+' — '+reportArticolo.desc;document.getElementById('report-suggestions').style.display='none';document.getElementById('report-filters').style.display='flex';renderReport();}
function setReportFilter(f,btn){reportFilter=f;document.querySelectorAll('.report-filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.getElementById('report-custom-range').style.display=f==='custom'?'flex':'none';if(f!=='custom')renderReport();}
function getReportDateRange(){var now=new Date();var from;if(reportFilter==='3m'){from=new Date(now);from.setMonth(from.getMonth()-3);}else if(reportFilter==='6m'){from=new Date(now);from.setMonth(from.getMonth()-6);}else if(reportFilter==='12m'){from=new Date(now);from.setFullYear(from.getFullYear()-1);}else{var df=document.getElementById('report-date-from').value;var dt=document.getElementById('report-date-to').value;if(!df||!dt)return null;return{from:new Date(df),to:new Date(dt+'T23:59:59')};}return{from,to:now};}

function renderReportCliente(nome){
  document.getElementById('report-search').value='\u{1F464} '+nome;
  document.getElementById('report-suggestions').style.display='none';
  document.getElementById('report-filters').style.display='flex';
  reportArticolo={code:'CLI_'+nome,desc:nome};
  var el=document.getElementById('report-content');
  var range=getReportDateRange();if(!range){el.innerHTML='';return;}
  var allMov=archivioMovimenti.length>0?archivioMovimenti:movimenti;
  var movCli=allMov.filter(function(m){return m.cliente&&m.cliente.toLowerCase()===nome.toLowerCase()&&new Date(m.ts)>=range.from&&new Date(m.ts)<=range.to;});
  var uscite=movCli.filter(function(m){return m.type==='uscita'});
  var articoliMap={};uscite.forEach(function(m){if(!articoliMap[m.code])articoliMap[m.code]={desc:m.desc,totale:0,volte:0};articoliMap[m.code].totale+=m.qty;articoliMap[m.code].volte++;});
  var oggi=new Date().toLocaleDateString('it-IT');
  var html='<div style="border-bottom:1.5px solid rgba(255,255,255,.65);padding-bottom:22px;margin-bottom:28px"><div style="font-size:11px;letter-spacing:2px;color:#c0c0c0;text-transform:uppercase;margin-bottom:12px">Report cliente \u00b7 '+oggi+'</div><div style="font-size:26px;font-weight:700;color:#90cdf4;margin-bottom:8px">\u{1F464} '+nome+'</div></div>';
  html+=titolo('Riepilogo');html+=riga('Consegne totali',uscite.length+' movimenti');html+=riga('Pezzi consegnati',uscite.reduce(function(s,m){return s+m.qty},0)+'');if(uscite.length>0){uscite.sort(function(a,b){return new Date(b.ts)-new Date(a.ts)});html+=riga('Ultima consegna',new Date(uscite[0].ts).toLocaleDateString('it-IT'));}html+='</div>';
  html+=titolo('Articoli');var ak=Object.keys(articoliMap);if(ak.length===0)html+='<div style="padding:16px 0;color:#c0c0c0">Nessuna consegna.</div>';else{ak.sort(function(a,b){return articoliMap[b].totale-articoliMap[a].totale});ak.forEach(function(code){var d=articoliMap[code];html+=riga(d.desc,''+d.totale+' pz \u00b7 '+d.volte+' volte');});}html+='</div>';
  html+=titolo('Storico');movCli.slice().reverse().forEach(function(m){var d=new Date(m.ts);var isU=m.type==='uscita';html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1.5px solid rgba(255,255,255,.65)"><div><div style="font-size:15px;color:#c0c0c0">'+d.toLocaleDateString('it-IT')+' \u00b7 '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+'</div><div style="font-size:14px;color:#fff;margin-top:3px">'+m.desc+'</div></div><div style="text-align:right"><div style="font-size:18px;font-weight:700;color:'+(isU?'#f03e3e':'#3ecf6e')+'">'+(isU?'\u2212':'+')+m.qty+'</div></div></div>';});html+='</div>';
  el.innerHTML=html;
}

function renderReport(){if(!reportArticolo)return;var range=getReportDateRange();if(!range)return;var art=reportArticolo;var el=document.getElementById('report-content');var movFiltrati=(archivioMovimenti.length>0?archivioMovimenti:movimenti).filter(m=>{if(m.code!==art.code&&m.desc!==art.desc)return false;var ts=new Date(m.ts);return ts>=range.from&&ts<=range.to;});var uscite=movFiltrati.filter(m=>m.type==='uscita');var entrate=movFiltrati.filter(m=>m.type==='entrata');var totUscite=uscite.reduce((s,m)=>s+m.qty,0);var totEntrate=entrate.reduce((s,m)=>s+m.qty,0);var clientiMap={};uscite.forEach(m=>{var c=m.cliente||art.cliente||'(non specificato)';if(!clientiMap[c])clientiMap[c]={volte:0,totale:0};clientiMap[c].volte++;clientiMap[c].totale+=m.qty;});var oggi=new Date().toLocaleDateString('it-IT');var html='';
html+='<div style="border-bottom:1.5px solid rgba(255,255,255,.65);padding-bottom:22px;margin-bottom:28px"><div style="font-size:11px;letter-spacing:2px;color:#c0c0c0;text-transform:uppercase;margin-bottom:12px">Report articolo · '+oggi+'</div><div style="font-size:26px;font-weight:700;color:#90cdf4;margin-bottom:8px">'+art.code+'</div><div style="font-size:18px;color:#ddd;margin-bottom:12px">'+art.desc+'</div></div>';
html+=titolo('Situazione attuale');var qColor=art.qty===0?'#f03e3e':art.qty<=art.min?'#f5c518':'#3ecf6e';var udm=art.udm||'pz';html+=riga('Giacenza attuale','<span style="color:'+qColor+';font-weight:700">'+art.qty+' '+udm+'</span>');html+=riga('Soglia minima',art.min+' '+udm);html+=riga('Fornitore',art.fornitore||'—');html+='</div>';
html+=titolo('Riepilogo periodo');if(movFiltrati.length===0){html+='<div style="font-size:16px;color:#c0c0c0;padding:16px 0">Nessun movimento in questo periodo.</div>';}else{html+=riga('Totale uscite',totUscite+' '+udm+' ('+uscite.length+' mov)');html+=riga('Totale entrate',totEntrate+' '+udm+' ('+entrate.length+' carichi)');if(uscite.length>0)html+=riga('Media per consegna',Math.round(totUscite/uscite.length)+' '+udm);}html+='</div>';
html+=titolo('Venduto per cliente');var ck=Object.keys(clientiMap);if(ck.length===0){html+='<div style="font-size:16px;color:#c0c0c0;padding:16px 0">Nessuna uscita registrata.</div>';}else{ck.sort((a,b)=>clientiMap[b].totale-clientiMap[a].totale);ck.forEach(c=>{var d=clientiMap[c];html+=riga(c,d.totale+' '+udm+' · '+d.volte+' consegne');});}html+='</div>';
html+=titolo('Storico movimenti');if(movFiltrati.length===0){html+='<div style="font-size:16px;color:#c0c0c0;padding:16px 0">Nessun movimento.</div>';}else{movFiltrati.slice().reverse().forEach(m=>{var d=new Date(m.ts);var data=d.toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'});var ora=d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});var isU=m.type==='uscita';html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1.5px solid rgba(255,255,255,.65)"><div><div style="font-size:15px;color:#c0c0c0">'+data+' · '+ora+'</div>'+(m.cliente?'<div style="font-size:14px;color:#c0c0c0;margin-top:3px">'+m.cliente+'</div>':'')+'</div><div style="text-align:right"><div style="font-size:18px;font-weight:700;color:'+(isU?'#f03e3e':'#3ecf6e')+'">'+(isU?'−':'+')+m.qty+' '+udm+'</div><div style="font-size:11px;color:'+(isU?'#7a2020':'#1e5c3a')+';letter-spacing:1px;font-weight:600;margin-top:2px">'+(isU?'USCITA':'ENTRATA')+'</div></div></div>';});}html+='</div>';el.innerHTML=html;}
function titolo(t){return'<div style="margin-bottom:0;padding-top:4px"><div style="font-size:11px;letter-spacing:2px;color:#90cdf4;text-transform:uppercase;font-weight:700;margin-bottom:4px;padding-top:24px">'+t+'</div><div style="border-bottom:1.5px solid rgba(255,255,255,.65);margin-bottom:10px"></div>';}
function riga(label,val){return'<div style="display:flex;justify-content:space-between;align-items:baseline;padding:12px 0;border-bottom:1px solid #1a1a1a"><span style="font-size:16px;color:#c0c0c0">'+label+'</span><span style="font-size:16px;color:#f0f0f0;font-weight:600">'+val+'</span></div>';}
function stampaReport(){if(!reportArticolo)return;var el=document.getElementById('report-content');if(!el)return;var oggi=new Date().toLocaleDateString('it-IT');var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report '+reportArticolo.code+'</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#222;font-size:14px}@media print{body{margin:20px}}</style></head><body><h1>Report: '+reportArticolo.code+'</h1><div style="color:#666;margin-bottom:30px">'+reportArticolo.desc+' · Stampato il '+oggi+'</div>'+el.innerHTML.replace(/color:#90cdf4/g,'color:#111').replace(/color:#f03e3e/g,'color:#c00').replace(/color:#3ecf6e/g,'color:#080').replace(/background[^;"]*;/g,'')+'</body></html>';var win=window.open('','_blank');if(win){win.document.write(html);win.document.close();
  win.onafterprint=function(){win.close();};
  // Add close button after load
  win.addEventListener('load',function(){
    var s=win.document.createElement('style');s.textContent='.close-print{position:fixed;top:10px;right:10px;width:40px;height:40px;border-radius:50%;background:#333;color:#fff;border:none;font-size:22px;cursor:pointer;z-index:9999;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)}@media print{.close-print{display:none!important}}';win.document.head.appendChild(s);
    var b=win.document.createElement('button');b.className='close-print';b.textContent='\u2715';b.onclick=function(){win.close();};win.document.body.prepend(b);
    win.print();
  });
}}

// ============================================================
// GINO
// ============================================================
function getUdm(art){return(art&&art.udm)?art.udm:'cartoni';}
function buildGinoSystem(){
var critici=inventario.filter(a=>a.qty<=a.min);
var ordiniAttivi=Object.entries(ordiniFornitore).filter(([,o])=>o.articoli.length>0);
var ordiniInviati=ordiniAttivi.filter(([,o])=>o.inviato);
var noteAperte=note.filter(n=>!n.completata);
var oggi=new Date();var oggiStr=oggi.toLocaleDateString('it-IT');var oraStr=oggi.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});var isoNow=oggi.getFullYear()+'-'+String(oggi.getMonth()+1).padStart(2,'0')+'-'+String(oggi.getDate()).padStart(2,'0')+'T'+String(oggi.getHours()).padStart(2,'0')+':'+String(oggi.getMinutes()).padStart(2,'0');
var movOggi=movimenti.filter(m=>new Date(m.ts).toDateString()===oggi.toDateString());

return `Sei GINO, l'assistente vocale del magazzino. Sei sveglio, diretto, simpatico ma professionale. Parli SOLO italiano.
Oggi: ${oggiStr}, ore ${oraStr}. Timestamp attuale: ${isoNow}. Articoli: ${inventario.length}. Movimenti oggi: ${movOggi.length}.

IMPORTANTE ORARIO: L'ora ESATTA adesso è ${oraStr}. Se l'utente dice "tra X minuti" calcola partendo da ${isoNow}. Per i reminder usa sempre formato ISO (es. ${isoNow}).

SCORTE CRITICHE (${critici.length}): ${critici.length>0?critici.map(a=>a.desc+': '+a.qty+' '+(a.udm||'ct')+' (min:'+a.min+')').join('; '):'✓ Tutte OK'}
ORDINI ATTIVI: ${ordiniAttivi.length>0?ordiniAttivi.map(([f,o])=>f+' ('+o.articoli.length+' art'+(o.inviato?' — INVIATO':'')+')').join('; '):'Nessuno'}
NOTE APERTE (${noteAperte.length}): ${noteAperte.length>0?noteAperte.slice(0,5).map(n=>'"'+n.text.substring(0,50)+'"'+(n.cliente?' ['+n.cliente+']':'')).join('; '):'Nessuna'}
CLIENTI: ${clientiPersonalizzati.join(', ')||'Nessuno'}
FORNITORI: ${fornitori.map(f=>f.nome).join(', ')}

REGOLE:
- Rispondi SEMPRE in max 2-3 frasi brevi, sei vocale
- Usa l'unità di misura dell'articolo (cartoni, coppie, confezioni, pezzi)
- Se l'utente non specifica la quantità esatta, chiedi conferma
- Se l'utente chiede qualcosa di ambiguo, prova a capire dal contesto prima di chiedere
- Se un'azione è pericolosa (scarico grosso, eliminazione), chiedi conferma: rispondi con azione "conferma"
- Se l'utente dice "sì", "ok", "vai", "confermato" dopo una richiesta di conferma, esegui l'azione pendente

AZIONI DISPONIBILI — quando devi eseguire un'azione, rispondi SOLO con JSON (niente altro testo):
{"azione":"NOME","params":{...},"risposta":"testo da dire a voce"}

1. scarica_articolo — params: {articolo:"nome/codice", qty:numero, cliente:"nome"} — scala dal magazzino
2. carica_articolo — params: {articolo:"nome/codice", qty:numero, fornitore:"nome"} — aggiunge al magazzino
3. cerca_articolo — params: {query:"termine"} — cerca e dice giacenza
4. aggiungi_nota — params: {testo:"...", priorita:"alta|media|bassa", cliente:"nome", reminder:"ISO datetime o null"}
5. stato_magazzino — params: {} — riepilogo completo vocale
6. cosa_ordinare — params: {} — elenca articoli sotto soglia
7. stato_ordini — params: {} — elenca ordini attivi e inviati
8. segna_ordine_inviato — params: {fornitore:"nome"} — marca ordine come inviato
9. genera_proforma — params: {cliente:"nome", articoli:[{desc:"...",qty:N}]} — crea proforma DDT
10. report_articolo — params: {articolo:"nome/codice"} — movimenti e statistiche
11. note_cliente — params: {cliente:"nome"} — elenca note collegate a un cliente
12. naviga — params: {vista:"dashboard|inventario|entrata|uscita|ordini|note|proforma|report"} — cambia schermata
13. crea_articolo — params: {code:"...", desc:"...", qty:N, min:N, fornitore:"...", cat:"..."}
14. completa_nota — params: {testo_parziale:"..."} — segna come completata la nota che contiene quel testo
15. conferma — params: {azione_pendente:"JSON dell'azione da confermare"} — chiedi conferma prima di eseguire

Se è solo una domanda conversazionale, rispondi normalmente in testo senza JSON.
16. suggerisci_cliente — params: {cliente:"nome"} — analizza storico e suggerisci prodotti da proporre

Se non sei sicuro di quale articolo intende l'utente, elenca le opzioni e chiedi.`;}

function buildInventarioTesto(){
return 'INVENTARIO COMPLETO ('+inventario.length+' articoli):\n'+
inventario.map(function(a){
  return a.code+' | '+a.desc+' | qty:'+a.qty+' '+(a.udm||'ct')+' | min:'+a.min+' | forn:'+( a.fornitore||'-')+( a.cliente?' | cliente:'+a.cliente:'')+(a.qty<=a.min?' ⚠️':'');
}).join('\n');}
function ginoEseguiAzione(azione,params){
var now=new Date().toISOString();

if(azione==='aggiungi_nota'){
  var testo=params.testo||'';if(!testo)return'Specifica il testo della nota.';
  var reminder=params.reminder||null;
  var cliente=params.cliente||'';
  note.unshift({id:nextNotaId++,text:testo,priorita:params.priorita||'media',completata:false,ts:now,reminder:reminder,cliente:cliente});
  saveData();renderNote();updateNoteBadge();
  return'Nota aggiunta'+(cliente?' per '+cliente:'')+(reminder?', con promemoria':'')+'.';}

if(azione==='scarica_articolo'){
  var query=(params.articolo||'').toLowerCase();var qty=parseInt(params.qty)||0;var cliente=params.cliente||'';
  if(!query)return'Quale articolo devo scaricare?';
  var art=cercaArticolo(query);
  if(!art){
    var simili=inventario.filter(a=>a.desc.toLowerCase().indexOf(query.substring(0,Math.min(4,query.length)))!==-1).slice(0,3);
    if(simili.length>0)return'Non trovo esattamente "'+params.articolo+'". Intendevi: '+simili.map(a=>a.desc).join(', ')+'?';
    return'Non trovo "'+params.articolo+'" in magazzino.';}
  if(art.qty<=0)return art.desc+' è esaurito, zero in magazzino.';
  if(qty<=0)return'Quanti '+getUdm(art)+' di '+art.desc+' devo scaricare?';
  var qtyEff=Math.min(qty,art.qty);art.qty-=qtyEff;
  movimenti.push({type:'uscita',code:art.code,desc:art.desc,qty:qtyEff,ts:now,cliente:cliente||art.cliente||'',fornitore:art.fornitore||'',udm:art.udm||'cartoni'});
  archivioMovimenti.push({type:'uscita',code:art.code,desc:art.desc,qty:qtyEff,ts:now,cliente:cliente||art.cliente||'',fornitore:art.fornitore||'',udm:art.udm||'cartoni'});
  saveData();updateStats();checkAlertDopoUscita();refreshViste();
  var msg='Scaricati '+qtyEff+' '+getUdm(art)+' di '+art.desc+'.';
  if(art.qty<=art.min)msg+=' Attenzione, rimangono solo '+art.qty+'!';
  else msg+=' Rimangono '+art.qty+'.';
  return msg;}

if(azione==='carica_articolo'){
  var query=(params.articolo||'').toLowerCase();var qty=parseInt(params.qty)||0;var fornitore=params.fornitore||'';
  if(!query)return'Quale articolo devo caricare?';
  var art=cercaArticolo(query);
  if(!art)return'Non trovo "'+params.articolo+'" in magazzino.';
  if(qty<=0)return'Quanti '+getUdm(art)+' di '+art.desc+'?';
  art.qty+=qty;
  movimenti.push({type:'entrata',code:art.code,desc:art.desc,qty:qty,ts:now,fornitore:fornitore||art.fornitore||'',cliente:'',udm:art.udm||'cartoni'});
  archivioMovimenti.push({type:'entrata',code:art.code,desc:art.desc,qty:qty,ts:now,fornitore:fornitore||art.fornitore||'',cliente:'',udm:art.udm||'cartoni'});
  saveData();updateStats();refreshViste();
  return'Caricati '+qty+' '+getUdm(art)+' di '+art.desc+'. Totale ora: '+art.qty+'.';}

if(azione==='cerca_articolo'){
  var query=(params.query||'').toLowerCase();
  var trovati=cercaArticoliMultipli(query,6);
  if(trovati.length===0)return'Nessun articolo trovato per "'+params.query+'".';
  return trovati.slice(0,6).map(a=>a.desc+': '+a.qty+' '+getUdm(a)+(a.qty<=a.min?' ⚠️':'')).join('. ')+'.';}

if(azione==='stato_magazzino'){
  var critici=inventario.filter(a=>a.qty<=a.min);
  var totArt=inventario.length;var totQty=inventario.reduce((s,a)=>s+a.qty,0);
  var movOggi=movimenti.filter(m=>new Date(m.ts).toDateString()===new Date().toDateString());
  var ordAtt=Object.entries(ordiniFornitore).filter(([,o])=>o.inviato&&o.articoli.length>0);
  var r=totArt+' articoli, '+totQty+' pezzi totali. '+movOggi.length+' movimenti oggi.';
  if(critici.length>0)r+=' Attenzione: '+critici.length+' articoli critici: '+critici.slice(0,4).map(a=>a.desc).join(', ')+'.';
  else r+=' Tutte le scorte sono nella norma.';
  if(ordAtt.length>0)r+=' '+ordAtt.length+' ordini in attesa di consegna.';
  return r;}

if(azione==='cosa_ordinare'){
  var critici=inventario.filter(a=>a.qty<=a.min);
  var sottoPreOrdine=inventario.filter(a=>a.preOrdine&&a.qty<=a.preOrdine&&a.qty>a.min);
  if(critici.length===0&&sottoPreOrdine.length===0)return'Tutto a posto, nessun ordine urgente.';
  var r='';
  if(critici.length>0)r+='Urgenti: '+critici.map(a=>a.desc+' ('+a.qty+' '+getUdm(a)+')').join(', ')+'. ';
  if(sottoPreOrdine.length>0)r+='Sotto pre-ordine: '+sottoPreOrdine.map(a=>a.desc+' ('+a.qty+')').join(', ')+'.';
  return r;}

if(azione==='stato_ordini'){
  var ordini=Object.entries(ordiniFornitore).filter(([,o])=>o.articoli.length>0);
  if(ordini.length===0)return'Nessun ordine attivo al momento.';
  return ordini.map(([f,o])=>f+': '+o.articoli.length+' articoli'+(o.inviato?' — già inviato':' — da inviare')).join('. ')+'.';}

if(azione==='segna_ordine_inviato'){
  var forn=(params.fornitore||'').toLowerCase();
  var match=Object.keys(ordiniFornitore).find(f=>f.toLowerCase().indexOf(forn)!==-1);
  if(!match)return'Non trovo ordini per "'+params.fornitore+'".';
  if(ordiniFornitore[match].inviato)return'L\'ordine di '+match+' è già segnato come inviato.';
  ordiniFornitore[match].inviato=true;ordiniFornitore[match].dataInvio=now;
  storicoOrdini.unshift({id:Date.now(),fornitore:match,dataInvio:now,articoli:JSON.parse(JSON.stringify(ordiniFornitore[match].articoli))});
  saveData();renderOrdini();
  return'Ordine '+match+' segnato come inviato.';}

if(azione==='report_articolo'){
  var query=(params.articolo||'').toLowerCase();
  var art=inventario.find(a=>a.code.toLowerCase()===query||a.desc.toLowerCase().indexOf(query)!==-1);
  if(!art)return'Non trovo l\'articolo.';
  var movArt=(archivioMovimenti.length>0?archivioMovimenti:movimenti).filter(m=>m.code===art.code||m.desc===art.desc);
  var uscTot=movArt.filter(m=>m.type==='uscita').reduce((s,m)=>s+m.qty,0);
  var entTot=movArt.filter(m=>m.type==='entrata').reduce((s,m)=>s+m.qty,0);
  return art.desc+': giacenza '+art.qty+' '+getUdm(art)+', soglia '+art.min+'. Totale storico: '+entTot+' entrati, '+uscTot+' usciti. Fornitore: '+(art.fornitore||'non specificato')+'.';}

if(azione==='note_cliente'){
  var cliente=(params.cliente||'').toLowerCase();
  var noteC=note.filter(n=>!n.completata&&n.cliente&&n.cliente.toLowerCase().indexOf(cliente)!==-1);
  if(noteC.length===0)return'Nessuna nota aperta per questo cliente.';
  return noteC.map(n=>'"'+n.text.substring(0,60)+'"').join('. ')+'.';}

if(azione==='naviga'){
  var vista=params.vista||'dashboard';
  var visteValide=['dashboard','inventario','entrata','uscita','ordini','note','proforma','report','movimenti','parcoauto'];
  if(visteValide.indexOf(vista)===-1)return'Vista non valida. Disponibili: '+visteValide.join(', ');
  showView(vista);
  return'Aperta la sezione '+vista+'.';}

if(azione==='crea_articolo'){
  var code=params.code||'';var desc=params.desc||'';
  if(!code||!desc)return'Servono almeno codice e descrizione.';
  var fornitore=params.fornitore||'';var cat=params.cat||'Altro';
  var qty=parseInt(params.qty)||0;var min=parseInt(params.min)||5;
  if(fornitore&&!fornitori.find(f=>f.nome===fornitore))fornitori.push({nome:fornitore,email:'',logo:''});
  inventario.push({id:nextId++,code:code,codeForn:'',desc:desc,cat:cat,fornitore:fornitore,cliente:'',qty:qty,min:min,preOrdine:Math.round(min*1.3),ordinato:false,udm:'cartoni'});
  saveData();updateStats();popolaDatalistUscita();refreshViste();
  return'Articolo creato: '+desc+' con giacenza '+qty+'.';}

if(azione==='completa_nota'){
  var testo=(params.testo_parziale||'').toLowerCase();
  var n=note.find(x=>!x.completata&&x.text.toLowerCase().indexOf(testo)!==-1);
  if(!n)return'Non trovo una nota aperta con quel testo.';
  n.completata=true;saveData();renderNote();updateNoteBadge();
  return'Nota completata: "'+n.text.substring(0,50)+'".';}

if(azione==='suggerisci_cliente'){
  var cliente=(params.cliente||'').toLowerCase();
  var movCli=(archivioMovimenti.length>0?archivioMovimenti:movimenti).filter(function(m){return m.type==='uscita'&&m.cliente&&m.cliente.toLowerCase().indexOf(cliente)!==-1;});
  if(movCli.length===0)return'Non trovo consegne per questo cliente.';
  var codiciGiaConsegnati=new Set(movCli.map(function(m){return m.code;}));
  var categorieCli=new Set();movCli.forEach(function(m){var a=inventario.find(function(x){return x.code===m.code;});if(a&&a.cat)categorieCli.add(a.cat);});
  var suggeriti=inventario.filter(function(a){return !codiciGiaConsegnati.has(a.code)&&a.qty>0&&categorieCli.has(a.cat);});
  if(suggeriti.length===0)return'Il cliente ha gia provato tutti i prodotti nelle sue categorie.';
  return'Da proporre: '+suggeriti.slice(0,5).map(function(a){return a.desc+' ('+a.qty+' disp.)';}).join(', ')+'.';}

if(azione==='conferma'){
  ginoPendingAction=params.azione_pendente||null;
  return params.risposta||'Confermi?';}

return'Azione non riconosciuta: '+azione;}

var ginoPendingAction=null;

function toggleVoice(){
  ginoOpen=!ginoOpen;
  var panel=document.getElementById('gino-panel');
  if(panel)panel.classList.toggle('active',ginoOpen);
  var mini=document.getElementById('gino-mini');
  if(mini)mini.style.display='none';
  if(ginoOpen){
    ginoHistory=[];
    var critici=inventario.filter(a=>a.qty<=a.min);
    var noteUrgenti=note.filter(n=>!n.completata&&n.reminder&&new Date(n.reminder)<new Date());
    var benvenuto='Ciao! Sono GINO. ';
    if(critici.length>0)benvenuto+=critici.length+' scorte critiche. ';
    if(noteUrgenti.length>0)benvenuto+=noteUrgenti.length+' promemoria scaduti. ';
    if(critici.length===0&&noteUrgenti.length===0)benvenuto+='Magazzino tutto OK. ';
    benvenuto+='Dimmi cosa fare.';
    appendGinoMsg('assistant',benvenuto);
    ginoParla(benvenuto);
    var urlParams=new URLSearchParams(window.location.search);
    if(urlParams.get('listen')==='1'){
      setTimeout(function(){ginoContinuous=true;startGinoMic();},2500);
    }
  }else{stopGinoMic();ginoContinuous=false;}
}
function closeGino(){
  // Minimizza ma NON ferma la voce
  var panel=document.getElementById('gino-panel');
  if(panel)panel.classList.remove('active');
  // Mostra mini-bar
  var mini=document.getElementById('gino-mini');
  if(mini)mini.style.display='flex';
  // NON fermare mic se in ascolto continuo
  if(!ginoContinuous){ginoOpen=false;}
}
function openGinoFull(){
  var panel=document.getElementById('gino-panel');
  if(panel)panel.classList.add('active');
  var mini=document.getElementById('gino-mini');
  if(mini)mini.style.display='none';
  ginoOpen=true;
}
function appendGinoMsg(role,text){var chat=document.getElementById('gino-chat');if(!chat)return;var div=document.createElement('div');div.className='gino-msg gino-msg-'+role;div.textContent=text;chat.appendChild(div);chat.scrollTop=chat.scrollHeight;}
function toggleGinoMic(){if(ginoContinuous){ginoContinuous=false;stopGinoMic();showToast('Ascolto continuo disattivato');return;}if(ginoListening){stopGinoMic();return;}startGinoMic();}
function startGinoMic(){if(ginoListening)return;var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){showToast('Usa Safari su iPhone');return;}
if(window.speechSynthesis&&window.speechSynthesis.speaking)window.speechSynthesis.cancel();
ginoRecognition=new SR();ginoRecognition.lang='it-IT';ginoRecognition.continuous=false;ginoRecognition.interimResults=false;ginoRecognition.onstart=function(){ginoListening=true;var btn=document.getElementById('gino-mic-btn');var lbl=document.getElementById('gino-listening-label');if(btn){btn.style.background='#90cdf433';btn.style.border='2px solid #90cdf4';}if(lbl)lbl.style.display='block';};ginoRecognition.onresult=function(e){var transcript=e.results[0][0].transcript.trim();if(ginoContinuous&&['stop','fine','basta','fermati'].includes(transcript.toLowerCase())){ginoContinuous=false;stopGinoMic();appendGinoMsg('assistant','Ok, a dopo!');ginoParla('Ok, a dopo!');return;}document.getElementById('gino-input').value=transcript;stopGinoMic();sendGinoMsg();};ginoRecognition.onerror=function(e){stopGinoMic();if(e.error==='no-speech'&&ginoContinuous)setTimeout(()=>{if(ginoContinuous&&ginoOpen)startGinoMic();},500);};ginoRecognition.onend=function(){ginoListening=false;var btn=document.getElementById('gino-mic-btn');var lbl=document.getElementById('gino-listening-label');if(btn){btn.style.background=ginoContinuous?'#90cdf422':'#1a1a1a';btn.style.border=ginoContinuous?'2px solid #90cdf4':'1px solid #3a3a3a';}if(lbl)lbl.style.display=ginoContinuous?'block':'none';if(ginoContinuous&&ginoOpen)setTimeout(()=>{if(ginoContinuous)startGinoMic();},400);};ginoRecognition.start();}
function startGinoContinuous(){ginoContinuous=true;showToast('Ascolto continuo — dì STOP per fermare');startGinoMic();}
function stopGinoMic(){ginoListening=false;if(ginoRecognition)try{ginoRecognition.stop();}catch(e){}ginoRecognition=null;if(!ginoContinuous){var btn=document.getElementById('gino-mic-btn');var lbl=document.getElementById('gino-listening-label');if(btn){btn.style.background='#1a1a1a';btn.style.border='1px solid #3a3a3a';}if(lbl)lbl.style.display='none';}}
function ginoParla(testo){if(!window.speechSynthesis)return;window.speechSynthesis.cancel();function speak(t){var voci=window.speechSynthesis.getVoices();if(voci.length===0&&t<15){setTimeout(()=>speak(t+1),200);return;}var utterance=new SpeechSynthesisUtterance(testo);utterance.lang='it-IT';utterance.rate=0.92;utterance.pitch=0.88;var voce=null;var maleVoices=['luca','giorgio','andrea','google italiano','male','it-it-standard-c','it-it-wavenet-c'];for(var vi=0;vi<voci.length;vi++){var vnm=(voci[vi].name+' '+voci[vi].voiceURI).toLowerCase();for(var mn=0;mn<maleVoices.length;mn++){if(vnm.indexOf(maleVoices[mn])!==-1&&voci[vi].lang.startsWith('it')){voce=voci[vi];break;}}if(voce)break;}if(!voce){var femaleNames=['alice','elsa','federica','female','donna'];for(var vj=0;vj<voci.length;vj++){if(voci[vj].lang.startsWith('it')){var isFemale=false;var vnf=voci[vj].name.toLowerCase();for(var fn=0;fn<femaleNames.length;fn++){if(vnf.indexOf(femaleNames[fn])!==-1){isFemale=true;break;}}if(!isFemale){voce=voci[vj];break;}}}if(!voce)for(var vk=0;vk<voci.length;vk++){if(voci[vk].lang.startsWith('it')){voce=voci[vk];break;}}}if(voce)utterance.voice=voce;
var onEndFired=false;
function riavviaMic(){if(onEndFired)return;onEndFired=true;if(ginoContinuous&&ginoOpen){setTimeout(function(){window.speechSynthesis.cancel();setTimeout(function(){if(ginoContinuous&&ginoOpen&&!ginoListening)startGinoMic();},300);},200);}}
utterance.onend=riavviaMic;
var stimaDurata=Math.max(2000,testo.length*80+1000);
setTimeout(function(){if(!onEndFired)riavviaMic();},stimaDurata);
window.speechSynthesis.speak(utterance);}speak(0);}
async function sendGinoMsg(){
var inp=document.getElementById('gino-input');if(!inp)return;
var msg=inp.value.trim();if(!msg)return;inp.value='';
var apiKey=localStorage.getItem('mag_apikey');
if(!apiKey){appendGinoMsg('assistant','Chiave API mancante. Premi ⚙️ API nella barra in basso.');ginoParla('Serve la chiave API. Apri le impostazioni.');return;}
appendGinoMsg('user',msg);

var t=msg.toLowerCase();
if(ginoPendingAction&&(t==='sì'||t==='si'||t==='ok'||t==='vai'||t==='confermo'||t==='conferma'||t==='certo'||t==='fallo')){
  try{var pending=typeof ginoPendingAction==='string'?JSON.parse(ginoPendingAction):ginoPendingAction;
  var risultato=ginoEseguiAzione(pending.azione,pending.params||{});
  appendGinoMsg('assistant',risultato);ginoParla(risultato);
  ginoHistory.push({role:'user',content:msg});ginoHistory.push({role:'assistant',content:risultato});
  }catch(e){appendGinoMsg('assistant','Errore nella conferma.');ginoParla('Errore.');}
  ginoPendingAction=null;return;}
if(ginoPendingAction&&(t==='no'||t==='annulla'||t==='lascia stare'||t==='niente')){
  ginoPendingAction=null;var r='Ok, annullato.';appendGinoMsg('assistant',r);ginoParla(r);
  ginoHistory.push({role:'user',content:msg});ginoHistory.push({role:'assistant',content:r});return;}
ginoPendingAction=null;

var needContext=ginoHistory.length===0||ginoHistory.length%10===0;
var msgConContesto=needContext?buildInventarioTesto()+'\n\nRICHIESTA UTENTE: '+msg:msg;
ginoHistory.push({role:'user',content:msgConContesto});

var chat=document.getElementById('gino-chat');
var loadingDiv=document.createElement('div');
loadingDiv.className='gino-msg gino-msg-assistant';
loadingDiv.innerHTML='<span class="gino-typing">•••</span>';
if(chat){chat.appendChild(loadingDiv);chat.scrollTop=chat.scrollHeight;}

try{
  var resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
    body:JSON.stringify({
      model:'llama-3.3-70b-versatile',
      messages:[{role:'system',content:buildGinoSystem()}].concat(ginoHistory.slice(-12)),
      max_tokens:400,
      temperature:0.3
    })
  });
  var data=await resp.json();
  if(!resp.ok)throw new Error(data.error?data.error.message:'Errore '+resp.status);
  var rawReply=data.choices&&data.choices[0]?data.choices[0].message.content.trim():'';
  if(chat&&loadingDiv.parentNode)chat.removeChild(loadingDiv);

  var replyText=rawReply;
  try{
    var jsonStart=rawReply.indexOf('{');var jsonEnd=rawReply.lastIndexOf('}');
    if(jsonStart!==-1&&jsonEnd!==-1&&jsonEnd>jsonStart){
      var jsonStr=rawReply.substring(jsonStart,jsonEnd+1);
      var parsed=JSON.parse(jsonStr);
      if(parsed.azione){
        if(parsed.azione==='conferma'){
          ginoPendingAction=parsed.params?.azione_pendente||null;
          replyText=parsed.risposta||'Confermi?';
        }else{
          var risultato=ginoEseguiAzione(parsed.azione,parsed.params||{});
          replyText=parsed.risposta?(parsed.risposta+' '+risultato):risultato;
        }
      }
    }
  }catch(jsonErr){}

  appendGinoMsg('assistant',replyText);
  ginoHistory.push({role:'assistant',content:rawReply});
  ginoParla(replyText);
}catch(e){
  if(chat&&loadingDiv.parentNode)chat.removeChild(loadingDiv);
  var eMsg=e.message||'errore';
  var errMsg=eMsg.indexOf('401')!==-1?'Chiave API non valida. Controlla nelle impostazioni.':
             eMsg.indexOf('429')!==-1?'Troppe richieste, riprova tra qualche secondo.':
             'Errore: '+eMsg;
  appendGinoMsg('assistant',errMsg);ginoParla(errMsg);
}}
function ginoKeydown(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendGinoMsg();}}

// ============================================================
// SETTINGS
// ============================================================
function openSettings(){document.getElementById('settings-apikey').value=localStorage.getItem('mag_apikey')||'';
var si=document.getElementById('storage-info');
if(si){
  var sz=getStorageSizeFormatted();var pct=getStoragePercent();
  var nArt=inventario.length;var nMov=movimenti.length;var nArch=archivioMovimenti.length;
  var nLoghi=fornitori.filter(f=>f.logo).length+clientiProfili.filter(c=>c.logo).length;
  var nFotoCorsia=inventario.filter(a=>a.corsiaFoto).length;
  var barColor=pct>=80?'#f03e3e':pct>=60?'#f5c518':'#3ecf6e';
  si.innerHTML=
    '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-size:13px;color:#f0f0f0;font-weight:600">'+sz+' / 5 MB</span><span style="font-size:13px;color:'+barColor+';font-weight:700">'+pct+'%</span></div>'+
    '<div style="height:8px;background:#1a1a1a;border-radius:4px;overflow:hidden;margin-bottom:10px"><div style="height:100%;width:'+pct+'%;background:'+barColor+';border-radius:4px;transition:width .3s"></div></div>'+
    '<div style="font-size:12px;color:#888;line-height:1.8">📦 '+nArt+' articoli · 📋 '+nMov+' movimenti recenti<br>🗄️ '+nArch+' movimenti in archivio (report)<br>🖼️ '+(nLoghi+nFotoCorsia)+' immagini ('+(nLoghi)+' loghi + '+nFotoCorsia+' foto corsia)</div>'+
    (pct>=80?'<div style="margin-top:10px;padding:8px 12px;background:rgba(240,62,62,.1);border:1px solid rgba(240,62,62,.3);border-radius:8px;font-size:12px;color:#f03e3e">⚠️ Spazio quasi pieno! Esporta un backup e poi svuota i loghi.</div>':'');
}
document.getElementById('settings-panel').style.display='block';}
function closeSettings(){document.getElementById('settings-panel').style.display='none';}
async function saveSettings(){var key=document.getElementById('settings-apikey').value.trim();if(!key){showToast('Inserisci la chiave API');return;}showToast('Verifico la chiave...');try{var resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:'llama-3.3-70b-versatile',messages:[{role:'user',content:'Rispondi solo: OK'}],max_tokens:10})});var data=await resp.json();if(!resp.ok){showToast('❌ Chiave non valida');return;}localStorage.setItem('mag_apikey',key);closeSettings();showToast('✅ Chiave valida e salvata!');}catch(e){showToast('❌ Errore: '+e.message);}}

// ============================================================
// SAVE / LOAD
// ============================================================
function saveData(){try{localStorage.setItem('mag_inventario',JSON.stringify(inventario));localStorage.setItem('mag_movimenti',JSON.stringify(movimenti));localStorage.setItem('mag_ordiniFornitore',JSON.stringify(ordiniFornitore));localStorage.setItem('mag_storicoOrdini',JSON.stringify(storicoOrdini));localStorage.setItem('mag_stralci',JSON.stringify(stralci));localStorage.setItem('mag_archivio',JSON.stringify(archivioMovimenti));localStorage.setItem('mag_note',JSON.stringify(note));localStorage.setItem('mag_fornitori',JSON.stringify(fornitori));localStorage.setItem('mag_nextId',String(nextId));localStorage.setItem('mag_nextNotaId',String(nextNotaId));localStorage.setItem('mag_clientiPersonalizzati',JSON.stringify(clientiPersonalizzati));localStorage.setItem('mag_clientiProfili',JSON.stringify(clientiProfili));localStorage.setItem('mag_parcoAuto',JSON.stringify(parcoAuto));localStorage.setItem('mag_nextVeicoloId',String(nextVeicoloId));localStorage.setItem('mag_initialized','1');}catch(e){console.warn('saveData error',e);}}

function loadData(){try{if(!localStorage.getItem('mag_initialized'))return;var inv=localStorage.getItem('mag_inventario');if(inv)inventario=JSON.parse(inv);var mov=localStorage.getItem('mag_movimenti');if(mov)movimenti=JSON.parse(mov);var ord=localStorage.getItem('mag_ordiniFornitore');if(ord)ordiniFornitore=JSON.parse(ord);var stor=localStorage.getItem('mag_storicoOrdini');if(stor)storicoOrdini=JSON.parse(stor);var nt=localStorage.getItem('mag_note');if(nt)note=JSON.parse(nt);var nid=localStorage.getItem('mag_nextId');if(nid)nextId=parseInt(nid);var nnid=localStorage.getItem('mag_nextNotaId');if(nnid)nextNotaId=parseInt(nnid);var cp=localStorage.getItem('mag_clientiPersonalizzati');if(cp)clientiPersonalizzati=JSON.parse(cp);var cpro=localStorage.getItem('mag_clientiProfili');if(cpro)clientiProfili=JSON.parse(cpro);var strData=localStorage.getItem('mag_stralci');if(strData)stralci=JSON.parse(strData);var archData=localStorage.getItem('mag_archivio');if(archData)archivioMovimenti=JSON.parse(archData);var fornData=localStorage.getItem('mag_fornitori');if(fornData)fornitori=JSON.parse(fornData);var paData=localStorage.getItem('mag_parcoAuto');if(paData)parcoAuto=JSON.parse(paData);var nvId=localStorage.getItem('mag_nextVeicoloId');if(nvId)nextVeicoloId=parseInt(nvId);}catch(e){console.warn('loadData error',e);}}


// ============================================================
// PARCO AUTO
// ============================================================
function renderParcoAuto(){
  var container=document.getElementById('parco-auto-list');if(!container)return;
  if(parcoAuto.length===0){container.innerHTML='<div class="empty-state"><div class="empty-icon">\u{1F69B}</div><p>Nessun veicolo registrato.</p></div>';return;}
  var now=new Date();
  container.innerHTML=parcoAuto.map(function(v){
    var scadenze=(v.scadenze||[]).filter(function(s){return !s.completata;}).sort(function(a,b){return new Date(a.data)-new Date(b.data);});
    var urgenti=scadenze.filter(function(s){return Math.floor((new Date(s.data)-now)/86400000)<=30;});
    var manut=(v.manutenzioni||[]).slice(-3).reverse();
    return '<div class="group-panel"><div class="group-panel-header" onclick="togglePanel(\'veicolo-'+v.id+'\')"><div class="group-panel-title"><span class="gp-avatar" style="width:38px;height:38px;--av-color:var(--blue)">\u{1F69B}</span> '+escapeHtml(v.targa)+'</div><div class="group-panel-chips"><span class="gp-chip">'+escapeHtml(v.modello||'')+'</span>'+(urgenti.length>0?'<span class="gp-chip gp-chip-danger">\u26A0 '+urgenti.length+' scadenze</span>':'<span class="gp-chip gp-chip-ok">\u2713 OK</span>')+'<span class="gp-chip gp-chip-settings" onclick="event.stopPropagation();eliminaVeicolo('+v.id+')">\u{1F5D1}</span><span class="gp-chevron">\u203A</span></div></div><div class="group-panel-body" id="veicolo-'+v.id+'"><div style="padding:16px">'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px"><div style="font-size:12px;color:var(--tx2)">Modello: <span style="color:#fff">'+escapeHtml(v.modello||'\u2014')+'</span></div><div style="font-size:12px;color:var(--tx2)">Anno: <span style="color:#fff">'+(v.anno||'\u2014')+'</span></div></div>'+
    '<div style="font-family:var(--fh);font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px">\u{1F4C5} Scadenze</div>'+
    (scadenze.length===0?'<div style="font-size:12px;color:var(--tx2);margin-bottom:12px">Nessuna scadenza</div>':scadenze.map(function(s){var diff=Math.floor((new Date(s.data)-now)/86400000);var color=diff<=0?'var(--danger)':diff<=30?'var(--warn)':'var(--green)';var label=diff<=0?'SCADUTO':diff+' gg';return'<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:8px;margin-bottom:6px;background:var(--s1);border-left:3px solid '+color+'"><span style="font-size:12px;color:var(--tx)">'+escapeHtml(s.tipo)+'</span><span style="font-size:12px;font-weight:700;color:'+color+'">'+label+' \u2014 '+new Date(s.data).toLocaleDateString('it-IT')+'</span></div>';}).join(''))+
    '<div style="display:flex;gap:8px;margin:10px 0 16px"><input id="scad-tipo-'+v.id+'" placeholder="es. Bollo, Assicurazione..." style="flex:1;padding:8px;background:var(--s2);border:1px solid var(--b2);border-radius:6px;color:var(--tx);font-size:12px;font-family:var(--fm)"><input type="date" id="scad-data-'+v.id+'" style="padding:8px;background:var(--s2);border:1px solid var(--b2);border-radius:6px;color:var(--tx);font-size:12px"><button onclick="aggiungiScadenza('+v.id+')" class="btn btn-primary" style="font-size:12px;padding:8px 12px">+</button></div>'+
    '<div style="font-family:var(--fh);font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px">\u{1F527} Manutenzioni</div>'+
    (manut.length===0?'<div style="font-size:12px;color:var(--tx2);margin-bottom:12px">Nessuna</div>':manut.map(function(m){return'<div style="padding:8px 10px;border-radius:8px;margin-bottom:6px;background:var(--s1)"><div style="font-size:12px;color:var(--tx)">'+escapeHtml(m.desc)+'</div><div style="font-size:11px;color:var(--tx2);margin-top:2px">'+new Date(m.data).toLocaleDateString('it-IT')+'</div></div>';}).join(''))+
    '<div style="display:flex;gap:8px;margin-top:10px"><input id="man-desc-'+v.id+'" placeholder="es. Cambio gomme..." style="flex:1;padding:8px;background:var(--s2);border:1px solid var(--b2);border-radius:6px;color:var(--tx);font-size:12px;font-family:var(--fm)"><button onclick="aggiungiManutenzione('+v.id+')" class="btn btn-secondary" style="font-size:12px;padding:8px 12px">+ Manut.</button></div>'+
    '</div></div></div>';
  }).join('');
}
function aggiungiVeicolo(){var targa=(document.getElementById('new-veicolo-targa')||{}).value;if(!targa||!targa.trim()){showToast('Inserisci la targa');return;}targa=targa.trim();var modello=(document.getElementById('new-veicolo-modello')||{}).value||'';var anno=(document.getElementById('new-veicolo-anno')||{}).value||'';parcoAuto.push({id:nextVeicoloId++,targa:targa,modello:modello.trim(),anno:anno.trim(),scadenze:[],manutenzioni:[]});['new-veicolo-targa','new-veicolo-modello','new-veicolo-anno'].forEach(function(x){var e=document.getElementById(x);if(e)e.value='';});saveData();renderParcoAuto();showToast('Veicolo aggiunto: '+targa);}
function eliminaVeicolo(id){if(!confirm('Eliminare questo veicolo?'))return;parcoAuto=parcoAuto.filter(function(v){return v.id!==id;});saveData();renderParcoAuto();showToast('Veicolo eliminato');}
function aggiungiScadenza(vid){var tipo=(document.getElementById('scad-tipo-'+vid)||{}).value;var data=(document.getElementById('scad-data-'+vid)||{}).value;if(!tipo||!data){showToast('Inserisci tipo e data');return;}var v=parcoAuto.find(function(x){return x.id===vid;});if(!v)return;if(!v.scadenze)v.scadenze=[];v.scadenze.push({tipo:tipo.trim(),data:data,completata:false});saveData();renderParcoAuto();showToast('Scadenza aggiunta');var diffGg=Math.floor((new Date(data)-new Date())/86400000);if(diffGg>30){var alertDate=new Date(data);alertDate.setDate(alertDate.getDate()-30);note.unshift({id:nextNotaId++,text:'\u{1F69B} '+v.targa+': '+tipo.trim()+' scade il '+new Date(data).toLocaleDateString('it-IT'),reminder:alertDate.toISOString(),completata:false,ts:new Date().toISOString(),priorita:'media'});saveData();}}
function aggiungiManutenzione(vid){var desc=(document.getElementById('man-desc-'+vid)||{}).value;if(!desc||!desc.trim()){showToast('Inserisci descrizione');return;}var v=parcoAuto.find(function(x){return x.id===vid;});if(!v)return;if(!v.manutenzioni)v.manutenzioni=[];v.manutenzioni.push({desc:desc.trim(),data:new Date().toISOString()});document.getElementById('man-desc-'+vid).value='';saveData();renderParcoAuto();showToast('Manutenzione registrata');}
function checkScadenzeVeicoli(){var now=new Date();var avvisi=[];parcoAuto.forEach(function(v){(v.scadenze||[]).forEach(function(s){if(s.completata)return;var diff=Math.floor((new Date(s.data)-now)/86400000);if(diff<=30&&diff>=-7)avvisi.push(v.targa+': '+s.tipo+(diff<=0?' SCADUTO':' tra '+diff+' gg'));});});return avvisi;}

// ============================================================
// INIT
// ============================================================
loadData();
(function(){var limite=new Date();limite.setDate(limite.getDate()-60);movimenti=movimenti.filter(m=>new Date(m.ts)>=limite);})();
renderDashboard();
popolaDatalistUscita();
updateStralciBadge();
updateNoteBadge();
checkStorageWarning();
startReminderCheck();
setTimeout(checkMorningAlert,800);
setInterval(checkMorningAlert,4*60*60*1000);
if(window.location.search.indexOf('gino')!==-1)setTimeout(()=>toggleVoice(),1200);

// === SERVICE WORKER — PWA OFFLINE ===
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('./sw.js').then(function(reg){
      console.log('SW registrato:',reg.scope);
      setInterval(function(){reg.update();},3600000);
    }).catch(function(err){
      console.warn('SW registrazione fallita:',err);
    });
  });
}
