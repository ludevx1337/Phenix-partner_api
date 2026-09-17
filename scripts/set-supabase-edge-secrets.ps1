param(
  [string]$ProjectRef = "yvfahzutkoizgsotqons",
  [string]$EnvPath = ".env"
)

$ErrorActionPreference = "Stop"

function Read-DotEnv {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    throw "Fichier env introuvable: $Path"
  }

  $values = @{}
  foreach ($line in Get-Content $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
      continue
    }

    if ($trimmed -match '^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      $key = $Matches[1]
      $value = $Matches[2].Trim()
      if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
      ) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      $values[$key] = $value
    }
  }

  return $values
}

function Require-Value {
  param(
    [hashtable]$Values,
    [string]$Name,
    [string]$Alias
  )

  $value = $Values[$Name]
  if ([string]::IsNullOrWhiteSpace($value)) {
    $label = if ($Alias) { "$Name ($Alias)" } else { $Name }
    throw "Secret requis manquant ou vide: $label"
  }

  return $value
}

$envValues = Read-DotEnv -Path $EnvPath

$edgeSecrets = [ordered]@{
  PROJECT_URL = Require-Value $envValues "NEXT_PUBLIC_SUPABASE_URL" "URL API Supabase"
  SERVICE_ROLE_KEY = Require-Value $envValues "SUPABASE_SERVICE_ROLE_KEY"
  PHENIX_MAINTENANCE_SECRET = Require-Value $envValues "PHENIX_MAINTENANCE_SECRET"
  PHENIX_API_BASE_URL = if ($envValues["PHENIX_API_BASE_URL"]) { $envValues["PHENIX_API_BASE_URL"] } else { "https://api.phenix-partner.fr" }
  PHENIX_USERNAME = Require-Value $envValues "PHENIX_USERNAME"
  PHENIX_PASSWORD = Require-Value $envValues "PHENIX_PASSWORD"
  PHENIX_PARTENAIRE_ID = Require-Value $envValues "PHENIX_PARTENAIRE_ID"
  PHENIX_AUTH_STRICT_BODY = if ($envValues["PHENIX_AUTH_STRICT_BODY"]) { $envValues["PHENIX_AUTH_STRICT_BODY"] } else { "false" }
  PHENIX_AUTH_ERROR_COOLDOWN_MS = if ($envValues["PHENIX_AUTH_ERROR_COOLDOWN_MS"]) { $envValues["PHENIX_AUTH_ERROR_COOLDOWN_MS"] } else { "60000" }
  PHENIX_REQUEST_TIMEOUT_MS = if ($envValues["PHENIX_REQUEST_TIMEOUT_MS"]) { $envValues["PHENIX_REQUEST_TIMEOUT_MS"] } else { "25000" }
  SDTR_BATCH_SIZE = if ($envValues["SDTR_BATCH_SIZE"]) { $envValues["SDTR_BATCH_SIZE"] } else { "50" }
  SDTR_CONCURRENCY = if ($envValues["SDTR_CONCURRENCY"]) { $envValues["SDTR_CONCURRENCY"] } else { "4" }
  SDTR_STALE_AFTER_MS = if ($envValues["SDTR_STALE_AFTER_MS"]) { $envValues["SDTR_STALE_AFTER_MS"] } else { "3300000" }
  RESEND_API_KEY = Require-Value $envValues "RESEND_API_KEY"
  RESEND_FROM = Require-Value $envValues "RESEND_FROM"
  ALERT_ADMIN_EMAIL = Require-Value $envValues "ALERT_ADMIN_EMAIL"
  RESEND_TIMEOUT_MS = if ($envValues["RESEND_TIMEOUT_MS"]) { $envValues["RESEND_TIMEOUT_MS"] } else { "20000" }
}

if ($envValues["PHENIX_OWNER_USER_ID"]) {
  $edgeSecrets["PHENIX_OWNER_USER_ID"] = $envValues["PHENIX_OWNER_USER_ID"]
}

if ($envValues["PUSHOVER_APP_TOKEN"]) {
  $edgeSecrets["PUSHOVER_APP_TOKEN"] = $envValues["PUSHOVER_APP_TOKEN"]
}

if ($envValues["PUSHOVER_USER_KEY"]) {
  $edgeSecrets["PUSHOVER_USER_KEY"] = $envValues["PUSHOVER_USER_KEY"]
}

if ($envValues["PUSHOVER_PRIORITY"]) {
  $edgeSecrets["PUSHOVER_PRIORITY"] = $envValues["PUSHOVER_PRIORITY"]
}

if ($envValues["PUSHOVER_DEVICE"]) {
  $edgeSecrets["PUSHOVER_DEVICE"] = $envValues["PUSHOVER_DEVICE"]
}

if ($envValues["PUSHOVER_SOUND"]) {
  $edgeSecrets["PUSHOVER_SOUND"] = $envValues["PUSHOVER_SOUND"]
}

if ($envValues["PUSHOVER_TIMEOUT_MS"]) {
  $edgeSecrets["PUSHOVER_TIMEOUT_MS"] = $envValues["PUSHOVER_TIMEOUT_MS"]
}

$tempFile = Join-Path $env:TEMP "phenix-edge-secrets-$([Guid]::NewGuid().ToString('N')).env"

try {
  $lines = foreach ($entry in $edgeSecrets.GetEnumerator()) {
    "$($entry.Key)=$($entry.Value)"
  }
  Set-Content -Path $tempFile -Value $lines -Encoding UTF8

  Write-Host "Envoi des secrets Edge Function vers le projet $ProjectRef..."
  npx --yes supabase@latest secrets set --project-ref $ProjectRef --env-file $tempFile
  if ($LASTEXITCODE -ne 0) {
    throw "Échec de la commande supabase secrets set (code $LASTEXITCODE)."
  }
  Write-Host "Secrets Edge Function configurés."
} finally {
  if (Test-Path $tempFile) {
    Remove-Item $tempFile -Force
  }
}
