# Luana e Marcos

Site do casamento: lista de presentes com pagamento via Pix (Mercado Pago).

## Stack

| Peça | Escolha |
|---|---|
| Aplicação | Next.js em Azure Container Apps (plano Consumo) |
| Banco | Neon Serverless Postgres |
| Imagem | GitHub Container Registry |
| Cron | GitHub Actions agendado (conciliação a cada 10 min) |
| Domínio | marcoseluana.social.br |

Custo alvo: ~R$ 30/mês.

## Desenvolvimento

```bash
npm install
cp env.example .env.local   # preencha DATABASE_URL e os segredos
npm run dev
```

## Deploy

`git push` na `main` publica sozinho. Detalhes de infraestrutura em [AZURE.md](AZURE.md).
