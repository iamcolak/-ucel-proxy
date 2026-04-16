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

// Claude API ile selamlama üret
function claudeGreeting() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Sen Üçel Kuyumcu'nun dijital asistanısın. Ziyaretçiyi sıcak, kısa ve samimi bir şekilde selamla. Türkçe yaz. SADECE JSON döndür:
{"mesaj":"selamlama metni","emoji":"uygun emoji"}`
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
          console.error('Greeting parse hatası:', e);
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Claude API ile altın bilgisi üret
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

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // Selamlama endpoint'i
  if (req.url === '/greeting') {
    try {
      console.log('Greeting isteği alındı, Claude API çağrılıyor...');
      const data = await claudeGreeting();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, ...data }));
    } catch(err) {
      console.error('Greeting hatası:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Altın bilgi endpoint'i
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

  // Fiyat endpoint'i
  try {
    const session = await getSession();
    const html = await fetchEkran(session);
    const data = parse(html);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, data, _size: html.length, timestamp: new Date().toISOString() }));
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
});

server.listen(PORT, () => console.log('✅ Proxy calisiyor: http://localhost:' + PORT));
