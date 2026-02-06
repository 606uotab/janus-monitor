#!/bin/bash
# Script pour générer les icônes JANUS Monitor
# Nécessite ImageMagick: sudo apt install imagemagick

# Créer une icône SVG de base
cat > /tmp/janus-icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#f59e0b"/>
  <text x="256" y="340" font-family="system-ui, sans-serif" font-size="280" font-weight="bold" text-anchor="middle" fill="#18181b">J</text>
</svg>
EOF

# Générer les PNG
convert -background none /tmp/janus-icon.svg -resize 32x32 src-tauri/icons/32x32.png
convert -background none /tmp/janus-icon.svg -resize 128x128 src-tauri/icons/128x128.png
convert -background none /tmp/janus-icon.svg -resize 256x256 src-tauri/icons/128x128@2x.png

# Générer ICO pour Windows
convert -background none /tmp/janus-icon.svg -resize 256x256 src-tauri/icons/icon.ico

# Générer ICNS pour macOS (si iconutil disponible)
if command -v iconutil &> /dev/null; then
    mkdir -p /tmp/icon.iconset
    convert -background none /tmp/janus-icon.svg -resize 16x16 /tmp/icon.iconset/icon_16x16.png
    convert -background none /tmp/janus-icon.svg -resize 32x32 /tmp/icon.iconset/icon_16x16@2x.png
    convert -background none /tmp/janus-icon.svg -resize 32x32 /tmp/icon.iconset/icon_32x32.png
    convert -background none /tmp/janus-icon.svg -resize 64x64 /tmp/icon.iconset/icon_32x32@2x.png
    convert -background none /tmp/janus-icon.svg -resize 128x128 /tmp/icon.iconset/icon_128x128.png
    convert -background none /tmp/janus-icon.svg -resize 256x256 /tmp/icon.iconset/icon_128x128@2x.png
    convert -background none /tmp/janus-icon.svg -resize 256x256 /tmp/icon.iconset/icon_256x256.png
    convert -background none /tmp/janus-icon.svg -resize 512x512 /tmp/icon.iconset/icon_256x256@2x.png
    convert -background none /tmp/janus-icon.svg -resize 512x512 /tmp/icon.iconset/icon_512x512.png
    convert -background none /tmp/janus-icon.svg -resize 1024x1024 /tmp/icon.iconset/icon_512x512@2x.png
    iconutil -c icns /tmp/icon.iconset -o src-tauri/icons/icon.icns
else
    # Fallback: créer un ICNS factice (juste un PNG renommé)
    cp src-tauri/icons/128x128@2x.png src-tauri/icons/icon.icns
fi

echo "Icônes générées dans src-tauri/icons/"
ls -la src-tauri/icons/
