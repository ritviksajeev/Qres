# Fallback runner for machines where csc.exe is missing from the .NET Framework
# folder. Compiles the same source in-memory and hands the args to it. Slower
# than the cached exe (about a second), but it always works.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CliArgs)

$ErrorActionPreference = 'Stop'
$source = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'QresDisplay.cs')
Add-Type -TypeDefinition $source -Language CSharp | Out-Null
[Qres.Program]::Main($CliArgs) | Out-Null
