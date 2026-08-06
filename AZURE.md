# Infraestrutura

```
Assinatura   Microsoft Azure Sponsorship (BTS Consulting)
             2fffc0d6-babb-47fd-9c94-2329adf1dcf0
Tenant       a83a9085-15cb-4498-b40f-f670c65350cf
Grupo        rg-casamento-luanaemarcos
Região       brazilsouth
```

O crédito da Sponsorship cobre o consumo. As decisões abaixo continuam
valendo mesmo assim — crédito acaba, e arquitetura enxuta não dá trabalho
depois.

## O que foi cortado, e por quê

| Saiu | Entrou | Economia/mês |
|---|---|---|
| Azure Container Registry Basic | GitHub Container Registry | R$ 30 |
| Key Vault | secrets do Container Apps | ~R$ 10 |
| Blob Storage | fotos em `public/`, dentro da imagem | R$ 5 |
| Container Apps Job | GitHub Actions agendado | R$ 15 |

## O banco voltou para o Azure

O plano original era Neon, para fugir dos R$ 130/mês do PostgreSQL Flexible. Com a assinatura Sponsorship, esse era o único motivo — e ele caiu.

O que se ganha ao trazer de volta:

- **Some o cold start.** O compute do Neon hiberna; o Flexible Server não. A primeira tela de Pix depois de horas parado deixa de levar 15 segundos.
- **Mesma região do app.** Banco e Container Apps em `brazilsouth`, latência de milissegundos em vez de atravessar nuvens.
- **Backup automático** de 7 dias, sem configurar nada.

`Standard_B1ms` no tier Burstable é a menor máquina que existe. Sobra para 110 convidados: o tráfego real são alguns picos de minutos, na véspera do RSVP e na semana dos presentes.

O `db.ts` não mudou uma linha — sempre foi connection string, de propósito. Trocar de provedor é trocar a env.

## O único gasto real

`minReplicas: 1`, com 0,25 vCPU. Com `minReplicas: 0` o projeto fica inteiramente dentro do grant gratuito do Container Apps — os primeiros 180.000 vCPU-segundos, 360.000 GiB-segundos e 2 milhões de requisições por assinatura, por mês. Uma revisão escalada a zero não gera cobrança.

O preço de escalar a zero é um cold start de 5 a 15 segundos. Numa tela de pagamento Pix, isso custa mais do que os R$ 30. A réplica ociosa roda quase todo o mês na taxa ociosa, algo em torno de 30 a 40% da ativa.

## Acesso ao banco

A liberação de firewall é `AllowAzureServices` — a regra especial `0.0.0.0`, que autoriza recursos do próprio Azure. O Container Apps no plano Consumo sai por IPs que não dá para prever, então não existe faixa a fixar. **O que protege o banco é a senha, não a origem.**

Para rodar o DDL da sua máquina, você precisa liberar seu IP temporariamente:

```bash
az postgres flexible-server firewall-rule create \
  -g rg-casamento-luanaemarcos -n pg-casamento \
  --rule-name meu-ip --start-ip-address <seu-ip> --end-ip-address <seu-ip>
```

E removê-la depois. O `/api/saude` continua consultando o banco: sem hibernação para acordar, ele agora serve ao propósito original — não subir revisão que não fala com o Postgres.

## Estado

| | |
|---|---|
| App no ar | `https://ca-casamento.thankfuldesert-78409711.brazilsouth.azurecontainerapps.io` |
| Imagem | `ghcr.io/marcos-ferreira-cbf/luanaemarcos` — **pacote público** |
| Identidade do CI | `gh-casamento`, appId `11fb7866-36f2-4390-9c87-f6f9e5b3c4e5` |
| Zona DNS | `marcoseluana.social.br` no grupo `BTS_DNS`, delegada e resolvendo |
| Falta | certificado gerenciado sair de `Pending`, 4 secrets no GitHub |

O pacote no GHCR é público de propósito: o repositório já é, e a imagem não
carrega segredo nenhum — tudo entra por env em tempo de execução. Pull anônimo
significa nenhum token para girar, vazar ou esquecer.

## Ordem de execução

Não há GitHub CLI nesta máquina, então os passos que envolvem o GitHub são pela web.

**1. Repositório** — já criado: `Marcos-Ferreira-cbf/luanaemarcos`.

**2. Azure** — grupo de recursos e infraestrutura via Bicep. O `subir.ps1` lê os
segredos do `.env.local` em vez de recebê-los na linha de comando, onde ficariam
no histórico do shell:

```powershell
az login
az group create -n rg-casamento-luanaemarcos -l brazilsouth
pwsh infra/subir.ps1 -Imagem ghcr.io/marcos-ferreira-cbf/luanaemarcos:<sha>
```

**3. Banco** — rodar `db/schema.sql` e `db/seed.sql` contra o servidor criado.

**4. Identidade federada para o CI** — feito. O App Registration `gh-casamento`
tem Contributor no grupo e uma credencial federada para `refs/heads/main`, então
o push loga no Azure sem senha nenhuma no repositório.

**5. Secrets no GitHub** — em *Settings → Secrets and variables → Actions*:

| Secret | Valor |
|---|---|
| `AZURE_CLIENT_ID` | `11fb7866-36f2-4390-9c87-f6f9e5b3c4e5` |
| `AZURE_TENANT_ID` | `a83a9085-15cb-4498-b40f-f670c65350cf` |
| `AZURE_SUBSCRIPTION_ID` | `2fffc0d6-babb-47fd-9c94-2329adf1dcf0` |
| `CRON_SECRET` | o mesmo do `.env.local` |

São só esses quatro, e já estão cadastrados. `DATABASE_URL` e os segredos do Mercado Pago vivem nos secrets do Container App, montados pelo Bicep — o workflow só troca a imagem, então não precisa vê-los.

Enquanto eles não existiam, toda run terminava vermelha no passo *Login no Azure*. Vale saber ler esse vermelho: o build e o push da imagem acontecem **antes** do login, então a imagem ficava publicada no GHCR mesmo com a run falhando, e o `az containerapp update` era feito na mão. Run vermelha não significa, necessariamente, imagem ausente.

**6. Domínio** — a zona `marcoseluana.social.br` está no Azure DNS (grupo
`BTS_DNS`) e o registro.br já delegou para `ns1-08.azure-dns.com` e companhia.
Resolvendo pela internet: `A` no apex para o IP estático do ambiente, `CNAME` no
`www`, e os `asuid` TXT que provam a posse.

```powershell
pwsh infra/dominio.ps1
```

O script cria o certificado gerenciado (grátis) e amarra apex e `www`. Os dois
estão `SniEnabled` e servindo HTTPS.

**O apex valida por HTTP, não por TXT.** Isso custou caro para descobrir. Por
TXT existe um ovo-e-galinha — o token do `_acme-challenge` só sai na saída do
`bind`, mas a emissão precisa do TXT já publicado — e, pior, cada `bind` emite
um certificado novo com token novo, deixando o anterior em `Pending` para
sempre. Certificado `Pending` não se recupera; só se apaga. Duas tentativas
com o TXT publicado e confirmado no Google e no Cloudflare ficaram 25 minutos
em `Pending` sem sair do lugar. Por HTTP não há token: o desafio é servido
pelo próprio app, no IP que o registro `A` já aponta. Saiu em ~10 minutos, de
primeira.

Outra pegadinha, no `bind` manual: `--certificate` quer o *resource id*
inteiro do managed certificate, não o nome. Com o nome ele responde `does not
exist`, o que é enganoso — o certificado está lá.

O `APP_URL` é o que vai no `notification_url` de cada cobrança. O padrão do
Bicep já é `https://<dominio>`, então depois que o domínio está no ar o
`subir.ps1` acerta sozinho; o `-UrlPublica` só serve para o período em que o
DNS ainda não resolvia e era preciso apontar para o FQDN do próprio Container
App.

## Deploy

`git push` na `main` builda, publica no GHCR e sobe uma nova revisão. Ver [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

O nome da imagem é forçado para minúsculas no workflow: `github.repository` é
`Marcos-Ferreira-cbf/...` e nome de imagem Docker é minúsculo por especificação.

O cron de conciliação roda a cada 10 minutos pelo GitHub Actions. Ver [.github/workflows/conciliacao.yml](.github/workflows/conciliacao.yml).

## Observabilidade

Log Analytics com `workspaceCapping` — sem o teto, um loop de erro em produção vira conta de ingestão.
