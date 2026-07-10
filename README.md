<a href="https://www.buymeacoffee.com/cataseven" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 50px !important;width: 180px !important;" >
</a>

# 🔶 Strip Card for Home Assistant

![Downloads](https://img.shields.io/github/downloads/cataseven/Strip-Card/total?color=41BDF5&logo=home-assistant&label=Downloads&suffix=%20downloads&style=for-the-badge)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/frontend)
[![GitHub Release](https://img.shields.io/github/release/cataseven/Strip-Card.svg)](https://github.com/cataseven/Strip-Card/releases)
[![License](https://img.shields.io/github/license/cataseven/Strip-Card.svg)](LICENSE)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1.0%2B-blue.svg)
![Maintenance](https://img.shields.io/maintenance/yes/2026.svg)
[![GitHub Stars](https://img.shields.io/github/stars/cataseven/Strip-Card?style=social)](https://github.com/cataseven/Strip-Card)
[![GitHub Issues](https://img.shields.io/github/issues/cataseven/Strip-Card?style=flat-square)](https://github.com/cataseven/Strip-Card/issues)

A highly flexible scrolling ticker card for Home Assistant dashboards supporting templates, trend indicators (stock‑ticker mode), bidirectional scrolling, badge mode, rich per‑entity styling, entity visibility rules, action handling (tap/hold/double‑tap), and responsive full‑width layouts.

![image1](images/a.gif)

![image2](images/badge.png)

---

## ✨ Features

* **Redesigned tabbed UI Editor** — Settings organized into Layout, Toggles, Sizing, and Colors tabs. Entity settings split into General, Display, Colors, and Actions tabs.
  ![image3](images/ui2.png)
* **HA 2026.4 compatible** — Works with the Web Awesome frontend migration
* 📈 **Trend indicators (stock‑ticker mode)** — red/green coloring, up/down arrows and change/percent display via `trend`
* 🧠 **`value` template variable** — no more repeating the entity id inside `value_template` / `visible_if`
* ⚡ **Jinja conditionals run locally** — `A if C else B`, `and`/`or`/`not`, `is none`, `is defined` evaluate instantly in the browser
* 🔌 **Instant server templates** — complex Jinja is pushed over a WebSocket subscription (no more 30 s polling)
* 🌍 **Locale‑aware number formatting** via `format_number`
* 🔋 **Battery friendly** — scrolling pauses while the card is off‑screen or the tab is hidden
* ♿ Honors the OS **reduce‑motion** accessibility setting
* Horizontal and vertical scrolling layouts
* Continuous or single‑cycle scrolling
* Direction control (`left` / `right`)
* Badge/Chip display mode
* Per‑entity actions: tap / hold / double‑tap
* Supports `more-info`, `toggle`, `navigate`, `url`, `assist`, `call-service`
* Full template support for value, colors, icons, titles, visibility & more
* Per‑entity color, icon, attribute & unit overrides
* **Separator styling** — Independent color, font size, and font weight for the separator character
* Conditional rendering via `visible_if`
* 🔁 **Repeat items from attribute arrays via `repeat_on`** (alerts, todos, forecasts)
* Regex‑based friendly name replacement
* Full‑width responsive mode with sidebar & scrollbar compensation
* Optional fading edges and hover‑pause
* **Click to pause/resume** — Toggle scrolling with a click
* **Hide when empty** — Automatically hide the card when no entities pass visibility filters
* Transparent mode
* Works with `states()` style HA templating

---

## 📦 Installation

### HACS

Search for **Strip Card** and install.

### Manual

Place `strip-card.js` under:

```
/www/community/strip-card/
```

Then add resource:

```
lovelace:
  resources:
    - url: /local/community/strip-card/strip-card.js
      type: module
```

![image4](images/picker.png)

---

# 🧩 Configuration Options

## Global Options

| Option               | Type           | Default                                          | Description                                                                                                |
| -------------------- | -------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `title`              | string         | `""`                                             | Card header title (templatable)                                                                            |
| `duration`           | number/string  | `20`                                             | Scroll duration (one full cycle), templatable                                                              |
| `scroll_speed`       | number/string  | —                                                | px/s movement speed. Overrides `duration` when set                                                         |
| `scroll_direction`   | string         | `"left"`                                         | `left` or `right`                                                                                          |
| `continuous_scroll`  | boolean        | `true`                                           | Continuous loop or one‑shot                                                                                |
| `pause_on_hover`     | boolean        | `false`                                          | Hover to pause animation                                                                                   |
| `pause_on_click`     | boolean        | `false`                                          | Click the card to toggle scrolling on/off                                                                  |
| `hide_when_empty`    | boolean        | `false`                                          | Completely hide the card when all entities are filtered out by `visible_if`                                 |
| `vertical_scroll`    | boolean        | `false`                                          | Enables vertical scrolling                                                                                 |
| `vertical_alignment` | string         | `"stack"`                                        | `stack` or `inline`                                                                                        |
| `fading`             | boolean        | `true`                                           | Edge fade effect                                                                                           |
| `show_icon`          | boolean        | `true`                                           | Show entity icons                                                                                          |
| `font_size`          | string         | `"14px"`                                         | Text size                                                                                                  |
| `separator`          | string         | `"•"`                                            | Separator between items                                                                                    |
| `separator_color`    | string         | `var(--disabled-text-color)`                     | Separator color (templatable)                                                                              |
| `separator_font_size`| string         | `"14px"`                                         | Separator font size, independent from main font size                                                       |
| `separator_font_weight`| string       | `"normal"`                                       | Separator font weight (`normal`, `bold`, `300`–`900`)                                                      |
| `empty_message`      | string/boolean | `"No entities passed the visible_if conditions"` | Message shown when no entities remain after filtering (`visible_if` / `repeat_on`). Set `false` to disable |
| `border_radius`      | string         | `"0px"`                                          | Card border radius                                                                                         |
| `card_height`        | string         | `"50px"`                                         | Fixed card height                                                                                          |
| `card_width`         | string         | `"400px"`                                        | Fixed width; ignored when `full_width=true`                                                                |
| `transparent`        | boolean        | `false`                                          | Removes card background & border                                                                           |
| `full_width`         | boolean        | `false`                                          | Expands card across viewport minus sidebar/scrollbar                                                       |
| `badge_style`        | boolean        | `false`                                          | Switch to chip/badge layout                                                                                |
| `format_number`      | boolean        | `false`                                          | Format numeric values with the HA user locale (e.g. `1.234,5`)                                            |
| `pause_when_hidden`  | boolean        | `true`                                           | Pause the animation while the card is off‑screen or the browser tab is hidden                              |
| `respect_reduced_motion` | boolean    | `true`                                           | Stop auto‑scroll for users with the OS “reduce motion” accessibility setting                                |
| `trend`              | boolean/object | `false`                                          | Default 📈 trend‑indicator settings applied to all entities (see **Trend Indicators**)                      |

---

## Color Options

| Option        | Default                       | Description  |
| ------------- | ----------------------------- | ------------ |
| `name_color`  | `var(--primary-text-color)`   | Entity label |
| `value_color` | `var(--primary-color)`        | Value color  |
| `unit_color`  | `var(--secondary-text-color)` | Unit suffix  |
| `icon_color`  | `var(--primary-text-color)`   | Icon color   |

### Badge/Chip style color options

If `badge_style: true`:

| Option              | Default                           |
| ------------------- | --------------------------------- |
| `badge_background`  | `var(--primary-color)`            |
| `badge_label_color` | `var(--primary-text-color)`       |
| `badge_value_color` | `var(--primary-color)`            |
| `badge_height`      | `"28px"`                          |
| `badge_font_size`   | `"12px"`                          |
| `badge_icon_size`   | `"16px"`                          |

---

## Entity‑Level Options

| Option           | Type                    | Description                                          |
| ---------------- | ----------------------- | ---------------------------------------------------- |
| `entity`         | string                  | HA entity id (required unless `value_template` used) |
| `repeat_on`      | template                | 🔁 Template returning an array to repeat this entry  |
| `name`           | string                  | Override label (templatable)                         |
| `attribute`      | string                  | Use attribute instead of state                       |
| `value_template` | string                  | HA template for value (`states()` supported)         |
| `unit`           | string                  | Override measurement unit (templatable)              |
| `icon`           | string                  | Custom icon (templatable)                            |
| `show_icon`      | boolean/string/template | Show icon override                                   |
| `visible_if`     | template                | Render only if true                                  |
| `name_color`     | template                | Override color                                       |
| `value_color`    | template                | Override color                                       |
| `unit_color`     | template                | Override color                                       |
| `icon_color`     | template                | Override color                                       |
| `trend`          | boolean/object          | 📈 Trend indicator for this entity (see **Trend Indicators**) |
| `format_number`  | boolean                 | Override the global `format_number` for this entity  |

---

## 📈 Trend Indicators (Stock‑Ticker Mode)

Color values red/green, add an up/down arrow and show the change — perfect for stock tickers, crypto, energy prices or sports scores.

```yaml
type: custom:strip-card
entities:
  - entity: sensor.aapl
    name: AAPL
    trend:
      source: baseline
      baseline: previous_close
      show_delta: percent      # → AAPL: 213.40 ▲ +1.6%
  - entity: sensor.btc
    name: BTC
    trend: true                # simplest form: direction of the last change
```

Use `trend: true` (or an options object) per entity, or set it once at card level to apply to every entity.

### Trend options

| Option            | Default                          | Description                                                                                                     |
| ----------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `source`          | `memory`                         | `memory` = direction of the last observed change · `attribute` = an attribute already holding a signed change · `baseline` = an attribute holding a reference value (e.g. previous close) |
| `attribute`       | `change`                         | Attribute name when `source: attribute`                                                                          |
| `baseline`        | `previous_close`                 | Attribute name when `source: baseline`                                                                           |
| `threshold`       | `0`                              | Minimum absolute change before marking up/down                                                                   |
| `show_arrow`      | `true`                           | Show the ▲ / ▼ arrow                                                                                             |
| `up_icon` / `down_icon` | `mdi:menu-up` / `mdi:menu-down` | Custom arrow icons                                                                                        |
| `show_delta`      | —                                | `absolute` or `percent` — display the change next to the value                                                   |
| `delta_precision` | `2` (abs) / `1` (pct)            | Decimals of the displayed delta                                                                                  |
| `up_color` / `down_color` / `flat_color` | green / red / — | Colors; also themeable via `--strip-card-trend-up` / `--strip-card-trend-down`                  |
| `apply_to`        | `[value, arrow]`                 | Which parts get the trend color: `value`, `name`, `unit`, `icon`, `arrow`                                        |

> 💡 `memory` compares tick‑to‑tick and resets on page reload. For stocks prefer `baseline` / `attribute` — most finance integrations (e.g. Yahoo Finance) expose `previous_close` / `change` attributes.

Templates can also use the trend variables directly:

```yaml
value_color: "{{ 'limegreen' if trend == 'up' else 'red' if trend == 'down' else 'gray' }}"
```

---

## 🔁 Repeat Over Attribute Arrays (`repeat_on`)

Use `repeat_on` when an entity attribute (or any template) returns an **array** and you want to render **one strip item per element**.

### Template variables available when `repeat_on` is used

When repeating, these variables are injected into templates:

* 🧱 `item` — current array element
* 🔢 `index` — 0‑based index of the element
* 🏷️ `entity` — source entity id (string)
* 📦 `stateObj` — full HA state object of the source entity
* 💡 `value` — current state (or attribute value) of the source entity

These can be used in `visible_if`, `value_template`, `name`, `unit`, colors, and `icon`.


---

## Action Options

Entities support 3 gesture bindings:

* `tap_action`
* `hold_action`
* `double_tap_action`

Supported actions include:

* `more-info`
* `toggle`
* `navigate`
* `url`
* `assist`
* `none`
* `call-service`
* `perform-action`

Example:

```yaml
- entity: switch.kitchen
  tap_action:
    action: toggle
  hold_action:
    action: more-info
  double_tap_action:
    action: navigate
    navigation_path: /dashboard/home
```

---

### Visibility behavior

* `visible_if` is evaluated **per repeated item**.
* If `repeat_on` returns `undefined`, `null`, `false`, an empty string, or an empty array, the entry produces **no items** (nothing is shown for that entry).
## Visibility Rules

`visible_if` allows conditional rendering:

```yaml
visible_if: "{{ states('sun.sun') == 'above_horizon' }}"
```

If the expression is false, the entity is omitted.

### Hide the entire card when empty

When all entities are filtered out, the card shows an empty message by default. To hide the card entirely instead:

```yaml
type: custom:strip-card
hide_when_empty: true
entities:
  - entity: sensor.alerts
    visible_if: "{{ float(states('sensor.alerts')) > 0 }}"
```

The card disappears from the dashboard when no entities pass their `visible_if` conditions and reappears automatically when they do.

---

## Template Support

The card supports Home Assistant style expressions:

```yaml
value_template: "{{ states('sensor.temp') }}"
name: "{{ states('person.john') }}"
icon_color: "{{  'red' if states('sensor.temp')|float > 30 else 'blue' }}"
```

Works with:

* `states()`
* inline expressions
* multi‑expression interpolation
* numeric comparison
* conditional icon rendering

### 💡 Template variables

These variables are automatically available in `value_template`, `visible_if`, `name`, `unit`, `icon` and all color templates:

* `value` — current state of the entity, or the attribute value when `attribute` is set
* `trend` — `'up'`, `'down'` or `'flat'` (see **Trend Indicators**)
* `delta` — numeric change behind `trend`
* `prev_value` — previous value observed by the card
* `entity` / `stateObj` — entity id and full HA state object
* `item` / `index` — only when `repeat_on` is used

**Before:**
```yaml
- entity: sensor.newgaragesensor_garage_temperature
  value_template: "{{ states('sensor.newgaragesensor_garage_temperature') | round(1) }}"
  name: Garage
```

**After:**
```yaml
- entity: sensor.newgaragesensor_garage_temperature
  value_template: "{{ value | round(1) }}"
  name: Garage
```

`value` also works inside `visible_if`:

```yaml
- entity: sensor.garage_temperature
  visible_if: "{{ value | float > 30 }}"
  value_template: "{{ '%.1f °C' | format(value | float) }}"
```

> ⚠️ These variables exist only in the card's local template engine — the HA server doesn't know them — so keep such expressions to the locally supported syntax below.

### ⚡ Locally supported syntax

Templates are evaluated **locally first** (instant, no server round‑trip) and automatically fall back to the HA server for anything the local engine can't compile:

* `states()`, `state_attr()`, `is_state()`, `now()` …
* Filters: `round`, `float`, `int`, `upper`, `lower`, `replace`, `default`, `format`, `timestamp_custom` (real `strftime`, incl. `%-H`‑style and a UTC flag), and more — chained and nested (`format(value | float)`)
* Inline conditionals `A if C else B` (chainable), `and` / `or` / `not`, `is none`, `is not none`, `is defined`, `True` / `False` / `None`
* JavaScript style also works: `cond ? a : b`, `&&`, `||`

---

## Template Almost Everything

```yaml
type: custom:strip-card
title: |
  {{ 'Temperature Strip – ' + states('sensor.temperature') + '°C' }}
duration: |
  {{ states('sensor.temperature') < 18
     ? 30
     : (states('sensor.temperature') <= 26 ? 20 : 10) }}
separator: |
  {{ states('sensor.temperature') < 18
     ? '❄'
     : (states('sensor.temperature') <= 26 ? '•' : '🔥') }}
font_size: |
  {{ states('sensor.temperature') > 26 ? '18px' : '14px' }}
name_color: |
  {{ states('sensor.temperature') < 18
     ? 'cyan'
     : (states('sensor.temperature') <= 26 ? 'springgreen' : 'orange') }}
value_color: |
  {{ states('sensor.temperature') < 18
     ? 'dodgerblue'
     : (states('sensor.temperature') <= 26 ? 'limegreen' : 'orangered') }}
unit_color: |
  {{ states('sensor.temperature') < 18
     ? 'powderblue'
     : (states('sensor.temperature') <= 26 ? 'palegreen' : 'gold') }}
icon_color: |
  {{ states('sensor.temperature') < 18
     ? 'aqua'
     : (states('sensor.temperature') <= 26 ? 'lime' : 'red') }}
show_icon: |
  {{ states('sensor.temperature') > 0 }}
pause_on_hover: true
border_radius: |
  {{ states('sensor.temperature') > 26 ? '16px' : '8px' }}
card_height: |
  {{ states('sensor.temperature') > 26 ? '170px' : '250px' }}
card_width: |
  {{ states('sensor.temperature') < 18 ? '260px' : '320px' }}
fading: true
vertical_scroll: false
vertical_alignment: stack
continuous_scroll: true
transparent: false
scroll_speed: |
  {{ states('sensor.temperature') < 18
     ? 30
     : (states('sensor.temperature') <= 26 ? 50 : 80) }}
scroll_direction: right
full_width: false
badge_style: true
badge_background: |
  {{ states('sensor.temperature') < 18
     ? 'steelblue'
     : (states('sensor.temperature') <= 26 ? 'seagreen' : 'firebrick') }}
badge_label_color: |
  {{ states('sensor.temperature') < 18
     ? 'aliceblue'
     : (states('sensor.temperature') <= 26 ? 'mintcream' : 'lightyellow') }}
badge_value_color: white
badge_height: |
  {{ states('sensor.temperature') > 26 ? '32px' : '28px' }}
badge_font_size: |
  {{ states('sensor.temperature') > 26 ? '13px' : '12px' }}
badge_icon_size: |
  {{ states('sensor.temperature') > 26 ? '18px' : '16px' }}
entities:
  - entity: sensor.temperature
    name: |
      {{ 'Room Temp (' + states('sensor.temperature') + '°C)' }}
    value_template: |
      {{ states('sensor.temperature') }}
    unit: |
      {{ '°C' }}
    icon: |
      {{ states('sensor.temperature') < 18
         ? 'mdi:snowflake-alert'
         : (states('sensor.temperature') <= 26
            ? 'mdi:thermometer-check'
            : 'mdi:fire-alert') }}
    show_icon: |
      {{ states('sensor.temperature') > 0 }}
    visible_if: |
      {{ states('sensor.temperature') > 0 }}
    name_color: |
      {{ states('sensor.temperature') < 18
         ? 'mediumturquoise'
         : (states('sensor.temperature') <= 26 ? 'mediumspringgreen' : 'coral') }}
    value_color: |
      {{ states('sensor.temperature') < 18
         ? 'deepskyblue'
         : (states('sensor.temperature') <= 26 ? 'chartreuse' : 'crimson') }}
    unit_color: |
      {{ states('sensor.temperature') < 18
         ? 'lightcyan'
         : (states('sensor.temperature') <= 26 ? 'darkseagreen' : 'yellow') }}
    icon_color: |
      {{ states('sensor.temperature') < 18
         ? 'lightskyblue'
         : (states('sensor.temperature') <= 26 ? 'forestgreen' : 'darkred') }}
    separator: |
      {{ states('sensor.temperature') < 18
         ? '❄'
         : (states('sensor.temperature') <= 26 ? '•' : '🔥') }}
    badge_background: |
      {{ states('sensor.temperature') < 18
         ? 'midnightblue'
         : (states('sensor.temperature') <= 26 ? 'darkgreen' : 'maroon') }}
    badge_label_color: |
      {{ states('sensor.temperature') < 18
         ? 'lightblue'
         : (states('sensor.temperature') <= 26 ? 'honeydew' : 'mistyrose') }}
    badge_value_color: |
      {{ states('sensor.temperature') < 18
         ? 'cyan'
         : (states('sensor.temperature') <= 26 ? 'lime' : 'orange') }}
    tap_action:
      action: more-info
    hold_action:
      action: assist
    double_tap_action:
      action: perform-action
      perform_action: ""
      target: {}
```

---

## ✅ Example: NWS Alerts (Repeat Over Array)

If your sensor returns below attributes
```yaml
Alerts:
  - Event: Cold Weather Advisory
    ID: 66aebbdf-c1cf-7004-04ac-7946e90c7c17
    URL: >-
      https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.c9655a94fdf1f8075e3ee0334a04035d67c91766.001.1
    Headline: COLD WEATHER ADVISORY REMAINS IN EFFECT UNTIL NOON CST MONDAY
    Type: Update
    Status: Actual
    Severity: Moderate
    Certainty: Likely
    Sent: "2026-01-18T13:41:00-06:00"
    Onset: "2026-01-18T13:41:00-06:00"
    Expires: "2026-01-18T21:45:00-06:00"
    Ends: "2026-01-19T12:00:00-06:00"
    AreasAffected: >-
      West Polk; Norman; Clay; Kittson; Roseau; Lake Of The Woods; West
      Marshall; East Marshall; North Beltrami; Pennington; Red Lake; East Polk;
      North Clearwater; South Beltrami; Mahnomen; South Clearwater; Hubbard;
      West Becker; East Becker; Wilkin; West Otter Tail; East Otter Tail;
      Wadena; Grant; Towner; Cavalier; Pembina; Benson; Ramsey; Eastern Walsh
      County; Eddy; Nelson; Grand Forks; Griggs; Steele; Traill; Barnes; Cass;
      Ransom; Sargent; Richland; Western Walsh County
    Description: |-
      * WHAT...Very cold wind chills as low as 40 below expected.

      * WHERE...Portions of central, north central, northwest, and west
      central Minnesota and northeast and southeast North Dakota.

      * WHEN...Until noon CST Monday.

      * IMPACTS...The dangerously cold wind chills as low as 40 below zero
      could cause frostbite on exposed skin in as little as 10 minutes.
    Instruction: |-
      Use caution while traveling outside. Wear appropriate clothing, a
      hat, and gloves.
  - Event: Blizzard Warning
    ID: 2274a010-f718-6266-76a7-5af3756f64ab
    URL: >-
      https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.713fd1c091afc8d7b3dfdd2926996c99e484b2d7.002.1
    Headline: BLIZZARD WARNING REMAINS IN EFFECT UNTIL 9 PM CST THIS EVENING
    Type: Update
    Status: Actual
    Severity: Extreme
    Certainty: Likely
    Sent: "2026-01-18T13:40:00-06:00"
    Onset: "2026-01-18T13:40:00-06:00"
    Expires: "2026-01-18T21:00:00-06:00"
    Ends: "2026-01-18T21:00:00-06:00"
    AreasAffected: >-
      Norman; Clay; Roseau; East Marshall; Pennington; Red Lake; East Polk;
      Mahnomen; West Becker; Wilkin; West Otter Tail; Grant; Barnes; Cass;
      Ransom; Sargent; Richland
    Description: |-
      * WHAT...Blizzard conditions. Additional snow accumulations up to
      one inch. Winds gusting as high as 55 mph.

      * WHERE...Portions of northwest and west central Minnesota and
      southeast North Dakota.

      * WHEN...Until 9 PM CST this evening.

      * IMPACTS...Whiteout conditions are expected and will make travel
      treacherous and potentially life-threatening.
    Instruction: |-
      Persons should consider delaying all travel. Motorists should use
      extreme caution if travel is absolutely necessary.
configuration_type: GPS Location
gps_location: 46.7258996,-97.1193751
attribution: Data provided by Weather.gov
icon: mdi:alert
friendly_name: NWS Alerts Alerts
```

![image1](images/w2.gif)

```yaml
type: custom:strip-card
entities:
  - entity: sensor.nws_alerts
    repeat_on: "{{ state_attr(entity, 'Alerts') }}"
    value_template: "{{ item.Description }}"
    name: "{{ item.Headline  }}"
    visible_if: "{{ item.Status == 'Actual' }}"
duration: "0"
separator: "|"
font_size: 20px
scroll_speed: "100"
grid_options:
  columns: full
  rows: auto
```
---
## ✅ Example: Weather Attributes Strip

![image1](images/w1.gif)

```yaml
type: custom:strip-card
entities:
  - entity: weather.home
    name: Temp
    attribute: temperature
    unit: "{{ state_attr(entity, 'temperature_unit') }}"
  - entity: weather.home
    name: Feels
    attribute: apparent_temperature
    unit: "{{ state_attr(entity, 'temperature_unit') }}"
  - entity: weather.home
    name: Dew
    attribute: dew_point
    unit: "{{ state_attr(entity, 'temperature_unit') }}"
  - entity: weather.home
    name: Humidity
    attribute: humidity
    unit: "%"
  - entity: weather.home
    name: Clouds
    attribute: cloud_coverage
    unit: "%"
  - entity: weather.home
    name: UV
    attribute: uv_index
  - entity: weather.home
    name: Pressure
    attribute: pressure
    unit: "{{ state_attr(entity, 'pressure_unit') }}"
  - entity: weather.home
    name: Wind
    value_template: >-
      {{ state_attr(entity, 'wind_speed') }} {{ state_attr(entity,
      'wind_speed_unit') }}
  - entity: weather.home
    name: Gust
    value_template: >-
      {{ state_attr(entity, 'wind_gust_speed') }} {{ state_attr(entity,
      'wind_speed_unit') }}
  - entity: weather.home
    name: Visibility
    attribute: visibility
    unit: "{{ state_attr(entity, 'visibility_unit') }}"
```
---
## Full Width Responsive Mode

Enabling:

```yaml
full_width: true
```

Card expands to full viewport minus:

* sidebar width (observed dynamically)
* scrollbar width (observed dynamically)

Result: no overflow or layout breakage in dashboards.

---

## Badge/Chip Mode

```yaml
badge_style: true
```

Shows compact badges:

```yaml
entities:
  - entity: sensor.temp
    name: Temp
```

Each chip supports icon, label, value & template colors.

---

## Regex Friendly Name Replacement

Useful for trimming repeated text:

```yaml
name_replace:
  - pattern: "ROOM"
    replace: ""
```

---

## Example: Basic

```yaml
type: custom:strip-card
show_icon: true
entities:
  - sensor.temperature
  - sensor.humidity
```

---

## Example: Vertical

```yaml
type: custom:strip-card
vertical_scroll: true
vertical_alignment: stack
continuous_scroll: true
card_height: 300px
entities:
  - entity: sun.sun
  - entity: zone.home
  - entity: sensor.humidity
```

---

## Example: Actions & Templates

```yaml
type: custom:strip-card
show_icon: true
entities:
  - entity: sensor.temperature
    value_template: "{{ states('sensor.temperature') }} °C"
    value_color: "{{ 'red' if states('sensor.temperature')|float > 28 else 'blue' }}"
    tap_action:
      action: more-info
  - entity: switch.kitchen
    tap_action:
      action: perform-action
      perform_action: switch.toggle
      target:
        entity_id: switch.zone_11
    hold_action:
      action: assist
```

## Developer Notes

* Uses `ha-card` for native appearance
* CSS‑based animation (no JS timers)
* Local Jinja→JS transpiler with automatic HA server fallback; complex templates subscribe to server rendering over WebSocket (`render_template`) — no polling
* Animation pauses while off‑screen / tab hidden; honors `prefers-reduced-motion`; duplicate marquee copies are `aria-hidden`
* Sidebar & scrollbar observation for responsive mode
* Unit tests under `tests/` (90+ assertions) with GitHub Actions CI

---

## License

MIT

---

## Support

If you enjoy this card, consider supporting the author:

<a href="https://www.buymeacoffee.com/cataseven" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" style="height: 60px !important;width: 217px !important;" >
</a>
