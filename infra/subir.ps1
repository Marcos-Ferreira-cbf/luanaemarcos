# Sobe a infraestrutura lendo os segredos do .env.local — nada de senha
# digitada na linha de comando, que ficaria no histórico do shell.
#
#   pwsh infra/subir.ps1 -Imagem ghcr.io/marcos-ferreira-cbf/luanaemarcos:<sha>
#
# Rodar de novo é seguro: o Bicep é idempotente.

param(
  [Parameter(Mandatory = $true)][string]$Imagem,
  [string]$UrlPublica = '',
  [string]$Grupo = 'rg-casamento-luanaemarcos',
  [string]$Arquivo = '.env.local'
)

$ErrorActionPreference = 'Stop'

$env_ = @{}
foreach ($linha in Get-Content $Arquivo) {
  if ($linha -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $env_[$Matches[1]] = $Matches[2].Trim() }
}

# A senha do banco mora dentro da connection string; é de lá que ela sai.
if ($env_['DATABASE_URL'] -notmatch '^postgresql://([^:]+):([^@]+)@') {
  throw "DATABASE_URL não tem o formato esperado"
}
$usuario = $Matches[1]
$senhaBanco = [System.Uri]::UnescapeDataString($Matches[2])

# O PUT do Container Apps é total: domínio que não vier no template é
# removido, e o certificado gerenciado vai junto. Então lemos o que já está
# amarrado e devolvemos igual.
$dominios = az containerapp show -g $Grupo -n ca-casamento `
  --query "properties.configuration.ingress.customDomains" -o json 2>$null
if ([string]::IsNullOrWhiteSpace($dominios) -or $dominios -eq 'null') { $dominios = '[]' }
# O @() é o que segura o caso vazio: sem ele, ConvertTo-Json de nada vira
# string vazia e o az reclama de JSON inválido.
$dominios = ConvertTo-Json -InputObject @($dominios | ConvertFrom-Json) -Depth 6 -Compress
Write-Host "Domínios preservados: $dominios"

$parametros = @(
  "implantarApp=true",
  "dominiosCustomizados=$dominios",
  "imagem=$Imagem",
  "usuarioBanco=$usuario",
  "senhaBanco=$senhaBanco",
  "tokenMp=$($env_['MP_ACCESS_TOKEN'])",
  "chavePublicaMp=$($env_['MP_PUBLIC_KEY'])",
  "segredoWebhook=$($env_['MP_WEBHOOK_SECRET'])",
  "segredoCron=$($env_['CRON_SECRET'])",
  "senhaAdmin=$($env_['ADMIN_SENHA'])"
)
if ($UrlPublica) { $parametros += "urlPublica=$UrlPublica" }

Write-Host "Subindo $Imagem em $Grupo..."
az deployment group create `
  -g $Grupo `
  -n app-$(($Imagem -split ':')[-1].Substring(0, 7)) `
  --template-file infra/main.bicep `
  --parameters $parametros `
  --query "properties.outputs" -o json
