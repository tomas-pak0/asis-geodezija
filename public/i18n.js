'use strict';
// Keep Lithuanian as the source language. Translate visible text, including messages
// produced by file parsers and the native Android location bridge.
const translations = new Map(Object.entries({
 'Vieta · piketažas · atstumas iki ašies':'Location · chainage · distance to alignment',
 'Laukiama vietos leidimo':'Waiting for location permission',
 'Paspausk „Rodyti vietą“ ir suteik vietos leidimą.':'Tap “Show location” and allow location access.',
 'Vieta ir kelio ašis žemėlapyje':'Location and road alignment on the map',
 'Geodeziniai duomenys':'Survey data',
 'GPS / palydovai':'GPS / satellites',
 ' ir ':' and ',
 'Kalba':'Language',
 'Pasirinkti failą':'Choose file',
 'Failas nepasirinktas':'No file selected',
 'Mano vieta':'My location',
 'Matavimas: –':'Measurement: –',
 'Piketažas':'Chainage',
 'Atstumas iki ašies':'Distance to alignment',
 'Įkelk ašį':'Import an alignment',
 'Koordinatės (WGS84)':'Coordinates (WGS84)',
 'Apytikslės koordinatės (LKS94, EPSG:3346)':'Approximate coordinates (LKS94, EPSG:3346)',
 'Vietos tikslumas':'Location accuracy',
 'Naršyklėje neprieinama':'Unavailable in browser',
 'Bendrinti koordinates':'Share coordinates',
 'Vietos tekstas kopijavimui':'Location text to copy',
 'Taškas pagal koordinates':'Point by coordinates',
 'Koordinačių sistema':'Coordinate system',
 'WGS84 (platuma, ilguma)':'WGS84 (latitude, longitude)',
 'X · šiaurė, m':'X · northing, m',
 'Y · rytai, m':'Y · easting, m',
 'Platuma (°)':'Latitude (°)',
 'Ilguma (°)':'Longitude (°)',
 'Rodyti tašką':'Show point',
 'Pašalinti tašką':'Remove point',
 'Įvesk LKS94 X ir Y koordinates.':'Enter LKS94 X and Y coordinates.',
 'Įvesk WGS84 platumą ir ilgumą.':'Enter WGS84 latitude and longitude.',
 'Atstumas iki taško':'Distance to point',
 'Kryptis į tašką':'Direction to point',
 'WGS84 platuma ir ilguma perskaičiuojamos į LKS94. Atstumas ir kampas skaičiuojami LKS94 plokštumoje pagal telefono vietą. 0° – tinklo šiaurė; tikslumą riboja telefono GPS.':'WGS84 latitude and longitude are converted to LKS94. Distance and bearing use the phone location in the LKS94 plane. 0° is grid north; accuracy is limited by the phone GPS.',
 'Taškai iš failo':'Points from file',
 'Taškų failas (TXT arba CSV)':'Point file (TXT or CSV)',
 'Rodyti taškų numerius':'Show point numbers',
 'Įkelk LKS94 taškus: numeris, X (šiaurė), Y (rytai), aukštis, pavadinimas (nebūtinas).':'Import LKS94 points: number, X (northing), Y (easting), height, optional name.',
 'Pašalinti taškus':'Remove points',
 'Atstumas iki pasirinkto taško':'Distance to selected point',
 'Rodyti privažiavimą':'Show driving route',
 'Pašalinti maršrutą':'Remove route',
 'Maršrutas skaičiuojamas pagal kelius, kai jo paprašai. Tam reikia interneto.':'A road route is calculated on request. Internet access is required.',
 'Kelių maršrutas: ':'Road route: ',
 'OpenStreetMap duomenys':'OpenStreetMap data',
 'Maršrutas gali baigtis ties artimiausiu privažiuojamu keliu.':'The route may end at the nearest accessible road.',
 'Objekto riba arba linija':'Site boundary or line',
 'Ribos failas (DWG, DXF, KML arba KMZ)':'Boundary file (DWG, DXF, KML or KMZ)',
 'CAD brėžinio koordinatės':'CAD drawing coordinates',
 'LKS94 (X rytai, Y šiaurė)':'LKS94 (X easting, Y northing)',
 'WGS84 (X ilguma, Y platuma)':'WGS84 (X longitude, Y latitude)',
 'CAD sluoksnis':'CAD layer',
 'Rodyti ribą žemėlapyje':'Show boundary on map',
 'Įkelk ribą arba liniją. KML / KMZ turi WGS84 koordinates; CAD failams pasirink brėžinio koordinačių sistemą.':'Import a boundary or line. KML / KMZ use WGS84; choose the drawing coordinate system for CAD files.',
 'Pašalinti ribą':'Remove boundary',
 'Rodomos DWG / DXF modelio erdvės LINE, POLYLINE, ARC ir CIRCLE linijos. Jei brėžinys turi kelis sluoksnius, pasirink norimą. „Civil 3D“ objektus, kurių ribų nesimato, pirmiausia eksportuok kaip paprastas CAD linijas. Naršyklėje DWG skaitytuvui atsisiųsti reikia interneto; APK skaitytuvas supakuotas.':'DWG / DXF model space LINE, POLYLINE, ARC and CIRCLE entities are shown. If the drawing has several layers, choose one. Export unsupported Civil 3D objects as ordinary CAD lines first. In a browser, downloading the DWG reader requires internet; the APK includes it.',
 'Kelio ašis':'Road alignment',
 'Ašies failas (LandXML, GeoJSON, GPX, CSV)':'Alignment file (LandXML, GeoJSON, GPX, CSV)',
 'Ašis XML faile':'Alignment in XML file',
 'Pradinis piketas, m':'Starting chainage, m',
 'Piketo formatas':'Chainage format',
 'Įkelk Civil 3D LandXML ašį (LKS94 arba WGS84). Tinka ir WGS84 GeoJSON, GPX bei CSV. Failas saugomas tik šiame įrenginyje.':'Import a Civil 3D LandXML alignment (LKS94 or WGS84). WGS84 GeoJSON, GPX and CSV are also supported. The file is stored only on this device.',
 'Pašalinti ašį':'Remove alignment',
 'Rodyti vietą':'Show location',
 'Sustabdyti':'Stop',
 'Piketažas rodomas 1 m žingsniu. Atstumas iki ašies, kai jis mažesnis nei 15 m, rodomas 0,01 m žingsniu; toliau – 1 m žingsniu. LKS94 skaičiuojamos iš telefono WGS84 vietos; rodomi skaitmenys po kablelio nereiškia tokio GPS tikslumo. Ašis ir koordinatės lieka šiame įrenginyje, kol pats nepasirenki jų bendrinti. Žemėlapio fonui reikia interneto.':'Chainage is displayed to the nearest metre. Distances to the alignment below 15 m are displayed to 0.01 m; greater distances to the nearest metre. LKS94 is calculated from the phone’s WGS84 location; displayed decimals do not imply that level of GPS accuracy. The alignment and coordinates remain on this device unless you choose to share them. Map tiles require internet access.',
 'Privatumo informacija':'Privacy information',
 ' m · piketai pažymėti kas 100 m.':' m · chainage marks every 100 m.',
 'Pradinis piketas turi būti nuo −1 000 000 iki 1 000 000 m.':'Starting chainage must be between −1,000,000 and 1,000,000 m.',
 ' Didelės ašies nepavyko išsaugoti: po programėlės paleidimo ją reikės įkelti iš naujo.':' Large alignment could not be saved; import it again next time.',
 'Failas per didelis: XML iki 20 MB, kiti iki 1 MB.':'File too large: XML up to 20 MB; other files up to 1 MB.',
 ' Praleistos ašys: ':' Skipped alignments: ',
 'Nepavyko įkelti ašies: ':'Could not import alignment: ',
 'Ašis pašalinta. Gali įkelti kitą failą.':'Alignment removed. You can import another file.',
 'Laukiama vietos':'Waiting for location',
 'Už LKS94 srities':'Outside LKS94 coverage',
 'Taškas ties tavo vieta':'Point at your location',
 'Įvesk skaitines X ir Y koordinates.':'Enter numeric X and Y coordinates.',
 'Taškas nepatenka į LKS94 taikymo sritį Lietuvoje. Patikrink X ir Y eiliškumą.':'Point is outside the LKS94 area in Lithuania. Check the X and Y order.',
 'Tikslas':'Target',
 'Taškas žemėlapyje. Atstumas skaičiuojamas nuo telefono vietos.':'Point shown on map. Distance is calculated from your phone location.',
 'Taškas žemėlapyje. Laukiama telefono vietos matavimo.':'Point shown on map. Waiting for a phone location fix.',
 ' Nepavyko išsaugoti taško šiame įrenginyje.':' Point could not be saved on this device.',
 'Įvesk WGS84 platumą (53,89–56,45°) ir ilgumą (19,02–26,82°) šia tvarka.':'Enter WGS84 latitude (53.89–56.45°) and longitude (19.02–26.82°), in that order.',
 'Taškas pašalintas. Gali įvesti kitą.':'Point removed. You can enter another.',
 ' taškų':' points',
 ' · praleista netinkamų eilučių: ':' · invalid rows skipped: ',
 '. Paspausk tašką žemėlapyje.':'. Tap a point on the map.',
 ' Nepavyko išsaugoti taškų; kitą kartą failą reikės įkelti iš naujo.':' Points could not be saved; import the file again next time.',
 ' Vieta pasikeitė · paspausk „Atnaujinti maršrutą“.':' Location has changed · tap “Refresh route”.',
 'Pirma įjunk vietos nustatymą ir palauk GPS matavimo.':'Enable location first and wait for a GPS fix.',
 'Vietos matavimas pasenęs. Atnaujink savo vietą ir bandyk vėl.':'Location fix is out of date. Refresh your location and try again.',
 'Kelių maršrutui reikia interneto ryšio.':'An internet connection is required for road routing.',
 'Skaičiuojamas automobilio maršrutas…':'Calculating driving route…',
 'Maršrutų serveris neatsako (':'Routing server did not respond (',
 'Iki šio taško automobilio maršrutas nerastas.':'No driving route was found to this point.',
 'Gauti maršruto duomenys netinkami.':'Received route data is invalid.',
 'Privažiavimas keliais: ':'Driving route: ',
 ' · nuo kelio iki taško dar ~':' · from road to point another ~',
 ' m tiesiai.':' m straight-line.',
 'Atnaujinti maršrutą':'Refresh route',
 'Nepavyko pasiekti maršrutų serverio. Patikrink internetą.':'Could not reach the routing server. Check your connection.',
 ' Rodomas ankstesnis maršrutas.':' Showing the previous route.',
 'Taškas ':'Point ',
 'Failas per didelis (iki 2 MB).':'File too large (max 2 MB).',
 'Nepavyko įkelti taškų: ':'Could not import points: ',
 'Taškai pašalinti. Gali įkelti kitą failą.':'Points removed. You can import another file.',
 ' linijų':' lines',
 ' · praleista už Lietuvos ribų: ':' · skipped outside Lithuania: ',
 'Faile nėra matomų linijų.':'No visible lines in the file.',
 'Visi sluoksniai':'All layers',
 ' Nepavyko išsaugoti šiame įrenginyje; kitą kartą failą įkelk iš naujo.':' Could not save on this device; import the file again next time.',
 'Skaitomas ':'Reading ',
 'Nepavyko įkelti ribos: ':'Could not import boundary: ',
 'Riba pašalinta. Gali įkelti kitą failą.':'Boundary removed. You can import another file.',
 'Matavimas ':'Measurement ',
 ' · prieš ':' · ',
 'Duomenys neatnaujinami':'Data not updating',
 'Už LKS94 taikymo srities':'Outside LKS94 coverage',
 'Ašis · vietos koordinatės':'Ašis · location coordinates',
 'Matavimas: ':'Measurement: ',
 'Piketažas: ':'Chainage: ',
 'Atstumas iki ašies: ':'Distance to alignment: ',
 'Pasirink, kur siųsti koordinates.':'Choose where to share coordinates.',
 'Vietos tekstas perduotas bendrinimui.':'Location text passed to sharing.',
 'Koordinatės nukopijuotos. Įklijuok jas į SMS, žinutę ar el. laišką.':'Coordinates copied. Paste them into an SMS, message or email.',
 'Pažymėtas tekstas paruoštas kopijuoti.':'Selected text is ready to copy.',
 'Apie ±':'About ±',
 'Nėra duomenų':'No data',
 'Vieta atnaujinama':'Location updating',
 'Rodoma naujausia telefono pateikta vieta.':'Showing the latest phone location.',
 'Laukiama vietos duomenų.':'Waiting for location data.',
 'Vieta neatnaujinama':'Location not updating',
 'Vieta sustabdyta':'Location stopped',
 'Ieškoma vietos…':'Finding location…',
 'Šiame įrenginyje vietos nustatymas neprieinamas.':'Location is unavailable on this device.',
 'Vieta neprieinama':'Location unavailable',
 'Suteik vietos leidimą naršyklei ir bandyk dar kartą.':'Allow browser location access and try again.',
 'Vietos matavimas užtruko. Patikrink GPS ir bandyk dar kartą.':'Location fix timed out. Check GPS and try again.',
 'Nepavyko nustatyti vietos: ':'Could not get location: ',
 'Vietos stebėjimas sustabdytas.':'Location tracking stopped.',
 'Suteik vietos leidimą programėlei telefono nustatymuose.':'Allow location access for this app in your phone settings.',
 'Įjunk telefono vietos nustatymą (GPS) ir bandyk dar kartą.':'Turn on phone location (GPS) and try again.',
 'Nepavyko pradėti vietos matavimo. Patikrink vietos leidimą ir GPS.':'Could not start location tracking. Check location permission and GPS.',
 'Nėra programėlės tekstui bendrinti.':'No app is available to share text.',
 'Ieškoma palydovų…':'Searching for satellites…',
 'GPS imtuvas sustabdytas':'GPS receiver stopped',
 'Matomi ':'Visible ',
 ' · naudojami ':' · used ',
 ' · vid. ':' · avg. ',
 'Palydovų duomenys neprieinami':'Satellite data unavailable',
 'Palydovams reikia tikslios vietos leidimo':'Satellite data requires precise location permission',
 'Trūksta ašies segmento pradžios, pabaigos arba centro.':'Alignment segment start, end or centre is missing.',
 'nenurodyta':'unspecified',
 'Neteisingos LandXML koordinatės.':'Invalid LandXML coordinates.',
 'Kreivės centro ir galų geometrija nesutampa.':'Curve centre and endpoints are inconsistent.',
 'LandXML kreivės ilgis ir geometrija nesutampa.':'LandXML curve length and geometry are inconsistent.',
 'Ašis per ilga arba per daug detali.':'Alignment is too long or too detailed.',
 'Šio tipo perėjimo kreivė nepalaikoma: ':'Unsupported transition curve type: ',
 'Nepakanka klotoidės ilgio, spindulių ar krypties duomenų.':'Insufficient clothoid length, radius or direction data.',
 'LandXML klotoidės ilgis ir galai nesutampa.':'LandXML clothoid length and endpoints are inconsistent.',
 'LandXML su DTD ar išorinėmis esybėmis nepriimamas.':'LandXML with DTD or external entities is not accepted.',
 'Failas nėra taisyklingas LandXML.':'File is not valid LandXML.',
 'Neatpažinti LandXML matavimo vienetai. Reikia metrų, milimetrų arba pėdų.':'Unknown LandXML units. Use metres, millimetres or feet.',
 'Ašyje yra piketažo lūžių (StaEquation). Šios versijos skaičiavimui reikalingas XML be jų.':'Alignment contains station equations (StaEquation). This version requires XML without them.',
 'Nepalaikomas ašies segmentas: ':'Unsupported alignment segment: ',
 'Ašies segmentai nesusijungia.':'Alignment segments do not connect.',
 'Neatpažinta ašies koordinačių sistema. Palaikoma LKS94 (X,Y) arba WGS84.':'Unknown alignment coordinate system. Use LKS94 (X,Y) or WGS84.',
 'Pradinis piketas (staStart) turi būti nuo −1 000 000 iki 1 000 000 m.':'Starting chainage (staStart) must be between −1,000,000 and 1,000,000 m.',
 'LandXML faile nerasta Alignment / CoordGeom ašies.':'No Alignment / CoordGeom found in LandXML.',
 'Ašiai reikia 2–20 000 taškų.':'Alignment requires 2–20,000 points.',
 'Netinkamos WGS84 koordinatės (platuma, ilguma).':'Invalid WGS84 coordinates (latitude, longitude).',
 'Ašies ilgis turi būti nuo 1 m iki 2 000 km.':'Alignment length must be 1 m to 2,000 km.',
 'GeoJSON turi turėti vieną LineString liniją.':'GeoJSON must contain one LineString.',
 'CSV failas tuščias.':'CSV file is empty.',
 'CSV antraštėje turi būti lat ir lon stulpeliai.':'CSV header must contain lat and lon columns.',
 'Naudok LandXML, GeoJSON, GPX arba CSV failą.':'Use LandXML, GeoJSON, GPX or CSV.',
 'Pasirink TXT arba CSV failą.':'Choose a TXT or CSV file.',
 'Viename faile gali būti iki 5000 taškų.':'One file may contain up to 5,000 points.',
 'Nerasta tinkamų LKS94 taškų. Tikrinama tvarka: numeris, X, Y, aukštis, pavadinimas.':'No valid LKS94 points found. Expected: number, X, Y, height, name.',
 'Riboje per daug viršūnių (daugiausia 30 000).':'Too many boundary vertices (maximum 30,000).',
 'Nerasta LineString arba Polygon ribų Lietuvos teritorijoje. KML koordinatės turi būti WGS84.':'No LineString or Polygon boundaries found in Lithuania. KML coordinates must use WGS84.',
 'Riboje per daug viršūnių (daugiausia 30 000). Išsaugok tik reikiamus CAD sluoksnius.':'Too many boundary vertices (maximum 30,000). Keep only the required CAD layers.',
 'Nerasta ribų Lietuvos teritorijoje. Patikrink koordinačių sistemą, CAD modelio erdvę ir LINE / POLYLINE sluoksnius.':'No boundaries found in Lithuania. Check coordinate system, CAD model space and LINE / POLYLINE layers.',
 'KMZ skaitytuvas neįkeltas.':'KMZ reader is not loaded.',
 'KMZ archyve nėra KML failo.':'KMZ archive has no KML file.',
 'DXF skaitytuvas neįkeltas.':'DXF reader is not loaded.',
 'Nepavyko įkelti DWG skaitytuvo. Naršyklėje DWG failui reikia interneto; taip pat gali įkelti DXF.':'Could not load the DWG reader. A browser needs internet access for DWG; you can also import DXF.',
 'DWG formato nepavyko perskaityti. Pabandyk eksportuoti DXF iš CAD.':'Could not read DWG. Try exporting DXF from CAD.',
 'Pasirink DWG, DXF, KML arba KMZ failą.':'Choose a DWG, DXF, KML or KMZ file.',
 ' (ašyje)':' (on alignment)',
 'kairėje':'on the left',
 'dešinėje':'on the right',
 'ant ašies':'on alignment',
 'ašyje':'on alignment'
}));
const dictionary=window.AsisLanguage==='ru'?new Map(Object.entries(window.AsisRussian)):translations;
const keys=[...dictionary.keys()].sort((a,b)=>b.length-a.length);
const pattern=new RegExp(keys.map(key=>key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
function translate(value){return String(value).replace(pattern,match=>dictionary.get(match));}
window.AsisTranslate=translate;
const buttons=[...document.querySelectorAll('[data-language]')];
for(const button of buttons){
 button.setAttribute('aria-pressed',String(button.dataset.language===window.AsisLanguage));
 button.addEventListener('click',()=>{
  const next=button.dataset.language;
  if(next===window.AsisLanguage){document.querySelector('.language-switch').open=false;return;}
  sessionStorage.setItem('asis-resume-location',String(document.getElementById('start').disabled));
  localStorage.setItem('asis-language',next);
  location.reload();
 });
}
const selector=document.querySelector('.language-switch');
document.getElementById('languageFlag').src='flag-'+window.AsisLanguage+'.svg';
document.getElementById('languageCode').textContent=window.AsisLanguage.toUpperCase();
document.addEventListener('click',event=>{if(!selector.contains(event.target))selector.open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){selector.open=false;selector.querySelector('summary').focus();}});
if(window.AsisLanguage!=='lt'){
 document.title=window.AsisLanguage==='ru'?'Ašis · геодезическое местоположение':'Ašis · survey location';
 const privacy=document.querySelector('.privacy-link a');
 privacy.href=window.AsisLanguage==='ru'?'privacy.ru.html':'privacy.en.html';
 const translateNodes=root=>{
  if(root.nodeType===Node.TEXT_NODE){
   if(root.parentElement?.closest('[data-user-file]'))return;
   const value=translate(root.nodeValue);
   if(value!==root.nodeValue)root.nodeValue=value;
  }else if(root.nodeType===Node.ELEMENT_NODE && !root.closest('script,style')){
   if(root.hasAttribute('aria-label')&&!root.matches('.language-switch [data-language]'))
    root.setAttribute('aria-label',translate(root.getAttribute('aria-label')));
   for(const child of root.childNodes)translateNodes(child);
  }
 };
 translateNodes(document.body);
 new MutationObserver(changes=>{
  for(const change of changes){
   if(change.type==='characterData')translateNodes(change.target);
   else for(const node of change.addedNodes)translateNodes(node);
  }
 }).observe(document.body,{childList:true,characterData:true,subtree:true});
}
if(sessionStorage.getItem('asis-resume-location')==='true'){
 sessionStorage.removeItem('asis-resume-location');
 document.getElementById('start').click();
}else sessionStorage.removeItem('asis-resume-location');

