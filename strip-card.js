const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

console.info(
  `%c STRIP-CARD %c Loaded - Version 2.2.0 `,
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
      _sidebarWidth: { type: Number },
      _scrollbarWidth: { type: Number },
      _animationDuration: { type: Number },
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
      separator: "•",
      empty_message: "No entities passed the visible_if conditions",
    };
  }

  static async getConfigElement() {
    if (!customElements.get("strip-card-editor")) {
      customElements.define("strip-card-editor", StripCardEditor);
    }
    return document.createElement("strip-card-editor");
  }

  constructor() {
    super();
    this._nameReplace = [];
    this._templateCache = new Map();
    this._sidebarWidth = 0;
    this._scrollbarWidth = 0;
    this._sidebarResizeObserver = null;
    this._scrollbarResizeObserver = null;
    this._animationDuration = undefined;

    this._actionState = {
      timer: null,
      held: false,
      cooldown: null,
      startX: 0,
      startY: 0,
    };
  }

  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("The 'entities' list must be present in the configuration.");
    }
    const nr = config && config.name_replace ? config.name_replace : [];
    this._nameReplace = Array.isArray(nr) ? nr : [nr];

    this._config = {
      type: "custom:strip-card",
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
      border_radius: "0px",
      card_height: "50px",
      card_width: "400px",
      fading: false,
      vertical_scroll: false,
      vertical_alignment: "stack",
      continuous_scroll: true,
      transparent: false,
      scroll_speed: undefined,
      scroll_direction: "left",
      full_width: false,
      badge_style: false,
      badge_background: "var(--primary-background-color)",
      badge_label_color: "var(--secondary-text-color)",
      badge_value_color: "var(--primary-text-color)",
      badge_height: "28px",
      badge_font_size: "12px",
      badge_icon_size: "16px",
      // boş durumda gösterilecek varsayılan mesaj
      empty_message: "No entities passed the visible_if conditions",
      ...config,
    };

    this._animationDuration = undefined;
  }

  getCardSize() {
    return 1;
  }

  connectedCallback() {
    super.connectedCallback();
    this._setupSidebarObserver();
    this._setupScrollbarObserver();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._sidebarResizeObserver?.disconnect();
    this._scrollbarResizeObserver?.disconnect();
  }

  _setupSidebarObserver() {
    try {
      const homeAssistant = document.querySelector("home-assistant");
      const main = homeAssistant?.shadowRoot?.querySelector("home-assistant-main");
      const drawer = main?.shadowRoot?.querySelector("ha-drawer");
      const sidebar = drawer?.querySelector("ha-sidebar");

      if (sidebar) {
        this._updateSidebarWidth(sidebar);
        this._sidebarResizeObserver = new ResizeObserver(() => {
          this._updateSidebarWidth(sidebar);
        });
        this._sidebarResizeObserver.observe(sidebar);
      } else {
        setTimeout(() => this._setupSidebarObserver(), 1000);
      }
    } catch (e) {
      console.warn("[Strip Card] Sidebar observer setup failed", e);
    }
  }

  _setupScrollbarObserver() {
    try {
      this._updateScrollbarWidth();
      this._scrollbarResizeObserver = new ResizeObserver(() => {
        this._updateScrollbarWidth();
      });
      this._scrollbarResizeObserver.observe(document.documentElement);
    } catch (e) {
      console.warn("[Strip Card] Scrollbar observer setup failed", e);
    }
  }

  _updateSidebarWidth(sidebar) {
    if (!sidebar) return;
    try {
      const width = Math.ceil(sidebar.getBoundingClientRect().width) || 0;
      if (width !== this._sidebarWidth) {
        this._sidebarWidth = width;
        this.requestUpdate();
      }
    } catch (e) {
      console.warn("[Strip Card] Sidebar width update failed", e);
    }
  }

  _updateScrollbarWidth() {
    try {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth !== this._scrollbarWidth) {
        this._scrollbarWidth = scrollbarWidth;
        this.requestUpdate();
      }
    } catch (e) {
      console.warn("[Strip Card] Scrollbar width update failed", e);
    }
  }

  _fireMoreInfo(entityId) {
    const event = new Event("hass-more-info", {
      bubbles: true,
      composed: true,
    });
    event.detail = { entityId };
    this.dispatchEvent(event);
  }

  _handleDown(e) {
    this._actionState.held = false;
    this._actionState.startX = e.touches ? e.touches[0].clientX : e.clientX;
    this._actionState.startY = e.touches ? e.touches[0].clientY : e.clientY;

    this._actionState.timer = setTimeout(() => {
      this._actionState.held = true;
    }, 500);
  }

  _handleUp(e, entityConfig) {
    clearTimeout(this._actionState.timer);

    const currentX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const currentY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const diffX = Math.abs(currentX - this._actionState.startX);
    const diffY = Math.abs(currentY - this._actionState.startY);

    if (diffX > 10 || diffY > 10) return;

    if (this._actionState.held) {
      this._handleAction(entityConfig, "hold");
    } else {
      if (this._actionState.cooldown) {
        clearTimeout(this._actionState.cooldown);
        this._actionState.cooldown = null;
        this._handleAction(entityConfig, "double_tap");
      } else {
        this._actionState.cooldown = setTimeout(() => {
          this._actionState.cooldown = null;
          this._handleAction(entityConfig, "tap");
        }, 250);
      }
    }
  }

  _handleAction(entityConfig, actionType) {
    if (!this.hass || !entityConfig) return;

    let actionConfig = entityConfig[`${actionType}_action`];

    if (!actionConfig && actionType === "tap") {
      actionConfig = { action: "more-info" };
    } else if (!actionConfig) {
      return;
    }

    if (actionConfig.action === "none") return;

    switch (actionConfig.action) {
      case "more-info":
        if (entityConfig.entity) this._fireMoreInfo(entityConfig.entity);
        return;

      case "toggle":
        if (entityConfig.entity) {
          this.hass.callService("homeassistant", "toggle", {
            entity_id: entityConfig.entity,
          });
        }
        return;

      case "navigate":
        if (actionConfig.navigation_path) {
          window.history.pushState(null, "", actionConfig.navigation_path);
          window.dispatchEvent(new Event("location-changed"));
        }
        return;

      case "url":
        if (actionConfig.url_path) {
          window.open(
            actionConfig.url_path,
            actionConfig.new_tab === false ? "_self" : "_blank"
          );
        }
        return;

      case "perform-action":
      case "call-service":
        const svc = actionConfig.perform_action || actionConfig.service || "";
        if (!svc) return;
        const [domain, service] = svc.split(".");

        let data = actionConfig.data || {};
        const target = actionConfig.target || {};

        if (typeof data === "string") {
          try {
            data = JSON.parse(data);
          } catch (e) {
            data = {};
          }
        } else {
          data = { ...data };
        }

        if (target.entity_id) {
          data.entity_id = target.entity_id;
        } else if (!data.entity_id && entityConfig.entity) {
          data.entity_id = entityConfig.entity;
        }

        this.hass.callService(domain, service, data);
        return;

      case "assist":
        const ev = new Event("hass-start-voice-assistant", {
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(ev);
        return;

      default:
        if (actionType === "tap" && entityConfig.entity)
          this._fireMoreInfo(entityConfig.entity);
        return;
    }
  }

  evaluateTemplate(template, hass, vars = {}) {
    if (!template || typeof template !== "string") return template;
    if (!template.includes("{{")) return template;

    try {
      const match = template.match(/{{(.*?)}}/s);
      if (!match) return template;
      const expression = match[1];

      const func = new Function(
        "hass",
        "vars",
        `
        "use strict";

        const { item, entity, index, stateObj } = vars || {};

        const float = (v) => parseFloat(v) || 0;
        const int = (v) => parseInt(v, 10) || 0;
        const user = hass.user;

        const states = new Proxy(
          (entity_id) => {
            const st = hass.states[entity_id];
            return st ? st.state : 'unknown';
          },
          {
            get(target, prop) {
              if (prop in target) return target[prop];
              if (prop === 'toJSON') return undefined;
              const key = String(prop);
              const st = hass.states[key];
              return st || {
                state: 'unavailable',
                attributes: {},
                last_changed: '',
                last_updated: '',
              };
            },
          }
        );

        const state_attr = (entity_id, attr) => {
          const st = hass.states[entity_id];
          return st ? st.attributes?.[attr] : undefined;
        };

        const is_state = (entity_id, value) => {
          const st = hass.states[entity_id];
          return st && st.state === value;
        };

        const now = () => new Date();

        return (${expression.trim()});
      `
      );

      return func(hass, vars);
    } catch (e) {
      console.warn("[Strip Card] Template evaluation failed:", e, template);
      return "";
    }
  }

  _interpolateTemplateString(str, hass, vars = {}) {
    if (str == null || typeof str !== "string" || !str.includes("{{")) {
      return str;
    }

    return str.replace(/{{([\s\S]*?)}}/g, (_, expr) => {
      try {
        const value = this.evaluateTemplate(`{{${expr}}}`, hass, vars);
        if (value === undefined || value === null) return "";
        return String(value);
      } catch (e) {
        console.warn("[Strip Card] Interpolation failed:", e, expr);
        return "";
      }
    });
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

  _expandEntityConfig(entityConfig) {
    const entityId =
      typeof entityConfig === "string" ? entityConfig : entityConfig.entity;

    // repeat_on yoksa tekil davranış
    if (!entityConfig || !entityConfig.repeat_on) {
      return [
        {
          entityConfig,
          vars: {
            entity: entityId,
            index: 0,
            item: undefined,
            stateObj: entityId ? this.hass.states[entityId] : null,
          },
        },
      ];
    }

    const varsBase = {
      entity: entityId,
      stateObj: entityId ? this.hass.states[entityId] : null,
    };

    const raw = this.evaluateTemplate(entityConfig.repeat_on, this.hass, varsBase);

    // undefined / null / false / "" => entity görünmesin
    if (!raw) return [];

    const arr = Array.isArray(raw) ? raw : [raw];
    if (arr.length === 0) return [];

    return arr.map((item, index) => ({
      entityConfig,
      vars: { ...varsBase, item, index },
    }));
  }

  updated(changedProps) {
    super.updated(changedProps);
    if (!this._config || !this.hass) return;

    if (
      this._config.scroll_speed === undefined ||
      this._config.scroll_speed === null
    ) {
      const dRaw = this.evaluateTemplate(
        String(this._config.duration),
        this.hass
      );
      const baseDuration = parseFloat(dRaw) || 20;
      if (
        !isNaN(baseDuration) &&
        baseDuration > 0 &&
        this._animationDuration !== baseDuration
      ) {
        this._animationDuration = baseDuration;
      }
      return;
    }

    const sRaw = this.evaluateTemplate(
      String(this._config.scroll_speed),
      this.hass
    );
    const speed = parseFloat(sRaw);
    if (isNaN(speed) || speed <= 0) {
      return;
    }

    const ticker = this.renderRoot?.querySelector(".ticker-move");
    if (!ticker) return;

    const isVertical = !!this._config.vertical_scroll;
    const totalLength = isVertical ? ticker.scrollHeight : ticker.scrollWidth;
    if (!totalLength || totalLength <= 0) return;

    const distance = totalLength * 0.5;
    const newDuration = distance / speed;

    if (!isNaN(newDuration) && newDuration > 0) {
      if (
        !this._animationDuration ||
        Math.abs(this._animationDuration - newDuration) > 0.1
      ) {
        this._animationDuration = newDuration;
      }
    }
  }

  render() {
    if (!this._config || !this.hass) return html``;

    const dRaw = this.evaluateTemplate(
      String(this._config.duration),
      this.hass
    );
    const baseDuration = parseFloat(dRaw) || 20;
    const duration = this._animationDuration || baseDuration;

    const title = this._interpolateTemplateString(this._config.title, this.hass);
    const fontSize = this._interpolateTemplateString(
      this._config.font_size,
      this.hass
    );
    const borderRadius = this._interpolateTemplateString(
      this._config.border_radius,
      this.hass
    );
    const cardHeight = this._interpolateTemplateString(
      this._config.card_height,
      this.hass
    );
    const cardWidth = this._interpolateTemplateString(
      this._config.card_width,
      this.hass
    );

    const badgeHeight =
      this._interpolateTemplateString(
        this._config.badge_height,
        this.hass
      ) || "28px";
    const badgeFontSize =
      this._interpolateTemplateString(
        this._config.badge_font_size,
        this.hass
      ) || "12px";
    const badgeIconSize =
      this._interpolateTemplateString(
        this._config.badge_icon_size,
        this.hass
      ) || "16px";

    const cardWidthStyle =
      cardWidth && !this._config.full_width
        ? `--strip-card-width: ${cardWidth};`
        : "";

    let fadingClass = this._config.fading ? "has-fading" : "";
    const verticalClass = this._config.vertical_scroll
      ? "has-vertical-scroll"
      : "";
    const verticalAlignmentClass =
      this._config.vertical_alignment === "inline"
        ? "has-inline-vertical-alignment"
        : "";
    const animationIteration = this._config.continuous_scroll ? "infinite" : "1";

    let transparentStyle = "";
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
      --strip-card-font-size: ${fontSize};
      --strip-card-border-radius: ${borderRadius};
      --strip-card-height: ${cardHeight};
      --strip-card-badge-height: ${badgeHeight};
      --strip-card-badge-font-size: ${badgeFontSize};
      --strip-card-badge-icon-size: ${badgeIconSize};
      ${cardWidthStyle}
      ${transparentStyle}
    `;

    const renderedEntities = (this._config.entities || [])
      .flatMap((entityConfig) => this._expandEntityConfig(entityConfig))
      .map(({ entityConfig, vars }) => this.renderEntity(entityConfig, vars))
      .filter(Boolean);
    const hasEntities = renderedEntities.length > 0;
    const isEmptyState = !hasEntities;
    // Fade makes empty-state messages hard to read; disable fading when there are no visible entities.
    if (isEmptyState) fadingClass = "";

    let content;
    let emptyMessage = "";

    if (hasEntities) {
      content = renderedEntities;

      if (this._config.continuous_scroll && !this._config.vertical_scroll) {
        const containerWidth = this.getBoundingClientRect().width || 400;
        const divisor = renderedEntities.length * 100 || 100;
        const minCopies = Math.ceil(containerWidth / divisor) + 2;
        const copies = minCopies > 2 ? minCopies : 2;
        content = [];
        for (let i = 0; i < copies; i++) {
          content.push(...renderedEntities);
        }
      }
    } else {
      // Hiç görünür entity yok: kart yine render edilir
      const msgRaw = this._config.empty_message;

      // Support disabling via empty_message: false/null/""
      if (msgRaw !== false && msgRaw !== null && msgRaw !== undefined) {
        emptyMessage =
          this._interpolateTemplateString(String(msgRaw), this.hass) ||
          "";
      }

      if (emptyMessage) {
        const emptyItem = html`
          <div class="ticker-item empty">
            <span class="empty-text">${emptyMessage}</span>
          </div>
        `;

        // If continuous horizontal scroll is enabled, duplicate the empty item so it loops smoothly
        // (otherwise it scrolls off-screen and leaves a blank gap).
        if (this._config.continuous_scroll && !this._config.vertical_scroll) {
          const containerWidth = this.getBoundingClientRect().width || 400;
          const approxItemWidth = 200;
          const minCopies = Math.ceil(containerWidth / approxItemWidth) + 2;
          const copies = minCopies > 2 ? minCopies : 2;
          content = [];
          for (let i = 0; i < copies; i++) {
            content.push(emptyItem);
          }
        } else {
          content = [emptyItem];
        }
      } else {
        // Mesaj yoksa boş içerik, ama ha-card ve ticker yapısı durur
        content = [];
      }
    }

    let animationName = "";
    if (this._config.vertical_scroll) {
      animationName =
        this._config.vertical_alignment === "inline"
          ? "vertical-ticker-inline"
          : "vertical-ticker";
    } else {
      const dir = this._config.scroll_direction || "left";
      animationName = dir === "right" ? "ticker-right" : "ticker";
    }


    const disableAnimation = !hasEntities && this._config.continuous_scroll === false;
    const effectiveAnimationName = disableAnimation ? "none" : animationName;
    const effectiveDuration = disableAnimation ? 0 : duration;
    const effectiveIteration = disableAnimation ? "1" : animationIteration;
    const emptyStateClass = !hasEntities ? " empty-state" : "";

    const wrapperClass = this._config.full_width
      ? "strip-card-wrapper full-width"
      : "strip-card-wrapper";
    const wrapperStyle = this._config.full_width
      ? `--sidebar-width: ${this._sidebarWidth}px; --scrollbar-width: ${this._scrollbarWidth}px;`
      : "";

    return html`
      <div class="${wrapperClass}" style="${wrapperStyle}">
        <ha-card .header="${title}" style="${cardStyles}">
          <div
            class="ticker-wrap ${this._config.pause_on_hover
              ? "pausable"
              : ""} ${fadingClass} ${verticalClass}${emptyStateClass}"
          >
            <div
              class="ticker-move ${verticalAlignmentClass}"
              style="
                animation-duration: ${effectiveDuration}s;
                animation-iteration-count: ${effectiveIteration};
                animation-name: ${effectiveAnimationName};
              "
            >
              ${content}
            </div>
          </div>
        </ha-card>
      </div>
    `;
  }

  renderEntity(entityConfig, vars = {}) {
    const entityId =
      typeof entityConfig === "string" ? entityConfig : entityConfig.entity;

    const stateObj = vars.stateObj ?? (entityId ? this.hass.states[entityId] : null);
    const templateVars = {
      ...vars,
      entity: vars.entity !== undefined ? vars.entity : entityId,
      stateObj,
    };

    if (entityConfig.visible_if) {
      let isVisible = this.evaluateTemplate(
        entityConfig.visible_if,
        this.hass,
        templateVars
      );
      if (String(isVisible).toLowerCase() === "false") {
        isVisible = false;
      }
      if (!isVisible) {
        return null;
      }
    }

    if (entityId && !stateObj) {
      return html`<div class="ticker-item error">
        Unknown Entity: ${entityId}
      </div>`;
    }

    if (!entityId && !entityConfig.value_template) {
      return html`<div class="ticker-item error">
        Must specify entity or value_template
      </div>`;
    }

    let value = stateObj ? stateObj.state : "";

    if (
      stateObj &&
      entityConfig.attribute &&
      stateObj.attributes[entityConfig.attribute] !== undefined
    ) {
      value = stateObj.attributes[entityConfig.attribute];
    }

    if (entityConfig.value_template) {
      value = this.evaluateTemplate(entityConfig.value_template, this.hass, templateVars);
    }

    if (typeof value === "string" && value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }

    const rawName = stateObj
      ? stateObj.attributes.friendly_name || entityId
      : "";

    let name;
    if (entityConfig.name === "") {
      name = "";
    } else if (entityConfig.name) {
      name = this._interpolateTemplateString(entityConfig.name, this.hass, templateVars);
    } else {
      name = this._sanitizeName(rawName);
    }

    let unit = "";
    if (entityConfig.unit !== undefined) {
      unit = entityConfig.unit;
    } else if (stateObj && stateObj.attributes.unit_of_measurement) {
      unit = stateObj.attributes.unit_of_measurement;
    }
    unit = this._interpolateTemplateString(unit, this.hass, templateVars);

    const separatorRaw =
      entityConfig.separator !== undefined
        ? entityConfig.separator
        : this._config.separator;
    const separator = this._interpolateTemplateString(
      separatorRaw,
      this.hass,
      templateVars
    );

    let showIconRaw = entityConfig.show_icon;
    if (
      showIconRaw === undefined ||
      showIconRaw === null ||
      showIconRaw === ""
    ) {
      showIconRaw = this._config.show_icon;
    }
    if (showIconRaw === "true") showIconRaw = true;
    if (showIconRaw === "false") showIconRaw = false;

    let showIcon = this.evaluateTemplate(showIconRaw, this.hass, templateVars);

    const nameColorRaw = entityConfig.name_color || this._config.name_color;
    const valueColorRaw = entityConfig.value_color || this._config.value_color;
    const unitColorRaw = entityConfig.unit_color || this._config.unit_color;
    const iconColorRaw = entityConfig.icon_color || this._config.icon_color;

    const nameColor = this._interpolateTemplateString(
      nameColorRaw,
      this.hass,
      templateVars
    );
    const valueColor = this._interpolateTemplateString(
      valueColorRaw,
      this.hass,
      templateVars
    );
    const unitColor = this._interpolateTemplateString(
      unitColorRaw,
      this.hass,
      templateVars
    );
    const iconColor = this._interpolateTemplateString(
      iconColorRaw,
      this.hass,
      templateVars
    );

    let customIcon = entityConfig.icon;
    if (typeof customIcon === "string" && customIcon.includes("{{")) {
      customIcon = this.evaluateTemplate(customIcon, this.hass, templateVars);
    } else {
      customIcon = this._interpolateTemplateString(customIcon, this.hass, templateVars);
    }

    const valuePart = html`<span class="value" style="color: ${valueColor};"
      >${value}</span
    >`;
    const unitPart = html`<span class="unit" style="color: ${unitColor};"
      >${unit}</span
    >`;

    const titleName = name || rawName;
    const titleText = `${titleName}: ${value} ${unit}`;

    const isBadge = this._config.badge_style;

    if (isBadge) {
      const badgeBackground = this._interpolateTemplateString(
        entityConfig.badge_background || this._config.badge_background,
        this.hass,
        templateVars
      );
      const badgeLabelColor = this._interpolateTemplateString(
        entityConfig.badge_label_color || this._config.badge_label_color,
        this.hass,
        templateVars
      );
      const badgeValueColor = this._interpolateTemplateString(
        entityConfig.badge_value_color || this._config.badge_value_color,
        this.hass,
        templateVars
      );

      const labelText = name || titleName;

      return html`
        <div
          class="ticker-item chip-item"
          @mousedown=${this._handleDown}
          @mouseup=${(e) => this._handleUp(e, entityConfig)}
          @touchstart=${this._handleDown}
          @touchend=${(e) => this._handleUp(e, entityConfig)}
          title="${titleText}"
        >
          <div
            class="chip ${labelText ? "has-label" : ""}"
            style="background: ${badgeBackground};"
          >
            ${showIcon
              ? customIcon
                ? html`<ha-icon
                    class="chip-icon"
                    .icon=${customIcon}
                    style="color: ${iconColor};"
                  ></ha-icon>`
                : stateObj
                ? html`<state-badge
                    class="chip-icon"
                    .hass=${this.hass}
                    .stateObj=${stateObj}
                  ></state-badge>`
                : ""
              : ""}

            <div class="chip-text">
              ${labelText
                ? html`<span
                    class="chip-label"
                    style="color: ${badgeLabelColor};"
                    >${labelText}</span
                  >`
                : ""}
              <span class="chip-value" style="color: ${badgeValueColor};">
                <span class="value">${value}</span>
                ${unit
                  ? html`<span class="unit">${unit}</span>`
                  : ""}
              </span>
            </div>
          </div>
        </div>
      `;
    }

    // NORMAL STRIP MODU
    return html`
      <div
        class="ticker-item"
        @mousedown=${this._handleDown}
        @mouseup=${(e) => this._handleUp(e, entityConfig)}
        @touchstart=${this._handleDown}
        @touchend=${(e) => this._handleUp(e, entityConfig)}
        title="${titleText}"
      >
        ${showIcon
          ? customIcon
            ? html`<ha-icon
                class="icon"
                .icon=${customIcon}
                style="color: ${iconColor};"
              ></ha-icon>`
            : stateObj
            ? html`<state-badge
                class="icon"
                .hass=${this.hass}
                .stateObj=${stateObj}
              ></state-badge>`
            : ""
          : ""}
        ${name
          ? html`<span class="name" style="color: ${nameColor};"
              >${name}:</span
            >`
          : ""}
        ${valuePart}${unitPart}
        <span class="separator">${separator}</span>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      .strip-card-wrapper {
        display: flex;
        justify-content: center;
        width: 100%;
        position: relative;
      }

      .strip-card-wrapper.full-width {
        position: relative;
        margin-left: calc(-50vw + 50% + var(--sidebar-width, 256px) / 2);
        width: calc(
          100vw - var(--sidebar-width, 256px) - var(--scrollbar-width, 0px)
        );
      }

      .strip-card-wrapper.full-width ha-card {
        width: 100% !important;
        max-width: 100% !important;
      }

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

      .ticker-wrap.empty-state {
        justify-content: center;
      }

      .ticker-item.empty {
        cursor: default;
        opacity: 0.7;
      }

      .ticker-item.empty .empty-text {
        display: inline-block;
        max-width: 100%;
        white-space: normal;
        text-align: center;
      }

      .ticker-wrap.has-vertical-scroll {
        flex-direction: column;
        height: var(--strip-card-height, 50px);
        overflow: hidden;
      }
      .ticker-wrap.has-fading {
        -webkit-mask-image: linear-gradient(
          to right,
          rgba(0, 0, 0, 0) 0%,
          rgba(0, 0, 0, 1) 15%,
          rgba(0, 0, 0, 1) 85%,
          rgba(0, 0, 0, 0) 100%
        );
        mask-image: linear-gradient(
          to right,
          rgba(0, 0, 0, 0) 0%,
          rgba(0, 0, 0, 1) 15%,
          rgba(0, 0, 0, 1) 85%,
          rgba(0, 0, 0, 0) 100%
        );
      }
      .ticker-wrap.has-vertical-scroll.has-fading {
        -webkit-mask-image: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0) 0%,
          rgba(0, 0, 0, 1) 15%,
          rgba(0, 0, 0, 1) 85%,
          rgba(0, 0, 0, 0) 100%
        );
        mask-image: linear-gradient(
          to bottom,
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
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }
      .ticker-move.has-inline-vertical-alignment {
        display: block;
        height: max-content;
      }
      .ticker-wrap.has-vertical-scroll .ticker-move {
        white-space: normal;
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
        user-select: none;
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

      .chip-item {
        display: inline-flex;
        align-items: center;
        margin: 0 0.4rem;
        font-size: var(--strip-card-font-size, 14px);
        vertical-align: middle;
      }

      .chip {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        margin-right: 8px;
        height: var(--strip-card-badge-height, 28px);
        line-height: 1;
        border-radius: 999px;
        cursor: pointer;
        font-size: var(--strip-card-badge-font-size, 12px);
        white-space: nowrap;
        box-sizing: border-box;
        background: var(--primary-background-color);
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06),
          0 0 0 1px rgba(15, 23, 42, 0.04);
        transition: background-color 0.2s ease, box-shadow 0.2s ease,
          transform 0.15s ease;
      }

      .chip:hover {
        box-shadow: 0 4px 8px rgba(15, 23, 42, 0.1),
          0 0 0 1px rgba(15, 23, 42, 0.06);
        transform: translateY(-1px);
      }

      .chip:active {
        transform: translateY(0);
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12),
          0 0 0 1px rgba(15, 23, 42, 0.08);
      }

      .chip-icon {
        --mdc-icon-size: var(--strip-card-badge-icon-size, 16px);
        width: var(--strip-card-badge-icon-size, 16px);
        height: var(--strip-card-badge-icon-size, 16px);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .chip-text {
        display: flex;
        flex-direction: row;
        gap: 4px;
        align-items: center;
        justify-content: center;
        line-height: 1.1;
      }

      .chip-label {
        font-size: 0.8em;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        opacity: 0.75;
      }

      .chip-value {
        font-weight: 600;
        font-size: 1em;
      }

      @keyframes ticker {
        0% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(-50%);
        }
      }
      @keyframes ticker-right {
        0% {
          transform: translateX(-50%);
        }
        100% {
          transform: translateX(0);
        }
      }
      @keyframes vertical-ticker {
        0% {
          transform: translateY(0);
        }
        100% {
          transform: translateY(-50%);
        }
      }
      @keyframes vertical-ticker-inline {
        0% {
          transform: translateY(0);
        }
        100% {
          transform: translateY(-50%);
        }
      }
    `;
  }
}

customElements.define("strip-card", StripCard);

class StripCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: { type: Object },
      _openGlobal: { type: Boolean },
      _openColors: { type: Boolean },
      _openEntities: { type: Boolean },
      _expandedEntities: { type: Object },
    };
  }

  constructor() {
    super();
    this._openGlobal = true;
    this._openColors = false;
    this._openEntities = true;
    this._expandedEntities = new Set();
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
      border_radius: "0px",
      card_height: "50px",
      card_width: "400px",
      fading: false,
      vertical_scroll: false,
      vertical_alignment: "stack",
      continuous_scroll: true,
      transparent: false,
      scroll_speed: undefined,
      scroll_direction: "left",
      full_width: false,
      badge_style: false,
      badge_background: "var(--primary-background-color)",
      badge_label_color: "var(--secondary-text-color)",
      badge_value_color: "var(--primary-text-color)",
      badge_height: "28px",
      badge_font_size: "12px",
      badge_icon_size: "16px",
      ...config,
    };

    if (!this._config.entities) {
      this._config.entities = [];
    }
  }

  get value() {
    return this._config;
  }

  _orderConfig(cfg) {
    if (!cfg) return cfg;

    // İstediğiniz ana sıralama
    const order = [
      "type",
      "title",
      "entities",

      // sonra global ayarlar (kendi tercihinize göre genişletebilirsiniz)
      "duration",
      "scroll_speed",
      "scroll_direction",
      "separator",
      "empty_message",

      "font_size",
      "card_width",
      "card_height",
      "border_radius",

      "show_icon",
      "pause_on_hover",
      "continuous_scroll",
      "vertical_scroll",
      "vertical_alignment",
      "fading",
      "transparent",
      "full_width",

      "badge_style",
      "badge_background",
      "badge_label_color",
      "badge_value_color",
      "badge_height",
      "badge_font_size",
      "badge_icon_size",

      // name_replace vb. eklemek isterseniz buraya koyun:
      "name_replace",
    ];

    const out = {};

    // 1) Öncelikli anahtarları sırayla koy
    for (const k of order) {
      if (k in cfg) out[k] = cfg[k];
    }

    // 2) Listede olmayan ama config'de bulunan anahtarları en sona ekle
    for (const k of Object.keys(cfg)) {
      if (!(k in out)) out[k] = cfg[k];
    }

    // type yoksa yine de garanti et
    if (!("type" in out)) out.type = "custom:strip-card";

    return out;
  }


  _emitConfigChanged() {
    const ordered = this._orderConfig(this._config);
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: ordered },
        bubbles: true,
        composed: true,
      })
    );
  }

  _valueChanged(ev) {
    if (!this._config) return;
    const target = ev.target;
    const path = target.configValue;
    if (!path) return;

    let value;
    if (ev.detail && ev.detail.value !== undefined) {
      value = ev.detail.value;
    } else if ("checked" in target) {
      value = target.checked;
    } else {
      value = target.value;
    }

    if (path.endsWith(".show_icon") && value === "global") {
      value = "";
    }

    const newConfig = { ...this._config };
    const segments = path.split(".");
    let obj = newConfig;

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const idx = Number(seg);
      if (Array.isArray(obj) && !Number.isNaN(idx)) {
        if (!obj[idx]) obj[idx] = {};
        obj = obj[idx];
      } else {
        if (!obj[seg]) obj[seg] = {};
        obj = obj[seg];
      }
    }

    const last = segments[segments.length - 1];
    if (value === "" || value === null || value === undefined) {
      if (Array.isArray(obj)) {
        const idx = Number(last);
        if (!Number.isNaN(idx)) obj.splice(idx, 1);
      } else {
        delete obj[last];
      }
    } else {
      if (Array.isArray(obj)) {
        const idx = Number(last);
        if (!Number.isNaN(idx)) obj[idx] = value;
      } else {
        obj[last] = value;
      }
    }

    this._config = newConfig;
    this._emitConfigChanged();
  }

  _actionChanged(ev, index, actionType) {
    ev.stopPropagation();
    const newActionConfig = ev.detail.value;

    const newConfig = JSON.parse(JSON.stringify(this._config));
    if (!newConfig.entities[index]) {
      newConfig.entities[index] = {};
    }
    newConfig.entities[index][actionType] = newActionConfig;
    this._config = newConfig;
    this._emitConfigChanged();
  }

  _addEntity() {
    const newConfig = JSON.parse(JSON.stringify(this._config));
    if (!Array.isArray(newConfig.entities)) {
      newConfig.entities = [];
    }
    newConfig.entities.push({
      entity: "",
      name: "",
      unit: "",
      attribute: "",
      value_template: "",
      repeat_on: "",
    });

    const newIndex = newConfig.entities.length - 1;
    this._expandedEntities.add(newIndex);
    this._expandedEntities = new Set(this._expandedEntities);

    this._config = newConfig;
    this._emitConfigChanged();
  }

  _removeEntity(index) {
    const newConfig = JSON.parse(JSON.stringify(this._config));
    if (!Array.isArray(newConfig.entities)) return;
    newConfig.entities.splice(index, 1);
    this._config = newConfig;

    const newSet = new Set();
    this._expandedEntities.forEach((i) => {
      if (i < index) newSet.add(i);
      if (i > index) newSet.add(i - 1);
    });
    this._expandedEntities = newSet;

    this._emitConfigChanged();
  }

  _toggleSection(section) {
    if (section === "global") {
      this._openGlobal = !this._openGlobal;
    } else if (section === "colors") {
      this._openColors = !this._openColors;
    } else if (section === "entities") {
      this._openEntities = !this._openEntities;
    }
  }

  _toggleEmptyMessage(ev) {
    if (!this._config) return;
    const checked = ev.target?.checked === true;
    const newConfig = { ...this._config };

    if (!checked) {
      newConfig.empty_message = false;
    } else {
      if (newConfig.empty_message === false || newConfig.empty_message === null || newConfig.empty_message === undefined) {
        newConfig.empty_message = "No entities passed the visible_if conditions";
      }
    }

    this._config = newConfig;
    this._emitConfigChanged();
  }


  _toggleEntity(index) {
    const newSet = new Set(this._expandedEntities);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    this._expandedEntities = newSet;
    this.requestUpdate();
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const cfg = this._config;

    return html`
      <div class="strip-card-editor">
        <div class="section">
          <button
            class="section-header"
            type="button"
            @click=${() => this._toggleSection("global")}
          >
            <span>✨ Global Settings</span>
            <ha-icon
              icon=${this._openGlobal ? "mdi:chevron-up" : "mdi:chevron-down"}
            ></ha-icon>
          </button>
          ${this._openGlobal
            ? html`
                <div class="section-body">
                  <div class="grid grid-global">
                    <ha-textfield
                      label="Title"
                      .value=${cfg.title || ""}
                      .configValue=${"title"}
                      @input=${this._valueChanged}
                      placeholder="Static or {{ template }}"
                    ></ha-textfield>

                    <ha-textfield
                      label="Duration (s)"
                      type="number"
                      .value=${cfg.duration != null
                        ? String(cfg.duration)
                        : ""}
                      .configValue=${"duration"}
                      @input=${this._valueChanged}
                      placeholder="20"
                    ></ha-textfield>

                    <ha-textfield
                      label="Scroll speed (px/s)"
                      type="number"
                      .value=${cfg.scroll_speed != null
                        ? String(cfg.scroll_speed)
                        : ""}
                      .configValue=${"scroll_speed"}
                      @input=${this._valueChanged}
                      placeholder="Empty = use duration"
                    ></ha-textfield>

                    <ha-select
                      label="Direction"
                      .value=${cfg.scroll_direction || "left"}
                      .configValue=${"scroll_direction"}
                      @selected=${this._valueChanged}
                      @closed=${(e) => e.stopPropagation()}
                    >
                      <mwc-list-item value="left">Left</mwc-list-item>
                      <mwc-list-item value="right">Right</mwc-list-item>
                    </ha-select>

                    <ha-textfield
                      label="Separator"
                      .value=${cfg.separator || ""}
                      .configValue=${"separator"}
                      @input=${this._valueChanged}
                      placeholder="• or {{ template }}"
                    ></ha-textfield>

                    <ha-textfield
                      label="Empty message"
                      .value=${cfg.empty_message === false ? "" : (cfg.empty_message || "")}
                      .configValue=${"empty_message"}
                      @input=${this._valueChanged}
                      placeholder="Leave empty to disable; supports {{ template }}"
                      ?disabled=${cfg.empty_message === false}
                    ></ha-textfield>

                    <ha-textfield
                      label="Font size"
                      .value=${cfg.font_size || ""}
                      .configValue=${"font_size"}
                      @input=${this._valueChanged}
                      placeholder="14px"
                    ></ha-textfield>

                    <ha-textfield
                      label="Card width"
                      .value=${cfg.card_width || ""}
                      .configValue=${"card_width"}
                      @input=${this._valueChanged}
                      placeholder="400px"
                    ></ha-textfield>

                    <ha-textfield
                      label="Card height"
                      .value=${cfg.card_height || ""}
                      .configValue=${"card_height"}
                      @input=${this._valueChanged}
                      placeholder="50px"
                    ></ha-textfield>

                    <ha-textfield
                      label="Border radius"
                      .value=${cfg.border_radius || ""}
                      .configValue=${"border_radius"}
                      @input=${this._valueChanged}
                      placeholder="0px"
                    ></ha-textfield>          </div>

                  <div class="toggle-row">
                    <span>Show empty message</span>
                    <ha-switch
                      .checked=${cfg.empty_message !== false}
                      @change=${this._toggleEmptyMessage}
                    ></ha-switch>
                  </div>

                  ${cfg.badge_style
                    ? html`
                        <h4>Badge Mode Layout</h4>
                        <div class="grid grid-small">
                          <ha-textfield
                            label="Badge Height"
                            .value=${cfg.badge_height || ""}
                            .configValue=${"badge_height"}
                            @input=${this._valueChanged}
                            placeholder="28px"
                          ></ha-textfield>

                          <ha-textfield
                            label="Badge Font Size"
                            .value=${cfg.badge_font_size || ""}
                            .configValue=${"badge_font_size"}
                            @input=${this._valueChanged}
                            placeholder="12px"
                          ></ha-textfield>

                          <ha-textfield
                            label="Badge Icon Size"
                            .value=${cfg.badge_icon_size || ""}
                            .configValue=${"badge_icon_size"}
                            @input=${this._valueChanged}
                            placeholder="16px"
                          ></ha-textfield>
                        </div>
                      `
                    : ""}

                  <h4>Other Settings</h4>
                  <div class="grid grid-small">
                    <div class="toggle-row">
                      <span>Show icon (default)</span>
                      <ha-switch
                        .checked=${cfg.show_icon === true}
                        .configValue=${"show_icon"}
                        @change=${this._valueChanged}
                      ></ha-switch>
                    </div>

                    <div class="toggle-row">
                      <span>Pause on hover</span>
                      <ha-switch
                        .checked=${cfg.pause_on_hover === true}
                        .configValue=${"pause_on_hover"}
                        @change=${this._valueChanged}
                      ></ha-switch>
                    </div>

                    <div class="toggle-row">
                      <span>Continuous scroll</span>
                      <ha-switch
                        .checked=${cfg.continuous_scroll !== false}
                        .configValue=${"continuous_scroll"}
                        @change=${this._valueChanged}
                      ></ha-switch>
                    </div>

                    <div class="toggle-row">
                      <span>Vertical scroll</span>
                      <ha-switch
                        .checked=${cfg.vertical_scroll === true}
                        .configValue=${"vertical_scroll"}
                        @change=${this._valueChanged}
                      ></ha-switch>
                    </div>

                    <div class="toggle-row">
                      <span>Fading edges</span>
                      <ha-switch
                        .checked=${cfg.fading === true}
                        .configValue=${"fading"}
                        @change=${this._valueChanged}
                      ></ha-switch>
                    </div>

                    <div class="toggle-row">
                      <span>Transparent card</span>
                      <ha-switch
                        .checked=${cfg.transparent === true}
                        .configValue=${"transparent"}
                        @change=${this._valueChanged}
                      ></ha-switch>
                    </div>

                    <div class="toggle-row">
                      <span>Full width</span>
                      <ha-switch
                        .checked=${cfg.full_width === true}
                        .configValue=${"full_width"}
                        @change=${this._valueChanged}
                      ></ha-switch>
                    </div>

                    <div class="toggle-row">
                      <span>Badge Style</span>
                      <ha-switch
                        .checked=${cfg.badge_style === true}
                        .configValue=${"badge_style"}
                        @change=${this._valueChanged}
                      ></ha-switch>
                    </div>
                  </div>

                  <div class="grid">
                    <ha-select
                      label="Vertical alignment"
                      .value=${cfg.vertical_alignment || "stack"}
                      .configValue=${"vertical_alignment"}
                      @selected=${this._valueChanged}
                      @closed=${(e) => e.stopPropagation()}
                    >
                      <mwc-list-item value="stack">Stack</mwc-list-item>
                      <mwc-list-item value="inline">Inline</mwc-list-item>
                    </ha-select>
                  </div>
                </div>
              `
            : ""}
        </div>

        <div class="section">
          <button
            class="section-header"
            type="button"
            @click=${() => this._toggleSection("colors")}
          >
            <span>🎨 Global Colors</span>
            <ha-icon
              icon=${this._openColors ? "mdi:chevron-up" : "mdi:chevron-down"}
            ></ha-icon>
          </button>
          ${this._openColors
            ? html`
                <div class="section-body">
                  <div class="grid">
                    <ha-textfield
                      label="Name color"
                      .value=${cfg.name_color || ""}
                      .configValue=${"name_color"}
                      @input=${this._valueChanged}
                    ></ha-textfield>

                    <ha-textfield
                      label="Value color"
                      .value=${cfg.value_color || ""}
                      .configValue=${"value_color"}
                      @input=${this._valueChanged}
                    ></ha-textfield>

                    <ha-textfield
                      label="Unit color"
                      .value=${cfg.unit_color || ""}
                      .configValue=${"unit_color"}
                      @input=${this._valueChanged}
                    ></ha-textfield>

                    <ha-textfield
                      label="Icon color"
                      .value=${cfg.icon_color || ""}
                      .configValue=${"icon_color"}
                      @input=${this._valueChanged}
                    ></ha-textfield>
                  </div>

                  ${cfg.badge_style
                    ? html`
                        <h4>Badge Colors</h4>
                        <div class="grid">
                          <ha-textfield
                            label="Badge Background"
                            .value=${cfg.badge_background || ""}
                            .configValue=${"badge_background"}
                            @input=${this._valueChanged}
                          ></ha-textfield>

                          <ha-textfield
                            label="Badge Label Color"
                            .value=${cfg.badge_label_color || ""}
                            .configValue=${"badge_label_color"}
                            @input=${this._valueChanged}
                          ></ha-textfield>

                          <ha-textfield
                            label="Badge Value Color"
                            .value=${cfg.badge_value_color || ""}
                            .configValue=${"badge_value_color"}
                            @input=${this._valueChanged}
                          ></ha-textfield>
                        </div>
                      `
                    : ""}
                </div>
              `
            : ""}
        </div>

        <div class="section">
          <button
            class="section-header"
            type="button"
            @click=${() => this._toggleSection("entities")}
          >
            <span>🧸 Entities</span>
            <ha-icon
              icon=${this._openEntities
                ? "mdi:chevron-up"
                : "mdi:chevron-down"}
            ></ha-icon>
          </button>
          ${this._openEntities
            ? html`
                <div class="section-body">
                  ${(cfg.entities || []).map((ent, i) =>
                    this._renderEntity(ent, i)
                  )}

                  <mwc-button
                    raised
                    class="add-entity-button"
                    @click=${this._addEntity}
                  >
                    <ha-icon icon="mdi:plus-box-multiple-outline"></ha-icon>
                    <span style="margin-left: 8px;">ADD NEW ENTITY</span>
                  </mwc-button>
                </div>
              `
            : ""}
        </div>
      </div>
    `;
  }

  _renderEntity(entity, index) {
    const hasIconPicker = !!customElements.get("ha-icon-picker");
    const hasEntityPicker = !!customElements.get("ha-entity-picker");

    const showIconValue =
      entity.show_icon === undefined || entity.show_icon === null
        ? "global"
        : String(entity.show_icon);

    const isExpanded = this._expandedEntities.has(index);
    const entityTitle = entity.name || entity.entity || `Entity ${index + 1}`;

    return html`
      <div class="entity-block">
        <div class="entity-header">
          <div
            class="entity-header-left"
            @click=${() => this._toggleEntity(index)}
          >
            <ha-icon
              icon=${isExpanded ? "mdi:chevron-up" : "mdi:chevron-down"}
              style="margin-right: 8px;"
            ></ha-icon>
            <h4>${entityTitle}</h4>
          </div>
          <ha-icon-button
            @click=${() => this._removeEntity(index)}
            .title=${"Remove entity"}
            class="remove-icon"
          >
            <ha-icon icon="mdi:close"></ha-icon>
          </ha-icon-button>
        </div>

        ${isExpanded
          ? html`
              <div class="entity-content">
                <div class="grid">
                  ${hasEntityPicker
                    ? html`
                        <ha-entity-picker
                          .hass=${this.hass}
                          .value=${entity.entity || ""}
                          .configValue=${`entities.${index}.entity`}
                          @value-changed=${this._valueChanged}
                          allow-custom-entity
                        ></ha-entity-picker>
                      `
                    : html`
                        <ha-textfield
                          label="Entity"
                          .value=${entity.entity || ""}
                          .configValue=${`entities.${index}.entity`}
                          @input=${this._valueChanged}
                          placeholder="sensor.example"
                        ></ha-textfield>
                      `}

                  <ha-textfield
                    label="Repeat on (template returns array)"
                    .value=${entity.repeat_on || ""}
                    .configValue=${`entities.${index}.repeat_on`}
                    @input=${this._valueChanged}
                    placeholder="{{ state_attr(entity, 'Alerts') }}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Name ('' hides label)"
                    .value=${entity.name != null ? entity.name : ""}
                    .configValue=${`entities.${index}.name`}
                    @input=${this._valueChanged}
                    placeholder="Static or {{ template }}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Unit"
                    .value=${entity.unit || ""}
                    .configValue=${`entities.${index}.unit`}
                    @input=${this._valueChanged}
                  ></ha-textfield>

                  <ha-textfield
                    label="Attribute"
                    .value=${entity.attribute || ""}
                    .configValue=${`entities.${index}.attribute`}
                    @input=${this._valueChanged}
                    placeholder="e.g. temperature"
                  ></ha-textfield>
                </div>

                <div class="grid">
                  <ha-textfield
                    label="Value template"
                    .value=${entity.value_template || ""}
                    .configValue=${`entities.${index}.value_template`}
                    @input=${this._valueChanged}
                    placeholder="{{ states('sensor.example') }}"
                  ></ha-textfield>

                  <ha-textfield
                    label="Visible if (template)"
                    .value=${entity.visible_if || ""}
                    .configValue=${`entities.${index}.visible_if`}
                    @input=${this._valueChanged}
                    placeholder="{{ int(states('sensor.x')) > 0 }}"
                  ></ha-textfield>
                </div>

                <div class="grid">
                  ${hasIconPicker
                    ? html`
                        <ha-icon-picker
                          label="Custom icon"
                          .value=${entity.icon || ""}
                          .configValue=${`entities.${index}.icon`}
                          @value-changed=${this._valueChanged}
                        ></ha-icon-picker>
                      `
                    : html`
                        <ha-textfield
                          label="Custom icon"
                          .value=${entity.icon || ""}
                          .configValue=${`entities.${index}.icon`}
                          @input=${this._valueChanged}
                          placeholder="mdi:... or {{ template }}"
                        ></ha-textfield>
                      `}
                </div>

                <div class="grid">
                  <ha-select
                    label="Show icon (override)"
                    .value=${showIconValue}
                    .configValue=${`entities.${index}.show_icon`}
                    @selected=${this._valueChanged}
                    @closed=${(e) => e.stopPropagation()}
                  >
                    <mwc-list-item value="global">Use Global</mwc-list-item>
                    <mwc-list-item value="true">Show</mwc-list-item>
                    <mwc-list-item value="false">Hide</mwc-list-item>
                  </ha-select>
                </div>

                <h5>Color overrides</h5>
                <div class="grid">
                  <ha-textfield
                    label="Name color"
                    .value=${entity.name_color || ""}
                    .configValue=${`entities.${index}.name_color`}
                    @input=${this._valueChanged}
                  ></ha-textfield>

                  <ha-textfield
                    label="Value color"
                    .value=${entity.value_color || ""}
                    .configValue=${`entities.${index}.value_color`}
                    @input=${this._valueChanged}
                  ></ha-textfield>

                  <ha-textfield
                    label="Unit color"
                    .value=${entity.unit_color || ""}
                    .configValue=${`entities.${index}.unit_color`}
                    @input=${this._valueChanged}
                  ></ha-textfield>

                  <ha-textfield
                    label="Icon color"
                    .value=${entity.icon_color || ""}
                    .configValue=${`entities.${index}.icon_color`}
                    @input=${this._valueChanged}
                  ></ha-textfield>
                </div>

                ${this._config?.badge_style
                  ? html`
                      <h5>Badge color overrides</h5>
                      <div class="grid">
                        <ha-textfield
                          label="Badge Background"
                          .value=${entity.badge_background || ""}
                          .configValue=${`entities.${index}.badge_background`}
                          @input=${this._valueChanged}
                        ></ha-textfield>

                        <ha-textfield
                          label="Badge Label Color"
                          .value=${entity.badge_label_color || ""}
                          .configValue=${`entities.${index}.badge_label_color`}
                          @input=${this._valueChanged}
                        ></ha-textfield>

                        <ha-textfield
                          label="Badge Value Color"
                          .value=${entity.badge_value_color || ""}
                          .configValue=${`entities.${index}.badge_value_color`}
                          @input=${this._valueChanged}
                        ></ha-textfield>
                      </div>
                    `
                  : ""}

                ${this._renderActionEditor(entity, index)}
              </div>
            `
          : ""}
      </div>
    `;
  }

  _renderActionEditor(entity, index) {
    const tapAction = entity.tap_action || { action: "more-info" };
    const holdAction = entity.hold_action || { action: "none" };
    const doubleTapAction = entity.double_tap_action || { action: "none" };

    const actionSelector = { "ui-action": {} };

    return html`
      <div class="actions-accordion" style="margin-top:16px;">
        <h5 style="margin-bottom: 5px;">Tap Action</h5>
        <ha-selector
          .hass=${this.hass}
          .selector=${actionSelector}
          .value=${tapAction}
          .label=${"Tap Action"}
          @value-changed=${(ev) => this._actionChanged(ev, index, "tap_action")}
        ></ha-selector>

        <h5 style="margin-top: 15px; margin-bottom: 5px;">Hold Action</h5>
        <ha-selector
          .hass=${this.hass}
          .selector=${actionSelector}
          .value=${holdAction}
          .label=${"Hold Action"}
          @value-changed=${(ev) => this._actionChanged(ev, index, "hold_action")}
        ></ha-selector>

        <h5 style="margin-top: 15px; margin-bottom: 5px;">Double Tap Action</h5>
        <ha-selector
          .hass=${this.hass}
          .selector=${actionSelector}
          .value=${doubleTapAction}
          .label=${"Double Tap Action"}
          @value-changed=${(ev) =>
            this._actionChanged(ev, index, "double_tap_action")}
        ></ha-selector>
      </div>
    `;
  }

  static get styles() {
    return css`
      .strip-card-editor {
        padding: 8px 0 16px;
      }
      h3,
      h4,
      h5 {
        margin: 0;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      h4 {
        margin: 0;
        font-size: 1em;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        opacity: 0.9;
      }
      h5 {
        margin: 12px 0 4px;
        font-size: 0.9em;
        opacity: 0.7;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-bottom: 12px;
      }
      .grid-global {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      }
      .grid-small {
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      }
      ha-textfield,
      ha-select,
      ha-entity-picker,
      ha-service-picker,
      ha-icon-picker,
      ha-entities-picker,
      ha-selector {
        width: 100%;
      }
      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--divider-color);
      }
      .toggle-row:last-child {
        border-bottom: none;
      }

      .entity-block {
        border: 1px solid white;
        border-radius: 6px;
        padding: 0;
        margin-bottom: 16px;
        background: var(--secondary-background-color);
        overflow: hidden;
      }
      .entity-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(0, 0, 0, 0.03);
        padding: 0px 16px;
        min-height: 48px;
      }
      .entity-header-left {
        display: flex;
        align-items: center;
        flex-grow: 1;
        cursor: pointer;
        padding: 8px 0;
      }
      .entity-header h4 {
        color: var(--primary-color);
      }
      .entity-content {
        padding: 16px;
        border-top: 1px solid var(--divider-color);
      }
      .remove-icon {
        color: var(--error-color);
      }

      mwc-button.add-entity-button {
        width: 100%;
        margin-top: 16px;
        --mdc-theme-primary: var(--primary-color);
        --mdc-button-outline-color: var(--primary-color);
        height: 48px;
        font-weight: bold;
      }

      .section {
        margin-bottom: 16px;
        border-radius: 8px;
        border: 1px solid white;
        overflow: hidden;
        background: var(--card-background-color, #fff);
      }
      .section-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--secondary-background-color);
        border: none;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
        text-align: left;
        box-sizing: border-box;
        transition: background-color 0.2s;
      }
      .section-header:hover {
        background: var(--secondary-text-color);
        color: var(--primary-background-color);
      }
      .section-header:hover ha-icon {
        color: var(--primary-background-color);
      }
      .section-header ha-icon {
        --mdc-icon-size: 24px;
        color: var(--secondary-text-color);
        transition: transform 0.2s;
      }
      .section-body {
        padding: 16px;
      }
    `;
  }
}

customElements.define("strip-card-editor", StripCardEditor);
