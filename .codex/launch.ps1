param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$gameUrl = 'http://127.0.0.1:4177'

function Test-GameServer {
    try {
        $health = Invoke-RestMethod -Uri "$gameUrl/__health" -TimeoutSec 2
        return ($health.app -eq 'exploding-kittens-original-local')
    } catch { return $false }
}

try {
    if (-not (Test-GameServer)) {
        try {
            $occupied = Invoke-WebRequest -Uri $gameUrl -UseBasicParsing -TimeoutSec 2
            throw 'Port 4177 belongs to a different app. Close that app before launching Exploding Kittens.'
        } catch {
            if ($_.Exception.Message -like 'Port 4177*') { throw }
        }
        $nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
        $serverPath = Join-Path $PSScriptRoot 'serve.mjs'
        $serverProcess = Start-Process -FilePath $nodeExecutable -ArgumentList ('"' + $serverPath + '"') -WorkingDirectory $projectDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $PSScriptRoot 'server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'server-errors.log')
        Set-Content -LiteralPath (Join-Path $PSScriptRoot 'server.pid') -Value $serverProcess.Id
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            if (Test-GameServer) { break }
            if ($serverProcess.HasExited) { throw 'The game server exited. See .codex/server-errors.log.' }
            Start-Sleep -Milliseconds 200
        }
        if (-not (Test-GameServer)) { throw 'The game server did not start. See .codex/server-errors.log.' }
    }
    if (-not $NoBrowser) { Start-Process $gameUrl }
    Write-Output "Exploding Kittens is ready at $gameUrl"
} catch {
    Write-Error ("Could not launch Exploding Kittens: " + $_.Exception.Message)
    exit 1
}
