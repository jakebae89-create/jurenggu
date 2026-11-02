# iOS 앱(Capacitor)용 로컬 폰트 생성기.
# 웹은 Google Fonts를 쓰지만 앱은 오프라인에서도 같은 글꼴이 나와야 하므로
# Noto Sans KR / Noto Serif KR(둘 다 SIL OFL) 가변 폰트를 서브셋해 fonts/ 에 woff2로 저장한다.
#
# 포함 글자: 한글 완성형 11,172자 전체(참가자 이름은 아무 글자나 올 수 있음) + 기본 라틴/기호
#           + index.html에 실제 쓰인 모든 글자(한자·가나·일본어 설명 등)
#
# 실행: python scripts/make_app_fonts.py <NotoSerifKR[wght].ttf 경로>
#   Serif 원본: https://github.com/google/fonts/tree/main/ofl/notoserifkr
#   Sans 원본은 Windows 기본 설치본(C:/Windows/Fonts/NotoSansKR-VF.ttf)을 쓴다.
import os, re, sys
from fontTools import subset

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SANS_SRC = r'C:/Windows/Fonts/NotoSansKR-VF.ttf'
SERIF_SRC = sys.argv[1] if len(sys.argv) > 1 else None
OUT_DIR = os.path.join(ROOT, 'fonts')

if not SERIF_SRC or not os.path.exists(SERIF_SRC):
    sys.exit('사용법: python scripts/make_app_fonts.py <NotoSerifKR[wght].ttf>')

html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
cps = {ord(c) for c in html if ord(c) >= 0x20}
cps |= set(range(0x20, 0x7F))        # ASCII
cps |= set(range(0xA0, 0x100))       # Latin-1 (·, × 등)
cps |= set(range(0x2010, 0x2060))    # 대시·따옴표·… 등 일반 구두점
cps |= set(range(0x3000, 0x3040))    # CJK 구두점
cps |= set(range(0x3131, 0x318F))    # 한글 호환 자모(ㅋㅋ 등)
cps |= set(range(0xAC00, 0xD7A4))    # 한글 완성형 전체
cps |= set(range(0xFF01, 0xFF5F))    # 전각 기호

def make(src, out):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']            # OFL 라이선스 표기 유지
    opts.notdef_outline = True
    font = subset.load_font(src, opts)
    s = subset.Subsetter(options=opts)
    s.populate(unicodes=sorted(cps))
    s.subset(font)
    subset.save_font(font, out, opts)
    print(f'{os.path.basename(out)}: {os.path.getsize(out)/1024/1024:.2f} MB')

os.makedirs(OUT_DIR, exist_ok=True)
make(SANS_SRC, os.path.join(OUT_DIR, 'NotoSansKR-subset.woff2'))
make(SERIF_SRC, os.path.join(OUT_DIR, 'NotoSerifKR-subset.woff2'))
print(f'글자 수: {len(cps)}')
