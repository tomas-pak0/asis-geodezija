/* Alignment import and chainage in metres; no uploaded coordinates leave the device. */
(function(root){
  const rad=Math.PI/180, ellipsoidA=6378137,ellipsoidE2=1-(1-1/298.257223563)**2;
  function scales(latitude){const phi=latitude*rad,den=1-ellipsoidE2*Math.sin(phi)**2;return [ellipsoidA*(1-ellipsoidE2)/den**1.5*rad,ellipsoidA*Math.cos(phi)/Math.sqrt(den)*rad]}
  // EPSG:3346 LKS94 / Lithuania TM inverse (GRS80, TM 24°E, k0=.9998, FE=500000).
  function lks94(north,east){
    const a=6378137,f=1/298.257222101,n=f/(2-f),e=Math.sqrt(f*(2-f));
    const B=a/(1+n)*(1+n*n/4+n**4/64);let xi=north/(B*.9998),eta=(east-500000)/(B*.9998);
    const h=[n/2-2*n*n/3+37*n**3/96-n**4/360,n*n/48+n**3/15-437*n**4/1440,
      17*n**3/480-37*n**4/840,4397*n**4/161280];
    for(let j=0;j<4;j++){const k=j+1;xi-=h[j]*Math.sin(2*k*north/(B*.9998))*Math.cosh(2*k*(east-500000)/(B*.9998));eta-=h[j]*Math.cos(2*k*north/(B*.9998))*Math.sinh(2*k*(east-500000)/(B*.9998))}
    const beta=Math.asin(Math.sin(xi)/Math.cosh(eta));let q=Math.asinh(Math.tan(beta));
    for(let j=0;j<6;j++)q=Math.asinh(Math.tan(beta))+e*Math.atanh(e*Math.tanh(q));
    return [Math.atan(Math.sinh(q))/rad,(24*rad+Math.asin(Math.tanh(eta)/Math.cos(beta)))/rad];
  }
  // Invert the existing GRS80 Lithuania TM conversion, preserving its X (north), Y (east) order.
  function toLks94(latitude,longitude){
    const [northScale,eastScale]=scales(latitude);
    let north=latitude*111132,east=500000+(longitude-24)*eastScale*.9998;
    for(let i=0;i<6;i++){
      const [lat,lon]=lks94(north,east);
      const [latN,lonN]=lks94(north+1,east);
      const [latE,lonE]=lks94(north,east+1);
      const a=(latN-lat)*northScale,b=(latE-lat)*northScale;
      const c=(lonN-lon)*eastScale,d=(lonE-lon)*eastScale;
      const determinant=a*d-b*c;
      const deltaN=(latitude-lat)*northScale,deltaE=(longitude-lon)*eastScale;
      const stepN=(deltaN*d-b*deltaE)/determinant,stepE=(a*deltaE-c*deltaN)/determinant;
      north+=stepN;east+=stepE;
      if(Math.hypot(stepN,stepE)<.000001)break;
    }
    return [north,east];
  }
  const tag=(el,name)=>el&&[...el.children].find(child=>child.localName===name);
  const children=(el,name)=>[...el.children].filter(child=>child.localName===name);
  function point(el,unit){
    if(!el)throw Error('Trūksta ašies segmento pradžios, pabaigos arba centro.');
    const v=el.textContent.trim().split(/\s+/).map(Number);
    if(v.length<2||!v.slice(0,2).every(Number.isFinite))throw Error('Neteisingos LandXML koordinatės.');
    return v.slice(0,2).map(n=>n*unit); // LandXML: Northing Easting [Elevation].
  }
  function arc(segment,start,end,unit){
    const center=point(tag(segment,'Center'),unit);
    const a=Math.atan2(start[0]-center[0],start[1]-center[1]);
    const b=Math.atan2(end[0]-center[0],end[1]-center[1]);
    const r=Math.hypot(start[0]-center[0],start[1]-center[1]);
    const re=Math.hypot(end[0]-center[0],end[1]-center[1]);
    if(r<.01||Math.abs(r-re)>Math.max(.1,r*.001))throw Error('Kreivės centro ir galų geometrija nesutampa.');
    const rot=segment.getAttribute('rot')?.toLowerCase();
    if(rot!=='cw'&&rot!=='ccw')throw Error('Kreivei reikia rot="cw" arba "ccw".');
    const sign=rot==='ccw'?1:-1;
    const turn=sign>0?(b-a+2*Math.PI)%(2*Math.PI):(a-b+2*Math.PI)%(2*Math.PI);
    const length=Number(segment.getAttribute('length'))*unit;
    let sweep=turn;
    if(Number.isFinite(length)&&length>0){
      const listed=length/r;
      if(Math.abs(listed-turn)>0.02&&Math.abs(listed-(turn+2*Math.PI))<0.02)sweep=turn+2*Math.PI;
      else if(Math.abs(listed-sweep)>0.02)throw Error('LandXML kreivės ilgis ir geometrija nesutampa.');
    }
    const steps=Math.max(2,Math.ceil(r*sweep/5)),out=[];
    if(steps>20000)throw Error('Ašis per ilga arba per daug detali.');
    for(let j=1;j<steps;j++){const angle=a+sign*sweep*j/steps;out.push([center[0]+r*Math.sin(angle),center[1]+r*Math.cos(angle)])}
    out.push(end);return out;
  }
  function spiral(segment,start,end,unit){
    const type=segment.getAttribute('spiType')?.toLowerCase();
    if(type!=='clothoid')throw Error('Šio tipo perėjimo kreivė nepalaikoma: '+(type||'nenurodyta')+'.');
    const length=Number(segment.getAttribute('length'))*unit;
    const curvature=value=>{if(!value||/^(inf|infinity)$/i.test(value))return 0;const radius=Number(value)*unit;return radius>0&&Number.isFinite(radius)?1/radius:NaN};
    const k0=curvature(segment.getAttribute('radiusStart')),k1=curvature(segment.getAttribute('radiusEnd'));
    const rot=segment.getAttribute('rot')?.toLowerCase();
    if(!Number.isFinite(length)||length<=0||!Number.isFinite(k0)||!Number.isFinite(k1)||!['cw','ccw'].includes(rot))throw Error('Nepakanka klotoidės ilgio, spindulių ar krypties duomenų.');
    const sign=rot==='ccw'?1:-1,steps=Math.max(2,Math.ceil(length/2)),ds=length/steps;
    if(steps>20000)throw Error('Ašis per ilga arba per daug detali.');
    let x=0,y=0;const local=[];
    for(let j=1;j<=steps;j++){
      const s=(j-.5)*ds,angle=sign*(k0*s+(k1-k0)*s*s/(2*length));
      x+=Math.cos(angle)*ds;y+=Math.sin(angle)*ds;local.push([x,y]);
    }
    const targetX=end[1]-start[1],targetY=end[0]-start[0];
    if(Math.abs(Math.hypot(x,y)-Math.hypot(targetX,targetY))>Math.max(.15,length*.002))throw Error('LandXML klotoidės ilgis ir galai nesutampa.');
    const turn=Math.atan2(targetY,targetX)-Math.atan2(y,x),cos=Math.cos(turn),sin=Math.sin(turn);
    const result=local.map(([px,py])=>[start[0]+px*sin+py*cos,start[1]+px*cos-py*sin]);
    result[result.length-1]=end;return result;
  }
  function landxml(text){
    if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('LandXML su DTD ar išorinėmis esybėmis nepriimamas.');
    const xml=new DOMParser().parseFromString(text,'application/xml');
    if(xml.querySelector('parsererror')||xml.documentElement.localName!=='LandXML')throw Error('Failas nėra taisyklingas LandXML.');
    const units=tag(xml.documentElement,'Units');
    const system=units?.firstElementChild;
    const linear=system?.getAttribute('linearUnit')?.toLowerCase();
    const unit=linear==='meter'?1:linear==='millimeter'?.001:linear==='foot'?.3048:linear==='us survey foot'?1200/3937:null;
    if(!unit)throw Error('Neatpažinti LandXML matavimo vienetai. Reikia metrų, milimetrų arba pėdų.');
    const list=[],warnings=[];
    for(const group of children(xml.documentElement,'Alignments'))for(const alignment of children(group,'Alignment')){
      try{
      const geom=tag(alignment,'CoordGeom');if(!geom)continue;
      if(tag(alignment,'StaEquation')||alignment.getElementsByTagName('StaEquation').length)throw Error('Ašyje yra piketažo lūžių (StaEquation). Šios versijos skaičiavimui reikalingas XML be jų.');
      let raw=[];
      for(const segment of geom.children){
        const name=segment.localName;
        if(!['Line','Curve','Spiral'].includes(name))throw Error('Nepalaikomas ašies segmentas: '+name+'.');
        const start=point(tag(segment,'Start'),unit),end=point(tag(segment,'End'),unit);
        if(raw.length&&Math.hypot(start[0]-raw[raw.length-1][0],start[1]-raw[raw.length-1][1])>.2)throw Error('Ašies segmentai nesusijungia.');
        if(!raw.length)raw.push(start);
        raw.push(...(name==='Line'?[end]:name==='Curve'?arc(segment,start,end,unit):spiral(segment,start,end,unit)));
      }
      if(raw.length<2)continue;
      const n=raw[0][0],e=raw[0][1];
      const coords=n>=53&&n<=57&&e>=19&&e<=27?'WGS84':n>=5800000&&n<=6300000&&e>=250000&&e<=750000?'LKS94':null;
      if(!coords)throw Error('Neatpažinta ašies koordinačių sistema. Palaikoma LKS94 (X,Y) arba WGS84.');
      const points=check(raw.map(p=>coords==='LKS94'?lks94(p[0],p[1]):p));
      const start=Number(alignment.getAttribute('staStart')||0)*unit;
      if(!Number.isFinite(start)||Math.abs(start)>1000000)throw Error('Pradinis piketas (staStart) turi būti nuo −1 000 000 iki 1 000 000 m.');
      list.push({name:alignment.getAttribute('name')||'Ašis '+(list.length+1),points,startMetres:start,coords});
      }catch(error){warnings.push((alignment.getAttribute('name')||'Ašis')+': '+error.message)}
    }
    if(!list.length)throw Error(warnings.length?warnings.slice(0,3).join('; '):'LandXML faile nerasta Alignment / CoordGeom ašies.');
    return {alignments:list,warnings};
  }
  function distance(a,b){
    const [north,east]=scales((a[0]+b[0])/2);
    return Math.hypot((b[0]-a[0])*north,(b[1]-a[1])*east);
  }
  function check(points){
    if(!Array.isArray(points)||points.length<2||points.length>20000)throw Error('Ašiai reikia 2–20 000 taškų.');
    for(const p of points)if(!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>90||Math.abs(p[1])>180)throw Error('Netinkamos WGS84 koordinatės (platuma, ilguma).');
    const metres=points.slice(1).reduce((sum,p,i)=>sum+distance(points[i],p),0);
    if(metres<1||metres>2000000)throw Error('Ašies ilgis turi būti nuo 1 m iki 2 000 km.');
    return points;
  }
  function parse(text,filename){
    if(/\.xml$/i.test(filename))return landxml(text);
    if(/\.(geojson|json)$/i.test(filename)){
      const data=JSON.parse(text),g=data.type==='FeatureCollection'?data.features?.find(f=>f.geometry?.type==='LineString')?.geometry:data.type==='Feature'?data.geometry:data;
      if(g?.type!=='LineString')throw Error('GeoJSON turi turėti vieną LineString liniją.');
      return check(g.coordinates.map(p=>[Number(p[1]),Number(p[0])]));
    }
    if(/\.gpx$/i.test(filename)){
      const xml=new DOMParser().parseFromString(text,'application/xml');
      if(xml.querySelector('parsererror'))throw Error('Nepavyko perskaityti GPX.');
      const points=[...xml.getElementsByTagName('rtept')];
      if(!points.length)points.push(...xml.getElementsByTagName('trkpt'));
      return check(points.map(p=>[p.hasAttribute('lat')?Number(p.getAttribute('lat')):NaN,p.hasAttribute('lon')?Number(p.getAttribute('lon')):NaN]));
    }
    if(/\.csv$/i.test(filename)){
      const lines=text.trim().split(/\r?\n/).filter(Boolean);
      if(!lines.length)throw Error('CSV failas tuščias.');
      const separator=lines[0].includes(';')?';':',';
      const columns=lines.map(line=>line.split(separator).map(s=>s.trim().replace(/^"|"$/g,'')));
      const header=columns[0].map(s=>s.toLowerCase());
      const latitude=header.findIndex(s=>['lat','latitude','platuma'].includes(s));
      const longitude=header.findIndex(s=>['lon','lng','longitude','ilguma'].includes(s));
      if(latitude<0||longitude<0)throw Error('CSV antraštėje turi būti lat ir lon stulpeliai.');
      return check(columns.slice(1).map(row=>[row[latitude]?.length?Number(row[latitude]):NaN,row[longitude]?.length?Number(row[longitude]):NaN]));
    }
    throw Error('Naudok LandXML, GeoJSON, GPX arba CSV failą.');
  }
  function prepare(points){
    check(points);const lengths=[0];
    for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+distance(points[i-1],points[i]));
    return {points,lengths,total:lengths[lengths.length-1]};
  }
  function nearest(line,point){
    let found=null;
    for(let i=1;i<line.points.length;i++){
      const a=line.points[i-1],b=line.points[i];
      const [north,east]=scales((a[0]+b[0]+point[0])/3);
      const x=(b[1]-a[1])*east,y=(b[0]-a[0])*north;
      const px=(point[1]-a[1])*east,py=(point[0]-a[0])*north;
      const squared=x*x+y*y;if(squared<1e-12)continue;
      const t=Math.max(0,Math.min(1,(px*x+py*y)/squared));
      const cross=x*py-y*px,off=Math.hypot(px-t*x,py-t*y);
      if(!found||off<found.offset)found={offset:off,side:cross>0?'kairėje':cross<0?'dešinėje':'ant ašies',metres:line.lengths[i-1]+t*(line.lengths[i]-line.lengths[i-1]),point:[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]};
    }
    return found;
  }
  function at(line,metres){
    const d=Math.min(line.total,Math.max(0,metres));
    let i=1;while(i<line.lengths.length-1&&line.lengths[i]<d)i++;
    const span=line.lengths[i]-line.lengths[i-1],t=span?(d-line.lengths[i-1])/span:0;
    return line.points[i-1].map((n,j)=>n+t*(line.points[i][j]-n));
  }
  function station(metres,group=100){
    const rounded=Math.round(Math.abs(metres)),g=group===1000?1000:100;
    return (metres<0&&rounded>0?'-':'')+Math.floor(rounded/g)+'+'+String(rounded%g).padStart(g===1000?3:2,'0');
  }
  root.KurAsAlignment={parse,prepare,nearest,at,station,lks94,toLks94};
})(typeof window==='undefined'?globalThis:window);
