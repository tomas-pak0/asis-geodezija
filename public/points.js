/* Survey point import: number, LKS94 northing, easting, elevation, description. */
(function(root){
 'use strict';
 function parse(text,filename){
  if(!/\.(txt|csv)$/i.test(filename))throw Error('Pasirink TXT arba CSV failą.');
  const points=[],errors=[];
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
   const line=lines[i].trim();if(!line)continue;
   const parts=/\.csv$/i.test(filename)?line.split(',').map(s=>s.trim()):line.split(/\s+/);
   if(parts.length<4){errors.push(i+1);continue}
   const [id,xText,yText,zText]=parts;
   const x=Number(xText),y=Number(yText),z=Number(zText);
   if(!id||!xText||!yText||!zText||![x,y,z].every(Number.isFinite)){
    // Allow a single labelled header before any coordinates.
    if(points.length===0&&i===0&&/^(nr|numeris|number|id|taskas|taškas)/i.test(id))continue;
    errors.push(i+1);continue;
   }
   const [latitude,longitude]=root.KurAsAlignment.lks94(x,y);
   if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<53.89||latitude>56.45||longitude<19.02||longitude>26.82){errors.push(i+1);continue}
   const name=parts.slice(4).filter(Boolean).join(/\.csv$/i.test(filename)?', ':' ');
   points.push({id,x,y,z,name,latitude,longitude});
   if(points.length>5000)throw Error('Viename faile gali būti iki 5000 taškų.');
  }
  if(!points.length)throw Error('Nerasta tinkamų LKS94 taškų. Tikrinama tvarka: numeris, X, Y, aukštis, pavadinimas.');
  return {points,skipped:errors.length,skippedLines:errors.slice(0,5)};
 }
 root.AsisPoints={parse};
})(typeof window!=='undefined'?window:globalThis);
