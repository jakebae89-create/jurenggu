# iOS 앱 아이콘(1024) + 런치스크린(스플래시) 생성기.
# 원본은 웹/안드로이드와 같은 icons/icon-512.png 하나뿐이라 그걸 키워 쓴다.
# - 앱스토어는 알파 채널 있는 아이콘을 거부 → RGB로 저장
# - Capacitor 기본 스플래시는 캡시터 로고라 교체 (앱 배경색 #150a26 위에 아이콘을 작게)
# 실행: python scripts/make_ios_assets.py
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ASSETS = os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets')
src = Image.open(os.path.join(ROOT, 'icons', 'icon-512.png')).convert('RGB')

icon = src.resize((1024, 1024), Image.LANCZOS)
icon.save(os.path.join(ASSETS, 'AppIcon.appiconset', 'AppIcon-512@2x.png'))
print('AppIcon 1024 (RGB)')

S = 2732
splash = Image.new('RGB', (S, S), (0x15, 0x0a, 0x26))
n = 560
splash.paste(src.resize((n, n), Image.LANCZOS), ((S - n) // 2, (S - n) // 2))
for f in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
    splash.save(os.path.join(ASSETS, 'Splash.imageset', f))
print('Splash 2732 x3')
