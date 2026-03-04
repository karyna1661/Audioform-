param(
  [string]$BaseUrl = "http://localhost:3000"
)

Write-Host ""
Write-Host "Audioform Manual E2E Path" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"
Write-Host ""

$routes = @(
  "/",
  "/signup",
  "/login",
  "/admin/dashboard/v4",
  "/admin/questionnaires/v1",
  "/questionnaire/v1",
  "/questionnaire/thank-you",
  "/admin/responses"
)

Write-Host "Route smoke check:"
foreach ($route in $routes) {
  try {
    $response = Invoke-WebRequest -Uri "$BaseUrl$route" -Method GET -MaximumRedirection 0 -ErrorAction Stop
    Write-Host "  [OK] $route -> $($response.StatusCode)"
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
      Write-Host "  [WARN] $route -> $statusCode"
    } else {
      Write-Host "  [ERR] $route -> request failed"
    }
  }
}

Write-Host ""
Write-Host "Manual test sequence:"
Write-Host "1) Sign up or log in as creator."
Write-Host "2) Go to /admin/questionnaires/v1."
Write-Host "3) Create prompts and publish survey."
Write-Host "4) Copy 'survey link' and verify it is /questionnaire/v1?surveyId=<id>."
Write-Host "5) Copy 'embed link' and verify it is /embed/by-creator/<creatorId>/<surveyId>."
Write-Host "6) Open copied survey link in a new browser/private window."
Write-Host "7) Record answers for all prompts and submit final answer."
Write-Host "8) Confirm thank-you page appears."
Write-Host "9) Return to /admin/dashboard/v4 and confirm response count increases."
Write-Host "10) Click 'Open top signal' and verify moderation queue opens with playable audio."
Write-Host "11) Click 'Replay first response' and verify focused moderation route."
Write-Host ""
Write-Host "Expected outcomes:"
Write-Host "- Respondent sees only creator-published prompts."
Write-Host "- No hardcoded fallback prompts are shown."
Write-Host "- Survey link and embed link are distinct and correct."
Write-Host "- Thank-you page always appears after last prompt."
Write-Host "- Moderation replay works for saved responses."
Write-Host ""

