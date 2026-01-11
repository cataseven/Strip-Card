# 🎯 Header and Badges Strip Card for Home Assistant

**Version 3.0.0** - Enhanced Strip Card with Badge Support

Eine erweiterte Version der Strip Card, die zusätzlich zu Sensoren und Entitäten auch Home Assistant Badges im horizontalen Scrolling-Ticker darstellen kann.

---

## ✨ Features

- 🔁 **Horizontal scrollender Ticker** mit flüssiger Animation
- 🏷️ **Badge-Unterstützung** - zeige Home Assistant Badges direkt in der Karte an
- 📊 **Header-Funktionalität** - nutze die Karte als dynamischen Dashboard-Header
- 🧩 **Multi-Entity Support** mit Attributen und Templates
- 🎨 **Umfassende Styling-Optionen** global und pro Entität
- 🖱️ **Interaktiv** - More-Info Dialog oder Service-Calls per Klick
- ⏸️ **Hover-Pause** optional aktivierbar
- ⚙️ **Hochgradig konfigurierbar** - Icons, Farben, Units, Templates und mehr

---

## 📦 Installation

### HACS (empfohlen)
1. Öffne HACS → Frontend
2. Klicke auf "Custom repositories"
3. Füge `https://github.com/Spider19996/Header-and-Badges-Strip-Card` hinzu (Kategorie: Lovelace)
4. Suche nach "Header and Badges Strip Card" und installiere
5. Lade Home Assistant neu

### Manuell
1. Kopiere `header-and-badges-strip-card.js` nach `/config/www/`
2. Gehe zu **Einstellungen → Dashboards → Ressourcen**
3. Füge hinzu:
   - URL: `/local/header-and-badges-strip-card.js`
   - Typ: JavaScript-Modul

---

## 🚀 Schnellstart

### Basis-Konfiguration
```yaml
type: custom:header-and-badges-strip-card
duration: 20
show_icon: true
entities:
  - sensor.temperature
  - sensor.humidity
  - person.robin
```

### Mit Badges
```yaml
type: custom:header-and-badges-strip-card
title: System Status
duration: 25
show_icon: true
border_radius: 12px
card_height: 60px
entities:
  - type: badge
    entity: person.robin
  - type: badge
    entity: sensor.cpu_temperature
  - entity: sensor.disk_free
    name: Speicher
    icon: mdi:harddisk
  - entity: binary_sensor.door
    name: Haustür
```

---

## 📝 Konfigurationsoptionen

### Globale Optionen

| Option | Typ | Standard | Beschreibung |
|--------|-----|----------|-------------|
| `title` | string | `""` | Kartentitel |
| `duration` | number | `20` | Scroll-Dauer in Sekunden (niedriger = schneller) |
| `font_size` | string | `"14px"` | Schriftgröße |
| `border_radius` | string | `"0px"` | Ecken-Rundung |
| `card_height` | string | `"50px"` | Kartenhöhe |
| `card_width` | string | `""` | Kartenbreite (leer = automatisch) |
| `separator` | string | `"•"` | Trennzeichen zwischen Entitäten |
| `pause_on_hover` | boolean | `false` | Pausiert Animation bei Hover |
| `continuous_scroll` | boolean | `true` | Endlos-Schleife aktivieren |
| `vertical_scroll` | boolean | `false` | Vertikaler statt horizontaler Scroll |
| `fading` | boolean | `false` | Fade-Effekt an den Rändern |
| `show_icon` | boolean | `false` | Icons standardmäßig anzeigen |
| `unit_position` | string | `"right"` | Position der Einheit (`left`/`right`) |
| `transparent` | boolean | `false` | Transparenter Hintergrund |

### Farb-Optionen

| Option | Standard | Beschreibung |
|--------|----------|-------------|
| `name_color` | `var(--primary-text-color)` | Farbe des Entity-Namens |
| `value_color` | `var(--primary-color)` | Farbe des Wertes |
| `unit_color` | `var(--secondary-text-color)` | Farbe der Einheit |
| `icon_color` | `var(--paper-item-icon-color)` | Icon-Farbe |

### Entity-Optionen

| Option | Typ | Standard | Beschreibung |
|--------|-----|----------|-------------|
| `type` | string | - | `"badge"` für Badge-Darstellung |
| `entity` | string | **Erforderlich** | Entity-ID (z.B. `sensor.temp`) |
| `name` | string | friendly_name | Überschreibt Entity-Namen |
| `icon` | string | Entity-Icon | Custom Icon (z.B. `mdi:thermometer`) |
| `attribute` | string | `state` | Zeigt spezifisches Attribut an |
| `value_template` | string | - | Jinja2-Template für Wert |
| `unit` | string | unit_of_measurement | Custom Einheit |
| `unit_position` | string | Erbt von Karte | Unit-Position überschreiben |
| `show_icon` | boolean | Erbt von Karte | Icon-Sichtbarkeit überschreiben |
| `service` | string | - | Service-Call bei Klick |
| `data` | object | - | Service-Call Daten |
| `visible_if` | string | - | Sichtbarkeits-Template |
| `*_color` | string | - | Farb-Überschreibungen pro Entity |

---

## 💡 Erweiterte Beispiele

### Dashboard-Header mit Badges
```yaml
type: custom:header-and-badges-strip-card
title: Mein Smart Home
duration: 30
font_size: 16px
border_radius: 12px
card_height: 70px
fading: true
pause_on_hover: true
entities:
  - type: badge
    entity: person.robin
  - type: badge
    entity: person.sarah
  - type: badge
    entity: sensor.outside_temperature
  - entity: sensor.living_room_temperature
    name: Wohnzimmer
    icon: mdi:sofa
    show_icon: true
  - entity: light.kitchen
    name: Küche
    service: light.toggle
    show_icon: true
    icon_color: orange
```

### Farbige Templates
```yaml
type: custom:header-and-badges-strip-card
entities:
  - entity: sensor.temperature
    name: Temperatur
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

### Bedingte Sichtbarkeit
```yaml
type: custom:header-and-badges-strip-card
entities:
  - entity: sensor.rain_probability
    name: Regen
    visible_if: "{{ states('sensor.rain_probability')|int > 30 }}"
  - entity: sun.sun
    name: Sonne
    visible_if: "{{ states('sun.sun') == 'above_horizon' }}"
```

---

## 🎨 Styling-Tipps

- **Minimalistisch**: `transparent: true`, kein `border_radius`, `show_icon: false`
- **Modern**: `border_radius: 12px`, `fading: true`, `pause_on_hover: true`
- **Dashboard-Header**: Große `card_height` (70-80px), `font_size: 16px`, Badges verwenden
- **Status-Ticker**: Kleine `card_height` (40-50px), schnelle `duration` (10-15s)

---

## 🔧 Troubleshooting

**Karte wird nicht angezeigt:**
- Cache leeren (Strg+F5)
- Ressource korrekt hinzugefügt?
- Browser-Konsole auf Fehler prüfen

**Badges werden nicht angezeigt:**
- `type: badge` bei Entity angegeben?
- Entity existiert und ist verfügbar?

**Animation ruckelt:**
- `duration` erhöhen
- Weniger Entities verwenden
- Hardware-Beschleunigung im Browser prüfen

---

## 📜 Credits & License

### Basiert auf
Dieses Projekt basiert auf der originalen **[Strip Card](https://github.com/cataseven/Strip-Card)** von **cataseven**.

### Entwickelt von
**Robin Zimmermann** ([Spider19996](https://github.com/Spider19996))  
Version 3.0.0 - Januar 2026

### Unterstützung
<a href="https://www.buymeacoffee.com/cataseven" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" >
</a>

Wenn dir diese Karte gefällt, gib dem Projekt einen ⭐ auf GitHub!

### Lizenz
MIT License

---

**Viel Spaß mit deinem neuen Dashboard-Header! 🚀**
