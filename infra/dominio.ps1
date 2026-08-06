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
# São dois passos, e a ordem não é a que parece. O 'bind' cria o certificado
# gerenciado sozinho, mas a emissão exige que o hostname JÁ esteja no app —
# e quem o coloca lá é o 'add'. Chamar só o bind falha com
# RequireCustomHostnameInEnvironment, que descreve exatamente isso.
#
# Entre um e outro o domínio responde sem TLS (bindingType Disabled). São
# alguns minutos; o certificado pode levar até 20.
#
# O apex valida por HTTP, e isso é resultado de tentativa, não de preferência.
#
# Por TXT ele tem um ovo-e-galinha: o token do _acme-challenge só aparece na
# saída do bind, mas a emissão precisa do TXT já publicado. Pior, cada bind
# emite um certificado NOVO, com token novo, e o anterior fica Pending para
# sempre — certificado Pending não se recupera, só se apaga. Tentamos duas
# vezes, com o TXT publicado na zona e confirmado no Google e no Cloudflare:
# as duas ficaram 25 minutos em Pending e não saíram do lugar.
#
# Por HTTP não há token nenhum: o desafio é servido pelo próprio app, no IP
# que o registro A do apex já aponta. Saiu em ~10 minutos, de primeira. Como
# o A do apex tem que existir de qualquer forma, HTTP não pede nada a mais.
#
# O www valida por CNAME (que já existe) e também não pede token.
#
# Uma armadilha no bind manual: --certificate exige o resource id inteiro do
# managed certificate, não o nome. Com o nome ele responde "does not exist",
# que é enganoso — o certificado está lá.
#
#   az containerapp env certificate list -g <grupo> -n <ambiente> `
#     --managed-certificates-only --query "[?properties.subjectName=='<host>'].id" -o tsv

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

$alvos = @(
  @{ host = $Dominio;       metodo = 'HTTP' },
  @{ host = "www.$Dominio"; metodo = 'CNAME' }
)

foreach ($a in $alvos) {
  Write-Host "`n== $($a.host) (validação por $($a.metodo)) =="

  Write-Host "  colocando o hostname no app..."
  az containerapp hostname add -g $Grupo -n $App --hostname $a.host -o none

  Write-Host "  emitindo o certificado gerenciado (pode levar até 20 min)..."
  az containerapp hostname bind `
    -g $Grupo -n $App -e $Ambiente `
    --hostname $a.host --validation-method $a.metodo -o none
}

Write-Host "`nResultado:"
az containerapp show -g $Grupo -n $App `
  --query "properties.configuration.ingress.customDomains[].{host:name, binding:bindingType}" -o table
