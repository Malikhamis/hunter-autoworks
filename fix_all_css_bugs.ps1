# Fix CSS display bug in all HTML files
Write-Host "Fixing CSS display bugs in all HTML files..." -ForegroundColor Cyan

$files = @(
    "website/index.html",
    "website/booking.html",
    "website/admin/index.html",
    "website/admin/dashboard.html",
    "website/admin/services.html",
    "website/admin/clients.html",
    "website/admin/documents.html",
    "website/admin/invoices.html",
    "website/admin/reports.html",
    "website/admin/settings.html"
)

$fixed = 0
$skipped = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match '(?s)</html>.*\S') {
            $cleaned = $content -replace '(?s)</html>.*$', '</html>'
            Set-Content $file -Value $cleaned -NoNewline
            Write-Host "Fixed: $file" -ForegroundColor Green
            $fixed++
        } else {
            Write-Host "Skipped (already clean): $file" -ForegroundColor Gray
            $skipped++
        }
    } else {
        Write-Host "Not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "Fixed: $fixed files" -ForegroundColor Green
Write-Host "Skipped: $skipped files" -ForegroundColor Gray
Write-Host ""
Write-Host "All HTML files have been cleaned!" -ForegroundColor Green
