# Script แก้ไข DATABASE_URL ใน .env เพื่อรองรับ MySQL authentication
# รัน: .\scripts\fix-database-url.ps1

$envFile = ".env"
$backupFile = ".env.backup"

if (Test-Path $envFile) {
    # Backup .env
    Copy-Item $envFile $backupFile -Force
    Write-Host "[OK] Created backup: $backupFile" -ForegroundColor Green
    
    # อ่านไฟล์ .env
    $content = Get-Content $envFile -Raw
    
    # แก้ไข DATABASE_URL
    if ($content -match 'DATABASE_URL="([^"]+)"') {
        $currentUrl = $matches[1]
        Write-Host ""
        Write-Host "Current DATABASE_URL: $currentUrl" -ForegroundColor Yellow
        
        # ตรวจสอบว่ามี authPlugin อยู่แล้วหรือไม่
        if ($currentUrl -notmatch 'authPlugin=') {
            # เพิ่ม authPlugin parameter
            if ($currentUrl -match '\?') {
                $newUrl = $currentUrl + '&authPlugin=mysql_native_password'
            } else {
                $newUrl = $currentUrl + '?authPlugin=mysql_native_password'
            }
            
            # แทนที่ใน content
            $oldPattern = 'DATABASE_URL="[^"]+"'
            $newValue = 'DATABASE_URL="' + $newUrl + '"'
            $content = $content -replace $oldPattern, $newValue
            
            # เขียนกลับไปที่ไฟล์
            Set-Content -Path $envFile -Value $content -NoNewline
            
            Write-Host "[OK] Updated DATABASE_URL successfully!" -ForegroundColor Green
            Write-Host "New DATABASE_URL: $newUrl" -ForegroundColor Cyan
        } else {
            Write-Host "[INFO] DATABASE_URL already has authPlugin" -ForegroundColor Blue
        }
    } else {
        Write-Host "[WARN] DATABASE_URL not found in .env" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] .env file not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test connection with: npm run db:test" -ForegroundColor Cyan
