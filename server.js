const http = require('http');
const https = require('https');
const PORT = 3001;

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

let cachedSession = '';
let lastLogin = 0;

function login() {
  return new Promise((resolve, reject) => {
    const postData = 'k_ad=%FC%E7el+kuyumcu&pass=12345';
    const postBuf = Buffer.from(postData, 'ascii');
    const options = {
      hostname: 'www.umraniyekuyumculari.com',
      path: '/index.php?islem=giris',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postBuf.length,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'tr-TR,tr;q=0.9',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
      }
    };
    const req = http.request(options, (res) => {
      console.log('Login status:', res.statusCode);
      const cookies = res.headers['set-cookie'] || [];
      let sessionCookie = '';
      cookies.forEach(c => { if (c.includes('PHPSESSID')) sessionCookie = c.split(';')[0]; });
      res.on('data', () => {});
      res.on('end', () => resolve(sessionCookie));
    });
    req.on('error', reject);
    req.write(postBuf);
    req.end();
  });
}

function fetchEkran(sessionCookie) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.umraniyekuyumculari.com',
      path: '/ekran.php',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Accept': 'text/html',
        'Accept-Encoding': 'identity',
        'Cookie': sessionCookie,
        'Connection': 'keep-alive',
      }
    };
    const req = http.request(options, (res) => {
      console.log('Ekran status:', res.statusCode);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        console.log('Ekran size:', buf.length);
        resolve(buf.toString('latin1'));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function parse(html) {
  const result = {};
  const dateM = html.match(/(\d{2}\.\d{2}\.\d{4})/);
  if (dateM) result.tarih = dateM[1];
  const timeM = html.match(/(\d{2}:\d{2})/);
  if (timeM) result.saat = timeM[1];
  const tekRe = /<strong[^>]*>([^<]+)<\/strong><br\s*\/?>([\d.,]+)/gi;
  let m;
  while ((m = tekRe.exec(html)) !== null) result[m[1].trim()] = { fiyat: m[2].trim() };
  const ciftRe = /<strong[^>]*>([^<]+)<\/strong><\/td>\s*<td[^>]*>\s*([\d.,]+)\s*<\/td>\s*<td[^>]*>\s*([\d.,]+)\s*<\/td>/gi;
  while ((m = ciftRe.exec(html)) !== null) {
    if (m[2] !== '0,00') result[m[1].trim()] = { alis: m[2].trim(), satis: m[3].trim() };
  }
  return result;
}

async function getSession() {
  const now = Date.now();
  if (!cachedSession || now - lastLogin > 4 * 60 * 1000) {
    cachedSession = await login();
    lastLogin = now;
  }
  return cachedSession;
}

function claudeBilgi() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Altın hakkında ilginç, çeşitli ve birbirinden farklı 12 adet kısa bilgi üret.
Konular çok çeşitli olsun: tarih, yatırım, dünya ekonomisi, altın vs dolar/enflasyon, teknoloji, Türkiye, merkez bankaları, fiziksel özellikler, uzay, kuyumculuk, madencilik, rezervler, mitoloji, tıp, sanat.
Her seferinde farklı ve taze bilgiler seç. SADECE JSON döndür, başka hiçbir şey yazma:
{"bilgiler":[{"emoji":"📈","baslik":"kısa başlık","metin":"max 12 kelime açıklama"}]}`
      }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          const text = data.content[0].text;
          const clean = text.replace(/```json|```/g, '').trim();
          resolve(JSON.parse(clean));
        } catch(e) {
          console.error('Claude parse hatası:', e);
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ucel Kuyumcu — Anlık Altın Fiyatları</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --gold:#d4a017;
    --gold-light:#f0c040;
    --gold-dark:#a07810;
    --bg:#0d0d0d;
    --surface:#161616;
    --surface2:#1e1e1e;
    --border:#2a2a2a;
    --text:#f0f0f0;
    --muted:#888;
  }
  body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh}

  /* HEADER */
  header{
    background:linear-gradient(135deg,#0d0d0d 0%,#1a1400 50%,#0d0d0d 100%);
    border-bottom:1px solid #2a2000;
    padding:0 24px;
  }
  .header-inner{
    max-width:1100px;margin:0 auto;
    display:flex;align-items:center;justify-content:space-between;
    height:68px;
  }
  .logo{display:flex;align-items:center;gap:12px}
  .logo-icon{
    width:40px;height:40px;border-radius:10px;
    background:linear-gradient(135deg,var(--gold-dark),var(--gold-light));
    display:flex;align-items:center;justify-content:center;
    font-size:20px;box-shadow:0 0 16px rgba(212,160,23,0.4);
  }
  .logo-text{font-size:18px;font-weight:700;letter-spacing:.5px}
  .logo-text span{color:var(--gold-light)}
  .live-badge{
    display:flex;align-items:center;gap:6px;
    background:#0a1a0a;border:1px solid #1a3a1a;
    padding:5px 12px;border-radius:999px;
    font-size:12px;color:#4caf50;font-weight:600;
  }
  .live-dot{width:7px;height:7px;border-radius:50%;background:#4caf50;animation:pulse 1.5s ease-in-out infinite}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}

  /* MAIN */
  main{max-width:1100px;margin:0 auto;padding:32px 24px 64px}

  /* STAT BAR */
  .stat-bar{
    display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
    gap:12px;margin-bottom:32px;
  }
  .stat-card{
    background:var(--surface);border:1px solid var(--border);border-radius:14px;
    padding:16px 20px;display:flex;align-items:center;gap:14px;
    transition:border-color .2s;
  }
  .stat-card:hover{border-color:#3a2a00}
  .stat-icon{font-size:26px}
  .stat-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px}
  .stat-value{font-size:20px;font-weight:700;color:var(--gold-light)}
  .stat-sub{font-size:11px;color:var(--muted);margin-top:2px}

  /* SECTION TITLE */
  .section-title{
    font-size:13px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);
    margin-bottom:14px;display:flex;align-items:center;gap:8px;
  }
  .section-title::after{content:'';flex:1;height:1px;background:var(--border)}

  /* PRICE TABLE */
  .price-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:40px}
  .price-card{
    background:var(--surface);border:1px solid var(--border);border-radius:14px;
    padding:18px 20px;display:flex;align-items:center;justify-content:space-between;
    transition:all .2s;position:relative;overflow:hidden;
  }
  .price-card::before{
    content:'';position:absolute;top:0;left:0;right:0;height:2px;
    background:linear-gradient(90deg,transparent,var(--gold-dark),transparent);
    opacity:0;transition:opacity .2s;
  }
  .price-card:hover{border-color:#3a2a00;transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.4)}
  .price-card:hover::before{opacity:1}
  .price-name{font-size:14px;font-weight:600;color:var(--text);margin-bottom:3px}
  .price-type{font-size:11px;color:var(--muted)}
  .price-values{text-align:right}
  .price-alis{font-size:11px;color:var(--muted);margin-bottom:2px}
  .price-alis span,.price-satis span{color:var(--text);font-weight:600}
  .price-satis{font-size:11px;color:var(--muted)}
  .price-single{font-size:18px;font-weight:700;color:var(--gold-light)}

  /* SKELETON */
  .skeleton{background:linear-gradient(90deg,var(--surface2) 25%,#252525 50%,var(--surface2) 75%);background-size:200% 100%;animation:shimmer 1.4s ease-in-out infinite;border-radius:6px}
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

  /* AI FACTS */
  .facts-scroll{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
  .facts-scroll::-webkit-scrollbar{height:4px}
  .facts-scroll::-webkit-scrollbar-track{background:var(--border);border-radius:2px}
  .facts-scroll::-webkit-scrollbar-thumb{background:var(--gold-dark);border-radius:2px}
  .fact-card{
    flex:0 0 220px;scroll-snap-align:start;
    background:var(--surface);border:1px solid var(--border);border-radius:14px;
    padding:18px;transition:all .2s;
  }
  .fact-card:hover{border-color:#3a2a00;transform:translateY(-2px)}
  .fact-emoji{font-size:28px;margin-bottom:10px}
  .fact-title{font-size:13px;font-weight:700;color:var(--gold-light);margin-bottom:6px;line-height:1.3}
  .fact-text{font-size:12px;color:var(--muted);line-height:1.5}
  .facts-loading{display:flex;gap:12px}
  .fact-skel{flex:0 0 220px;height:130px;border-radius:14px}

  /* FOOTER */
  footer{
    border-top:1px solid var(--border);padding:20px 24px;
    text-align:center;font-size:12px;color:var(--muted);
  }
  footer strong{color:var(--gold)}

  /* REFRESH HINT */
  .refresh-hint{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:4px;margin-top:6px}
  #countdown{color:var(--gold);font-weight:600}

  @media(max-width:600px){
    .header-inner{height:56px}
    .logo-text{font-size:15px}
    main{padding:20px 14px 48px}
    .stat-bar{grid-template-columns:1fr 1fr}
    .stat-value{font-size:17px}
  }
</style>
</head>
<body>

<header>
  <div class="header-inner">
    <div class="logo">
      <div class="logo-icon">⚜</div>
      <div class="logo-text">Ucel <span>Kuyumcu</span></div>
    </div>
    <div class="live-badge">
      <span class="live-dot"></span>
      Canlı Fiyat
    </div>
  </div>
</header>

<main>
  <!-- STAT BAR -->
  <div class="stat-bar" id="statBar">
    <div class="stat-card"><span class="stat-icon">📅</span><div><div class="stat-label">Tarih</div><div class="stat-value" id="statTarih">—</div></div></div>
    <div class="stat-card"><span class="stat-icon">🕐</span><div><div class="stat-label">Güncelleme</div><div class="stat-value" id="statSaat">—</div><div class="refresh-hint">Yenileme: <span id="countdown">30</span>sn</div></div></div>
    <div class="stat-card"><span class="stat-icon">💛</span><div><div class="stat-label">Gram Altın Alış</div><div class="stat-value" id="statGram">—</div><div class="stat-sub">₺</div></div></div>
    <div class="stat-card"><span class="stat-icon">📊</span><div><div class="stat-label">Toplam Ürün</div><div class="stat-value" id="statCount">—</div><div class="stat-sub">çeşit</div></div></div>
  </div>

  <!-- PRICES -->
  <div class="section-title">Güncel Fiyatlar</div>
  <div class="price-grid" id="priceGrid">
    ${Array(8).fill('<div class="price-card"><div><div class="skeleton" style="width:120px;height:14px;margin-bottom:6px"></div><div class="skeleton" style="width:70px;height:10px"></div></div><div><div class="skeleton" style="width:80px;height:12px;margin-bottom:4px"></div><div class="skeleton" style="width:80px;height:12px"></div></div></div>').join('')}
  </div>

  <!-- AI FACTS -->
  <div class="section-title" style="margin-top:8px">Altın Hakkında — AI Bilgi Kartları</div>
  <div id="factsWrap">
    <div class="facts-loading">
      ${Array(5).fill('<div class="fact-skel skeleton"></div>').join('')}
    </div>
  </div>
</main>

<footer>
  Veriler <strong>Umraniye Kuyumculari</strong> sisteminden alınmaktadır &nbsp;·&nbsp; Bilgi kartları <strong>Claude AI</strong> tarafından üretilmektedir
</footer>

<script>
const SKIP = new Set(['tarih','saat']);
const ORDER = [
  'Gram Altın','Çeyrek Altın','Yarım Altın','Tam Altın',
  'Cumhuriyet Altını','Ata Altın','Beşli Altın','Gremese',
  'Dolar','Euro','Sterlin','Dolar/Gram','Euro/Gram'
];

let countdown = 30;

function fmt(v){ return v ? v + ' ₺' : '—'; }

function buildPriceCard(name, val) {
  const icon = name.includes('Altın') || name.includes('Altın') ? '🥇'
    : name === 'Dolar' ? '💵'
    : name === 'Euro' ? '💶'
    : name === 'Sterlin' ? '💷'
    : '📌';
  const type = val.alis ? 'Alış / Satış' : val.fiyat ? 'Fiyat' : '';
  const right = val.alis
    ? \`<div class="price-alis">Alış <span>\${val.alis} ₺</span></div>
       <div class="price-satis">Satış <span>\${val.satis} ₺</span></div>\`
    : \`<div class="price-single">\${val.fiyat} ₺</div>\`;
  return \`<div class="price-card">
    <div><div class="price-name">\${icon} \${name}</div><div class="price-type">\${type}</div></div>
    <div class="price-values">\${right}</div>
  </div>\`;
}

async function loadPrices() {
  try {
    const r = await fetch('/fiyat');
    const json = await r.json();
    if (!json.success) return;
    const d = json.data;

    document.getElementById('statTarih').textContent = d.tarih || '—';
    document.getElementById('statSaat').textContent = d.saat || '—';

    const gramKey = Object.keys(d).find(k => k.toLowerCase().includes('gram'));
    if (gramKey && d[gramKey].alis) document.getElementById('statGram').textContent = d[gramKey].alis;

    const items = Object.entries(d).filter(([k]) => !SKIP.has(k));
    document.getElementById('statCount').textContent = items.length;

    const sorted = [...items].sort((a, b) => {
      const ai = ORDER.indexOf(a[0]), bi = ORDER.indexOf(b[0]);
      if (ai === -1 && bi === -1) return a[0].localeCompare(b[0], 'tr');
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    document.getElementById('priceGrid').innerHTML = sorted.map(([k,v]) => buildPriceCard(k,v)).join('');
  } catch(e) { console.error(e); }
}

async function loadFacts() {
  try {
    const r = await fetch('/bilgi');
    const json = await r.json();
    if (!json.success || !json.bilgiler) return;
    const wrap = document.getElementById('factsWrap');
    wrap.innerHTML = '<div class="facts-scroll">' +
      json.bilgiler.map(b => \`<div class="fact-card">
        <div class="fact-emoji">\${b.emoji}</div>
        <div class="fact-title">\${b.baslik}</div>
        <div class="fact-text">\${b.metin}</div>
      </div>\`).join('') + '</div>';
  } catch(e) { console.error(e); }
}

function startCountdown() {
  countdown = 30;
  const el = document.getElementById('countdown');
  const t = setInterval(() => {
    countdown--;
    if (el) el.textContent = countdown;
    if (countdown <= 0) { clearInterval(t); loadPrices().then(startCountdown); }
  }, 1000);
}

loadPrices().then(startCountdown);
loadFacts();
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  if (req.url === '/bilgi') {
    try {
      console.log('Bilgi isteği alındı, Claude API çağrılıyor...');
      const data = await claudeBilgi();
      console.log('Bilgi üretildi:', data.bilgiler?.length, 'adet');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, ...data }));
    } catch(err) {
      console.error('Bilgi hatası:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (req.url === '/fiyat') {
    try {
      const session = await getSession();
      const html = await fetchEkran(session);
      const data = parse(html);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }));
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => console.log('✅ Proxy calisiyor: http://localhost:' + PORT));
