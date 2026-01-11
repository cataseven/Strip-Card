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

## 💡 Basic Examples

### Simple Header
```yaml
type: custom:header-and-badges-strip-card
duration: 20
show_icon: true
entities:
  - sensor.temperature
  - sensor.humidity
  - person.john
```

### Advanced Header with Badges
```yaml
type: custom:header-and-badges-strip-card
title: System Status
duration: 25
show_icon: true
border_radius: 12px
card_height: 60px
transparent: false
entities:
  - type: badge
    entity: person.john
  - type: badge
    entity: sensor.cpu_temperature
  - entity: sensor.disk_free
    name: Storage
    icon: mdi:harddisk
  - entity: binary_sensor.door
    name: Front Door
```

---

## 📋 Configuration Options

### Global Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | `""` | Card title |
| `duration` | number | `20` | Scroll duration in seconds (lower = faster) |
| `font_size` | string | `"14px"` | Font size |
| `border_radius` | string | `"0px"` | Corner radius |
| `card_height` | string | `"50px"` | Card height |
| `card_width` | string | `""` | Card width (empty = auto) |
| `separator` | string | `"•"` | Separator between entities |
| `pause_on_hover` | boolean | `false` | Pause animation on hover |
| `continuous_scroll` | boolean | `true` | Enable infinite loop |
| `vertical_scroll` | boolean | `false` | Vertical instead of horizontal scroll |
| `fading` | boolean | `false` | Fade effect at edges |
| `show_icon` | boolean | `false` | Show icons by default |
| `unit_position` | string | `"right"` | Unit position (`left`/`right`) |
| `transparent` | boolean | `false` | Transparent background |

### Color Options

| Option | Default | Description |
|--------|---------|-------------|
| `name_color` | `var(--primary-text-color)` | Entity name color |
| `value_color` | `var(--primary-color)` | Value color |
| `unit_color` | `var(--secondary-text-color)` | Unit color |
| `icon_color` | `var(--paper-item-icon-color)` | Icon color |

### Entity Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | string | - | `"badge"` for badge display |
| `entity` | string | **Required** | Entity ID (e.g., `sensor.temp`) |
| `name` | string | friendly_name | Override entity name |
| `icon` | string | Entity icon | Custom icon (e.g., `mdi:thermometer`) |
| `attribute` | string | `state` | Display specific attribute |
| `value_template` | string | - | Jinja2 template for value |
| `unit` | string | unit_of_measurement | Custom unit |
| `unit_position` | string | Inherits from card | Override unit position |
| `show_icon` | boolean | Inherits from card | Override icon visibility |
| `service` | string | - | Service call on click |
| `data` | object | - | Service call data |
| `visible_if` | string | - | Visibility template |
| `*_color` | string | - | Color overrides per entity |

---

## 🎨 Advanced Examples

### Dashboard Header with Person Badges
```yaml
type: custom:header-and-badges-strip-card
title: Welcome Home
duration: 30
font_size: 16px
border_radius: 12px
card_height: 70px
fading: true
pause_on_hover: true
entities:
  - type: badge
    entity: person.john
  - type: badge
    entity: person.jane
  - type: badge
    entity: sensor.outside_temperature
  - entity: sensor.living_room_temperature
    name: Living Room
    icon: mdi:sofa
    show_icon: true
  - entity: light.kitchen
    name: Kitchen
    service: light.toggle
    show_icon: true
    icon_color: orange
```

### Color Templates
```yaml
type: custom:header-and-badges-strip-card
entities:
  - entity: sensor.temperature
    name: Temperature
    show_icon: true
    icon: >-
      {{ 'mdi:snowflake' if states('sensor.temperature')|float < 18
         else 'mdi:thermometer' if states('sensor.temperature')|float <= 24
         else 'mdi:fire' }}
    value_color: >-
      {{ 'blue' if states('sensor.temperature')|float < 18
         else 'green' if states('sensor.temperature')|float <= 24
         else 'red' }}
```

### Conditional Visibility
```yaml
type: custom:header-and-badges-strip-card
entities:
  - entity: sensor.rain_probability
    name: Rain
    visible_if: "{{ states('sensor.rain_probability')|int > 30 }}"
  - entity: sun.sun
    name: Sun
    visible_if: "{{ states('sun.sun') == 'above_horizon' }}"
```

### Interactive Switches
```yaml
type: custom:header-and-badges-strip-card
entities:
  - entity: light.living_room
    name: Living Room
    service: light.toggle
    data:
      entity_id: light.living_room
    show_icon: true
    icon_color: "{{ 'orange' if is_state('light.living_room', 'on') else 'gray' }}"
  - entity: switch.coffee_maker
    name: Coffee
    service: switch.toggle
    show_icon: true
```

---

## 🎨 Styling Tips

- **Minimalist Header**: `transparent: true`, no `border_radius`, `show_icon: false`
- **Modern Header**: `border_radius: 12px`, `fading: true`, `pause_on_hover: true`
- **Dashboard Header**: Large `card_height` (70-80px), `font_size: 16px`, use badges
- **Status Ticker**: Small `card_height` (40-50px), fast `duration` (10-15s)

---

## 🔧 Troubleshooting

**Card not showing:**
- Clear cache (Ctrl+F5)
- Resource correctly added?
- Check browser console for errors

**Badges not displaying:**
- Added `type: badge` to entity?
- Entity exists and available?

**Animation stuttering:**
- Increase `duration`
- Use fewer entities
- Check browser hardware acceleration

**"Show Code Editor" not visible:**
- Make sure you're in edit mode
- Look at the bottom of the card configuration dialog
- Alternative: Use YAML mode for the entire dashboard

---

## 📚 Why Replace Markdown Headers?

Traditional Markdown cards used as headers are static and don't show real-time information. This card was specifically designed to:

✅ Display **live data** from sensors and entities  
✅ Show **person badges** with status and avatars  
✅ Provide **interactive elements** (click to toggle lights, etc.)  
✅ Create **dynamic, scrolling content** that updates automatically  
✅ Offer **extensive customization** with colors, icons, and templates  

**Perfect for creating beautiful, functional dashboard headers!**

---

## 📜 Credits & License

### Based On
This project is based on the original **[Strip Card](https://github.com/cataseven/Strip-Card)** by **cataseven**.

### Modified By
**Spider19996** ([Spider19996](https://github.com/Spider19996))  
Version 3.0.0 - January 2026

### Support the Original Author
<a href="https://www.buymeacoffee.com/cataseven" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" >
</a>

If you like this card, give the project a ⭐ on GitHub!

### License
MIT License

---

**Enjoy your new dynamic dashboard header! 🚀**
