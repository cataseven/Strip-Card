const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

console.info(
  `%c STRIP-CARD %c Loaded - Version 3.2.1 (Dynamic Unit Position) `,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

// Kartı kart seçicide kullanılabilir hale getir
window.customCards = window.customCards || [];
window.customCards.push({
  type: "strip-card",
  name: "Strip Card",
  description: "Varlıkları kayan bir şerit üzerinde gösteren bir kart.",
  preview: true, // Kart seçicide bir önizleme gösterir
});

class StripCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
    };
  }


  static getStubConfig() {
    return {
      type: "custom:strip-card",
      entities: [
        { entity: "sun.sun", name: "Sun" },
        { entity: "zone.home", name: "People at Home" }, 
      ],
      duration: 20,
      separator: "•"
    };
  }

  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("The 'entities' list must be present in the configuration.");
    }
    this._config = {
      title: "",
      duration: 20,
      separator: "•",
      font_size: "14px",
      name_color: "var(--primary-text-color)",
      value_color: "var(--primary-color)",
      unit_color: "var(--secondary-text-color)",
      icon_color: "var(--primary-text-color)",
      show_icon: false,
      pause_on_hover: false,
      unit_position: 'right',
      border_radius: "0px",
      card_height: "50px",
      card_width: undefined,
      ...config,
    };
  }

  getCardSize() {
    return 1;
  }

  _handleTap(entityConfig) {
    if (entityConfig.service) {
      const [domain, service] = entityConfig.service.split(".");
      if (!domain || !service) {
        console.error(`[Strip Card] Invalid service format: ${entityConfig.service}. Must be in 'domain.service' format.`);
        return;
      }
      this.hass.callService(domain, service, entityConfig.data || {});
    } else {
      const entityId = typeof entityConfig === "string" ? entityConfig : entityConfig.entity;
      const event = new Event("hass-more-info", { bubbles: true, composed: true });
      event.detail = { entityId };
      this.dispatchEvent(event);
    }
  }

  evaluateTemplate(template, hass) {
    if (!template || typeof template !== 'string') return template;
    if (!template.includes("{{")) return template;

    try {
      const expression = template.match(/{{(.*?)}}/s)[1];
      const func = new Function("states", `"use strict"; return (${expression.trim()});`);
      return func(hass.states);
    } catch (e) {
      console.warn("Template evaluation failed:", e, template);
      return template;
    }
  }

  render() {
    if (!this._config || !this.hass) return html``;
    
    const duration = this.evaluateTemplate(this._config.duration, this.hass);
    
    const cardWidthStyle = this._config.card_width ? `--strip-card-width: ${this._config.card_width};` : '';

    const cardStyles = `
      --strip-card-font-size: ${this._config.font_size};
      --strip-card-border-radius: ${this._config.border_radius};
      --strip-card-height: ${this._config.card_height};
      ${cardWidthStyle}
    `;
    
    return html`
      <ha-card .header="${this._config.title}" style="${cardStyles}">
        <div class="ticker-wrap ${this._config.pause_on_hover ? 'pausable' : ''}">
          <div class="ticker-move" style="animation-duration: ${duration}s;">
            ${this._config.entities.map((entityConfig) => this.renderEntity(entityConfig))}
          </div>
        </div>
      </ha-card>
    `;
  }

  renderEntity(entityConfig) {
    const entityId = typeof entityConfig === "string" ? entityConfig : entityConfig.entity;
    const stateObj = this.hass.states[entityId];

    if (!stateObj) {
      return html`<div class="ticker-item error">Unknown Entity: ${entityId}</div>`;
    }

    let value = stateObj.state;
    if (entityConfig.attribute && stateObj.attributes[entityConfig.attribute] !== undefined) {
      value = stateObj.attributes[entityConfig.attribute];
    }
    if (entityConfig.value_template) {
        value = this.evaluateTemplate(entityConfig.value_template, this.hass);
    }
    if (typeof value === 'string' && value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }

    const name = entityConfig.name || stateObj.attributes.friendly_name;
    const unit = entityConfig.unit !== undefined ? entityConfig.unit : (stateObj.attributes.unit_of_measurement || "");
    let showIcon = entityConfig.show_icon !== undefined ? entityConfig.show_icon : this._config.show_icon;
    showIcon = this.evaluateTemplate(showIcon, this.hass);
    const unit_position = entityConfig.unit_position || this._config.unit_position;

    const nameColor = this.evaluateTemplate(entityConfig.name_color || this._config.name_color, this.hass);
    const valueColor = this.evaluateTemplate(entityConfig.value_color || this._config.value_color, this.hass);
    const unitColor = this.evaluateTemplate(entityConfig.unit_color || this._config.unit_color, this.hass);
    const iconColor = this.evaluateTemplate(entityConfig.icon_color || this._config.icon_color, this.hass);
    const customIcon = this.evaluateTemplate(entityConfig.icon, this.hass);

    const valuePart = html`<span class="value" style="color: ${valueColor};">${value}</span>`;
    const unitPart = html`<span class="unit" style="color: ${unitColor};">${unit}</span>`;
    
    const titleText = unit_position === 'left' ? `${name}: ${unit}${value}` : `${name}: ${value} ${unit}`;

    return html`
      <div
        class="ticker-item"
        @click=${() => this._handleTap(entityConfig)}
        title="${titleText}"
      >
        ${showIcon
          ? customIcon
            ? html`<ha-icon class="icon" .icon=${customIcon} style="color: ${iconColor};"></ha-icon>`
            : html`<state-badge class="icon" .hass=${this.hass} .stateObj=${stateObj}></state-badge>`
          : ''}
        <span class="name" style="color: ${nameColor};">${name}:</span>
        
        ${unit_position === 'left' ? html`${unitPart}${valuePart}` : html`${valuePart}${unitPart}`}
        
        <span class="separator">${this._config.separator}</span>
      </div>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        overflow: hidden;
        
        border-radius: var(--strip-card-border-radius, 0px);
        height: var(--strip-card-height, 50px);
        width: var(--strip-card-width);
        
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
      }
      .ticker-wrap {
        flex-grow: 1;
        display: flex;
        align-items: center;
        width: 100%;
        overflow: hidden;
        background-color: var(--card-background-color, white);
        padding: 0;
        box-sizing: border-box;
      }
      .ticker-wrap.pausable:hover .ticker-move {
        animation-play-state: paused;
      }
      .ticker-move {
        display: inline-block;
        white-space: nowrap;
        padding-left: 100%;
        will-change: transform;
        transform: translateZ(0);
        animation-name: ticker;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }
      .ticker-item {
        display: inline-flex;
        align-items: center;
        margin: 0 1rem;
        font-size: var(--strip-card-font-size, 14px);
        cursor: pointer;
      }
      .icon {
        margin-right: 0.5em;
      }
      .ticker-item .name {
        font-weight: bold;
        margin-right: 0.5em;
      }
      .ticker-item .value + .unit,
      .ticker-item .unit + .value {
        margin-left: 0.2em;
      }
      .ticker-item .separator {
        margin-left: 1rem;
        color: var(--disabled-text-color);
      }
      .error {
        color: var(--error-color);
        font-weight: bold;
      }
      @keyframes ticker {
        0% { transform: translateX(0); }
        100% { transform: translateX(-100%); }
      }
    `;
  }
}

customElements.define("strip-card", StripCard);
