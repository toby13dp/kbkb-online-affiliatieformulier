# Belgische Korfbalbond – Online affiliatieformulier

Nederlandstalige toepassing voor het invullen van het officiële affiliatieformulier van de Belgische Korfbalbond, met exacte Excel-naar-PDF-export en optionele handgeschreven digitale ondertekening.

## Exacte Excel-naar-PDF-export

De toepassing tekent de gewone formuliergegevens niet opnieuw op een vooraf gemaakte PDF. Bij iedere export gebeurt het volgende:

1. het officiële Excelbestand wordt als bron geladen en met SHA-256 gecontroleerd;
2. in een tijdelijke map wordt een kopie van het officiële `.xlsx`-bestand gemaakt;
3. uitsluitend de officiële formuliercellen worden in die tijdelijke kopie ingevuld;
4. LibreOffice Calc exporteert de ingevulde Excelkopie naar één A4-PDF;
5. de PDF wordt volledig ingelezen;
6. na een geslaagde export wordt de tijdelijke Excelkopie expliciet verwijderd;
7. bij digitale ondertekening worden de handgeschreven lijnen daarna als vectorpaden op de voorziene plaatsen in de PDF gezet.

Daardoor blijven de bestaande Excelopmaak, vakken, teksten, logo’s, pagina-instellingen en handtekeningzones behouden.

## Ondertekeningskeuze als laatste stap

Stap 5 staat onmiddellijk voor **Leegmaken** en **Officiële PDF opslaan**.

### Niet digitaal ondertekenen

De PDF wordt zonder digitale handtekening opgeslagen. De toepassing meldt dat het document daarna moet worden afgedrukt en onderaan links met pen moet worden ondertekend.

### Wel digitaal ondertekenen

Er verschijnt eerst de knop **Ondertekenen**. De tekenvelden worden daarna één voor één in liggende stand getoond. **Volgende** wordt pas gebruikt nadat het huidige veld is ingevuld. Bij het laatste veld verschijnt **Terug naar formulier** of **Terug naar formulier op computer**.

De volgende tekenvelden zijn verplicht:

- gemeente in het veld **Te**;
- datum in het vak na **de**;
- handtekening van de aanvrager;
- volledige naam van de aanvrager.

Het datumveld toont de zichtbare celverdeling van het officiële Excelvak zodat de datumcijfers in afzonderlijke vakken kunnen worden geschreven.

Wanneer de aanvrager jonger is dan 18 jaar worden ook deze velden verplicht:

- eigenhandig geschreven **Gezien voor akkoord**;
- handtekening van de wettelijke vertegenwoordiger;
- volledige naam van de wettelijke vertegenwoordiger.

Deze drie tekeningen worden onder elkaar geplaatst in de officiële zone voor de wettelijke vertegenwoordiger.

De functie legt een grafische handtekening vast. Dit is niet automatisch een gekwalificeerde elektronische handtekening; de ontvangende organisatie bepaalt of deze vorm voor haar procedure volstaat.

## Werking per toestel

### Mobiel formulier

Na **Ondertekenen** opent een schermvullende tekenwizard. De browser probeert liggende schermstand en fullscreen te activeren. Wanneer een browser geen programmatische oriëntatievergrendeling toestaat, blokkeert de wizard in portretstand en vraagt hij het toestel horizontaal te draaien.

### Desktop of laptop

Bij digitale ondertekening verschijnt een popup met:

- QR-code;
- URL voor het mobiele toestel;
- verbindingsstatus.

Na het scannen opent een aparte mobiele pagina met de tekenvelden één voor één. De laatste knop verzendt de tekeningen naar het geopende formulier op de computer. De tijdelijke sessie blijft maximaal **30 minuten** in het servergeheugen.

## Lokaal starten

Vereisten:

- Python 3;
- LibreOffice Calc.

Windows:

```text
start-windows.bat
```

macOS of Linux:

```bash
chmod +x start-macos-linux.sh
./start-macos-linux.sh
```

Rechtstreeks:

```bash
python3 run_local.py
```

De toepassing opent standaard op:

```text
http://127.0.0.1:8765/
```

Voor de QR-koppeling moeten computer en mobiel toestel op hetzelfde vertrouwde netwerk zitten. Windows Firewall kan vragen om Python toegang tot het privénetwerk te geven.

## GitHub Pages met online backend

GitHub Pages publiceert de statische interface op:

```text
https://toby13dp.github.io/kbkb-online-affiliatieformulier/
```

GitHub Pages kan zelf geen Pythonproces of LibreOffice uitvoeren. GitHub Actions kan een backend bouwen en implementeren, maar een workflow-run is geen permanente webserver. Daarom bestaat de online architectuur uit twee delen:

1. **GitHub Pages** voor de interface;
2. **een permanente containerhost** voor `hosted_server.py` en LibreOffice.

De workflow `.github/workflows/publish-backend-image.yml` bouwt en publiceert de backendcontainer naar:

```text
ghcr.io/toby13dp/kbkb-affiliatie-backend:latest
```

De container verwacht onder meer:

```text
KBKB_FRONTEND_URL=https://toby13dp.github.io/kbkb-online-affiliatieformulier
PORT=8765
```

Na deployment van de container moet in GitHub bij **Settings → Secrets and variables → Actions → Variables** deze repositoryvariabele worden ingesteld:

```text
KBKB_API_BASE=https://jouw-backend-domein.example
```

De Pages-workflow neemt die waarde op in `assets/js/runtime-config.js`. Daarna gebruikt de Pages-versie dezelfde Excel-export- en ondertekenings-API als de lokale toepassing.

Een GitHub-token mag nooit in de publieke Pages-JavaScriptcode worden geplaatst om `workflow_dispatch` te starten. Zonder permanente containerhost kan de online export niet veilig en betrouwbaar werken.

## Belangrijkste bestanden

```text
.
├── .github/workflows/
│   ├── deploy-pages.yml
│   └── publish-backend-image.yml
├── assets/
│   ├── css/
│   │   ├── styles.css
│   │   ├── signature.css
│   │   └── signature-wizard.css
│   └── js/
│       ├── runtime-config.js
│       ├── signature-flow.js
│       ├── signature-wizard.js
│       ├── signature-mobile.js
│       ├── signature-pad.js
│       ├── signature-pad-registry.js
│       ├── pdf-export.js
│       └── pdf-signature.js
├── Dockerfile
├── hosted_server.py
├── local_server.py
├── run_local.py
├── xlsx_patch.py
├── index.html
└── sign.html
```

## Privacy

- tijdelijke Excelkopieën staan uitsluitend in een tijdelijke systeemmap;
- de tijdelijke Excelkopie wordt na succesvolle PDF-export verwijderd;
- ondertekeningssessies blijven maximaal 30 minuten in het servergeheugen;
- gebruik voor online hosting HTTPS en één vaste backendinstantie;
- er is geen database, analytics of afzonderlijke opslag van handtekeningafbeeldingen.

Zie [docs/PRIVACY.md](docs/PRIVACY.md) voor de volledige technische toelichting.
