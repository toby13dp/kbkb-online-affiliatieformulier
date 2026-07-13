# Veldmapping naar het Excel-sjabloon

De toepassing schrijft gegevens naar `xl/worksheets/sheet1.xml` in het ingebouwde `.xlsx`-sjabloon.

## Type aansluiting

| Formulierveld | Excel-cel | Waarde |
|---|---:|---|
| Competitiespeler | `I8` | `X` |
| Recreant | `T8` | `X` |
| Adherent | `AA8` | `X` |
| Occasioneel korfballer | `AH8` | `X` |

## Aanvrager

| Formulierveld | Excel-cel |
|---|---:|
| Vereniging | `I11` |
| Naam | `B15` |
| Voornaam | `Y15` |
| Nationaliteit | `B19` |
| Geboortedag | `P19` |
| Geboortemaand | `S19` |
| Geboortejaar | `V19` |
| Rijksregisternummer — eerste 6 cijfers | `AD19` |
| Rijksregisternummer — volgende 3 cijfers | `AK19` |
| Rijksregisternummer — controlecijfers | `AO19` |
| Straat | `B23` |
| Huisnummer | `AC23` |
| Bus | `AK23` |
| Postcode | `F25` |
| Gemeente | `T25` |
| Geslacht vrouw | `B29` |
| Geslacht man | `H29` |
| Vorige korfbalclub | `R29` |

## Wettelijke vertegenwoordiger

Deze velden worden alleen ingevuld wanneer de aanvrager jonger dan 18 jaar is.

| Formulierveld | Excel-cel |
|---|---:|
| Naam en voornaam | `L33` |
| Geboortedag | `J35` |
| Geboortemaand | `M35` |
| Geboortejaar | `P35` |
| Nationaliteit | `AC35` |
| Straat | `E37` |
| Huisnummer | `AF37` |
| Bus | `AN37` |
| Postcode | `F39` |
| Gemeente | `S39` |
| Verwantschap | `Q41` |

## Vorige buitenlandse club

Deze velden worden alleen ingevuld wanneer de optie voor een vorige buitenlandse club is geselecteerd.

| Formulierveld | Excel-cel |
|---|---:|
| Gemeente | `I47` |
| Land | `I49` |
| Naam vorige club | `I51` |
| Toenmalig adres | `B55` |

## Niet digitaal ingevulde onderdelen

De volgende onderdelen blijven bewust leeg voor verdere administratieve of handmatige verwerking:

- datum aansluiting;
- lidnummer;
- handtekening van de aanvrager;
- handtekening van de wettelijke vertegenwoordiger;
- stempel en handtekening van de clubsecretaris.
