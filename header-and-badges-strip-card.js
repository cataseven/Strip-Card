const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

console.info(
  `%c HEADER AND BADGES STRIP CARD %c v3.2.2 `,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "header-and-badges-strip-card",
  name: "Header and Badges Strip Card",
  description: "A card with optional header that displays entities as scrolling badges or text strip.",
  preview: true,
});

const DEBOUNCE_DELAY = 150;
const MIN_WIDTH = 400;
const ANIMATION_ID = 'header-badges-animation';

const loadHaComponents = () => {
  if (!customElements.get("ha-entity-picker")) {
    customElements.get("hui-entities-card")?.getConfigElement();
  }
};

class HeaderAndBadgesStripCard extends LitElement {
  static properties = {
    hass: { type: Object },
    _config: { type: Object },
    _sidebarWidth: { type: Number },
  };

  static getStubConfig() {
    return { type: "custom:header-and-badges-strip-card", entities: [{ entity: "sun.sun" }, { entity: "zone.home" }], scroll_speed: 50, separator: "•" };
  }

  static getConfigElement() {
    return document.createElement("header-and-badges-strip-card-editor");
  }

  constructor() {
    super();
    this._cache = { animation: null, templates: new Map() };
    this._debounceTimer = null;
    this._sidebarWidth = 0;
  }

  setConfig(config) {
    if (!config.entities?.length) throw new Error("entities required");
    
    this._config = { 
      scroll_speed: 50, pause_duration: 2, separator: "•", font_size: "14px", title_font_size: "16px", title_alignment: "left",
      title_icon_spacing: "4px", title_left_icon_size: "24px", title_right_icon_size: "24px", content_color: "var(--primary-text-color)",
      label_color: "var(--secondary-text-color)", chip_background: "var(--primary-background-color)", border_radius: "0px",
      card_height: "auto", card_width: "100%", show_icon: false, pause_on_hover: false,
      full_width: false, fading: false, continuous_scroll: true, scroll_direction: "left",
      transparent: false, badge_style: false, title: "", title_left_icon: "", title_left_action: "", title_right_icon: "",
      title_right_action: "", ...config 
    };
    
    this._cache = { animation: null, templates: new Map() };
  }

  getCardSize() { return 1; }

  connectedCallback() {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(() => this._debouncedResize());
    this._updateSidebarWidth();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    clearTimeout(this._debounceTimer);
  }

  _updateSidebarWidth() {
    try {
      const homeAssistant = document.querySelector('home-assistant');
      const main = homeAssistant?.shadowRoot?.querySelector('home-assistant-main');
      const drawer = main?.shadowRoot?.querySelector('ha-drawer');
      const sidebar = drawer?.querySelector('ha-sidebar');
      
      if (sidebar) {
        const width = Math.ceil(sidebar.getBoundingClientRect().width) || 0;
        if (width !== this._sidebarWidth) {
          this._sidebarWidth = width;
          this.requestUpdate();
        }
      }
    } catch (e) {
      // Silently fail - sidebar detection not critical
    }
    requestAnimationFrame(() => this._updateSidebarWidth());
  }

  _debouncedResize() {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => requestAnimationFrame(() => {
      this._updateScroll();
    }), DEBOUNCE_DELAY);
  }

  firstUpdated() {
    setTimeout(() => { 
      this._updateScroll();
    }, 0);
    if (this._resizeObserver) {
      this.shadowRoot.querySelector('.ticker-wrap') && this._resizeObserver.observe(this.shadowRoot.querySelector('.ticker-wrap'));
      const container = this.closest('hui-view, .view, hui-sections-view');
      container && this._resizeObserver.observe(container);
    }
  }

  updated(changedProps) {
    if (changedProps.has('_config') || changedProps.has('_sidebarWidth')) {
      this._cache.animation = null;
      requestAnimationFrame(() => {
        this._updateScroll();
      });
    }
  }

  _updateScroll() {
    const move = this.shadowRoot.querySelector('.ticker-move');
    const wrap = this.shadowRoot.querySelector('.ticker-wrap');
    if (!move || !wrap) return;

    if (this._config.continuous_scroll) {
      const speed = parseFloat(this._evalTemplate(this._config.scroll_speed) || 50);
      const contentWidth = move.scrollWidth / 2;
      const duration = contentWidth / speed;
      const direction = this._config.scroll_direction || 'left';
      
      const animName = direction === 'right' ? 'ticker-right' : 'ticker';
      move.style.animation = `${animName} ${duration}s linear infinite`;
      wrap.style.justifyContent = 'flex-start';
    } else {
      this._setupReturnAnim(move, wrap);
    }
  }

  _setupReturnAnim(move, wrap) {
    const dist = Math.max(0, move.scrollWidth - wrap.offsetWidth);
    const speed = parseFloat(this._evalTemplate(this._config.scroll_speed) || 50);
    const pause = parseFloat(this._evalTemplate(this._config.pause_duration));
    
    const dur = dist / speed;
    const cacheKey = `${dist}-${speed}-${pause}`;
    
    if (this._cache.animation === cacheKey) return;
    this._cache.animation = cacheKey;

    if (dist === 0) {
      const align = this._config.title_alignment === 'center' ? 'center' : 
                    this._config.title_alignment === 'right' ? 'flex-end' : 'flex-start';
      wrap.style.justifyContent = align;
      move.style.animation = 'none';
    } else {
      wrap.style.justifyContent = 'flex-start';
      
      const total = dur + pause + dur + pause;
      const p1 = (dur / total * 100).toFixed(2);
      const p2 = ((dur + pause) / total * 100).toFixed(2);
      const p3 = ((dur + pause + dur) / total * 100).toFixed(2);
      const name = `ticker-return-${Date.now()}`;

      let style = this.shadowRoot.getElementById(ANIMATION_ID);
      if (!style) {
        style = document.createElement('style');
        style.id = ANIMATION_ID;
        this.shadowRoot.appendChild(style);
      }

      style.textContent = `@keyframes ${name} {
        0%, 100% { transform: translateX(0); }
        ${p1}%, ${p2}% { transform: translateX(-${dist}px); }
        ${p3}% { transform: translateX(0); }
      }`;
      move.style.animation = `${name} ${total}s linear infinite`;
    }
  }

  shouldUpdate(changedProps) {
    if (changedProps.has('_config')) return true;
    if (changedProps.has('_sidebarWidth')) return true;
    if (changedProps.has('hass')) {
      const old = changedProps.get('hass');
      if (!old) return true;
      
      const changed = this._config.entities.some(e => {
        const id = typeof e === "string" ? e : e.entity;
        if (!id) return false;
        const os = old.states[id], ns = this.hass.states[id];
        if (!os || !ns) return true;
        if (os.state !== ns.state) return true;
        return ['friendly_name', 'icon', 'unit_of_measurement'].some(a => os.attributes[a] !== ns.attributes[a]);
      });
      
      if (changed) {
        this._cache.templates.clear();
        return true;
      }

      return this._config.entities.some(e => 
        e.visibility?.some(c => {
          if (c.condition === 'state' && c.entity) {
            const os = old.states[c.entity], ns = this.hass.states[c.entity];
            return !os || !ns || os.state !== ns.state;
          }
          return false;
        })
      );
    }
    return true;
  }

  _checkVisibility(e) {
    return !e.visibility || e.visibility.every(c => {
      if (c.condition === 'state') {
        const s = this.hass.states[c.entity];
        if (!s) return false;
        if (c.state !== undefined && c.state !== '') return s.state === c.state;
        if (c.state_not !== undefined && c.state_not !== '') return s.state !== c.state_not;
      }
      return true;
    });
  }

  _handleIconClick(action) {
    if (!action) return;
    if (action.startsWith('/')) {
      window.history.pushState(null, '', action);
      window.dispatchEvent(new CustomEvent('location-changed'));
    } else {
      this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: action } }));
    }
  }

  _handleTap(e) {
    const tap = e.tap_action || { action: 'more-info' };
    const id = typeof e === "string" ? e : e.entity;
    
    switch (tap.action) {
      case 'more-info':
        this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: tap.entity || id } }));
        break;
      case 'navigate':
        if (tap.navigation_path) {
          window.history.pushState(null, '', tap.navigation_path);
          window.dispatchEvent(new CustomEvent('location-changed'));
        }
        break;
      case 'call-service':
        if (tap.service) {
          const [d, s] = tap.service.split(".");
          d && s && this.hass.callService(d, s, tap.service_data || {});
        }
        break;
      case 'toggle':
        this.hass.callService('homeassistant', 'toggle', { entity_id: id });
        break;
    }
  }

  _evalTemplate(tmpl) {
    if (!tmpl || typeof tmpl !== 'string' || !tmpl.includes("{{")) return tmpl;
    const key = `${tmpl}-${Object.keys(this.hass.states || {}).length}`;
    if (this._cache.templates.has(key)) return this._cache.templates.get(key);

    try {
      const expr = tmpl.match(/{{(.*?)}}/s)[1];
      const states = (id) => this.hass.states[id]?.state || 'unknown';
      const state_attr = (id, a) => this.hass.states[id]?.attributes[a] ?? null;
      const result = new Function("states", "state_attr", `"use strict"; return (${expr.trim()});`)(states, state_attr);
      this._cache.templates.set(key, result);
      return result;
    } catch (e) {
      console.warn("Header-and-Badges-Strip-Card: Template error:", e.message);
      return tmpl.replace(/{{.*?}}/g, '').trim() || 'Error';
    }
  }

  render() {
    if (!this._config || !this.hass) return html``;

    const entities = this._config.entities.filter(e => this._checkVisibility(e)).map(e => this._renderEntity(e)).filter(Boolean);
    if (!entities.length) return html``;

    let content = entities;
    if (this._config.continuous_scroll) {
      content = [...entities, ...entities];
    }

    const wrapClass = [this._config.pause_on_hover && 'pausable', this._config.fading && this._config.continuous_scroll && 'fading',
      this._config.badge_style && 'chips'].filter(Boolean).join(' ');

    return html`
      <div class="header-badges-wrapper ${this._config.full_width ? 'full-width' : ''}" style="${this._config.full_width ? `--sidebar-width: ${this._sidebarWidth}px;` : ''}">
        <ha-card class="${this._config.card_width !== '100%' && !this._config.full_width ? 'custom-width' : ''}" style="
          --font: ${this._config.font_size}; --radius: ${this._config.border_radius}; --height: ${this._config.card_height};
          --content-color: ${this._config.content_color}; --label-color: ${this._config.label_color}; --chip-bg: ${this._config.chip_background};
          --title-font: ${this._config.title_font_size}; --title-spacing: ${this._config.title_icon_spacing};
          ${this._config.transparent ? '--ha-card-background: transparent; --card-background-color: transparent; background: transparent; box-shadow: none; border: none;' : ''}
          ${!this._config.full_width && this._config.card_width !== '100%' ? `width: ${this._config.card_width};` : ''}
        ">
          ${this._config.title ? html`
            <div class="header" style="justify-content: ${this._config.title_alignment === 'center' ? 'center' : this._config.title_alignment === 'right' ? 'flex-end' : 'flex-start'};">
              ${this._config.title_left_icon ? html`<ha-icon class="icon left" .icon=${this._config.title_left_icon} @click=${() => this._handleIconClick(this._config.title_left_action)} 
                style="--mdc-icon-size: ${this._config.title_left_icon_size}; cursor: ${this._config.title_left_action ? 'pointer' : 'default'};"></ha-icon>` : ''}
              <ha-markdown class="title" .content="${this._config.title}" breaks></ha-markdown>
              ${this._config.title_right_icon ? html`<ha-icon class="icon right" .icon=${this._config.title_right_icon} @click=${() => this._handleIconClick(this._config.title_right_action)}
                style="--mdc-icon-size: ${this._config.title_right_icon_size}; cursor: ${this._config.title_right_action ? 'pointer' : 'default'};"></ha-icon>` : ''}
            </div>
          ` : ''}
          <div class="ticker-wrap ${wrapClass}">
            <div class="ticker-move">${content}</div>
          </div>
        </ha-card>
      </div>
    `;
  }

  _renderEntity(e) {
    const id = typeof e === "string" ? e : e.entity;
    const state = this.hass.states[id];
    if (!state) return html`<div class="item error">Unknown: ${id}</div>`;

    const content = e.content ? this._evalTemplate(e.content) : `${state.attributes.friendly_name || id}: ${state.state}`;
    const label = e.label ? this._evalTemplate(e.label) : '';
    let icon = e.icon !== undefined ? e.icon : (this._config.show_icon ? state.attributes.icon || 'mdi:eye' : null);
    if (icon) icon = this._evalTemplate(icon);

    const iColor = e.color ? this._evalTemplate(e.color) : null;
    const lColor = e.label_color ? this._evalTemplate(e.label_color) : 'var(--label-color)';
    const cColor = e.content_color ? this._evalTemplate(e.content_color) : 'var(--content-color)';

    if (this._config.badge_style) {
      return html`
        <div class="chip ${label ? 'has-label' : ''}" @click=${() => this._handleTap(e)} title="${content}${label ? ' - ' + label : ''}">
          ${icon ? html`<ha-icon class="chip-icon" .icon=${icon} style="${iColor ? `color: ${iColor};` : ''}"></ha-icon>` : ''}
          <div class="chip-text">
            ${label ? html`<span class="chip-label" style="color: ${lColor};">${label}</span>` : ''}
            <span class="chip-content" style="color: ${cColor};">${content}</span>
          </div>
        </div>
      `;
    }

    return html`
      <div class="item" @click=${() => this._handleTap(e)} title="${content}${label ? ' - ' + label : ''}">
        ${icon ? html`<ha-icon class="icon" .icon=${icon} style="${iColor ? `color: ${iColor};` : ''}"></ha-icon>` : ''}
        <span class="content" style="color: ${cColor};">${content}</span>
        ${label ? html`<span class="label" style="color: ${lColor};">${label}</span>` : ''}
        <span class="sep">${this._config.separator}</span>
      </div>
    `;
  }

  static styles = css`
    :host { display: block; position: relative; }
    .header-badges-wrapper { display: flex; justify-content: center; width: 100%; position: relative; }
    .header-badges-wrapper.full-width { 
      position: relative;
      margin-left: calc(-50vw + 50% + var(--sidebar-width, 256px) / 2);
      width: calc(100vw - var(--sidebar-width, 256px));
    }
    .header-badges-wrapper.full-width ha-card { width: 100% !important; max-width: 100% !important; }
    ha-card { overflow: hidden; border-radius: var(--radius, 0); height: var(--height, auto); width: 100%; display: flex; flex-direction: column; }
    ha-card.custom-width { flex-shrink: 0; }
    .header { padding: 16px; font-size: 16px; font-weight: 400; color: var(--primary-text-color); display: flex; align-items: center; gap: 0; }
    .title { flex: 0 1 auto; font-size: var(--title-font, 16px); }
    .title p { margin: 0; }
    .header .icon { flex-shrink: 0; color: var(--primary-text-color); transition: color .2s; }
    .header .icon:hover { color: var(--primary-color); }
    .header .icon.left { order: -1; margin-right: var(--title-spacing, 4px); }
    .header .icon.right { order: 1; margin-left: var(--title-spacing, 4px); }
    .ticker-wrap { flex: 1; display: flex; align-items: center; width: 100%; overflow: hidden; background: var(--card-background-color, white); position: relative; min-height: 50px; }
    .ticker-wrap.chips { padding: 8px 0; min-height: auto; }
    .ticker-wrap.fading { -webkit-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%); mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%); }
    .ticker-wrap.pausable .ticker-move { animation-play-state: running; }
    .ticker-wrap.pausable:hover .ticker-move { animation-play-state: paused !important; }
    .ticker-move { display: inline-block; white-space: nowrap; will-change: transform; }
    .item { display: inline-flex; align-items: center; font-size: var(--font, 14px); cursor: pointer; }
    .item .sep { margin: 0 1rem; color: var(--disabled-text-color); }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; margin-right: 8px; min-height: 28px; max-height: 28px; background: var(--chip-bg); border-radius: 14px; cursor: pointer; font-size: 12px; white-space: nowrap; transition: background .2s; box-shadow: 0 1px 3px 0 rgba(0,0,0,.1), 0 1px 2px 0 rgba(0,0,0,.06); box-sizing: border-box; vertical-align: middle; }
    .chip:hover { background: var(--secondary-background-color); }
    .chip-icon { --mdc-icon-size: 16px; width: 16px; height: 16px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .chip-text { display: flex; flex-direction: column; gap: 1px; align-items: flex-start; justify-content: center; line-height: 1; }
    .chip:not(.has-label) .chip-text { flex-direction: row; align-items: center; }
    .chip-label { font-size: 9px; font-weight: 400; opacity: .8; line-height: 1; color: var(--label-color); }
    .chip-content { font-weight: 600; line-height: 1; color: var(--content-color); }
    .item .icon { --mdc-icon-size: 20px; margin-right: .5em; }
    .item .content { font-weight: 500; color: var(--content-color); }
    .item .label { font-weight: 400; opacity: .8; margin-left: .5em; color: var(--label-color); }
    .error { color: var(--error-color); font-weight: bold; }
    @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    @keyframes ticker-right { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
  `;
}

class HeaderAndBadgesStripCardEditor extends LitElement {
  static properties = { hass: {}, _config: {}, _sel: { type: Number }, _tab: { type: String } };

  constructor() {
    super();
    this._tab = 'general';
    this._sel = null;
    loadHaComponents();
  }

  setConfig(config) {
    this._config = { scroll_speed: 50, pause_duration: 2, separator: "•", font_size: "14px", title_font_size: "16px", title_alignment: "left",
      title_icon_spacing: "4px", title_left_icon_size: "24px", title_right_icon_size: "24px", content_color: "var(--primary-text-color)",
      label_color: "var(--secondary-text-color)", chip_background: "var(--primary-background-color)", border_radius: "0px", card_height: "auto",
      card_width: "100%", show_icon: false, pause_on_hover: false, full_width: false, fading: false,
      continuous_scroll: true, scroll_direction: "left", transparent: false, badge_style: false, title: "",
      title_left_icon: "", title_left_action: "", title_right_icon: "", title_right_action: "", ...config, entities: config.entities || [] };
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const tabs = [
      { id: 'general', name: 'Titel' },
      { id: 'scroll', name: 'Scroll' },
      { id: 'style', name: 'Stil' },
      { id: 'colors', name: 'Farben' },
      { id: 'entities', name: `Entitäten (${this._config.entities.length})` }
    ];

    return html`
      <div class="config">
        <div class="tabs">
          ${tabs.map(t => html`<button class="tab ${this._tab === t.id ? 'active' : ''}" @click=${() => { this._tab = t.id; this.requestUpdate(); }}>${t.name}</button>`)}
        </div>
        <div class="content">${this._renderTab()}</div>
      </div>
    `;
  }

  _renderTab() {
    const fields = {
      general: [
        { type: 'textarea', key: 'title', label: 'Titel (Markdown)', helper: '**Fett**, *Kursiv*, [Link](url)', rows: 4 },
        ...this._config.title ? [
          { type: 'text', key: 'title_font_size', label: 'Schriftgröße', helper: '16px, 1.5em' },
          { type: 'select', key: 'title_alignment', label: 'Ausrichtung', options: [['left', 'Links'], ['center', 'Zentriert'], ['right', 'Rechts']] },
          ...(this._config.title_left_icon || this._config.title_right_icon) ? [{ type: 'text', key: 'title_icon_spacing', label: 'Icon-Abstand', helper: '4px' }] : [],
          { type: 'divider', label: 'Linkes Icon' },
          { type: 'text', key: 'title_left_icon', label: 'Icon links' },
          ...this._config.title_left_icon ? [
            { type: 'text', key: 'title_left_icon_size', label: 'Icon-Größe', helper: '24px' },
            { type: 'text', key: 'title_left_action', label: 'Aktion', helper: 'Entity-ID oder /pfad' }
          ] : [],
          { type: 'divider', label: 'Rechtes Icon' },
          { type: 'text', key: 'title_right_icon', label: 'Icon rechts' },
          ...this._config.title_right_icon ? [
            { type: 'text', key: 'title_right_icon_size', label: 'Icon-Größe', helper: '24px' },
            { type: 'text', key: 'title_right_action', label: 'Aktion', helper: 'Entity-ID oder /pfad' }
          ] : []
        ] : []
      ],
      scroll: [
        { type: 'number', key: 'scroll_speed', label: 'Scroll-Geschwindigkeit (px/s)', min: 10, max: 200, step: 5, helper: 'Empfohlen: 30-80 px/s' },
        { type: 'switch', key: 'continuous_scroll', label: 'Kontinuierlich' },
        ...this._config.continuous_scroll ? [
          { type: 'select', key: 'scroll_direction', label: 'Scroll-Richtung', options: [['left', 'Nach links'], ['right', 'Nach rechts']] }
        ] : [
          { type: 'number', key: 'pause_duration', label: 'Pause-Dauer (Sek)', min: 0, step: 0.5, helper: 'Pause am Ende' }
        ],
        { type: 'switch', key: 'pause_on_hover', label: 'Bei Hover pausieren' }
      ],
      style: [
        { type: 'switch', key: 'badge_style', label: 'Chips-Stil' },
        { type: 'switch', key: 'show_icon', label: 'Icons anzeigen' },
        ...this._config.continuous_scroll ? [{ type: 'switch', key: 'fading', label: 'Fading' }] : [],
        { type: 'switch', key: 'transparent', label: 'Transparent' },
        ...!this._config.badge_style ? [
          { type: 'text', key: 'separator', label: 'Trennzeichen' },
          { type: 'text', key: 'font_size', label: 'Schriftgröße' }
        ] : [],
        ...!this._config.transparent ? [{ type: 'text', key: 'border_radius', label: 'Rahmenradius' }] : [],
        { type: 'text', key: 'card_height', label: 'Kartenhöhe' },
        { type: 'divider', label: 'Breite' },
        { type: 'switch', key: 'full_width', label: 'Volle Breite' },
        ...!this._config.full_width ? [{ type: 'text', key: 'card_width', label: 'Kartenbreite', helper: '100%, 200%, 500px' }] : []
      ],
      colors: [
        { type: 'text', key: 'content_color', label: 'Content-Farbe', helper: 'Haupttext' },
        { type: 'text', key: 'label_color', label: 'Label-Farbe', helper: 'Sekundärtext' },
        ...this._config.badge_style ? [{ type: 'text', key: 'chip_background', label: 'Chip-Hintergrund' }] : []
      ]
    };

    if (this._tab === 'entities') return this._renderEntities();
    return html`<div class="panel">${fields[this._tab].map(f => this._renderField(f))}</div>`;
  }

  _renderField(f) {
    if (f.type === 'divider') return html`<div class="divider">${f.label}</div>`;
    if (f.type === 'textarea') return html`
      <div class="group">
        <label>${f.label}</label>
        <textarea .value="${this._config[f.key] || ''}" @input=${e => this._change(f.key, e.target.value)} rows="${f.rows || 4}" placeholder="${f.helper || ''}"></textarea>
        ${f.helper ? html`<span class="help">${f.helper}</span>` : ''}
      </div>
    `;
    if (f.type === 'text' || f.type === 'number') return html`
      <ha-textfield label="${f.label}" .value="${this._config[f.key]}" type="${f.type}" min="${f.min}" max="${f.max}" step="${f.step}" 
        helper-text="${f.helper || ''}" @input=${e => this._change(f.key, e.target.value)}></ha-textfield>
    `;
    if (f.type === 'switch') return html`<ha-formfield label="${f.label}"><ha-switch .checked="${this._config[f.key]}" @change=${e => this._change(f.key, e.target.checked)}></ha-switch></ha-formfield>`;
    if (f.type === 'select') return html`
      <ha-select label="${f.label}" .value="${this._config[f.key]}" @selected=${e => this._change(f.key, e.target.value)} @closed=${e => e.stopPropagation()}>
        ${f.options.map(([v, l]) => html`<mwc-list-item value="${v}">${l}</mwc-list-item>`)}
      </ha-select>
    `;
  }

  _renderEntities() {
    return html`
      <div class="panel">
        ${!this._config.entities.length ? html`<p class="empty">Keine Entitäten</p>` : ''}
        ${this._config.entities.map((e, i) => this._renderEntity(e, i))}
        <mwc-button raised @click=${() => this._addEntity()}>Entität hinzufügen</mwc-button>
      </div>
    `;
  }

  _renderEntity(e, i) {
    const obj = typeof e === 'string' ? { entity: e } : e;
    const id = obj.entity || '';
    const name = obj.name || (obj.content ? obj.content.substring(0, 30) : '') || (id && this.hass?.states[id]?.attributes.friendly_name) || id || 'Neu';
    const exp = this._sel === i;

    return html`
      <div class="entity">
        <div class="entity-head">
          <span @click=${() => { this._sel = exp ? null : i; this.requestUpdate(); }}>${name}</span>
          <div class="controls">
            ${i > 0 ? html`<ha-icon-button @click=${() => this._moveEntity(i, -1)}><ha-icon icon="mdi:arrow-up"></ha-icon></ha-icon-button>` : ''}
            ${i < this._config.entities.length - 1 ? html`<ha-icon-button @click=${() => this._moveEntity(i, 1)}><ha-icon icon="mdi:arrow-down"></ha-icon></ha-icon-button>` : ''}
            <ha-icon-button @click=${() => this._removeEntity(i)}><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
          </div>
        </div>
        ${exp ? html`
          <div class="entity-edit">
            <ha-textfield label="Name (Editor)" .value="${obj.name || ''}" @input=${e => this._entityChange(i, 'name', e.target.value)} helper-text="Anzeigename"></ha-textfield>
            
            <ha-entity-picker
              label="Entität"
              .hass=${this.hass}
              .value=${id}
              @value-changed=${e => this._entityChange(i, 'entity', e.detail.value)}
              allow-custom-entity
            ></ha-entity-picker>
            
            ${this._previewEntity(id)}
            <ha-textfield label="Content (Template)" .value="${obj.content || ''}" @input=${e => this._entityChange(i, 'content', e.target.value)} helper-text="{{ states('...') }}"></ha-textfield>
            <ha-textfield label="Label" .value="${obj.label || ''}" @input=${e => this._entityChange(i, 'label', e.target.value)}></ha-textfield>
            <ha-textfield label="Icon" .value="${obj.icon || ''}" @input=${e => this._entityChange(i, 'icon', e.target.value)}></ha-textfield>
            
            <div class="divider">Sichtbarkeit</div>
            ${this._renderVisibility(obj, i)}
            <mwc-button @click=${() => this._addVisibility(i)}>Bedingung hinzufügen</mwc-button>
            
            <div class="divider">Farben</div>
            <ha-textfield label="Icon-Farbe" .value="${obj.color || ''}" @input=${e => this._entityChange(i, 'color', e.target.value)}></ha-textfield>
            <ha-textfield label="Label-Farbe" .value="${obj.label_color || ''}" @input=${e => this._entityChange(i, 'label_color', e.target.value)}></ha-textfield>
            <ha-textfield label="Content-Farbe" .value="${obj.content_color || ''}" @input=${e => this._entityChange(i, 'content_color', e.target.value)}></ha-textfield>
            
            <div class="divider">Tap Action</div>
            <ha-select label="Aktion" .value="${obj.tap_action?.action || 'more-info'}" @selected=${e => this._entityChange(i, 'tap_action.action', e.target.value)} @closed=${e => e.stopPropagation()}>
              ${[['more-info', 'More Info'], ['toggle', 'Toggle'], ['navigate', 'Navigate'], ['call-service', 'Call Service'], ['none', 'Keine']].map(([v, l]) => html`<mwc-list-item value="${v}">${l}</mwc-list-item>`)}
            </ha-select>
            ${obj.tap_action?.action === 'navigate' ? html`
              <ha-textfield label="Path" .value="${obj.tap_action?.navigation_path || ''}" @input=${e => this._entityChange(i, 'tap_action.navigation_path', e.target.value)} helper-text="z.B: /lovelace/home"></ha-textfield>
            ` : ''}
            ${obj.tap_action?.action === 'call-service' ? html`
              <ha-textfield label="Service" .value="${obj.tap_action?.service || ''}" @input=${e => this._entityChange(i, 'tap_action.service', e.target.value)} helper-text="z.B: light.turn_on"></ha-textfield>
              <ha-textfield label="Service Data (JSON)" .value="${JSON.stringify(obj.tap_action?.service_data || {})}" @input=${e => this._entityChangeJSON(i, 'tap_action.service_data', e.target.value)} helper-text='{"brightness": 255}'></ha-textfield>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  _renderVisibility(obj, i) {
    const vis = obj.visibility || [];
    if (!vis.length) return html`<p class="help">Keine Bedingungen - Entität immer sichtbar</p>`;
    
    return html`
      ${vis.map((c, ci) => html`
        <div class="visibility">
          <div class="vis-head">
            <span>Bedingung ${ci + 1}</span>
            <ha-icon-button @click=${() => this._removeVisibility(i, ci)}><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
          </div>
          
          <ha-entity-picker
            label="Entität"
            .hass=${this.hass}
            .value=${c.entity || ''}
            @value-changed=${e => this._visibilityChange(i, ci, 'entity', e.detail.value)}
            allow-custom-entity
          ></ha-entity-picker>
          
          <ha-textfield label="Status (state)" .value="${c.state || ''}" @input=${e => this._visibilityChange(i, ci, 'state', e.target.value)} helper-text="z.B: on, off, home"></ha-textfield>
          <ha-textfield label="Status nicht (state_not)" .value="${c.state_not || ''}" @input=${e => this._visibilityChange(i, ci, 'state_not', e.target.value)} helper-text="Optional"></ha-textfield>
        </div>
      `)}
    `;
  }

  _addVisibility(i) {
    const entities = [...this._config.entities];
    let e = typeof entities[i] === 'string' ? { entity: entities[i] } : { ...entities[i] };
    if (!e.visibility) e.visibility = [];
    e.visibility = [...e.visibility, { condition: 'state', entity: '', state: '' }];
    entities[i] = e;
    this._change('entities', entities);
  }

  _removeVisibility(i, ci) {
    const entities = [...this._config.entities];
    let e = { ...entities[i] };
    if (e.visibility) {
      e.visibility = e.visibility.filter((_, idx) => idx !== ci);
      if (!e.visibility.length) delete e.visibility;
    }
    entities[i] = e;
    this._change('entities', entities);
  }

  _visibilityChange(i, ci, key, val) {
    const entities = [...this._config.entities];
    let e = { ...entities[i] };
    if (!e.visibility) return;
    e.visibility = [...e.visibility];
    e.visibility[ci] = { ...e.visibility[ci], [key]: val };
    if (key === 'state' && !val) delete e.visibility[ci].state;
    if (key === 'state_not' && !val) delete e.visibility[ci].state_not;
    entities[i] = e;
    this._change('entities', entities);
  }

  _previewEntity(id) {
    if (!id || !this.hass?.states[id]) return '';
    const s = this.hass.states[id];
    return html`<div class="preview"><span>Aktuell:</span><b>${s.state}</b>${s.attributes.unit_of_measurement || ''}</div>`;
  }

  _change(key, val) {
    this._config = { ...this._config, [key]: val };
    this.dispatchEvent(new CustomEvent("config-changed", { bubbles: true, composed: true, detail: { config: this._config } }));
  }

  _entityChange(i, key, val) {
    const entities = [...this._config.entities];
    let e = typeof entities[i] === 'string' ? { entity: entities[i] } : { ...entities[i] };
    if (key.includes('.')) {
      const [p, c] = key.split('.');
      if (!e[p]) e[p] = {};
      e[p][c] = val;
    } else {
      e[key] = val;
    }
    entities[i] = e;
    this._change('entities', entities);
  }

  _entityChangeJSON(i, key, val) {
    try {
      const parsed = JSON.parse(val);
      this._entityChange(i, key, parsed);
    } catch (e) {
      console.warn('Invalid JSON:', val);
    }
  }

  _addEntity() {
    this._change('entities', [...this._config.entities, { entity: '', content: '' }]);
    this._sel = this._config.entities.length;
  }

  _removeEntity(i) {
    const entities = [...this._config.entities];
    entities.splice(i, 1);
    this._change('entities', entities);
    if (this._sel === i) this._sel = null;
    else if (this._sel > i) this._sel--;
  }

  _moveEntity(i, dir) {
    const entities = [...this._config.entities];
    [entities[i], entities[i + dir]] = [entities[i + dir], entities[i]];
    this._change('entities', entities);
    if (this._sel === i) this._sel = i + dir;
    else if (this._sel === i + dir) this._sel = i;
  }

  static styles = css`
    .config { display: flex; flex-direction: column; }
    .tabs { display: flex; border-bottom: 2px solid var(--divider-color); background: var(--card-background-color); }
    .tab { padding: 12px 16px; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; cursor: pointer; font-size: 14px; color: var(--primary-text-color); transition: all .2s; white-space: nowrap; flex-shrink: 0; }
    .tab:hover { background: var(--secondary-background-color); }
    .tab.active { border-bottom-color: var(--primary-color); color: var(--primary-color); font-weight: 500; }
    .content { flex: 1; overflow-y: auto; }
    .panel { padding: 16px; }
    .group { margin-bottom: 16px; }
    .group label { display: block; font-size: 12px; font-weight: 500; color: var(--secondary-text-color); margin-bottom: 4px; }
    textarea { width: 100%; padding: 12px; font-family: inherit; font-size: 14px; color: var(--primary-text-color); background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 4px; resize: vertical; box-sizing: border-box; }
    textarea:focus { outline: none; border-color: var(--primary-color); }
    .help { font-size: 12px; color: var(--secondary-text-color); margin-top: 4px; display: block; }
    .divider { font-weight: 500; font-size: 14px; color: var(--primary-color); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--divider-color); }
    ha-textfield, ha-select, ha-entity-picker { width: 100%; margin-bottom: 12px; display: block; }
    ha-formfield { display: block; margin: 12px 0; padding: 8px 0; }
    .empty { text-align: center; padding: 24px; color: var(--secondary-text-color); }
    .entity { border: 1px solid var(--divider-color); border-radius: 8px; margin: 12px 0; overflow: hidden; background: var(--card-background-color); }
    .entity-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--secondary-background-color); user-select: none; font-weight: 500; }
    .entity-head span { flex: 1; cursor: pointer; }
    .entity-head:hover span { color: var(--primary-color); }
    .controls { display: flex; gap: 4px; }
    .entity-edit { padding: 16px; border-top: 1px solid var(--divider-color); }
    .preview { background: var(--secondary-background-color); padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; display: flex; gap: 8px; align-items: center; font-size: 14px; }
    .preview span { color: var(--secondary-text-color); }
    .preview b { color: var(--primary-color); }
    .visibility { background: var(--secondary-background-color); padding: 12px; border-radius: 8px; margin-bottom: 12px; }
    .vis-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: 500; }
    mwc-button { margin-top: 16px; width: 100%; }
  `;
}

customElements.define("header-and-badges-strip-card", HeaderAndBadgesStripCard);
customElements.define("header-and-badges-strip-card-editor", HeaderAndBadgesStripCardEditor);