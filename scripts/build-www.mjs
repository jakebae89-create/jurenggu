// 주령구 웹 자산을 iOS 앱(Capacitor) 빌드 폴더 www/ 로 복사한다.
// - 루트 파일은 GitHub Pages(웹·안드로이드 TWA)용 그대로 두고, 앱에 필요한 것만 골라 복사한다.
// - 앱은 오프라인에서 완전히 돌아가야 하므로(애플 심사 4.2) index.html을 여기서만 고친다:
//   Google Fonts → 로컬 폰트, 서비스워커 제거, 전개도는 Safari로 열기.
// 변경 후 `npm run sync:ios` (Codemagic은 커밋만 하면 알아서 돌린다)

import { existsSync, rmSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "www");
const WEB = "https://jakebae89-create.github.io/jurenggu";

// 앱에 포함할 파일/폴더 화이트리스트
const include = ["index.html", "manifest.webmanifest", "privacy.html", "vendor", "icons", "fonts"];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const name of include) {
  const src = join(root, name);
  if (!existsSync(src)) throw new Error(`없음: ${name}`);
  cpSync(src, join(out, name), { recursive: true });
  console.log(`  복사: ${name}`);
}

// ── index.html 앱용 치환 ──
// 각 치환은 정확히 한 번 맞아야 한다. index.html이 바뀌어 안 맞으면 조용히 넘어가지 말고 빌드를 깬다.
const patches = [
  {
    what: "Google Fonts → 로컬 폰트",
    from: /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin \/>\s*<link href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>/,
    to: '<link rel="stylesheet" href="./fonts/fonts.css" />',
  },
  {
    // WKWebView는 capacitor:// 스킴에서 서비스워커를 못 쓴다. 파일이 앱에 들어 있으니 필요도 없다.
    what: "서비스워커 등록 제거",
    from: /<script>\s*\/\/ PWA 서비스 워커 등록[\s\S]*?<\/script>/,
    to: "",
  },
  {
    // 앱 밖 주소로 이동하면 Capacitor가 Safari로 넘긴다 → 거기서 인쇄·공유 가능
    what: "전개도 인쇄 페이지 → Safari",
    from: "window.open('./juryeonggu_papercraft.html','_blank','noopener');",
    to: `location.href='${WEB}/juryeonggu_papercraft.html';`,
  },
  {
    // WKWebView는 <a download>를 지원하지 않는다
    what: "전개도 PDF → Safari",
    from: 'href="./juryeonggu_papercraft.pdf" download="juryeonggu_papercraft.pdf"',
    to: `href="${WEB}/juryeonggu_papercraft.pdf"`,
  },
];

const indexPath = join(out, "index.html");
let html = readFileSync(indexPath, "utf8");
for (const p of patches) {
  const hits = typeof p.from === "string" ? html.split(p.from).length - 1 : (html.match(new RegExp(p.from, "g")) || []).length;
  if (hits !== 1) throw new Error(`치환 실패(${hits}회 일치): ${p.what} — index.html이 바뀌었는지 확인`);
  html = html.replace(p.from, p.to);
  console.log(`  치환: ${p.what}`);
}
if (/fonts\.googleapis|unpkg\.com|cdn\.jsdelivr/.test(html)) throw new Error("index.html에 외부 CDN 참조가 남아 있음");
writeFileSync(indexPath, html);

console.log("\n✅ www/ 생성 완료");
