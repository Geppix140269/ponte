$ErrorActionPreference = 'SilentlyContinue'

$repo    = 'C:\dev\ponte'
$envFile = Join-Path $repo '.env.local'
$stamp   = Join-Path $env:TEMP 'ponte-notify-last.txt'
$to      = 'g.funaro@1402celsius.com'

# Throttle: at most one email every 5 minutes.
if (Test-Path $stamp) {
  $lastRaw = (Get-Content $stamp -Raw).Trim()
  if ($lastRaw) {
    try {
      $lastTime = [datetime]::Parse($lastRaw)
      if (((Get-Date) - $lastTime).TotalSeconds -lt 300) { exit 0 }
    } catch {}
  }
}

# The hook payload arrives on stdin as JSON.
$raw = ''
try { $raw = [Console]::In.ReadToEnd() } catch {}
$msg = ''
try { $msg = ($raw | ConvertFrom-Json).message } catch {}
if (-not $msg) { $msg = 'Claude Code has stopped and is waiting for you.' }
$short = $msg
if ($short.Length -gt 90) { $short = $short.Substring(0,90) + '...' }

# Read credentials at run time. They are never stored in this file.
$key  = ''
$from = ''
if (Test-Path $envFile) {
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*RESEND_API_KEY\s*=\s*(.+)$')    { $key  = $matches[1].Trim().Trim('"').Trim("'") }
    if ($line -match '^\s*RESEND_FROM_EMAIL\s*=\s*(.+)$') { $from = $matches[1].Trim().Trim('"').Trim("'") }
  }
}
if (-not $key)  { exit 0 }
if (-not $from) { $from = 'Ponte <onboarding@resend.dev>' }

$when = Get-Date -Format 'HH:mm, ddd d MMM'
$text = "$msg`r`n`r`nIt has stopped and will not continue until you look.`r`n`r`nRepo: $repo`r`nTime: $when"

$body = @{
  from    = $from
  to      = @($to)
  subject = "Claude Code is waiting: $short"
  text    = $text
} | ConvertTo-Json -Depth 4 -Compress

try {
  Invoke-RestMethod -Uri 'https://api.resend.com/emails' -Method Post `
    -Headers @{ Authorization = "Bearer $key" } `
    -ContentType 'application/json' `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
  Set-Content -Path $stamp -Value (Get-Date -Format 'o')
} catch {}

exit 0
