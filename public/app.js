'use strict';
const $=id=>document.getElementById(id);
const map=L.map('map',{zoomControl:true,zoomSnap:0,zoomAnimation:true}).setView([55.1694,23.8813],7);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
 attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',maxZoom:19
}).addTo(map);
const markerIcon=L.divIcon({className:'',html:'<span class="position-marker"></span>',iconSize:[26,26],iconAnchor:[13,13]});
const targetIcon=L.divIcon({className:'target-marker-icon',html:'<span class="target-marker"></span>',iconSize:[26,26],iconAnchor:[13,13]});
let watcher=null,last=null,pin=null,follow=true,alignment=null,alignmentLayer=null,stationLayer=null,nearestLine=null,xmlAlignments=null,xmlFileName='';
let target=null,targetMarker=null,targetLine=null,targetFitOnFirstFix=false;
let surveyPoints=[],surveyLayer=null,selectedSurveyIndex=-1,surveyLine=null,surveyMarkers=[],surveyPopupDistance=null;
const surveyStyle={radius:6,color:'#101216',weight:2,fillColor:'#f7c85e',fillOpacity:1};
const selectedSurveyStyle={radius:8,color:'#101216',weight:2,fillColor:'#fff',fillOpacity:1};
function updateSurveyLabels(){
 const show=map.getZoom()>=17,bounds=show?map.getBounds().pad(.15):null;
 surveyMarkers.forEach((marker,i)=>{
  if(show&&bounds.contains(marker.getLatLng())){
   if(!marker.getTooltip()){
    const label=document.createElement('span');label.textContent=String(surveyPoints[i].id);
    marker.bindTooltip(label,{permanent:true,direction:'right',offset:[9,0],className:'survey-point-label',interactive:false}).openTooltip();
   }
  }else if(marker.getTooltip())marker.unbindTooltip();
 });
}
map.on('zoomend moveend',updateSurveyLabels);
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
map.on('dragstart',()=>{follow=false;targetFitOnFirstFix=false});
map.on('zoomstart',event=>{if(event.originalEvent){follow=false;targetFitOnFirstFix=false}});
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
function alignmentDetails(c){
 if(!alignment)return;
 const r=KurAsAlignment.nearest(alignment,[c.latitude,c.longitude]);if(!r)return;
 const station='PK '+KurAsAlignment.station(alignment.startMetres+r.metres,stationGroup());
 const distance=r.offset<15?r.offset.toFixed(2).replace('.',','):String(Math.round(r.offset));
 const side=r.offset<.005?'ašyje':r.side==='dešinėje'?'d':'k';
 const offset=distance+' m'+(side==='ašyje'?' (ašyje)':' ('+side+')');
 return {station,offset,point:r.point};
}
function updateAlignment(c){
 const details=alignmentDetails(c);if(!details)return;
 const {station,offset,point}=details;
 $('stationValue').textContent=station;$('offsetValue').textContent=offset;
 if(pin){const label=station+' · '+offset;
  if(pin.getTooltip())pin.setTooltipContent(label);
  else pin.bindTooltip(label,{permanent:true,direction:'auto',offset:[12,0],className:'alignment-pin-label',interactive:false});
 }
 if(!nearestLine)nearestLine=L.polyline([],{color:'#f7c85e',weight:2,dashArray:'5,5',interactive:false}).addTo(map);
 nearestLine.setLatLngs([[c.latitude,c.longitude],point]);
}
function useAlignment(points,name,startMetres){
 if(!Number.isFinite(startMetres)||Math.abs(startMetres)>1000000)throw Error('Pradinis piketas turi būti nuo −1 000 000 iki 1 000 000 m.');
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
function parseLksNumber(value){
 const clean=value.trim().replace(/\s/g,'').replace(',','.');
 return /^\d+(?:\.\d+)?$/.test(clean)?Number(clean):NaN;
}
function updateTarget(c){
 if(!target)return;
 if(!c){$('targetDistance').textContent='Laukiama vietos';$('targetBearing').textContent='–';return}
 targetLine.setLatLngs([[c.latitude,c.longitude],[target.latitude,target.longitude]]);
 if(c.latitude<53.89||c.latitude>56.45||c.longitude<19.02||c.longitude>26.82){
  $('targetDistance').textContent='Už LKS94 srities';$('targetBearing').textContent='–';return;
 }
 const [north,east]=KurAsAlignment.toLks94(c.latitude,c.longitude);
 const deltaNorth=target.x-north,deltaEast=target.y-east,distance=Math.hypot(deltaNorth,deltaEast);
 $('targetDistance').textContent=distance>=1000?(distance/1000).toFixed(2).replace('.',',')+' km':distance.toFixed(1).replace('.',',')+' m';
 if(distance<1){$('targetBearing').textContent='Taškas ties tavo vieta';return}
 const degrees=(Math.atan2(deltaEast,deltaNorth)*180/Math.PI+360)%360;
 const directions=['Š','ŠR','R','PR','P','PV','V','ŠV'];
 $('targetBearing').textContent=degrees.toFixed(0)+'° ('+directions[Math.round(degrees/45)%8]+')';
}
function showTarget(x,y,save=true){
 if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Įvesk skaitines X ir Y koordinates.');
 const [latitude,longitude]=KurAsAlignment.lks94(x,y);
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<53.89||latitude>56.45||longitude<19.02||longitude>26.82)
  throw Error('Taškas nepatenka į LKS94 taikymo sritį Lietuvoje. Patikrink X ir Y eiliškumą.');
 target={x,y,latitude,longitude};
 const point=[latitude,longitude];
 if(!targetMarker)targetMarker=L.marker(point,{icon:targetIcon}).addTo(map).bindTooltip('Tikslas',{permanent:true,direction:'top',offset:[0,-12]});
 else targetMarker.setLatLng(point);
 if(!targetLine)targetLine=L.polyline([],{color:'#72d7ff',weight:3,dashArray:'7,6',interactive:false}).addTo(map);
 $('targetX').value=String(x);$('targetY').value=String(y);$('clearTarget').hidden=false;
 $('targetStatus').textContent=last?'Taškas žemėlapyje. Atstumas skaičiuojamas nuo telefono vietos.':'Taškas žemėlapyje. Laukiama telefono vietos matavimo.';
 updateTarget(last?.coords);
 if(last){map.fitBounds(L.latLngBounds([[last.coords.latitude,last.coords.longitude],point]),{padding:[45,45],maxZoom:17});follow=false}
 else{map.setView(point,16);targetFitOnFirstFix=true}
 if(save)try{localStorage.setItem('asis-target',JSON.stringify({x,y}))}
 catch{$('targetStatus').textContent+=' Nepavyko išsaugoti taško šiame įrenginyje.'}
}
$('targetForm').onsubmit=event=>{
 event.preventDefault();
 try{showTarget(parseLksNumber($('targetX').value),parseLksNumber($('targetY').value))}
 catch(error){$('targetStatus').textContent=error.message}
};
$('clearTarget').onclick=()=>{
 target=null;targetFitOnFirstFix=false;targetMarker?.remove();targetLine?.remove();targetMarker=targetLine=null;
 $('targetX').value='';$('targetY').value='';$('clearTarget').hidden=true;
 $('targetDistance').textContent='–';$('targetBearing').textContent='–';
 $('targetStatus').textContent='Taškas pašalintas. Gali įvesti kitą.';
 localStorage.removeItem('asis-target');
};
function showSurveyPoints(points,name,skipped=0,save=true){
 // Build the replacement layer before removing the current points.
 const layer=L.layerGroup(),markers=[];
 points.forEach((p,i)=>{
  const marker=L.circleMarker([p.latitude,p.longitude],surveyStyle);
  marker.on('click',()=>selectSurveyPoint(i));marker.addTo(layer);markers.push(marker);
 });
 surveyLayer?.remove();surveyLine?.remove();surveyLine=null;
 surveyPoints=points;surveyLayer=layer.addTo(map);surveyMarkers=markers;selectedSurveyIndex=-1;surveyPopupDistance=null;
 $('selectedPoint').hidden=true;$('clearPoints').hidden=false;
 $('pointsStatus').textContent=name+' · '+points.length+' taškų'+(skipped?' · praleista netinkamų eilučių: '+skipped:'')+'. Paspausk tašką žemėlapyje.';
 map.fitBounds(L.latLngBounds(points.map(p=>[p.latitude,p.longitude])),{padding:[35,35],maxZoom:17});follow=false;
 updateSurveyLabels();
 if(save)try{localStorage.setItem('asis-points',JSON.stringify({points,name,skipped}))}
 catch{$('pointsStatus').textContent+=' Nepavyko išsaugoti taškų; kitą kartą failą reikės įkelti iš naujo.'}
}
function updateSurveyDistance(c){
 const p=surveyPoints[selectedSurveyIndex];if(!p)return;
 const setDistance=value=>{$('selectedPointDistance').textContent=value;if(surveyPopupDistance)surveyPopupDistance.textContent=value};
 if(!c){setDistance('Laukiama vietos');return}
 if(c.latitude<53.89||c.latitude>56.45||c.longitude<19.02||c.longitude>26.82){setDistance('Už LKS94 srities');return}
 const [x,y]=KurAsAlignment.toLks94(c.latitude,c.longitude),d=Math.hypot(p.x-x,p.y-y);
 setDistance(d>=1000?(d/1000).toFixed(2).replace('.',',')+' km':d.toFixed(1).replace('.',',')+' m');
 if(!surveyLine)surveyLine=L.polyline([],{color:'#f7c85e',weight:2,dashArray:'6,5',interactive:false}).addTo(map);
 surveyLine.setLatLngs([[c.latitude,c.longitude],[p.latitude,p.longitude]]);
}
function selectSurveyPoint(i){
 const p=surveyPoints[i];if(!p)return;
 if(selectedSurveyIndex>=0)surveyMarkers[selectedSurveyIndex]?.setStyle(surveyStyle);
 selectedSurveyIndex=i;surveyMarkers[i].setStyle(selectedSurveyStyle);
 $('selectedPoint').hidden=false;$('selectedPointName').textContent='Taškas '+p.id+(p.name?' · '+p.name:'');
 $('selectedPointCoords').textContent='X '+p.x.toFixed(3)+' · Y '+p.y.toFixed(3)+' · H '+p.z.toFixed(3)+' m';
 const popup=document.createElement('div'),title=document.createElement('strong'),distance=document.createElement('div');
 title.textContent='Taškas '+p.id+(p.name?' · '+p.name:'');
 distance.className='survey-popup-distance';popup.append(title,distance);surveyPopupDistance=distance;
 surveyMarkers[i].bindPopup(popup,{autoPan:true}).openPopup();
 updateSurveyDistance(last?.coords);
 if(!last&&!$('start').disabled)$('start').click();
}
$('pointsFile').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{
  if(file.size>2000000)throw Error('Failas per didelis (iki 2 MB).');
  const {points,skipped}=AsisPoints.parse(await file.text(),file.name);
  showSurveyPoints(points,file.name,skipped);
 }catch(error){$('pointsStatus').textContent='Nepavyko įkelti taškų: '+error.message}
 event.target.value='';
};
$('clearPoints').onclick=()=>{
 surveyLayer?.remove();surveyLine?.remove();surveyLayer=surveyLine=null;
 surveyMarkers=[];surveyPoints=[];selectedSurveyIndex=-1;surveyPopupDistance=null;
 $('selectedPoint').hidden=true;$('clearPoints').hidden=true;
 $('pointsStatus').textContent='Taškai pašalinti. Gali įkelti kitą failą.';
 localStorage.removeItem('asis-points');
};
try{const saved=JSON.parse(localStorage.getItem('asis-alignment'));if(saved?.points){$('stationStart').value=saved.startMetres;showAlignment(saved.points,saved.name,saved.startMetres)}}
catch{localStorage.removeItem('asis-alignment')}
try{const saved=JSON.parse(localStorage.getItem('asis-target'));if(saved)showTarget(Number(saved.x),Number(saved.y),false)}
catch{localStorage.removeItem('asis-target')}
try{const saved=JSON.parse(localStorage.getItem('asis-points'));if(saved?.points?.length)showSurveyPoints(saved.points,saved.name,saved.skipped,false)}
catch{localStorage.removeItem('asis-points')}
function ageLabel(seconds){if(seconds<60)return seconds+' s';if(seconds<3600)return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');return Math.floor(seconds/3600)+':'+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
setInterval(()=>{if(last){const age=Math.max(0,Math.floor((Date.now()-last.timestamp)/1000));$('updated').textContent='Matavimas '+new Date(last.timestamp).toLocaleTimeString('lt-LT')+' · prieš '+ageLabel(age);if(age>30)$('live').textContent='Duomenys neatnaujinami'}},1000);
function lksText(c){
 if(c.latitude<53.89||c.latitude>56.45||c.longitude<19.02||c.longitude>26.82)return 'Už LKS94 taikymo srities';
 const [north,east]=KurAsAlignment.toLks94(c.latitude,c.longitude);
 return 'X '+north.toFixed(2)+' m · Y '+east.toFixed(2)+' m';
}
function shareText(p){
 const c=p.coords;
 const lines=['Ašis · vietos koordinatės',
  'Matavimas: '+new Date(p.timestamp).toLocaleString('lt-LT'),
  'WGS84: '+c.latitude.toFixed(6)+', '+c.longitude.toFixed(6),
  'LKS94 (EPSG:3346): '+lksText(c)];
 const details=alignmentDetails(c);
 if(details)lines.push('Piketažas: '+details.station,'Atstumas iki ašies: '+details.offset);
 return lines.join('\n');
}
$('share').onclick=async()=>{
 if(!last)return;
 const content=shareText(last);
 $('sharePreview').hidden=true;
 if(window.AsisNativeShare){
  window.AsisNativeShare.send(content);
  $('shareStatus').textContent='Pasirink, kur siųsti koordinates.';
  return;
 }
 if(navigator.share){
  try{await navigator.share({title:'Ašis · vietos koordinatės',text:content});$('shareStatus').textContent='Vietos tekstas perduotas bendrinimui.';return}
  catch(error){if(error.name==='AbortError')return}
 }
 try{await navigator.clipboard.writeText(content);$('shareStatus').textContent='Koordinatės nukopijuotos. Įklijuok jas į SMS, žinutę ar el. laišką.'}
 catch{
  const preview=$('sharePreview');preview.value=content;preview.hidden=false;preview.focus();preview.select();
  $('shareStatus').textContent='Pažymėtas tekstas paruoštas kopijuoti.';
 }
};
function onPosition(p){
 if(last&&p.timestamp<last.timestamp)return;
 last=p;const c=p.coords,point=[c.latitude,c.longitude];
 $('coords').textContent=c.latitude.toFixed(6)+', '+c.longitude.toFixed(6);
 $('lksCoords').textContent=lksText(c);
 $('share').disabled=false;
 $('accuracy').textContent=Number.isFinite(c.accuracy)?'Apie ±'+Math.round(c.accuracy)+' m':'Nėra duomenų';
 $('live').textContent='Vieta atnaujinama';$('status').textContent='Rodoma naujausia telefono pateikta vieta.';
 if(!pin)pin=L.marker(point,{icon:markerIcon}).addTo(map);else pin.setLatLng(point);
 updateAlignment(c);
 updateTarget(c);
 updateSurveyDistance(c);
 if(targetFitOnFirstFix&&follow&&target){
  map.fitBounds(L.latLngBounds([point,[target.latitude,target.longitude]]),{padding:[45,45],maxZoom:17});
  follow=false;targetFitOnFirstFix=false;
 }else if(follow)map.setView(point,map.getZoom()<14?17:map.getZoom(),{animate:true});
}
$('centerMap').onclick=()=>{
 follow=true;
 if(last)map.setView([last.coords.latitude,last.coords.longitude],17,{animate:true});
 else if(!$('start').disabled)$('start').click();
 else $('status').textContent='Laukiama vietos duomenų.';
};
window.AsisApplyNativePosition=p=>onPosition({timestamp:p.timestamp,coords:p});
window.AsisApplyNativeLocationError=message=>{
 $('status').textContent=message;
 $('live').textContent='Vieta neatnaujinama';
 if(selectedSurveyIndex>=0){$('selectedPointDistance').textContent=message;if(surveyPopupDistance)surveyPopupDistance.textContent=message}
};
window.AsisApplyNativeLocationStopped=()=>{
 $('start').disabled=false;$('stop').disabled=true;
 $('live').textContent='Vieta sustabdyta';
};
$('start').onclick=()=>{
 if(window.AsisNativeLocation){
  $('status').textContent='Ieškoma vietos…';
  $('start').disabled=true;$('stop').disabled=false;
  window.AsisNativeLocation.start();return;
 }
 if(!navigator.geolocation){$('status').textContent='Šiame įrenginyje vietos nustatymas neprieinamas.';if(surveyPopupDistance)surveyPopupDistance.textContent='Vieta neprieinama';return}
 if(watcher!==null)return;
 $('status').textContent='Ieškoma vietos…';
 watcher=navigator.geolocation.watchPosition(onPosition,e=>{
  $('status').textContent=e.code===1?'Suteik vietos leidimą naršyklei ir bandyk dar kartą.':e.code===3?'Vietos matavimas užtruko. Patikrink GPS ir bandyk dar kartą.':'Nepavyko nustatyti vietos: '+e.message;
  if(selectedSurveyIndex>=0){$('selectedPointDistance').textContent=$('status').textContent;if(surveyPopupDistance)surveyPopupDistance.textContent=$('status').textContent}
  $('live').textContent='Vieta neatnaujinama';
  if(watcher!==null)navigator.geolocation.clearWatch(watcher);
  watcher=null;$('stop').disabled=true;$('start').disabled=false;
 },{enableHighAccuracy:true,maximumAge:1000,timeout:20000});
 $('start').disabled=true;$('stop').disabled=false;
};
$('stop').onclick=()=>{if(window.AsisNativeLocation)window.AsisNativeLocation.stop();if(watcher!==null)navigator.geolocation.clearWatch(watcher);watcher=null;$('start').disabled=false;$('stop').disabled=true;$('live').textContent='Vieta sustabdyta';$('status').textContent='Vietos stebėjimas sustabdytas.'};
