# test-session-rules.ps1
# Verifies session completion rules: metadata storage, completion_reason, per-question scores
# Usage: .\scripts\test-session-rules.ps1 -BaseUrl "https://universityapp-production.up.railway.app" -UserId "your-user-uuid"

param(
    [string]$BaseUrl = "https://universityapp-production.up.railway.app",
    [string]$UserId  = ""
)

if (-not $UserId) {
    Write-Host "❌ ERROR: You must provide a -UserId parameter." -ForegroundColor Red
    Write-Host "   Find your UUID in Supabase → Authentication → Users → your account's ID"
    Write-Host "   Example: .\scripts\test-session-rules.ps1 -UserId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'"
    exit 1
}

$BaseUrl = $BaseUrl.TrimEnd("/")
$Headers = @{ "Content-Type" = "application/json" }
$Separator = "=" * 60

function Invoke-API {
    param([string]$Label, [string]$Url, [string]$Method = "GET", [object]$Body = $null)
    try {
        $params = @{ Uri = $Url; Method = $Method; Headers = $Headers; TimeoutSec = 30 }
        if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Depth 10) }
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    } catch {
        $msg = $_.Exception.Message
        try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).error } catch {}
        Write-Host "  ❌ $Label failed: $msg" -ForegroundColor Red
        return @{ Success = $false; Data = $null }
    }
}

Write-Host $Separator
Write-Host " SESSION RULES TEST — universityApp"
Write-Host " Backend: $BaseUrl"
Write-Host " User ID: $UserId"
Write-Host $Separator

# ─── Helper: fake per-question scores ─────────────────────────────
function Get-FakeScores {
    param([int]$Count, [float]$BaseScore)
    $scores = @()
    for ($i = 0; $i -lt $Count; $i++) {
        $scores += @{
            question_index      = $i
            score               = [math]::Round($BaseScore + (Get-Random -Minimum -3 -Maximum 4) * 0.1, 2)
            source              = "roberta_similarity"
            roberta_similarity  = [math]::Round(0.5 + (Get-Random -Minimum 0 -Maximum 30) * 0.01, 2)
            breakdown           = @{
                situation  = [math]::Round($BaseScore + 0.2, 1)
                task       = [math]::Round($BaseScore - 0.1, 1)
                action     = [math]::Round($BaseScore + 0.1, 1)
                result     = [math]::Round($BaseScore, 1)
                reflection = [math]::Round($BaseScore - 0.2, 1)
            }
        }
    }
    return $scores
}

# ════════════════════════════════════════════════════════════════
# TEST 1: score_threshold — 10 questions, avg 3.7 (above 3.5)
# ════════════════════════════════════════════════════════════════
Write-Host "`n[TEST 1] Score threshold exit (10 questions, avg 3.2)" -ForegroundColor Cyan

$start1 = Invoke-API -Label "Start session" -Url "$BaseUrl/api/interviews/sessions/start" -Method POST -Body @{
    user_id         = $UserId
    total_questions = 20
}
if (-not $start1.Success) { Write-Host "  Skipping test 1." -ForegroundColor Yellow }
else {
    $sid1 = $start1.Data.data.id
    Write-Host "  ✅ Session created: $sid1" -ForegroundColor Green

    $scores1 = Get-FakeScores -Count 10 -BaseScore 3.2
    $avg1 = ($scores1 | ForEach-Object { $_["score"] } | Measure-Object -Average).Average

    $end1 = Invoke-API -Label "End session" -Url "$BaseUrl/api/interviews/sessions/$sid1/end" -Method POST -Body @{
        metadata = @{
            completion_reason    = "score_threshold"
            score_summary        = @{
                overall_average  = [math]::Round($avg1, 2)
                evaluated_count  = 10
                per_question_scores = $scores1
            }
        }
    }
    if ($end1.Success) { Write-Host "  ✅ Session ended successfully" -ForegroundColor Green }

    # Read back and verify
    Start-Sleep -Seconds 1
    $read1 = Invoke-API -Label "Read session" -Url "$BaseUrl/api/interviews/sessions/$sid1"
    if ($read1.Success) {
        $meta = $read1.Data.data.metadata
        $reason = $meta.completion_reason
        $storedAvg = $meta.score_summary.overall_average
        $storedCount = $meta.score_summary.per_question_scores.Count
        Write-Host "  📋 completion_reason:   $reason" -ForegroundColor White
        Write-Host "  📋 overall_average:     $storedAvg / 5" -ForegroundColor White
        Write-Host "  📋 per_question_scores: $storedCount entries" -ForegroundColor White

        if ($reason -eq "score_threshold" -and $storedCount -eq 10) {
            Write-Host "  ✅ TEST 1 PASSED" -ForegroundColor Green
        } else {
            Write-Host "  ❌ TEST 1 FAILED — unexpected values" -ForegroundColor Red
        }
    }
}

# ════════════════════════════════════════════════════════════════
# TEST 2: question_cap — 20 questions, avg 2.9 (below 3.5, hit cap)
# ════════════════════════════════════════════════════════════════
Write-Host "`n[TEST 2] Question cap exit (20 questions, avg 2.9)" -ForegroundColor Cyan

$start2 = Invoke-API -Label "Start session" -Url "$BaseUrl/api/interviews/sessions/start" -Method POST -Body @{
    user_id         = $UserId
    total_questions = 20
}
if (-not $start2.Success) { Write-Host "  Skipping test 2." -ForegroundColor Yellow }
else {
    $sid2 = $start2.Data.data.id
    Write-Host "  ✅ Session created: $sid2" -ForegroundColor Green

    $scores2 = Get-FakeScores -Count 20 -BaseScore 2.9
    $avg2 = ($scores2 | ForEach-Object { $_["score"] } | Measure-Object -Average).Average

    $end2 = Invoke-API -Label "End session" -Url "$BaseUrl/api/interviews/sessions/$sid2/end" -Method POST -Body @{
        metadata = @{
            completion_reason = "question_cap"
            score_summary     = @{
                overall_average     = [math]::Round($avg2, 2)
                evaluated_count     = 20
                per_question_scores = $scores2
            }
        }
    }
    if ($end2.Success) { Write-Host "  ✅ Session ended successfully" -ForegroundColor Green }

    Start-Sleep -Seconds 1
    $read2 = Invoke-API -Label "Read session" -Url "$BaseUrl/api/interviews/sessions/$sid2"
    if ($read2.Success) {
        $meta = $read2.Data.data.metadata
        $reason = $meta.completion_reason
        $storedAvg = $meta.score_summary.overall_average
        $storedCount = $meta.score_summary.per_question_scores.Count
        Write-Host "  📋 completion_reason:   $reason" -ForegroundColor White
        Write-Host "  📋 overall_average:     $storedAvg / 5" -ForegroundColor White
        Write-Host "  📋 per_question_scores: $storedCount entries" -ForegroundColor White

        if ($reason -eq "question_cap" -and $storedCount -eq 20) {
            Write-Host "  ✅ TEST 2 PASSED" -ForegroundColor Green
        } else {
            Write-Host "  ❌ TEST 2 FAILED — unexpected values" -ForegroundColor Red
        }
    }
}

# ════════════════════════════════════════════════════════════════
# TEST 3: manual end — 12 questions, avg 3.0
# ════════════════════════════════════════════════════════════════
Write-Host "`n[TEST 3] Manual end (12 questions, avg 3.0)" -ForegroundColor Cyan

$start3 = Invoke-API -Label "Start session" -Url "$BaseUrl/api/interviews/sessions/start" -Method POST -Body @{
    user_id         = $UserId
    total_questions = 20
}
if (-not $start3.Success) { Write-Host "  Skipping test 3." -ForegroundColor Yellow }
else {
    $sid3 = $start3.Data.data.id
    Write-Host "  ✅ Session created: $sid3" -ForegroundColor Green

    $scores3 = Get-FakeScores -Count 12 -BaseScore 3.0
    $avg3 = ($scores3 | ForEach-Object { $_["score"] } | Measure-Object -Average).Average

    $end3 = Invoke-API -Label "End session" -Url "$BaseUrl/api/interviews/sessions/$sid3/end" -Method POST -Body @{
        metadata = @{
            completion_reason = "manual"
            score_summary     = @{
                overall_average     = [math]::Round($avg3, 2)
                evaluated_count     = 12
                per_question_scores = $scores3
            }
        }
    }
    if ($end3.Success) { Write-Host "  ✅ Session ended successfully" -ForegroundColor Green }

    Start-Sleep -Seconds 1
    $read3 = Invoke-API -Label "Read session" -Url "$BaseUrl/api/interviews/sessions/$sid3"
    if ($read3.Success) {
        $meta = $read3.Data.data.metadata
        $reason = $meta.completion_reason
        $storedAvg = $meta.score_summary.overall_average
        $storedCount = $meta.score_summary.per_question_scores.Count
        Write-Host "  📋 completion_reason:   $reason" -ForegroundColor White
        Write-Host "  📋 overall_average:     $storedAvg / 5" -ForegroundColor White
        Write-Host "  📋 per_question_scores: $storedCount entries" -ForegroundColor White

        if ($reason -eq "manual" -and $storedCount -eq 12) {
            Write-Host "  ✅ TEST 3 PASSED" -ForegroundColor Green
        } else {
            Write-Host "  ❌ TEST 3 FAILED — unexpected values" -ForegroundColor Red
        }
    }
}

Write-Host "`n$Separator"
Write-Host " DONE — Check Supabase to also verify sessions appear in interview_sessions table"
Write-Host " These test sessions are real completed sessions — you can delete them from Supabase if needed"
Write-Host $Separator
