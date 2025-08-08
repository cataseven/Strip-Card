const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

console.info(
  `%c STRIP-CARD %c Loaded - Version 3.12.2 (Gap Fix) `,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "strip-card",
  name: "Strip Card",
  description: "A card that shows entities on a scrolling strip.",
  preview: true,
});

class StripCard extends LitElement {
  // Internal state for managing the number of content copies for seamless scrolling.
  // Not a reactive property to avoid render loops. Updates are handled manually.
  _numCopies = 2;

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
      fading: false,
      vertical_scroll: false,
      vertical_alignment: 'stack',
      continuous_scroll: true,
      ...config,
    };
  }

  /**
   * Measures the container and content width to determine if duplication is needed
   * to prevent gaps in the continuous scroll animation.
   */
  _measureAndDuplicate() {
    // This logic is only for continuous horizontal scrolling.
    if (!this._config.continuous_scroll || this._config.vertical_scroll) {
      return;
    }

    const container = this.shadowRoot.querySelector('.ticker-wrap');
    const content = this.shadowRoot.querySelector('.ticker-move');
    if (!container || !content) return;

    const containerWidth = container.offsetWidth;
    // The width of a single, original set of entities.
    const originalContentWidth = content.scrollWidth / this._numCopies;

    if (originalContentWidth > 0 && containerWidth > originalContentWidth) {
      // If the original content is smaller than the container, calculate how many copies we need.
      // We add one extra copy to ensure there's always content to scroll into view.
      const requiredCopies = Math.ceil(containerWidth / originalContentWidth) + 1;
      // We need at least 2 copies for the CSS animation to work seamlessly.
      const newNumCopies = Math.max(2, requiredCopies);

      if (newNumCopies !== this._numCopies) {
        this._numCopies = newNumCopies;
        this.requestUpdate(); // Request a re-render with the new number of copies.
      }
    } else if (originalContentWidth > 0 && containerWidth <= originalContentWidth && this._numCopies !== 2) {
      // If the content is already wider than the container, we only need 2 copies for the animation.
      this._numCopies = 2;
      this.requestUpdate();
    }
  }
  
  /**
   * LitElement lifecycle method. Called once after the element's first update.
   * Sets up a ResizeObserver to react to changes in the card's size.
   */
  firstUpdated() {
    const observer = new ResizeObserver(() => this._measureAndDuplicate());
    observer.observe(this.shadowRoot.querySelector('.ticker-wrap'));
  }

  /**
   * LitElement lifecycle method. Called after each update.
   * We use it to trigger the measurement logic.
   */
  updated(changedProperties) {
    if (changedProperties.has('_config')) {
      // Reset to default before measuring when the configuration changes.
      this._numCopies = 2;
    }
    this._measureAndDuplicate();
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
    const fadingClass = this._config.fading ? 'has-fading' : '';
    const verticalClass = this._config.vertical_scroll ? 'has-vertical-scroll' : '';
    const verticalAlignmentClass = this._config.vertical_alignment === 'inline' ? 'has-inline-vertical-alignment' : '';
    const animationIteration = this._config.continuous_scroll ? 'infinite' : '1';
    
    const cardStyles = `
      --strip-card-font-size: ${this._config.font_size};
      --strip-card-border-radius: ${this._config.border_radius};
      --strip-card-height: ${this._config.card_height};
      ${cardWidthStyle}
    `;

    const renderedEntities = this._config.entities.map((entityConfig) => this.renderEntity(entityConfig));
    let content = renderedEntities;

    if (this._config.continuous_scroll) {
      // Create as many copies as calculated by _measureAndDuplicate.
      // The `|| 2` is a safeguard for the very first render.
      content = Array(this._numCopies || 2).fill(renderedEntities).flat();
    }
    
    return html`
      <ha-card .header="${this._config.title}" style="${cardStyles}">
        <div class="ticker-wrap ${this._config.pause_on_hover ? 'pausable' : ''} ${fadingClass} ${verticalClass}">
          <div class="ticker-move ${verticalAlignmentClass}" style="animation-duration: ${duration}s; animation-iteration-count: ${animationIteration};">
            ${content}
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
        position: relative;
      }
      .ticker-wrap.has-vertical-scroll {
        flex-direction: column;
        height: var(--strip-card-height, 50px);
        overflow: hidden;
      }
      .ticker-wrap.has-fading {
        -webkit-mask-image: linear-gradient(to right,
          rgba(0, 0, 0, 0) 0%,
          rgba(0, 0, 0, 1) 15%,
          rgba(0, 0, 0, 1) 85%,
          rgba(0, 0, 0, 0) 100%
        );
        mask-image: linear-gradient(to right,
          rgba(0, 0, 0, 0) 0%,
          rgba(0, 0, 0, 1) 15%,
          rgba(0, 0, 0, 1) 85%,
          rgba(0, 0, 0, 0) 100%
        );
      }
      .ticker-wrap.has-vertical-scroll.has-fading {
        -webkit-mask-image: linear-gradient(to bottom,
          rgba(0, 0, 0, 0) 0%,
          rgba(0, 0, 0, 1) 15%,
          rgba(0, 0, 0, 1) 85%,
          rgba(0, 0, 0, 0) 100%
        );
        mask-image: linear-gradient(to bottom,
          rgba(0, 0, 0, 0) 0%,
          rgba(0, 0, 0, 1) 15%,
          rgba(0, 0, 0, 1) 85%,
          rgba(0, 0, 0, 0) 100%
        );
      }
      .ticker-wrap.pausable:hover .ticker-move {
        animation-play-state: paused;
      }
      .ticker-move {
        /*
         * Using 'inline-block' for horizontal layout. The width will be determined
         * by the content, which is duplicated as needed in the component's logic.
         */
        display: inline-block;
        white-space: nowrap;
        will-change: transform;
        transform: translateZ(0); /* Promotes the layer to the GPU for smoother animation */
        animation-name: ticker;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }
      .ticker-move.has-inline-vertical-alignment {
        display: block;
        height: max-content;
        animation-name: vertical-ticker-inline;
      }
      .ticker-wrap.has-vertical-scroll .ticker-move {
        white-space: normal;
        animation-name: vertical-ticker;
        animation-direction: normal;
        animation-fill-mode: forwards;
        display: block;
        height: max-content;
      }
      .ticker-item {
        display: inline-flex;
        align-items: center;
        margin: 0 1rem;
        font-size: var(--strip-card-font-size, 14px);
        cursor: pointer;
      }
      .ticker-wrap.has-vertical-scroll .ticker-item {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 0.5rem 1rem;
        margin: 0;
      }
      .ticker-item .separator {
        margin-left: 1rem;
        color: var(--disabled-text-color);
      }
      .ticker-wrap.has-vertical-scroll .ticker-item .separator {
        margin-left: 0;
        margin-top: 0.5rem;
      }
      .ticker-move.has-inline-vertical-alignment .ticker-item {
        display: inline-flex;
        margin: 0.5rem 1rem;
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
      .error {
        color: var(--error-color);
        font-weight: bold;
      }
      @keyframes ticker {
        0% { transform: translateX(0); }
        /*
         * The animation moves the container by -50% of its own width.
         * Since the JS ensures the container is made of at least two full copies
         * of the content, this creates a seamless loop.
         */
        100% { transform: translateX(-50%); }
      }
      @keyframes vertical-ticker {
        0% { transform: translateY(0); }
        100% { transform: translateY(-50%); }
      }
      @keyframes vertical-ticker-inline {
        0% { transform: translateY(0); }
        100% { transform: translateY(-50%); }
      }
    `;
  }
}

customElements.define("strip-card", StripCard);
