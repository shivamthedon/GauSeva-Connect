$ErrorActionPreference = "Continue"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
Set-Location "S:\GauSeva-Connect-main"
$log = "S:\GauSeva-Connect-main\scripts\firebase-deploy-status.txt"
"START $(Get-Date -Format o)" | Set-Content $log

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Firebase Login + Deploy Firestore Security Rules" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "A browser window will open. Sign in with the Google" -ForegroundColor Yellow
Write-Host "account that owns project: gauseva-connect-87e8d" -ForegroundColor Yellow
Write-Host ""

firebase login --reauth 2>&1 | Tee-Object -FilePath $log -Append
if ($LASTEXITCODE -ne 0) {
  "LOGIN_FAILED $LASTEXITCODE" | Add-Content $log
  Write-Host "Login failed. Close this window and try again." -ForegroundColor Red
  Start-Sleep -Seconds 8
  exit 1
}
"LOGIN_OK" | Add-Content $log
Write-Host "Login OK. Deploying firestore.rules ..." -ForegroundColor Green

@'
{
  "projects": {
    "default": "gauseva-connect-87e8d"
  }
}
'@ | Set-Content -Path ".firebaserc" -Encoding UTF8

firebase use gauseva-connect-87e8d 2>&1 | Tee-Object -FilePath $log -Append
firebase deploy --only firestore:rules --project gauseva-connect-87e8d 2>&1 | Tee-Object -FilePath $log -Append
$code = $LASTEXITCODE
"DEPLOY_EXIT $code $(Get-Date -Format o)" | Add-Content $log

if ($code -eq 0) {
  "SUCCESS" | Add-Content $log
  Write-Host "SUCCESS: Firestore rules deployed." -ForegroundColor Green
} else {
  "FAILED" | Add-Content $log
  Write-Host "Deploy failed with exit code $code" -ForegroundColor Red
}

Start-Sleep -Seconds 5
exit $code
