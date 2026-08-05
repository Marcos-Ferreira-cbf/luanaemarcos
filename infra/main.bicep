// =====================================================================
// Site de casamento — infraestrutura enxuta
//
// Meta: ~R$ 30/mês. Tudo que dá para não pagar, não se paga:
//   - imagem no GitHub Container Registry (grátis) em vez de ACR Basic
//   - segredos em Container Apps secrets (grátis) em vez de Key Vault
//   - fotos empacotadas na imagem em vez de Blob Storage
//   - cron no GitHub Actions em vez de Container Apps Job
//   - Postgres no plano gratuito do Neon, fora do Azure
//
// az deployment group create -g rg-casamento \
//   --template-file infra/main.bicep \
//   --parameters urlBanco=<neon> tokenMp=<...> segredoWebhook=<...> segredoCron=<...>
// =====================================================================

param prefixo string = 'casamento'
param local string = 'brazilsouth'
param dominio string = 'marcoseluana.social.br'

@description('Imagem no GHCR, ex.: ghcr.io/marcos/casamento:sha-abc123')
param imagem string = 'ghcr.io/CHANGEME/casamento:latest'

@description('Usuário do GitHub, para o pull do GHCR.')
param usuarioGhcr string = 'CHANGEME'

@secure()
@description('Personal Access Token com escopo read:packages.')
param tokenGhcr string

@secure()
@description('Connection string do Neon: postgresql://user:senha@host/db?sslmode=require')
param urlBanco string

@secure()
param tokenMp string

@secure()
param segredoWebhook string

@secure()
param segredoCron string

var tags = { projeto: 'casamento' }

// ---------------------------------------------------------------------
// Logs — 5 GB/mês de ingestão são gratuitos, e este site não chega perto
// ---------------------------------------------------------------------
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${prefixo}'
  location: local
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: 1 } // trava de segurança contra susto na fatura
  }
}

resource ambiente 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${prefixo}'
  location: local
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${prefixo}'
  location: local
  tags: tags
  properties: {
    managedEnvironmentId: ambiente.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        allowInsecure: false
        // Certificado gerenciado e domínio customizado não custam nada
        customDomains: []
      }
      registries: [
        {
          server: 'ghcr.io'
          username: usuarioGhcr
          passwordSecretRef: 'ghcr-token'
        }
      ]
      secrets: [
        { name: 'ghcr-token', value: tokenGhcr }
        { name: 'database-url', value: urlBanco }
        { name: 'mp-access-token', value: tokenMp }
        { name: 'mp-webhook-secret', value: segredoWebhook }
        { name: 'cron-secret', value: segredoCron }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: imagem
          // Menor combinação válida. Next.js roda folgado com isto neste volume.
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'APP_URL', value: 'https://${dominio}' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'MP_ACCESS_TOKEN', secretRef: 'mp-access-token' }
            { name: 'MP_WEBHOOK_SECRET', secretRef: 'mp-webhook-secret' }
            { name: 'CRON_SECRET', secretRef: 'cron-secret' }
          ]
          probes: [
            {
              type: 'Readiness'
              httpGet: { path: '/api/saude', port: 3000 }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        // 1 réplica sempre ligada custa ~R$ 30/mês em taxa ociosa e elimina
        // o cold start. Numa página de pagamento, 10 s de espera custa mais
        // caro que os R$ 30. Se quiser zero real, troque para minReplicas: 0.
        minReplicas: 1
        maxReplicas: 3
        rules: [
          { name: 'http', http: { metadata: { concurrentRequests: '50' } } }
        ]
      }
    }
  }
}

output url string = 'https://${app.properties.configuration.ingress.fqdn}'
