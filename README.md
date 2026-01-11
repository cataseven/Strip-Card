# 🎯 Header and Badges Strip Card for Home Assistant

Modified Strip Card with Badge Mode

**Specially designed to replace the Markdown card as a dynamic dashboard header!**

A modified version of the Strip Card that displays sensors, entities and Home Assistant badges in a horizontally scrolling ticker format.

---

## ✨ Features

- 🔁 **Horizontal scrolling ticker** with smooth animation
- 🏷️ **Badge support** - display Home Assistant badges directly in the card
- 📊 **Header functionality** - designed to replace static Markdown headers
- 🧩 **Multi-entity support** with attributes and templates
- 🎨 **Comprehensive styling options** globally and per entity
- 🖱️ **Interactive** - More-info dialog or service calls on click
- ⏸️ **Hover pause** optionally enabled
- ⚙️ **Highly configurable** - icons, colors, units, templates and more

---

## 📦 Installation

### HACS (Recommended)
1. Open HACS → Frontend
2. Click on "Custom repositories"
3. Add `https://github.com/Spider19996/Header-and-Badges-Strip-Card` (Category: Lovelace)
4. Search for "Header and Badges Strip Card" and install
5. Reload Home Assistant

### Manual
1. Copy `header-and-badges-strip-card.js` to `/config/www/`
2. Go to **Settings → Dashboards → Resources**
3. Add resource:
   - URL: `/local/header-and-badges-strip-card.js`
   - Type: JavaScript Module

---

## 🚀 Quick Start - Creating a Dashboard Header

### Step 1: Add a Header in Your Dashboard
1. Edit your dashboard
2. Click "Add Title" or modify the existing header card
3. Click on **"Show Code Editor"** at the bottom
4. Replace the existing code
```yaml
type: markdown
text_only: true
content: |-
  # Hallo {{ user }} 
  Füge hier deinen Text ein, Template-Variablen werden unterstützt ✨

```
5. with:

```yaml
type: custom:header-and-badges-strip-card
```
6. Click "Show Visual Editor" and add at least one entity
7. Click "Save"

**This replaces the static Markdown header with a dynamic, scrolling information ticker!**

---

## 📜 Credits & License

### Based On
This project is based on the original **[Strip Card](https://github.com/cataseven/Strip-Card)** by **cataseven**.

### Support the Original Author
<a href="https://www.buymeacoffee.com/cataseven" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" >
</a>

### Modified By
**Spider19996** ([Spider19996](https://github.com/Spider19996))  
