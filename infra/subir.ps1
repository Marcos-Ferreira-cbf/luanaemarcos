# Sobe a infraestrutura lendo os segredos do .env.local — nada de senha
# digitada na linha de comando, que ficaria no histórico do shell.
#
#   pwsh infra/subir.ps1 -Imagem ghcr.io/marcos-ferreira-cbf/luanaemarcos:<sha>
#
# Rodar de novo é seguro: o Bicep é idempotente.
#
# Isto NÃO é o caminho normal de deploy. O deploy do dia a dia é o
# .github/workflows/deploy.yml, que constrói a imagem e roda
# `az containerapp update`. Este script existe para o que o workflow não
# faz: criar a infraestrutura do zero e mudar variável de ambiente,
# domínio ou segredo. Mexer nessas coisas pelo portal ou pela CLI solta
# funciona uma vez e depois some — o próximo deployment do Bicep desfaz.

param(
  [Parameter(Mandatory = $true)][string]$Imagem,
  [string]$UrlPublica = '',
  [string]$Grupo = 'rg-casamento-luanaemarcos',
  [string]$Arquivo = '.env.local',
  # Mostra o que mudaria e não muda nada. Use antes de qualquer execução de
  # verdade: este deployment faz PUT no ingress, e ingress errado tira o
  # site do ar por uns 10 minutos, o tempo de reemitir certificado.
  [switch]$Simular
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
#
# Emitir um certificado gerenciado novo leva ~10 minutos e depende de
# validação externa, então perder os que existem não é um contratempo — é o
# site fora do ar até a Azure devolver. Por isso o script para se a leitura
# falhar: subir com a lista vazia é pior do que não subir.
$dominiosJson = az containerapp show -g $Grupo -n ca-casamento `
  --query "properties.configuration.ingress.customDomains" -o json 2>$null

$appExiste = $LASTEXITCODE -eq 0
if ($appExiste) {
  if ([string]::IsNullOrWhiteSpace($dominiosJson) -or $dominiosJson.Trim() -eq 'null') {
    $dominios = @()
  } else {
    $dominios = @($dominiosJson | ConvertFrom-Json)
  }
  Write-Host "Domínios preservados: $(($dominios | ForEach-Object { $_.name }) -join ', ')"
} else {
  # Primeira execução: o app ainda não existe, então não há o que preservar.
  $dominios = @()
  Write-Host "Container App ainda não existe — criando do zero."
}

# --parameters chave=valor passa pela linha de comando: o JSON dos domínios
# chega despedaçado pelo shell (era o "Failed to parse string as JSON"), e
# cada segredo fica visível na lista de processos enquanto o az roda. O
# arquivo resolve os dois, e some no finally.
$parametros = [ordered]@{
  implantarApp         = @{ value = $true }
  imagem               = @{ value = $Imagem }
  usuarioBanco         = @{ value = $usuario }
  senhaBanco           = @{ value = $senhaBanco }
  tokenMp              = @{ value = $env_['MP_ACCESS_TOKEN'] }
  chavePublicaMp       = @{ value = $env_['MP_PUBLIC_KEY'] }
  segredoWebhook       = @{ value = $env_['MP_WEBHOOK_SECRET'] }
  segredoCron          = @{ value = $env_['CRON_SECRET'] }
  senhaAdmin           = @{ value = $env_['ADMIN_SENHA'] }
  dominiosCustomizados = @{ value = $dominios }
}
if ($UrlPublica) { $parametros['urlPublica'] = @{ value = $UrlPublica } }

$documento = [ordered]@{
  '$schema'      = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
  contentVersion = '1.0.0.0'
  parameters     = $parametros
}

$arquivoParametros = Join-Path ([System.IO.Path]::GetTempPath()) "casamento-$([guid]::NewGuid()).json"
try {
  # -Depth 10: a lista de domínios é aninhada, e o padrão (2) a achataria
  # para a string "System.Object[]" sem avisar.
  $documento | ConvertTo-Json -Depth 10 | Set-Content -Path $arquivoParametros -Encoding utf8

  $nome = "app-$((($Imagem -split ':')[-1]).Substring(0, 7))"

  if ($Simular) {
    Write-Host "Simulando $Imagem em $Grupo (nada será alterado)..."
    az deployment group what-if `
      -g $Grupo -n $nome `
      --template-file infra/main.bicep `
      --parameters "@$arquivoParametros"
  } else {
    Write-Host "Subindo $Imagem em $Grupo..."
    az deployment group create `
      -g $Grupo -n $nome `
      --template-file infra/main.bicep `
      --parameters "@$arquivoParametros" `
      --query "properties.outputs" -o json
  }
  if ($LASTEXITCODE -ne 0) { throw "o deployment falhou (exit $LASTEXITCODE)" }
} finally {
  Remove-Item $arquivoParametros -ErrorAction SilentlyContinue
}
