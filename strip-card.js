const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

console.info(
  `%c STRIP-CARD %c Loaded - Version 3.1.0 (Per-Entity Icon & Styling) `,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

class StripCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
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
      show_icon: false,
      pause_on_hover: false,
      icon_color: "var(--paper-item-icon-color)",
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
      const event = new Event("hass-more-info", {
        bubbles: true,
        composed: true,
      });
      event.detail = { entityId: entityId };
      this.dispatchEvent(event);
    }
  }

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    const cardStyles = `
      --strip-card-font-size: ${this._config.font_size};
    `;

    return html`
      <ha-card .header="${this._config.title}" style="${cardStyles}">
        <div class="ticker-wrap ${this._config.pause_on_hover ? 'pausable' : ''}">
          <div
            class="ticker-move"
            style="animation-duration: ${this._config.duration}s;"
          >
            ${this._config.entities.map((entityConfig) =>
              this.renderEntity(entityConfig)
            )}
          </div>
        </div>
      </ha-card>
    `;
  }

  renderEntity(entityConfig) {
    const entityId = typeof entityConfig === "string" ? entityConfig : entityConfig.entity;
    const stateObj = this.hass.states[entityId];

    if (!stateObj) {
      return html`
        <div class="ticker-item error">
          Unknown Entity: ${entityId}
        </div>
      `;
    }

    let value = stateObj.state;
    if (entityConfig.attribute && stateObj.attributes[entityConfig.attribute] !== undefined) {
      value = stateObj.attributes[entityConfig.attribute];
    }
    
    if (typeof value === 'string' && value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }

    const name = entityConfig.name || stateObj.attributes.friendly_name;
    const unit = entityConfig.unit !== undefined ? entityConfig.unit : (stateObj.attributes.unit_of_measurement || "");

    const showIcon = entityConfig.show_icon !== undefined ? entityConfig.show_icon : this._config.show_icon;
    const iconColor = entityConfig.icon_color || this._config.icon_color;
    const nameColor = entityConfig.name_color || this._config.name_color;
    const valueColor = entityConfig.value_color || this._config.value_color;
    const unitColor = entityConfig.unit_color || this._config.unit_color;
    const customIcon = entityConfig.icon;

    return html`
      <div 
        class="ticker-item"
        @click=${() => this._handleTap(entityConfig)}
        title="${name}: ${value} ${unit}"
      >
        ${showIcon
          ? customIcon
            ? html`<ha-icon class="icon" .icon=${customIcon} style="color: ${iconColor};"></ha-icon>`
            : html`<ha-state-icon class="icon" .stateObj=${stateObj} style="color: ${iconColor};"></ha-state-icon>`
          : ''}
        <span class="name" style="color: ${nameColor};">${name}:</span>
        <span class="value" style="color: ${valueColor};">${value}</span>
        <span class="unit" style="color: ${unitColor};">${unit}</span>
        <span class="separator">${this._config.separator}</span>
      </div>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        overflow: hidden; 
        padding-bottom: 8px;
      }
      .ticker-wrap {
        width: 100%;
        overflow: hidden;
        background-color: var(--card-background-color, white);
        padding: 12px 0;
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
      .ticker-item .value {
      }
      .ticker-item .unit {
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
        0% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(-100%);
        }
      }
    `;
  }
}

customElements.define("strip-card", StripCard);
