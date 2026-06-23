# ─────────────────────────────────────────────────────────────
# Backup automático do banco Railway — Consultório Psi
# Salva em C:\Projetos\Psicologa\backups\
# Mantém os últimos 30 arquivos
# ─────────────────────────────────────────────────────────────

$BASE_URL  = "https://lorenzi-production.up.railway.app"
$SENHA     = "2207"
$PASTA     = "C:\Projetos\Psicologa\backups"
$MANTER    = 30   # quantos backups guardar

# Cria pasta se não existir
if (-not (Test-Path $PASTA)) { New-Item -ItemType Directory -Force $PASTA | Out-Null }

$logFile = Join-Path $PASTA "backup.log"
function Log($msg) {
    $linha = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
    Add-Content $logFile $linha
    Write-Host $linha
}

# 1. Login
try {
    $loginResp = Invoke-RestMethod -Method Post -Uri "$BASE_URL/api/auth/login" `
        -Body (ConvertTo-Json @{ senha = $SENHA }) `
        -ContentType "application/json" -ErrorAction Stop
    $token = $loginResp.token
} catch {
    Log "ERRO login: $_"
    exit 1
}

# 2. Download do banco
$stamp    = Get-Date -Format "yyyy-MM-dd_HH-mm"
$destFile = Join-Path $PASTA "psicologa_$stamp.db"

try {
    Invoke-WebRequest -Uri "$BASE_URL/api/admin/backup-db" `
        -Headers @{ Authorization = "Bearer $token" } `
        -OutFile $destFile -ErrorAction Stop
    $tamanho = [math]::Round((Get-Item $destFile).Length / 1KB, 1)
    Log "OK  $destFile ($tamanho KB)"
} catch {
    Log "ERRO download: $_"
    exit 1
}

# 3. Remove backups antigos (mantém os $MANTER mais recentes)
$todos = Get-ChildItem $PASTA -Filter "psicologa_*.db" | Sort-Object LastWriteTime -Descending
if ($todos.Count -gt $MANTER) {
    $todos | Select-Object -Skip $MANTER | ForEach-Object {
        Remove-Item $_.FullName -Force
        Log "DEL $($_.Name)"
    }
}
