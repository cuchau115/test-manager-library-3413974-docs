$ErrorActionPreference = 'Stop'
$B = 'http://localhost:8090/api/v1'
$script:pass = 0; $script:fail = 0
function Step($name, $expected, $scriptblock) {
  try {
    $r = & $scriptblock
    $status = $r.Status
    $body = $r.Body
  } catch {
    $resp = $_.Exception.Response
    if ($resp) { $status = [int]$resp.StatusCode } else { $status = -1 }
    try { $sr = New-Object System.IO.StreamReader($resp.GetResponseStream()); $body = $sr.ReadToEnd() } catch { $body = '' }
  }
  $ok = ($status -eq $expected)
  if ($ok) { $script:pass++ } else { $script:fail++ }
  $tag = if ($ok) { 'PASS' } else { 'FAIL' }
  Write-Host ("[{0}] {1,-52} esperado {2} -> {3}" -f $tag, $name, $expected, $status)
  if ($body) { $s = ($body | Out-String).Trim(); if ($s.Length -gt 160) { $s = $s.Substring(0,160) + '...' }; Write-Host ("        " + $s) }
  return $body
}
function Req($method, $path, $token, $jsonBody) {
  $uri = if ($path.StartsWith('http')) { $path } else { $B + $path }
  $headers = @{ Accept = 'application/json' }
  if ($token) { $headers.Authorization = "Bearer $token" }
  $p = @{ Method = $method; Uri = $uri; Headers = $headers; UseBasicParsing = $true }
  if ($jsonBody -ne $null) { $p.Body = ($jsonBody | ConvertTo-Json -Depth 6); $p.ContentType = 'application/json' }
  try {
    $w = Invoke-WebRequest @p
    return [pscustomobject]@{ Status = [int]$w.StatusCode; Body = $w.Content }
  } catch {
    $resp = $_.Exception.Response
    $s = [int]$resp.StatusCode
    $b = ''
    try { $sr = New-Object System.IO.StreamReader($resp.GetResponseStream()); $b = $sr.ReadToEnd() } catch {}
    return [pscustomobject]@{ Status = $s; Body = $b }
  }
}

Write-Host "=========== VERIFICACION E2E app <-> mock contrato ==========="

# 401 sin token
$null = Step 'GET /books sin token -> 401' 401 { Req GET '/books' $null $null }

# login admin
$login = Req POST '/auth/login' $null @{ username='admin'; password='x' }
$token = ($login.Body | ConvertFrom-Json).access_token
$role = ($login.Body | ConvertFrom-Json).role
$null = Step 'POST /auth/login (admin)' 200 { $login }
Write-Host ("        role=$role token=" + $token.Substring(0,14) + "...")

# login malo -> 422 (faltan campos) y credencial invalida simulada aparte
$null = Step 'POST /auth/login sin password -> 422' 422 { Req POST '/auth/login' $null @{ username='admin' } }

# categorias
$cats = Req GET '/categories' $token
$null = Step 'GET /categories (5)' 200 { $cats }
Write-Host ("        total=" + (($cats.Body | ConvertFrom-Json).total))

# libros
$books = Req GET '/books?q=Dune' $token
$null = Step 'GET /books?q=Dune' 200 { $books }
$bookList = ($books.Body | ConvertFrom-Json)
Write-Host ("        items=" + $bookList.items.Count + " total=" + $bookList.total)
$b1 = $bookList.items[0]

# socios: crear
$doc = 'DOC' + (Get-Random -Maximum 99999)
$newMember = Req POST '/members' $token @{ full_name='Socio Verificado'; document_number=$doc }
$null = Step 'POST /members (crear)' 201 { $newMember }
$member = ($newMember.Body | ConvertFrom-Json)
Write-Host ("        id=" + $member.id)
$null = Step 'POST /members documento duplicado -> 409 DOCUMENT_TAKEN' 409 { Req POST '/members' $token @{ full_name='Otro'; document_number=$doc } }
$null = Step 'GET /members?q=Socio Verificado' 200 { Req GET ('/members?q=' + [uri]::EscapeDataString('Socio Verificado')) $token }

# prestar 2 libros al socio nuevo (sin vencidos)
$books2 = Req GET '/books' $token
$all = ($books2.Body | ConvertFrom-Json).items
$loan = Req POST '/loans' $token @{ member_id=$member.id; items=@(@{ book_id=$all[0].id }, @{ book_id=$all[1].id }) }
$null = Step 'POST /loans (2 libros) -> 201' 201 { $loan }
$loanObj = ($loan.Body | ConvertFrom-Json)
Write-Host ("        loan id=" + $loanObj.id + " status=" + $loanObj.status + " items=" + $loanObj.items.Count)

# repetir libro -> 422 DUPLICATE_BOOK_IN_LOAN
$null = Step 'POST /loans libro repetido -> 422 DUPLICATE_BOOK_IN_LOAN' 422 { Req POST '/loans' $token @{ member_id=$member.id; items=@(@{ book_id=$all[2].id }, @{ book_id=$all[2].id }) } }

# devolver una linea
$item0 = $loanObj.items[0]
$ret = Req POST ("/loans/" + $loanObj.id + "/items/" + $item0.id + "/return") $token $null
$null = Step 'POST /loans/{id}/items/{item}/return -> 200' 200 { $ret }
$null = Step 'devolver dos veces -> 409 ITEM_ALREADY_RETURNED' 409 { Req POST ("/loans/" + $loanObj.id + "/items/" + $item0.id + "/return") $token $null }
$detail = Req GET ("/loans/" + $loanObj.id) $token
$null = Step 'GET /loans/{id} (detalle)' 200 { $detail }
Write-Host ("        status tras devolver 1 = " + ($detail.Body | ConvertFrom-Json).status)

# vencidos
$overdue = Req GET '/loans/overdue' $token
$null = Step 'GET /loans/overdue (3 vencidos)' 200 { $overdue }
Write-Host ("        vencidos=" + (($overdue.Body | ConvertFrom-Json).items.Count))

# reporte admin
$from = (Get-Date).AddDays(-30).ToString('yyyy-MM-dd'); $to = (Get-Date).ToString('yyyy-MM-dd')
$rep = Req GET ("/reports/most-borrowed?from=$from&to=$to") $token
$null = Step 'GET /reports/most-borrowed (admin)' 200 { $rep }
Write-Host ("        filas=" + (($rep.Body | ConvertFrom-Json).rows.Count))
$null = Step 'reporte rango invertido -> 422 INVALID_DATE_RANGE' 422 { Req GET ("/reports/most-borrowed?from=$to&to=$from") $token }

# rol librarian: reporte -> 403
$login2 = Req POST '/auth/login' $null @{ username='ana'; password='x' }
$token2 = ($login2.Body | ConvertFrom-Json).access_token
$null = Step 'GET /reports/most-borrowed como librarian -> 403' 403 { Req GET ("/reports/most-borrowed?from=$from&to=$to") $token2 }

Write-Host "============================================================="
Write-Host ("RESULTADO: {0} PASS, {1} FAIL" -f $script:pass, $script:fail)
