# 🔶 Strip Card for Home Assistant

## ✨ Features

- 🔁 Horizontally scrolling ticker layout
- 🧩 Supports multiple entities and attributes
- 🎨 Global and per-entity styling
- 🖱️ Click to open `more-info` or trigger an action
- ⏸️ Optional pause on hover
- ⚙️ Rich customization: icons, colors, attributes, units, etc.

---

## 📦 Installation

### Method 1 - Download From HACS
Search for Strip Card and download

### Method 2 - Manual
- Copy `strip-card.js` into your `/www/community/strip-card/` folder inside your Home Assistant config.
- Go to **Settings > Dashboards > Resources**
- Click **Add Resource**
- URL: `/local/community/strip-card/strip-card.js`

#### Or via YAML:
```yaml
lovelace:
  resources:
    - url: /local/community/strip-card/strip-card.js
      type: module
```

---

## 🧾 Example Configuration

![image1](images/a.gif)

```yaml
type: custom:strip-card
duration: 20
show_icon: false
entities:
  - entity: sensor.temperature
    name: Bedroom
  - entity: switch.kitchen
    name: Kitchen Switch
    service: switch.toggle
    data:
      entity_id: switch.kitchen
    show_icon: true
    icon_color: orange
    icon: mdi:lightbulb
    name_color: gold
    value_color: yellow
    unit_color: silver
  - entity: sun.sun
    attribute: elevation
    name: Sun Elevation
    unit: °
```

```yaml
type: custom:strip-card
title: System Status
duration: 25
font_size: 15px
separator: "•"
pause_on_hover: true
show_icon: false
entities:
  - entity: sensor.cpu_temp
    name: CPU
    unit: °C
    value_color: "#e53935"
  - entity: sensor.disk_free
    name: Disk
    unit: GB
    value_color: "#43a047"
    name_color: "#000"
  - entity: binary_sensor.door
    name: Door
    show_icon: true
    icon_color: "#ffa000"
  - entity: sensor.co2_level
    name: CO₂
    unit: ppm
    show_icon: true
    icon_color: "#2196f3"
    name_color: "#222"
    value_color: "#2196f3"
    unit_color: "#666"
```

---

## ⚙️ Card Options

| Option            | Type     | Default                        | Description |
|-------------------|----------|--------------------------------|-------------|
| `title`           | string   | `""`                           | Card header |
| `duration`        | number   | `20`                           | Total scroll time in seconds. Lower value = Higher Speed|
| `font_size`       | string   | `"14px"`                       | Font size |
| `separator`       | string   | `"•"`                          | Symbol between items |
| `pause_on_hover`  | boolean  | `false`                        | Pause animation on hover |
| `icon`            | string   | `default icon of entity`       | Change default icon |
| `show_icon`       | boolean  | `false`                        | Show icons by default |
| `name_color`      | string   | `var(--primary-text-color)`    | Default name color |
| `value_color`     | string   | `var(--primary-color)`         | Default value color |
| `unit_color`      | string   | `var(--secondary-text-color)`  | Default unit color |
| `icon_color`      | string   | `var(--paper-item-icon-color)` | Default icon color |

---

## 🧩 Entity-Level Customization

You can define each entity as an object to override global styles:

```yaml
- entity: sensor.example
  name: Example
  unit: kWh
  attribute: temperature
  show_icon: true
  icon_color: "#ff9800"
  name_color: "#333"
  value_color: "#4caf50"
  unit_color: "#999"
```

You can also just list the entity ID for default behavior:

```yaml
- sensor.simple
```

---

## ⚡ Tap to Call Action

By default, clicking an item opens the `more-info` dialog. You can also trigger a service/action instead:

```yaml
- entity: switch.kitchen
  name: Kitchen Switch
  service: switch.toggle
  data:
    entity_id: switch.kitchen
```

---

## 🧑‍🎨 Developer Notes

- This card uses `ha-card` and `ha-state-icon` for native look & feel.
- Per-entity styling allows full customization.
- Animation is CSS-based and smooth across all modern browsers.

---

## 📄 License

MIT License  
Created by cataseven

---

## ⭐ Support

If you like this card, feel free to ⭐ star the project on GitHub and share it with the Home Assistant community!
