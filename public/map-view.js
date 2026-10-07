'use strict';
// Keep all geographic layers in Leaflet's rotated coordinate system.
// Markers and labels stay upright unless explicitly configured as a heading arrow.
window.AsisMapView=(()=>{
 const radians=Math.PI/180;
 const normalize=degrees=>(degrees%360+360)%360;
 function motion(previous,position){
  const c=position.coords,old=previous?.coords;
  const dt=previous?(position.timestamp-previous.timestamp)/1000:0;
  let distance=0,course=null;
  if(old){
   const dLat=(c.latitude-old.latitude)*radians,dLon=(c.longitude-old.longitude)*radians;
   const q=Math.sin(dLat/2)**2+Math.cos(old.latitude*radians)*Math.cos(c.latitude*radians)*Math.sin(dLon/2)**2;
   distance=12742000*Math.asin(Math.sqrt(Math.min(1,Math.max(0,q))));
   course=normalize(Math.atan2(Math.sin(dLon)*Math.cos(c.latitude*radians),
    Math.cos(old.latitude*radians)*Math.sin(c.latitude*radians)-Math.sin(old.latitude*radians)*Math.cos(c.latitude*radians)*Math.cos(dLon))*180/Math.PI);
  }
  const reliable=dt>0&&dt<=30&&distance>Math.max(6,c.accuracy||0,old?.accuracy||0);
  const speed=Number.isFinite(c.speed)&&c.speed>=0?c.speed:reliable?distance/dt:null;
  const heading=Number.isFinite(c.heading)&&(c.headingAccuracy==null||c.headingAccuracy<=45)
   ?normalize(c.heading):reliable?course:null;
  return {speed,heading,reliable,moving:speed!==null&&speed>=1&&heading!==null&&(!Number.isFinite(c.accuracy)||c.accuracy<=100)};
 }
 function create(map){
  const $=id=>document.getElementById(id);
  const text=value=>window.AsisLanguage!=='lt'&&window.AsisTranslate?window.AsisTranslate(value):value;
  let courseFix=null,lastMotion=null,resetAnimation=null;
  let headingUp=localStorage.getItem('asis-map-orientation')==='heading';
  const street=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
   maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  });
  const photo=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
   maxNativeZoom:19,maxZoom:22,attribution:'<a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank" rel="noopener">Esri World Imagery</a> · Esri, Vantor, Earthstar Geographics, GIS User Community'
  });
  let photoActive=false,activeLayer=null;
  function chooseLayer(usePhoto){
   activeLayer?.remove();photoActive=usePhoto;activeLayer=usePhoto?photo:street;activeLayer.addTo(map);
   map.setMaxZoom(activeLayer.options.maxZoom);
   localStorage.setItem('asis-map-layer',usePhoto?'photo':'street');
   $('photoMap').setAttribute('aria-pressed',String(usePhoto));
   $('photoMap').textContent=text(usePhoto?'Žemėlapis':'Foto žemėlapis');
   $('photoMap').setAttribute('aria-label',text(usePhoto?'Rodyti įprastą žemėlapį':'Rodyti foto žemėlapį'));
   $('mapHint').textContent=text('Žemėlapio fonui reikia interneto.');
  }
  for(const layer of [street,photo])layer.on('tileerror',()=>{
   if(activeLayer===layer)$('mapHint').textContent=text('Žemėlapio fono nepavyko atsisiųsti. Patikrink ryšį arba pasirink kitą žemėlapį.');
  });
  $('photoMap').onclick=()=>chooseLayer(!photoActive);
  function updateCompass(){
   $('compass').setAttribute('aria-pressed',String(headingUp));
   const label=text(headingUp?'Grąžinti šiaurę į viršų':'Judėjimo kryptis viršuje');
   $('compass').setAttribute('aria-label',label);$('compass').title=label;
   $('compassNeedle').style.transform='rotate('+map.getBearing()+'deg)';
  }
  function northUp(){
   map.setHeading(null);
   const start=map.getBearing(),delta=((540-start)%360)-180,at=performance.now();
   function frame(now){
    const t=Math.min(1,(now-at)/350);map.setBearing(start+delta*t*t*(3-2*t));
    if(t<1)resetAnimation=requestAnimationFrame(frame);else resetAnimation=null;
   }
   resetAnimation=requestAnimationFrame(frame);
  }
  $('compass').onclick=()=>{
   headingUp=!headingUp;localStorage.setItem('asis-map-orientation',headingUp?'heading':'north');
   if(resetAnimation!==null){cancelAnimationFrame(resetAnimation);resetAnimation=null;}
   if(headingUp){
    if(lastMotion?.moving)map.setHeading(lastMotion.heading,{ease:.2,deadzone:.5});
    else $('mapHint').textContent=text('Laukiama judėjimo krypties duomenų.');
   }else northUp();
   updateCompass();
  };
  map.on('rotate',updateCompass);
  chooseLayer(localStorage.getItem('asis-map-layer')==='photo');updateCompass();
  function update(position){
   lastMotion=motion(courseFix,position);
   if(!courseFix||lastMotion.reliable||position.timestamp-courseFix.timestamp>30000)courseFix=position;
   if(headingUp&&lastMotion.moving){
    map.setHeading(lastMotion.heading,{ease:.2,deadzone:.5});
    $('mapHint').textContent=text('Žemėlapio fonui reikia interneto.');
   }else if(headingUp)$('mapHint').textContent=text('Laukiama judėjimo krypties duomenų.');
   return lastMotion;
  }
  return {update};
 }
 function follow(map,onManual=()=>{}){
  let following=true,latest=null,anchor=null,candidate=null,manualHold=false,viewChosen=false;
  function pause(resumeOnMovement=false){
   following=false;manualHold=resumeOnMovement;viewChosen=true;anchor=latest;candidate=null;
   map.stop();
  }
  function manual(){pause(true);onManual();}
  // Leaflet's zoomstart does not reliably carry originalEvent. Observe the
  // actual input, as in Kur aš?, so +/- buttons and pinch cannot restart GPS follow.
  map.on('dragstart',manual);
  const element=map.getContainer();
  for(const type of ['wheel','touchstart','dblclick'])element.addEventListener(type,manual,{passive:true});
  element.addEventListener('pointerdown',event=>{if(event.target.closest('.leaflet-control-zoom'))manual();});
  element.addEventListener('click',event=>{if(event.target.closest('.leaflet-control-zoom'))manual();},{capture:true});
  element.addEventListener('keydown',event=>{
   if(['+','-','=','PageUp','PageDown','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))manual();
  });
  function goodFix(position){return Number.isFinite(position?.coords.accuracy)&&position.coords.accuracy>0&&position.coords.accuracy<=25;}
  function update(position){
   latest=position;
   if(!following&&manualHold){
    if(!anchor||(!goodFix(anchor)&&goodFix(position))){anchor=position;candidate=null;}
    else if(goodFix(anchor)&&goodFix(position)){
     const c=position.coords,a=anchor.coords;
     const distance=map.distance([a.latitude,a.longitude],[c.latitude,c.longitude]);
     const threshold=Math.max(50,2*a.accuracy,2*c.accuracy);
     if(distance>=threshold){
      // Two fixes at least a second apart avoid a single GPS jump moving the map.
      if(candidate&&position.timestamp-candidate.timestamp>=1000&&position.timestamp-candidate.timestamp<=20000){
       const previous=candidate.coords;
       const between=map.distance([previous.latitude,previous.longitude],[c.latitude,c.longitude]);
       if(between<=Math.max(30,Math.max(previous.speed||0,c.speed||0)*((position.timestamp-candidate.timestamp)/1000)+previous.accuracy+c.accuracy)){
        following=true;manualHold=false;anchor=candidate=null;
       }else candidate=position;
      }else if(!candidate||position.timestamp-candidate.timestamp>20000)candidate=position;
     }else candidate=null;
    }else candidate=null;
   }
   if(!following)return;
   const point=[position.coords.latitude,position.coords.longitude];
   if(!viewChosen){map.setView(point,16);viewChosen=true;}
   else if(map.latLngToContainerPoint(point).distanceTo(map.getSize().divideBy(2))>2){
    // Follow position without changing a manually chosen scale.
    map.panTo(point,{animate:true,duration:1});
   }
  }
  function recenter(){
   following=true;manualHold=false;anchor=candidate=null;
   if(latest){
    map.stop();map.flyTo([latest.coords.latitude,latest.coords.longitude],viewChosen?map.getZoom():16,{duration:.7});viewChosen=true;
   }
  }
  return {update,pause,recenter,isFollowing:()=>following};
 }
 return {create,motion,follow};
})();
