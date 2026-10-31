# 💰 가계부 아이콘 만들기: 실천 보드 얼굴(docs/uk-round-512.png)의 하늘색 배경을 금색으로 + 오른쪽 아래 ₩ 동전
#   → docs/icon-192.png · icon-512.png · apple-touch-icon.png (냐냐 가계부 tools/make_coin_icon.py와 같은 D안)
#   python tools/make_coin_icon.py
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

DOCS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs")
S = 1024   # 크게 그리고 줄임
RIM, GOLD = (150, 98, 10), (246, 190, 45)
KEY = (255, 0, 255)
SKY = (176, 215, 254)

src = Image.open(os.path.join(DOCS, "uk-round-512.png")).convert("RGBA").resize((S, S), Image.LANCZOS)
alpha = src.getchannel("A")
flat = Image.new("RGBA", (S, S), SKY + (255,))
flat.alpha_composite(src)
base = flat.convert("RGB")
im = base.copy()

# 가장자리에서 이어진 하늘색만 고름 (얼굴·옷은 그대로)
for p in ((S // 2, 12), (12, 12), (S - 12, 12), (12, S // 2), (S - 12, S // 2), (12, S - 12), (S - 12, S - 12), (S // 2, S - 6), (100, 500), (S - 70, 500), (140, 700), (S - 60, 700)):
    r, g, b = im.getpixel(p)
    if b > 225 and r < 205 and b - r > 40:
        ImageDraw.floodfill(im, p, KEY, thresh=46)

ip, bp = im.load(), base.load()
mask = Image.new("L", (S, S), 0)
mp = mask.load()
for y in range(S):
    for x in range(S):
        r, g, b = bp[x, y]
        # 머리카락 사이에 갇힌 하늘색은 위쪽 절반에서만 (아래쪽 옷은 안 건드림)
        if ip[x, y] == KEY or (y < 560 and b > 225 and b - r > 45 and r < 205):
            mp[x, y] = 255
near = mask.filter(ImageFilter.MaxFilter(9)).load()

def gold(x, y):
    t = (x + y) / (2 * S)
    return (255 - 20 * t, 214 - 44 * t, 92 - 50 * t)

res = base.copy()
rp = res.load()
for y in range(S):
    for x in range(S):
        if mp[x, y]:
            rp[x, y] = tuple(round(v) for v in gold(x, y))
        elif near[x, y]:   # 머리카락·몸 가장자리에 남는 하늘색 테두리를 금색으로 섞기
            c = bp[x, y]
            a = max(0.0, 1 - sum(abs(c[i] - SKY[i]) for i in range(3)) / 330.0)
            g = gold(x, y)
            rp[x, y] = tuple(max(0, min(255, round(c[i] + (g[i] - SKY[i]) * a))) for i in range(3))

icon = res.convert("RGBA")
icon.putalpha(alpha)

# 오른쪽 아래 ₩ 동전
r = 150
bx, by = S - r - 26, S - r - 26
d = ImageDraw.Draw(icon)
d.ellipse((bx - r - 12, by - r - 12, bx + r + 12, by + r + 12), fill=(255, 255, 255, 255))
d.ellipse((bx - r, by - r, bx + r, by + r), fill=RIM)
d.ellipse((bx - r + 14, by - r + 14, bx + r - 14, by + r - 14), fill=GOLD)
d.text((bx, by - 6), "₩", font=ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 190), fill=(120, 76, 6), anchor="mm")

icon.resize((192, 192), Image.LANCZOS).save(os.path.join(DOCS, "icon-192.png"))
icon.resize((512, 512), Image.LANCZOS).save(os.path.join(DOCS, "icon-512.png"))
# 아이폰 홈 화면용: 투명하면 검게 나와서 흰 바탕
bg = Image.new("RGBA", (S, S), (255, 255, 255, 255))
bg.alpha_composite(icon)
bg.convert("RGB").resize((180, 180), Image.LANCZOS).save(os.path.join(DOCS, "apple-touch-icon.png"))
print("ok")
