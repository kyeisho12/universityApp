# test-score-3.ps1
# Tests what score a "medium quality" answer receives from the RoBERTa scorer.
# A 3.0/5 answer has: situation + action, but weak/missing measurable result.
#
# Usage:
#   .\scripts\test-score-3.ps1
#   .\scripts\test-score-3.ps1 -BaseUrl "http://localhost:8000"
#   .\scripts\test-score-3.ps1 -Answer "your own answer here"

param(
    [string]$BaseUrl = "https://universityapp-production.up.railway.app",
    [string]$Answer  = ""
)

$BaseUrl = $BaseUrl.TrimEnd("/")
$Headers = @{ "Content-Type" = "application/json" }

# ------------------------------------------------------------
# Preset answers by target score
# ------------------------------------------------------------
$Presets = @{
    "1.0" = "I tried to fix the problem but it didn't work out."

    "2.0" = "There was a bug in our system and I was asked to fix it. I looked into it and made some changes but I'm not sure if it fully resolved everything."

    "3.0" = "During my internship, our API was returning inconsistent data. I was assigned to investigate. I added logging to trace the requests and found it was a caching issue. I updated the cache logic and the problem seemed to go away."

    "4.0" = "During my internship, our API was returning incorrect data for about 20% of requests. My team lead assigned me to debug it. I added structured logging to trace each request, identified a race condition in the caching layer, and implemented a mutex lock to fix it. After deployment, the error rate dropped significantly."

    "5.0" = "During my internship at a fintech startup, our payment API was returning incorrect balance data for roughly 20% of requests. My team lead assigned me to root-cause it within 48 hours. I added structured request logging, replayed failed transactions in staging, and traced the issue to a race condition in our Redis caching layer. I implemented a distributed mutex lock using Redlock. After deploying to production, balance inconsistency dropped from 20% to under 0.1%, and we had zero related support tickets the following week."
}

$IdealAnswer = "Describes the specific problem, the candidate's personal role and responsibility, the concrete actions they took, and a measurable outcome or result."

$Question = "Tell me about a time you had to solve a difficult technical problem."

# Use provided answer or default to the 3.0 preset
if (-not $Answer) {
    $Answer = $Presets["3.0"]
    Write-Host "`nNo answer provided. Using preset 3.0 answer." -ForegroundColor DarkGray
}

Write-Host "`n$("=" * 60)"
Write-Host " SCORE ESTIMATOR -- RoBERTa Cosine Similarity"
Write-Host "$("=" * 60)"
Write-Host "`n  Backend : $BaseUrl"
Write-Host "  Question: $Question"
Write-Host "`n  Answer  : $Answer" -ForegroundColor Cyan
Write-Host "  Ideal   : $IdealAnswer" -ForegroundColor DarkGray

# Call hf-embed
Write-Host "`n[1] Calling /api/hf-embed ..." -ForegroundColor Yellow
Write-Host "    (may take ~30s if model is loading)" -ForegroundColor DarkGray

$start = Get-Date
try {
    $body = @{ inputs = @($Answer, $IdealAnswer) } | ConvertTo-Json -Depth 5
    $resp = Invoke-RestMethod -Uri "$BaseUrl/api/hf-embed" -Method POST -Headers $Headers -Body $body -TimeoutSec 120
    $ms = [math]::Round(((Get-Date) - $start).TotalMilliseconds)
    Write-Host "    OK ($ms ms)" -ForegroundColor Green
} catch {
    Write-Host "    FAIL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Compute cosine similarity
$v1 = $resp[0]; $v2 = $resp[1]
$dot = 0.0; $n1 = 0.0; $n2 = 0.0
for ($i = 0; $i -lt $v1.Count; $i++) {
    $dot += $v1[$i] * $v2[$i]
    $n1  += $v1[$i] * $v1[$i]
    $n2  += $v2[$i] * $v2[$i]
}
$sim = [math]::Round($dot / ([math]::Sqrt($n1) * [math]::Sqrt($n2)), 4)

# Estimate score using frontend's similarityToLikert logic
# anchorScore and starScore are assumed 3.0 (neutral baseline) for this test
# Real scoring uses per-question HR-anchor values from the question bank
$anchorScore = 3.0
$starScore   = 3.0
$anchorWeight = [math]::Min(0.90, $sim * 0.90)
$starWeight   = 1.0 - $anchorWeight
$estimated    = [math]::Round([math]::Max(1, [math]::Min(5, $anchorScore * $anchorWeight + $starScore * $starWeight)), 2)

Write-Host "`n[2] Results" -ForegroundColor Yellow
Write-Host "    Cosine similarity : $sim  (0 = unrelated, 1 = identical)"
Write-Host "    Estimated score   : $estimated / 5" -ForegroundColor $(
    if ($estimated -ge 4)   { "Green" }
    elseif ($estimated -ge 3) { "Yellow" }
    else                      { "Red" }
)
Write-Host "    Embedding dims    : $($v1.Count)"

Write-Host "`n[3] Score interpretation"
Write-Host "    1.0 - 1.9  : Poor (vague, off-topic)"
Write-Host "    2.0 - 2.9  : Below average (missing key elements)"
Write-Host "    3.0 - 3.4  : Average (situation + action, weak result)"
Write-Host "    3.5 - 4.4  : Good (STAR mostly complete)"
Write-Host "    4.5 - 5.0  : Excellent (specific, measurable, concise)"

Write-Host "`n[4] Compare with all presets? Run:"
Write-Host '    $Presets.GetEnumerator() | ForEach-Object { .\scripts\test-score-3.ps1 -Answer $_.Value }' -ForegroundColor DarkGray
Write-Host "$("=" * 60)`n"
