param(
  [switch]$SkipDbReset,
  [switch]$SkipE2E,
  [switch]$KeepServer
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportRoot = Join-Path $repoRoot "qa-reports"
$runRoot = Join-Path $reportRoot $timestamp
$latestReport = Join-Path $reportRoot "latest.md"
$summaryPath = Join-Path $runRoot "summary.json"

New-Item -ItemType Directory -Force -Path $runRoot | Out-Null

$results = New-Object System.Collections.Generic.List[object]
$startedAt = Get-Date

function Add-Result {
  param(
    [string]$Name,
    [string]$Command,
    [int]$ExitCode,
    [double]$Seconds,
    [string]$LogFile
  )

  $results.Add([pscustomobject]@{
    name = $Name
    command = $Command
    exitCode = $ExitCode
    seconds = [Math]::Round($Seconds, 2)
    logFile = $LogFile
  }) | Out-Null
}

function Invoke-QaStep {
  param(
    [string]$Name,
    [string]$Command
  )

  Write-Host ""
  Write-Host "==> $Name" -ForegroundColor Cyan
  $logFileName = ($Name -replace "[^a-zA-Z0-9._-]", "-").Trim("-").ToLowerInvariant() + ".log"
  $logFile = Join-Path $runRoot $logFileName
  $stdoutFile = Join-Path $runRoot "$logFileName.out"
  $stderrFile = Join-Path $runRoot "$logFileName.err"
  New-Item -ItemType File -Force -Path $logFile | Out-Null
  $timer = [System.Diagnostics.Stopwatch]::StartNew()

  Push-Location $repoRoot
  try {
    $wrappedCommand = "& { $Command }; if (`$LASTEXITCODE -ne `$null) { exit `$LASTEXITCODE }"
    $process = Start-Process -FilePath "powershell" `
      -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $wrappedCommand) `
      -WorkingDirectory $repoRoot `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $stdoutFile `
      -RedirectStandardError $stderrFile
    $stdout = if (Test-Path -LiteralPath $stdoutFile) { [string](Get-Content -LiteralPath $stdoutFile -Raw) } else { "" }
    $stderr = if (Test-Path -LiteralPath $stderrFile) { [string](Get-Content -LiteralPath $stderrFile -Raw) } else { "" }
    if ($null -eq $stdout) { $stdout = "" }
    if ($null -eq $stderr) { $stderr = "" }
    ($stdout + $stderr) | Set-Content -LiteralPath $logFile -Encoding UTF8
    if ($stdout.Trim().Length -gt 0) { Write-Host $stdout }
    if ($stderr.Trim().Length -gt 0) { Write-Host $stderr -ForegroundColor Red }
    $exitCode = $process.ExitCode
  } finally {
    Pop-Location
    $timer.Stop()
  }

  Add-Result -Name $Name -Command $Command -ExitCode $exitCode -Seconds $timer.Elapsed.TotalSeconds -LogFile $logFile

  if ($exitCode -ne 0) {
    throw "$Name failed with exit code $exitCode. See $logFile"
  }
}

function Stop-NextServer {
  $listeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

function Start-ProductionServer {
  Stop-NextServer
  Start-Sleep -Seconds 1

  $out = Join-Path $runRoot "next-start.out.log"
  $err = Join-Path $runRoot "next-start.err.log"
  $process = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "start") -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err -PassThru

  $ready = $false
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    Start-Sleep -Seconds 1
    try {
      $response = Invoke-WebRequest -Uri "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
      if ($process.HasExited) {
        break
      }
    }
  }

  if (-not $ready) {
    throw "Next production server did not become ready. See $out and $err"
  }

  return $process
}

function Write-QaReport {
  param([string]$Status)

  $endedAt = Get-Date
  $duration = [Math]::Round(($endedAt - $startedAt).TotalSeconds, 2)
  $failed = @($results | Where-Object { $_.exitCode -ne 0 })
  $tick = [char]96
  $lines = New-Object System.Collections.Generic.List[string]

  $lines.Add("# AutoSphere ERP Automated QA Report") | Out-Null
  $lines.Add("") | Out-Null
  $lines.Add("- Status: $Status") | Out-Null
  $lines.Add("- Started: $($startedAt.ToString("u"))") | Out-Null
  $lines.Add("- Finished: $($endedAt.ToString("u"))") | Out-Null
  $lines.Add("- Duration: $duration seconds") | Out-Null
  $lines.Add("- Failed steps: $($failed.Count)") | Out-Null
  $lines.Add("") | Out-Null
  $lines.Add("## Steps") | Out-Null
  $lines.Add("") | Out-Null
  $lines.Add("| Step | Result | Seconds | Log |") | Out-Null
  $lines.Add("| --- | --- | ---: | --- |") | Out-Null

  foreach ($result in $results) {
    $resultText = if ($result.exitCode -eq 0) { "PASS" } else { "FAIL ($($result.exitCode))" }
    $relativeLog = if (Test-Path -LiteralPath $result.logFile) {
      Resolve-Path -LiteralPath $result.logFile -Relative
    } else {
      $result.logFile
    }
    $lines.Add("| $($result.name) | $resultText | $($result.seconds) | $tick$relativeLog$tick |") | Out-Null
  }

  $lines.Add("") | Out-Null
  $lines.Add("## Commands") | Out-Null
  $lines.Add("") | Out-Null
  foreach ($result in $results) {
    $lines.Add("- $tick$($result.command)$tick") | Out-Null
  }

  $reportPath = Join-Path $runRoot "report.md"
  $lines | Set-Content -LiteralPath $reportPath -Encoding UTF8
  $lines | Set-Content -LiteralPath $latestReport -Encoding UTF8

  [pscustomobject]@{
    status = $Status
    startedAt = $startedAt.ToString("o")
    finishedAt = $endedAt.ToString("o")
    durationSeconds = $duration
    failedSteps = $failed.Count
    results = $results
  } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $summaryPath -Encoding UTF8

  Write-Host ""
  Write-Host "QA report: $reportPath" -ForegroundColor Green
  Write-Host "Latest report: $latestReport" -ForegroundColor Green
}

$serverProcess = $null
$status = "PASS"

try {
  Invoke-QaStep -Name "lint" -Command "npm run lint"
  Invoke-QaStep -Name "unit-tests" -Command "npm run test"
  Invoke-QaStep -Name "typescript" -Command "npx tsc --noEmit"
  Invoke-QaStep -Name "build" -Command "npm run build"

  if (-not $SkipDbReset) {
    Invoke-QaStep -Name "supabase-db-reset" -Command "npx supabase db reset"
  }

  Invoke-QaStep -Name "supabase-pgtap" -Command "npx supabase test db"

  if (-not $SkipE2E) {
    Write-Host ""
    Write-Host "==> start-production-server" -ForegroundColor Cyan
    $serverProcess = Start-ProductionServer
    Add-Result -Name "start-production-server" -Command "npm run start" -ExitCode 0 -Seconds 0 -LogFile (Join-Path $runRoot "next-start.out.log")
    Invoke-QaStep -Name "playwright-e2e" -Command "npm run test:e2e"
  }
} catch {
  $status = "FAIL"
  Write-Host ""
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
} finally {
  if ($serverProcess -and -not $KeepServer) {
    Stop-NextServer
  }

  Write-QaReport -Status $status
}
