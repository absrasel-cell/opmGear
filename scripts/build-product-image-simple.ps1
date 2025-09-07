Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($args.Count -lt 3) {
    Write-Error "Usage: build-product-image-simple.ps1 <baseImage> <logoImage> <outputPath> [logoWidthPercent=0.35] [logoVerticalCenterFactor=0.43] [jpegQuality=92]"
    exit 1
}

$BaseImagePath = $args[0]
$LogoImagePath = $args[1]
$OutputPath = $args[2]
$LogoWidthPercent = if ($args.Count -ge 4) { [double]$args[3] } else { 0.35 }
$LogoVerticalCenterFactor = if ($args.Count -ge 5) { [double]$args[4] } else { 0.43 }
$JpegQuality = if ($args.Count -ge 6) { [int]$args[5] } else { 92 }

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $BaseImagePath)) { throw "Base image not found: $BaseImagePath" }
if (-not (Test-Path -LiteralPath $LogoImagePath)) { throw "Logo image not found: $LogoImagePath" }

[System.IDisposable]$baseImg = $null
[System.IDisposable]$logoImg = $null
[System.IDisposable]$bmp = $null
[System.Drawing.Graphics]$g = $null

try {
    $baseImg = [System.Drawing.Image]::FromFile($BaseImagePath)
    $logoImg = [System.Drawing.Image]::FromFile($LogoImagePath)

    $pf = [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
    $bmp = New-Object System.Drawing.Bitmap ($baseImg.Width, $baseImg.Height, $pf)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Draw base
    $g.DrawImage($baseImg, 0, 0, $baseImg.Width, $baseImg.Height)

    # Compute logo size and position
    $targetLogoWidth = [int]([math]::Round($baseImg.Width * $LogoWidthPercent))
    if ($targetLogoWidth -lt 1) { $targetLogoWidth = 1 }
    $aspect = $logoImg.Height / [double]$logoImg.Width
    $targetLogoHeight = [int]([math]::Round($targetLogoWidth * $aspect))

    $x = [int]([math]::Round(($baseImg.Width - $targetLogoWidth) / 2.0))
    $yCenter = [int]([math]::Round($baseImg.Height * $LogoVerticalCenterFactor))
    $y = $yCenter - [int]([math]::Round($targetLogoHeight / 2.0))

    # Optional: faint shadow
    $ia = New-Object System.Drawing.Imaging.ImageAttributes
    $cm = New-Object System.Drawing.Imaging.ColorMatrix
    $cm.Matrix00 = 1; $cm.Matrix11 = 1; $cm.Matrix22 = 1; $cm.Matrix33 = 0.35; $cm.Matrix44 = 1
    $ia.SetColorMatrix($cm, [System.Drawing.Imaging.ColorMatrixFlag]::Default, [System.Drawing.Imaging.ColorAdjustType]::Bitmap)
    $destRectShadow = New-Object System.Drawing.Rectangle ($x+2), ($y+2), $targetLogoWidth, $targetLogoHeight
    $g.DrawImage($logoImg, $destRectShadow, 0, 0, $logoImg.Width, $logoImg.Height, [System.Drawing.GraphicsUnit]::Pixel, $ia)

    # Draw logo
    $destRect = New-Object System.Drawing.Rectangle $x, $y, $targetLogoWidth, $targetLogoHeight
    $g.DrawImage($logoImg, $destRect)

    # Ensure output directory exists
    $outDir = Split-Path -Parent $OutputPath
    if ($outDir -and -not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

    # Save as JPEG with quality
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([int]$JpegQuality)
    $bmp.Save($OutputPath, $codec, $ep)
}
finally {
    if ($g) { $g.Dispose() }
    if ($bmp) { $bmp.Dispose() }
    if ($logoImg) { $logoImg.Dispose() }
    if ($baseImg) { $baseImg.Dispose() }
}

Write-Host "Saved product image to: $OutputPath"
