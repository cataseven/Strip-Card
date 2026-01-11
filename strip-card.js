const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

console.info(
  `%c STRIP-CARD %c v2.4.8 `,
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

  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("The 'entities' list must be present in the configuration.");
    }
    this._config = {
      title: "",
      title_font_size: "16px",
      title_alignment: "left",
      title_left_icon: "",
      title_left_icon_size: "24px",
      title_left_action: "",
      title_right_icon: "",
      title_right_icon_size: "24px",
      title_right_action: "",
      duration: 20,
      pause_duration: 2,
      separator: "•",
      font_size: "14px",
      content_color: "var(--primary-text-color)",
      label_color: "var(--secondary-text-color)",
      chip_background: "var(--primary-background-color)",
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

  connectedCallback() {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => {
      if (!this._config.continuous_scroll) {
        this._setupReturnAnimation();
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  firstUpdated() {
    if (!this._config.continuous_scroll) {
      this._setupReturnAnimation();
    }
    if (this._resizeObserver) {
      this._resizeObserver.observe(this);
    }
  }

  updated(changedProps) {
    if (changedProps.has('_config') && !this._config.continuous_scroll) {
      requestAnimationFrame(() => this._setupReturnAnimation());
    }
  }

  _setupReturnAnimation() {
    const wrapElement = this.shadowRoot.querySelector('.ticker-wrap');
    const moveElement = this.shadowRoot.querySelector('.ticker-move');
    
    if (!wrapElement || !moveElement) return;
    
    const wrapWidth = wrapElement.offsetWidth;
    const contentWidth = moveElement.scrollWidth;
    
    if (contentWidth <= wrapWidth) {
      moveElement.style.animation = 'none';
      return;
    }
    
    const scrollDistance = Math.max(0, contentWidth - wrapWidth);
    const duration = parseFloat(this.evaluateTemplate(this._config.duration, this.hass));
    const pauseDuration = parseFloat(this.evaluateTemplate(this._config.pause_duration, this.hass));
    
    this._injectReturnAnimation(scrollDistance, duration, pauseDuration, this._config.vertical_scroll);
  }

  shouldUpdate(changedProps) {
    if (changedProps.has('_config')) return true;
    
    if (changedProps.has('hass')) {
      const oldHass = changedProps.get('hass');
      if (!oldHass) return true;
      
      const hasEntityChanges = this._config.entities.some(entityConfig => {
        const entityId = typeof entityConfig === "string" ? entityConfig : entityConfig.entity;
        if (!entityId) return false;
        
        const oldState = oldHass.states[entityId];
        const newState = this.hass.states[entityId];
        
        if (!oldState || !newState) return true;
        return oldState.state !== newState.state || 
               JSON.stringify(oldState.attributes) !== JSON.stringify(newState.attributes);
      });
      
      const hasVisibilityChanges = this._config.entities.some(entityConfig => {
        if (!entityConfig.visibility || !Array.isArray(entityConfig.visibility)) return false;
        
        return entityConfig.visibility.some(condition => {
          if (condition.condition === 'state' && condition.entity) {
            const oldState = oldHass.states[condition.entity];
            const newState = this.hass.states[condition.entity];
            
            if (!oldState || !newState) return true;
            return oldState.state !== newState.state;
          }
          return false;
        });
      });
      
      return hasEntityChanges || hasVisibilityChanges;
    }
    
    return true;
  }

  _checkVisibility(entityConfig) {
    if (!entityConfig.visibility || !Array.isArray(entityConfig.visibility)) return true;
    
    return entityConfig.visibility.every(condition => {
      if (condition.condition === 'state') {
        const entity = condition.entity;
        const stateObj = this.hass.states[entity];
        if (!stateObj) return false;
        
        if (condition.state !== undefined && condition.state !== '') {
          return stateObj.state === condition.state;
        }
        if (condition.state_not !== undefined && condition.state_not !== '') {
          return stateObj.state !== condition.state_not;
        }
      }
      return true;
    });
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
    }
  }

  evaluateTemplate(template, hass) {
    if (!template || typeof template !== 'string' || !template.includes("{{")) return template;

    try {
      const expression = template.match(/{{(.*?)}}/s)[1];
      const states = (entityId) => hass.states[entityId]?.state || 'unknown';
      const state_attr = (entityId, attr) => hass.states[entityId]?.attributes[attr] ?? null;
      const func = new Function("states", "state_attr", `"use strict"; return (${expression.trim()});`);
      return func(states, state_attr);
    } catch (e) {
      console.warn("Template evaluation failed:", e, template);
      return template;
    }
  }

  _injectReturnAnimation(scrollDistance, duration, pauseDuration, isVertical) {
    const totalDuration = duration + pauseDuration + duration + pauseDuration;
    
    const afterScrollPercent = (duration / totalDuration * 100).toFixed(2);
    const afterFirstPausePercent = ((duration + pauseDuration) / totalDuration * 100).toFixed(2);
    const afterReturnPercent = ((duration + pauseDuration + duration) / totalDuration * 100).toFixed(2);
    
    const animationName = `ticker-return-${isVertical ? 'v' : 'h'}-${Date.now()}`;
    const transform = isVertical ? 'translateY' : 'translateX';
    
    const styleId = 'strip-card-return-animation';
    let styleElement = this.shadowRoot.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      this.shadowRoot.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      @keyframes ${animationName} {
        0% { transform: ${transform}(0); }
        ${afterScrollPercent}% { transform: ${transform}(-${scrollDistance}px); }
        ${afterFirstPausePercent}% { transform: ${transform}(-${scrollDistance}px); }
        ${afterReturnPercent}% { transform: ${transform}(0); }
        100% { transform: ${transform}(0); }
      }
    `;
    
    const moveElement = this.shadowRoot.querySelector('.ticker-move');
    if (moveElement) {
      moveElement.style.animation = `${animationName} ${totalDuration}s linear infinite`;
    }
  }

  render() {
    if (!this._config || !this.hass) return html``;

    const duration = this.evaluateTemplate(this._config.duration, this.hass);
    
    const cardStyles = `
      --strip-card-font-size: ${this._config.font_size};
      --strip-card-border-radius: ${this._config.border_radius};
      --strip-card-height: ${this._config.card_height};
      --strip-card-content-color: ${this._config.content_color};
      --strip-card-label-color: ${this._config.label_color};
      --strip-card-chip-background: ${this._config.chip_background};
      --strip-card-title-font-size: ${this._config.title_font_size};
      --strip-card-title-alignment: ${this._config.title_alignment};
      ${this._config.card_width ? `--strip-card-width: ${this._config.card_width};` : ''}
      ${this._config.transparent ? `
        --ha-card-background: transparent;
        --card-background-color: transparent;
        background: transparent;
        box-shadow: none;
        border: none;` : ''}
    `;

    const renderedEntities = this._config.entities
        .filter(entityConfig => this._checkVisibility(entityConfig))
        .map((entityConfig) => this.renderEntity(entityConfig))
        .filter(Boolean);
    
    if (renderedEntities.length === 0) return html``;

    let content = renderedEntities;

    if (this._config.continuous_scroll) {
      const containerWidth = this.getBoundingClientRect().width || 400;
      const divisor = (renderedEntities.length * 100) || 100;
      const minCopies = Math.ceil(containerWidth / divisor) + 2;
      const copies = Math.max(minCopies, 2);
      content = [];
      for (let i = 0; i < copies; i++) {
        content.push(...renderedEntities);
      }
    }
    
    const wrapClasses = [
      this._config.pause_on_hover && 'pausable',
      this._config.fading && this._config.continuous_scroll && 'has-fading',
      this._config.vertical_scroll && 'has-vertical-scroll',
      this._config.badge_style && 'has-chips-style'
    ].filter(Boolean).join(' ');
    
    const moveClasses = [
      this._config.vertical_alignment === 'inline' && 'has-inline-vertical-alignment'
    ].filter(Boolean).join(' ');
    
    let animationStyle = '';
    if (this._config.continuous_scroll) {
      const animationName = this._config.vertical_scroll ? 'ticker-vertical' : 'ticker';
      animationStyle = `animation: ${animationName} ${duration}s linear infinite;`;
    }
    
    return html`
      <ha-card style="${cardStyles}">
        ${this._config.title ? html`
          <div class="card-header">
            ${this._config.title_left_icon ? html`
              <ha-icon 
                class="title-icon left"
                .icon=${this._config.title_left_icon}
                @click=${() => this._handleIconClick(this._config.title_left_action)}
                style="--mdc-icon-size: ${this._config.title_left_icon_size}; cursor: ${this._config.title_left_action ? 'pointer' : 'default'};"
              ></ha-icon>
            ` : ''}
            <ha-markdown class="title-text" .content="${this._config.title}" breaks></ha-markdown>
            ${this._config.title_right_icon ? html`
              <ha-icon 
                class="title-icon right"
                .icon=${this._config.title_right_icon}
                @click=${() => this._handleIconClick(this._config.title_right_action)}
                style="--mdc-icon-size: ${this._config.title_right_icon_size}; cursor: ${this._config.title_right_action ? 'pointer' : 'default'};"
              ></ha-icon>
            ` : ''}
          </div>
        ` : ''}
        <div class="ticker-wrap ${wrapClasses}">
          <div class="ticker-move ${moveClasses}" style="${animationStyle}">
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

    let content = entityConfig.content 
      ? this.evaluateTemplate(entityConfig.content, this.hass)
      : `${stateObj.attributes.friendly_name || entityId}: ${stateObj.state}`;

    const label = entityConfig.label ? this.evaluateTemplate(entityConfig.label, this.hass) : '';
    
    let showIcon = entityConfig.icon !== undefined 
      ? entityConfig.icon 
      : (this._config.show_icon ? stateObj.attributes.icon || 'mdi:eye' : null);
    
    if (showIcon) showIcon = this.evaluateTemplate(showIcon, this.hass);

    const iconColor = entityConfig.color ? this.evaluateTemplate(entityConfig.color, this.hass) : null;
    const labelColor = entityConfig.label_color ? this.evaluateTemplate(entityConfig.label_color, this.hass) : 'var(--strip-card-label-color)';
    const contentColor = entityConfig.content_color ? this.evaluateTemplate(entityConfig.content_color, this.hass) : 'var(--strip-card-content-color)';

    if (this._config.badge_style) {
      return html`
        <div
          class="chip-item ${label ? 'has-label' : ''}"
          @click=${() => this._handleTap(entityConfig)}
          title="${content}${label ? ' - ' + label : ''}"
        >
          ${showIcon ? html`<ha-icon class="chip-icon" .icon=${showIcon} style="${iconColor ? `color: ${iconColor};` : ''}"></ha-icon>` : ''}
          <div class="chip-text">
            ${label ? html`<span class="chip-label" style="color: ${labelColor};">${label}</span>` : ''}
            <span class="chip-content" style="color: ${contentColor};">${content}</span>
          </div>
        </div>
      `;
    }

    return html`
      <div
        class="ticker-item"
        @click=${() => this._handleTap(entityConfig)}
        title="${content}${label ? ' - ' + label : ''}"
      >
        ${showIcon ? html`<ha-icon class="icon" .icon=${showIcon} style="${iconColor ? `color: ${iconColor};` : ''}"></ha-icon>` : ''}
        <span class="content" style="color: ${contentColor};">${content}</span>
        ${label ? html`<span class="label" style="color: ${labelColor};">${label}</span>` : ''}
        <span class="separator">${this._config.separator}</span>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        position: relative;
      }
      ha-card {
        overflow: hidden;
        border-radius: var(--strip-card-border-radius, 0px);
        height: var(--strip-card-height, auto);
        width: var(--strip-card-width, 100%);
        display: flex;
        flex-direction: column;
        position: relative;
        left: 50%;
        transform: translateX(-50%);
      }
      .card-header {
        padding: 16px;
        font-size: 16px;
        font-weight: 400;
        color: var(--primary-text-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .title-text {
        flex: 1;
        font-size: var(--strip-card-title-font-size, 16px);
        text-align: var(--strip-card-title-alignment, left);
      }
      .title-text p {
        margin: 0;
      }
      .title-icon {
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
        flex: 1;
        display: flex;
        align-items: center;
        width: 100%;
        overflow: hidden;
        background-color: var(--card-background-color, white);
        position: relative;
        min-height: 50px;
      }
      .ticker-wrap.has-vertical-scroll {
        flex-direction: column;
        height: var(--strip-card-height, auto);
      }
      .ticker-wrap.has-chips-style {
        padding: 8px 0;
        min-height: auto;
      }
      .ticker-wrap.has-fading {
        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
        mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
      }
      .ticker-wrap.has-vertical-scroll.has-fading {
        -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
        mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
      }
      .ticker-wrap.pausable .ticker-move {
        animation-play-state: running;
      }
      .ticker-wrap.pausable:hover .ticker-move {
        animation-play-state: paused !important;
      }
      .ticker-move {
        display: inline-block;
        white-space: nowrap;
        will-change: transform;
      }
      .ticker-move.has-inline-vertical-alignment {
        display: block;
        height: max-content;
      }
      .ticker-wrap.has-vertical-scroll .ticker-move {
        white-space: normal;
        display: block;
        height: max-content;
      }
      .ticker-item {
        display: inline-flex;
        align-items: center;
        font-size: var(--strip-card-font-size, 14px);
        cursor: pointer;
      }
      .ticker-wrap.has-vertical-scroll .ticker-item {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 0.5rem 1rem;
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
        padding: 3px 8px;
        margin-right: 8px;
        min-height: 28px;
        max-height: 28px;
        background: var(--strip-card-chip-background);
        border-radius: 14px;
        cursor: pointer;
        font-size: 12px;
        white-space: nowrap;
        transition: background 0.2s;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        box-sizing: border-box;
        vertical-align: middle;
      }
      .chip-item:hover {
        background: var(--secondary-background-color);
      }
      .chip-icon {
        --mdc-icon-size: 16px;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chip-text {
        display: flex;
        flex-direction: column;
        gap: 1px;
        align-items: flex-start;
        justify-content: center;
        line-height: 1;
      }
      .chip-item:not(.has-label) .chip-text {
        flex-direction: row;
        align-items: center;
      }
      .chip-label {
        font-size: 9px;
        font-weight: 400;
        opacity: 0.8;
        line-height: 1;
        color: var(--strip-card-label-color);
      }
      .chip-content {
        font-weight: 600;
        line-height: 1;
        color: var(--strip-card-content-color);
      }
      .icon {
        --mdc-icon-size: 20px;
        margin-right: 0.5em;
      }
      .ticker-item .content {
        font-weight: 500;
        color: var(--strip-card-content-color);
      }
      .ticker-item .label {
        font-weight: 400;
        opacity: 0.8;
        margin-left: 0.5em;
        color: var(--strip-card-label-color);
      }
      .error {
        color: var(--error-color);
        font-weight: bold;
      }
      @keyframes ticker {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      @keyframes ticker-vertical {
        0% { transform: translateY(0); }
        100% { transform: translateY(-50%); }
      }
    `;
  }
}

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
      title_font_size: "16px",
      title_alignment: "left",
      title_left_icon: "",
      title_left_icon_size: "24px",
      title_left_action: "",
      title_right_icon: "",
      title_right_icon_size: "24px",
      title_right_action: "",
      duration: 20,
      pause_duration: 2,
      separator: "•",
      font_size: "14px",
      content_color: "var(--primary-text-color)",
      label_color: "var(--secondary-text-color)",
      chip_background: "var(--primary-background-color)",
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
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        <div class="tabs">
          <button class="tab ${this._currentTab === 'general' ? 'active' : ''}" @click=${() => this._switchTab('general')}>Titel</button>
          <button class="tab ${this._currentTab === 'scroll' ? 'active' : ''}" @click=${() => this._switchTab('scroll')}>Scroll</button>
          <button class="tab ${this._currentTab === 'style' ? 'active' : ''}" @click=${() => this._switchTab('style')}>Stil</button>
          <button class="tab ${this._currentTab === 'colors' ? 'active' : ''}" @click=${() => this._switchTab('colors')}>Farben</button>
          <button class="tab ${this._currentTab === 'entities' ? 'active' : ''}" @click=${() => this._switchTab('entities')}>Entitäten (${this._config.entities.length})</button>
        </div>
        <div class="tab-content">
          ${this._currentTab === 'general' ? this._renderGeneralTab() : ''}
          ${this._currentTab === 'scroll' ? this._renderScrollTab() : ''}
          ${this._currentTab === 'style' ? this._renderStyleTab() : ''}
          ${this._currentTab === 'colors' ? this._renderColorsTab() : ''}
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
        <div class="input-group">
          <label class="input-label">Titel (Markdown unterstützt)</label>
          <textarea class="title-textarea" .value="${this._config.title || ''}" @input="${this._titleChanged}" rows="4" placeholder="z.B: **Fett**, *Kursiv* oder [Link](url)">${this._config.title || ''}</textarea>
          <div class="helper-text">z.B: **Fett**, *Kursiv* oder [Link](url)</div>
        </div>
        ${this._config.title ? html`
          <ha-textfield label="Titel Schriftgröße" .value="${this._config.title_font_size}" .configValue="${"title_font_size"}" @input="${this._valueChanged}" helper-text="z.B: 16px, 1.5em, 20px"></ha-textfield>
          <ha-select label="Titel Ausrichtung" .value="${this._config.title_alignment}" .configValue="${"title_alignment"}" @selected="${this._selectChanged}" @closed="${(e) => e.stopPropagation()}">
            <mwc-list-item value="left">Links</mwc-list-item>
            <mwc-list-item value="center">Zentriert</mwc-list-item>
            <mwc-list-item value="right">Rechts</mwc-list-item>
          </ha-select>
          <div class="section-divider">Linkes Icon</div>
          <ha-textfield label="Icon links" .value="${this._config.title_left_icon || ''}" .configValue="${"title_left_icon"}" @input="${this._valueChanged}"></ha-textfield>
          ${this._config.title_left_icon ? html`
            <ha-textfield label="Icon-Größe links" .value="${this._config.title_left_icon_size}" .configValue="${"title_left_icon_size"}" @input="${this._valueChanged}" helper-text="z.B: 24px, 1.5em, 32px"></ha-textfield>
            <ha-textfield label="Aktion links" .value="${this._config.title_left_action || ''}" .configValue="${"title_left_action"}" @input="${this._valueChanged}" helper-text="Entity-ID oder /pfad"></ha-textfield>
          ` : ''}
          <div class="section-divider">Rechtes Icon</div>
          <ha-textfield label="Icon rechts" .value="${this._config.title_right_icon || ''}" .configValue="${"title_right_icon"}" @input="${this._valueChanged}"></ha-textfield>
          ${this._config.title_right_icon ? html`
            <ha-textfield label="Icon-Größe rechts" .value="${this._config.title_right_icon_size}" .configValue="${"title_right_icon_size"}" @input="${this._valueChanged}" helper-text="z.B: 24px, 1.5em, 32px"></ha-textfield>
            <ha-textfield label="Aktion rechts" .value="${this._config.title_right_action || ''}" .configValue="${"title_right_action"}" @input="${this._valueChanged}" helper-text="Entity-ID oder /pfad"></ha-textfield>
          ` : ''}
        ` : ''}
      </div>
    `;
  }

  _titleChanged(ev) {
    this._config = { ...this._config, title: ev.target.value };
    this._configChanged();
  }

  _renderScrollTab() {
    return html`
      <div class="tab-panel">
        <ha-textfield label="Scroll-Dauer (Sekunden)" type="number" min="1" .value="${this._config.duration}" .configValue="${"duration"}" @input="${this._valueChanged}"></ha-textfield>
        <ha-formfield label="Kontinuierliches Scrollen"><ha-switch .checked="${this._config.continuous_scroll}" .configValue="${"continuous_scroll"}" @change="${this._switchChanged}"></ha-switch></ha-formfield>
        ${!this._config.continuous_scroll ? html`
          <ha-textfield label="Pause-Dauer (Sekunden)" type="number" min="0" step="0.5" .value="${this._config.pause_duration}" .configValue="${"pause_duration"}" @input="${this._valueChanged}" helper-text="Pause am Ende vor Rückwärtsfahrt"></ha-textfield>
        ` : ''}
        <ha-formfield label="Bei Hover pausieren"><ha-switch .checked="${this._config.pause_on_hover}" .configValue="${"pause_on_hover"}" @change="${this._switchChanged}"></ha-switch></ha-formfield>
        <ha-formfield label="Vertikales Scrollen"><ha-switch .checked="${this._config.vertical_scroll}" .configValue="${"vertical_scroll"}" @change="${this._switchChanged}"></ha-switch></ha-formfield>
        ${this._config.vertical_scroll ? html`
          <ha-select label="Vertikale Ausrichtung" .value="${this._config.vertical_alignment}" .configValue="${"vertical_alignment"}" @selected="${this._selectChanged}" @closed="${(e) => e.stopPropagation()}">
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
        <ha-formfield label="Chips-Stil"><ha-switch .checked="${this._config.badge_style}" .configValue="${"badge_style"}" @change="${this._switchChanged}"></ha-switch></ha-formfield>
        <ha-formfield label="Icons anzeigen (Standard)"><ha-switch .checked="${this._config.show_icon}" .configValue="${"show_icon"}" @change="${this._switchChanged}"></ha-switch></ha-formfield>
        ${this._config.continuous_scroll ? html`
          <ha-formfield label="Fading"><ha-switch .checked="${this._config.fading}" .configValue="${"fading"}" @change="${this._switchChanged}"></ha-switch></ha-formfield>
        ` : ''}
        <ha-formfield label="Transparent"><ha-switch .checked="${this._config.transparent}" .configValue="${"transparent"}" @change="${this._switchChanged}"></ha-switch></ha-formfield>
        ${!this._config.badge_style ? html`
          <ha-textfield label="Trennzeichen" .value="${this._config.separator}" .configValue="${"separator"}" @input="${this._valueChanged}"></ha-textfield>
          <ha-textfield label="Schriftgröße" .value="${this._config.font_size}" .configValue="${"font_size"}" @input="${this._valueChanged}"></ha-textfield>
        ` : ''}
        ${!this._config.transparent ? html`
          <ha-textfield label="Rahmenradius" .value="${this._config.border_radius}" .configValue="${"border_radius"}" @input="${this._valueChanged}"></ha-textfield>
        ` : ''}
        <ha-textfield label="Kartenhöhe" .value="${this._config.card_height}" .configValue="${"card_height"}" @input="${this._valueChanged}"></ha-textfield>
        <ha-textfield label="Kartenbreite" .value="${this._config.card_width}" .configValue="${"card_width"}" @input="${this._valueChanged}"></ha-textfield>
      </div>
    `;
  }

  _renderColorsTab() {
    return html`
      <div class="tab-panel">
        <ha-textfield label="Content-Farbe" .value="${this._config.content_color}" .configValue="${"content_color"}" @input="${this._valueChanged}" helper-text="Haupttext-Farbe"></ha-textfield>
        <ha-textfield label="Label-Farbe" .value="${this._config.label_color}" .configValue="${"label_color"}" @input="${this._valueChanged}" helper-text="Sekundärtext-Farbe"></ha-textfield>
        ${this._config.badge_style ? html`
          <ha-textfield label="Chip-Hintergrund" .value="${this._config.chip_background}" .configValue="${"chip_background"}" @input="${this._valueChanged}"></ha-textfield>
        ` : ''}
      </div>
    `;
  }

  _renderEntitiesTab() {
    const entities = this._config.entities || [];
    return html`
      <div class="tab-panel">
        ${entities.length === 0 ? html`<div class="no-entities"><p>Keine Entitäten konfiguriert.</p></div>` : ''}
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
                  ${index > 0 ? html`<ha-icon-button @click="${() => this._moveEntityUp(index)}"><ha-icon icon="mdi:arrow-up"></ha-icon></ha-icon-button>` : ''}
                  ${index < entities.length - 1 ? html`<ha-icon-button @click="${() => this._moveEntityDown(index)}"><ha-icon icon="mdi:arrow-down"></ha-icon></ha-icon-button>` : ''}
                  <ha-icon-button @click="${() => this._removeEntity(index)}"><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                </div>
              </div>
              ${isExpanded ? html`
                <div class="entity-editor">
                  <ha-textfield 
                    label="Name (für Editor)" 
                    .value="${entityObj.name || ''}" 
                    .entityIndex="${index}" 
                    .configValue="${"name"}" 
                    @input="${this._entityPropertyChanged}" 
                    helper-text="Anzeigename in der Entitätenliste"
                  ></ha-textfield>
                  
                  <ha-textfield 
                    label="Entität" 
                    .value="${entityId}" 
                    .entityIndex="${index}" 
                    .configValue="${"entity"}" 
                    @input="${this._entityPropertyChanged}" 
                    helper-text="${this._getEntityValidationText(entityId)}"
                  ></ha-textfield>
                  ${this._getEntityPreview(entityId)}
                  
                  <ha-textfield label="Content (Template)" .value="${entityObj.content || ''}" .entityIndex="${index}" .configValue="${"content"}" @input="${this._entityPropertyChanged}" helper-text="z.B: {{ states('sensor.temp') }} °C"></ha-textfield>
                  <ha-textfield label="Label (Template)" .value="${entityObj.label || ''}" .entityIndex="${index}" .configValue="${"label"}" @input="${this._entityPropertyChanged}" helper-text="Chips: oben, Normal: rechts"></ha-textfield>
                  <ha-textfield label="Icon (optional)" .value="${entityObj.icon || ''}" .entityIndex="${index}" .configValue="${"icon"}" @input="${this._entityPropertyChanged}"></ha-textfield>
                  
                  <div class="section-divider">Sichtbarkeit</div>
                  ${this._renderVisibilityConditions(entityObj, index)}
                  <mwc-button @click="${() => this._addVisibilityCondition(index)}">Bedingung hinzufügen</mwc-button>
                  
                  <div class="section-divider">Farben</div>
                  <ha-textfield label="Icon-Farbe (optional)" .value="${entityObj.color || ''}" .entityIndex="${index}" .configValue="${"color"}" @input="${this._entityPropertyChanged}" helper-text="Farbe nur für Icon"></ha-textfield>
                  <ha-textfield label="Label-Farbe (optional)" .value="${entityObj.label_color || ''}" .entityIndex="${index}" .configValue="${"label_color"}" @input="${this._entityPropertyChanged}" helper-text="Überschreibt globale Label-Farbe"></ha-textfield>
                  <ha-textfield label="Content-Farbe (optional)" .value="${entityObj.content_color || ''}" .entityIndex="${index}" .configValue="${"content_color"}" @input="${this._entityPropertyChanged}" helper-text="Überschreibt globale Content-Farbe"></ha-textfield>
                  
                  <div class="section-divider">Tap Action</div>
                  <ha-select label="Aktion" .value="${entityObj.tap_action?.action || 'more-info'}" .entityIndex="${index}" .configValue="${"tap_action.action"}" @selected="${this._entitySelectChanged}" @closed="${(e) => e.stopPropagation()}">
                    <mwc-list-item value="more-info">More Info</mwc-list-item>
                    <mwc-list-item value="toggle">Toggle</mwc-list-item>
                    <mwc-list-item value="navigate">Navigate</mwc-list-item>
                    <mwc-list-item value="call-service">Call Service</mwc-list-item>
                    <mwc-list-item value="none">Keine</mwc-list-item>
                  </ha-select>
                  ${entityObj.tap_action?.action === 'navigate' ? html`
                    <ha-textfield label="Navigation Path" .value="${entityObj.tap_action?.navigation_path || ''}" .entityIndex="${index}" .configValue="${"tap_action.navigation_path"}" @input="${this._entityPropertyChanged}" helper-text="z.B: /lovelace/home"></ha-textfield>
                  ` : ''}
                  ${entityObj.tap_action?.action === 'call-service' ? html`
                    <ha-textfield label="Service" .value="${entityObj.tap_action?.service || ''}" .entityIndex="${index}" .configValue="${"tap_action.service"}" @input="${this._entityPropertyChanged}" helper-text="z.B: light.turn_on"></ha-textfield>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          `;
        })}
        <mwc-button raised @click="${this._addEntity}">Entität hinzufügen</mwc-button>
      </div>
    `;
  }

  _getEntityValidationText(entityId) {
    if (!entityId) return 'z.B: sensor.temperatur';
    if (this.hass?.states[entityId]) {
      const state = this.hass.states[entityId];
      return `✓ Gefunden: ${state.attributes.friendly_name || entityId}`;
    }
    return '⚠ Entität nicht gefunden';
  }

  _getEntityPreview(entityId) {
    if (!entityId || !this.hass?.states[entityId]) return html``;
    const state = this.hass.states[entityId];
    return html`
      <div class="entity-preview">
        <span class="preview-label">Aktuell:</span>
        <span class="preview-state">${state.state}</span>
        ${state.attributes.unit_of_measurement ? html`<span class="preview-unit">${state.attributes.unit_of_measurement}</span>` : ''}
      </div>
    `;
  }

  _renderVisibilityConditions(entityObj, entityIndex) {
    const visibility = entityObj.visibility || [];
    if (visibility.length === 0) {
      return html`<p class="helper-text">Keine Bedingungen - Entität immer sichtbar</p>`;
    }
    
    return html`
      ${visibility.map((condition, condIndex) => html`
        <div class="visibility-condition">
          <div class="condition-header">
            <span>Bedingung ${condIndex + 1}</span>
            <ha-icon-button @click="${() => this._removeVisibilityCondition(entityIndex, condIndex)}">
              <ha-icon icon="mdi:delete"></ha-icon>
            </ha-icon-button>
          </div>
          <ha-textfield 
            label="Entität für Bedingung" 
            .value="${condition.entity || ''}" 
            .entityIndex="${entityIndex}"
            .condIndex="${condIndex}"
            .configValue="${"entity"}"
            @input="${this._visibilityPropertyChanged}"
            helper-text="${this._getEntityValidationText(condition.entity)}"
          ></ha-textfield>
          <ha-textfield 
            label="Status (state)" 
            .value="${condition.state || ''}" 
            .entityIndex="${entityIndex}"
            .condIndex="${condIndex}"
            .configValue="${"state"}"
            @input="${this._visibilityPropertyChanged}"
            helper-text="z.B: on, off, home"
          ></ha-textfield>
          <ha-textfield 
            label="Status nicht (state_not)" 
            .value="${condition.state_not || ''}" 
            .entityIndex="${entityIndex}"
            .condIndex="${condIndex}"
            .configValue="${"state_not"}"
            @input="${this._visibilityPropertyChanged}"
            helper-text="Optional: Status der NICHT erfüllt sein soll"
          ></ha-textfield>
        </div>
      `)}
    `;
  }

  _addVisibilityCondition(entityIndex) {
    const entities = [...this._config.entities];
    const entity = typeof entities[entityIndex] === 'string' ? { entity: entities[entityIndex] } : { ...entities[entityIndex] };
    
    if (!entity.visibility) entity.visibility = [];
    entity.visibility = [...entity.visibility, { condition: 'state', entity: '', state: '' }];
    
    entities[entityIndex] = entity;
    this._config = { ...this._config, entities };
    this._configChanged();
  }

  _removeVisibilityCondition(entityIndex, condIndex) {
    const entities = [...this._config.entities];
    const entity = { ...entities[entityIndex] };
    
    if (entity.visibility) {
      entity.visibility = entity.visibility.filter((_, i) => i !== condIndex);
      if (entity.visibility.length === 0) delete entity.visibility;
    }
    
    entities[entityIndex] = entity;
    this._config = { ...this._config, entities };
    this._configChanged();
  }

  _visibilityPropertyChanged(ev) {
    const entityIndex = ev.currentTarget.entityIndex;
    const condIndex = ev.currentTarget.condIndex;
    const configValue = ev.currentTarget.configValue;
    const value = ev.currentTarget.value;
    
    const entities = [...this._config.entities];
    const entity = { ...entities[entityIndex] };
    
    if (!entity.visibility) return;
    entity.visibility = [...entity.visibility];
    entity.visibility[condIndex] = { ...entity.visibility[condIndex], [configValue]: value };
    
    if (configValue === 'state' && !value) delete entity.visibility[condIndex].state;
    if (configValue === 'state_not' && !value) delete entity.visibility[condIndex].state_not;
    
    entities[entityIndex] = entity;
    this._config = { ...this._config, entities };
    this._configChanged();
  }

  _getEntityDisplayName(entity, entityId) {
    if (typeof entity === 'string') return entityId || 'Neue Entität';
    if (entity.name) return entity.name;
    if (entity.content) return entity.content.substring(0, 30) + (entity.content.length > 30 ? '...' : '');
    if (entityId && this.hass?.states[entityId]) return this.hass.states[entityId].attributes.friendly_name || entityId;
    return entityId || 'Neue Entität';
  }

  _toggleEntity(index) {
    this._selectedEntity = this._selectedEntity === index ? null : index;
    this.requestUpdate();
  }

  _addEntity() {
    const entities = [...this._config.entities, { entity: '', content: '' }];
    this._config = { ...this._config, entities };
    this._selectedEntity = entities.length - 1;
    this._configChanged();
  }

  _removeEntity(index) {
    const entities = [...this._config.entities];
    entities.splice(index, 1);
    this._config = { ...this._config, entities };
    if (this._selectedEntity === index) this._selectedEntity = null;
    else if (this._selectedEntity > index) this._selectedEntity--;
    this._configChanged();
  }

  _moveEntityUp(index) {
    if (index === 0) return;
    const entities = [...this._config.entities];
    [entities[index - 1], entities[index]] = [entities[index], entities[index - 1]];
    this._config = { ...this._config, entities };
    if (this._selectedEntity === index) this._selectedEntity = index - 1;
    else if (this._selectedEntity === index - 1) this._selectedEntity = index;
    this._configChanged();
  }

  _moveEntityDown(index) {
    const entities = [...this._config.entities];
    if (index >= entities.length - 1) return;
    [entities[index], entities[index + 1]] = [entities[index + 1], entities[index]];
    this._config = { ...this._config, entities };
    if (this._selectedEntity === index) this._selectedEntity = index + 1;
    else if (this._selectedEntity === index + 1) this._selectedEntity = index;
    this._configChanged();
  }

  _entityPropertyChanged(ev) {
    const index = ev.currentTarget.entityIndex;
    const configValue = ev.currentTarget.configValue;
    const value = ev.currentTarget.value;
    const entities = [...this._config.entities];
    const entity = typeof entities[index] === 'string' ? { entity: entities[index] } : { ...entities[index] };
    
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
    const configValue = ev.currentTarget.configValue;
    const value = ev.currentTarget.value;
    if (!configValue || this._config[configValue] === value) return;
    this._config = { ...this._config, [configValue]: value };
    this._configChanged();
  }

  _switchChanged(ev) {
    if (!this._config || !this.hass) return;
    const configValue = ev.currentTarget.configValue;
    if (!configValue) return;
    this._config = { ...this._config, [configValue]: ev.currentTarget.checked };
    this._configChanged();
  }

  _selectChanged(ev) {
    if (!this._config || !this.hass) return;
    const configValue = ev.currentTarget.configValue;
    if (!configValue) return;
    this._config = { ...this._config, [configValue]: ev.currentTarget.value };
    this._configChanged();
  }

  _configChanged() {
    const event = new Event("config-changed", { bubbles: true, composed: true });
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
      .input-group {
        margin-bottom: 16px;
      }
      .input-label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--secondary-text-color);
        margin-bottom: 4px;
        margin-top: 8px;
      }
      .title-textarea {
        width: 100%;
        padding: 12px;
        font-family: inherit;
        font-size: 14px;
        color: var(--primary-text-color);
        background: var(--secondary-background-color);
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        resize: vertical;
        box-sizing: border-box;
      }
      .title-textarea:focus {
        outline: none;
        border-color: var(--primary-color);
      }
      .helper-text {
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-top: 4px;
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
      .entity-preview {
        background: var(--secondary-background-color);
        padding: 8px 12px;
        border-radius: 4px;
        margin-bottom: 12px;
        display: flex;
        gap: 8px;
        align-items: center;
        font-size: 14px;
      }
      .preview-label {
        color: var(--secondary-text-color);
        font-weight: 500;
      }
      .preview-state {
        color: var(--primary-color);
        font-weight: 600;
      }
      .preview-unit {
        color: var(--secondary-text-color);
      }
      .visibility-condition {
        background: var(--secondary-background-color);
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;
      }
      .condition-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-weight: 500;
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
