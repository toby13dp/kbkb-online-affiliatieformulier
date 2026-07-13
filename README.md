# Belgische Korfbalbond – Online affiliatieformulier

Een statische Nederlandstalige webtoepassing waarmee een gebruiker het officiële affiliatieformulier digitaal invult en als PDF downloadt.

De PDF gebruikt **de rechtstreeks uit het oorspronkelijke Excelbestand geëxporteerde pagina als vaste template**. Daardoor blijven de originele opmaak, vakken, juridische tekst, KBKB-identiteit, contactgegevens en handtekeningzones visueel ongewijzigd.

## Belangrijkste kenmerken

- Belgische Korfbalbond-branding met het aangeleverde Korfbal België-logo;
- volledig client-side: geen backend, database of formulierdienst;
- persoonsgegevens verlaten de browser niet;
- PDF-uitvoer met exact dezelfde achtergrond als het officiële Excel-formulier;
- invulling op de oorspronkelijke veldposities;
- validatie van verplichte velden en Belgisch rijksregisternummer;
- automatische gegevens voor een wettelijke vertegenwoordiger bij minderjarigen;
- aanvullende velden voor een vorige buitenlandse korfbalclub;
- responsive werking op desktop, tablet en Android;
- geen externe JavaScript- of PDF-bibliotheken nodig tijdens het gebruik.

## Verplichte vervolgstap

Na het invullen:

1. Klik op **Officiële PDF opslaan**.
2. Open en controleer het gedownloade bestand.
3. Druk de PDF af.
4. Plaats onderaan de vereiste handtekening(en) met pen.
5. Laat de clubsecretaris waar nodig stempelen en ondertekenen.

Een gedownloade maar niet ondertekende PDF is nog niet volledig afgewerkt.

## GitHub Pages

De Pages-workflow downloadt de door KBKB gedeelde Excelbron, controleert de vaste SHA-256, bouwt daaruit de officiële PDF-template en publiceert daarna de statische site.

Na een succesvolle deployment is de toepassing beschikbaar op:

`https://toby13dp.github.io/kbkb-online-affiliatieformulier/`

GitHub Pages moet bij **Settings → Pages → Build and deployment** op **GitHub Actions** staan.

## Lokale build

Vereisten:

- Python 3;
- LibreOffice Calc;
- internettoegang tot de door KBKB gedeelde Excelbron.

Bouw de site met:

```bash
python3 scripts/build_site.py
```

Open daarna:

```text
_site/index.html
```

De build reconstrueert het logo en de PDF-exportcode uit opgesplitste tekstbestanden. Vervolgens worden onder meer deze bestanden gemaakt:

```text
_site/assets/img/korfbal-belgium.webp
_site/assets/js/pdf-exact.js
_site/assets/js/pdf-template.js
_site/assets/templates/4322_Affiliatieformulier_PC.pdf
```

## Projectstructuur

```text
.
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── img/
│   │   └── logo-part-*.b64
│   └── js/
│       ├── form.js
│       ├── main.js
│       └── pdf-exact-part-*.jsfrag
├── docs/
│   ├── PRIVACY.md
│   └── VELDENMAPPING.md
├── scripts/
│   └── build_site.py
├── index.html
└── README.md
```

## Technische werking

1. `scripts/build_site.py` downloadt het exacte originele `.xlsx`-bestand en controleert SHA-256 `7247a8dc44c6d79099918cfedc0be6e8238c231c7a4c1543168152ebaf7477cf`.
2. LibreOffice Calc exporteert het werkblad naar één officiële A4-PDF.
3. Die PDF wordt als Base64 opgenomen in de Pages-build.
4. De browser voegt alleen de ingevulde waarden toe via een incrementele PDF-update.
5. De oorspronkelijke PDF-inhoud wordt niet herschreven of gerasterd.

Een export zonder ingevulde velden is bij een rendervergelijking pixelidentiek aan de uit Excel gegenereerde PDF-template.

## Privacy

Zie [docs/PRIVACY.md](docs/PRIVACY.md). De toepassing gebruikt geen `localStorage`, cookies, analytics of externe formulierverwerking.
