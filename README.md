# Sections-Gauge-Card

![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/pacemaker82/sections-gauge-card/total?label=Total%20Downloads) ![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads/pacemaker82/sections-gauge-card/latest/total?label=Latest%20Version)

<img width="766" height="264" alt="Screenshot 2026-01-05 at 13 48 29" src="https://github.com/user-attachments/assets/47efcf02-3209-4ca7-aa1d-c69fb7d99d07" />

A simple gauge card with multiple styles and support for multiple entities, targets and other customisations.

## Installation

The simplest installation is to goto HACS in Home Assistant and search for `Sections Gauge Card`. Alternatively click the link below:

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=pacemaker82&repository=Sections-Gauge-Card)

Otherwise, follow these simple instructions:

1. Goto HACS (if you dont have that installed, install HACS)
2. Add a custom repository
3. Add the URL to this repo: `https://github.com/pacemaker82/Sections-Gauge-Card` using the category `Dashboard` (used to be `Lovelace` pre HACS 2.0.0)
4. Go back to HACS and search for "sections gauge card" in the HACS store
5. Download and refresh
6. Goto dashboard, edit dashboard, select 'add card' button, and add the new custom Sections Gauge Card. Use the configuration below to setup.

## Card resizing

This card is designed for the new [Home Assistant Sections UI](https://www.home-assistant.io/dashboards/sections/), introduced in 2024. This allows you to scale the card horizontally or vertically as you see fit using columns and rows. The card will dynamically resize to fit the rows and columns you setup in the card UI.

## Card Setup

The configuration UI is currently in development, so it is better to manually enter the card YAML for now. 

### Top-Level card settings

| Field Name | YAML Field | Description / Usage |
|--|--|--|
| Entities | `entities` | The list of entities in your gauge, **limit: 2** |
| Card Transparency | `transparent` | Set to `true` if you want the card background to be transparent |
| Progress Color | `progress_color` | Override the color of the gauge, use HEX `#FFFFFF`, RGB `rgb(123,456,789)`, or VAR `var(--ha-css-var)` |
| Gauge Style | `style` | `1` or `2` for different UI styles for the gauge |
| Zero Markers | `show_zero_marker` | Set to `true` if you want the a marker at point `0` on the gauge |
| Hide State Labels | `hide_state_labels` | Set to `true` if you want the gauge value labels to hide |
| Gauge Name | `title` | String you want to show for the name of the gauge |

### Entity Level settings

Entities can be used to set a number of fields so that they are more dynamic. For example, your maximum value may change over time, so you can set that to be dynamic using an entity ID. Or your `target` maybe dynamic, like solar power prediction for today - instead of manually changing the target on the card you can set it to an entity that changes it. 

| Field Name | YAML Field | Description / Usage |
|--|--|--|
| Entity ID | `entity` | Entity ID you want the gauge to display |
| Name | `name` | Optional label shown under the state label; can be a string or an entity ID |
| Force Label Colors | `force_label_colors` | Set to `true` to color the state and name labels with the gauge color |
| Attribute | `attribute` | Optional attribute name to read instead of the entity state |
| Minimum Value | `min` | Integer, Float or Entity ID of the minimum value of the gauge. Supports +/- |
| Maximum Value | `max` | Integer, Float or Entity ID of the maximum value of the gauge. Supports +/- |
| Target Value | `target` | Integer, Float or Entity ID of a target value for the gauge |
| Peak Value | `peak` | Integer, Float or Entity ID of a peak value for the gauge (renders as a marker line) |
| Decimal Places | `decimal_places` | Number of decimal places you want to show for the entity |
| Unit of Measurement | `unit_of_measurement` | String to override the unit of measurement |
| Colour Ranges | `ranges` | a list of `color` and `value` pairs to change the gauge colour when a value is passed. Can only be set in YAML |

#### Min & Max

If your minimum and maximum guage values could be dynamic, do not set `min` or `max` on the entity, this way the card will automatically figure out the best min/max to use with a 10% buffer to give the guage a good look and feel. 

#### Colour Ranges

Provide a list in `ranges` with each entity to change the `color` of the gauge when a `value` is passed by the entity state.

A `value` can be an entity state or a integer/float value hard coded

A `color` can be HEX, RGB etc... 

Note: These can only be set in the YAML, not the configuration UI. 

```yaml
type: custom:sections-gauge-card
entities:
  - entity: input_number.test_solar_power
    min: 0
    max: 5000
    ranges:
      - value: 0
        color: "#FF0000"
      - value: sensor.target_entity
        color: "rgb(100,50,50)"
```        

### Full Card YAML Example

```yaml
type: custom:sections-gauge-card
entities:
  - entity: sensor.givtcp_pv_power
    name: Solar
    min: 0
    max: 5000
    target: sensor.pv_forecast_now_power
    peak: sensor.pv_power_peak
    decimal_places: 2
    unit_of_measurement: Watts
  - entity: sensor.pv_energy_today_kwh
    name: Today
    min: 0
    max: "20"
    target: sensor.prediction_pv_today
transparent: false
progress_color: var(--energy-solar-color)
style: 2
show_zero_marker: false
title: Label
```

## Examples

<img width="257" height="196" alt="Screenshot 2026-01-07 at 12 12 44" src="https://github.com/user-attachments/assets/23d39b58-cc73-4c66-8665-91b97875ecca" />

A card showing positive and negative values.
```yaml
type: custom:sections-gauge-card
entities:
  - entity: input_number.test_grid_power
    min: -3000
    max: 3000
title: Grid
transparent: false
style: "1"
decimal_places: null
show_zero_marker: true
```

<img width="263" height="179" alt="Screenshot 2026-01-03 at 10 34 41" src="https://github.com/user-attachments/assets/fc584464-c14f-49a6-946a-f0c59677e81b" />

A card showing multiple entities, transparency and color override.
```yaml
type: custom:sections-gauge-card
entities:
  - entity: sensor.pv_power
    min: 0
    max: 5000
    target: sensor.pv_forecast_now_power
  - entity: sensor.pv_energy_today_kwh
    min: 0
    max: 20
    target: sensor.prediction_pv_energy_today
transparent: true
progress_color: var(--energy-solar-color)
```

<img width="458" height="193" alt="Screenshot 2026-01-09 at 14 58 33" src="https://github.com/user-attachments/assets/81a7568a-5315-436a-b13d-b987cf415d68" />

A card showing different colors when values are passed. `value` can be an integer or an entity. `color` can be HEX, RGB etc...

In this example the color is red when below `0` but above `-3000`, and green when above `0`.
```yaml
type: custom:sections-gauge-card
entities:
  - entity: input_number.test_solar_power
    min: -3000
    max: 3000
    ranges:
      - value: 0
        color: "color-mix(in srgb, #0f9d58 70%, black)"
      - value: -3000
        color: "color-mix(in srgb, #ff3333 70%, black)"
```
