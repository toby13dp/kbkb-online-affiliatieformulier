# Privacy en gegevensverwerking

## Verwerking in de browser

Het KBKB Online Affiliatieformulier verwerkt alle ingevoerde gegevens lokaal in het browsergeheugen. Er is geen backend, database, analytics-script of externe formulierdienst aanwezig.

De toepassing:

- verstuurt geen formuliergegevens naar GitHub;
- verstuurt geen formuliergegevens naar De Prins Design of een andere server;
- bewaart geen formuliergegevens in `localStorage`, `sessionStorage`, cookies of IndexedDB;
- maakt uitsluitend na een expliciete klik een lokaal downloadbaar PDF-bestand;
- wist de actuele formulierinhoud wanneer de pagina wordt gesloten, vernieuwd of handmatig leeggemaakt.

## GitHub Pages

Bij gebruik via GitHub Pages levert GitHub alleen de statische bestanden van de toepassing aan de browser. De ingevulde veldwaarden worden door de applicatiecode niet naar GitHub teruggestuurd.

GitHub kan voor de levering van de website technische serverlogs verwerken, zoals een IP-adres, browsertype en tijdstip. Dit staat los van de inhoud die in het formulier wordt ingevuld.

## Gevoelige gegevens

Het formulier kan onder andere de volgende persoonsgegevens bevatten:

- naam en voornaam;
- geboortedatum;
- nationaliteit;
- adres;
- geslacht;
- Belgisch rijksregisternummer;
- gegevens van een wettelijke vertegenwoordiger;
- informatie over een vorige korfbalclub.

Een ingevulde PDF moet daarom als vertrouwelijk document worden behandeld. Gebruik beveiligde opslag en een geschikt verzendkanaal.

## Afdrukken en ondertekenen

De toepassing voegt onderaan de PDF handtekeningvakken toe. De gebruiker moet de PDF na het downloaden afdrukken en de vereiste handtekening(en) met pen plaatsen. Een niet-ondertekende PDF is nog niet volledig afgewerkt.

## Geen automatische bewaring

De toepassing bevat bewust geen conceptopslag. Dit verkleint het risico dat gevoelige persoonsgegevens langdurig op een gedeeld toestel achterblijven.
