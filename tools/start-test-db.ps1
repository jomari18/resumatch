# Starts a disposable PostgreSQL cluster for `npm run test:db` on 127.0.0.1:55454.
# The cluster lives in .local/testdb inside this repo and never touches a hosted database.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$data = [IO.Path]::GetFullPath((Join-Path $root '.local/testdb'))
if (-not $data.StartsWith($root + [IO.Path]::DirectorySeparatorChar)) { throw 'Unsafe cluster path' }

$bin = Get-ChildItem 'C:/Program Files/PostgreSQL' -Directory -ErrorAction SilentlyContinue |
  Where-Object { [int]::TryParse($_.Name, [ref]0) -and [int]$_.Name -ge 17 } |
  Sort-Object { [int]$_.Name } -Descending |
  Select-Object -First 1 |
  ForEach-Object { Join-Path $_.FullName 'bin' }
if (-not $bin) { throw 'PostgreSQL 17 or newer was not found in C:/Program Files/PostgreSQL' }

if (-not (Test-Path -LiteralPath (Join-Path $data 'PG_VERSION'))) {
  New-Item -ItemType Directory -Force -Path (Split-Path $data) | Out-Null
  & (Join-Path $bin 'initdb.exe') -D $data -U postgres -A trust -E UTF8 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Cannot initialize the test cluster' }
}

& (Join-Path $bin 'pg_ctl.exe') -D $data status | Out-Null
if ($LASTEXITCODE -ne 0) {
  # Started through cmd with output sent to nul: the server inherits pg_ctl's handles, and an
  # inherited pipe would keep the caller waiting for as long as the server runs.
  $pgCtl = Join-Path $bin 'pg_ctl.exe'
  $log = Join-Path $root '.local/postgres.log'
  cmd.exe /c "`"$pgCtl`" -D `"$data`" -l `"$log`" -o `"-p 55454 -h 127.0.0.1`" -t 30 start >nul 2>&1"
  if ($LASTEXITCODE -ne 0) { throw 'Cannot start the test cluster' }
}

$psql = Join-Path $bin 'psql.exe'
$exists = & $psql -h 127.0.0.1 -p 55454 -U postgres -d postgres -Atc "select 1 from pg_database where datname = 'resumatch_test'"
if ($exists -ne '1') {
  & (Join-Path $bin 'createdb.exe') -h 127.0.0.1 -p 55454 -U postgres resumatch_test
  if ($LASTEXITCODE -ne 0) { throw 'Cannot create resumatch_test' }
}
& $psql -h 127.0.0.1 -p 55454 -U postgres -d resumatch_test -q -f (Join-Path $root 'tests/db/bootstrap.sql')
if ($LASTEXITCODE -ne 0) { throw 'Cannot bootstrap roles' }
Write-Output 'ResuMatch test database ready on 127.0.0.1:55454 (resumatch_test).'
