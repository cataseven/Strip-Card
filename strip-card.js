const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

console.info(
  `%c STRIP-CARD %c Loaded - Version 1.6.5 (Entity Click Working!) `,
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

  static getConfigElement() {
    return document.createElement("strip-card-editor");
  }

  constructor() {
    super();
    this._nameReplace = [];
  }

  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("The 'entities' list must be present in the configuration.");
    }
    const nr = config && config.name_replace ? config.name_replace : [];
    this._nameReplace = Array.isArray(nr) ? nr : [nr];
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
      card_width: "400px",
      fading: false,
      vertical_scroll: false,
      vertical_alignment: 'stack',
      continuous_scroll: true,
      transparent: false,
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

  _sanitizeName(name) {
    let out = name || "";
    for (const rule of this._nameReplace || []) {
      if (!rule) continue;
      try {
        if (typeof rule === "string") {
          out = out.replace(new RegExp(rule, "gi"), "");
        } else {
          const pat = rule.pattern || "";
          const flags = rule.flags || "gi";
          const rep = rule.replace || "";
          out = out.replace(new RegExp(pat, flags), rep);
        }
      } catch (e) {
        console.warn("[Strip Card] Invalid name_replace rule:", rule, e);
      }
    }
    return out.trim();
  }

  render() {
    if (!this._config || !this.hass) return html``;

    const duration = this.evaluateTemplate(this._config.duration, this.hass);
    const cardWidthStyle = this._config.card_width ? `--strip-card-width: ${this._config.card_width};` : '';
    const fadingClass = this._config.fading ? 'has-fading' : '';
    const verticalClass = this._config.vertical_scroll ? 'has-vertical-scroll' : '';
    const verticalAlignmentClass = this._config.vertical_alignment === 'inline' ? 'has-inline-vertical-alignment' : '';
    const animationIteration = this._config.continuous_scroll ? 'infinite' : '1';
    
    let transparentStyle = '';
    if (this._config.transparent) {
        transparentStyle = `
            --ha-card-background: transparent;
            --card-background-color: transparent;
            background: transparent;
            box-shadow: none;
            border: none;
        `;
    }

    const cardStyles = `
      --strip-card-font-size: ${this._config.font_size};
      --strip-card-border-radius: ${this._config.border_radius};
      --strip-card-height: ${this._config.card_height};
      ${cardWidthStyle}
      ${transparentStyle} 
    `;

    const renderedEntities = this._config.entities
        .map((entityConfig) => this.renderEntity(entityConfig))
        .filter(Boolean); 
    
    if (renderedEntities.length === 0) return html``;

    let content = renderedEntities;

    if (this._config.continuous_scroll) {
      const containerWidth = this.getBoundingClientRect().width || 400;
      const divisor = (renderedEntities.length * 100) || 100; 
      const minCopies = Math.ceil(containerWidth / divisor) + 2;
      const copies = minCopies > 2 ? minCopies : 2;
      content = [];
      for (let i = 0; i < copies; i++) {
        content.push(...renderedEntities);
      }
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
    
    if (entityConfig.visible_if) {
        let isVisible = this.evaluateTemplate(entityConfig.visible_if, this.hass);
        if (String(isVisible).toLowerCase() === 'false') {
            isVisible = false;
        }
        if (!isVisible) {
            return null;
        }
    }

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

    const rawName = stateObj.attributes.friendly_name || entityId;
    const name = entityConfig.name ? entityConfig.name : this._sanitizeName(rawName);
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
        display: inline-block;
        white-space: nowrap;
        will-change: transform;
        transform: translateZ(0);
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

// Visual Editor with Persistent Tabs
class StripCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
      _selectedEntity: { type: Number },
      _currentTab: { type: String }
    };
  }

  constructor() {
    super();
    this._currentTab = 'general';
    this._selectedEntity = null;
  }

  setConfig(config) {
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
      card_width: "400px",
      fading: false,
      vertical_scroll: false,
      vertical_alignment: 'stack',
      continuous_scroll: true,
      transparent: false,
      ...config,
      entities: config.entities || []
    };
  }

  render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div class="tabs">
          <button 
            class="tab ${this._currentTab === 'general' ? 'active' : ''}"
            @click=${() => this._switchTab('general')}
          >
            Allgemein
          </button>
          <button 
            class="tab ${this._currentTab === 'appearance' ? 'active' : ''}"
            @click=${() => this._switchTab('appearance')}
          >
            Aussehen
          </button>
          <button 
            class="tab ${this._currentTab === 'colors' ? 'active' : ''}"
            @click=${() => this._switchTab('colors')}
          >
            Farben
          </button>
          <button 
            class="tab ${this._currentTab === 'options' ? 'active' : ''}"
            @click=${() => this._switchTab('options')}
          >
            Optionen
          </button>
          <button 
            class="tab ${this._currentTab === 'entities' ? 'active' : ''}"
            @click=${() => this._switchTab('entities')}
          >
            Entitäten (${this._config.entities.length})
          </button>
        </div>

        <div class="tab-content">
          ${this._currentTab === 'general' ? this._renderGeneralTab() : ''}
          ${this._currentTab === 'appearance' ? this._renderAppearanceTab() : ''}
          ${this._currentTab === 'colors' ? this._renderColorsTab() : ''}
          ${this._currentTab === 'options' ? this._renderOptionsTab() : ''}
          ${this._currentTab === 'entities' ? this._renderEntitiesTab() : ''}
        </div>
      </div>
    `;
  }

  _switchTab(tab) {
    this._currentTab = tab;
    this.requestUpdate();
  }

  _renderGeneralTab() {
    return html`
      <div class="tab-panel">
        <ha-textfield
          label="Titel (optional)"
          .value="${this._config.title || ''}"
          .configValue="${"title"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="Scroll-Dauer (Sekunden)"
          type="number"
          .value="${this._config.duration}"
          .configValue="${"duration"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="Trennzeichen"
          .value="${this._config.separator}"
          .configValue="${"separator"}"
          @input="${this._valueChanged}"
        ></ha-textfield>
      </div>
    `;
  }

  _renderAppearanceTab() {
    return html`
      <div class="tab-panel">
        <ha-textfield
          label="Schriftgröße (z.B. 14px, 1rem)"
          .value="${this._config.font_size}"
          .configValue="${"font_size"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="Rahmenradius (z.B. 0px, 8px)"
          .value="${this._config.border_radius}"
          .configValue="${"border_radius"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="Kartenhöhe (z.B. 50px)"
          .value="${this._config.card_height}"
          .configValue="${"card_height"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="Kartenbreite (z.B. 400px, 100%)"
          .value="${this._config.card_width}"
          .configValue="${"card_width"}"
          @input="${this._valueChanged}"
        ></ha-textfield>
      </div>
    `;
  }

  _renderColorsTab() {
    return html`
      <div class="tab-panel">
        <ha-textfield
          label="Namen-Farbe (z.B. #ff0000, var(--primary-text-color))"
          .value="${this._config.name_color}"
          .configValue="${"name_color"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="Wert-Farbe"
          .value="${this._config.value_color}"
          .configValue="${"value_color"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="Einheit-Farbe"
          .value="${this._config.unit_color}"
          .configValue="${"unit_color"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="Icon-Farbe"
          .value="${this._config.icon_color}"
          .configValue="${"icon_color"}"
          @input="${this._valueChanged}"
        ></ha-textfield>
      </div>
    `;
  }

  _renderOptionsTab() {
    return html`
      <div class="tab-panel">
        <ha-formfield label="Icons anzeigen">
          <ha-switch
            .checked="${this._config.show_icon}"
            .configValue="${"show_icon"}"
            @change="${this._switchChanged}"
          ></ha-switch>
        </ha-formfield>

        <ha-formfield label="Bei Hover pausieren">
          <ha-switch
            .checked="${this._config.pause_on_hover}"
            .configValue="${"pause_on_hover"}"
            @change="${this._switchChanged}"
          ></ha-switch>
        </ha-formfield>

        <ha-formfield label="Ausblenden (Fading)">
          <ha-switch
            .checked="${this._config.fading}"
            .configValue="${"fading"}"
            @change="${this._switchChanged}"
          ></ha-switch>
        </ha-formfield>

        <ha-formfield label="Vertikales Scrollen">
          <ha-switch
            .checked="${this._config.vertical_scroll}"
            .configValue="${"vertical_scroll"}"
            @change="${this._switchChanged}"
          ></ha-switch>
        </ha-formfield>

        <ha-formfield label="Kontinuierliches Scrollen">
          <ha-switch
            .checked="${this._config.continuous_scroll}"
            .configValue="${"continuous_scroll"}"
            @change="${this._switchChanged}"
          ></ha-switch>
        </ha-formfield>

        <ha-formfield label="Transparenter Hintergrund">
          <ha-switch
            .checked="${this._config.transparent}"
            .configValue="${"transparent"}"
            @change="${this._switchChanged}"
          ></ha-switch>
        </ha-formfield>

        <ha-select
          label="Einheit-Position"
          .value="${this._config.unit_position}"
          .configValue="${"unit_position"}"
          @selected="${this._selectChanged}"
          @closed="${(e) => e.stopPropagation()}"
        >
          <mwc-list-item value="left">Links</mwc-list-item>
          <mwc-list-item value="right">Rechts</mwc-list-item>
        </ha-select>

        <ha-select
          label="Vertikale Ausrichtung"
          .value="${this._config.vertical_alignment}"
          .configValue="${"vertical_alignment"}"
          @selected="${this._selectChanged}"
          @closed="${(e) => e.stopPropagation()}"
        >
          <mwc-list-item value="stack">Gestapelt</mwc-list-item>
          <mwc-list-item value="inline">Inline</mwc-list-item>
        </ha-select>
      </div>
    `;
  }

  _renderEntitiesTab() {
    const entities = this._config.entities || [];

    return html`
      <div class="tab-panel">
        ${entities.length === 0 ? html`
          <div class="no-entities">
            <p>Keine Entitäten konfiguriert. Füge eine Entität hinzu, um zu beginnen.</p>
          </div>
        ` : ''}
        
        ${entities.map((entity, index) => {
          const entityId = typeof entity === 'string' ? entity : entity.entity;
          const entityName = typeof entity === 'string' ? entityId : (entity.name || entityId);
          const isExpanded = this._selectedEntity === index;
          
          return html`
            <div class="entity-row">
              <div class="entity-header">
                <span @click="${() => this._toggleEntity(index)}">${entityName || 'Neue Entität'}</span>
                <div class="entity-controls">
                  ${index > 0 ? html`
                    <ha-icon-button
                      @click="${() => this._moveEntityUp(index)}"
                    >
                      <ha-icon icon="mdi:arrow-up"></ha-icon>
                    </ha-icon-button>
                  ` : ''}
                  ${index < entities.length - 1 ? html`
                    <ha-icon-button
                      @click="${() => this._moveEntityDown(index)}"
                    >
                      <ha-icon icon="mdi:arrow-down"></ha-icon>
                    </ha-icon-button>
                  ` : ''}
                  <ha-icon-button
                    @click="${() => this._removeEntity(index)}"
                  >
                    <ha-icon icon="mdi:delete"></ha-icon>
                  </ha-icon-button>
                </div>
              </div>
              
              ${isExpanded ? html`
                <div class="entity-editor">
                  <ha-entity-picker
                    .hass="${this.hass}"
                    .value="${entityId}"
                    .entityIndex="${index}"
                    @value-changed="${this._entityChanged}"
                    allow-custom-entity
                  ></ha-entity-picker>

                  <ha-textfield
                    label="Name (optional)"
                    .value="${entity.name || ''}"
                    .entityIndex="${index}"
                    .configValue="${"name"}"
                    @input="${this._entityPropertyChanged}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Icon (optional, z.B. mdi:home)"
                    .value="${entity.icon || ''}"
                    .entityIndex="${index}"
                    .configValue="${"icon"}"
                    @input="${this._entityPropertyChanged}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Attribut (optional)"
                    .value="${entity.attribute || ''}"
                    .entityIndex="${index}"
                    .configValue="${"attribute"}"
                    @input="${this._entityPropertyChanged}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Einheit (optional)"
                    .value="${entity.unit || ''}"
                    .entityIndex="${index}"
                    .configValue="${"unit"}"
                    @input="${this._entityPropertyChanged}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Value Template (optional)"
                    .value="${entity.value_template || ''}"
                    .entityIndex="${index}"
                    .configValue="${"value_template"}"
                    @input="${this._entityPropertyChanged}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Visible If Template (optional)"
                    .value="${entity.visible_if || ''}"
                    .entityIndex="${index}"
                    .configValue="${"visible_if"}"
                    @input="${this._entityPropertyChanged}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Namen-Farbe (optional)"
                    .value="${entity.name_color || ''}"
                    .entityIndex="${index}"
                    .configValue="${"name_color"}"
                    @input="${this._entityPropertyChanged}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Wert-Farbe (optional)"
                    .value="${entity.value_color || ''}"
                    .entityIndex="${index}"
                    .configValue="${"value_color"}"
                    @input="${this._entityPropertyChanged}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Einheit-Farbe (optional)"
                    .value="${entity.unit_color || ''}"
                    .entityIndex="${index}"
                    .configValue="${"unit_color"}"
                    @input="${this._entityPropertyChanged}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Icon-Farbe (optional)"
                    .value="${entity.icon_color || ''}"
                    .entityIndex="${index}"
                    .configValue="${"icon_color"}"
                    @input="${this._entityPropertyChanged}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Service (optional, z.B. light.turn_on)"
                    .value="${entity.service || ''}"
                    .entityIndex="${index}"
                    .configValue="${"service"}"
                    @input="${this._entityPropertyChanged}"
                  ></ha-textfield>

                  <ha-select
                    label="Einheit-Position (überschreibt global)"
                    .value="${entity.unit_position || ''}"
                    .entityIndex="${index}"
                    .configValue="${"unit_position"}"
                    @selected="${this._entitySelectChanged}"
                    @closed="${(e) => e.stopPropagation()}"
                  >
                    <mwc-list-item value="">Standard</mwc-list-item>
                    <mwc-list-item value="left">Links</mwc-list-item>
                    <mwc-list-item value="right">Rechts</mwc-list-item>
                  </ha-select>

                  <ha-formfield label="Icon anzeigen (überschreibt global)">
                    <ha-switch
                      .checked="${entity.show_icon !== undefined ? entity.show_icon : false}"
                      .indeterminate="${entity.show_icon === undefined}"
                      .entityIndex="${index}"
                      .configValue="${"show_icon"}"
                      @change="${this._entitySwitchChanged}"
                    ></ha-switch>
                  </ha-formfield>
                </div>
              ` : ''}
            </div>
          `;
        })}

        <mwc-button raised @click="${this._addEntity}">
          Entität hinzufügen
        </mwc-button>
      </div>
    `;
  }

  _toggleEntity(index) {
    this._selectedEntity = this._selectedEntity === index ? null : index;
    this.requestUpdate();
  }

  _addEntity() {
    const entities = [...this._config.entities];
    entities.push({ entity: "" });
    this._config = { ...this._config, entities };
    this._selectedEntity = entities.length - 1;
    this._configChanged();
  }

  _removeEntity(index) {
    const entities = [...this._config.entities];
    entities.splice(index, 1);
    this._config = { ...this._config, entities };
    if (this._selectedEntity === index) {
      this._selectedEntity = null;
    } else if (this._selectedEntity > index) {
      this._selectedEntity--;
    }
    this._configChanged();
  }

  _moveEntityUp(index) {
    if (index === 0) return;
    const entities = [...this._config.entities];
    [entities[index - 1], entities[index]] = [entities[index], entities[index - 1]];
    this._config = { ...this._config, entities };
    if (this._selectedEntity === index) {
      this._selectedEntity = index - 1;
    } else if (this._selectedEntity === index - 1) {
      this._selectedEntity = index;
    }
    this._configChanged();
  }

  _moveEntityDown(index) {
    const entities = [...this._config.entities];
    if (index >= entities.length - 1) return;
    [entities[index], entities[index + 1]] = [entities[index + 1], entities[index]];
    this._config = { ...this._config, entities };
    if (this._selectedEntity === index) {
      this._selectedEntity = index + 1;
    } else if (this._selectedEntity === index + 1) {
      this._selectedEntity = index;
    }
    this._configChanged();
  }

  _entityChanged(ev) {
    const index = ev.currentTarget.entityIndex;
    const newEntityId = ev.detail.value;
    const entities = [...this._config.entities];
    
    if (typeof entities[index] === 'string') {
      entities[index] = { entity: newEntityId };
    } else {
      entities[index] = { ...entities[index], entity: newEntityId };
    }
    
    this._config = { ...this._config, entities };
    this._configChanged();
  }

  _entityPropertyChanged(ev) {
    const index = ev.currentTarget.entityIndex;
    const configValue = ev.currentTarget.configValue;
    const value = ev.currentTarget.value;

    const entities = [...this._config.entities];
    
    if (typeof entities[index] === 'string') {
      entities[index] = { entity: entities[index], [configValue]: value };
    } else {
      entities[index] = { ...entities[index], [configValue]: value };
    }
    
    this._config = { ...this._config, entities };
    this._configChanged();
  }

  _entitySelectChanged(ev) {
    const index = ev.currentTarget.entityIndex;
    const configValue = ev.currentTarget.configValue;
    const value = ev.currentTarget.value;

    const entities = [...this._config.entities];
    
    if (typeof entities[index] === 'string') {
      entities[index] = { entity: entities[index], [configValue]: value };
    } else {
      entities[index] = { ...entities[index], [configValue]: value };
    }
    
    this._config = { ...this._config, entities };
    this._configChanged();
  }

  _entitySwitchChanged(ev) {
    const index = ev.currentTarget.entityIndex;
    const configValue = ev.currentTarget.configValue;
    const value = ev.currentTarget.checked;

    const entities = [...this._config.entities];
    
    if (typeof entities[index] === 'string') {
      entities[index] = { entity: entities[index], [configValue]: value };
    } else {
      entities[index] = { ...entities[index], [configValue]: value };
    }
    
    this._config = { ...this._config, entities };
    this._configChanged();
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    
    const target = ev.currentTarget;
    const configValue = target.configValue;
    const value = target.value;

    if (!configValue) {
      return;
    }

    if (this._config[configValue] === value) {
      return;
    }

    this._config = {
      ...this._config,
      [configValue]: value,
    };

    this._configChanged();
  }

  _switchChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    
    const target = ev.currentTarget;
    const configValue = target.configValue;
    const value = target.checked;

    if (!configValue) {
      return;
    }

    this._config = {
      ...this._config,
      [configValue]: value,
    };

    this._configChanged();
  }

  _selectChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    
    const target = ev.currentTarget;
    const configValue = target.configValue;
    const value = target.value;

    if (!configValue) {
      return;
    }

    this._config = {
      ...this._config,
      [configValue]: value,
    };

    this._configChanged();
  }

  _configChanged() {
    const event = new Event("config-changed", {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: this._config };
    this.dispatchEvent(event);
  }

  static get styles() {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
      }
      
      .tabs {
        display: flex;
        flex-wrap: nowrap;
        border-bottom: 2px solid var(--divider-color);
        background: var(--card-background-color);
        overflow: hidden;
      }

      .tab {
        padding: 12px 16px;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        cursor: pointer;
        font-size: 14px;
        color: var(--primary-text-color);
        transition: all 0.2s;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .tab:hover {
        background: var(--secondary-background-color);
      }

      .tab.active {
        border-bottom-color: var(--primary-color);
        color: var(--primary-color);
        font-weight: 500;
      }

      .tab-content {
        flex: 1;
        overflow-y: auto;
      }

      .tab-panel {
        padding: 16px;
      }
      
      ha-textfield,
      ha-select {
        width: 100%;
        margin-bottom: 12px;
        display: block;
      }
      
      ha-formfield {
        display: block;
        margin: 12px 0;
        padding: 8px 0;
      }
      
      .no-entities {
        text-align: center;
        padding: 24px;
        color: var(--secondary-text-color);
      }
      
      .entity-row {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        margin: 12px 0;
        overflow: hidden;
        background: var(--card-background-color);
      }
      
      .entity-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--secondary-background-color);
        user-select: none;
        font-weight: 500;
      }

      .entity-header span {
        flex: 1;
        cursor: pointer;
      }
      
      .entity-header:hover span {
        color: var(--primary-color);
      }
      
      .entity-controls {
        display: flex;
        gap: 4px;
      }
      
      .entity-editor {
        padding: 16px;
        border-top: 1px solid var(--divider-color);
      }
      
      mwc-button {
        margin-top: 16px;
        width: 100%;
      }

      ha-icon {
        color: var(--primary-text-color);
      }
    `;
  }
}

customElements.define("strip-card", StripCard);
customElements.define("strip-card-editor", StripCardEditor);
