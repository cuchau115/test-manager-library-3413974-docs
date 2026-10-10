# Evidencia E2E — app React contra el contrato de la API

Verificación de la app (`test-manager-library-3413974-app`, tareas `APP-01`…`APP-11`) contra un
**mock fiel al contrato** (`../spec-python/api-contract.md`), en dos niveles:

1. **Contrato (curl/PowerShell):** recorre login, catálogo, socios, préstamo, devolución, vencidos y
   reporte, comprobando los códigos y el cuerpo de error único `{code,message,details}`.
2. **Navegador real (Chromium/Playwright):** recorre la UI de la app y comprueba render, visibilidad
   por rol, guardias de ruta y que **no haya errores de consola**.

> El mock y los estáticos se sirven en el **mismo origen** (un puerto), de modo que la app usa
> `VITE_API_URL=/api/v1` (relativo) y no hay CORS. La app no depende de la API real (contrato congelado).

## Resultados (2026-10-10)

- `verify-flow.ps1`: **17 PASS, 0 FAIL**.
- `browser.js` (Chromium): **15 PASS, 0 FAIL**, **0 errores de consola**.
- Capturas en `shots/` (login, panel admin, catálogo, socios, préstamo detalle, devolución, vencidos, reporte).

## Archivos

| Archivo | Qué es |
|---|---|
| `server.js` | Mock de la API (`/api/v1/*`) + servidor estático del `dist` de la app, en un solo origen |
| `verify-flow.ps1` | Recorrido de contrato con `Invoke-WebRequest` (códigos + cuerpo de error) |
| `browser.js` | Recorrido E2E en Chromium con `playwright-core` (UI real) |

## Cómo reproducir

Requisitos: Docker Desktop. Sin Node/PHP en el host.

```powershell
$app = "..\..\..\test-manager-library-3413974-app"   # ruta al repo app (hermano de docs)
$tmp = "$env:TEMP\opencode\mllib-verify"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

# 1) build de la app apuntando a la API relativa
docker run --rm -v "${app}:/app" -w /app -e VITE_API_URL=/api/v1 node:20-alpine `
  sh -c "npm install --no-audit --no-fund >/dev/null && VITE_API_URL=/api/v1 npm run build"

# 2) preparar entorno de verificación (mock + dist)
Copy-Item server.js, verify-flow.ps1, browser.js $tmp
New-Item -ItemType Directory -Force -Path "$tmp\shots" | Out-Null
Copy-Item -Recurse "$app\dist" "$tmp\dist"

# 3) arrancar el mock (API + estáticos en http://localhost:8090)
docker rm -f mllib-mock 2>$null | Out-Null
docker run -d --name mllib-mock -p 8090:8090 -v "${tmp}:/verify" -w /verify node:20-alpine node server.js

# 4) recorrido de contrato
powershell -ExecutionPolicy Bypass -File "$tmp\verify-flow.ps1"

# 5) recorrido en navegador real
docker run --rm -v "${tmp}:/verify" -w /verify `
  -e BASE_URL=http://host.docker.internal:8090 -e SHOTS=/verify/shots `
  mcr.microsoft.com/playwright:v1.48.0-jammy `
  sh -c "npm i playwright-core@1.48.0 --no-save --no-audit --no-fund >/dev/null && node browser.js"

# 6) limpieza
docker rm -f mllib-mock
```

Salida esperada: `RESULTADO: 17 PASS, 0 FAIL` y `RESULTADO NAVEGADOR: 15 PASS, 0 FAIL`.
