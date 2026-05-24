$ErrorActionPreference = "Stop"

$nodeRoot = Join-Path $PSScriptRoot ".node-runtime\node-v24.14.0-win-x64"
$env:PATH = "$nodeRoot;$env:PATH"

& (Join-Path $nodeRoot "npm.cmd") run dev
