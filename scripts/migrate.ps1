<#
.SYNOPSIS
    Applies PostgreSQL / Neon Serverless database migrations for Discord Mini Web Clone.
.DESCRIPTION
    Reads .env (or environment variables NEON_JDBC_URL / DB_URL, NEON_DB_USER / DB_USER, NEON_DB_PASSWORD / DB_PASSWORD)
    and executes Chatserver/sql/schema.sql (if needed) and Chatserver/sql/V003__guilds_channels.sql
    using either psql (if installed) or the project's Java JDBC DatabaseConnection runner.
#>

param(
    [switch]$IncludeBaseSchema = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $ProjectRoot ".env"

if (Test-Path $EnvFile) {
    Write-Host "[MIGRATE] Reading environment variables from $EnvFile ..." -ForegroundColor Cyan
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $key = $parts[0].Trim()
            $val = $parts[1].Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
        }
    }
}

$SchemaFile = Join-Path $ProjectRoot "Chatserver\sql\schema.sql"
$V003File   = Join-Path $ProjectRoot "Chatserver\sql\V003__guilds_channels.sql"

if (-not (Test-Path $V003File)) {
    throw "Migration file not found: $V003File"
}

$PsqlCmd = Get-Command psql -ErrorAction SilentlyContinue
$PgUrl = $env:DATABASE_URL

if ($PsqlCmd -and $PgUrl) {
    Write-Host "[MIGRATE] Running migrations via psql ..." -ForegroundColor Green
    if ($IncludeBaseSchema -and (Test-Path $SchemaFile)) {
        & psql $PgUrl -f $SchemaFile
    }
    & psql $PgUrl -f $V003File
    Write-Host "[MIGRATE] Migration V003 applied successfully via psql." -ForegroundColor Green
    exit 0
}

Write-Host "[MIGRATE] Running V003__guilds_channels.sql via Java JDBC DatabaseConnection ..." -ForegroundColor Green
$ChatServerDir = Join-Path $ProjectRoot "Chatserver"
$BuildClasses  = Join-Path $ChatServerDir "build\classes"
$LibPath       = Join-Path $ChatServerDir "lib\*"

if (-not (Test-Path $BuildClasses)) {
    New-Item -ItemType Directory -Force -Path $BuildClasses | Out-Null
}

& javac -encoding UTF-8 -cp "$LibPath" -d "$BuildClasses" `
    (Join-Path $ChatServerDir "src\com\discordmini\server\config\DatabaseConnection.java")

$TempRunnerDir = Join-Path $env:TEMP "discordmini_migrate_runner"
New-Item -ItemType Directory -Force -Path $TempRunnerDir | Out-Null
$RunnerJava = Join-Path $TempRunnerDir "MigrateRunner.java"

@"
import com.discordmini.server.config.DatabaseConnection;
public class MigrateRunner {
    public static void main(String[] args) {
        System.out.println("[MIGRATE] Testing DB connectivity: " + DatabaseConnection.getUrl());
        if (!DatabaseConnection.isConnected()) {
            System.err.println("[MIGRATE ERROR] Cannot connect to PostgreSQL database. Check .env / db.properties.");
            System.exit(1);
        }
        DatabaseConnection.runMigrationsIfAvailable();
        System.out.println("[MIGRATE] Done.");
    }
}
"@ | Set-Content -Path $RunnerJava -Encoding UTF8

& javac -encoding UTF-8 -cp "$BuildClasses;$LibPath" -d "$TempRunnerDir" $RunnerJava
Push-Location $ProjectRoot
try {
    & java -cp "$TempRunnerDir;$BuildClasses;$LibPath" MigrateRunner
} finally {
    Pop-Location
}
