# KBKB Online Affiliatieformulier

Een statische webtoepassing waarmee een gebruiker het affiliatieformulier van de Koninklijke Belgische Korfbalbond invult en lokaal als een nieuwe Excel-kopie (`.xlsx`) downloadt.

## Belangrijkste kenmerken

- volledig client-side: er is geen backend of database;
- persoonsgegevens verlaten de browser niet;
- het oorspronkelijke Excel-sjabloon is in `index.html` ingebouwd;
- behoud van de bestaande Excel-opmaak, het logo, beveiliging en afdrukinstellingen;
- validatie van verplichte velden, geboortedatum en Belgisch rijksregisternummer;
- automatische velden voor een wettelijke vertegenwoordiger bij minderjarigen;
- aanvullende velden voor een vorige buitenlandse korfbalclub;
- responsive werking op desktop, tablet en Android;
- bruikbaar via GitHub Pages en als lokaal HTML-bestand.

## Online gebruiken

Na een succesvolle GitHub Pages-deployment is de toepassing beschikbaar op:

`https://toby13dp.github.io/kbkb-online-affiliatieformulier/`

Wanneer GitHub Pages nog niet actief is:

1. Open de repository op GitHub.
2. Ga naar **Settings** → **Pages**.
3. Kies bij **Build and deployment** als bron **GitHub Actions**.
4. Open **Actions** en start zo nodig de workflow **Deploy GitHub Pages**.

## Lokaal gebruiken

1. Download of clone deze repository.
2. Open `index.html` in een recente versie van Chrome, Edge of Firefox.
3. Vul het formulier in.
4. Klik op **Excel-kopie opslaan**.
5. De browser bewaart de ingevulde `.xlsx`-kopie in de downloadmap.

Er is geen installatie, buildstap of internetverbinding nodig.

## Projectstructuur

```text
.
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── docs/
│   ├── PRIVACY.md
│   └── VELDENMAPPING.md
├── template/
│   └── 4322_Affiliatieformulier_PC.xlsx
├── .gitignore
├── .nojekyll
├── index.html
└── README.md
```

## Technische werking

`index.html` bevat:

- de volledige gebruikersinterface en styling;
- het Excel-sjabloon als Base64-data;
- een lokale ZIP/XLSX-lezer en -schrijver;
- de veldmapping naar het eerste werkblad;
- validatie en conditionele formuliersecties;
- lokale bestandsdownload via de browser.

Bij het opslaan wordt een nieuwe Excel-werkmap in het browsergeheugen opgebouwd. De oorspronkelijke werkmap in de repository wordt niet gewijzigd.

## Ondersteunde browsers

Gebruik een recente versie van:

- Google Chrome;
- Microsoft Edge;
- Mozilla Firefox;
- een actuele Chromium-browser op Android.

De browser moet `CompressionStream` en `DecompressionStream` ondersteunen.

## Privacy en beveiliging

De toepassing verzendt geen ingevulde gegevens naar GitHub, een server of een externe API. Zie [docs/PRIVACY.md](docs/PRIVACY.md) voor de technische privacy-uitleg.

Let op: een ingevuld Excel-bestand kan gevoelige persoonsgegevens en een rijksregisternummer bevatten. Bewaar en deel het bestand uitsluitend via geschikte, beveiligde kanalen.

## Excel-sjabloon

Het oorspronkelijke bestand staat als naslag in:

`template/4322_Affiliatieformulier_PC.xlsx`

De werkende toepassing gebruikt echter de in `index.html` ingebouwde versie. Bij vervanging van het sjabloon moet ook de ingebouwde Base64-data en zo nodig de veldmapping worden bijgewerkt.
