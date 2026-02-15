#!/usr/bin/env python3
"""Generate a detailed Solarpunk aesthetic background image using Cairo.
   Features: warm sky, golden sun, BLURRED CYBERPUNK CITY silhouette,
   rolling green hills reclaiming the city, Art Nouveau vines, solar panels,
   ferns, pollen particles.
"""
import cairo
import math
import random

random.seed(42)

W, H = 1800, 1200
surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
ctx = cairo.Context(surface)

def rgb(r, g, b, a=1.0):
    ctx.set_source_rgba(r/255, g/255, b/255, a)

# ═══════════════════════════════════════════════════════
# 1. WARM IVORY-GREEN SKY GRADIENT
# ═══════════════════════════════════════════════════════
grad = cairo.LinearGradient(0, 0, 0, H)
grad.add_color_stop_rgba(0.0,  0.97, 0.96, 0.88, 1)
grad.add_color_stop_rgba(0.12, 0.96, 0.95, 0.86, 1)
grad.add_color_stop_rgba(0.30, 0.93, 0.95, 0.85, 1)
grad.add_color_stop_rgba(0.50, 0.88, 0.93, 0.82, 1)
grad.add_color_stop_rgba(0.70, 0.82, 0.90, 0.76, 1)
grad.add_color_stop_rgba(1.0,  0.72, 0.84, 0.65, 1)
ctx.set_source(grad)
ctx.paint()

# ═══════════════════════════════════════════════════════
# 2. GOLDEN SUNLIGHT — top right radial glow
# ═══════════════════════════════════════════════════════
sun_x, sun_y = W * 0.82, H * 0.08
for i in range(8):
    r = 500 - i * 30
    alpha = 0.03 + i * 0.008
    rad = cairo.RadialGradient(sun_x, sun_y, 0, sun_x, sun_y, r)
    rad.add_color_stop_rgba(0, 1.0, 0.92, 0.5, alpha * 2.5)
    rad.add_color_stop_rgba(0.4, 1.0, 0.88, 0.4, alpha * 1.5)
    rad.add_color_stop_rgba(1.0, 1.0, 0.85, 0.3, 0)
    ctx.set_source(rad)
    ctx.paint()

# Sun rays
for i in range(24):
    angle = i * (2 * math.pi / 24) + 0.13
    length = 350 + random.uniform(-80, 120)
    ctx.save()
    ctx.translate(sun_x, sun_y)
    ctx.rotate(angle)
    ctx.move_to(40, 0)
    ctx.line_to(length, 0)
    rgb(218, 180, 40, 0.14 if i % 3 == 0 else 0.08)
    ctx.set_line_width(1.5 if i % 3 == 0 else 0.6)
    ctx.stroke()
    ctx.restore()

# Sun core
core = cairo.RadialGradient(sun_x - 8, sun_y - 8, 0, sun_x, sun_y, 55)
core.add_color_stop_rgba(0.0, 1.0, 0.98, 0.88, 0.9)
core.add_color_stop_rgba(0.3, 1.0, 0.92, 0.55, 0.7)
core.add_color_stop_rgba(0.6, 0.92, 0.78, 0.25, 0.5)
core.add_color_stop_rgba(0.85, 0.48, 0.78, 0.30, 0.3)
core.add_color_stop_rgba(1.0, 0.24, 0.54, 0.16, 0.15)
ctx.set_source(core)
ctx.arc(sun_x, sun_y, 55, 0, 2 * math.pi)
ctx.fill()
ctx.set_line_width(1.2)
rgb(255, 248, 200, 0.4)
ctx.arc(sun_x, sun_y, 56, 0, 2 * math.pi)
ctx.stroke()

# ═══════════════════════════════════════════════════════
# 3. CYBERPUNK CITY SILHOUETTE — blurred shadow on horizon
# ═══════════════════════════════════════════════════════
# Draw city onto a separate surface, then composite blurred

city_surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
cctx = cairo.Context(city_surface)

horizon_y = H * 0.50  # city baseline

# --- Generate building data ---
buildings = []
x = -20
while x < W + 20:
    btype = random.choice(['tower', 'tower', 'tower', 'dome', 'spire', 'block', 'antenna', 'megablock'])
    bw = random.uniform(18, 55) if btype != 'megablock' else random.uniform(60, 110)

    if btype == 'tower':
        bh = random.uniform(80, 240)
    elif btype == 'dome':
        bh = random.uniform(50, 120)
    elif btype == 'spire':
        bh = random.uniform(150, 320)
    elif btype == 'antenna':
        bh = random.uniform(180, 350)
    elif btype == 'megablock':
        bh = random.uniform(60, 160)
    else:
        bh = random.uniform(40, 100)

    buildings.append((x, bw, bh, btype))
    x += bw * random.uniform(0.5, 1.1)

def draw_city_silhouette(target_ctx, alpha_mult=1.0, offset_x=0, offset_y=0):
    """Draw the full city skyline as silhouette shapes."""
    # City color: dark blue-gray with slight purple (lunarpunk)
    cr, cg, cb = 0.18, 0.20, 0.28

    for bx, bw, bh, btype in buildings:
        bx2 = bx + offset_x
        by = horizon_y + offset_y
        a = 0.22 * alpha_mult

        if btype == 'tower':
            # Rectangular tower with slight taper
            taper = random.uniform(0.85, 0.98)
            target_ctx.move_to(bx2, by)
            target_ctx.line_to(bx2, by - bh)
            target_ctx.line_to(bx2 + bw * taper, by - bh)
            target_ctx.line_to(bx2 + bw, by)
            target_ctx.close_path()
            target_ctx.set_source_rgba(cr, cg, cb, a)
            target_ctx.fill()

            # Roof detail — flat or pointed
            if random.random() > 0.5:
                # Flat roof with antenna
                target_ctx.move_to(bx2 + bw * 0.45, by - bh)
                target_ctx.line_to(bx2 + bw * 0.48, by - bh - 20)
                target_ctx.line_to(bx2 + bw * 0.52, by - bh - 20)
                target_ctx.line_to(bx2 + bw * 0.55, by - bh)
                target_ctx.close_path()
                target_ctx.set_source_rgba(cr, cg, cb, a * 0.9)
                target_ctx.fill()

            # Window rows — tiny lit dots
            for wy in range(int(by - bh + 15), int(by - 10), 14):
                for wx in range(int(bx2 + 4), int(bx2 + bw - 4), 8):
                    if random.random() > 0.4:
                        # Warm window glow
                        wr = random.choice([
                            (0.85, 0.75, 0.35),  # warm yellow
                            (0.50, 0.70, 0.90),  # cool blue
                            (0.75, 0.50, 0.85),  # purple
                            (0.30, 0.80, 0.60),  # teal
                        ])
                        target_ctx.set_source_rgba(wr[0], wr[1], wr[2], 0.06 * alpha_mult)
                        target_ctx.rectangle(wx, wy, 3, 5)
                        target_ctx.fill()

        elif btype == 'dome':
            # Dome building
            cx_d = bx2 + bw / 2
            target_ctx.move_to(bx2, by)
            target_ctx.line_to(bx2, by - bh * 0.5)
            # dome arc
            target_ctx.curve_to(bx2, by - bh, bx2 + bw, by - bh, bx2 + bw, by - bh * 0.5)
            target_ctx.line_to(bx2 + bw, by)
            target_ctx.close_path()
            target_ctx.set_source_rgba(cr, cg, cb, a)
            target_ctx.fill()

            # Dome ribs
            for ri in range(3):
                rx = bx2 + bw * (0.25 + ri * 0.25)
                target_ctx.move_to(rx, by)
                rib_h = bh * (0.85 if ri == 1 else 0.7)
                target_ctx.line_to(rx, by - rib_h)
                target_ctx.set_source_rgba(cr * 0.7, cg * 0.7, cb * 0.7, 0.08 * alpha_mult)
                target_ctx.set_line_width(0.8)
                target_ctx.stroke()

        elif btype == 'spire':
            # Tall pointed spire — cathedral/transmission tower
            target_ctx.move_to(bx2, by)
            target_ctx.line_to(bx2 + bw * 0.15, by - bh * 0.6)
            target_ctx.line_to(bx2 + bw * 0.35, by - bh * 0.65)
            target_ctx.line_to(bx2 + bw * 0.5, by - bh)
            target_ctx.line_to(bx2 + bw * 0.65, by - bh * 0.65)
            target_ctx.line_to(bx2 + bw * 0.85, by - bh * 0.6)
            target_ctx.line_to(bx2 + bw, by)
            target_ctx.close_path()
            target_ctx.set_source_rgba(cr, cg, cb, a)
            target_ctx.fill()

            # Spire tip light
            target_ctx.arc(bx2 + bw * 0.5, by - bh, 2, 0, 2 * math.pi)
            target_ctx.set_source_rgba(0.80, 0.40, 0.40, 0.12 * alpha_mult)
            target_ctx.fill()

        elif btype == 'antenna':
            # Thin lattice tower with dish
            mid = bx2 + bw * 0.5
            target_ctx.move_to(mid - 3, by)
            target_ctx.line_to(mid - 1.5, by - bh)
            target_ctx.line_to(mid + 1.5, by - bh)
            target_ctx.line_to(mid + 3, by)
            target_ctx.close_path()
            target_ctx.set_source_rgba(cr, cg, cb, a * 0.8)
            target_ctx.fill()

            # Cross braces
            for cb_y in range(int(by - bh + 30), int(by - 10), 35):
                target_ctx.move_to(mid - 3, cb_y)
                target_ctx.line_to(mid + 3, cb_y)
                target_ctx.set_source_rgba(cr, cg, cb, 0.12 * alpha_mult)
                target_ctx.set_line_width(0.6)
                target_ctx.stroke()

            # Satellite dish
            dish_y = by - bh * random.uniform(0.55, 0.75)
            target_ctx.arc(mid + 8, dish_y, 8, math.pi * 0.3, math.pi * 1.3)
            target_ctx.set_source_rgba(cr, cg, cb, 0.15 * alpha_mult)
            target_ctx.set_line_width(1.5)
            target_ctx.stroke()

            # Blinking top light
            target_ctx.arc(mid, by - bh, 2.5, 0, 2 * math.pi)
            target_ctx.set_source_rgba(0.9, 0.3, 0.3, 0.15 * alpha_mult)
            target_ctx.fill()

        elif btype == 'megablock':
            # Wide brutalist megastructure with terraces
            target_ctx.rectangle(bx2, by - bh, bw, bh)
            target_ctx.set_source_rgba(cr, cg, cb, a * 0.9)
            target_ctx.fill()

            # Terraced setbacks
            for ti in range(3):
                terrace_h = bh * (0.3 + ti * 0.2)
                setback = bw * 0.08 * (ti + 1)
                target_ctx.move_to(bx2 + setback, by - terrace_h)
                target_ctx.line_to(bx2 + bw - setback, by - terrace_h)
                target_ctx.set_source_rgba(cr * 0.8, cg * 0.8, cb * 0.8, 0.06 * alpha_mult)
                target_ctx.set_line_width(1)
                target_ctx.stroke()

            # Facade windows — grid
            for wy in range(int(by - bh + 10), int(by - 5), 12):
                for wx in range(int(bx2 + 5), int(bx2 + bw - 5), 10):
                    if random.random() > 0.35:
                        wr = random.choice([
                            (0.85, 0.78, 0.40),
                            (0.45, 0.65, 0.90),
                            (0.70, 0.45, 0.80),
                        ])
                        target_ctx.set_source_rgba(wr[0], wr[1], wr[2], 0.04 * alpha_mult)
                        target_ctx.rectangle(wx, wy, 4, 6)
                        target_ctx.fill()

        else:  # block
            target_ctx.rectangle(bx2, by - bh, bw, bh)
            target_ctx.set_source_rgba(cr, cg, cb, a * 0.85)
            target_ctx.fill()

# Draw city onto temp surface
draw_city_silhouette(cctx, alpha_mult=1.0)

# Save city layer for ImageMagick blur
city_surface.write_to_png('/home/user/janus-monitor/src/assets/_city_layer.png')

# Save base (no city) for compositing later
surface.write_to_png('/home/user/janus-monitor/src/assets/_base_layer.png')

# We'll composite the blurred city via ImageMagick after this script
# For now, skip inline blur — ImageMagick will handle it
import subprocess, sys

# Apply real Gaussian blur to city layer
subprocess.run([
    'convert',
    '/home/user/janus-monitor/src/assets/_city_layer.png',
    '-blur', '0x8',
    '/home/user/janus-monitor/src/assets/_city_blurred.png'
], check=True)

# Load blurred city back and composite onto main surface
blurred_city = cairo.ImageSurface.create_from_png(
    '/home/user/janus-monitor/src/assets/_city_blurred.png')
ctx.set_source_surface(blurred_city, 0, 0)
ctx.paint_with_alpha(0.85)

# Atmospheric haze over city — makes it look distant
haze = cairo.LinearGradient(0, horizon_y - 350, 0, horizon_y + 40)
haze.add_color_stop_rgba(0, 0.92, 0.94, 0.86, 0.5)
haze.add_color_stop_rgba(0.4, 0.90, 0.93, 0.84, 0.35)
haze.add_color_stop_rgba(0.7, 0.88, 0.92, 0.82, 0.2)
haze.add_color_stop_rgba(1.0, 0.85, 0.91, 0.80, 0)
ctx.set_source(haze)
ctx.rectangle(0, horizon_y - 350, W, 400)
ctx.fill()

# ═══════════════════════════════════════════════════════
# 4. ROLLING GREEN HILLS — nature reclaiming the city
# ═══════════════════════════════════════════════════════
hills = [
    (H * 0.58, 0.14, (0.58, 0.74, 0.48)),
    (H * 0.64, 0.18, (0.48, 0.68, 0.40)),
    (H * 0.70, 0.24, (0.38, 0.60, 0.32)),
    (H * 0.78, 0.30, (0.30, 0.52, 0.26)),
]

for base_y, alpha, (hr, hg, hb) in hills:
    ctx.move_to(0, base_y + 40)
    x = 0
    while x < W + 50:
        cy = base_y + math.sin(x * 0.003 + random.uniform(0, 1)) * 35 + math.sin(x * 0.008) * 18
        ctx.line_to(x, cy)
        x += 3
    ctx.line_to(W, H)
    ctx.line_to(0, H)
    ctx.close_path()
    ctx.set_source_rgba(hr, hg, hb, alpha)
    ctx.fill()

# ═══════════════════════════════════════════════════════
# 5. ART NOUVEAU BOTANICAL BORDERS
# ═══════════════════════════════════════════════════════
def draw_vine(x_base, y_start, y_end, side='left', thickness=2.5):
    points = []
    y = y_start
    while y < y_end:
        offset = math.sin(y * 0.008) * 25 + math.sin(y * 0.02) * 12
        if side == 'right':
            offset = -offset
        points.append((x_base + offset, y))
        y += 3

    if len(points) < 2:
        return

    ctx.set_line_width(thickness)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    rgb(42, 100, 35, 0.55)
    ctx.move_to(points[0][0], points[0][1])
    for i in range(1, len(points) - 1, 2):
        if i + 1 < len(points):
            ctx.curve_to(points[i][0], points[i][1], points[i][0], points[i][1],
                         points[i+1][0], points[i+1][1])
    ctx.stroke()

    ctx.set_line_width(thickness * 0.5)
    rgb(58, 120, 42, 0.35)
    for i in range(0, len(points) - 4, 3):
        ox = 8 if side == 'left' else -8
        ctx.move_to(points[i][0] + ox, points[i][1])
        j = min(i + 4, len(points) - 1)
        ctx.curve_to(
            points[i][0] + ox + 15 * (1 if side == 'left' else -1), points[i][1] + 20,
            points[j][0] + ox + 10 * (1 if side == 'left' else -1), points[j][1] - 15,
            points[j][0] + ox, points[j][1])
        ctx.stroke()

    for i in range(0, len(points) - 1, 18):
        px, py = points[i]
        leaf_angle = math.sin(i * 0.1) * 0.5 + (0.3 if side == 'left' else 2.8)
        leaf_size = 14 + random.uniform(-3, 6)
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(leaf_angle)
        ctx.move_to(0, 0)
        ctx.curve_to(leaf_size * 0.4, -leaf_size * 0.35, leaf_size * 0.8, -leaf_size * 0.15, leaf_size, 0)
        ctx.curve_to(leaf_size * 0.8, leaf_size * 0.15, leaf_size * 0.4, leaf_size * 0.35, 0, 0)
        gv = random.uniform(0.85, 1.15)
        ctx.set_source_rgba(0.22 * gv, 0.50 * gv, 0.18 * gv, 0.35)
        ctx.fill()
        ctx.move_to(0, 0)
        ctx.line_to(leaf_size * 0.9, 0)
        rgb(35, 80, 28, 0.2)
        ctx.set_line_width(0.5)
        ctx.stroke()
        ctx.restore()

    for i in range(0, len(points) - 1, 35):
        px, py = points[i]
        curl_dir = 1 if side == 'left' else -1
        ctx.set_line_width(0.8)
        rgb(58, 110, 40, 0.25)
        ctx.move_to(px, py)
        for t in range(30):
            ang = t * 0.25
            r = t * 0.6
            ctx.line_to(px + curl_dir * (r * math.cos(ang) + 8), py - r * math.sin(ang) - 5)
        ctx.stroke()

draw_vine(25, 50, H - 50, 'left', 3)
draw_vine(15, 200, H - 100, 'left', 1.8)
draw_vine(W - 25, 80, H - 50, 'right', 3)
draw_vine(W - 15, 250, H - 100, 'right', 1.8)

# ═══════════════════════════════════════════════════════
# 6. BOTTOM VEGETATION — lush fern carpet
# ═══════════════════════════════════════════════════════
for i in range(60):
    bx = random.uniform(-20, W + 20)
    by = H - random.uniform(10, 120)
    fern_h = random.uniform(30, 80)
    lean = random.uniform(-0.3, 0.3)
    ctx.save()
    ctx.translate(bx, by)
    ctx.rotate(lean)
    g = random.uniform(0.3, 0.55)
    ctx.set_source_rgba(0.15, g, 0.12, 0.3)
    ctx.set_line_width(1.2)
    ctx.move_to(0, 0)
    ctx.curve_to(3, -fern_h * 0.3, -2, -fern_h * 0.6, 1, -fern_h)
    ctx.stroke()
    for j in range(int(fern_h / 8)):
        fy = -j * 8
        frond_len = (fern_h - j * 8) * 0.4
        side = 1 if j % 2 == 0 else -1
        ctx.set_source_rgba(0.18, g * 1.1, 0.15, 0.22)
        ctx.set_line_width(0.6)
        ctx.move_to(0, fy)
        ctx.curve_to(side * frond_len * 0.5, fy - 3, side * frond_len, fy - 1, side * frond_len, fy + 2)
        ctx.stroke()
    ctx.restore()

ground = cairo.LinearGradient(0, H - 80, 0, H)
ground.add_color_stop_rgba(0, 0.25, 0.48, 0.22, 0)
ground.add_color_stop_rgba(0.5, 0.22, 0.42, 0.18, 0.15)
ground.add_color_stop_rgba(1.0, 0.18, 0.38, 0.15, 0.3)
ctx.set_source(ground)
ctx.rectangle(0, H - 80, W, 80)
ctx.fill()

# ═══════════════════════════════════════════════════════
# 7. STAINED GLASS SOLAR PANELS
# ═══════════════════════════════════════════════════════
panels = [
    (W * 0.15, H * 0.18, 65, -0.15),
    (W * 0.38, H * 0.12, 50, 0.1),
    (W * 0.60, H * 0.22, 55, -0.08),
    (W * 0.28, H * 0.35, 40, 0.2),
    (W * 0.75, H * 0.15, 45, -0.12),
]

for px, py, size, rot in panels:
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(rot)
    r = 6
    ctx.move_to(-size + r, -size * 0.7)
    ctx.line_to(size - r, -size * 0.7)
    ctx.curve_to(size, -size * 0.7, size, -size * 0.7, size, -size * 0.7 + r)
    ctx.line_to(size, size * 0.7 - r)
    ctx.curve_to(size, size * 0.7, size, size * 0.7, size - r, size * 0.7)
    ctx.line_to(-size + r, size * 0.7)
    ctx.curve_to(-size, size * 0.7, -size, size * 0.7, -size, size * 0.7 - r)
    ctx.line_to(-size, -size * 0.7 + r)
    ctx.curve_to(-size, -size * 0.7, -size, -size * 0.7, -size + r, -size * 0.7)
    ctx.close_path()
    glass = cairo.LinearGradient(-size, -size * 0.7, size, size * 0.7)
    glass.add_color_stop_rgba(0.0, 0.55, 0.82, 0.75, 0.08)
    glass.add_color_stop_rgba(0.3, 0.40, 0.75, 0.65, 0.06)
    glass.add_color_stop_rgba(0.7, 0.50, 0.80, 0.55, 0.07)
    glass.add_color_stop_rgba(1.0, 0.65, 0.85, 0.50, 0.05)
    ctx.set_source(glass)
    ctx.fill_preserve()
    rgb(180, 150, 50, 0.15)
    ctx.set_line_width(1.5)
    ctx.stroke()
    cells_h, cells_v = 4, 3
    cell_w = (size * 2) / cells_h
    cell_h = (size * 1.4) / cells_v
    ctx.set_line_width(0.5)
    rgb(160, 140, 60, 0.1)
    for ci in range(1, cells_h):
        xx = -size + ci * cell_w
        ctx.move_to(xx, -size * 0.7)
        ctx.line_to(xx, size * 0.7)
        ctx.stroke()
    for cj in range(1, cells_v):
        yy = -size * 0.7 + cj * cell_h
        ctx.move_to(-size, yy)
        ctx.line_to(size, yy)
        ctx.stroke()
    ctx.move_to(-size * 0.6, -size * 0.5)
    ctx.line_to(-size * 0.2, -size * 0.65)
    ctx.set_line_width(2)
    rgb(255, 255, 240, 0.12)
    ctx.stroke()
    ctx.restore()

# ═══════════════════════════════════════════════════════
# 8. ART NOUVEAU CORNER ORNAMENTS
# ═══════════════════════════════════════════════════════
ctx.save()
ctx.set_line_width(1.5)
rgb(160, 140, 50, 0.12)
for i in range(5):
    ctx.arc(0, 0, 80 + i * 25, 0, math.pi / 2)
    ctx.stroke()
ctx.set_line_width(1)
rgb(58, 110, 40, 0.15)
ctx.move_to(0, 120)
ctx.curve_to(40, 100, 80, 60, 120, 0)
ctx.stroke()
ctx.move_to(0, 160)
ctx.curve_to(60, 140, 110, 90, 160, 0)
ctx.stroke()
ctx.restore()

ctx.save()
ctx.translate(W, 0)
ctx.set_line_width(1.5)
rgb(160, 140, 50, 0.1)
for i in range(5):
    ctx.arc(0, 0, 80 + i * 25, math.pi / 2, math.pi)
    ctx.stroke()
ctx.restore()

# ═══════════════════════════════════════════════════════
# 9. FLOATING LEAVES + POLLEN
# ═══════════════════════════════════════════════════════
for i in range(35):
    lx = random.uniform(60, W - 60)
    ly = random.uniform(80, H * 0.55)
    la = random.uniform(0, 2 * math.pi)
    ls = random.uniform(8, 18)
    ctx.save()
    ctx.translate(lx, ly)
    ctx.rotate(la)
    ctx.move_to(0, 0)
    ctx.curve_to(ls * 0.3, -ls * 0.25, ls * 0.7, -ls * 0.12, ls, 0)
    ctx.curve_to(ls * 0.7, ls * 0.12, ls * 0.3, ls * 0.25, 0, 0)
    g = random.uniform(0.35, 0.55)
    ctx.set_source_rgba(0.18, g, 0.15, random.uniform(0.06, 0.15))
    ctx.fill()
    ctx.restore()

for i in range(120):
    px = random.uniform(0, W)
    py = random.uniform(0, H * 0.85)
    ps = random.uniform(0.8, 3.0)
    if i % 3 == 0:
        ctx.set_source_rgba(0.85, 0.72, 0.22, random.uniform(0.08, 0.25))
    else:
        ctx.set_source_rgba(0.35, random.uniform(0.45, 0.65), 0.28, random.uniform(0.06, 0.15))
    ctx.arc(px, py, ps, 0, 2 * math.pi)
    ctx.fill()

# ═══════════════════════════════════════════════════════
# 10. FRAME + TEXTURE
# ═══════════════════════════════════════════════════════
margin = 30
ctx.set_line_width(1.0)
rgb(160, 140, 50, 0.08)
ctx.rectangle(margin, margin, W - 2 * margin, H - 2 * margin)
ctx.stroke()
rgb(58, 110, 40, 0.06)
ctx.rectangle(margin + 8, margin + 8, W - 2 * (margin + 8), H - 2 * (margin + 8))
ctx.stroke()

for i in range(3000):
    tx = random.uniform(0, W)
    ty = random.uniform(0, H)
    ctx.set_source_rgba(0.5, 0.55, 0.4, random.uniform(0.01, 0.025))
    ctx.arc(tx, ty, random.uniform(0.3, 1.2), 0, 2 * math.pi)
    ctx.fill()

# ═══════════════════════════════════════════════════════
# EXPORT
# ═══════════════════════════════════════════════════════
surface.write_to_png('/home/user/janus-monitor/src/assets/solarpunk_bg.png')
print("PNG saved -> solarpunk_bg.png")
