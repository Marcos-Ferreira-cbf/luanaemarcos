# Infraestrutura

Custo alvo: **~R$ 30/mês** para o projeto inteiro.

## O que foi cortado, e por quê

| Saiu | Entrou | Economia/mês |
|---|---|---|
| Azure Container Registry Basic | GitHub Container Registry | R$ 30 |
| Key Vault | secrets do Container Apps | ~R$ 10 |
| Blob Storage | fotos em `public/`, dentro da imagem | R$ 5 |
| Container Apps Job | GitHub Actions agendado | R$ 15 |
| PostgreSQL Flexible Server | Neon, plano gratuito | R$ 130 |

Managed Identity também saiu: o Neon autentica por connection string, então não havia o que a identidade gerenciasse.

## O único gasto real

`minReplicas: 1`, com 0,25 vCPU. Com `minReplicas: 0` o projeto fica inteiramente dentro do grant gratuito do Container Apps — os primeiros 180.000 vCPU-segundos, 360.000 GiB-segundos e 2 milhões de requisições por assinatura, por mês. Uma revisão escalada a zero não gera cobrança.

O preço de escalar a zero é um cold start de 5 a 15 segundos. Numa tela de pagamento Pix, isso custa mais do que os R$ 30. A réplica ociosa roda quase todo o mês na taxa ociosa, algo em torno de 30 a 40% da ativa.

## Neon

Provisione direto em [neon.com](https://neon.com). A integração nativa do Neon no Azure foi descontinuada, com fim de vida em 31 de janeiro de 2026 — já passou. Para a aplicação a diferença é nenhuma: é uma connection string.

O compute hiberna quando ocioso. Por isso:

- `db.ts` usa `connectionTimeoutMillis: 15_000` — o primeiro acesso após hibernar leva alguns segundos
- `/api/saude` consulta o banco, e não só devolve 200. O probe de readiness mantém o Neon acordado enquanto o app estiver de pé

Alternativa: Azure PostgreSQL Flexible Server tem 12 meses grátis, **mas só para assinaturas novas**. Se a sua já existe, são R$ 130/mês — essa é a única diferença real entre as duas arquiteturas.

## Ordem de execução

Não há GitHub CLI nesta máquina, então os passos que envolvem o GitHub são pela web.

**1. Repositório** — já criado: `Marcos-Ferreira-cbf/luanaemarcos`.

**2. Neon** — criar projeto, rodar o DDL, guardar a connection string.

**3. Azure** — grupo de recursos e infraestrutura via Bicep:

```bash
az login
az group create -n rg-casamento -l brazilsouth
az deployment group create -g rg-casamento -f infra/main.bicep
```

**4. Identidade federada para o CI** — cria o App Registration e autoriza o push da `main` a fazer login sem senha:

```bash
az ad app create --display-name gh-casamento
# guarde o appId; crie o service principal e dê contributor no grupo
az ad app federated-credential create --id <appId> --parameters '{
  "name": "main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:Marcos-Ferreira-cbf/luanaemarcos:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

**5. Secrets no GitHub** — em *Settings → Secrets and variables → Actions*:

| Secret | Origem |
|---|---|
| `AZURE_CLIENT_ID` | `appId` do passo 4 |
| `AZURE_TENANT_ID` | `az account show --query tenantId` |
| `AZURE_SUBSCRIPTION_ID` | `az account show --query id` |
| `DATABASE_URL` | Neon |
| `CRON_SECRET` | string aleatória sua |
| `MP_ACCESS_TOKEN` | Mercado Pago, produção |
| `MP_WEBHOOK_SECRET` | Mercado Pago |

**6. Domínio** — `marcoseluana.social.br` no registro.br, CNAME para o FQDN do Container App, certificado gerenciado pelo próprio Container Apps.

## Deploy

`git push` na `main` builda, publica no GHCR e sobe uma nova revisão. Ver [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

O cron de conciliação roda a cada 10 minutos pelo GitHub Actions. Ver [.github/workflows/conciliacao.yml](.github/workflows/conciliacao.yml).

## Observabilidade

Log Analytics com `workspaceCapping` — sem o teto, um loop de erro em produção vira conta de ingestão.
