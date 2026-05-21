"""Generate Ponte Trade brand image assets (favicon, icons, OG image)."""
from PIL import Image, ImageDraw, ImageFont

NAVY = (15, 30, 60)
GOLD = (232, 160, 32)
WHITE = (255, 255, 255)

ARIAL_BOLD = "C:/Windows/Fonts/arialbd.ttf"
ARIAL = "C:/Windows/Fonts/arial.ttf"

# Cubic-ish suspension cable sampled as a quadratic Bezier in 32-unit space.
def cable_points():
    p0, c, p2 = (3, 14), (16, 7.5), (29, 14)
    pts = []
    for i in range(25):
        t = i / 24
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t ** 2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t ** 2 * p2[1]
        pts.append((x, y))
    return pts

def draw_bridge(draw, ox, oy, s, color, lw, deck_lw=None):
    """Draw the bridge mark; (x,y) in 32-space -> (ox + x*s, oy + y*s)."""
    deck_lw = deck_lw or lw
    def P(x, y):
        return (ox + x * s, oy + y * s)
    # deck
    draw.line([P(3, 22), P(29, 22)], fill=color, width=deck_lw)
    # towers
    draw.line([P(9, 22), P(9, 9)], fill=color, width=lw)
    draw.line([P(23, 22), P(23, 9)], fill=color, width=lw)
    # cable
    draw.line([P(*pt) for pt in cable_points()], fill=color, width=lw, joint="curve")
    # centre hanger
    draw.line([P(16, 10.75), P(16, 22)], fill=color, width=max(1, lw - 1))

def make_icon(size, rounded=True):
    scale = 4  # supersample for smooth lines
    big = size * scale
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = int(big * 0.18) if rounded else 0
    d.rounded_rectangle([0, 0, big - 1, big - 1], radius=radius, fill=NAVY)
    # centre the bridge bbox (x:3..29 -> cx 16 ; y:7..22 -> cy 14.5)
    s = big * 0.62 / 26
    ox = big / 2 - 16 * s
    oy = big / 2 - 14.5 * s
    lw = max(2, int(big * 0.012) * 3)
    draw_bridge(d, ox, oy, s, GOLD, lw, deck_lw=lw)
    return img.resize((size, size), Image.LANCZOS)

# ---- favicon.ico (multi-size) ----
master = make_icon(256)
master.save("app/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

# ---- icon.png (512) + apple-icon.png (180) ----
make_icon(512).save("app/icon.png")
make_icon(180).save("app/apple-icon.png")

# ---- opengraph-image.png (1200x630) ----
def make_og():
    scale = 2
    W, H = 1200 * scale, 630 * scale
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)

    f_word = ImageFont.truetype(ARIAL_BOLD, 96 * scale)
    f_tag = ImageFont.truetype(ARIAL_BOLD, 44 * scale)
    f_url = ImageFont.truetype(ARIAL, 22 * scale)

    # lockup: bridge mark + wordmark, horizontally centred
    word = "Ponte Trade"
    word_w = d.textlength(word, font=f_word)
    bridge_box = 150 * scale
    gap = 28 * scale
    s = bridge_box * 0.9 / 26
    total = bridge_box + gap + word_w
    start_x = (W - total) / 2
    cy = H * 0.40

    # bridge: place bbox so its vertical centre (14.5) aligns to cy
    ox = start_x - 3 * s
    oy = cy - 14.5 * s
    draw_bridge(d, ox, oy, s, GOLD, int(7 * scale), deck_lw=int(8 * scale))

    word_x = start_x + bridge_box + gap
    word_y = cy - (f_word.getbbox(word)[3] - f_word.getbbox(word)[1]) / 2 - f_word.getbbox(word)[1]
    d.text((word_x, word_y), word, font=f_word, fill=WHITE)

    # tagline (centred), "Delivered." in gold
    t1, t2 = "Trade intelligence. ", "Delivered."
    w1 = d.textlength(t1, font=f_tag)
    w2 = d.textlength(t2, font=f_tag)
    tx = (W - (w1 + w2)) / 2
    ty = H * 0.62
    d.text((tx, ty), t1, font=f_tag, fill=WHITE)
    d.text((tx + w1, ty), t2, font=f_tag, fill=GOLD)

    # gold rule + url
    rule_w = 120 * scale
    d.line([(W / 2 - rule_w / 2, H * 0.74), (W / 2 + rule_w / 2, H * 0.74)], fill=GOLD, width=2 * scale)
    url = "ponte.trade"
    uw = d.textlength(url, font=f_url)
    d.text(((W - uw) / 2, H * 0.78), url, font=f_url, fill=(200, 205, 215))

    return img.resize((1200, 630), Image.LANCZOS)

make_og().save("app/opengraph-image.png")
print("Brand assets generated.")
