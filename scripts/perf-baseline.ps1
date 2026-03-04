param(
  [string]$BaseUrl = "http://localhost:3000"
)

function Measure-Url {
  param(
    [string]$Url,
    [int]$Runs = 3
  )

  $samples = @()
  for ($i = 1; $i -le $Runs; $i++) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
      $response = Invoke-WebRequest -Uri $Url -Method GET -MaximumRedirection 0 -ErrorAction Stop
      $status = $response.StatusCode
    } catch {
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $status = [int]$_.Exception.Response.StatusCode
      } else {
        $status = -1
      }
    }
    $sw.Stop()
    $samples += [pscustomobject]@{
      url = $Url
      status = $status
      ms = [math]::Round($sw.Elapsed.TotalMilliseconds, 2)
    }
  }

  $avg = [math]::Round(($samples | Measure-Object -Property ms -Average).Average, 2)
  $min = [math]::Round(($samples | Measure-Object -Property ms -Minimum).Minimum, 2)
  $max = [math]::Round(($samples | Measure-Object -Property ms -Maximum).Maximum, 2)
  return [pscustomobject]@{
    url = $Url
    avg_ms = $avg
    min_ms = $min
    max_ms = $max
    samples = $samples
  }
}

$targets = @(
  "$BaseUrl/login",
  "$BaseUrl/signup",
  "$BaseUrl/questionnaire/thank-you",
  "$BaseUrl/admin/dashboard/v4",
  "$BaseUrl/api/auth/session",
  "$BaseUrl/api/surveys?status=published",
  "$BaseUrl/api/dashboard/activity",
  "$BaseUrl/api/responses?limit=200"
)

Write-Host ""
Write-Host "Audioform perf baseline ($BaseUrl)" -ForegroundColor Cyan
Write-Host ""

$results = @()
foreach ($target in $targets) {
  $result = Measure-Url -Url $target -Runs 3
  $results += $result
  Write-Host ("{0} | avg {1}ms | min {2}ms | max {3}ms" -f $target, $result.avg_ms, $result.min_ms, $result.max_ms)
}

Write-Host ""
Write-Host "Done."

