# juryeonggu_papercraft.html 에서 실제 사용된 글자만 뽑아 Noto Sans KR(무료, SIL OFL)을
# 서브셋 → woff2 → base64 로 font_subset.b64 에 저장. build_papercraft.js 가 이를 @font-face 로 임베드.
import re, base64, io, sys, os
from fontTools import subset
from fontTools.ttLib import TTFont

SRC = r'C:/Windows/Fonts/NotoSansKR-VF.ttf'
HTML = os.path.join(os.path.dirname(__file__), 'juryeonggu_papercraft.html')
OUT  = os.path.join(os.path.dirname(__file__), 'font_subset.b64')

html = open(HTML, encoding='utf-8').read()
# 태그 제거 후 텍스트 문자 수집
text = re.sub(r'<[^>]+>', ' ', html)
text = text.replace('&amp;', '&').replace('&#39;', "'")
chars = set(text)
# 항상 포함할 안전 문자(숫자/기본 기호)
chars |= set('0123456789/().,\'—·　=+-')
chars = {c for c in chars if c.strip() or c in ('　',)}  # 공백류 중 표의문자 공백만
unicodes = sorted(ord(c) for c in chars if ord(c) >= 0x20)

opts = subset.Options()
opts.flavor = 'woff2'
opts.desubroutinize = True
opts.layout_features = ['*']      # 커닝 등 유지(용량 미미)
opts.name_IDs = []
opts.notdef_outline = True
opts.recalc_bounds = True
opts.drop_tables = []

font = subset.load_font(SRC, opts)
s = subset.Subsetter(options=opts)
s.populate(unicodes=unicodes)
s.subset(font)

buf = io.BytesIO()
subset.save_font(font, buf, opts)
data = buf.getvalue()
b64 = base64.b64encode(data).decode('ascii')
open(OUT, 'w', encoding='ascii').write(b64)
print(f'glyph chars: {len(unicodes)} | woff2 bytes: {len(data)} | b64 chars: {len(b64)}')
