# PowerShell script to copy fonts from web public folder to API folder
# This ensures FFmpeg can access the fonts when generating subtitles

$webFontsPath = "..\..\apps\web\public\fonts"
$apiFontsPath = ".\fonts"

Write-Host "🎨 Copying fonts from web to API folder..." -ForegroundColor Cyan

# Create fonts directory if it doesn't exist
if (-not (Test-Path $apiFontsPath)) {
    New-Item -ItemType Directory -Path $apiFontsPath | Out-Null
    Write-Host "✅ Created fonts directory" -ForegroundColor Green
}

# Copy all font folders
$fontFolders = @(
    "Anton",
    "Bangers", 
    "DM_Serif_Display",
    "Fira_Sans_Condensed",
    "Gabarito",
    "Montserrat",
    "Poppins",
    "Roboto",
    "Rubik",
    "Teko",
    "TikTok_Sans"
)

foreach ($folder in $fontFolders) {
    $source = Join-Path $webFontsPath $folder
    $destination = Join-Path $apiFontsPath $folder
    
    if (Test-Path $source) {
        if (Test-Path $destination) {
            Remove-Item -Path $destination -Recurse -Force
        }
        Copy-Item -Path $source -Destination $destination -Recurse -Force
        Write-Host "✅ Copied $folder" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Font folder not found: $folder" -ForegroundColor Yellow
    }
}

Write-Host "`n🎉 Font copy complete!" -ForegroundColor Cyan
Write-Host "Fonts are now available at: $apiFontsPath" -ForegroundColor Gray
