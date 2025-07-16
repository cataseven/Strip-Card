# 🔶 Strip Card for Home Assistant

**Strip Card**, Home Assistant için geliştirilen, birden fazla entity bilgisini yatay olarak kayan bir şerit halinde gösteren şık ve özelleştirilebilir bir Lovelace kartıdır.

---

## ✨ Özellikler

- 🔁 Kayarak geçen ticker görünüm
- 🧩 Birden fazla entity desteği
- 🎨 Renk, yazı tipi boyutu ve ikon gibi pek çok görsel özelleştirme
- 🕒 Kayma süresi ayarlanabilir
- 🖱️ Her bir öğeye tıklanabilir (`more-info` açılır)
- ⏸️ Üzerine gelindiğinde durdurulabilir (opsiyonel)
- ⚠️ Eksik entity durumunda hata mesajı gösterimi

---

## 📦 Kurulum

### 1. JavaScript dosyasını ekleyin

`strip-card.js` dosyasını Home Assistant yapılandırma klasörünüzün `www/` dizinine yerleştirin.

Tam yol genellikle:  
`/config/www/strip-card.js`

### 2. Lovelace Kaynağını tanımlayın

#### Arayüz üzerinden:
- **Ayarlar > Paneller > Kaynaklar > Kaynak Ekle**
- URL: `/local/strip-card.js`
- Tür: `JavaScript Module`

#### YAML üzerinden:
```yaml
lovelace:
  resources:
    - url: /local/strip-card.js
      type: module
```

---

## 🧾 Örnek Kart Yapılandırması

```yaml
type: custom:strip-card
title: Home Status
duration: 30
font_size: 16px
separator: "•"
pause_on_hover: true
show_icon: true
name_color: "#333"
value_color: "#1976d2"
unit_color: "#999"
icon_color: "#888"
entities:
  - entity: sensor.temperature_living
    name: Temp
    unit: °C
  - entity: sensor.humidity_living
    name: Humidity
  - entity: binary_sensor.front_door
    name: Door
```

---

## ⚙️ Kart Seçenekleri

| Ayar             | Tip      | Varsayılan                       | Açıklama |
|------------------|----------|----------------------------------|----------|
| `title`          | string   | `"Data Strip"`                   | Kart başlığı |
| `duration`       | number   | `20`                             | Şeridin bir tam turda geçme süresi (saniye) |
| `font_size`      | string   | `"14px"`                         | Yazı boyutu |
| `separator`      | string   | `"•"`                            | Her öğe arasındaki ayraç |
| `pause_on_hover` | boolean  | `false`                          | Mouse ile üzerine gelince kayma dursun mu |
| `show_icon`      | boolean  | `false`                          | Icon gösterilsin mi |
| `name_color`     | string   | `var(--primary-text-color)`      | İsim rengi |
| `value_color`    | string   | `var(--primary-color)`           | Değer rengi |
| `unit_color`     | string   | `var(--secondary-text-color)`    | Birim rengi |
| `icon_color`     | string   | `var(--paper-item-icon-color)`   | Icon rengi |
| `entities`       | array    | **Gerekli**                      | Gösterilecek entity listesi |

### Entity nesnesi olarak kullanımı:
```yaml
- entity: sensor.my_sensor
  name: Custom Name
  attribute: temperature
  unit: °C
```

---

## 🧪 Geliştirici Notları

- Kart, `ha-card`, `ha-state-icon` ve Home Assistant’ın mevcut temalarıyla uyumludur.
- Eksik bir entity tanımlandığında hata mesajı ticker içinde gösterilir.
- Tıklanabilirlik özelliği sayesinde kullanıcı doğrudan `more-info` ekranına ulaşabilir.

---

## 📄 Lisans

MIT Lisansı ile lisanslanmıştır.  
Geliştirici: [Senin adın veya GitHub kullanıcı adın]

---

## ⭐ Destek Ol

Projeyi faydalı bulduysan GitHub’da ⭐ vererek destek olabilirsin!
