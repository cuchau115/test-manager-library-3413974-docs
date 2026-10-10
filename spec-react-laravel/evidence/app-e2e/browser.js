'use strict';
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('playwright-core'));
}

const BASE = process.env.BASE_URL || 'http://host.docker.internal:8090';
const SHOTS = process.env.SHOTS || '/verify/shots';
let pass = 0, fail = 0;
const consoleErrors = [];

function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`[PASS] ${name}`); }
  else { fail++; console.log(`[FAIL] ${name} ${detail}`); }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

  try {
    // 1) arranque redirige a login
    await page.goto(BASE, { waitUntil: 'networkidle' });
    check('redirección a /login sin sesión', page.url().includes('/login'), page.url());
    await page.screenshot({ path: `${SHOTS}/01-login.png` });

    // 2) login admin
    await page.fill('input[autocomplete="username"]', 'admin');
    await page.fill('input[autocomplete="current-password"]', 'clave-segura');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('login'), { timeout: 8000 });
    const store = await page.evaluate(() => ({ token: localStorage.getItem('mllib.token'), role: localStorage.getItem('mllib.role') }));
    check('login admin guarda token y rol', Boolean(store.token) && store.role === 'admin', JSON.stringify(store));
    check('nav muestra "Reporte" para admin', await page.locator('.app-nav a', { hasText: 'Reporte' }).count() === 1);
    await page.screenshot({ path: `${SHOTS}/02-panel-admin.png` });

    // 3) catálogo con datos reales
    await page.click('.app-nav a:has-text("Catálogo")');
    await page.waitForSelector('table.data-table tbody tr');
    check('catálogo lista libros del mock (Dune)', await page.locator('td', { hasText: 'Dune' }).count() >= 1);
    await page.screenshot({ path: `${SHOTS}/03-catalogo.png` });

    // 4) crear socio desde la UI
    await page.click('.app-nav a:has-text("Socios")');
    await page.waitForSelector('input[name="full_name"]');
    const doc = 'NAV' + Math.floor(Math.random() * 100000);
    await page.fill('input[name="full_name"]', 'Socio Navegador');
    await page.fill('input[name="document_number"]', doc);
    await page.click('button:has-text("Crear socio")');
    await page.waitForSelector('text=Socio creado correctamente.', { timeout: 8000 });
    check('alta de socio muestra confirmación', true);
    check('socio nuevo aparece en la lista', await page.locator('td', { hasText: 'Socio Navegador' }).count() >= 1);
    await page.screenshot({ path: `${SHOTS}/04-socios.png` });

    // 5) registrar préstamo por la UI
    await page.click('.app-nav a:has-text("Prestar")');
    await page.waitForSelector('input[aria-label="Buscar socio"]');
    await page.fill('input[aria-label="Buscar socio"]', 'Socio Navegador');
    await page.click('.pick-list button:has-text("Socio Navegador")', { timeout: 8000 });
    await page.fill('input[aria-label="Buscar libro"]', 'Dune');
    await page.click('.pick-list button:has-text("Dune")', { timeout: 8000 });
    await page.click('button:has-text("Registrar préstamo")');
    await page.waitForURL(/\/prestamos\/[0-9a-f-]+$/, { timeout: 8000 });
    check('préstamo creado navega al detalle', /\/prestamos\/[0-9a-f-]+$/.test(new URL(page.url()).pathname), page.url());
    await page.waitForSelector('table.data-table tbody tr');
    await page.screenshot({ path: `${SHOTS}/05-prestamo-detalle.png` });

    // 6) devolver una línea
    await page.click('button:has-text("Devolver")');
    await page.waitForSelector('text=Devuelto', { timeout: 8000 });
    check('devolución de una línea se refleja en el detalle', true);
    await page.screenshot({ path: `${SHOTS}/06-prestamo-devuelto.png` });

    // 7) vencidos (3 sembrados)
    await page.click('.app-nav a:has-text("Vencidos")');
    await page.waitForSelector('table.data-table tbody tr');
    const overdueRows = await page.locator('table.data-table tbody tr').count();
    check('vencidos muestra 3+ líneas', overdueRows >= 3, 'filas=' + overdueRows);
    await page.screenshot({ path: `${SHOTS}/07-vencidos.png` });

    // 8) reporte (admin)
    await page.click('.app-nav a:has-text("Reporte")');
    await page.click('button:has-text("Generar reporte")');
    await page.waitForSelector('table.data-table tbody tr', { timeout: 8000 });
    const reportRows = await page.locator('table.data-table tbody tr').count();
    check('reporte muestra filas', reportRows >= 1, 'filas=' + reportRows);
    await page.screenshot({ path: `${SHOTS}/08-reporte.png` });

    // 9) logout + login librarian: no ve Reporte
    await page.click('button:has-text("Salir")');
    await page.waitForURL(/\/login/);
    await page.fill('input[autocomplete="username"]', 'ana');
    await page.fill('input[autocomplete="current-password"]', 'clave-segura');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('login'), { timeout: 8000 });
    const role2 = await page.evaluate(() => localStorage.getItem('mllib.role'));
    check('login librarian guarda rol', role2 === 'librarian', String(role2));
    check('nav oculta "Reporte" para librarian', await page.locator('.app-nav a', { hasText: 'Reporte' }).count() === 0);
    // ruta protegida /reportes como librarian -> redirige
    await page.goto(BASE + '/reportes', { waitUntil: 'networkidle' });
    check('ruta /reportes como librarian redirige', !page.url().includes('/reportes'), page.url());

    // 10) 401: sin token -> vuelve a login
    await page.evaluate(() => { localStorage.removeItem('mllib.token'); localStorage.removeItem('mllib.role'); });
    await page.goto(BASE + '/libros', { waitUntil: 'networkidle' });
    check('sin token redirige a login', page.url().includes('/login'), page.url());
  } catch (e) {
    fail++;
    console.log('[FAIL] excepción en la verificación: ' + e.message);
    try { await page.screenshot({ path: `${SHOTS}/99-error.png` }); } catch {}
  }

  console.log('-------------------------------------------------------------');
  check('sin errores de consola en el navegador', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
  console.log(`RESULTADO NAVEGADOR: ${pass} PASS, ${fail} FAIL`);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
