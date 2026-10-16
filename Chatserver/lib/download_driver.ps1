# Script tự động tải PostgreSQL JDBC Driver 42.7.3
$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetJar = Join-Path $scriptDir "postgresql-42.7.3.jar"

if (Test-Path $targetJar) {
    Write-Host "[OK] Driver PostgreSQL JDBC đa ton tai tai: $targetJar" -ForegroundColor Green
    exit 0
}

$url = "https://repo1.maven.org/maven2/org/postgresql/postgresql/42.7.3/postgresql-42.7.3.jar"
Write-Host "[...] Dang tai driver tu $url ..." -ForegroundColor Cyan
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $url -OutFile $targetJar

if (Test-Path $targetJar) {
    Write-Host "[SUCCESS] Da tai thanh cong: $targetJar" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Khong the tai file driver." -ForegroundColor Red
    exit 1
}
