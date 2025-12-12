# mcp_apply_migration.ps1
# Usage: powershell -File scripts/mcp_apply_migration.ps1 -ProjectRef <project_ref> -ApiKey <service_role_key>
param(
  [Parameter(Mandatory=$true)][string] $ProjectRef,
  [Parameter(Mandatory=$true)][string] $ApiKey,
  [Parameter(Mandatory=$true)][string] $SqlFilePath
)

$McpUrl = "https://mcp.supabase.com/mcp?project_ref=$ProjectRef"
$sql = Get-Content -Raw -Path $SqlFilePath

$body = @{
  type = 'run_sql'
  sql = $sql
} | ConvertTo-Json -Depth 10

Write-Host "Posting migration to $McpUrl ..."

try {
  $resp = Invoke-RestMethod -Method Post -Uri $McpUrl -Body $body -ContentType 'application/json' -Headers @{ 'Authorization' = "Bearer $ApiKey" }
  Write-Host "MCP response:`n" ($resp | ConvertTo-Json -Depth 5)
} catch {
  Write-Host "Error calling MCP:" $_.Exception.Message
  exit 1
}
