# Veldmapping naar het officiële Excelbestand en de PDF

De formuliergegevens worden eerst in een tijdelijke kopie van `4322_Affiliatieformulier_PC.xlsx` geschreven. LibreOffice Calc exporteert vervolgens die ingevulde Excelkopie naar PDF. Alleen digitale tekeningen worden daarna als vectorpaden aan de PDF toegevoegd.

## Formuliergegevens in Excel

| Formulierveld | Excel-cel |
|---|---:|
| Competitiespeler | `I8` |
| Recreant | `T8` |
| Adherent | `AA8` |
| Occasioneel korfballer | `AH8` |
| Vereniging | `I11` |
| Naam | `B15` |
| Voornaam | `Y15` |
| Nationaliteit | `B19` |
| Geboortedatum | `P19`, `S19`, `V19` |
| Rijksregisternummer | `AD19`, `AK19`, `AO19` |
| Straat | `B23` |
| Huisnummer | `AC23` |
| Bus | `AK23` |
| Postcode | `F25` |
| Gemeente | `T25` |
| Vrouw | `B29` |
| Man | `H29` |
| Vorige korfbalclub | `R29` |
| Naam wettelijke vertegenwoordiger | `L33` |
| Geboortedatum wettelijke vertegenwoordiger | `J35`, `M35`, `P35` |
| Nationaliteit wettelijke vertegenwoordiger | `AC35` |
| Straat wettelijke vertegenwoordiger | `E37` |
| Huisnummer wettelijke vertegenwoordiger | `AF37` |
| Bus wettelijke vertegenwoordiger | `AN37` |
| Postcode wettelijke vertegenwoordiger | `F39` |
| Gemeente wettelijke vertegenwoordiger | `S39` |
| Verwantschap | `Q41` |
| Vestigingsgemeente buitenlandse club | `I47` |
| Land buitenlandse club | `I49` |
| Naam buitenlandse club | `I51` |
| Toenmalig adres | `B55` |

## Digitale tekeningen in de PDF

De tekeningen worden niet als getypte tekst ingevuld. De oorspronkelijke bewegingen van vinger of stylus worden als zwarte vectorlijnen in de PDF opgenomen.

| Tekening | Plaats in officieel document |
|---|---|
| Gemeente | Regel na **Te** |
| Datum | Vak na **de** |
| Handtekening aanvrager | Vrije ruimte onmiddellijk onder de datum |
| Volledige naam aanvrager | Onmiddellijk onder de handtekening van de aanvrager |
| “Gezien voor akkoord” | Eerste regel onder de tekst voor de wettelijke vertegenwoordiger |
| Handtekening wettelijke vertegenwoordiger | Onder “Gezien voor akkoord” |
| Volledige naam wettelijke vertegenwoordiger | Onder de handtekening van de wettelijke vertegenwoordiger |

De drie velden voor de wettelijke vertegenwoordiger worden alleen vereist en opgenomen wanneer de aanvrager op de exportdatum jonger dan 18 jaar is.

## Niet digitaal ingevuld

De volgende onderdelen blijven voor administratieve verwerking of de club bestemd:

- datum aansluiting;
- lidnummer;
- stempel en handtekening van de clubsecretaris.

Bij de keuze **Niet digitaal ondertekenen** blijven ook gemeente, datum en handtekeningzones leeg en moet de PDF worden afgedrukt en met pen worden ondertekend.

## Verwijdering tijdelijke Excelkopie

Na een geslaagde LibreOffice-export leest de lokale server de PDF in het geheugen en verwijdert hij de tijdelijke `.xlsx` expliciet. De tijdelijke map wordt bij het beëindigen van de export volledig opgeruimd.
