// 앱스토어 스크린샷 생성 — 6.9" iPhone 규격(1320 x 2868) = 440 x 956 논리 픽셀 × 3배
// www/(iOS 앱과 같은 파일, 로컬 폰트)를 직접 띄워 찍는다. 설치된 Chrome 사용(playwright 브라우저 미설치).
// 실행: node scripts/build-www.mjs && node scripts/shots-ios.mjs [ko|en|ja ...]
// 출력: store-assets/ios/ios-<lang>-<n>.png
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WWW = join(root, 'www');
const OUT = join(root, 'store-assets', 'ios');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2',
  '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const body = await readFile(join(WWW, p === '/' ? 'index.html' : p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(8741, r));
const BASE = 'http://localhost:8741';

const LANGS = {
  ko: { locale: 'ko-KR', players: ['민수', '지영', '현우', '서연'] },
  en: { locale: 'en-US', players: ['Alex', 'Mina', 'Jun', 'Sora'] },
  ja: { locale: 'ja-JP', players: ['ゆうき', 'さくら', 'けんと', 'あおい'] },
};
const runLangs = process.argv.slice(2).filter((a) => LANGS[a]);

// 굴림 결과를 매번 같게: Math.random을 시드 고정 난수로 바꾼다
const SEED = `(()=>{let a=20261103;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });

for (const lang of runLangs.length ? runLangs : Object.keys(LANGS)) {
  const L = LANGS[lang];
  const ctx = await browser.newContext({
    viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: L.locale,
  });
  await ctx.addInitScript(SEED);
  await ctx.addInitScript((lang) => { try { localStorage.setItem('jurenggu.lang', lang); } catch (e) {} }, lang);
  const page = await ctx.newPage();
  const wait = (ms) => page.waitForTimeout(ms);
  const shot = (n) => page.screenshot({ path: join(OUT, `ios-${lang}-${n}.png`) });
  const click = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel);

  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await wait(1200);

  // 참가자 등록
  for (const name of L.players) {
    await page.fill('#nameInput', name);
    await click('#addBtn');
  }
  await wait(400);

  // 2) 참가자 등록 화면
  await shot('2-setup');

  // 3) 벌칙 수정 화면
  await click('#editBtn');
  await wait(500);
  await shot('3-edit');
  await click('#confirmEdit');
  await wait(300);

  // 1) 굴려서 나온 벌칙 (대표 화면)
  await click('#startBtn');
  await wait(600);
  await click('#rollBtn');
  await wait(3200);
  await shot('1-result');

  // 4) 설정 패널 — 테마(옥색)
  await page.evaluate(() => document.querySelector('#themeBtns button[data-theme="jade"]').click());
  await click('#gearBtn');
  await wait(800);
  await shot('4-settings');

  // 5) 네온 테마로 한 번 더 굴린 결과 (라이트 모드는 크림 배경에 제목이 흐려 홍보용으로 약함)
  // 첫 장과 다른 벌칙이 나오도록 면 번호를 지정한다 (startRoll의 첫 Math.random이 면 번호, 0 = 禁聲作儛)
  await page.evaluate(() => document.querySelector('#themeBtns button[data-theme="neon"]').click());
  await click('#setClose');
  await page.evaluate((face) => {
    let first = true, a = 777;
    Math.random = () => {
      if (first) { first = false; return (face + 0.5) / 14; }
      a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296;
    };
  }, 0);
  await wait(400);
  await click('#rollBtn');
  await wait(3200);
  await shot('5-neon');

  await ctx.close();
  console.log(`${lang}: 5장 (1320 x 2868)`);
}

await browser.close();
server.close();
