/* Object boundaries and lines from KML/KMZ (WGS84) or DXF/DWG (selected CRS). */
(function(root){
 'use strict';
 const limit=30000, extent={minLat:53.89,maxLat:56.45,minLon:19.02,maxLon:26.82};
 function inside(lat,lon){return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=extent.minLat&&lat<=extent.maxLat&&lon>=extent.minLon&&lon<=extent.maxLon}
 function kml(text){
  const xml=new DOMParser().parseFromString(text,'application/xml');
  if(xml.querySelector('parsererror'))throw Error('Netaisyklingas KML failas.');
  const geometries=[...xml.getElementsByTagName('*')].filter(el=>['LineString','LinearRing'].includes(el.localName));
  const lines=[];let total=0;
  for(const geom of geometries){
   const element=[...geom.getElementsByTagName('*')].find(el=>el.localName==='coordinates');
   if(!element)continue;
   const line=element.textContent.trim().split(/\s+/).map(tuple=>{
    const [lon,lat]=tuple.split(',').map(Number);return [lat,lon];
   });
   if(line.length>1&&line.every(p=>inside(...p))){
    total+=line.length;
    if(total>limit)throw Error('Riboje per daug viršūnių (daugiausia 30 000).');
    lines.push(line);
   }
  }
  if(!lines.length)throw Error('Nerasta LineString arba Polygon ribų Lietuvos teritorijoje. KML koordinatės turi būti WGS84.');
  return {layers:[{name:'Ribos',lines}],system:'wgs'};
 }
 function verticesLine(vertices,closed){
  if(!Array.isArray(vertices)||vertices.length<2)return [];
  const result=[];
  const end=closed?vertices.length:vertices.length-1;
  for(let i=0;i<end;i++){
   const p=vertices[i],q=vertices[(i+1)%vertices.length];
   if(i===0)result.push([p.x,p.y]);
   const bulge=Number(p.bulge)||0;
   if(Math.abs(bulge)>1e-8){
    const dx=q.x-p.x,dy=q.y-p.y,chord=Math.hypot(dx,dy),theta=4*Math.atan(bulge);
    if(chord>0&&Math.abs(theta)<Math.PI*2){
     const offset=chord*(1-bulge*bulge)/(4*bulge);
     const cx=(p.x+q.x)/2-dy/chord*offset,cy=(p.y+q.y)/2+dx/chord*offset;
     const radius=Math.hypot(p.x-cx,p.y-cy),start=Math.atan2(p.y-cy,p.x-cx);
     const steps=Math.min(90,Math.max(2,Math.ceil(Math.abs(theta)*12)));
     for(let j=1;j<steps;j++)result.push([cx+radius*Math.cos(start+theta*j/steps),cy+radius*Math.sin(start+theta*j/steps)]);
    }
   }
   result.push([q.x,q.y]);
  }
  return result;
 }
 function arc(center,radius,start,end,full){
  if(!center||!Number.isFinite(radius)||radius<=0||!Number.isFinite(start)||!Number.isFinite(end))return [];
  let sweep=full?Math.PI*2:(end-start+Math.PI*2)%(Math.PI*2);
  if(!full&&sweep<1e-8)return [];
  const steps=Math.min(120,Math.max(8,Math.ceil(sweep*16))),points=[];
  for(let i=0;i<=steps;i++)points.push([center.x+radius*Math.cos(start+sweep*i/steps),center.y+radius*Math.sin(start+sweep*i/steps)]);
  return points;
 }
 function cadGeometry(entity){
  switch(entity.type){
   case 'LINE':{
    const a=entity.startPoint||entity.vertices?.[0],b=entity.endPoint||entity.vertices?.[1];
    return a&&b?[[a.x,a.y],[b.x,b.y]]:[];
   }
   case 'LWPOLYLINE':case 'POLYLINE':case 'POLYLINE2D':case 'POLYLINE3D':{
    const vertices=entity.vertices||[];
    const closed=entity.shape===true||entity.closed===true||Boolean(entity.flag&1);
    return verticesLine(vertices,closed);
   }
   case 'ARC':return arc(entity.center,entity.radius,entity.startAngle,entity.endAngle,false);
   case 'CIRCLE':return arc(entity.center,entity.radius,0,0,true);
   default:return [];
  }
 }
 function cad(entities,system){
  const layers=new Map();let total=0,skipped=0;
  for(const entity of entities){
   const points=cadGeometry(entity);
   if(points.length<2)continue;
   const line=points.map(([east,north])=>system==='lks'?root.KurAsAlignment.lks94(north,east):[north,east]);
   if(!line.every(p=>inside(...p))){skipped++;continue}
   total+=line.length;
   if(total>limit)throw Error('Riboje per daug viršūnių (daugiausia 30 000). Išsaugok tik reikiamus CAD sluoksnius.');
   const name=String(entity.layer||'0');
   if(!layers.has(name))layers.set(name,[]);
   layers.get(name).push(line);
  }
  if(!layers.size)throw Error('Nerasta ribų Lietuvos teritorijoje. Patikrink koordinačių sistemą, CAD modelio erdvę ir LINE / POLYLINE sluoksnius.');
  return {layers:[...layers].map(([name,lines])=>({name,lines})),system,skipped};
 }
 async function parse(file,system){
  const extension=file.name.split('.').pop().toLowerCase();
  if(file.size>12000000)throw Error('Failas per didelis (iki 12 MB).');
  if(extension==='kml')return kml(await file.text());
  if(extension==='kmz'){
   if(!root.JSZip)throw Error('KMZ skaitytuvas neįkeltas.');
   const archive=await root.JSZip.loadAsync(await file.arrayBuffer());
   const entries=Object.values(archive.files).filter(item=>!item.dir&&/\.kml$/i.test(item.name));
   entries.sort((a,b)=>(/^doc\.kml$/i.test(b.name)?1:0)-(/^doc\.kml$/i.test(a.name)?1:0));
   if(!entries.length)throw Error('KMZ archyve nėra KML failo.');
   if(entries[0]._data?.uncompressedSize>3000000)throw Error('KML archyve per didelis (iki 3 MB).');
   return kml(await entries[0].async('string'));
  }
  if(extension==='dxf'){
   if(!root.DxfParser)throw Error('DXF skaitytuvas neįkeltas.');
   return cad(new root.DxfParser().parseSync(await file.text()).entities||[],system);
  }
  if(extension==='dwg'){
   const {LibreDwg,Dwg_File_Type}=await import('./vendor/libredwg/dist/libredwg-web.js');
   const offline=location.hostname==='appassets.androidplatform.net';
   const base=offline?new URL('./vendor/libredwg/wasm',document.baseURI).href.replace(/\/$/,''):
    'https://cdn.jsdelivr.net/npm/@mlightcad/libredwg-web@0.7.14/wasm';
   let reader;
   try{reader=await LibreDwg.create(base)}
   catch{throw Error('Nepavyko įkelti DWG skaitytuvo. Naršyklėje DWG failui reikia interneto; taip pat gali įkelti DXF.')}
   const data=await file.arrayBuffer();
   const pointer=reader.dwg_read_data(data,Dwg_File_Type.DWG);
   if(!pointer)throw Error('DWG formato nepavyko perskaityti. Pabandyk eksportuoti DXF iš CAD.');
   try{return cad(reader.convert(pointer).entities||[],system)}
   finally{reader.dwg_free(pointer)}
  }
  throw Error('Pasirink DWG, DXF, KML arba KMZ failą.');
 }
 root.AsisBoundary={parse,kml,cad};
})(typeof window!=='undefined'?window:globalThis);
