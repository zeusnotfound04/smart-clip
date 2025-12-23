#!/bin/bash
# Script to copy fonts from web/public/fonts to api/fonts directory
# Run this script in production to ensure fonts are available for subtitle generation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_FONTS_DIR="$SCRIPT_DIR/fonts"
WEB_FONTS_DIR="$SCRIPT_DIR/../web/public/fonts"

echo "🎨 Setting up fonts for subtitle generation..."
echo "   API fonts directory: $API_FONTS_DIR"
echo "   Web fonts directory: $WEB_FONTS_DIR"

# Create fonts directory if it doesn't exist
mkdir -p "$API_FONTS_DIR"

# Copy fonts from web directory
if [ -d "$WEB_FONTS_DIR" ]; then
  echo "📂 Copying fonts from web directory..."
  
  # List of fonts to copy
  FONTS=("Anton" "Bangers" "Montserrat" "Poppins" "Rubik" "Gabarito" "Roboto" "DM_Serif_Display" "Fira_Sans_Condensed")
  
  for font in "${FONTS[@]}"; do
    if [ -d "$WEB_FONTS_DIR/$font" ]; then
      echo "   Copying $font..."
      cp -f "$WEB_FONTS_DIR/$font"/*.ttf "$API_FONTS_DIR/" 2>/dev/null || true
    else
      echo "   ⚠️  $font directory not found, skipping..."
    fi
  done
  
  echo "✅ Fonts copied successfully!"
else
  echo "❌ Web fonts directory not found at: $WEB_FONTS_DIR"
  exit 1
fi

# Clear fontconfig cache to ensure fonts are recognized
echo "🔄 Clearing fontconfig cache..."
fc-cache -f "$API_FONTS_DIR" 2>/dev/null || echo "   ℹ️  fc-cache not available or failed (this is okay)"

echo "✅ Font setup complete!"
echo ""
echo "📝 Font files in API directory:"
ls -lh "$API_FONTS_DIR"/*.ttf 2>/dev/null || echo "   No .ttf files found"
echo ""
echo "🎯 Make sure to set FONTCONFIG_FILE environment variable in production:"
echo "   export FONTCONFIG_FILE=$API_FONTS_DIR/fonts.conf"
echo "   export FONTCONFIG_PATH=$API_FONTS_DIR"
