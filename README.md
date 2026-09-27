# Ašis

Atskira geodezinė Android programėlė: vieta žemėlapyje, GNSS palydovai, interneto būsena, Civil 3D LandXML ašis, piketažas ir atstumas iki ašies. Gyvo vietos bendrinimo, orų, adreso paieškos ir greičio rodmenų nėra.

## Ką rodo

- Koordinatės WGS84, telefono pateikiamas vietos tikslumas.
- Apytikslės LKS94 (EPSG:3346) koordinatės X (šiaurė), Y (rytai) perskaičiuojamos iš telefono WGS84 vietos Lietuvos teritorijoje; skaitmenys po kablelio nėra telefono GPS tikslumo įvertis.
- Pasirinktos LandXML ašies piketažas 1 m rodymo žingsniu; 0+00 arba 0+000 formatas. Palaikomi ir neigiami pradiniai piketai (pvz., PK -0+20 arba PK -0+020).
- Atstumas iki ašies su (k)/(d) pagal ašies kryptį: iki 15 m rodomi du skaitmenys po kablelio, nuo 15 m – sveiki metrai. Skaitmenys po kablelio nereiškia centimetro GPS tikslumo.
- 100 m piketai, raudona ašis ir atkarpa iki artimiausio ašies taško.
- Matomų ir naudojamų GNSS palydovų skaičius, jų vidutinis C/N₀; interneto tipas ir mobiliojo signalo lygis, jei leidžia telefonas bei naudotojo leidimai.
- Paspaudus „Bendrinti koordinates“, Android atveria sistemos bendrinimo meniu tekstui nusiųsti SMS, žinučių ar el. pašto programėle. Tekste yra matavimo laikas, WGS84 ir LKS94; jei ašis įkelta, pridedamas piketažas bei atstumas su (d)/(k). Naršyklėje naudojamas įrenginio bendrinimas, o jei jis nepasiekiamas, tekstas nukopijuojamas arba parodomas kopijavimui.
- Galima įvesti atskirą tašką LKS94 (X – šiaurė, Y – rytai) arba WGS84 (platuma, ilguma) koordinatėmis. Žemėlapyje rodomas mėlynas taikinys ir linija nuo paskutinės telefono vietos, skaičiuojamas plokštuminis atstumas bei azimutas pagal LKS94 tinklo šiaurę. Taškinis tikslas išsaugomas įrenginyje ir veikia nepriklausomai nuo kelio ašies. Taško įvedimo, taškų failo ir kelio ašies skiltys iš pradžių suskleistos, o palietus antraštę išsiskleidžia.
- Galima įkelti TXT (tarpais atskirti stulpeliai) arba CSV (kableliais atskirti stulpeliai) LKS94 taškus `numeris, X, Y, aukštis, pavadinimas`. Pavadinimas neprivalomas. Taškai matomi žemėlapyje; paspaudus vieną rodomos jo koordinatės, aukštis ir atnaujinamas horizontalus atstumas nuo telefono. Įkelti taškai saugomi tik įrenginyje, jei telpa vietinėje saugykloje.
- Objekto ribą ar liniją galima įkelti kaip KML / KMZ (WGS84) arba DWG / DXF (LKS94 arba WGS84). CAD faile skaitomos modelio erdvės LINE, LWPOLYLINE, POLYLINE, ARC ir CIRCLE linijos; CAD X reiškia rytus / ilgumą, Y – šiaurę / platumą. Jei brėžinyje yra keli sluoksniai, galima pasirinkti vieną. Ribos rodomos violetine spalva ir neturi įtakos kelio ašies piketažui. Civil 3D specialiuosius objektus reikia eksportuoti kaip paprastas linijas. Jei koordinatės nepatenka į Lietuvą, importas atmetamas. Importas vyksta įrenginyje; naršyklė DWG skaitytuvą atsisiunčia iš jsDelivr, o APK jį turi įdiegtą.
- Pasirinktam taškui galima pagal pareikalavimą apskaičiuoti automobilio maršrutą kelių tinklu: parodoma mėlyna linija ir privažiavimo atstumas. Maršrutui reikia interneto; dabartinė ir tikslinė vieta siunčiamos FOSSGIS OSRM maršrutų paslaugai tik paspaudus maršruto mygtuką. Jei taškas nutolęs nuo kelio, tarpas nuo kelio iki taško rodomas atskirai. Pajudėjus maršrutą reikia atnaujinti mygtuku.

Ašis priima Civil 3D LandXML (LKS94 arba WGS84), WGS84 GeoJSON, GPX ir CSV (`lat,lon` arba `latitude,longitude`). `StaEquation` lūžiai šioje versijoje nepalaikomi. Ašies failas apdorojamas įrenginyje, o taškai išsaugomi vietinėje programėlės saugykloje, jei telpa į jos limitą. Žemėlapio fonas iš OpenStreetMap reikalauja interneto; koordinatės ir ašies skaičiavimas veikia ir be fono.

## Projekto struktūra

- `public/` – nepriklausoma statinė naršyklės versija ir jos ištekliai.
- `android/` – Android programa, kuri į APK tiesiogiai supakuoja `public/` failus; `WebViewAssetLoader` rodo juos saugiame lokaliame HTTPS adrese. Programėlė nesijungia prie ChatGPT/Sites serverio.
- Įdiegtos „Android“ programėlės vietą teikia telefono `LocationManager` (GPS ir, jei prieinamas, tinklo matavimai); naršyklinė peržiūra naudoja naršyklės vietos leidimą. Telefonui turi būti įjungta vietos nustatymo paslauga ir suteiktas programėlės vietos leidimas.
- `scripts/generate_icon.py` – Android ikonų generavimas iš tos pačios vizualinės geometrijos, kaip `public/icon.svg`.
- Ribos importui naudojami vietoje supakuoti [LibreDWG Web 0.7.14](https://github.com/mlightcad/libredwg-web) (GPL-3.0; licencija `public/vendor/libredwg/COPYING`), [dxf-parser 1.1.2](https://github.com/gdsestimating/dxf-parser) (MIT) ir [JSZip 3.10.1](https://github.com/Stuk/jszip) (MIT/GPLv3). Bibliotekų šaltinis ir jų kūrimo instrukcijos pateiktos nurodytose saugyklose; šios programėlės šaltinis yra šioje saugykloje.

Naršyklėje galima paleisti `python3 -m http.server 8000 -d public` ir atverti `http://localhost:8000`. Telefono naršyklėje vietos leidimui reikia HTTPS; Android versija vietinį turinį pateikia per saugų `appassets.androidplatform.net` originą.

## Android surinkimas

Atverkite `android/` katalogą Android Studio su JDK 17, Android SDK 36 ir Gradle 8.13. Debug versija: `gradle :app:assembleDebug` (arba GitHub Actions artefaktas `asis-debug-apk`). Tai atskiras paketas `lt.tyliaitpk.asis`, todėl gali būti įdiegtas šalia „Kur aš?“.

Google Play leidimui reikės nuoseklaus pasirašymo rakto, pasirašyto Android App Bundle (`.aab`), privatumo politikos viešo URL bei Play Console deklaracijų. Debug APK nėra Play leidimas. Pagalbinis `privacy.html` tekstas gali būti paskelbtas kaip privatumo politikos puslapis.

Vietos matavimas veikia tik kai programėlė atidaryta. Programėlė nesiunčia vietos į savo serverį ir automatiškai nebendrina jos su kitu asmeniu; pasirinkus bendrinimą, vietos tekstas perduodamas naudotojo pasirinktai programėlei. Žemėlapio plytelių užklausos siunčiamos OpenStreetMap, todėl plytelių serveris gali žinoti peržiūrimą žemėlapio sritį.
