# LEK Infrastruktur — selvhostet Supabase (låst v0.8.3)

Flyttbar infrastruktur for LEK-Biens Vokter og LEK-VarroaScan.
Fire 100 % adskilte miljøer på én server, basert på den offisielle
Supabase self-hosted Docker-løsningen.

## Låst versjon

`.supabase-version` pinnér til `self-hosted/v0.8.3`
(commit `bc27d2661edd09a5d0b8d76ce33da6d4071a756e`). Alle image-tagger
følger denne taggen, så miljøet kan gjenskapes bit for bit.

## Miljøer og porter

| Miljø | Prosjekt | Gateway | DB | Pooler (tx) | Domene |
|-------|----------|---------|----|-------------|--------|
| biens-staging  | lek-biens-staging  | 8000 | 5432 | 6543 | api-staging.lekbie.no |
| biens-prod     | lek-biens-prod     | 8100 | 5433 | 6544 | api.lekbie.no |
| varroa-staging | lek-varroa-staging | 8200 | 5434 | 6545 | varroa-api-staging.lekbie.no |
| varroa-prod    | lek-varroa-prod    | 8300 | 5435 | 6546 | varroa-api.lekbie.no |

Hvert miljø har egen mappe (`envs/<navn>/`) med egne volumer, hemmeligheter
og edge-functions. Ingen data deles.

## Serverkrav

Per miljø (offisielle minimumstall): 4 GB RAM, 2 kjerner, 40 GB SSD.

| Totalt (4 miljøer) | Minimum | Anbefalt |
|---|---|---|
| RAM | 16 GB | 32 GB |
| CPU | 8 kjerner | 12–16 kjerner |
| Disk | 160 GB SSD | 300 GB+ SSD |

- OS: Ubuntu 22.04/24.04 LTS
- Programvare: Docker Engine 24+, Docker Compose v2, git, openssl, jq, python3, curl

## Installasjon på ny server

```bash
sudo mkdir -p /opt/lek-infra && sudo chown $USER /opt/lek-infra
cd /opt/lek-infra            # kopier infra/ hit
bash scripts/fetch-official.sh
for e in biens-staging biens-prod varroa-staging varroa-prod; do
  bash scripts/create-env.sh "$e"
done
# Kopier edge-functions fra VarroaScan-repoet:
cp -R "/sti/til/LEK_VarroaScan/supabase/functions/"* edge-functions/
# Rediger envs/<miljø>/.env (SMTP) og overrides/varroa-functions.yml (Roboflow)
bash scripts/setup-firewall.sh
bash scripts/start-all.sh
```

## Lokal test (Mac)

```bash
bash scripts/fetch-official.sh
bash scripts/create-env.sh biens-staging-test
bash scripts/start-all.sh biens-staging-test
# Kjør seed via db-klient, deretter:
bash scripts/test-staging.sh biens-staging-test
bash scripts/verify-stack.sh biens-staging-test
```

## Migrering fra Supabase Cloud

```bash
bash scripts/migrate-from-cloud.sh biens-staging boeoxzqayyezybzbmvve
# Test grundig. Produksjon røres IKKE før staging er verifisert.
```

## Røyktest (verify-stack.sh)

```bash
bash scripts/verify-stack.sh            # alle miljøer
bash scripts/verify-stack.sh biens-staging   # ett miljø
```

Testen er **kun lesende** og kan kjøres når som helst på nytt. Den sjekker:

| Test | Endepunkt | Metode |
|------|-----------|--------|
| Database/API | `/rest/v1/` | GET (service-nøkkel) |
| Autentisering | `/auth/v1/health` | GET |
| Fillagring | `/storage/v1/bucket` | GET (service-nøkkel) |
| Edge Functions | `/functions/v1/varroa-infer` | OPTIONS (varroa-miljøer) |

Resultat: `PASS`/`FAIL` med HTTP-kode og forklaring per miljø.
Exit-kode 1 hvis noe feiler.

## Backup / restore / flytting

```bash
bash scripts/backup.sh                 # alle miljøer
bash scripts/restore.sh biens-staging backups/<stamp>/biens-staging
bash scripts/package-for-move.sh       # komplett flytte-pakke
```

## Sikkerhet

- Gateway, DB og pooler er interne; kun 80/443 skal være offentlige.
- HTTPS settes opp med en front-proxy (Caddy) som ruter per domene til
  hvert miljøs gateway-port, eller med offisiell `docker-compose.caddy.yml`.
- Alle hemmeligheter genereres av offisielle utilities + `openssl`.
- `.env`-filer har rettighet 600 og er i `.gitignore`.
