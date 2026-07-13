# Belgische Korfbalbond – Online affiliatieformulier

Nederlandstalige toepassing voor het invullen van het officiële affiliatieformulier van de Belgische Korfbalbond, met correcte Excel-naar-PDF-export en optionele handgeschreven digitale ondertekening.

## Correcte PDF-export

De toepassing tekent de formuliergegevens niet opnieuw op een vooraf gemaakte PDF. Bij iedere export gebeurt lokaal het volgende:

1. het officiële Excelbestand wordt als bron geladen en met SHA-256 gecontroleerd;
2. er wordt in een tijdelijke map een nieuwe kopie van het officiële Excelbestand gemaakt;
3. uitsluitend de officiële formuliercellen worden in die tijdelijke kopie ingevuld;
4. LibreOffice Calc exporteert die ingevulde Excelkopie naar PDF;
5. de PDF wordt volledig ingelezen;
6. na een geslaagde export wordt de tijdelijke `.xlsx` expliciet verwijderd;
7. bij digitale ondertekening worden de handgeschreven lijnen daarna op de voorziene plaatsen in de PDF gezet.

Daardoor blijven de bestaande Excelopmaak, vakken, teksten, logo’s, pagina-instellingen en handtekeningzones behouden.

## Ondertekeningskeuze

Stap 5 van het formulier staat onmiddellijk voor de knoppen **Leegmaken** en **Officiële PDF opslaan**.

### Niet digitaal ondertekenen

De PDF wordt zonder handtekening opgeslagen. De toepassing meldt duidelijk dat het document eerst moet worden afgedrukt en onderaan links met pen moet worden ondertekend.

### Wel digitaal ondertekenen

De volgende gegevens worden als eigenhandig getekende lijnen opgenomen:

- gemeente in het veld **Te**;
- datum in het veld **de**;
- handtekening van de aanvrager onder de datum;
- volledige naam van de aanvrager onder de handtekening.

Wanneer de aanvrager jonger is dan 18 jaar worden drie extra tekenvelden verplicht:

- eigenhandig geschreven **Gezien voor akkoord**;
- handtekening van de wettelijke vertegenwoordiger;
- volledige naam van de wettelijke vertegenwoordiger.

Deze drie tekeningen worden onder elkaar geplaatst onder de officiële tekst over de wettelijke vertegenwoordiger.

## Werking per toestel

### Mobiel toestel

De tekenvelden verschijnen rechtstreeks als onderdeel van het formulier. Tekenen kan met een vinger of stylus.

### Desktop of laptop

Er verschijnt een popup met:

- een QR-code;
- een lokale URL;
- de verbindingsstatus.

Na het scannen opent op het mobiele toestel een aparte pagina die uitsluitend de tekenvelden en de knop **Verzenden naar computer** bevat. De computer ontvangt de tekenlijnen en toont een voorbeeld voordat de PDF wordt opgeslagen.

Beide toestellen moeten op hetzelfde vertrouwde lokale netwerk zitten. Een tijdelijke ondertekeningssessie wordt alleen in het geheugen van de lokale server bewaard en vervalt na 15 minuten.

## Windows starten

Vereisten:

- Python 3;
- LibreOffice Calc.

Start daarna:

```text
start-windows.bat
```

De toepassing opent automatisch in de browser op:

```text
http://127.0.0.1:8765/
```

Bij de eerste netwerktoegang kan Windows Firewall vragen of Python toegang tot het privénetwerk mag krijgen. Sta dit toe om de QR-koppeling met een mobiel toestel te gebruiken.

## macOS of Linux starten

```bash
chmod +x start-macos-linux.sh
./start-macos-linux.sh
```

Of rechtstreeks:

```bash
python3 local_server.py
```

Een andere poort gebruiken:

```bash
python3 local_server.py --port 9000
```

Een afwijkend LibreOffice-programma instellen:

```text
LIBREOFFICE_PATH=/pad/naar/soffice
```

Een lokaal officieel Excelbestand instellen:

```text
KBKB_TEMPLATE_PATH=/pad/naar/4322_Affiliatieformulier_PC.xlsx
```

Het Excelbestand wordt alleen geaccepteerd wanneer de SHA-256 overeenkomt met:

```text
7247a8dc44c6d79099918cfedc0be6e8238c231c7a4c1543168152ebaf7477cf
```

## GitHub Pages

De publieke interface wordt gepubliceerd op:

```text
https://toby13dp.github.io/kbkb-online-affiliatieformulier/
```

GitHub Pages is statische hosting en kan geen lokaal geïnstalleerde LibreOffice-versie starten. De exacte Excel-naar-PDF-export en de lokale QR-overdracht werken daarom via `local_server.py`. Op de Pages-versie verschijnt bij export een duidelijke instructie om de lokale toepassing te starten.

## Projectstructuur

```text
.
├── .github/workflows/deploy-pages.yml
├── assets/
│   ├── css/
│   │   ├── styles.css
│   │   └── signature.css
│   ├── img/
│   │   └── logo-part-*.b64
│   └── js/
│       ├── form.js
│       ├── main.js
│       ├── pdf-export.js
│       ├── pdf-signature.js
│       ├── signature-crypto.js
│       ├── signature-flow.js
│       ├── signature-mobile.js
│       ├── signature-pad.js
│       └── signing-copy.js
├── docs/
│   ├── PRIVACY.md
│   └── VELDENMAPPING.md
├── scripts/build_site.py
├── index.html
├── sign.html
├── local_server.py
├── start-windows.bat
└── start-macos-linux.sh
```

## Privacy

- formuliergegevens worden alleen naar de lokale server op hetzelfde toestel verstuurd;
- de tijdelijke Excelkopie staat uitsluitend in een tijdelijke systeemmap;
- de tijdelijke Excelkopie wordt na succesvolle PDF-export verwijderd;
- digitale tekeningen worden bij een desktopkoppeling alleen tijdelijk in het servergeheugen bewaard;
- er is geen database, account, analytics of externe formulieropslag;
- de QR-codebibliotheek wordt via jsDelivr geladen; er worden daarbij geen formulier- of tekengegevens naar de CDN gestuurd.

Zie [docs/PRIVACY.md](docs/PRIVACY.md) voor de volledige technische toelichting.
