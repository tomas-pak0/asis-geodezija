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
   maxNativeZoom:19,maxZoom:22,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  });
  const photo=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
   maxNativeZoom:19,maxZoom:22,attribution:'<a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank" rel="noopener">Esri World Imagery</a> · Esri, Vantor, Earthstar Geographics, GIS User Community'
  });
  let photoActive=false,activeLayer=null;
  function chooseLayer(usePhoto){
   activeLayer?.remove();photoActive=usePhoto;activeLayer=usePhoto?photo:street;activeLayer.addTo(map);
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
   $('mapOrientation').textContent=text(headingUp?'Judėjimo kryptis viršuje':'Šiaurė viršuje');
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
 return {create,motion};
})();
