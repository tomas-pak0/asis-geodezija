# Ašis – Google Play leidimas

## Šios versijos duomenys

- Programos ID: `lt.tyliaitpk.asis`
- Versija: 0.3.0; `versionCode 14`
- `targetSdk 36` (Android 16), `minSdk 26`
- Vieša privatumo politika: https://tomas-pak0.github.io/asis-geodezija/public/privacy.html
- Privatumo klausimams: https://github.com/tomas-pak0/asis-geodezija/issues/new
- Play App Signing: pirmojo įkėlimo metu pasirinkti „Google-generated app signing key“. AAB pasirašytas atskiru įkėlimo raktu.

## Kas paruošta

GitHub Actions `Android packages` surenka derinimo APK ir **nepasirašytą** `asis-unsigned-aab` paketą. Į Google Play keliamas tik `Asis-0.3.0-play.aab` – jis pasirašytas `Asis-upload-key.p12` raktu. Šio rakto ir slaptažodžio niekada nekelti į GitHub. Abu išsaugoti atskirais privačiais failais naudotojo failų saugykloje. Pasidaryti savo atsarginę kopiją.

Ateities leidimams padidinti `versionCode`, GitHub Actions parsisiųsti naują `asis-unsigned-aab`, pasirašyti tuo pačiu raktu ir įkelti į Play Console. Jei prireiktų pasirašyti rankiniu būdu su JDK:

```bash
jarsigner -keystore Asis-upload-key.p12 -storetype PKCS12 \
  -storepass:file Asis-upload-key-password.txt \
  -signedjar Asis-play.aab app-release.aab asis-upload
jarsigner -verify -verbose -certs Asis-play.aab
```

Slaptažodžio failas turi būti laikomas privačiai (pvz., `chmod 600`). „Google Play“ įdiegtos versijos parašas skirsis nuo ankstesnio derinimo APK. Android gali reikalauti pašalinti seną APK; pašalinus prarandami jame saugomi įkelti failai ir taškai, todėl juos iš anksto išsisaugoti.

## Play Console užpildymas

1. Sukurti naują programą „Ašis“ ir nurodyti `lt.tyliaitpk.asis`; pirmą AAB įkelti į vidinio testavimo kanalą.
2. Įkelti `Asis-0.3.0-play.aab`; įjungti „Play App Signing“, pasirinkti „Google-generated app signing key“. Įkėlimo rakto sertifikatas bus patvirtintas pagal šį AAB.
3. Pridėti parduotuvės ikoną (512 × 512 PNG), grafinę antraštę (1024 × 500 PNG) ir bent dvi tikras dabartinės programėlės telefono ekrano nuotraukas. Aprašymo juodraščiai – `play/STORE_LISTING.md`. Ekrano nuotraukose nerodyti privačių koordinačių ar projektų.
4. Privatumo politikos URL: https://tomas-pak0.github.io/asis-geodezija/public/privacy.html. „App content“ skiltyje užpildyti vietos leidimų pagrindimą, „Data safety“, tikslinę auditoriją, turinio įvertinimą ir kitus Play Console klausimynus.
5. Vietos koordinatės apdorojamos įrenginyje; žemėlapio plytelių užklausos siunčiamos OpenStreetMap ir gali atskleisti peržiūrimą vietovę bei IP. Tik paprašius privažiavimo, dabartinės vietos ir taško koordinatės siunčiamos FOSSGIS OSRM. Tik naudotojui paspaudus bendrinimą, koordinačių tekstas perduodamas pasirinktai programai. Tai įvertinti pildant „Data safety“; nedeklaruoti aklai „jokių duomenų nerenkama“.
6. Jei asmeninė kūrėjo paskyra sukurta po 2023-11-13, prieš gamybinį leidimą Play gali reikalauti uždaro testo ir atskiro leidimo gamybai. Po vidinio testo surinkti tikrų įrenginių nuotraukas ir patikrinti vietą, importą, kelių maršrutą, LT/EN bei privatumo puslapį.

Kainą, šalis ir galutinį kūrėjo profilio pavadinimą pasirenka paskyros savininkas Play Console. Šis rinkinys nėra automatiškai paskelbtas „Google Play“.
