# test-interview-flow.ps1
# End-to-end mock interview flow test:
#   1. Health check
#   2. Start session
#   3. Score answer with RoBERTa (hf-embed)
#   4. Next-question decision (Phi3 → follow-up or next bank question)
#   5. Direct follow-up generation (Phi3)
#   6. End session
#   7. Verify stored session
#
# Usage:
#   .\scripts\test-interview-flow.ps1 -UserId "your-uuid"
#   .\scripts\test-interview-flow.ps1 -UserId "your-uuid" -BaseUrl "http://localhost:8000"

param(
    [string]$BaseUrl = "https://universityapp-production.up.railway.app",
    [string]$UserId  = ""
)

if (-not $UserId) {
    Write-Host "❌ ERROR: You must provide a -UserId parameter." -ForegroundColor Red
    Write-Host "   Find your UUID in Supabase → Authentication → Users"
    Write-Host "   Example: .\scripts\test-interview-flow.ps1 -UserId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'"
    exit 1
}

$BaseUrl   = $BaseUrl.TrimEnd("/")
$Headers   = @{ "Content-Type" = "application/json" }
$Separator = "=" * 65
$Passed    = 0
$Failed    = 0

function Invoke-API {
    param(
        [string]$Label,
        [string]$Url,
        [string]$Method    = "GET",
        [object]$Body      = $null,
        [int]   $TimeoutSec = 120
    )
    $start = Get-Date
    try {
        $params = @{ Uri = $Url; Method = $Method; Headers = $Headers; TimeoutSec = $TimeoutSec }
        if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Depth 10) }
        $response = Invoke-RestMethod @params
        $ms = [math]::Round(((Get-Date) - $start).TotalMilliseconds)
        Write-Host "  ✅ $Label  (${ms}ms)" -ForegroundColor Green
        return @{ Success = $true; Data = $response; Ms = $ms }
    } catch {
        $ms  = [math]::Round(((Get-Date) - $start).TotalMilliseconds)
        $msg = $_.Exception.Message
        try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).error } catch {}
        Write-Host "  ❌ $Label  (${ms}ms) — $msg" -ForegroundColor Red
        return @{ Success = $false; Data = $null; Ms = $ms }
    }
}

function Assert {
    param([bool]$Condition, [string]$Message)
    if ($Condition) {
        Write-Host "     ✔ $Message" -ForegroundColor White
        $script:Passed++
    } else {
        Write-Host "     ✘ $Message" -ForegroundColor Yellow
        $script:Failed++
    }
}

Write-Host $Separator
Write-Host " MOCK INTERVIEW — END-TO-END FLOW TEST"
Write-Host " Backend : $BaseUrl"
Write-Host " User ID : $UserId"
Write-Host $Separator

# ── Sample interview data ──────────────────────────────────────────
$SampleQuestion  = "Tell me about a time you had to solve a difficult technical problem."
$SampleAnswer    = "During my internship, our API was returning incorrect data for about 20% of requests. I debugged the issue by adding structured logging, traced it to a race condition in our caching layer, and fixed it by implementing a mutex lock. Response consistency improved to 99.9% after the fix."
$IdealAnswer     = "Describes the problem, personal role, specific action taken, and measurable outcome."
$JobContext      = "Software Engineer Internship"

# ════════════════════════════════════════════════════════════════════
# STEP 1: Health check
# ════════════════════════════════════════════════════════════════════
Write-Host "`n[STEP 1] Health Check" -ForegroundColor Cyan
$health = Invoke-API -Label "GET /api/health" -Url "$BaseUrl/api/health" -TimeoutSec 15
Assert -Condition $health.Success -Message "Backend is reachable"
if ($health.Success) {
    Assert -Condition ($health.Data.status -eq "ok") -Message "Status is 'ok'"
}

# ════════════════════════════════════════════════════════════════════
# STEP 2: Start interview session
# ════════════════════════════════════════════════════════════════════
Write-Host "`n[STEP 2] Start Interview Session" -ForegroundColor Cyan
$startRes = Invoke-API -Label "POST /api/interviews/sessions/start" `
    -Url "$BaseUrl/api/interviews/sessions/start" `
    -Method POST `
    -Body @{ user_id = $UserId; total_questions = 10 }

Assert -Condition $startRes.Success -Message "Session created"

$SessionId = $null
if ($startRes.Success) {
    $SessionId = $startRes.Data.data.id
    Assert -Condition ($null -ne $SessionId) -Message "Session ID returned: $SessionId"
}

if (-not $SessionId) {
    Write-Host "`n❌ Cannot continue without a session. Check backend logs." -ForegroundColor Red
    exit 1
}

# ════════════════════════════════════════════════════════════════════
# STEP 3: Score answer with RoBERTa (hf-embed similarity)
# ════════════════════════════════════════════════════════════════════
Write-Host "`n[STEP 3] Score Answer — RoBERTa Embeddings (hf-embed)" -ForegroundColor Cyan
Write-Host "  (first call may take ~30s if model is still loading...)" -ForegroundColor DarkGray

$embedRes = Invoke-API -Label "POST /api/hf-embed" `
    -Url "$BaseUrl/api/hf-embed" `
    -Method POST `
    -Body @{ inputs = @($SampleAnswer, $IdealAnswer) }

Assert -Condition $embedRes.Success -Message "Embeddings returned"
$CosineSimilarity = $null
if ($embedRes.Success -and $embedRes.Data.Count -eq 2) {
    $v1  = $embedRes.Data[0]
    $v2  = $embedRes.Data[1]
    $dot = 0.0; $n1 = 0.0; $n2 = 0.0
    for ($i = 0; $i -lt $v1.Count; $i++) {
        $dot += $v1[$i] * $v2[$i]
        $n1  += $v1[$i] * $v1[$i]
        $n2  += $v2[$i] * $v2[$i]
    }
    $CosineSimilarity = [math]::Round($dot / ([math]::Sqrt($n1) * [math]::Sqrt($n2)), 4)
    Write-Host "     Cosine similarity: $CosineSimilarity" -ForegroundColor White
    Assert -Condition ($CosineSimilarity -gt 0) -Message "Similarity score is positive"
    Assert -Condition ($v1.Count -eq 1024) -Message "Embedding dimension is 1024 (all-roberta-large-v1)"
}

# ════════════════════════════════════════════════════════════════════
# STEP 4: Next-question decision (Phi3 decides: follow-up or move on)
# ════════════════════════════════════════════════════════════════════
Write-Host "`n[STEP 4] Next-Question Decision — Phi3" -ForegroundColor Cyan
Write-Host "  (Phi3 generation may take 30-90s...)" -ForegroundColor DarkGray

$decisionRes = Invoke-API -Label "POST /api/interviews/next-question-decision" `
    -Url "$BaseUrl/api/interviews/next-question-decision" `
    -Method POST `
    -Body @{
        current_question            = $SampleQuestion
        candidate_answer            = $SampleAnswer
        ideal_answer                = $IdealAnswer
        category                    = "behavioral"
        remaining_bank_questions    = 4
        followup_count_for_current  = 0
    } `
    -TimeoutSec 180

Assert -Condition $decisionRes.Success -Message "Decision returned"
if ($decisionRes.Success) {
    $action = $decisionRes.Data.data.action
    $source = $decisionRes.Data.data.source
    $reason = $decisionRes.Data.data.reason
    Write-Host "     Action : $action" -ForegroundColor White
    Write-Host "     Source : $source" -ForegroundColor White
    Write-Host "     Reason : $reason" -ForegroundColor White
    Assert -Condition ($action -in @("follow_up", "next_bank_question")) -Message "Action is valid ('follow_up' or 'next_bank_question')"
    if ($action -eq "follow_up") {
        $followupFromDecision = $decisionRes.Data.data.followup_question
        Write-Host "     Follow-up: $followupFromDecision" -ForegroundColor Gray
        Assert -Condition ($followupFromDecision.Length -gt 5) -Message "Follow-up question has content"
    }
}

# ════════════════════════════════════════════════════════════════════
# STEP 5: Direct follow-up generation (Phi3)
# ════════════════════════════════════════════════════════════════════
Write-Host "`n[STEP 5] Direct Follow-Up Generation — Phi3" -ForegroundColor Cyan
Write-Host "  (Phi3 generation may take 30-90s...)" -ForegroundColor DarkGray

$followupRes = Invoke-API -Label "POST /api/interviews/follow-up-question" `
    -Url "$BaseUrl/api/interviews/follow-up-question" `
    -Method POST `
    -Body @{
        original_question = $SampleQuestion
        candidate_answer  = $SampleAnswer
        ideal_answer      = $IdealAnswer
        category          = "behavioral"
    } `
    -TimeoutSec 180

Assert -Condition $followupRes.Success -Message "Follow-up question generated"
if ($followupRes.Success) {
    $followupQ = $followupRes.Data.data.followup_question
    $source    = $followupRes.Data.data.source
    Write-Host "     Source   : $source" -ForegroundColor White
    Write-Host "     Question : $followupQ" -ForegroundColor Gray
    Assert -Condition ($followupQ.Length -gt 5) -Message "Follow-up question has content"
    Assert -Condition ($source -in @("phi-3-mini", "phi3", "ollama", "fallback")) -Message "Source is recognized"
}

# ════════════════════════════════════════════════════════════════════
# STEP 6: End session with scores
# ════════════════════════════════════════════════════════════════════
Write-Host "`n[STEP 6] End Session" -ForegroundColor Cyan

$FinalScore = if ($CosineSimilarity) { [math]::Round($CosineSimilarity * 5, 2) } else { 3.5 }
$endRes = Invoke-API -Label "POST /api/interviews/sessions/$SessionId/end" `
    -Url "$BaseUrl/api/interviews/sessions/$SessionId/end" `
    -Method POST `
    -Body @{
        metadata = @{
            completion_reason = "manual"
            score_summary     = @{
                overall_average     = $FinalScore
                evaluated_count     = 1
                per_question_scores = @(
                    @{
                        question_index     = 0
                        score              = $FinalScore
                        source             = "roberta_similarity"
                        roberta_similarity = $CosineSimilarity
                        breakdown          = @{
                            situation  = $FinalScore
                            task       = $FinalScore
                            action     = $FinalScore
                            result     = $FinalScore
                            reflection = $FinalScore
                        }
                    }
                )
            }
        }
    }

Assert -Condition $endRes.Success -Message "Session ended"

# ════════════════════════════════════════════════════════════════════
# STEP 7: Verify stored session
# ════════════════════════════════════════════════════════════════════
Write-Host "`n[STEP 7] Verify Stored Session" -ForegroundColor Cyan
Start-Sleep -Seconds 1
$readRes = Invoke-API -Label "GET /api/interviews/sessions/$SessionId" `
    -Url "$BaseUrl/api/interviews/sessions/$SessionId" `
    -TimeoutSec 15

Assert -Condition $readRes.Success -Message "Session readable from DB"
if ($readRes.Success) {
    $meta   = $readRes.Data.data.metadata
    $reason = $meta.completion_reason
    $stored = $meta.score_summary.overall_average
    Write-Host "     completion_reason : $reason" -ForegroundColor White
    Write-Host "     overall_average   : $stored / 5" -ForegroundColor White
    Assert -Condition ($reason -eq "manual") -Message "completion_reason stored correctly"
    Assert -Condition ($null -ne $stored)    -Message "overall_average persisted"
}

# ════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════
Write-Host "`n$Separator"
Write-Host " RESULTS"
Write-Host $Separator
Write-Host "  Passed : $Passed" -ForegroundColor Green
Write-Host "  Failed : $Failed" -ForegroundColor $(if ($Failed -gt 0) { "Red" } else { "Green" })
Write-Host "  Session: $SessionId  (delete from Supabase if not needed)"
Write-Host $Separator
