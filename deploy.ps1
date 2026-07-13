Set-Location $PSScriptRoot
$env:VERCEL_TOKEN = (Get-Content .env.vercel.local | Where-Object { $_ -match '^VERCEL_TOKEN=' }) -replace 'VERCEL_TOKEN=',''
npx vercel --prod
