# Amarra o domínio ao Container App com certificado gerenciado (grátis).
#
#   pwsh infra/dominio.ps1
#
# Precisa da extensão containerapp do az:  az extension add -n containerapp
#
# Só funciona depois que o registro.br publicar a delegação para o Azure DNS:
# o Container Apps valida a posse consultando a internet, não o seu Azure. Os
# registros já estão na zona (A no apex, CNAME no www, asuid TXT nos dois).
#
# São dois passos, nesta ordem: o certificado gerenciado nasce no ambiente e
# só depois o hostname é amarrado a ele. Fazer o bind antes deixa o domínio
# respondendo sem TLS.

param(
  [string]$Grupo = 'rg-casamento-luanaemarcos',
  [string]$App = 'ca-casamento',
  [string]$Ambiente = 'cae-casamento',
  [string]$Dominio = 'marcoseluana.social.br'
)

$ErrorActionPreference = 'Stop'

# Sem delegação o certificado falha na validação, com mensagem pouco óbvia.
# Melhor descobrir aqui do que depois de esperar.
$soa = (Resolve-DnsName -Name $Dominio -Type SOA -ErrorAction SilentlyContinue |
        Where-Object { $_.Type -eq 'SOA' }).PrimaryServer
if ($soa -and $soa -notlike '*azure-dns*') {
  Write-Warning "O domínio ainda responde por '$soa'. A delegação no registro.br não virou; isto vai falhar."
}

# O apex valida por TXT — CNAME na raiz não existe. O www valida por CNAME.
$alvos = @(
  @{ host = $Dominio;       metodo = 'TXT';   cert = 'cert-apex' },
  @{ host = "www.$Dominio"; metodo = 'CNAME'; cert = 'cert-www' }
)

foreach ($a in $alvos) {
  Write-Host "`n== $($a.host) =="

  $id = az containerapp env certificate list -g $Grupo -n $Ambiente `
        --query "[?name=='$($a.cert)'].id | [0]" -o tsv 2>$null

  if (-not $id) {
    Write-Host "  criando certificado gerenciado (validação por $($a.metodo))..."
    az containerapp env certificate create `
      -g $Grupo -n $Ambiente `
      --hostname $a.host --validation-method $a.metodo `
      --certificate-name $a.cert -o none
    $id = az containerapp env certificate list -g $Grupo -n $Ambiente `
          --query "[?name=='$($a.cert)'].id | [0]" -o tsv
  } else {
    Write-Host "  certificado já existe"
  }

  Write-Host "  amarrando o hostname..."
  az containerapp hostname bind -g $Grupo -n $App -e $Ambiente `
    --hostname $a.host --certificate $id -o none
}

Write-Host "`nResultado:"
az containerapp show -g $Grupo -n $App `
  --query "properties.configuration.ingress.customDomains[].{host:name, binding:bindingType}" -o table
