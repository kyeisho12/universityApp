# benchmark.ps1 — System performance diagnostic for universityApp
# Usage: .\scripts\benchmark.ps1 -BaseUrl "https://universityapp-production.up.railway.app"

param(
    [string]$BaseUrl = "https://universityapp-production.up.railway.app"
)

$BaseUrl = $BaseUrl.TrimEnd("/")
$Separator = "=" * 60

function Measure-Endpoint {
    param([string]$Label, [string]$Url, [string]$Method = "GET", [object]$Body = $null)
    $headers = @{ "Content-Type" = "application/json" }
    $start = Get-Date
    try {
        if ($Method -eq "POST" -and $Body) {
            $response = Invoke-RestMethod -Uri $Url -Method POST -Headers $headers -Body ($Body | ConvertTo-Json -Depth 5) -TimeoutSec 120
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method GET -Headers $headers -TimeoutSec 30
        }
        $elapsed = ((Get-Date) - $start).TotalMilliseconds
        Write-Host "  ✅ $Label" -ForegroundColor Green
        Write-Host "     Time: $([math]::Round($elapsed))ms"
        return @{ Success = $true; ElapsedMs = $elapsed; Data = $response }
    } catch {
        $elapsed = ((Get-Date) - $start).TotalMilliseconds
        Write-Host "  ❌ $Label — FAILED ($([math]::Round($elapsed))ms)" -ForegroundColor Red
        Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Yellow
        return @{ Success = $false; ElapsedMs = $elapsed; Data = $null }
    }
}

Write-Host $Separator
Write-Host " UNIVERSITY APP — SYSTEM BENCHMARK"
Write-Host " Target: $BaseUrl"
Write-Host $Separator

# ─── 1. Health Check ───────────────────────────────────────────────
Write-Host "`n[1] Health Check" -ForegroundColor Cyan
$health = Measure-Endpoint -Label "GET /api/health" -Url "$BaseUrl/api/health"
if ($health.Success) {
    Write-Host "     Status: $($health.Data.status)"
}

# ─── 2. RoBERTa — Cold Start ───────────────────────────────────────
Write-Host "`n[2] RoBERTa Embedding — First Request (cold start)" -ForegroundColor Cyan
Write-Host "  (may take up to 30s if model is loading...)" -ForegroundColor DarkGray
$embedBody = @{ inputs = @("I am a software engineer with 3 years of experience", "software developer") }
$cold = Measure-Endpoint -Label "POST /api/hf-embed (cold)" -Url "$BaseUrl/api/hf-embed" -Method POST -Body $embedBody
if ($cold.Success) {
    $dims = ($cold.Data | Measure-Object -Property Count).Count
    Write-Host "     Embedding dims: 2 x $($cold.Data[0].Count)"
}

# ─── 3. RoBERTa — Warm Requests ────────────────────────────────────
Write-Host "`n[3] RoBERTa Embedding — Warm Requests (x3)" -ForegroundColor Cyan
$warmTimes = @()
for ($i = 1; $i -le 3; $i++) {
    $w = Measure-Endpoint -Label "POST /api/hf-embed (warm #$i)" -Url "$BaseUrl/api/hf-embed" -Method POST -Body $embedBody
    if ($w.Success) { $warmTimes += $w.ElapsedMs }
    Start-Sleep -Milliseconds 200
}
if ($warmTimes.Count -gt 0) {
    $avg = [math]::Round(($warmTimes | Measure-Object -Average).Average)
    Write-Host "     Avg warm latency: ${avg}ms" -ForegroundColor White
}

# ─── 4. Phi3 Follow-up Generation ─────────────────────────────────
Write-Host "`n[4] Phi3 Follow-up Question Generation" -ForegroundColor Cyan
Write-Host "  (may take 30-60s for generation...)" -ForegroundColor DarkGray
$phi3Body = @{
    original_question = "Tell me about yourself."
    candidate_answer  = "I am a computer science student with experience in Python and web development. I have worked on several projects including a university career app."
    job_context       = "Software Engineer Internship"
    num_questions     = 1
}
$phi3 = Measure-Endpoint -Label "POST /api/generate-followup" -Url "$BaseUrl/api/generate-followup" -Method POST -Body $phi3Body
if ($phi3.Success) {
    Write-Host "     Source: $($phi3.Data.source)"
    if ($phi3.Data.questions) {
        Write-Host "     Generated: $($phi3.Data.questions[0])"
    }
}

# ─── 5. Summary ────────────────────────────────────────────────────
Write-Host "`n$Separator"
Write-Host " RESULTS SUMMARY"
Write-Host $Separator
$results = @(
    [PSCustomObject]@{ Endpoint = "/api/health";         LatencyMs = [math]::Round($health.ElapsedMs); Status = if ($health.Success) { "✅ OK" } else { "❌ FAIL" } }
    [PSCustomObject]@{ Endpoint = "/api/hf-embed (cold)"; LatencyMs = [math]::Round($cold.ElapsedMs);  Status = if ($cold.Success)   { "✅ OK" } else { "❌ FAIL" } }
    [PSCustomObject]@{ Endpoint = "/api/hf-embed (warm)"; LatencyMs = if ($warmTimes.Count -gt 0) { [math]::Round(($warmTimes | Measure-Object -Average).Average) } else { 0 }; Status = if ($warmTimes.Count -gt 0) { "✅ OK" } else { "❌ FAIL" } }
    [PSCustomObject]@{ Endpoint = "/api/generate-followup"; LatencyMs = [math]::Round($phi3.ElapsedMs); Status = if ($phi3.Success) { "✅ OK" } else { "❌ FAIL" } }
)
$results | Format-Table -AutoSize

Write-Host "Performance targets:"
Write-Host "  Health:         < 500ms  (yours: $([math]::Round($health.ElapsedMs))ms)" -ForegroundColor $(if ($health.ElapsedMs -lt 500) { "Green" } else { "Yellow" })
Write-Host "  RoBERTa warm:  < 1000ms (yours: $(if ($warmTimes.Count -gt 0) { [math]::Round(($warmTimes | Measure-Object -Average).Average) } else { "N/A" })ms)" -ForegroundColor $(if ($warmTimes.Count -gt 0 -and ($warmTimes | Measure-Object -Average).Average -lt 1000) { "Green" } else { "Yellow" })
Write-Host "  Phi3:         < 30000ms (yours: $([math]::Round($phi3.ElapsedMs))ms)" -ForegroundColor $(if ($phi3.ElapsedMs -lt 30000) { "Green" } else { "Yellow" })
Write-Host ""
