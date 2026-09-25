'use strict';
const $=id=>document.getElementById(id);
const map=L.map('map',{zoomControl:true,zoomSnap:0,zoomAnimation:true}).setView([55.1694,23.8813],7);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
 attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',maxZoom:19
}).addTo(map);
const markerIcon=L.divIcon({className:'',html:'<span class="position-marker"></span>',iconSize:[26,26],iconAnchor:[13,13]});
let watcher=null,last=null,pin=null,follow=true,alignment=null,alignmentLayer=null,stationLayer=null,nearestLine=null,xmlAlignments=null,xmlFileName='';
const stationGroup=()=>Number($('stationFormat').value);
function connectivity(){
 const c=navigator.connection;
 $('network').textContent=navigator.onLine?(c?.effectiveType?'Prisijungta · '+c.effectiveType:'Prisijungta'):'Nėra ryšio';
}
addEventListener('online',connectivity);addEventListener('offline',connectivity);
navigator.connection?.addEventListener?.('change',connectivity);connectivity();
window.AsisApplyNativeTelemetry=t=>{
 if(t.gps)$('gps').textContent=t.gps;
 if(t.network)$('network').textContent=t.network;
};
function stationVisibility(){
 if(!stationLayer)return;
 if(map.getZoom()>=14){if(!map.hasLayer(stationLayer))stationLayer.addTo(map)}
 else if(map.hasLayer(stationLayer))stationLayer.remove();
}
map.on('zoomend',stationVisibility);
map.on('dragstart',()=>{follow=false});
map.on('zoomstart',event=>{if(event.originalEvent)follow=false});
function showAlignment(points,name,startMetres){
 const line=KurAsAlignment.prepare(points);
 alignmentLayer?.remove();stationLayer?.remove();nearestLine?.remove();nearestLine=null;
 alignment={...line,startMetres,name};
 alignmentLayer=L.layerGroup().addTo(map);stationLayer=L.layerGroup();
 L.polyline(points,{color:'#ed3948',weight:3,opacity:.95}).addTo(alignmentLayer);
 const first=Math.ceil(startMetres/100)*100;
 for(let st=first,count=0;st<=startMetres+line.total&&count<250;st+=100,count++){
  const distance=st-startMetres,point=KurAsAlignment.at(line,distance);
  const before=KurAsAlignment.at(line,Math.max(0,distance-2));
  const after=KurAsAlignment.at(line,Math.min(line.total,distance+2));
  const north=(after[0]-before[0])*111132,east=(after[1]-before[1])*111320*Math.cos(point[0]*Math.PI/180);
  const bearing=Math.hypot(north,east);
  if(bearing>0){
   const dLat=east/bearing*5/111132,dLon=-north/bearing*5/(111320*Math.cos(point[0]*Math.PI/180));
   L.polyline([[point[0]-dLat,point[1]-dLon],[point[0]+dLat,point[1]+dLon]],{color:'#ed3948',weight:3,interactive:false}).addTo(stationLayer);
  }
  L.marker(point,{interactive:false,icon:L.divIcon({className:'station-label-icon',html:'<span class="station-label">PK '+KurAsAlignment.station(st,stationGroup())+'</span>',iconSize:[75,20],iconAnchor:[37,26]})}).addTo(stationLayer);
 }
 stationVisibility();$('clearAlignment').hidden=false;
 $('alignmentStatus').textContent=name+' · '+Math.round(line.total)+' m · piketai pažymėti kas 100 m.';
 if(last)updateAlignment(last.coords);
}
function updateAlignment(c){
 if(!alignment)return;
 const r=KurAsAlignment.nearest(alignment,[c.latitude,c.longitude]);if(!r)return;
 const station='PK '+KurAsAlignment.station(alignment.startMetres+r.metres,stationGroup());
 const distance=r.offset<15?r.offset.toFixed(2).replace('.',','):String(Math.round(r.offset));
 const side=r.offset<.005?'ašyje':r.side==='dešinėje'?'d':'k';
 const offset=distance+' m'+(side==='ašyje'?' (ašyje)':' ('+side+')');
 $('stationValue').textContent=station;$('offsetValue').textContent=offset;
 if(pin){const label=station+' · '+offset;
  if(pin.getTooltip())pin.setTooltipContent(label);
  else pin.bindTooltip(label,{permanent:true,direction:'auto',offset:[12,0],className:'alignment-pin-label',interactive:false});
 }
 if(!nearestLine)nearestLine=L.polyline([],{color:'#f7c85e',weight:2,dashArray:'5,5',interactive:false}).addTo(map);
 nearestLine.setLatLngs([[c.latitude,c.longitude],r.point]);
}
function useAlignment(points,name,startMetres){
 if(!Number.isFinite(startMetres)||startMetres<0||startMetres>1000000)throw Error('Pradinis piketas turi būti nuo 0 iki 1 000 000 m.');
 KurAsAlignment.prepare(points);
 $('stationStart').value=startMetres;showAlignment(points,name,startMetres);
 try{localStorage.setItem('asis-alignment',JSON.stringify({points,name,startMetres}))}
 catch{ $('alignmentStatus').textContent+=' Didelės ašies nepavyko išsaugoti: po programėlės paleidimo ją reikės įkelti iš naujo.' }
 map.fitBounds(L.latLngBounds(points),{padding:[35,35],maxZoom:17});follow=false;
}
$('alignmentFile').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{
  if(file.size>(/\.xml$/i.test(file.name)?20000000:1000000))throw Error('Failas per didelis: XML iki 20 MB, kiti iki 1 MB.');
  const parsed=KurAsAlignment.parse(await file.text(),file.name);
  if(parsed.alignments){
   xmlAlignments=parsed.alignments;xmlFileName=file.name;
   const choice=$('alignmentChoice');choice.replaceChildren();
   parsed.alignments.forEach((item,i)=>{const option=document.createElement('option');option.value=i;option.textContent=item.name+' · '+item.coords;choice.append(option)});
   $('alignmentChoiceLabel').hidden=parsed.alignments.length<2;
   const first=parsed.alignments[0];useAlignment(first.points,file.name+' · '+first.name,first.startMetres);
   if(parsed.warnings?.length)$('alignmentStatus').textContent+=' Praleistos ašys: '+parsed.warnings.join('; ');
  }else{xmlAlignments=null;$('alignmentChoiceLabel').hidden=true;useAlignment(parsed,file.name,Number($('stationStart').value))}
 }catch(e){$('alignmentStatus').textContent='Nepavyko įkelti ašies: '+e.message;event.target.value=''}
};
$('alignmentChoice').onchange=()=>{
 const a=xmlAlignments?.[Number($('alignmentChoice').value)];if(!a)return;
 try{useAlignment(a.points,xmlFileName+' · '+a.name,a.startMetres)}catch(e){$('alignmentStatus').textContent=e.message}
};
$('stationStart').onchange=()=>{if(alignment)try{useAlignment(alignment.points,alignment.name,Number($('stationStart').value))}catch(e){$('alignmentStatus').textContent=e.message}};
$('stationFormat').value=localStorage.getItem('asis-station-format')==='1000'?'1000':'100';
$('stationFormat').onchange=()=>{localStorage.setItem('asis-station-format',$('stationFormat').value);if(alignment)showAlignment(alignment.points,alignment.name,alignment.startMetres)};
$('clearAlignment').onclick=()=>{
 alignment=null;alignmentLayer?.remove();stationLayer?.remove();nearestLine?.remove();alignmentLayer=stationLayer=nearestLine=null;
 pin?.unbindTooltip();xmlAlignments=null;$('alignmentChoiceLabel').hidden=true;$('alignmentFile').value='';
 $('clearAlignment').hidden=true;$('stationValue').textContent='Įkelk ašį';$('offsetValue').textContent='–';
 $('alignmentStatus').textContent='Ašis pašalinta. Gali įkelti kitą failą.';localStorage.removeItem('asis-alignment');
};
try{const saved=JSON.parse(localStorage.getItem('asis-alignment'));if(saved?.points){$('stationStart').value=saved.startMetres;showAlignment(saved.points,saved.name,saved.startMetres)}}
catch{localStorage.removeItem('asis-alignment')}
function ageLabel(seconds){if(seconds<60)return seconds+' s';if(seconds<3600)return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');return Math.floor(seconds/3600)+':'+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
setInterval(()=>{if(last){const age=Math.max(0,Math.floor((Date.now()-last.timestamp)/1000));$('updated').textContent='Matavimas '+new Date(last.timestamp).toLocaleTimeString('lt-LT')+' · prieš '+ageLabel(age);if(age>30)$('live').textContent='Duomenys neatnaujinami'}},1000);
function onPosition(p){
 if(last&&p.timestamp<last.timestamp)return;
 last=p;const c=p.coords,point=[c.latitude,c.longitude];
 $('coords').textContent=c.latitude.toFixed(6)+', '+c.longitude.toFixed(6);
 $('accuracy').textContent=Number.isFinite(c.accuracy)?'Apie ±'+Math.round(c.accuracy)+' m':'Nėra duomenų';
 $('live').textContent='Vieta atnaujinama';$('status').textContent='Rodoma naujausia telefono pateikta vieta.';
 if(!pin)pin=L.marker(point,{icon:markerIcon}).addTo(map);else pin.setLatLng(point);
 updateAlignment(c);
 if(follow)map.setView(point,map.getZoom()<14?17:map.getZoom(),{animate:true});
}
$('centerMap').onclick=()=>{follow=true;if(last)map.setView([last.coords.latitude,last.coords.longitude],17,{animate:true});else $('status').textContent='Laukiama vietos duomenų.'};
$('start').onclick=()=>{
 if(!navigator.geolocation){$('status').textContent='Šiame įrenginyje vietos nustatymas neprieinamas.';return}
 if(watcher!==null)return;
 $('status').textContent='Ieškoma vietos…';
 watcher=navigator.geolocation.watchPosition(onPosition,e=>{
  $('status').textContent=e.code===1?'Suteik vietos leidimą programėlei.':'Nepavyko nustatyti vietos: '+e.message;
  if(e.code===1){navigator.geolocation.clearWatch(watcher);watcher=null;$('stop').disabled=true;$('start').disabled=false}
 },{enableHighAccuracy:true,maximumAge:1000,timeout:20000});
 $('start').disabled=true;$('stop').disabled=false;
};
$('stop').onclick=()=>{if(watcher!==null)navigator.geolocation.clearWatch(watcher);watcher=null;$('start').disabled=false;$('stop').disabled=true;$('live').textContent='Vieta sustabdyta';$('status').textContent='Vietos stebėjimas sustabdytas.'};
