$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$shortcutShell = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $projectDirectory 'Play Original Edition.lnk'
$gameShortcut = $shortcutShell.CreateShortcut($shortcutPath)
$gameShortcut.TargetPath = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$gameShortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $PSScriptRoot 'launch.ps1') + '"'
$gameShortcut.WorkingDirectory = $projectDirectory
$gameShortcut.Description = 'Play Exploding Kittens Original Edition against bots'
$gameShortcut.IconLocation = (Join-Path $env:WINDIR 'System32\shell32.dll') + ',13'
$gameShortcut.Save()
Write-Output "Shortcut ready: $shortcutPath"
