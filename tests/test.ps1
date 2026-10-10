chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$URL = "http://localhost:5000/api/tasks/1"
$REQUESTS = 10000
$PARALLEL = 100

Write-Host "Нагрузочное тестирование: $REQUESTS запросов, параллелизм $PARALLEL"
$START = Get-Date
$jobs = @()
for ($i = 1; $i -le $REQUESTS; $i++) {
    $job = Start-Job -ScriptBlock {
        param($url)
        try {
            $code = curl.exe -s -o NUL -w "%{http_code}" $url
            if ($code -ne "200") { return "FAIL" }
        } catch { return "ERROR" }
    } -ArgumentList $URL
    $jobs += $job
    if ($jobs.Count -ge $PARALLEL) {
        $jobs | Wait-Job | Receive-Job | Out-Null
        $jobs | Remove-Job
        $jobs = @()
    }
}
if ($jobs.Count -gt 0) { $jobs | Wait-Job | Receive-Job }
$END = Get-Date
$TIME = ($END - $START).TotalSeconds
Write-Host "Общее время выполнения: $TIME секунд"