# Veldmapping naar de PDF-uitvoer

De toepassing neemt de gevalideerde formuliergegevens over in een lokaal opgebouwd PDF 1.4-document. De PDF wordt volledig in de browser gegenereerd.

## Aanvraag

| Formulierveld | PDF-onderdeel |
|---|---|
| Affiliatievorm | Sectie **Aanvraag** — veld **Affiliatie als** |
| Vereniging | Sectie **Aanvraag** — veld **Vereniging** |

## Aanvrager

| Formulierveld | PDF-onderdeel |
|---|---|
| Naam | Sectie **Gegevens van de aanvrager** — veld **Naam** |
| Voornaam | Sectie **Gegevens van de aanvrager** — veld **Voornaam** |
| Nationaliteit | Veld **Nationaliteit** |
| Geboortedatum | Veld **Geboortedatum**, weergegeven als `dd/mm/jjjj` |
| Rijksregisternummer | Veld **Rijksregisternummer**, met opgemaakte scheidingstekens |
| Straat, nummer en bus | Samengevoegd in veld **Adres** |
| Postcode en gemeente | Samengevoegd in veld **Postcode en gemeente** |
| Geslacht | Veld **Geslacht** |
| Vorige korfbalclub | Veld **Vorige korfbalclub** |

## Wettelijke vertegenwoordiger

Deze sectie wordt alleen toegevoegd wanneer de aanvrager op basis van de geboortedatum jonger dan 18 jaar is.

| Formulierveld | PDF-onderdeel |
|---|---|
| Naam en voornaam | Veld **Naam en voornaam** |
| Geboortedatum | Veld **Geboortedatum** |
| Nationaliteit | Veld **Nationaliteit** |
| Straat, nummer en bus | Samengevoegd in veld **Adres** |
| Postcode en gemeente | Samengevoegd in veld **Postcode en gemeente** |
| Verwantschap | Veld **Verwantschap** |

De PDF bevat voor een minderjarige ook een apart handtekeningvak voor de wettelijke vertegenwoordiger met de vermelding **Voorafgegaan door “Gezien voor akkoord”**.

## Vorige buitenlandse club

Deze sectie wordt alleen toegevoegd wanneer de optie **De vorige club was in het buitenland** is geselecteerd.

| Formulierveld | PDF-onderdeel |
|---|---|
| Naam vorige club | Veld **Naam vorige club** |
| Vestigingsgemeente | Veld **Vestigingsgemeente** |
| Land | Veld **Land** |
| Toenmalig adres | Veld **Toenmalig adres aanvrager** |

## Niet digitaal ingevulde onderdelen

De volgende onderdelen blijven bewust leeg voor verdere administratieve of handmatige verwerking:

- datum aansluiting;
- lidnummer;
- plaats van ondertekening;
- datum van ondertekening;
- handtekening van de aanvrager;
- handtekening van de wettelijke vertegenwoordiger indien van toepassing;
- stempel en handtekening van de clubsecretaris.

## Verplichte vervolgstap

De PDF bevat een opvallende melding dat het document na de download moet worden afgedrukt. De vereiste handtekeningen moeten onderaan met pen worden geplaatst. Een niet-ondertekende PDF is nog niet volledig afgewerkt.
