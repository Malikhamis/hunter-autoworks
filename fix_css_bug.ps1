# Fix CSS display bug by removing CSS appended after </html>
$filePath = "website/index.html"
$content = Get-Content $filePath -Raw
$fixed = $content -replace '(?s)</html>.*$', '</html>'
Set-Content $filePath -Value $fixed -NoNewline
Write-Host "Fixed: Removed CSS text from end of index.html"
