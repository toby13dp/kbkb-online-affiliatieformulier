# Privacy en gegevensverwerking

## Lokale verwerking

De exacte PDF-export wordt uitgevoerd door `run_local.py` op het toestel van de gebruiker. Het formulier verstuurt de ingevulde cellen uitsluitend naar deze lokale server via dezelfde lokale oorsprong.

Er is geen externe formulierdatabase, gebruikersaccount, analyticsdienst of cloudopslag.

## Tijdelijke Excelkopie

Bij iedere export:

1. wordt het officiële Excelbestand gecontroleerd met een vaste SHA-256;
2. wordt in een tijdelijke systeemmap een nieuwe `.xlsx`-kopie gemaakt;
3. worden de formuliercellen in die kopie ingevuld;
4. zet LibreOffice Calc de ingevulde kopie om naar PDF;
5. wordt de PDF in het geheugen gelezen;
6. wordt de tijdelijke Excelkopie na de succesvolle export expliciet verwijderd;
7. ruimt het tijdelijke systeemdirectorymechanisme ook de overige conversiebestanden op.

De tijdelijke Excelkopie wordt nooit naar GitHub of een externe conversiedienst geüpload.

## Digitale tekeningen op een mobiel toestel

Wanneer een computer via een QR-code met een mobiel toestel wordt gekoppeld:

- werken beide toestellen via de lokale server op hetzelfde netwerk;
- bevat de URL een willekeurige sessiecode van 192 bits;
- worden alleen de getekende lijnen verzonden;
- worden de lijnen uitsluitend tijdelijk in het servergeheugen bewaard;
- vervalt de sessie automatisch na 30 minuten;
- wordt de sessie na ontvangst en verwerking verwijderd;
- wordt niets in een database of bestand opgeslagen.

De lokale verbinding gebruikt standaard HTTP. Gebruik de QR-koppeling daarom uitsluitend op een vertrouwd privé- of thuisnetwerk. Andere apparaten op een onbeveiligd netwerk mogen de sessie-URL niet kunnen onderscheppen.

## Mobiele tekengegevens

De tekenvelden worden één voor één in liggende stand getoond. De volgende eigenhandige tekeningen kunnen worden verwerkt:

- gemeente;
- datum, met zichtbare celverdeling zoals in het officiële Excelvak;
- handtekening van de aanvrager;
- volledige naam van de aanvrager;
- bij een minderjarige: “Gezien voor akkoord”;
- bij een minderjarige: handtekening van de wettelijke vertegenwoordiger;
- bij een minderjarige: volledige naam van de wettelijke vertegenwoordiger.

De browser plaatst deze lijnen als vectorpaden in de officiële PDF. De toepassing bewaart geen afzonderlijke handtekeningafbeeldingen.

## Juridische aard

De functie legt een grafische, handgeschreven handtekening vast. Dit is niet automatisch een gekwalificeerde elektronische handtekening in de zin van eIDAS. De organisatie die het formulier ontvangt, bepaalt of deze ondertekeningswijze voor haar procedure volstaat.

## Gevoelige persoonsgegevens

De tijdelijke Excelkopie en PDF kunnen onder andere bevatten:

- naam en voornaam;
- geboortedatum;
- nationaliteit;
- adres;
- geslacht;
- Belgisch rijksregisternummer;
- gegevens van een wettelijke vertegenwoordiger;
- informatie over een vorige korfbalclub;
- handgeschreven digitale tekeningen.

Behandel de PDF als een vertrouwelijk document.

## GitHub Pages en GitHub Actions

GitHub Pages publiceert alleen statische HTML-, CSS- en JavaScriptbestanden. Een GitHub Actions-run kan de site bouwen of een backend implementeren, maar blijft zelf geen permanente HTTP-server die per bezoeker Excelbestanden omzet of een ondertekeningssessie 30 minuten openhoudt.

Een publieke Pages-pagina mag daarom geen persoonlijk GitHub-token bevatten om workflows te starten. Voor online gebruik is een afzonderlijke permanente backend nodig die door GitHub Actions kan worden gebouwd en naar een gekozen hostingplatform kan worden uitgerold.

Voor de weergave van de QR-code wordt de openbare `qrcodejs`-bibliotheek via jsDelivr geladen. De QR-code wordt in de browser gemaakt; formuliergegevens en tekeningen worden niet naar jsDelivr gestuurd. Zonder deze bibliotheek blijft de URL zichtbaar en bruikbaar.
