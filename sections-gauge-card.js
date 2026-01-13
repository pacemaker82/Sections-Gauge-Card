class SectionsGaugeCard extends HTMLElement {

  getGridOptions() {

    return {
      rows: 3,
      columns: 6
    };
  }  

  static getConfigForm() {
    return {
      schema: [ 
        {
          name: "",
          type: "grid",
          schema: [
            {
                name: "style",
                selector: { 
                  select: { 
                    mode: "dropdown",
                    options: 
                      ["1", 
                      "2"],              
                  },
                },
              },
              {
                name: "transparent",
                selector: { boolean: {} },
              },                
              {
                name: "show_zero_marker",
                selector: { boolean: {} },
              },  
              {
                name: "hide_state_labels",
                selector: { boolean: {} },
              },       
          ]
        }, 
        {
            name: "title",
            selector: { text: {} },
        },          
        {
            name: "progress_color",
            selector: { text: {} },
        },  
        { name: "entities",
          selector: {
            object: {
              multiple: true,
              label_field: "entity",
              fields: {
                entity: { 
                  label: "Main Gauge Entity",
                  selector: { entity: {} },
                },                                                
                name: {
                  label: "Name (optional)",
                  selector: { text: {} },
                },
                force_label_colors: {
                  label: "Force Label Colors",
                  selector: { boolean: {} },
                },
                attribute: {
                  label: "Attribute (optional)",
                  selector: { text: {} },
                },
                target: {
                  label: "Target (number or entity)",
                  selector: { text: {} },
                },
                peak: {
                  label: "Peak (number or entity)",
                  selector: { text: {} },
                },
                min: { 
                  label: "Minimum Guage Value (number or entity)",
                  selector: { text: {} },
                }, 
                max: { 
                  label: "Maximum Guage Value (number or entity)",
                  selector: { text: {} },
                },                                           
                decimal_places: { 
                  label: "Decimal Places",
                  selector: { number: {} },
                },
                unit_of_measurement: { 
                  label: "Unit of Measurement override",
                  selector: { text: {} },
                },
              },
            },
          },
        },                         
      ],
      computeLabel: (schema) => {
        if (schema.name === "transparent") return "Make card transparent?";
        if (schema.name === "show_zero_marker") return "Show Zero Marker?";
        if (schema.name === "hide_state_labels") return "Hide State Labels?";
        if (schema.name === "title") return "Gauge Label";
        return undefined;
      },
      computeHelper: (schema) => {
        switch (schema.name) {
          case "help_text":
            return "some helpful text";             
        }
        return undefined;
      },
    };
  }    

  static getStubConfig() {
    return {
      entities: [
        {
          entity: "",
          attribute: "",
          name: "",
          force_label_colors: false,
          min: 0,
          max: 100,
          target: "",
          peak: "",
          unit_of_measurement: "",
          decimal_places: null,
          ranges: [],
        },
      ],
      title: "",
      transparent: false,
      progress_color: "",
      style: 1,
      show_zero_marker: false,
      hide_state_labels: false,
    };
  }

  setConfig(config) {
    const normalized = { ...config };
    if (!normalized.entities && normalized.entity) {
      normalized.entities = [
        {
          entity: normalized.entity,
          attribute: normalized.attribute ?? "",
          name: normalized.name ?? "",
          force_label_colors: normalized.force_label_colors ?? false,
          min: normalized.min ?? 0,
          max: normalized.max ?? 100,
          target: normalized.target ?? "",
          peak: normalized.peak ?? "",
          unit_of_measurement: "",
          decimal_places: normalized.decimal_places ?? null,
          ranges: normalized.ranges ?? [],
        },
      ];
    }
    if (!normalized || !Array.isArray(normalized.entities) || !normalized.entities[0]?.entity) {
      throw new Error("You need to define at least one entity in entities");
    }
    this._config = {
      entities: [],
      title: "",
      transparent: false,
      progress_color: "",
      style: 1,
      show_zero_marker: false,
      hide_state_labels: false,
      ...normalized,
    };
    this._hasRendered = false;
    this._hasRenderedKnob = false;
    this._hasFittedValue = false;
    this._layoutReady = false;
    this._layoutVersion = 0;
    this._lastFitLayoutVersion = 0;
    this._heightIsAuto = false;
    this._lastPaddingY = 0;
    this._ensureCard();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    this._render();
  }

  _ensureCard() {
    if (this._root) return;
    this._root = this.attachShadow({ mode: "open" });
    this._root.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          width: 100%;
        }
        ha-card {
          padding-top: var(--pad-top, 4px);
          padding-left: var(--pad-left, 4px);
          padding-bottom: var(--pad-bottom, 0px);
          padding-right: var(--pad-right, 4px);
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--card-gap, 8px);
          height: 100%;
          cursor: default;
          position: relative;
        }
        ha-card.transparent {
          background: transparent;
          box-shadow: none;
          border: none;
        }
        ha-card.portrait {
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
        }
        .wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: var(--gauge-size, 160px);
          height: var(--gauge-size, 160px);
          flex: 0 0 auto;
        }
        .title {
          display: none;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-m, 16px);
          white-space: nowrap;
          overflow: hidden;
          z-index: 2;
          position: absolute;
          line-height: 1;
        }
        ha-card.has-title .title {
          display: block;
        }
        ha-card.portrait .title {
          width: 100%;
          text-align: center;
          left: 0;
          right: 0;
          bottom: 2px;
          height: var(--portrait-title-height, auto);
          line-height: var(--portrait-title-height, auto);
        }
        .value {
          position: absolute;
          top: calc(var(--value-top, calc(var(--gauge-size, 160px) * 0.35)) + var(--gauge-offset-y, 0px));
          left: 50%;
          width: calc(var(--gauge-size, 160px) * 0.60);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-weight: 600;
          color: var(--primary-text-color);
          white-space: normal;
          line-height: 1.0;
          overflow: visible;
          transform: translateX(-50%);
        }
        :host([data-hide-labels="true"]) .value {
          display: none;
        }
        :host([data-target-reached="true"]) .value .number {
          color: var(--primary-progress-color, var(--progress-color, var(--primary-color)));
        }
        :host([data-target-reached="true"]) .value .state.primary,
        :host([data-target-reached="true"]) .value .label.primary {
          color: var(--primary-progress-color, var(--progress-color, var(--primary-color)));
        }
        :host([data-secondary-target-reached="true"]) .value .unit {
          color: var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color))));
        }
        :host([data-secondary-target-reached="true"]) .value .state.secondary,
        :host([data-secondary-target-reached="true"]) .value .label.secondary {
          color: var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color))));
        }
        :host([data-force-primary-labels="true"]) .value .state.primary,
        :host([data-force-primary-labels="true"]) .value .label.primary,
        :host([data-force-primary-labels="true"]) .value .number,
        :host([data-force-primary-labels="true"]) .value .unit {
          color: var(--primary-progress-color, var(--progress-color, var(--primary-color)));
        }
        :host([data-force-secondary-labels="true"]) .value .state.secondary,
        :host([data-force-secondary-labels="true"]) .value .label.secondary {
          color: var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color))));
        }
        :host([data-primary-zero="true"][data-has-secondary="true"]) .value .number,
        :host([data-primary-zero="true"]:not([data-has-secondary="true"])) .value .number,
        :host([data-primary-zero="true"]:not([data-has-secondary="true"])) .value .unit {
          color: var(--divider-color);
        }
        :host([data-secondary-zero="true"][data-has-secondary="true"]) .value .unit {
          color: var(--divider-color);
        }
        .value .number {
          font-size: calc(var(--gauge-size, 160px) * 0.38);
        }
        .value .unit {
          font-size: calc(var(--gauge-size, 160px) * 0.145);
          font-weight: 500;
          opacity: 0.9;
        }
        .value .state {
          display: inline-flex;
          align-items: baseline;
          gap: calc(var(--gauge-size, 160px) * 0.02);
        }
        .value .state.primary {
          font-size: calc(var(--gauge-size, 160px) * 0.38);
        }
        .value .state.secondary {
          font-size: calc(var(--gauge-size, 160px) * 0.145);
          font-weight: 500;
          opacity: 0.9;
        }
        .value .number,
        .value .unit {
          display: inline-flex;
          align-items: baseline;
          gap: calc(var(--gauge-size, 160px) * 0.02);
        }
        .value .uom {
          font-size: 0.72em;
          font-weight: 500;
          opacity: 0.9;
        }
        .value .labels {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: calc(var(--gauge-size, 160px) * 0.015);
          width: 100%;
        }
        .value .label {
          font-size: calc(var(--gauge-size, 160px) * 0.11);
          font-weight: 500;
          color: var(--secondary-text-color);
          line-height: 1.1;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .value .is-clickable {
          cursor: pointer;
        }
        svg {
          width: var(--gauge-size, 160px);
          height: var(--gauge-size, 160px);
          display: block;
        }
        .track {
          stroke: var(--divider-color);
          stroke-width: 14;
          fill: none;
          stroke-linecap: round;
        }
        .target-arc,
        .target-arc-outline {
          fill: none;
          stroke-linecap: round;
          display: none;
          transition: stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease;
          transform-origin: 50px 50px;
        }
        .target-arc {
          stroke: var(--secondary-text-color);
          stroke-width: 12;
          stroke-opacity: 0.5;
        }
        .target-arc-outline {
          stroke: var(--primary-progress-color, var(--progress-color, var(--primary-color)));
          stroke-width: 14;
        }
        .target-arc-outline.secondary {
          stroke: var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color))));
        }
        .peak-marker {
          fill: none;
          opacity: 0.5;
          stroke: var(--primary-progress-color, var(--progress-color, var(--primary-color)));
          stroke-width: 2;
          stroke-linecap: round;
          display: none;
          transition: transform 0.6s ease, stroke 0.3s ease;
          transform-origin: 50px 50px;
        }
        .peak-marker.secondary {
          stroke: var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color))));
        }
        .zero-marker {
          fill: var(--card-background-color);
          display: none;
          transform-origin: 50px 50px;
          opacity: 0.7;
        }
        .zero-marker.secondary {
          display: none;
        }
        .target {
          fill: var(--primary-text-color);
          stroke: none;
          display: none;
          transform-origin: 50px 50px;
        }
        .progress {
          stroke: var(--primary-progress-color, var(--progress-color, var(--primary-color)));
          stroke-width: 14;
          fill: none;
          stroke-linecap: round;
          transition: stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease,
            stroke 0.3s ease;
          transform-origin: 50px 50px;
        }
        .progress.secondary {
          stroke: var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color))));
        }
        .knob {
          fill: var(--primary-progress-color, var(--progress-color, var(--primary-color)));
          stroke: var(--primary-progress-color, var(--progress-color, var(--primary-color)));
          stroke-width: 1;
          display: none;
          transition: transform 0.6s ease, fill 0.3s ease, stroke 0.3s ease;
          transform-origin: 50px 50px;
        }
        @supports (color: color-mix(in srgb, black, white)) {
          .knob {
            stroke: color-mix(
              in srgb,
              var(--primary-progress-color, var(--progress-color, var(--primary-color))) 50%,
              black
            );
          }
        }
        .knob.secondary {
          fill: var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color))));
          stroke: none;
          stroke-width: 0;
          display: none;
        }
        .target.secondary {
          fill: var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color))));
          display: none;
          stroke: none;
        }
        :host([data-style="2"]) .progress:not(.secondary) {
          stroke-opacity: 0.8;
        }
        :host([data-style="2"]) .knob {
          display: block;
        }
        :host([data-has-zero="true"]) .zero-marker {
          display: block;
        }
        :host([data-has-secondary-zero="true"]) .zero-marker.secondary {
          display: block;
        }
        :host([data-has-target="true"]) .target-arc:not(.secondary),
        :host([data-has-target="true"]) .target-arc-outline:not(.secondary) {
          display: block;
        }
        :host([data-has-secondary-target="true"]) .target-arc.secondary,
        :host([data-has-secondary-target="true"]) .target-arc-outline.secondary {
          display: block;
        }
        :host([data-has-peak="true"]) .peak-marker:not(.secondary) {
          display: block;
        }
        :host([data-has-secondary-peak="true"]) .peak-marker.secondary {
          display: block;
        }
        :host([data-has-target="true"]) .target {
          display: block;
        }
        :host([data-target-reached="true"]) .target,
        :host([data-target-reached="true"]) .target-arc,
        :host([data-target-reached="true"]) .target-arc-outline {
          display: none;
        }
        :host([data-target-reached="true"]) .target:not(.secondary) {
          fill: var(--primary-progress-color, var(--progress-color, var(--primary-color)));
          stroke: var(--primary-text-color);
        }
        :host([data-primary-zero="true"]) .target:not(.secondary) {
          fill: var(--divider-color);
          stroke: var(--divider-color);
        }
        :host([data-primary-zero="true"]) .target-arc:not(.secondary),
        :host([data-primary-zero="true"]) .target-arc-outline:not(.secondary),
        :host([data-primary-zero="true"]) .peak-marker:not(.secondary) {
          stroke: var(--divider-color);
        }
        :host([data-secondary-zero="true"]) .progress.secondary {
          stroke: var(--divider-color);
        }
        :host([data-secondary-zero="true"]) .knob.secondary {
          fill: var(--divider-color);
        }
        :host([data-secondary-zero="true"]) .target.secondary {
          fill: var(--divider-color);
        }
        :host([data-secondary-zero="true"]) .target-arc.secondary,
        :host([data-secondary-zero="true"]) .target-arc-outline.secondary,
        :host([data-secondary-zero="true"]) .peak-marker.secondary {
          stroke: var(--divider-color);
        }
        :host([data-secondary-target-reached="true"]) .target.secondary {
          fill: var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color))));
        }
        :host([data-secondary-target-reached="true"]) .target.secondary,
        :host([data-secondary-target-reached="true"]) .target-arc.secondary,
        :host([data-secondary-target-reached="true"]) .target-arc-outline.secondary {
          display: none;
        }
        :host([data-has-secondary="true"]) .progress.secondary,
        :host([data-has-secondary="true"]) .knob.secondary,
        :host([data-has-secondary="true"]) .target.secondary {
          display: block;
        }
        :host([data-secondary-target-reached="true"]) .target.secondary,
        :host([data-secondary-target-reached="true"]) .target-arc.secondary,
        :host([data-secondary-target-reached="true"]) .target-arc-outline.secondary {
          display: none;
        }
        @supports (color: color-mix(in srgb, black, white)) {
          .target-arc {
            stroke: color-mix(
              in srgb,
              var(--secondary-text-color) 20%,
              black
            );
            stroke-opacity: 1;
          }
          :host([data-secondary-range="false"][data-style="1"]) .progress.secondary,
          :host([data-secondary-range="false"][data-style="2"]) .progress.secondary {
            stroke: color-mix(
              in srgb,
              var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color)))) 50%,
              black
            );
          }
          :host([data-secondary-range="false"][data-style="1"]) .knob.secondary,
          :host([data-secondary-range="false"][data-style="2"]) .knob.secondary {
            fill: color-mix(
              in srgb,
              var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color)))) 50%,
              black
            );
          }
          :host([data-secondary-range="false"][data-force-secondary-labels="true"]) .value .state.secondary,
          :host([data-secondary-range="false"][data-force-secondary-labels="true"]) .value .label.secondary {
            color: color-mix(
              in srgb,
              var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color)))) 50%,
              black
            );
          }
          :host([data-secondary-range="false"]) .target.secondary {
            fill: color-mix(
              in srgb,
              var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color)))) 65%,
              black
            );
          }
          .target {
            fill: color-mix(
              in srgb,
              var(--primary-progress-color, var(--progress-color, var(--primary-color))) 80%,
              black
            );
          }            
          :host([data-secondary-range="false"][data-secondary-target-reached="true"]) .target.secondary {
            fill: color-mix(
              in srgb,
              var(--secondary-progress-color, var(--primary-progress-color, var(--progress-color, var(--primary-color)))) 70%,
              white
            );
          }
        }
      </style>
      <ha-card class="card">
        <div class="wrapper">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <g class="arc">
              <circle class="track"></circle>
              <line class="peak-marker secondary"></line>
              <line class="peak-marker"></line>              
              <circle class="target-arc-outline"></circle>
              <circle class="target-arc"></circle>
              <circle class="target-arc-outline secondary"></circle>
              <circle class="target-arc secondary"></circle>
              <circle class="target"></circle>
              <circle class="target secondary"></circle>
              <circle class="progress"></circle>
              <circle class="progress secondary"></circle>  
              <circle class="knob secondary"></circle>              
              <circle class="target secondary"></circle>              
              <circle class="knob"></circle>              
              <polygon class="zero-marker"></polygon>
              <polygon class="zero-marker secondary"></polygon>              
            </g>
          </svg>
          <div class="value"></div>
        </div>
        <div class="title"></div>
      </ha-card>
    `;
    this._card = this._root.querySelector(".card");
    this._arcGroup = this._root.querySelector(".arc");
    this._track = this._root.querySelector(".track");
    this._targetArc = this._root.querySelector(".target-arc:not(.secondary)");
    this._targetArcSecondary = this._root.querySelector(".target-arc.secondary");
    this._targetArcOutline = this._root.querySelector(".target-arc-outline:not(.secondary)");
    this._targetArcSecondaryOutline = this._root.querySelector(".target-arc-outline.secondary");
    this._peakMarker = this._root.querySelector(".peak-marker:not(.secondary)");
    this._peakMarkerSecondary = this._root.querySelector(".peak-marker.secondary");
    this._zeroMarker = this._root.querySelector(".zero-marker:not(.secondary)");
    this._zeroMarkerSecondary = this._root.querySelector(".zero-marker.secondary");
    this._target = this._root.querySelector(".target:not(.secondary)");
    this._targetSecondary = this._root.querySelector(".target.secondary");
    this._progress = this._root.querySelector(".progress:not(.secondary)");
    this._progressSecondary = this._root.querySelector(".progress.secondary");
    this._knob = this._root.querySelector(".knob:not(.secondary)");
    this._knobSecondary = this._root.querySelector(".knob.secondary");
    this._valueEl = this._root.querySelector(".value");
    this._titleEl = this._root.querySelector(".title");
    this._wrapper = this._root.querySelector(".wrapper");
    const svgNS = "http://www.w3.org/2000/svg";
    this._targetTitle = document.createElementNS(svgNS, "title");
    this._target.appendChild(this._targetTitle);
    this._targetSecondaryTitle = document.createElementNS(svgNS, "title");
    this._targetSecondary.appendChild(this._targetSecondaryTitle);
    this._resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const widthChanged =
        !this._lastResize || Math.abs(this._lastResize.width - width) >= 0.5;
      const heightChanged =
        !this._lastResize || Math.abs(this._lastResize.height - height) >= 0.5;
      if (
        this._lastResize &&
        Math.abs(this._lastResize.width - width) < 0.5 &&
        Math.abs(this._lastResize.height - height) < 0.5
      ) {
        return;
      }
      if (
        !widthChanged &&
        heightChanged &&
        this._lastGaugeSize &&
        this._lastPaddingY &&
        Math.abs(height - (this._lastGaugeSize + this._lastPaddingY)) < 1
      ) {
        this._heightIsAuto = true;
      }
      this._lastResize = { width, height };
      this._updateGaugeSize(width, height);
    });
    this._resizeObserver.observe(this);
  }

  _parseNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  _getEntityValue(stateObj, attributeName) {
    if (!stateObj) return null;
    const attribute =
      typeof attributeName === "string" ? attributeName.trim() : "";
    if (attribute) {
      const attrValue = stateObj.attributes?.[attribute];
      return attrValue !== undefined && attrValue !== null ? attrValue : null;
    }
    return stateObj.state;
  }

  _resolveMinMax(value, fallback) {
    if (value === "") return fallback;
    if (typeof value === "string" && this._hass) {
      if (value.trim() === "") return fallback;
      const stateObj = this._hass.states[value];
      if (stateObj) {
        const entityValue = this._parseNumber(stateObj.state);
        return entityValue !== null ? entityValue : fallback;
      }
    }
    const parsed = this._parseNumber(value);
    return parsed !== null ? parsed : fallback;
  }

  _resolveRangeColor(ranges, value) {
    if (!Array.isArray(ranges)) return "";
    const numericValue = this._parseNumber(value);
    if (numericValue === null) return "";
    const parsedRanges = ranges
      .map((range) => {
        const rangeValue = this._resolveMinMax(range?.value, null);
        const color =
          typeof range?.color === "string" ? range.color.trim() : "";
        if (rangeValue === null || !color) return null;
        return { value: rangeValue, color };
      })
      .filter(Boolean)
      .sort((a, b) => a.value - b.value);
    let chosen = "";
    for (const range of parsedRanges) {
      if (numericValue >= range.value) {
        chosen = range.color;
      } else {
        break;
      }
    }
    return chosen;
  }

  _resolveNameLabel(nameValue) {
    if (typeof nameValue !== "string") return "";
    const trimmed = nameValue.trim();
    if (!trimmed) return "";
    const stateObj = this._hass?.states?.[trimmed];
    if (!stateObj) return trimmed;
    const unit = stateObj.attributes?.unit_of_measurement || "";
    return unit ? `${stateObj.state}${unit}` : `${stateObj.state}`;
  }

  _render() {
    if (!this._hass || !this._config) return;
    const entities = Array.isArray(this._config.entities) ? this._config.entities : [];
    const primaryConfig = entities[0] || {};
    if (!primaryConfig.entity) return;
    const stateObj = this._hass.states[primaryConfig.entity];
    if (!stateObj) return;
    const secondaryConfig = entities[1] || null;
    const hasSecondaryEntity = Boolean(secondaryConfig?.entity);
    const secondaryState = hasSecondaryEntity
      ? this._hass.states[secondaryConfig.entity]
      : null;

    if (!this._layoutReady) return;

    const min = this._resolveMinMax(primaryConfig.min, 0);
    const max = this._resolveMinMax(primaryConfig.max, 100);
    const rawValue = this._getEntityValue(stateObj, primaryConfig.attribute);
    const value = this._parseNumber(rawValue);

    const title = (this._config.title || "").trim();
    this._titleEl.textContent = title;
    this._card.classList.toggle("has-title", Boolean(title));

    const strokeWidth = 14;
    const size = 100;
    const radius = size / 2 - strokeWidth / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const arcLength = (2 / 3) * circumference;
    const gapLength = circumference - arcLength;
    const sweepAngle = 240;
    const progressTransform = "rotate(0deg)";
    const markerHeightBase = 2;
    const markerWidthBase = 4;
    const computeMetrics = (val, minVal, maxVal, arcLen) => {
      const safeMax = maxVal === minVal ? minVal + 1 : maxVal;
      const clamped =
        val === null ? minVal : Math.min(Math.max(val, minVal), safeMax);
      const ratio = (clamped - minVal) / (safeMax - minVal);
      const hasZeroCenter = minVal < 0 && safeMax > 0;
      let progressLength = arcLen * ratio;
      let progressDashOffset = 0;
      if (hasZeroCenter) {
        const zeroRatio = (0 - minVal) / (safeMax - minVal);
        const deltaRatio = ratio - zeroRatio;
        progressLength = arcLen * Math.abs(deltaRatio);
        const startRatio = deltaRatio >= 0 ? zeroRatio : ratio;
        progressDashOffset = -arcLen * startRatio;
      }
      return { ratio, progressLength, progressDashOffset, safeMax };
    };
    const primaryMetrics = computeMetrics(value, min, max, arcLength);

    const primaryName = this._resolveNameLabel(primaryConfig.name);
    let secondaryName = "";
    if (hasSecondaryEntity && secondaryState) {
      secondaryName = this._resolveNameLabel(secondaryConfig.name);
    }
    const hasDualLabels =
      hasSecondaryEntity && secondaryState && primaryName && secondaryName;
    const yOffset = hasDualLabels
      ? 5
      : !this._card.classList.contains("has-title") &&
          !this._card.classList.contains("landscape")
        ? 10
        : 0;
    this.style.setProperty("--gauge-offset-y", `${yOffset}px`);
    this._arcGroup.setAttribute(
      "transform",
      `translate(0 ${yOffset}) rotate(-210 50 50)`
    );

    this._track.setAttribute("cx", center);
    this._track.setAttribute("cy", center);
    this._track.setAttribute("r", radius);
    this._track.setAttribute("stroke-dasharray", `${arcLength} ${gapLength}`);
    this._track.setAttribute("stroke-dashoffset", "0");

    this._targetArc.setAttribute("cx", center);
    this._targetArc.setAttribute("cy", center);
    this._targetArc.setAttribute("r", radius);
    const targetArcStrokeWidth = 12;
    this._targetArc.setAttribute("stroke-width", targetArcStrokeWidth);
    this._targetArc.style.strokeWidth = `${targetArcStrokeWidth}`;
    this._targetArc.setAttribute("stroke-dashoffset", "0");
    this._targetArc.style.transform = progressTransform;
    this._targetArcOutline.setAttribute("cx", center);
    this._targetArcOutline.setAttribute("cy", center);
    this._targetArcOutline.setAttribute("r", radius);
    const targetArcOutlineWidth = 14;
    this._targetArcOutline.setAttribute("stroke-width", targetArcOutlineWidth);
    this._targetArcOutline.style.strokeWidth = `${targetArcOutlineWidth}`;
    this._targetArcOutline.setAttribute("stroke-dashoffset", "0");
    this._targetArcOutline.style.transform = progressTransform;

    const peakMarkerStroke = 2;
    const peakMarkerInset = peakMarkerStroke / 2;
    const peakMarkerInner = radius - strokeWidth / 2 + peakMarkerInset;
    const peakMarkerOuter = radius + strokeWidth / 2 - peakMarkerInset;
    this._peakMarker.setAttribute("x1", center + peakMarkerInner);
    this._peakMarker.setAttribute("y1", center);
    this._peakMarker.setAttribute("x2", center + peakMarkerOuter);
    this._peakMarker.setAttribute("y2", center);

    this._target.setAttribute("r", strokeWidth * 0.3);
    this._target.setAttribute("cx", center + radius);
    this._target.setAttribute("cy", center);

    this._progress.setAttribute("cx", center);
    this._progress.setAttribute("cy", center);
    this._progress.setAttribute("r", radius);
    this._progress.setAttribute(
      "stroke-dashoffset",
      `${primaryMetrics.progressDashOffset}`
    );
    this._progress.style.transform = progressTransform;
    const knobStrokeInset = 0.5;
    this._knob.setAttribute("r", Math.max(0, strokeWidth / 2 - knobStrokeInset));
    this._knob.setAttribute("cx", center + radius);
    this._knob.setAttribute("cy", center);

    if (this._config.show_zero_marker) {
      const zeroRatioRaw = (0 - min) / (primaryMetrics.safeMax - min);
      const zeroClamped = Math.min(1, Math.max(0, zeroRatioRaw));
      const zeroAngle = sweepAngle * zeroClamped;
      const markerRadius = radius;
      const markerHeight = markerHeightBase;
      const markerWidth = markerWidthBase;
      const tipX = center + markerRadius;
      const tipY = center;
      const points = `${tipX},${tipY - markerHeight} ${tipX + markerWidth},${tipY} ${tipX},${tipY + markerHeight} ${tipX - markerWidth},${tipY}`;
      this._zeroMarker.setAttribute("points", points);
      this._zeroMarker.style.transform = `rotate(${zeroAngle}deg)`;
      this.setAttribute("data-has-zero", "true");
    } else {
      this.setAttribute("data-has-zero", "false");
      this.setAttribute("data-has-secondary-zero", "false");
    }

    const endAngle = sweepAngle * primaryMetrics.ratio;
    if (!this._hasRendered) {
      this._progress.setAttribute("stroke-dasharray", `0 ${circumference}`);
      this._knob.style.transform = "rotate(0deg)";
      requestAnimationFrame(() => {
        if (!this._progress || !this._knob) return;
        this._progress.setAttribute(
          "stroke-dasharray",
          `${primaryMetrics.progressLength} ${circumference}`
        );
        this._knob.style.transform = `rotate(${endAngle}deg)`;
        this._hasRendered = true;
        this._hasRenderedKnob = true;
      });
    } else {
      this._progress.setAttribute(
        "stroke-dasharray",
        `${primaryMetrics.progressLength} ${circumference}`
      );
      this._knob.style.transform = `rotate(${endAngle}deg)`;
    }

    const unit =
      (primaryConfig.unit_of_measurement || "").trim() ||
      stateObj.attributes.unit_of_measurement ||
      "";
    const displayValue =
      rawValue === null
        ? "—"
        : this._formatValue(rawValue, primaryConfig.decimal_places);
    const primaryLabel = `${displayValue}${unit}`;
    const isZero = value !== null && value === 0;
    let secondaryDisplay = "";
    let secondaryValueText = "";
    let secondaryUnit = "";
    let isSecondaryZero = false;
    let value2 = null;
    if (hasSecondaryEntity && secondaryState) {
      const rawValue2 = this._getEntityValue(
        secondaryState,
        secondaryConfig.attribute
      );
      value2 = this._parseNumber(rawValue2);
      const unit2 =
        (secondaryConfig.unit_of_measurement || "").trim() ||
        secondaryState.attributes.unit_of_measurement ||
        "";
      const displayValue2 =
        rawValue2 === null
          ? "—"
          : this._formatValue(rawValue2, secondaryConfig.decimal_places);
      secondaryValueText = displayValue2;
      secondaryUnit = unit2;
      secondaryDisplay = unit2 ? `${displayValue2}${unit2}` : displayValue2;
      isSecondaryZero = value2 !== null && value2 === 0;
    }
    const primaryKey = `${displayValue}|${unit}|${primaryName}`;
    const secondaryKey = `${secondaryDisplay}|${secondaryName}`;
    const primaryChanged = this._lastPrimaryKey !== primaryKey;
    const secondaryChanged = this._lastSecondaryKey !== secondaryKey;
    const shouldUpdateValue = primaryChanged || secondaryChanged;
    if (shouldUpdateValue) {
      this._valueContentVersion = (this._valueContentVersion || 0) + 1;
      this._lastValueFitKey = null;
      this._lastLabelFitKey = null;
      if (hasSecondaryEntity && secondaryState) {
        this._valueEl.textContent = "";
        const primaryStateEl = document.createElement("span");
        primaryStateEl.className = "state primary is-clickable";
        primaryStateEl.innerHTML = unit
          ? `<span class="num">${displayValue}</span><span class="uom">${unit}</span>`
          : `<span class="num">${displayValue}</span>`;
        primaryStateEl.addEventListener("click", (event) => {
          event.stopPropagation();
          this._openMoreInfoForEntity(primaryConfig.entity);
        });
        this._valueEl.appendChild(primaryStateEl);
        if (primaryName) {
          const primaryLabelEl = document.createElement("span");
          primaryLabelEl.className = "label primary is-clickable";
          primaryLabelEl.textContent = primaryName;
          primaryLabelEl.addEventListener("click", (event) => {
            event.stopPropagation();
            this._openMoreInfoForEntity(primaryConfig.entity);
          });
          this._valueEl.appendChild(primaryLabelEl);
        }
        const secondaryStateEl = document.createElement("span");
        secondaryStateEl.className = "state secondary";
        secondaryStateEl.innerHTML = secondaryUnit
          ? `<span class="num">${secondaryValueText}</span><span class="uom">${secondaryUnit}</span>`
          : `<span class="num">${secondaryValueText}</span>`;
        this._valueEl.appendChild(secondaryStateEl);
        if (secondaryName) {
          const secondaryLabelEl = document.createElement("span");
          secondaryLabelEl.className = "label secondary is-clickable";
          secondaryLabelEl.textContent = secondaryName;
          secondaryLabelEl.addEventListener("click", (event) => {
            event.stopPropagation();
            this._openMoreInfoForEntity(secondaryConfig.entity);
          });
          this._valueEl.appendChild(secondaryLabelEl);
        }
        secondaryStateEl.classList.add("is-clickable");
        secondaryStateEl.addEventListener("click", (event) => {
          event.stopPropagation();
          this._openMoreInfoForEntity(secondaryConfig.entity);
        });
        this._fitLabelText(this._valueEl);
      } else {
        let numberEl = this._valueEl.querySelector(".number");
        let unitEl = this._valueEl.querySelector(".unit");
        if (!numberEl) {
          this._valueEl.textContent = "";
          numberEl = document.createElement("span");
          numberEl.className = "number";
          this._valueEl.appendChild(numberEl);
        }
        numberEl.textContent = displayValue;
        numberEl.classList.add("is-clickable");
        numberEl.addEventListener("click", (event) => {
          event.stopPropagation();
          this._openMoreInfoForEntity(primaryConfig.entity);
        });
        if (unit) {
          if (!unitEl) {
            unitEl = document.createElement("span");
            unitEl.className = "unit";
            this._valueEl.appendChild(unitEl);
          }
          unitEl.textContent = unit;
          unitEl.classList.add("is-clickable");
          unitEl.addEventListener("click", (event) => {
            event.stopPropagation();
            this._openMoreInfoForEntity(primaryConfig.entity);
          });
        } else if (unitEl) {
          unitEl.remove();
        }
        const showPrimaryLabel = Boolean(primaryName);
        let labelsEl = this._valueEl.querySelector(".labels");
        if (showPrimaryLabel) {
          if (!labelsEl) {
            labelsEl = document.createElement("div");
            labelsEl.className = "labels";
            this._valueEl.appendChild(labelsEl);
          }
          labelsEl.textContent = "";
          const primaryLabelEl = document.createElement("span");
          primaryLabelEl.className = "label primary is-clickable";
          primaryLabelEl.textContent = primaryName;
          labelsEl.appendChild(primaryLabelEl);
          primaryLabelEl.addEventListener("click", (event) => {
            event.stopPropagation();
            this._openMoreInfoForEntity(primaryConfig.entity);
          });
          this._fitLabelText(labelsEl);
        } else if (labelsEl) {
          labelsEl.remove();
        }
      }
      this._scheduleTextFit();
      this._lastPrimaryKey = primaryKey;
      this._lastSecondaryKey = secondaryKey;
    }
    if (
      primaryChanged ||
      !this._hasFittedValue ||
      this._lastFitLayoutVersion !== this._layoutVersion
    ) {
      this._hasFittedValue = true;
      this._fitValueText();
    }
    this.setAttribute(
      "data-hide-labels",
      this._config.hide_state_labels ? "true" : "false"
    );
    this.setAttribute(
      "data-force-primary-labels",
      primaryConfig.force_label_colors ? "true" : "false"
    );
    this.setAttribute(
      "data-force-secondary-labels",
      hasSecondaryEntity && secondaryConfig?.force_label_colors ? "true" : "false"
    );
    this.setAttribute("data-primary-zero", isZero ? "true" : "false");
    this.setAttribute("data-secondary-zero", isSecondaryZero ? "true" : "false");
    this._card.classList.toggle("transparent", Boolean(this._config.transparent));
    const style = Number(this._config.style) || 1;
    this.setAttribute("data-style", style);
    const hasProgressColor = Boolean(this._config.progress_color);
    if (hasProgressColor) {
      this.style.setProperty("--progress-color", this._config.progress_color);
    } else {
      this.style.removeProperty("--progress-color");
    }
    const primaryRangeColor = this._resolveRangeColor(primaryConfig.ranges, value);
    const primaryColor =
      primaryRangeColor || (hasProgressColor ? this._config.progress_color : "");
    if (primaryColor) {
      this.style.setProperty("--primary-progress-color", primaryColor);
    } else {
      this.style.removeProperty("--primary-progress-color");
    }
    const secondaryRangeColor =
      hasSecondaryEntity && secondaryState
        ? this._resolveRangeColor(secondaryConfig.ranges, value2)
        : "";
    if (secondaryRangeColor) {
      this.style.setProperty("--secondary-progress-color", secondaryRangeColor);
    } else {
      this.style.removeProperty("--secondary-progress-color");
    }
    this.setAttribute(
      "data-secondary-range",
      secondaryRangeColor ? "true" : "false"
    );
    if (isZero) {
      this._progress.style.stroke = "var(--divider-color)";
      this._knob.style.fill = "var(--divider-color)";
      this._knob.style.stroke = "var(--divider-color)";
    } else {
      this._progress.style.removeProperty("stroke");
      this._knob.style.removeProperty("fill");
      this._knob.style.removeProperty("stroke");
    }

    const targetValue = this._resolveMinMax(primaryConfig.target, null);
    if (targetValue === null) {
      this.setAttribute("data-has-target", "false");
      this.setAttribute("data-target-reached", "false");
      if (this._targetTitle) this._targetTitle.textContent = "";
    } else {
      const targetMetrics = computeMetrics(targetValue, min, max, arcLength);
      this._targetArc.setAttribute(
        "stroke-dasharray",
        `${targetMetrics.progressLength} ${circumference}`
      );
      this._targetArc.setAttribute(
        "stroke-dashoffset",
        `${targetMetrics.progressDashOffset}`
      );
      this._targetArcOutline.setAttribute(
        "stroke-dasharray",
        `${targetMetrics.progressLength} ${circumference}`
      );
      this._targetArcOutline.setAttribute(
        "stroke-dashoffset",
        `${targetMetrics.progressDashOffset}`
      );
      const targetClamped = Math.min(
        Math.max(targetValue, min),
        primaryMetrics.safeMax
      );
      const targetRatio = (targetClamped - min) / (primaryMetrics.safeMax - min);
      const targetAngle = sweepAngle * targetRatio;
      this._target.style.transform = `rotate(${targetAngle}deg)`;
      const reached = value !== null && value >= targetValue;
      this.setAttribute("data-target-reached", reached ? "true" : "false");
      this.setAttribute("data-has-target", reached ? "false" : "true");
      if (this._targetTitle) {
        const targetDisplay = this._formatValue(
          targetValue,
          primaryConfig.decimal_places
        );
        const unitSuffix = unit ? ` ${unit}` : "";
        this._targetTitle.textContent = `Target: ${targetDisplay}${unitSuffix}`;
      }
    }

    const peakValue = this._resolveMinMax(primaryConfig.peak, null);
    if (peakValue === null) {
      this.removeAttribute("data-has-peak");
      this._peakMarker.style.transform = "";
    } else {
      const peakClamped = Math.min(Math.max(peakValue, min), primaryMetrics.safeMax);
      const peakRatio = (peakClamped - min) / (primaryMetrics.safeMax - min);
      const peakAngle = sweepAngle * peakRatio;
      this._peakMarker.style.transform = `rotate(${peakAngle}deg)`;
      this.setAttribute("data-has-peak", "true");
    }

    if (hasSecondaryEntity) {
      const min2 = this._resolveMinMax(secondaryConfig.min, 0);
      const max2 = this._resolveMinMax(secondaryConfig.max, 100);
      if (!secondaryState) {
        this.setAttribute("data-has-secondary", "false");
        this.setAttribute("data-secondary-target-reached", "false");
        this.setAttribute("data-has-secondary-zero", "false");
        this.removeAttribute("data-has-secondary-peak");
        this.setAttribute("data-has-secondary-target", "false");
      } else {
        const secondaryStrokeWidth = strokeWidth * 0.4;
        const secondaryRadius = radius;
        const secondaryCircumference = 2 * Math.PI * secondaryRadius;
        const secondaryArcLength = (2 / 3) * secondaryCircumference;
        const rawValue2 = this._getEntityValue(
          secondaryState,
          secondaryConfig.attribute
        );
        const value2 = this._parseNumber(rawValue2);
        const secondaryMetrics = computeMetrics(
          value2,
          min2,
          max2,
          secondaryArcLength
        );

        if (this._config.show_zero_marker && this._zeroMarkerSecondary) {
          const zeroRatioRaw2 = (0 - min2) / (secondaryMetrics.safeMax - min2);
          const zeroClamped2 = Math.min(1, Math.max(0, zeroRatioRaw2));
          const zeroAngle2 = sweepAngle * zeroClamped2;
          const markerScale2 = 0.5;
          const markerHeight2 = markerHeightBase * markerScale2;
          const markerWidth2 = markerWidthBase * markerScale2;
          const tipX2 = center + secondaryRadius;
          const tipY2 = center;
          const points2 = `${tipX2},${tipY2 - markerHeight2} ${tipX2 + markerWidth2},${tipY2} ${tipX2},${tipY2 + markerHeight2} ${tipX2 - markerWidth2},${tipY2}`;
          this._zeroMarkerSecondary.setAttribute("points", points2);
          this._zeroMarkerSecondary.style.transform = `rotate(${zeroAngle2}deg)`;
          this.setAttribute("data-has-secondary-zero", "true");
        } else {
          this.setAttribute("data-has-secondary-zero", "false");
        }

        this._progressSecondary.setAttribute("cx", center);
        this._progressSecondary.setAttribute("cy", center);
        this._progressSecondary.setAttribute("r", secondaryRadius);
        this._progressSecondary.setAttribute("stroke-width", secondaryStrokeWidth);
        this._progressSecondary.style.strokeWidth = `${secondaryStrokeWidth}`;
        this._progressSecondary.setAttribute(
          "stroke-dasharray",
          `${secondaryMetrics.progressLength} ${secondaryCircumference}`
        );
        this._progressSecondary.setAttribute(
          "stroke-dashoffset",
          `${secondaryMetrics.progressDashOffset}`
        );
        this._progressSecondary.style.transform = progressTransform;
        if (isSecondaryZero) {
          this._progressSecondary.style.stroke = "var(--divider-color)";
          this._knobSecondary.style.fill = "var(--divider-color)";
          this._knobSecondary.style.stroke = "var(--divider-color)";
        } else {
          this._progressSecondary.style.removeProperty("stroke");
          this._knobSecondary.style.removeProperty("fill");
          this._knobSecondary.style.removeProperty("stroke");
        }

        this._targetArcSecondary.setAttribute("cx", center);
        this._targetArcSecondary.setAttribute("cy", center);
        this._targetArcSecondary.setAttribute("r", secondaryRadius);
        const secondaryTargetArcWidth = Math.max(1, secondaryStrokeWidth - 2);
        this._targetArcSecondary.setAttribute("stroke-width", secondaryTargetArcWidth);
        this._targetArcSecondary.style.strokeWidth = `${secondaryTargetArcWidth}`;
        this._targetArcSecondary.setAttribute("stroke-dashoffset", "0");
        this._targetArcSecondary.style.transform = progressTransform;
        this._targetArcSecondaryOutline.setAttribute("cx", center);
        this._targetArcSecondaryOutline.setAttribute("cy", center);
        this._targetArcSecondaryOutline.setAttribute("r", secondaryRadius);
        const secondaryTargetArcOutlineWidth = secondaryStrokeWidth;
        this._targetArcSecondaryOutline.setAttribute(
          "stroke-width",
          secondaryTargetArcOutlineWidth
        );
        this._targetArcSecondaryOutline.style.strokeWidth = `${secondaryTargetArcOutlineWidth}`;
        this._targetArcSecondaryOutline.setAttribute("stroke-dashoffset", "0");
        this._targetArcSecondaryOutline.style.transform = progressTransform;

        const secondaryPeakMarkerStroke = 2;
        const secondaryPeakMarkerInset = secondaryPeakMarkerStroke / 2;
        const secondaryPeakMarkerInner =
          secondaryRadius - secondaryStrokeWidth / 2 + secondaryPeakMarkerInset;
        const secondaryPeakMarkerOuter =
          secondaryRadius + secondaryStrokeWidth / 2 - secondaryPeakMarkerInset;
        this._peakMarkerSecondary.setAttribute("x1", center + secondaryPeakMarkerInner);
        this._peakMarkerSecondary.setAttribute("y1", center);
        this._peakMarkerSecondary.setAttribute("x2", center + secondaryPeakMarkerOuter);
        this._peakMarkerSecondary.setAttribute("y2", center);

        this._knobSecondary.setAttribute("r", secondaryStrokeWidth / 2);
        this._knobSecondary.setAttribute("cx", center + secondaryRadius);
        this._knobSecondary.setAttribute("cy", center);
        const endAngle2 = sweepAngle * secondaryMetrics.ratio;
        this._knobSecondary.style.transform = `rotate(${endAngle2}deg)`;

        const targetValue2 = this._resolveMinMax(secondaryConfig.target, null);
        if (targetValue2 === null) {
          this._targetSecondary.style.display = "none";
          this.setAttribute("data-secondary-target-reached", "false");
          this.setAttribute("data-has-secondary-target", "false");
          if (this._targetSecondaryTitle) this._targetSecondaryTitle.textContent = "";
        } else {
          const targetMetrics2 = computeMetrics(
            targetValue2,
            min2,
            max2,
            secondaryArcLength
          );
          this._targetArcSecondary.setAttribute(
            "stroke-dasharray",
            `${targetMetrics2.progressLength} ${secondaryCircumference}`
          );
          this._targetArcSecondary.setAttribute(
            "stroke-dashoffset",
            `${targetMetrics2.progressDashOffset}`
          );
          this._targetArcSecondaryOutline.setAttribute(
            "stroke-dasharray",
            `${targetMetrics2.progressLength} ${secondaryCircumference}`
          );
          this._targetArcSecondaryOutline.setAttribute(
            "stroke-dashoffset",
            `${targetMetrics2.progressDashOffset}`
          );
          const targetClamped2 = Math.min(
            Math.max(targetValue2, min2),
            secondaryMetrics.safeMax
          );
          const targetRatio2 =
            (targetClamped2 - min2) / (secondaryMetrics.safeMax - min2);
          const targetAngle2 = sweepAngle * targetRatio2;
          this._targetSecondary.setAttribute("r", secondaryStrokeWidth * 0.3);
          this._targetSecondary.setAttribute("cx", center + secondaryRadius);
          this._targetSecondary.setAttribute("cy", center);
          this._targetSecondary.style.transform = `rotate(${targetAngle2}deg)`;
          const reached2 = value2 !== null && value2 >= targetValue2;
          this._targetSecondary.style.display = reached2 ? "none" : "block";
          this.setAttribute("data-secondary-target-reached", reached2 ? "true" : "false");
          this.setAttribute("data-has-secondary-target", reached2 ? "false" : "true");
          if (this._targetSecondaryTitle) {
            const targetDisplay2 = this._formatValue(
              targetValue2,
              secondaryConfig.decimal_places
            );
            const unitSuffix2 = secondaryUnit ? ` ${secondaryUnit}` : "";
            this._targetSecondaryTitle.textContent = `Target: ${targetDisplay2}${unitSuffix2}`;
          }
        }

        const peakValue2 = this._resolveMinMax(secondaryConfig.peak, null);
        if (peakValue2 === null) {
          this.removeAttribute("data-has-secondary-peak");
          this._peakMarkerSecondary.style.transform = "";
        } else {
          const peakClamped2 = Math.min(
            Math.max(peakValue2, min2),
            secondaryMetrics.safeMax
          );
          const peakRatio2 =
            (peakClamped2 - min2) / (secondaryMetrics.safeMax - min2);
          const peakAngle2 = sweepAngle * peakRatio2;
          this._peakMarkerSecondary.style.transform = `rotate(${peakAngle2}deg)`;
          this.setAttribute("data-has-secondary-peak", "true");
        }

        this.setAttribute("data-has-secondary", "true");
      }
    } else {
      this.setAttribute("data-has-secondary", "false");
      this.setAttribute("data-secondary-target-reached", "false");
      this.setAttribute("data-has-secondary-zero", "false");
      this.removeAttribute("data-has-secondary-peak");
      this.setAttribute("data-has-secondary-target", "false");
    }
    // Title font size is fixed to --ha-font-size-m.
  }

  _formatValue(value, decimalPlaces) {
    if (value === null || value === undefined) return "—";
    const parsed = this._parseNumber(value);
    if (parsed === null) return `${value}`;
    if (decimalPlaces === null || decimalPlaces === undefined || decimalPlaces === "") {
      return `${parsed}`;
    }
    const places = Number(decimalPlaces);
    if (!Number.isFinite(places)) return `${parsed}`;
    return parsed.toFixed(Math.max(0, Math.floor(places)));
  }

  _updateGaugeSize(width, height) {
    if (!this._card || !this._wrapper || !width) return;
    const hasTitle = (this._config?.title || "").trim().length > 0;
    this._card.classList.toggle("landscape", false);
    this._card.classList.toggle("portrait", true);
    this._card.classList.toggle("has-title", hasTitle);
    this._card.classList.toggle("no-title", !hasTitle);

    const base = width;
    const padBase = base * 0.02;
    const padTop = Math.min(6, Math.max(4, padBase));
    const padLeft = Math.min(6, Math.max(4, padBase));
    const padBottom = Math.min(6, Math.max(0, padBase));
    const padRight = Math.min(6, Math.max(4, padBase));
    const gap = Math.min(12, Math.max(4, base * 0.04));
    this._card.style.setProperty("--pad-top", `${padTop}px`);
    this._card.style.setProperty("--pad-left", `${padLeft}px`);
    this._card.style.setProperty("--pad-bottom", `${padBottom}px`);
    this._card.style.setProperty("--pad-right", `${padRight}px`);
    this._card.style.setProperty("--card-gap", `${gap}px`);

    const paddingX = padLeft + padRight;
    const paddingY = padTop + padBottom;
    const availableWidth = Math.max(0, width - paddingX);
    const availableHeight = Math.max(0, height - paddingY);
    const titleHeight = hasTitle ? this._getTitleHeight() : 0;
    const titleOverlapRatio = 0.5;
    const effectiveTitleHeight = titleHeight * (1 - titleOverlapRatio);
    let size = this._heightIsAuto
      ? availableWidth
      : Math.min(availableWidth, availableHeight);
    if (
      !this._heightIsAuto &&
      height &&
      hasTitle &&
      titleHeight > 0 &&
      availableHeight < size + effectiveTitleHeight
    ) {
      size = Math.max(0, availableHeight - effectiveTitleHeight);
    }
    size = Math.max(0, size);
    if (!size) return;
    if (this._lastGaugeSize && Math.abs(this._lastGaugeSize - size) < 0.5) {
      return;
    }
    this._lastGaugeSize = size;
    this._lastPaddingY = paddingY;
    this._layoutVersion += 1;
    this.style.setProperty("--gauge-size", `${size}px`);
    if (this._hasFittedValue) {
      this._fitValueText();
    }
    this.style.removeProperty("--title-width");
    if (hasTitle && titleHeight > 0) {
      this.style.setProperty("--portrait-title-height", `${titleHeight}px`);
    } else {
      this.style.removeProperty("--portrait-title-height");
    }
    this._layoutReady = true;
    if (this._hass && this._config) {
      this._render();
    }
    this._scheduleTextFit();
  }

  _getTitleHeight() {
    if (!this._titleEl) return 0;
    let measured = 0;
    const rect = this._titleEl.getBoundingClientRect();
    if (rect && rect.height) measured = rect.height;
    const style = getComputedStyle(this._titleEl);
    const fontSize = parseFloat(style.fontSize) || 0;
    const lineHeight = parseFloat(style.lineHeight);
    if (!measured) {
      if (Number.isFinite(lineHeight)) measured = lineHeight;
      else measured = fontSize;
    }
    return Math.max(0, Math.ceil(measured));
  }

  _fitValueText() {
    if (!this._valueEl || !this._wrapper) return;
    const size =
      this._lastGaugeSize ||
      parseFloat(getComputedStyle(this).getPropertyValue("--gauge-size"));
    if (!size) return;
    const numberEl = this._valueEl.querySelector(".number");
    const primaryStateEl = this._valueEl.querySelector(".state.primary");
    const targetEl = numberEl || primaryStateEl;
    if (!targetEl) return;
    const availableWidth = this._valueEl.clientWidth;
    if (!availableWidth) return;
    const key = `${this._valueContentVersion || 0}-${size}-${availableWidth}-${targetEl.textContent || ""}`;
    if (this._lastValueFitKey === key) return;
    this._lastValueFitKey = key;

    const maxFont = size * 0.33;
    const minFont = size * 0.12;
    targetEl.style.fontSize = `${maxFont}px`;
    const textWidth = targetEl.scrollWidth;
    const scale = Math.min(1, availableWidth / textWidth);
    const fitted = Math.max(minFont, maxFont * scale);
    targetEl.style.fontSize = `${fitted}px`;
    this._lastFitLayoutVersion = this._layoutVersion;
    const labelsEl = this._valueEl.querySelector(".labels");
    if (labelsEl) {
      this._fitLabelText(labelsEl);
    }
  }

  _fitLabelText(labelsEl) {
    if (!labelsEl || !this._valueEl) return;
    const size =
      this._lastGaugeSize ||
      parseFloat(getComputedStyle(this).getPropertyValue("--gauge-size"));
    if (!size) return;
    const availableWidth = labelsEl.clientWidth;
    if (!availableWidth) return;
    const labels = Array.from(labelsEl.querySelectorAll(".label"));
    if (!labels.length) return;
    const key = `${this._valueContentVersion || 0}-${size}-${availableWidth}-${labels.map((label) => label.textContent || "").join("|")}`;
    if (this._lastLabelFitKey === key) return;
    this._lastLabelFitKey = key;

    const maxFont = size * 0.11;
    const minFont = size * 0.07;
    labels.forEach((label) => {
      label.style.fontSize = `${maxFont}px`;
      const textWidth = label.scrollWidth;
      const scale = Math.min(1, availableWidth / textWidth);
      const fitted = Math.max(minFont, maxFont * scale);
      label.style.fontSize = `${fitted}px`;
    });
  }

  _fitTitleText() {
    return;
  }

  _scheduleTextFit() {
    if (this._textFitScheduled) return;
    this._textFitScheduled = true;
    requestAnimationFrame(() => {
      this._textFitScheduled = false;
      this._fitValueText();
    });
    if (!this._fontsReadyAttached && document?.fonts?.ready) {
      this._fontsReadyAttached = true;
      document.fonts.ready.then(() => {
        this._fitValueText();
      });
    }
  }

  getCardSize() {
    return 3;
  }

  _openMoreInfoForEntity(entityId) {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  _openMoreInfo() {
    const entities = Array.isArray(this._config?.entities) ? this._config.entities : [];
    const entityId = entities[0]?.entity;
    this._openMoreInfoForEntity(entityId);
  }
}

customElements.define("sections-gauge-card", SectionsGaugeCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "sections-gauge-card",
  name: "Sections Gauge Card",
  description: "Compact gauge with a configurable range.",
});
