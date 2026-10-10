'use strict';
// Mock de la API Manager Library (contrato spec-python/api-contract.md) + servidor estático del dist.
// Un solo origen (mismo puerto) para evitar CORS en la verificación.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = Number(process.env.PORT || 8090);
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, 'dist');
const BASE = '/api/v1';

const uuid = () => randomUUID();
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');

// ---------------------------------------------------------------- datos
const categories = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Ciencia ficción' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Ensayo' },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Historia' },
  { id: '44444444-4444-4444-8444-444444444444', name: 'Novela' },
  { id: '55555555-5555-4555-8555-555555555555', name: 'Poesía' },
];
const catName = (id) => (categories.find((c) => c.id === id) || {}).name || null;

let books = [
  { id: uuid(), title: 'Cien años de soledad', author: 'Gabriel García Márquez', isbn: '9780307474728', category_id: categories[3].id, total_copies: 4, available_copies: 4, cover_key: null, deleted_at: null },
  { id: uuid(), title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593', category_id: categories[0].id, total_copies: 3, available_copies: 3, cover_key: null, deleted_at: null },
  { id: uuid(), title: 'El nombre de la rosa', author: 'Umberto Eco', isbn: '9780151446476', category_id: categories[3].id, total_copies: 2, available_copies: 2, cover_key: null, deleted_at: null },
  { id: uuid(), title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316097', category_id: categories[2].id, total_copies: 5, available_copies: 5, cover_key: null, deleted_at: null },
  { id: uuid(), title: 'Veinte poemas de amor', author: 'Pablo Neruda', isbn: '9788497404792', category_id: categories[4].id, total_copies: 2, available_copies: 2, cover_key: null, deleted_at: null },
  { id: uuid(), title: 'Ficciones', author: 'Jorge Luis Borges', isbn: '9780802130303', category_id: categories[0].id, total_copies: 3, available_copies: 3, cover_key: null, deleted_at: null },
];

let members = [
  { id: uuid(), full_name: 'Ana Torres', document_number: '1001' },
  { id: uuid(), full_name: 'Luis Gómez', document_number: '1002' },
  { id: uuid(), full_name: 'Marta Ruiz', document_number: '1003' },
];

let loans = [];

function makeItem(book) {
  return {
    id: uuid(),
    book_id: book.id,
    book_title: book.title,
    isbn: book.isbn,
    category_name: catName(book.category_id),
    due_at: null,
    returned_at: null,
  };
}

function createLoan(memberId, bookIds, loanedAt) {
  const loan = {
    id: uuid(),
    member_id: memberId,
    loaned_at: loanedAt,
    items: [],
  };
  for (const bid of bookIds) {
    const book = books.find((b) => b.id === bid && !b.deleted_at);
    if (!book) continue;
    const item = makeItem(book);
    item.due_at = new Date(new Date(loanedAt).getTime() + 14 * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');
    loan.items.push(item);
  }
  loans.push(loan);
  return loan;
}

// 3 préstamos vencidos (sembrador)
createLoan(members[0].id, [books[0].id], daysAgo(20));
createLoan(members[1].id, [books[1].id, books[2].id], daysAgo(18));
createLoan(members[2].id, [books[3].id], daysAgo(16));
// un préstamo abierto normal para el reporte
createLoan(members[0].id, [books[4].id], daysAgo(2));

function loanStatus(loan) {
  const anyReturned = loan.items.some((i) => i.returned_at);
  const allReturned = loan.items.every((i) => i.returned_at);
  if (allReturned) return 'closed';
  const overdue = loan.items.some((i) => !i.returned_at && new Date(i.due_at) < new Date());
  return overdue ? 'overdue' : 'open';
}

function loanView(loan, withMember) {
  const view = {
    id: loan.id,
    member_id: loan.member_id,
    loaned_at: loan.loaned_at,
    status: loanStatus(loan),
    items: loan.items.map((i) => ({ ...i })),
  };
  if (withMember) view.member_name = (members.find((m) => m.id === loan.member_id) || {}).full_name || null;
  return view;
}

// ---------------------------------------------------------------- helpers HTTP
function send(res, status, body, headers = {}) {
  const payload = body == null ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(payload);
}
function err(res, status, code, message, details = []) {
  send(res, status, { code, message, details });
}
function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}
function roleFromToken(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+mock-(admin|librarian)-/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------- API
async function handleApi(req, res, url) {
  const p = url.pathname.slice(BASE.length) || '/';
  const method = req.method.toUpperCase();
  const q = url.searchParams;
  const page = Math.max(1, Number(q.get('page') || 1));
  const size = Math.min(50, Math.max(1, Number(q.get('size') || 20)));

  // login (público)
  if (p === '/auth/login' && method === 'POST') {
    const body = await readBody(req);
    if (!body.username || !body.password) {
      return err(res, 422, 'VALIDATION_ERROR', 'Usuario y contraseña son obligatorios');
    }
    const role = String(body.username).trim().toLowerCase() === 'admin' ? 'admin' : 'librarian';
    return send(res, 200, { access_token: `mock-${role}-${uuid()}`, token_type: 'Bearer', expires_in: 28800, role });
  }

  if (p === '/health' && method === 'GET') return send(res, 200, { status: 'ok' });

  // resto requiere token
  const role = roleFromToken(req);
  if (!role) return err(res, 401, 'INVALID_CREDENTIALS', 'Sesión no válida o vencida');

  if (p === '/categories' && method === 'GET') {
    return send(res, 200, { items: [...categories].sort((a, b) => a.name.localeCompare(b.name)), page: 1, size: categories.length, total: categories.length });
  }

  // ---- libros
  if (p === '/books' && method === 'GET') {
    let list = books.filter((b) => !b.deleted_at);
    const text = (q.get('q') || '').toLowerCase();
    const cat = q.get('category_id');
    if (text) list = list.filter((b) => b.title.toLowerCase().includes(text) || b.author.toLowerCase().includes(text) || b.isbn.includes(text));
    if (cat) list = list.filter((b) => b.category_id === cat);
    list = list.sort((a, b) => a.title.localeCompare(b.title));
    const total = list.length;
    list = list.slice((page - 1) * size, page * size);
    return send(res, 200, { items: list.map(bookView), page, size, total });
  }
  if (p === '/books' && method === 'POST') {
    if (role !== 'admin') return err(res, 403, 'FORBIDDEN_ROLE', 'Rol insuficiente');
    const b = await readBody(req);
    if (!b.title || !b.author || String(b.isbn || '').length !== 13 || !b.category_id || Number(b.total_copies) < 1) {
      return err(res, 422, 'VALIDATION_ERROR', 'Datos del libro inválidos');
    }
    if (books.some((x) => x.isbn === b.isbn && !x.deleted_at)) return err(res, 409, 'ISBN_TAKEN', 'El ISBN ya existe');
    const nb = { id: uuid(), title: b.title, author: b.author, isbn: String(b.isbn), category_id: b.category_id, total_copies: Number(b.total_copies), available_copies: Number(b.total_copies), cover_key: null, deleted_at: null };
    books.push(nb);
    return send(res, 201, bookView(nb));
  }

  const bookIdMatch = p.match(/^\/books\/([^/]+)(\/cover)?$/);
  if (bookIdMatch) {
    const book = books.find((b) => b.id === bookIdMatch[1] && !b.deleted_at);
    const isCover = Boolean(bookIdMatch[2]);
    if (!book) return err(res, 404, 'NOT_FOUND', 'Libro no encontrado');
    if (isCover && method === 'GET') return err(res, 404, 'NOT_FOUND', 'Sin portada');
    if (isCover && method === 'PUT') {
      if (role !== 'admin') return err(res, 403, 'FORBIDDEN_ROLE', 'Rol insuficiente');
      book.cover_key = 'cover-' + uuid();
      return send(res, 200, { cover_key: book.cover_key });
    }
    if (isCover && method === 'DELETE') {
      if (role !== 'admin') return err(res, 403, 'FORBIDDEN_ROLE', 'Rol insuficiente');
      book.cover_key = null;
      return send(res, 204, null);
    }
    if (method === 'GET') return send(res, 200, bookView(book));
    if (method === 'PUT') {
      if (role !== 'admin') return err(res, 403, 'FORBIDDEN_ROLE', 'Rol insuficiente');
      const b = await readBody(req);
      if (b.title) book.title = b.title;
      if (b.author) book.author = b.author;
      if (b.category_id) book.category_id = b.category_id;
      if (b.total_copies != null) {
        const diff = Number(b.total_copies) - book.total_copies;
        book.total_copies = Number(b.total_copies);
        book.available_copies = Math.max(0, book.available_copies + diff);
      }
      return send(res, 200, bookView(book));
    }
    if (method === 'DELETE') {
      if (role !== 'admin') return err(res, 403, 'FORBIDDEN_ROLE', 'Rol insuficiente');
      const open = loans.some((l) => l.member_id && l.items.some((i) => i.book_id === book.id && !i.returned_at));
      if (open) return err(res, 409, 'BOOK_HAS_OPEN_LOANS', 'El libro tiene préstamos abiertos');
      book.deleted_at = nowIso();
      return send(res, 204, null);
    }
  }

  // ---- socios
  if (p === '/members' && method === 'GET') {
    let list = [...members];
    const text = (q.get('q') || '').toLowerCase();
    if (text) list = list.filter((m) => m.full_name.toLowerCase().includes(text) || m.document_number.includes(text));
    list = list.sort((a, b) => a.full_name.localeCompare(b.full_name));
    const total = list.length;
    list = list.slice((page - 1) * size, page * size);
    return send(res, 200, { items: list.map(memberView), page, size, total });
  }
  if (p === '/members' && method === 'POST') {
    const b = await readBody(req);
    if (!b.full_name || !b.document_number) return err(res, 422, 'VALIDATION_ERROR', 'Nombre y documento son obligatorios');
    if (members.some((m) => m.document_number === String(b.document_number))) return err(res, 409, 'DOCUMENT_TAKEN', 'El documento ya existe');
    const m = { id: uuid(), full_name: b.full_name, document_number: String(b.document_number) };
    members.push(m);
    return send(res, 201, memberView(m));
  }
  const memberMatch = p.match(/^\/members\/([^/]+)$/);
  if (memberMatch && method === 'GET') {
    const m = members.find((x) => x.id === memberMatch[1]);
    if (!m) return err(res, 404, 'NOT_FOUND', 'Socio no encontrado');
    return send(res, 200, memberView(m));
  }

  // ---- préstamos
  if (p === '/loans/overdue' && method === 'GET') {
    const items = [];
    for (const loan of loans) {
      for (const it of loan.items) {
        if (it.returned_at) continue;
        const late = Math.floor((Date.now() - new Date(it.due_at).getTime()) / 86400000);
        if (late > 0) items.push({ loan_id: loan.id, item_id: it.id, book_title: it.book_title, member_name: (members.find((m) => m.id === loan.member_id) || {}).full_name, due_at: it.due_at, days_late: late });
      }
    }
    items.sort((a, b) => b.days_late - a.days_late);
    return send(res, 200, { items, page: 1, size: items.length, total: items.length });
  }
  if (p === '/loans' && method === 'GET') {
    let list = [...loans];
    const status = q.get('status');
    const memberId = q.get('member_id');
    if (status) list = list.filter((l) => loanStatus(l) === status);
    if (memberId) list = list.filter((l) => l.member_id === memberId);
    list = list.sort((a, b) => new Date(b.loaned_at) - new Date(a.loaned_at));
    const total = list.length;
    list = list.slice((page - 1) * size, page * size);
    return send(res, 200, { items: list.map((l) => loanView(l, true)), page, size, total });
  }
  if (p === '/loans' && method === 'POST') {
    const b = await readBody(req);
    const member = members.find((m) => m.id === b.member_id);
    if (!member) return err(res, 404, 'NOT_FOUND', 'Socio no encontrado');
    const ids = Array.isArray(b.items) ? b.items.map((i) => i.book_id) : [];
    if (ids.length < 1 || ids.length > 3) return err(res, 422, 'VALIDATION_ERROR', 'El préstamo debe tener de 1 a 3 libros');
    if (new Set(ids).size !== ids.length) return err(res, 422, 'DUPLICATE_BOOK_IN_LOAN', 'No se puede repetir un libro');
    // vencidos
    const hasOverdue = loans.some((l) => l.member_id === member.id && loanStatus(l) === 'overdue');
    if (hasOverdue) return err(res, 409, 'MEMBER_HAS_OVERDUE', 'El socio tiene préstamos vencidos');
    const active = loans.filter((l) => l.member_id === member.id).reduce((n, l) => n + l.items.filter((i) => !i.returned_at).length, 0);
    if (active + ids.length > 3) return err(res, 422, 'MEMBER_LIMIT_EXCEEDED', 'El socio ya tiene 3 libros sin devolver');
    for (const bid of ids) {
      const book = books.find((x) => x.id === bid && !x.deleted_at);
      if (!book) return err(res, 404, 'NOT_FOUND', 'Libro no encontrado');
      if (book.available_copies < 1) return err(res, 409, 'BOOK_NOT_AVAILABLE', `No quedan ejemplares de «${book.title}»`);
    }
    for (const bid of ids) books.find((x) => x.id === bid).available_copies -= 1;
    const loan = createLoan(member.id, ids, nowIso());
    return send(res, 201, loanView(loan, false));
  }
  const loanReturn = p.match(/^\/loans\/([^/]+)\/items\/([^/]+)\/return$/);
  if (loanReturn && method === 'POST') {
    const loan = loans.find((l) => l.id === loanReturn[1]);
    if (!loan) return err(res, 404, 'NOT_FOUND', 'Préstamo no encontrado');
    const item = loan.items.find((i) => i.id === loanReturn[2]);
    if (!item) return err(res, 404, 'NOT_FOUND', 'Línea no encontrada');
    if (item.returned_at) return err(res, 409, 'ITEM_ALREADY_RETURNED', 'La línea ya fue devuelta');
    item.returned_at = nowIso();
    const book = books.find((x) => x.id === item.book_id);
    if (book) book.available_copies = Math.min(book.total_copies, book.available_copies + 1);
    return send(res, 200, { ...item });
  }
  const loanMatch = p.match(/^\/loans\/([^/]+)$/);
  if (loanMatch && method === 'GET') {
    const loan = loans.find((l) => l.id === loanMatch[1]);
    if (!loan) return err(res, 404, 'NOT_FOUND', 'Préstamo no encontrado');
    return send(res, 200, loanView(loan, true));
  }

  // ---- reporte
  if (p === '/reports/most-borrowed' && method === 'GET') {
    if (role !== 'admin') return err(res, 403, 'FORBIDDEN_ROLE', 'Rol insuficiente');
    const from = q.get('from');
    const to = q.get('to');
    if (!from || !to) return err(res, 422, 'VALIDATION_ERROR', 'from y to son obligatorios');
    if (from > to) return err(res, 422, 'INVALID_DATE_RANGE', 'El rango de fechas está invertido');
    const fromT = new Date(from + 'T00:00:00Z').getTime();
    const toT = new Date(to + 'T23:59:59Z').getTime();
    const agg = new Map();
    for (const loan of loans) {
      const t = new Date(loan.loaned_at).getTime();
      if (t < fromT || t > toT) continue;
      for (const it of loan.items) {
        const k = `${it.book_id}|${it.book_title}|${it.category_name}`;
        agg.set(k, (agg.get(k) || 0) + 1);
      }
    }
    const rows = [...agg.entries()].map(([k, times]) => {
      const [book_id, book_title, category_name] = k.split('|');
      return { book_id, book_title, category_name, times_borrowed: times };
    }).sort((a, b) => b.times_borrowed - a.times_borrowed || a.book_title.localeCompare(b.book_title));
    return send(res, 200, { from, to, rows });
  }

  return err(res, 404, 'NOT_FOUND', 'Ruta no encontrada: ' + method + ' ' + p);
}

function bookView(b) {
  return { id: b.id, title: b.title, author: b.author, isbn: b.isbn, category: { id: b.category_id, name: catName(b.category_id) }, total_copies: b.total_copies, available_copies: b.available_copies, cover_key: b.cover_key };
}
function memberView(m) {
  const active_loans = loans.filter((l) => l.member_id === m.id).reduce((n, l) => n + l.items.filter((i) => !i.returned_at).length, 0);
  return { id: m.id, full_name: m.full_name, document_number: m.document_number, active_loans };
}

// ---------------------------------------------------------------- estáticos
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json' };
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.join(STATIC_DIR, rel);
  if (!filePath.startsWith(STATIC_DIR)) return send(res, 403, { code: 'ERR', message: 'forbidden' });
  fs.readFile(filePath, (e, data) => {
    if (e) {
      // SPA fallback
      fs.readFile(path.join(STATIC_DIR, 'index.html'), (e2, html) => {
        if (e2) return send(res, 404, { code: 'NOT_FOUND', message: 'static missing' });
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith(BASE)) {
    handleApi(req, res, url).catch((e) => err(res, 500, 'INTERNAL', String(e && e.message)));
  } else if (url.pathname === '/health') {
    send(res, 200, { status: 'ok' });
  } else {
    serveStatic(req, res, url);
  }
});

server.listen(PORT, () => {
  console.log(`[mock] API ${BASE} + estáticos ${STATIC_DIR} en http://localhost:${PORT}`);
});
