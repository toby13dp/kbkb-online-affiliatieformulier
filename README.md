# KBKB Online Affiliatieformulier

Een statische webtoepassing waarmee een gebruiker het affiliatieformulier van de Koninklijke Belgische Korfbalbond invult en als printklare PDF exporteert.

## Belangrijkste kenmerken

- volledig client-side: er is geen backend of database;
- persoonsgegevens verlaten de browser niet;
- export naar een overzichtelijke A4-PDF via het afdrukvenster;
- validatie van verplichte velden, geboortedatum en Belgisch rijksregisternummer;
- automatische velden voor een wettelijke vertegenwoordiger bij minderjarigen;
- aanvullende velden voor een vorige buitenlandse korfbalclub;
- aparte handtekeningvakken voor aanvrager, wettelijke vertegenwoordiger en clubsecretaris;
- responsive werking op desktop, tablet en Android;
- bruikbaar via GitHub Pages en als lokaal HTML-bestand.

## Belangrijk: afdrukken en ondertekenen

Na het invullen:

1. Klik op **PDF maken**.
2. Kies in het afdrukvenster **Opslaan als PDF**.
3. Bewaar het document.
4. Druk de opgeslagen PDF af.
5. Plaats onderaan de vereiste handtekening(en) met pen.

Een opgeslagen maar niet ondertekende PDF is nog niet volledig afgewerkt.

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
4. Klik op **PDF maken**.
5. Kies **Opslaan als PDF** in het afdrukvenster.
6. Druk de PDF daarna af en onderteken onderaan.

Er is geen installatie, buildstap of internetverbinding nodig.

## Projectstructuur

```text
.
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js
│       ├── form.js
│       ├── main.js
│       └── pdf.js
├── docs/
│   ├── PRIVACY.md
│   └── VELDENMAPPING.md
├── .gitignore
├── .nojekyll
├── index.html
└── README.md
```

## Technische werking

De toepassing:

- valideert de invoer volledig in de browser;
- bouwt een afzonderlijke printklare A4-weergave op;
- opent automatisch het afdrukvenster;
- gebruikt de documenttitel als voorstel voor de PDF-bestandsnaam;
- bevat geen externe analytics-, formulier- of opslagdienst.

De gebruiker kiest in het afdrukvenster **Opslaan als PDF**. Hierdoor blijft de oplossing volledig lokaal en werkt ze ook offline.

## Ondersteunde browsers

Gebruik een recente versie van:

- Google Chrome;
- Microsoft Edge;
- Mozilla Firefox;
- een actuele Chromium-browser op Android.

Pop-ups moeten voor de pagina toegestaan zijn, omdat de printklare PDF-weergave in een nieuw venster wordt geopend.

## Privacy en beveiliging

De toepassing verzendt geen ingevulde gegevens naar GitHub, een server of een externe API. Zie [docs/PRIVACY.md](docs/PRIVACY.md) voor de technische privacy-uitleg.

Een geëxporteerde PDF kan gevoelige persoonsgegevens en een rijksregisternummer bevatten. Bewaar en deel het bestand uitsluitend via geschikte, beveiligde kanalen.
