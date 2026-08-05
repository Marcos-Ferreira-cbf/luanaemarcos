// =====================================================================
// Site de casamento — infraestrutura enxuta
//
// Meta: ~R$ 30/mês. Tudo que dá para não pagar, não se paga:
//   - imagem no GitHub Container Registry (grátis) em vez de ACR Basic
//   - segredos em Container Apps secrets (grátis) em vez de Key Vault
//   - fotos empacotadas na imagem em vez de Blob Storage
//   - cron no GitHub Actions em vez de Container Apps Job
//
// O Postgres voltou para dentro do Azure: a assinatura é Sponsorship, e o
// crédito cobre o Flexible Server. Some o cold start do Neon, some a
// latência entre nuvens, e o banco fica na mesma região do app.
//
// az deployment group create -g rg-casamento-luanaemarcos \
//   --template-file infra/main.bicep \
//   --parameters senhaBanco=<...> tokenGhcr=<...> tokenMp=<...> \
//                chavePublicaMp=<...> segredoWebhook=<...> segredoCron=<...>
// =====================================================================

param prefixo string = 'casamento'
param local string = 'brazilsouth'
param dominio string = 'marcoseluana.social.br'

@description('''
Cria o Container App. Deixe false no primeiro deploy: sem imagem publicada
no GHCR, a revisão nunca fica saudável e o deployment falha depois de
esperar o probe. O banco sobe sozinho e já dá para rodar o schema.
''')
param implantarApp bool = true

@description('Imagem no GHCR, ex.: ghcr.io/marcos/casamento:sha-abc123')
param imagem string = 'ghcr.io/CHANGEME/casamento:latest'

@description('Usuário do GitHub, para o pull do GHCR.')
param usuarioGhcr string = 'CHANGEME'

// Os segredos abaixo têm default vazio só para o deploy com implantarApp=false.
// Quando o app subir, todos precisam vir preenchidos.
@secure()
@description('Personal Access Token com escopo read:packages.')
param tokenGhcr string = ''

@description('Login administrador do Postgres.')
param usuarioBanco string = 'casamento'

@secure()
@description('Senha do administrador do Postgres. Mínimo 8 caracteres, com maiúscula, minúscula e número.')
param senhaBanco string

@secure()
param tokenMp string = ''

@description('Public key do Mercado Pago. Vai para o navegador, então não é secure().')
param chavePublicaMp string = ''

@secure()
param segredoWebhook string = ''

@secure()
param segredoCron string = ''

var tags = { projeto: 'casamento' }

// ---------------------------------------------------------------------
// Logs — 5 GB/mês de ingestão são gratuitos, e este site não chega perto
// ---------------------------------------------------------------------
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = if (implantarApp) {
  name: 'log-${prefixo}'
  location: local
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: 1 } // trava de segurança contra susto na fatura
  }
}

// ---------------------------------------------------------------------
// Postgres
//
// Burstable B1ms: a menor máquina que existe, e sobra para 110 convidados.
// O tráfego real deste site são alguns picos de minutos — na véspera do
// RSVP e na semana dos presentes. Nada que justifique sair do burstable.
// ---------------------------------------------------------------------
resource banco 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: 'pg-${prefixo}'
  location: local
  tags: tags
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: usuarioBanco
    administratorLoginPassword: senhaBanco
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: { mode: 'Disabled' }
    network: { publicNetworkAccess: 'Enabled' }
  }
}

resource bancoCasamento 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: banco
  name: 'casamento'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// O Container Apps no plano Consumo sai por IPs que não dá para prever,
// então a liberação é para "serviços do Azure" (a faixa 0.0.0.0 especial).
// O que protege o banco é a senha, não a origem.
resource liberaAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: banco
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// verify-full, e não require: o driver pg vai mudar a semântica de 'require'
// para a do libpq (que aceita certificado não verificado) na versão 9.
var urlBanco = 'postgresql://${usuarioBanco}:${senhaBanco}@${banco.properties.fullyQualifiedDomainName}/casamento?sslmode=verify-full'

resource ambiente 'Microsoft.App/managedEnvironments@2024-03-01' = if (implantarApp) {
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

resource app 'Microsoft.App/containerApps@2024-03-01' = if (implantarApp) {
  name: 'ca-${prefixo}'
  location: local
  tags: tags
  dependsOn: [bancoCasamento, liberaAzure]
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
            // Vai como value, não secretRef: a chave é pública por desenho.
            // Lida no servidor e passada como prop ao Brick — sem prefixo
            // NEXT_PUBLIC_, que seria resolvido no build e chegaria vazio.
            { name: 'MP_PUBLIC_KEY', value: chavePublicaMp }
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

output url string = implantarApp ? 'https://${app.properties.configuration.ingress.fqdn}' : ''
output hostBanco string = banco.properties.fullyQualifiedDomainName
