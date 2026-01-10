const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

console.info(
  `%c STRIP-CARD %c Loaded - Version 2.0.0 (Mushroom-Style) `,
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
        { entity: "sun.sun" },
        { entity: "zone.home" },
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
  }

  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("The 'entities' list must be present in the configuration.");
    }
    this._config = {
      title: "",
      title_alignment: 'left',
      title_font_size: "16px",
      title_left_icon: "",
      title_left_action: "",
      title_right_icon: "",
      title_right_action: "",
      duration: 20,
      separator: "•",
      font_size: "14px",
      show_icon: false,
      pause_on_hover: false,
      border_radius: "0px",
      card_height: "auto",
      card_width: "100%",
      fading: false,
      vertical_scroll: false,
      vertical_alignment: 'stack',
      continuous_scroll: true,
      transparent: false,
      badge_style: false,
      ...config,
    };
  }

  getCardSize() {
    return 1;
  }

  shouldUpdate(changedProps) {
    if (changedProps.has('_config')) {
      return true;
    }
    
    if (changedProps.has('hass')) {
      const oldHass = changedProps.get('hass');
      if (!oldHass) return true;
      
      for (const entityConfig of this._config.entities) {
        const entityId = typeof entityConfig === "string" ? entityConfig : entityConfig.entity;
        if (!entityId) continue;
        
        const oldState = oldHass.states[entityId];
        const newState = this.hass.states[entityId];
        
        if (!oldState || !newState) return true;
        if (oldState.state !== newState.state) return true;
        if (JSON.stringify(oldState.attributes) !== JSON.stringify(newState.attributes)) return true;
      }
      return false;
    }
    
    return true;
  }

  _handleIconClick(action) {
    if (!action) return;
    
    if (action.startsWith('/')) {
      window.history.pushState(null, '', action);
      window.dispatchEvent(new CustomEvent('location-changed'));
      return;
    }
    
    const event = new Event("hass-more-info", { bubbles: true, composed: true });
    event.detail = { entityId: action };
    this.dispatchEvent(event);
  }

  _handleTap(entityConfig) {
    const tapAction = entityConfig.tap_action || { action: 'more-info' };
    const entityId = typeof entityConfig === "string" ? entityConfig : entityConfig.entity;
    
    switch (tapAction.action) {
      case 'more-info':
        const event = new Event("hass-more-info", { bubbles: true, composed: true });
        event.detail = { entityId: tapAction.entity || entityId };
        this.dispatchEvent(event);
        break;
      
      case 'navigate':
        if (tapAction.navigation_path) {
          window.history.pushState(null, '', tapAction.navigation_path);
          window.dispatchEvent(new CustomEvent('location-changed'));
        }
        break;
      
      case 'call-service':
        if (tapAction.service) {
          const [domain, service] = tapAction.service.split(".");
          if (domain && service) {
            this.hass.callService(domain, service, tapAction.service_data || {});
          }
        }
        break;
      
      case 'toggle':
        this.hass.callService('homeassistant', 'toggle', { entity_id: entityId });
        break;
      
      case 'none':
        break;
    }
  }

  evaluateTemplate(template, hass) {
    if (!template || typeof template !== 'string') return template;
    if (!template.includes("{{")) return template;

    try {
      const expression = template.match(/{{(.*?)}}/s)[1];
      const states = (entityId) => {
        const entity = hass.states[entityId];
        return entity ? entity.state : 'unknown';
      };
      const state_attr = (entityId, attr) => {
        const entity = hass.states[entityId];
        return entity && entity.attributes[attr] !== undefined ? entity.attributes[attr] : null;
      };
      const func = new Function("states", "state_attr", `"use strict"; return (${expression.trim()});`);
      return func(states, state_attr);
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
    const chipsClass = this._config.badge_style ? 'has-chips-style' : '';
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
      --strip-card-title-font-size: ${this._config.title_font_size};
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
      <ha-card style="${cardStyles}">
        ${this._config.title ? html`
          <div class="card-header" style="text-align: ${this._config.title_alignment};">
            ${this._config.title_left_icon ? html`
              <ha-icon 
                class="title-icon left"
                .icon=${this._config.title_left_icon}
                @click=${() => this._handleIconClick(this._config.title_left_action)}
                style="cursor: ${this._config.title_left_action ? 'pointer' : 'default'};"
              ></ha-icon>
            ` : ''}
            <span class="title-text">${this._config.title}</span>
            ${this._config.title_right_icon ? html`
              <ha-icon 
                class="title-icon right"
                .icon=${this._config.title_right_icon}
                @click=${() => this._handleIconClick(this._config.title_right_action)}
                style="cursor: ${this._config.title_right_action ? 'pointer' : 'default'};"
              ></ha-icon>
            ` : ''}
          </div>
        ` : ''}
        <div class="ticker-wrap ${this._config.pause_on_hover ? 'pausable' : ''} ${fadingClass} ${verticalClass} ${chipsClass}">
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

    // Evaluate content (main text)
    let content = '';
    if (entityConfig.content) {
      content = this.evaluateTemplate(entityConfig.content, this.hass);
    } else {
      // Fallback to friendly_name + state
      const name = stateObj.attributes.friendly_name || entityId;
      content = `${name}: ${stateObj.state}`;
    }

    // Evaluate label (secondary text)
    const label = entityConfig.label ? this.evaluateTemplate(entityConfig.label, this.hass) : '';

    // Get icon
    let showIcon = entityConfig.icon !== undefined ? entityConfig.icon : (this._config.show_icon ? stateObj.attributes.icon || 'mdi:eye' : null);
    if (showIcon) {
      showIcon = this.evaluateTemplate(showIcon, this.hass);
    }

    // Get color
    const color = entityConfig.color ? this.evaluateTemplate(entityConfig.color, this.hass) : 'var(--primary-text-color)';

    if (this._config.badge_style) {
      return html`
        <div
          class="chip-item"
          @click=${() => this._handleTap(entityConfig)}
          title="${content}${label ? ' - ' + label : ''}"
          style="${color !== 'var(--primary-text-color)' ? `color: ${color};` : ''}"
        >
          ${showIcon ? html`<ha-icon class="chip-icon" .icon=${showIcon}></ha-icon>` : ''}
          <span class="chip-content">${content}</span>
          ${label ? html`<span class="chip-label">${label}</span>` : ''}
        </div>
      `;
    }

    return html`
      <div
        class="ticker-item"
        @click=${() => this._handleTap(entityConfig)}
        title="${content}${label ? ' - ' + label : ''}"
        style="${color !== 'var(--primary-text-color)' ? `color: ${color};` : ''}"
      >
        ${showIcon ? html`<ha-icon class="icon" .icon=${showIcon}></ha-icon>` : ''}
        <span class="content">${content}</span>
        ${label ? html`<span class="label">${label}</span>` : ''}
        <span class="separator">${this._config.separator}</span>
      </div>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        overflow: hidden;
        border-radius: var(--strip-card-border-radius, 0px);
        height: var(--strip-card-height, auto);
        width: var(--strip-card-width, 100%);
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
      }
      .card-header {
        padding: 16px;
        font-size: var(--strip-card-title-font-size, 16px);
        font-weight: 400;
        color: var(--primary-text-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .title-text {
        flex: 1;
      }
      .title-icon {
        --mdc-icon-size: 24px;
        flex-shrink: 0;
        color: var(--primary-text-color);
        transition: color 0.2s;
      }
      .title-icon:hover {
        color: var(--primary-color);
      }
      .title-icon.left {
        order: -1;
      }
      .title-icon.right {
        order: 1;
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
        min-height: 50px;
      }
      .ticker-wrap.has-vertical-scroll {
        flex-direction: column;
        height: var(--strip-card-height, auto);
        overflow: hidden;
      }
      .ticker-wrap.has-chips-style {
        padding: 8px 0;
        min-height: auto;
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
        margin: 0;
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
        margin: 0 1rem;
        color: var(--disabled-text-color);
      }
      .ticker-wrap.has-vertical-scroll .ticker-item .separator {
        margin: 0.5rem 0 0 0;
      }
      .ticker-move.has-inline-vertical-alignment .ticker-item {
        display: inline-flex;
        margin: 0.5rem 1rem;
      }
      .chip-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        margin-right: 8px;
        background: var(--primary-background-color);
        border-radius: 18px;
        cursor: pointer;
        font-size: 13px;
        white-space: nowrap;
        transition: background 0.2s;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
      }
      .chip-item:hover {
        background: var(--secondary-background-color);
      }
      .chip-icon {
        --mdc-icon-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
      .chip-content {
        font-weight: 500;
        flex-shrink: 0;
      }
      .chip-label {
        font-weight: 400;
        opacity: 0.8;
        font-size: 0.9em;
      }
      .icon {
        --mdc-icon-size: 20px;
        margin-right: 0.5em;
      }
      .ticker-item .content {
        font-weight: 500;
      }
      .ticker-item .label {
        font-weight: 400;
        opacity: 0.8;
        margin-left: 0.5em;
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

// Visual Editor
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
      title_alignment: 'left',
      title_font_size: "16px",
      title_left_icon: "",
      title_left_action: "",
      title_right_icon: "",
      title_right_action: "",
      duration: 20,
      separator: "•",
      font_size: "14px",
      show_icon: false,
      pause_on_hover: false,
      border_radius: "0px",
      card_height: "auto",
      card_width: "100%",
      fading: false,
      vertical_scroll: false,
      vertical_alignment: 'stack',
      continuous_scroll: true,
      transparent: false,
      badge_style: false,
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
            Titel
          </button>
          <button 
            class="tab ${this._currentTab === 'scroll' ? 'active' : ''}"
            @click=${() => this._switchTab('scroll')}
          >
            Scroll
          </button>
          <button 
            class="tab ${this._currentTab === 'style' ? 'active' : ''}"
            @click=${() => this._switchTab('style')}
          >
            Stil
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
          ${this._currentTab === 'scroll' ? this._renderScrollTab() : ''}
          ${this._currentTab === 'style' ? this._renderStyleTab() : ''}
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

        ${this._config.title ? html`
          <ha-textfield
            label="Titel-Schriftgröße"
            .value="${this._config.title_font_size}"
            .configValue="${"title_font_size"}"
            @input="${this._valueChanged}"
          ></ha-textfield>

          <ha-select
            label="Titel-Ausrichtung"
            .value="${this._config.title_alignment}"
            .configValue="${"title_alignment"}"
            @selected="${this._selectChanged}"
            @closed="${(e) => e.stopPropagation()}"
          >
            <mwc-list-item value="left">Linksbündig</mwc-list-item>
            <mwc-list-item value="center">Zentriert</mwc-list-item>
            <mwc-list-item value="right">Rechtsbündig</mwc-list-item>
          </ha-select>

          <div class="section-divider">Linkes Icon</div>

          <ha-textfield
            label="Icon links"
            .value="${this._config.title_left_icon || ''}"
            .configValue="${"title_left_icon"}"
            @input="${this._valueChanged}"
          ></ha-textfield>

          ${this._config.title_left_icon ? html`
            <ha-textfield
              label="Aktion links"
              .value="${this._config.title_left_action || ''}"
              .configValue="${"title_left_action"}"
              @input="${this._valueChanged}"
              helper-text="Entity-ID oder /pfad"
            ></ha-textfield>
          ` : ''}

          <div class="section-divider">Rechtes Icon</div>

          <ha-textfield
            label="Icon rechts"
            .value="${this._config.title_right_icon || ''}"
            .configValue="${"title_right_icon"}"
            @input="${this._valueChanged}"
          ></ha-textfield>

          ${this._config.title_right_icon ? html`
            <ha-textfield
              label="Aktion rechts"
              .value="${this._config.title_right_action || ''}"
              .configValue="${"title_right_action"}"
              @input="${this._valueChanged}"
              helper-text="Entity-ID oder /pfad"
            ></ha-textfield>
          ` : ''}
        ` : ''}
      </div>
    `;
  }

  _renderScrollTab() {
    return html`
      <div class="tab-panel">
        <ha-textfield
          label="Scroll-Dauer (Sekunden)"
          type="number"
          .value="${this._config.duration}"
          .configValue="${"duration"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-formfield label="Kontinuierliches Scrollen">
          <ha-switch
            .checked="${this._config.continuous_scroll}"
            .configValue="${"continuous_scroll"}"
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

        <ha-formfield label="Vertikales Scrollen">
          <ha-switch
            .checked="${this._config.vertical_scroll}"
            .configValue="${"vertical_scroll"}"
            @change="${this._switchChanged}"
          ></ha-switch>
        </ha-formfield>

        ${this._config.vertical_scroll ? html`
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
        ` : ''}
      </div>
    `;
  }

  _renderStyleTab() {
    return html`
      <div class="tab-panel">
        <ha-formfield label="Chips-Stil">
          <ha-switch
            .checked="${this._config.badge_style}"
            .configValue="${"badge_style"}"
            @change="${this._switchChanged}"
          ></ha-switch>
        </ha-formfield>

        <ha-formfield label="Icons anzeigen (Standard)">
          <ha-switch
            .checked="${this._config.show_icon}"
            .configValue="${"show_icon"}"
            @change="${this._switchChanged}"
          ></ha-switch>
        </ha-formfield>

        <ha-formfield label="Fading">
          <ha-switch
            .checked="${this._config.fading}"
            .configValue="${"fading"}"
            @change="${this._switchChanged}"
          ></ha-switch>
        </ha-formfield>

        <ha-formfield label="Transparent">
          <ha-switch
            .checked="${this._config.transparent}"
            .configValue="${"transparent"}"
            @change="${this._switchChanged}"
          ></ha-switch>
        </ha-formfield>

        ${!this._config.badge_style ? html`
          <ha-textfield
            label="Trennzeichen"
            .value="${this._config.separator}"
            .configValue="${"separator"}"
            @input="${this._valueChanged}"
          ></ha-textfield>
        ` : ''}

        <ha-textfield
          label="Schriftgröße"
          .value="${this._config.font_size}"
          .configValue="${"font_size"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="Rahmenradius"
          .value="${this._config.border_radius}"
          .configValue="${"border_radius"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="Kartenhöhe"
          .value="${this._config.card_height}"
          .configValue="${"card_height"}"
          @input="${this._valueChanged}"
        ></ha-textfield>

        <ha-textfield
          label="Kartenbreite"
          .value="${this._config.card_width}"
          .configValue="${"card_width"}"
          @input="${this._valueChanged}"
        ></ha-textfield>
      </div>
    `;
  }

  _renderEntitiesTab() {
    const entities = this._config.entities || [];

    return html`
      <div class="tab-panel">
        ${entities.length === 0 ? html`
          <div class="no-entities">
            <p>Keine Entitäten konfiguriert.</p>
          </div>
        ` : ''}
        
        ${entities.map((entity, index) => {
          const entityObj = typeof entity === 'string' ? { entity: entity } : entity;
          const entityId = entityObj.entity || '';
          const entityName = this._getEntityDisplayName(entityObj, entityId);
          const isExpanded = this._selectedEntity === index;
          
          return html`
            <div class="entity-row">
              <div class="entity-header">
                <span @click="${() => this._toggleEntity(index)}">${entityName}</span>
                <div class="entity-controls">
                  ${index > 0 ? html`
                    <ha-icon-button @click="${() => this._moveEntityUp(index)}">
                      <ha-icon icon="mdi:arrow-up"></ha-icon>
                    </ha-icon-button>
                  ` : ''}
                  ${index < entities.length - 1 ? html`
                    <ha-icon-button @click="${() => this._moveEntityDown(index)}">
                      <ha-icon icon="mdi:arrow-down"></ha-icon>
                    </ha-icon-button>
                  ` : ''}
                  <ha-icon-button @click="${() => this._removeEntity(index)}">
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
                    label="Content (Template)"
                    .value="${entityObj.content || ''}"
                    .entityIndex="${index}"
                    .configValue="${"content"}"
                    @input="${this._entityPropertyChanged}"
                    helper-text="z.B: {{ states('sensor.temp') }} °C"
                  ></ha-textfield>

                  <ha-textfield
                    label="Label (Template)"
                    .value="${entityObj.label || ''}"
                    .entityIndex="${index}"
                    .configValue="${"label"}"
                    @input="${this._entityPropertyChanged}"
                    helper-text="Zusätzlicher Text"
                  ></ha-textfield>

                  <ha-textfield
                    label="Icon (optional)"
                    .value="${entityObj.icon || ''}"
                    .entityIndex="${index}"
                    .configValue="${"icon"}"
                    @input="${this._entityPropertyChanged}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Farbe (optional)"
                    .value="${entityObj.color || ''}"
                    .entityIndex="${index}"
                    .configValue="${"color"}"
                    @input="${this._entityPropertyChanged}"
                    helper-text="z.B: red, #ff0000, white"
                  ></ha-textfield>

                  <div class="section-divider">Tap Action</div>

                  <ha-select
                    label="Aktion"
                    .value="${entityObj.tap_action?.action || 'more-info'}"
                    .entityIndex="${index}"
                    .configValue="${"tap_action.action"}"
                    @selected="${this._entitySelectChanged}"
                    @closed="${(e) => e.stopPropagation()}"
                  >
                    <mwc-list-item value="more-info">More Info</mwc-list-item>
                    <mwc-list-item value="toggle">Toggle</mwc-list-item>
                    <mwc-list-item value="navigate">Navigate</mwc-list-item>
                    <mwc-list-item value="call-service">Call Service</mwc-list-item>
                    <mwc-list-item value="none">Keine</mwc-list-item>
                  </ha-select>

                  ${entityObj.tap_action?.action === 'navigate' ? html`
                    <ha-textfield
                      label="Navigation Path"
                      .value="${entityObj.tap_action?.navigation_path || ''}"
                      .entityIndex="${index}"
                      .configValue="${"tap_action.navigation_path"}"
                      @input="${this._entityPropertyChanged}"
                      helper-text="z.B: /lovelace/home"
                    ></ha-textfield>
                  ` : ''}

                  ${entityObj.tap_action?.action === 'call-service' ? html`
                    <ha-textfield
                      label="Service"
                      .value="${entityObj.tap_action?.service || ''}"
                      .entityIndex="${index}"
                      .configValue="${"tap_action.service"}"
                      @input="${this._entityPropertyChanged}"
                      helper-text="z.B: light.turn_on"
                    ></ha-textfield>
                  ` : ''}
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

  _getEntityDisplayName(entity, entityId) {
    if (typeof entity === 'string') {
      return entityId || 'Neue Entität';
    }
    
    if (entity.content) {
      return entity.content.substring(0, 30) + (entity.content.length > 30 ? '...' : '');
    }
    
    if (entityId && this.hass && this.hass.states[entityId]) {
      return this.hass.states[entityId].attributes.friendly_name || entityId;
    }
    
    if (entityId) {
      return entityId;
    }
    
    return 'Neue Entität';
  }

  _toggleEntity(index) {
    this._selectedEntity = this._selectedEntity === index ? null : index;
    this.requestUpdate();
  }

  _addEntity() {
    const entities = [...this._config.entities];
    entities.push({ entity: '', content: '' });
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
    this.requestUpdate();
  }

  _entityPropertyChanged(ev) {
    const index = ev.currentTarget.entityIndex;
    const configValue = ev.currentTarget.configValue;
    const value = ev.currentTarget.value;

    const entities = [...this._config.entities];
    const entity = typeof entities[index] === 'string' ? { entity: entities[index] } : { ...entities[index] };
    
    // Handle nested properties like tap_action.action
    if (configValue.includes('.')) {
      const [parent, child] = configValue.split('.');
      if (!entity[parent]) entity[parent] = {};
      entity[parent][child] = value;
    } else {
      entity[configValue] = value;
    }
    
    entities[index] = entity;
    this._config = { ...this._config, entities };
    this._configChanged();
  }

  _entitySelectChanged(ev) {
    const index = ev.currentTarget.entityIndex;
    const configValue = ev.currentTarget.configValue;
    const value = ev.currentTarget.value;

    const entities = [...this._config.entities];
    const entity = typeof entities[index] === 'string' ? { entity: entities[index] } : { ...entities[index] };
    
    // Handle nested properties
    if (configValue.includes('.')) {
      const [parent, child] = configValue.split('.');
      if (!entity[parent]) entity[parent] = {};
      entity[parent][child] = value;
    } else {
      entity[configValue] = value;
    }
    
    entities[index] = entity;
    this._config = { ...this._config, entities };
    this._configChanged();
    this.requestUpdate();
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    
    const target = ev.currentTarget;
    const configValue = target.configValue;
    const value = target.value;

    if (!configValue) return;
    if (this._config[configValue] === value) return;

    this._config = { ...this._config, [configValue]: value };
    this._configChanged();
  }

  _switchChanged(ev) {
    if (!this._config || !this.hass) return;
    
    const target = ev.currentTarget;
    const configValue = target.configValue;
    const value = target.checked;

    if (!configValue) return;

    this._config = { ...this._config, [configValue]: value };
    this._configChanged();
  }

  _selectChanged(ev) {
    if (!this._config || !this.hass) return;
    
    const target = ev.currentTarget;
    const configValue = target.configValue;
    const value = target.value;

    if (!configValue) return;

    this._config = { ...this._config, [configValue]: value };
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
      
      .section-divider {
        font-weight: 500;
        font-size: 14px;
        color: var(--primary-color);
        margin: 20px 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--divider-color);
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
