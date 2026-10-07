'use strict';
const $=id=>document.getElementById(id);
function fileLabel(id,file){
 const label=document.querySelector('[data-file-name="'+id+'"]');
 if(!label)return;
 label.toggleAttribute('data-user-file',Boolean(file));
 label.textContent=file?.name||(window.AsisLanguage==='en'?'No file selected':'Failas nepasirinktas');
}
const map=L.map('map',{zoomControl:true,zoomSnap:0,zoomDelta:.5,zoomAnimation:true,rotate:true,dragRotate:false,touchRotate:false,maxZoom:22}).setView([55.1694,23.8813],7);
const mapView=AsisMapView.create(map);
const markerIcon=L.divIcon({className:'position-icon',html:'<span class="position-marker"></span>',iconSize:[32,32],iconAnchor:[16,16]});
const movingIcon=L.divIcon({className:'position-icon',html:'<svg class="position-arrow" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 29 28 16 23 3 28Z" fill="#ed3948" stroke="white" stroke-width="2.5" stroke-linejoin="round"/></svg>',iconSize:[32,32],iconAnchor:[16,16]});
const targetIcon=L.divIcon({className:'target-marker-icon',html:'<span class="target-marker"></span>',iconSize:[26,26],iconAnchor:[13,13]});
let watcher=null,last=null,pin=null,alignment=null,alignmentLayer=null,stationLayer=null,nearestLine=null,xmlAlignments=null,xmlFileName='';
let positionAnimation=null;
function movePositionMarker(point){
 if(positionAnimation!==null){cancelAnimationFrame(positionAnimation);positionAnimation=null;}
 const from=pin.getLatLng();
 if(document.hidden||map.distance(from,point)>1000){pin.setLatLng(point);return;}
 const at=performance.now();
 function frame(now){
  const t=Math.min(1,(now-at)/700),ease=t*t*(3-2*t);
  pin.setLatLng([from.lat+(point[0]-from.lat)*ease,from.lng+(point[1]-from.lng)*ease]);
  if(t<1)positionAnimation=requestAnimationFrame(frame);
  else{positionAnimation=null;requestSurveyLabels();}
 }
 positionAnimation=requestAnimationFrame(frame);
}
let target=null,targetMarker=null,targetLine=null,targetFitOnFirstFix=false;
const mapFollow=AsisMapView.follow(map,()=>{targetFitOnFirstFix=false;});
let boundary=null,boundaryLayer=null;
let surveyPoints=[],surveyLayer=null,selectedSurveyIndex=-1,surveyLine=null,surveyMarkers=[],surveyPopupDistance=null;
let roadRouteLayer=null,roadRouteOrigin=null,roadRouteController=null,roadRouteRequest=0,roadRouteLastRequest=0,roadRouteSummary='',surveyPopupRoute=null,surveyPopupRouteButton=null;
const surveyStyle={radius:6,color:'#101216',weight:2,fillColor:'#f7c85e',fillOpacity:1};
const selectedSurveyStyle={radius:8,color:'#101216',weight:2,fillColor:'#fff',fillOpacity:1};
const surveyLabelsLayer=L.layerGroup().addTo(map);
function updateSurveyLabels(){
 surveyLabelsLayer.clearLayers();
 const size=map.getSize();
 const width=map.distance(map.containerPointToLatLng([0,size.y/2]),map.containerPointToLatLng([size.x,size.y/2]));
 if(!$('showPointNumbers').checked||width>1000||!surveyMarkers.length)return;
 const ctx=document.createElement('canvas').getContext('2d');
 if(ctx)ctx.font='700 11px system-ui';
 const visible=surveyMarkers.map((marker,index)=>{
  const point=map.latLngToContainerPoint(marker.getLatLng());
  return {marker,index,x:point.x,y:point.y};
 }).filter(item=>item.x>=-10&&item.x<=size.x+10&&item.y>=-10&&item.y<=size.y+10);
 const obstacles=visible.map(p=>({x:p.x-9,y:p.y-9,w:18,h:18}));
 for(const other of [pin,targetMarker])if(other){
  const p=map.latLngToContainerPoint(other.getLatLng());
  obstacles.push({x:p.x-15,y:p.y-15,w:30,h:30});
 }
 const items=visible.map(p=>{
  const label=String(surveyPoints[p.index].id);
  return {...p,label,w:Math.max(21,Math.ceil(ctx?.measureText(label).width||label.length*7)+12),h:20};
 });
 items.sort((a,b)=>(b.index===selectedSurveyIndex)-(a.index===selectedSurveyIndex));
 for(const item of AsisLabelLayout.place(items,obstacles,{width:size.x,height:size.y})){
  const content=document.createElement('span');content.textContent=item.label;
  const icon=L.divIcon({className:'survey-number-icon',html:content,iconSize:[item.w,item.h],iconAnchor:[item.x-item.box.x,item.y-item.box.y]});
  L.marker(item.marker.getLatLng(),{icon,interactive:false,keyboard:false}).addTo(surveyLabelsLayer);
 }
}
let surveyLabelsFrame=null;
function requestSurveyLabels(){if(surveyLabelsFrame===null)surveyLabelsFrame=requestAnimationFrame(()=>{surveyLabelsFrame=null;updateSurveyLabels();});}
map.on('zoomend moveend resize rotate',requestSurveyLabels);
$('showPointNumbers').checked=localStorage.getItem('asis-show-point-numbers')!=='false';
$('showPointNumbers').onchange=()=>{
 localStorage.setItem('asis-show-point-numbers',String($('showPointNumbers').checked));
 updateSurveyLabels();
};
const stationGroup=()=>Number($('stationFormat').value);
window.AsisApplyNativeTelemetry=t=>{
 if(t.gps)$('gps').textContent=t.gps;
};
function stationVisibility(){
 if(!stationLayer)return;
 if(map.getZoom()>=14){if(!map.hasLayer(stationLayer))stationLayer.addTo(map)}
 else if(map.hasLayer(stationLayer))stationLayer.remove();
}
map.on('zoomend',stationVisibility);
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
 const side=r.offset<.005?'ašyje':r.side==='dešinėje'?(window.AsisLanguage==='ru'?'П':window.AsisLanguage==='en'?'R':'d'):(window.AsisLanguage==='ru'?'Л':window.AsisLanguage==='en'?'L':'k');
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
 mapFollow.pause();map.fitBounds(L.latLngBounds(points),{padding:[35,35],maxZoom:17});
}
$('alignmentFile').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 fileLabel('alignmentFile',file);
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
 }catch(e){$('alignmentStatus').textContent='Nepavyko įkelti ašies: '+e.message;event.target.value='';fileLabel('alignmentFile',null)}
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
 fileLabel('alignmentFile',null);
 $('clearAlignment').hidden=true;$('stationValue').textContent='Įkelk ašį';$('offsetValue').textContent='–';
 $('alignmentStatus').textContent='Ašis pašalinta. Gali įkelti kitą failą.';localStorage.removeItem('asis-alignment');
};
function parseLksNumber(value){
 const clean=value.trim().replace(/\s/g,'').replace(',','.');
 return /^\d+(?:\.\d+)?$/.test(clean)?Number(clean):NaN;
}
function updateTargetSystem(){
 const wgs=$('targetSystem').value==='wgs';
 $('targetXLabel').textContent=wgs?'Platuma (°)':'X · šiaurė, m';
 $('targetYLabel').textContent=wgs?'Ilguma (°)':'Y · rytai, m';
 $('targetX').placeholder=wgs?'55,019937':'6125330,97';
 $('targetY').placeholder=wgs?'25,108543':'549904,73';
 $('targetX').value=target?(wgs?String(target.latitude):String(target.x)):'';
 $('targetY').value=target?(wgs?String(target.longitude):String(target.y)):'';
}
$('targetSystem').onchange=()=>{
 updateTargetSystem();
 $('targetStatus').textContent=$('targetSystem').value==='wgs'?'Įvesk WGS84 platumą ir ilgumą.':'Įvesk LKS94 X ir Y koordinates.';
};
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
 const directions=window.AsisLanguage==='ru'?['С','СВ','В','ЮВ','Ю','ЮЗ','З','СЗ']:window.AsisLanguage==='en'?['N','NE','E','SE','S','SW','W','NW']:['Š','ŠR','R','PR','P','PV','V','ŠV'];
 $('targetBearing').textContent=degrees.toFixed(0)+'° ('+directions[Math.round(degrees/45)%8]+')';
}
function showTarget(x,y,save=true,mode='lks'){
 if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Įvesk skaitines X ir Y koordinates.');
 const [latitude,longitude]=KurAsAlignment.lks94(x,y);
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<53.89||latitude>56.45||longitude<19.02||longitude>26.82)
  throw Error('Taškas nepatenka į LKS94 taikymo sritį Lietuvoje. Patikrink X ir Y eiliškumą.');
 target={x,y,latitude,longitude};
 const point=[latitude,longitude];
 if(!targetMarker)targetMarker=L.marker(point,{icon:targetIcon}).addTo(map).bindTooltip('Tikslas',{permanent:true,direction:'top',offset:[0,-12]});
 else targetMarker.setLatLng(point);
 if(!targetLine)targetLine=L.polyline([],{color:'#72d7ff',weight:3,dashArray:'7,6',interactive:false}).addTo(map);
 $('targetSystem').value=mode==='wgs'?'wgs':'lks';updateTargetSystem();$('clearTarget').hidden=false;
 $('targetStatus').textContent=last?'Taškas žemėlapyje. Atstumas skaičiuojamas nuo telefono vietos.':'Taškas žemėlapyje. Laukiama telefono vietos matavimo.';
 updateTarget(last?.coords);
 if(last){mapFollow.pause();map.fitBounds(L.latLngBounds([[last.coords.latitude,last.coords.longitude],point]),{padding:[45,45],maxZoom:17})}
 else{map.setView(point,16);targetFitOnFirstFix=true}
 if(save)try{localStorage.setItem('asis-target',JSON.stringify({x,y,mode:$('targetSystem').value}))}
 catch{$('targetStatus').textContent+=' Nepavyko išsaugoti taško šiame įrenginyje.'}
}
$('targetForm').onsubmit=event=>{
 event.preventDefault();
 try{
  const first=parseLksNumber($('targetX').value),second=parseLksNumber($('targetY').value);
  if($('targetSystem').value==='wgs'){
   if(!Number.isFinite(first)||!Number.isFinite(second)||first<53.89||first>56.45||second<19.02||second>26.82)
    throw Error('Įvesk WGS84 platumą (53,89–56,45°) ir ilgumą (19,02–26,82°) šia tvarka.');
   const [x,y]=KurAsAlignment.toLks94(first,second);
   showTarget(x,y,true,'wgs');
  }else showTarget(first,second);
 }
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
 clearRoadRoute(false);surveyLayer?.remove();surveyLine?.remove();surveyLine=null;
 surveyPoints=points;surveyLayer=layer.addTo(map);surveyMarkers=markers;selectedSurveyIndex=-1;surveyPopupDistance=surveyPopupRoute=surveyPopupRouteButton=null;
 $('selectedPoint').hidden=true;$('clearPoints').hidden=false;
 $('pointsStatus').textContent=name+' · '+points.length+' taškų'+(skipped?' · praleista netinkamų eilučių: '+skipped:'')+'. Paspausk tašką žemėlapyje.';
 mapFollow.pause();map.fitBounds(L.latLngBounds(points.map(p=>[p.latitude,p.longitude])),{padding:[35,35],maxZoom:17});
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
 if(!roadRouteLayer){
  if(!surveyLine)surveyLine=L.polyline([],{color:'#f7c85e',weight:2,dashArray:'6,5',interactive:false}).addTo(map);
  surveyLine.setLatLngs([[c.latitude,c.longitude],[p.latitude,p.longitude]]);
 }else if(roadRouteOrigin&&map.distance(roadRouteOrigin,[c.latitude,c.longitude])>100){
  routeMessage(roadRouteSummary+' Vieta pasikeitė · paspausk „Atnaujinti maršrutą“.');
 }
}
function clearRoadRoute(restoreLine=true){
 roadRouteRequest++;roadRouteController?.abort();roadRouteController=null;
 roadRouteLayer?.remove();roadRouteLayer=roadRouteOrigin=null;roadRouteSummary='';
 $('routeToPoint').disabled=false;$('routeToPoint').textContent='Rodyti privažiavimą';$('clearRoute').hidden=true;
 if(surveyPopupRouteButton){surveyPopupRouteButton.disabled=false;surveyPopupRouteButton.textContent='Rodyti privažiavimą'}
 $('routeStatus').textContent='Maršrutas skaičiuojamas pagal kelius, kai jo paprašai. Tam reikia interneto.';
 if(surveyPopupRoute)surveyPopupRoute.textContent='';
 if(restoreLine&&selectedSurveyIndex>=0)updateSurveyDistance(last?.coords);
}
function routeMessage(message){
 $('routeStatus').textContent=message;
 if(surveyPopupRoute)surveyPopupRoute.textContent=message;
}
async function calculateRoadRoute(){
 const index=selectedSurveyIndex,p=surveyPoints[index];if(!p)return;
 if(!last){routeMessage('Pirma įjunk vietos nustatymą ir palauk GPS matavimo.');if(!$('start').disabled)$('start').click();return}
 if(Date.now()-last.timestamp>30000){routeMessage('Vietos matavimas pasenęs. Atnaujink savo vietą ir bandyk vėl.');if(!$('start').disabled)$('start').click();return}
 if(!navigator.onLine){routeMessage('Kelių maršrutui reikia interneto ryšio.');return}
 if(Date.now()-roadRouteLastRequest<1200)return;
 roadRouteLastRequest=Date.now();
 roadRouteController?.abort();const controller=new AbortController(),request=++roadRouteRequest;
 roadRouteController=controller;$('routeToPoint').disabled=true;routeMessage('Skaičiuojamas automobilio maršrutas…');
 if(surveyPopupRouteButton)surveyPopupRouteButton.disabled=true;
 const origin=[last.coords.latitude,last.coords.longitude];
 const url='https://routing.openstreetmap.de/routed-car/route/v1/driving/'
  +origin[1].toFixed(6)+','+origin[0].toFixed(6)+';'+p.longitude.toFixed(6)+','+p.latitude.toFixed(6)
  +'?overview=full&geometries=geojson&steps=false';
 try{
  const response=await fetch(url,{signal:controller.signal});
  if(!response.ok)throw Error('Maršrutų serveris neatsako ('+response.status+').');
  const data=await response.json();
  if(data.code!=='Ok'||!data.routes?.[0]?.geometry?.coordinates?.length)throw Error('Iki šio taško automobilio maršrutas nerastas.');
  if(request!==roadRouteRequest||selectedSurveyIndex!==index)return;
  const route=data.routes[0],coords=route.geometry.coordinates;
  if(coords.length>50000||!Number.isFinite(route.distance)||!coords.every(c=>c.length>=2&&Number.isFinite(c[0])&&Number.isFinite(c[1])))
   throw Error('Gauti maršruto duomenys netinkami.');
  const line=coords.map(([lon,lat])=>[lat,lon]);
  const layer=L.layerGroup();
  L.polyline(line,{color:'#55c4ff',weight:5,opacity:.95,interactive:false}).addTo(layer);
  const gaps=[];
  if(map.distance(origin,line[0])>10)gaps.push([origin,line[0]]);
  if(map.distance(line[line.length-1],[p.latitude,p.longitude])>10)gaps.push([line[line.length-1],[p.latitude,p.longitude]]);
  if(gaps.length)L.polyline(gaps,{color:'#55c4ff',weight:2,dashArray:'5,6',interactive:false}).addTo(layer);
  roadRouteLayer?.remove();roadRouteLayer=layer.addTo(map);roadRouteOrigin=origin;
  surveyLine?.remove();surveyLine=null;
  mapFollow.pause();map.fitBounds(L.latLngBounds([...line,origin,[p.latitude,p.longitude]]),{padding:[35,35],maxZoom:16});
  const distance=route.distance>=1000?(route.distance/1000).toFixed(1).replace('.',',')+' km':Math.round(route.distance)+' m';
  const finalGap=Math.round(data.waypoints?.[1]?.distance||0);
  roadRouteSummary='Privažiavimas keliais: '+distance+(finalGap>10?' · nuo kelio iki taško dar ~'+finalGap+' m tiesiai.':'.');
  routeMessage(roadRouteSummary);
  $('clearRoute').hidden=false;$('routeToPoint').textContent='Atnaujinti maršrutą';
  if(surveyPopupRouteButton)surveyPopupRouteButton.textContent='Atnaujinti maršrutą';
 }catch(error){
  if(request!==roadRouteRequest||error.name==='AbortError')return;
  routeMessage((error instanceof TypeError?'Nepavyko pasiekti maršrutų serverio. Patikrink internetą.':error.message)+(roadRouteLayer?' Rodomas ankstesnis maršrutas.':''));
 }finally{if(request===roadRouteRequest){roadRouteController=null;$('routeToPoint').disabled=false;if(surveyPopupRouteButton)surveyPopupRouteButton.disabled=false}}
}
$('routeToPoint').onclick=calculateRoadRoute;
$('clearRoute').onclick=()=>clearRoadRoute();
function selectSurveyPoint(i){
 const p=surveyPoints[i];if(!p)return;
 clearRoadRoute(false);
 if(selectedSurveyIndex>=0)surveyMarkers[selectedSurveyIndex]?.setStyle(surveyStyle);
 selectedSurveyIndex=i;surveyMarkers[i].setStyle(selectedSurveyStyle);
 updateSurveyLabels();
 $('selectedPoint').hidden=false;$('selectedPointName').textContent='Taškas '+p.id+(p.name?' · '+p.name:'');
 $('selectedPointCoords').textContent='X '+p.x.toFixed(3)+' · Y '+p.y.toFixed(3)+' · H '+p.z.toFixed(3)+' m';
 const popup=document.createElement('div'),title=document.createElement('strong'),distance=document.createElement('div');
 const route=document.createElement('div'),routeButton=document.createElement('button');
 title.textContent='Taškas '+p.id+(p.name?' · '+p.name:'');
 distance.className='survey-popup-distance';route.className='survey-popup-route';
 routeButton.className='survey-popup-action';routeButton.type='button';routeButton.textContent='Rodyti privažiavimą';
 routeButton.onclick=event=>{event.stopPropagation();calculateRoadRoute()};
 popup.append(title,distance,route,routeButton);surveyPopupDistance=distance;surveyPopupRoute=route;surveyPopupRouteButton=routeButton;
 surveyMarkers[i].bindPopup(popup,{autoPan:true}).openPopup();
 updateSurveyDistance(last?.coords);
 if(!last&&!$('start').disabled)$('start').click();
}
$('pointsFile').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 fileLabel('pointsFile',file);
 try{
  if(file.size>2000000)throw Error('Failas per didelis (iki 2 MB).');
  const {points,skipped}=AsisPoints.parse(await file.text(),file.name);
  showSurveyPoints(points,file.name,skipped);
 }catch(error){$('pointsStatus').textContent='Nepavyko įkelti taškų: '+error.message;fileLabel('pointsFile',null)}
 event.target.value='';
};
$('clearPoints').onclick=()=>{
 clearRoadRoute(false);
 surveyLayer?.remove();surveyLine?.remove();surveyLayer=surveyLine=null;
 surveyMarkers=[];surveyPoints=[];selectedSurveyIndex=-1;surveyPopupDistance=surveyPopupRoute=surveyPopupRouteButton=null;
 surveyLabelsLayer.clearLayers();
 fileLabel('pointsFile',null);
 $('selectedPoint').hidden=true;$('clearPoints').hidden=true;
 $('pointsStatus').textContent='Taškai pašalinti. Gali įkelti kitą failą.';
 localStorage.removeItem('asis-points');
};
function renderBoundary(fit=false){
 boundaryLayer?.remove();boundaryLayer=null;
 if(!boundary)return;
 const chosen=$('boundaryLayer').value;
 const layers=chosen==='*'?boundary.layers:boundary.layers.filter(item=>item.name===chosen);
 const lines=layers.flatMap(item=>item.lines);
 if($('showBoundary').checked){
  boundaryLayer=L.layerGroup();
  for(const line of lines)L.polyline(line,{color:'#b68cff',weight:3,opacity:.95,interactive:false}).addTo(boundaryLayer);
  boundaryLayer.addTo(map);
 }
 $('boundaryStatus').textContent=boundary.name+' · '+lines.length+' linijų'+(boundary.skipped?' · praleista už Lietuvos ribų: '+boundary.skipped:'')+'.';
 if(fit&&lines.length){mapFollow.pause();map.fitBounds(L.latLngBounds(lines.flat()),{padding:[35,35],maxZoom:17})}
}
function showBoundary(parsed,name,save=true){
 if(!Array.isArray(parsed.layers)||!parsed.layers.length)throw Error('Faile nėra matomų linijų.');
 boundary={...parsed,name};
 const picker=$('boundaryLayer');picker.replaceChildren();
 const all=document.createElement('option');all.value='*';all.textContent='Visi sluoksniai';picker.append(all);
 for(const item of boundary.layers){const option=document.createElement('option');option.value=item.name;option.textContent=item.name+' ('+item.lines.length+')';picker.append(option)}
 $('boundaryLayerLabel').hidden=boundary.layers.length<2;
 picker.value='*';$('showBoundary').checked=true;$('clearBoundary').hidden=false;
 renderBoundary(true);
 if(save)try{localStorage.setItem('asis-boundary',JSON.stringify(boundary))}
 catch{$('boundaryStatus').textContent+=' Nepavyko išsaugoti šiame įrenginyje; kitą kartą failą įkelk iš naujo.'}
}
$('boundaryFile').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 fileLabel('boundaryFile',file);
 $('boundaryStatus').textContent='Skaitomas '+file.name+'…';
 try{showBoundary(await AsisBoundary.parse(file,$('boundarySystem').value),file.name)}
 catch(error){$('boundaryStatus').textContent='Nepavyko įkelti ribos: '+error.message;fileLabel('boundaryFile',null)}
 event.target.value='';
};
$('boundaryLayer').onchange=()=>renderBoundary(true);
$('showBoundary').onchange=()=>renderBoundary(false);
$('clearBoundary').onclick=()=>{
 boundaryLayer?.remove();boundaryLayer=boundary=null;
 $('boundaryFile').value='';$('clearBoundary').hidden=true;$('boundaryLayerLabel').hidden=true;
 fileLabel('boundaryFile',null);
 $('boundaryStatus').textContent='Riba pašalinta. Gali įkelti kitą failą.';
 localStorage.removeItem('asis-boundary');
};
try{const saved=JSON.parse(localStorage.getItem('asis-alignment'));if(saved?.points){$('stationStart').value=saved.startMetres;showAlignment(saved.points,saved.name,saved.startMetres)}}
catch{localStorage.removeItem('asis-alignment')}
try{const saved=JSON.parse(localStorage.getItem('asis-target'));if(saved)showTarget(Number(saved.x),Number(saved.y),false,saved.mode)}
catch{localStorage.removeItem('asis-target')}
try{const saved=JSON.parse(localStorage.getItem('asis-points'));if(saved?.points?.length)showSurveyPoints(saved.points,saved.name,saved.skipped,false)}
catch{localStorage.removeItem('asis-points')}
try{const saved=JSON.parse(localStorage.getItem('asis-boundary'));if(saved?.layers?.length)showBoundary(saved,saved.name,false)}
catch{localStorage.removeItem('asis-boundary')}
function ageLabel(seconds){if(seconds<60)return seconds+' s';if(seconds<3600)return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');return Math.floor(seconds/3600)+':'+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
setInterval(()=>{if(last){const age=Math.max(0,Math.floor((Date.now()-last.timestamp)/1000));$('updated').textContent='Matavimas '+new Date(last.timestamp).toLocaleTimeString(window.AsisLanguage==='ru'?'ru-RU':window.AsisLanguage==='en'?'en-GB':'lt-LT')+' · prieš '+ageLabel(age);if(age>30)$('live').textContent='Duomenys neatnaujinami'}},1000);
function lksText(c){
 if(c.latitude<53.89||c.latitude>56.45||c.longitude<19.02||c.longitude>26.82)return 'Už LKS94 taikymo srities';
 const [north,east]=KurAsAlignment.toLks94(c.latitude,c.longitude);
 return 'X '+north.toFixed(2)+' m · Y '+east.toFixed(2)+' m';
}
function shareText(p){
 const c=p.coords;
 const lines=['Ašis · vietos koordinatės',
  'Matavimas: '+new Date(p.timestamp).toLocaleString(window.AsisLanguage==='ru'?'ru-RU':window.AsisLanguage==='en'?'en-GB':'lt-LT'),
  'WGS84: '+c.latitude.toFixed(6)+', '+c.longitude.toFixed(6),
  'LKS94 (EPSG:3346): '+lksText(c)];
 const details=alignmentDetails(c);
 if(details)lines.push('Piketažas: '+details.station,'Atstumas iki ašies: '+details.offset);
 return lines.join('\n');
}
$('share').onclick=async()=>{
 if(!last)return;
 const content=window.AsisLanguage!=='lt'?window.AsisTranslate(shareText(last)):shareText(last);
 $('sharePreview').hidden=true;
 if(window.AsisNativeShare){
  window.AsisNativeShare.send(content,window.AsisLanguage);
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
 const movement=mapView.update(p),icon=movement.moving?movingIcon:markerIcon;
 if(!pin)pin=L.marker(point,{icon,rotation:movement.moving?movement.heading:0,rotateWithView:true}).addTo(map);
 else{pin.options.rotation=movement.moving?movement.heading:0;pin.setIcon(icon);movePositionMarker(point);}
 updateAlignment(c);
 updateTarget(c);
 updateSurveyDistance(c);
 requestSurveyLabels();
 if(targetFitOnFirstFix&&mapFollow.isFollowing()&&target){
  mapFollow.pause();
  map.fitBounds(L.latLngBounds([point,[target.latitude,target.longitude]]),{padding:[45,45],maxZoom:17});
  targetFitOnFirstFix=false;
 }
 mapFollow.update(p);
}
$('centerMap').onclick=()=>{
 targetFitOnFirstFix=false;mapFollow.recenter();
 if(!last){if(!$('start').disabled)$('start').click();else $('status').textContent='Laukiama vietos duomenų.';}
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


