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

Ašis priima Civil 3D LandXML (LKS94 arba WGS84), WGS84 GeoJSON, GPX ir CSV (`lat,lon` arba `latitude,longitude`). `StaEquation` lūžiai šioje versijoje nepalaikomi. Ašies failas apdorojamas įrenginyje, o taškai išsaugomi vietinėje programėlės saugykloje, jei telpa į jos limitą. Žemėlapio fonas iš OpenStreetMap reikalauja interneto; koordinatės ir ašies skaičiavimas veikia ir be fono.

## Projekto struktūra

- `public/` – nepriklausoma statinė naršyklės versija ir jos ištekliai.
- `android/` – Android programa, kuri į APK tiesiogiai supakuoja `public/` failus; `WebViewAssetLoader` rodo juos saugiame lokaliame HTTPS adrese. Programėlė nesijungia prie ChatGPT/Sites serverio.
- Įdiegtos „Android“ programėlės vietą teikia telefono `LocationManager` (GPS ir, jei prieinamas, tinklo matavimai); naršyklinė peržiūra naudoja naršyklės vietos leidimą. Telefonui turi būti įjungta vietos nustatymo paslauga ir suteiktas programėlės vietos leidimas.
- `scripts/generate_icon.py` – Android ikonų generavimas iš tos pačios vizualinės geometrijos, kaip `public/icon.svg`.

Naršyklėje galima paleisti `python3 -m http.server 8000 -d public` ir atverti `http://localhost:8000`. Telefono naršyklėje vietos leidimui reikia HTTPS; Android versija vietinį turinį pateikia per saugų `appassets.androidplatform.net` originą.

## Android surinkimas

Atverkite `android/` katalogą Android Studio su JDK 17, Android SDK 36 ir Gradle 8.13. Debug versija: `gradle :app:assembleDebug` (arba GitHub Actions artefaktas `asis-debug-apk`). Tai atskiras paketas `lt.tyliaitpk.asis`, todėl gali būti įdiegtas šalia „Kur aš?“.

Google Play leidimui reikės nuoseklaus pasirašymo rakto, pasirašyto Android App Bundle (`.aab`), privatumo politikos viešo URL bei Play Console deklaracijų. Debug APK nėra Play leidimas. Pagalbinis `privacy.html` tekstas gali būti paskelbtas kaip privatumo politikos puslapis.

Vietos matavimas veikia tik kai programėlė atidaryta. Programėlė nesiunčia vietos į savo serverį ir automatiškai nebendrina jos su kitu asmeniu; pasirinkus bendrinimą, vietos tekstas perduodamas naudotojo pasirinktai programėlei. Žemėlapio plytelių užklausos siunčiamos OpenStreetMap, todėl plytelių serveris gali žinoti peržiūrimą žemėlapio sritį.
