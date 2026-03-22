# test-interview-flow.ps1
# End-to-end mock interview flow test:
#   1. Health check
#   2. Start session
#   3. Score answer with RoBERTa (hf-embed)
#   4. Next-question decision (Phi3)
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
    Write-Host "ERROR: You must provide a -UserId parameter." -ForegroundColor Red
    Write-Host "   Find your UUID in Supabase -> Authentication -> Users"
    Write-Host "   Example: .\scripts\test-interview-flow.ps1 -UserId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'"
    exit 1
}

$BaseUrl   = $BaseUrl.TrimEnd("/")
$Headers   = @{ "Content-Type" = "application/json" }
$Sep       = "=" * 60
$Passed    = 0
$Failed    = 0
$SessionId = $null

function Invoke-API {
    param(
        [string]$Label,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null,
        [int]$TimeoutSec = 120
    )
    $start = Get-Date
    try {
        $p = @{ Uri = $Url; Method = $Method; Headers = $Headers; TimeoutSec = $TimeoutSec }
        if ($Body) {
            $p["Body"] = ($Body | ConvertTo-Json -Depth 10)
        }
        $resp = Invoke-RestMethod @p
        $ms = [math]::Round(((Get-Date) - $start).TotalMilliseconds)
        Write-Host "  OK $Label ($ms ms)" -ForegroundColor Green
        return @{ Success = $true; Data = $resp; Ms = $ms }
    } catch {
        $ms  = [math]::Round(((Get-Date) - $start).TotalMilliseconds)
        $msg = $_.Exception.Message
        try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).error } catch {}
        Write-Host "  FAIL $Label ($ms ms) -- $msg" -ForegroundColor Red
        return @{ Success = $false; Data = $null; Ms = $ms }
    }
}

function Check {
    param([bool]$Condition, [string]$Message)
    if ($Condition) {
        Write-Host "     PASS: $Message" -ForegroundColor White
        $script:Passed++
    } else {
        Write-Host "     FAIL: $Message" -ForegroundColor Yellow
        $script:Failed++
    }
}

Write-Host $Sep
Write-Host " MOCK INTERVIEW -- END-TO-END FLOW TEST"
Write-Host " Backend : $BaseUrl"
Write-Host " User ID : $UserId"
Write-Host $Sep

$SampleQuestion = "Tell me about a time you had to solve a difficult technical problem."
$SampleAnswer   = "During my internship, our API was returning incorrect data for about 20% of requests. I debugged the issue by adding structured logging, traced it to a race condition in our caching layer, and fixed it by implementing a mutex lock. Response consistency improved to 99.9% after the fix."
$IdealAnswer    = "Describes the problem, personal role, specific action taken, and measurable outcome."

# STEP 1: Health check
Write-Host "`n[STEP 1] Health Check" -ForegroundColor Cyan
$health = Invoke-API -Label "GET /api/health" -Url "$BaseUrl/api/health" -TimeoutSec 15
Check -Condition $health.Success -Message "Backend is reachable"
if ($health.Success) {
    Check -Condition ($health.Data.status -eq "ok") -Message "Status is ok"
}

# STEP 2: Start session
Write-Host "`n[STEP 2] Start Interview Session" -ForegroundColor Cyan
$startRes = Invoke-API -Label "POST /api/interviews/sessions/start" `
    -Url "$BaseUrl/api/interviews/sessions/start" `
    -Method POST `
    -Body @{ user_id = $UserId; total_questions = 10 }

Check -Condition $startRes.Success -Message "Session created"
if ($startRes.Success) {
    $SessionId = $startRes.Data.data.id
    Check -Condition ($null -ne $SessionId -and $SessionId -ne "") -Message "Session ID returned: $SessionId"
}

if (-not $SessionId) {
    Write-Host "`nERROR: Cannot continue without a session. Check backend logs." -ForegroundColor Red
    exit 1
}

# STEP 3: RoBERTa embeddings
Write-Host "`n[STEP 3] Score Answer -- RoBERTa Embeddings" -ForegroundColor Cyan
Write-Host "  (first call may take ~30s if model is still loading...)" -ForegroundColor DarkGray

$embedRes = Invoke-API -Label "POST /api/hf-embed" `
    -Url "$BaseUrl/api/hf-embed" `
    -Method POST `
    -Body @{ inputs = @($SampleAnswer, $IdealAnswer) }

Check -Condition $embedRes.Success -Message "Embeddings returned"

$CosineSim = $null
if ($embedRes.Success -and $embedRes.Data.Count -eq 2) {
    $v1 = $embedRes.Data[0]
    $v2 = $embedRes.Data[1]
    $dot = 0.0; $n1 = 0.0; $n2 = 0.0
    for ($i = 0; $i -lt $v1.Count; $i++) {
        $dot += $v1[$i] * $v2[$i]
        $n1  += $v1[$i] * $v1[$i]
        $n2  += $v2[$i] * $v2[$i]
    }
    $CosineSim = [math]::Round($dot / ([math]::Sqrt($n1) * [math]::Sqrt($n2)), 4)
    Write-Host "     Cosine similarity: $CosineSim" -ForegroundColor White
    Check -Condition ($CosineSim -gt 0) -Message "Similarity score is positive"
    Check -Condition ($v1.Count -eq 1024) -Message "Embedding dimension is 1024"
}

# STEP 4: Next-question decision
Write-Host "`n[STEP 4] Next-Question Decision -- Phi3" -ForegroundColor Cyan
Write-Host "  (Phi3 generation may take 30-90s...)" -ForegroundColor DarkGray

$decisionBody = @{
    current_question           = $SampleQuestion
    candidate_answer           = $SampleAnswer
    ideal_answer               = $IdealAnswer
    category                   = "behavioral"
    remaining_bank_questions   = 4
    followup_count_for_current = 0
}
$decisionRes = Invoke-API -Label "POST /api/interviews/next-question-decision" `
    -Url "$BaseUrl/api/interviews/next-question-decision" `
    -Method POST `
    -Body $decisionBody `
    -TimeoutSec 180

Check -Condition $decisionRes.Success -Message "Decision returned"
if ($decisionRes.Success) {
    $action = $decisionRes.Data.data.action
    $source = $decisionRes.Data.data.source
    $reason = $decisionRes.Data.data.reason
    Write-Host "     Action : $action" -ForegroundColor White
    Write-Host "     Source : $source" -ForegroundColor White
    Write-Host "     Reason : $reason" -ForegroundColor White
    $validActions = @("follow_up", "next_bank_question")
    Check -Condition ($validActions -contains $action) -Message "Action is valid (follow_up or next_bank_question)"
    if ($action -eq "follow_up") {
        $fq = $decisionRes.Data.data.followup_question
        Write-Host "     Follow-up: $fq" -ForegroundColor Gray
        Check -Condition ($fq.Length -gt 5) -Message "Follow-up question has content"
    }
}

# STEP 5: Direct follow-up generation
Write-Host "`n[STEP 5] Direct Follow-Up Generation -- Phi3" -ForegroundColor Cyan
Write-Host "  (Phi3 generation may take 30-90s...)" -ForegroundColor DarkGray

$followupBody = @{
    original_question = $SampleQuestion
    candidate_answer  = $SampleAnswer
    ideal_answer      = $IdealAnswer
    category          = "behavioral"
}
$followupRes = Invoke-API -Label "POST /api/interviews/follow-up-question" `
    -Url "$BaseUrl/api/interviews/follow-up-question" `
    -Method POST `
    -Body $followupBody `
    -TimeoutSec 180

Check -Condition $followupRes.Success -Message "Follow-up question generated"
if ($followupRes.Success) {
    $fq     = $followupRes.Data.data.followup_question
    $source = $followupRes.Data.data.source
    Write-Host "     Source   : $source" -ForegroundColor White
    Write-Host "     Question : $fq" -ForegroundColor Gray
    Check -Condition ($fq.Length -gt 5) -Message "Follow-up question has content"
    $validSources = @("phi-3-mini", "phi3", "ollama", "fallback")
    Check -Condition ($validSources -contains $source) -Message "Source is recognized"
}

# STEP 6: End session
Write-Host "`n[STEP 6] End Session" -ForegroundColor Cyan

$FinalScore = if ($CosineSim) { [math]::Round($CosineSim * 5, 2) } else { 3.0 }
$endBody = @{
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
                    roberta_similarity = $CosineSim
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
$endRes = Invoke-API -Label "POST /api/interviews/sessions/$SessionId/end" `
    -Url "$BaseUrl/api/interviews/sessions/$SessionId/end" `
    -Method POST `
    -Body $endBody

Check -Condition $endRes.Success -Message "Session ended"

# STEP 7: Verify stored session
Write-Host "`n[STEP 7] Verify Stored Session" -ForegroundColor Cyan
Start-Sleep -Seconds 1
$readRes = Invoke-API -Label "GET /api/interviews/sessions/$SessionId" `
    -Url "$BaseUrl/api/interviews/sessions/$SessionId" `
    -TimeoutSec 15

Check -Condition $readRes.Success -Message "Session readable from DB"
if ($readRes.Success) {
    $meta   = $readRes.Data.data.metadata
    $reason = $meta.completion_reason
    $stored = $meta.score_summary.overall_average
    Write-Host "     completion_reason : $re    ason" -ForegroundColor White
    Write-Host "     overall_average   : $stored / 5" -ForegroundColor White
    Check -Condition ($reason -eq "manual") -Message "completion_reason stored correctly"
    Check -Condition ($null -ne $stored)    -Message "overall_average persisted"
}

# Summary
Write-Host "`n$Sep"
Write-Host " RESULTS"
Write-Host $Sep
Write-Host "  Passed : $Passed" -ForegroundColor Green
Write-Host "  Failed : $Failed" -ForegroundColor $(if ($Failed -gt 0) { "Red" } else { "Green" })
Write-Host "  Session: $SessionId  (delete from Supabase if not needed)"
Write-Host $Sep
