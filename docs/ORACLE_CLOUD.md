# Oracle Cloud Always Free – productie-installatie

Deze handleiding koppelt de GitHub Pages-interface aan een permanente Oracle Cloud-VM met Docker, Caddy, Python en LibreOffice Calc.

## 1. Oracle Cloud-account en regio

Maak één Oracle Cloud Free Tier-account aan. Kies de home region zorgvuldig: Always Free-compute kan alleen in die home region worden aangemaakt.

Voor dit project is de aanbevolen VM:

```text
Image: Ubuntu 24.04 Minimal aarch64
Shape: VM.Standard.A1.Flex
OCPU: 2
Geheugen: 12 GB
Boot volume: 50 GB
```

Gebruik geen grotere totale A1-configuratie wanneer het account na de proefperiode Always Free moet blijven.

Wanneer A1-capaciteit tijdelijk niet beschikbaar is, probeer later opnieuw of kies bij de accountregistratie een andere nabije Europese home region.

## 2. VM maken

Ga in Oracle Cloud naar:

```text
Compute → Instances → Create instance
```

Stel in:

- een herkenbare naam, bijvoorbeeld `kbkb-affiliatie`;
- Ubuntu 24.04 voor Arm/aarch64;
- `VM.Standard.A1.Flex` met 2 OCPU en 12 GB geheugen;
- een nieuwe of bestaande VCN met publieke subnet;
- **Assign a public IPv4 address** ingeschakeld;
- een nieuw SSH-sleutelpaar of een bestaande publieke SSH-sleutel.

Bewaar de private SSH-sleutel veilig. Plaats deze nooit in de repository en deel hem niet via chat of e-mail.

## 3. Netwerkpoorten openen

Voeg in de Security List of Network Security Group van de VM ingressregels toe voor:

| Protocol | Poort | Bron |
|---|---:|---|
| TCP | 22 | bij voorkeur alleen het eigen IP-adres |
| TCP | 80 | `0.0.0.0/0` |
| TCP | 443 | `0.0.0.0/0` |

Caddy gebruikt poort 80 voor certificaatvalidatie en poort 443 voor HTTPS.

## 4. Docker installeren

Maak vanaf de eigen computer verbinding:

```bash
chmod 400 /pad/naar/oracle-ssh.key
ssh -i /pad/naar/oracle-ssh.key ubuntu@PUBLIEK_IP
```

Voer op de VM uit:

```bash
curl -fsSL \
  https://raw.githubusercontent.com/toby13dp/kbkb-online-affiliatieformulier/main/scripts/oracle_bootstrap.sh \
  -o oracle_bootstrap.sh
chmod +x oracle_bootstrap.sh
./oracle_bootstrap.sh
exit
```

Meld daarna opnieuw aan zodat het lidmaatschap van de Docker-groep actief is:

```bash
ssh -i /pad/naar/oracle-ssh.key ubuntu@PUBLIEK_IP
docker version
docker compose version
exit
```

## 5. Gratis domeinnaam koppelen

Voor automatische HTTPS is een domeinnaam nodig. Een gratis mogelijkheid is DuckDNS.

Voorbeeld:

```text
kbkb-affiliatie.duckdns.org
```

Laat het DuckDNS-record verwijzen naar het publieke IPv4-adres van de Oracle-VM.

Een gereserveerd Oracle public IP-adres is aanbevolen wanneer het adres ook na het vervangen van de VM gelijk moet blijven.

Controleer vóór deployment:

```bash
nslookup kbkb-affiliatie.duckdns.org
```

Het resultaat moet het publieke IP-adres van de Oracle-VM tonen.

## 6. GitHub Secrets instellen

Open de repository en ga naar:

```text
Settings → Secrets and variables → Actions
```

Maak onder **Secrets** deze waarden aan:

```text
ORACLE_HOST
```

Waarde: het publieke IPv4-adres van de VM.

```text
ORACLE_USER
```

Waarde voor de Ubuntu-image:

```text
ubuntu
```

```text
ORACLE_SSH_PRIVATE_KEY
```

Waarde: de volledige inhoud van de private SSH-sleutel, inclusief de regels `BEGIN` en `END`.

Maak onder **Variables** deze waarden aan:

```text
KBKB_BACKEND_DOMAIN=kbkb-affiliatie.duckdns.org
```

```text
KBKB_API_BASE=https://kbkb-affiliatie.duckdns.org
```

Gebruik geen afsluitende `/`.

## 7. Backend implementeren

Open:

```text
Actions → Deploy backend to Oracle Cloud → Run workflow
```

De workflow:

1. valideert de configuratie;
2. verstuurt de repository naar de Oracle-VM via SSH;
3. bouwt de Python/LibreOffice-container;
4. start de backend en Caddy met Docker Compose;
5. vraagt automatisch een TLS-certificaat aan;
6. controleert `/api/status`.

Controleer daarna:

```text
https://kbkb-affiliatie.duckdns.org/api/status
```

De JSON-uitvoer moet onder meer bevatten:

```json
{
  "local_server": true,
  "hosted_backend": true,
  "exact_excel_export": true,
  "session_ttl_seconds": 1800
}
```

## 8. GitHub Pages opnieuw bouwen

Voer daarna uit:

```text
Actions → Deploy GitHub Pages → Run workflow
```

De Pages-workflow neemt `KBKB_API_BASE` op in de frontend. Daarna gebruikt:

```text
https://toby13dp.github.io/kbkb-online-affiliatieformulier/
```

de Oracle-backend voor:

- tijdelijke Excelkopieën;
- LibreOffice Excel-naar-PDF-export;
- mobiele QR-ondertekeningssessies van 30 minuten.

## 9. Updates

Nieuwe commits aan relevante backendbestanden starten automatisch de Oracle-deploymentworkflow. De backend wordt opnieuw gebouwd en zonder handmatige Dockercommando’s vervangen.

## Belangrijke beveiligingspunten

- gebruik uitsluitend HTTPS voor de backend;
- beperk SSH-poort 22 indien mogelijk tot het eigen IP-adres;
- bewaar de private SSH-sleutel alleen lokaal en als versleuteld GitHub Secret;
- plaats nooit persoonsgegevens of gegenereerde PDF’s in de repository;
- maak regelmatig een nieuwe SSH-sleutel wanneer toegang niet langer nodig is;
- de ondertekeningssessies staan in het geheugen van één VM en vervallen na 30 minuten.
