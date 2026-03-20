# BOM Interactive Proxy Card

Self-contained Home Assistant custom card for embedding [BOM Interactive Proxy](https://github.com/probablydns/bom-interactive-proxy) on a dashboard.

The display name is `BOM Interactive Proxy Card`.
The card type remains `custom:bom-radar-card` for backward compatibility.

This folder is intended to be copied into its own repository as-is.

The card is a companion for the BOM Interactive Proxy app/add-on:

- App repo: `https://github.com/probablydns/bom-interactive-proxy`
- App add-on docs: `https://github.com/probablydns/bom-interactive-proxy/tree/main/bom_interactive_proxy`

## What It Includes

- `bom-radar-card.js`: single-file custom card with a built-in Lovelace editor
- `hacs.json`: minimal metadata so the folder can become a HACS repo
- `icon.png` and `logo.png`: same artwork as the BOM Interactive Proxy app, so the card repo can carry matching branding in HACS/GitHub
- no build step required

## Recommended Base URL

Use a stable proxy root for `base_url`:

- local direct access: `http://homeassistant.local:8083/`
- reverse-proxied access: `https://weather.example.com/`

If `base_url` is left blank, the card uses the stable Home Assistant ingress path `/app/13fa7b7e_bom_interactive_proxy/`.

Avoid hardcoding Home Assistant ingress session URLs for long-lived dashboards. They are useful for testing, but they are not the best stable dashboard target.

If your Home Assistant dashboard is served over HTTPS, use an HTTPS or same-origin `base_url`. Browsers can block `http://...:8083/` as mixed content.

## Dependency

This card does not talk to BOM directly. It embeds the BOM Interactive Proxy app/add-on, so install and verify that first:

- GitHub: `https://github.com/probablydns/bom-interactive-proxy`
- Home Assistant add-on slug: `bom_interactive_proxy`

## Install

### HACS Repo Layout

If you copy this folder into a new repository root, the repo is ready for HACS as a frontend repository.

### Manual Install

1. Copy `bom-radar-card.js` into your Home Assistant `www` folder, for example:
   `/config/www/bom-radar-card/bom-radar-card.js`
2. Add a dashboard resource:

```yaml
url: /local/bom-radar-card/bom-radar-card.js
type: module
```

3. Add the card to a dashboard.

## Minimal Example

```yaml
type: custom:bom-radar-card
title: BOM Radar
place: melbourne
zoom: 7
```

## Ingress Example

```yaml
type: custom:bom-radar-card
title: BOM Radar
base_url: /app/13fa7b7e_bom_interactive_proxy/
place: melbourne
zoom: 7
```

## Advanced Example

```yaml
type: custom:bom-radar-card
title: Ashburton Radar
base_url: http://homeassistant.local:8083/
place: ashburton
zoom: 7
zoom_start: 5
show_frame_time: on
show_zoom_status: on
show_town_names: on
interactive: on
animate: on
animate_mode: native
height: 520
refresh_interval: 10
```

## Configuration Reference

| Key | Type | Description |
| --- | --- | --- |
| `title` | string | Optional card header. |
| `base_url` | string | Root URL of BOM Interactive Proxy. Leave blank to use `/app/13fa7b7e_bom_interactive_proxy/`. |
| `path` | string | Full BOM location path. |
| `place` | string | Place lookup, for example `melbourne` or `richmond,vic`. |
| `coords` | string | Coordinate lookup in `lat,lon` form. |
| `zoom` | number | Target zoom level. |
| `zoom_start` | number | Optional initial zoom before final zoom. |
| `show_frame_time` | `default`, `on`, `off` | Proxy `showFrameTime` setting. |
| `show_zoom_status` | `default`, `on`, `off` | Proxy `showZoomStatus` setting. |
| `show_town_names` | `default`, `on`, `off` | Proxy `showTownNames` setting. |
| `interactive` | `default`, `on`, `off` | Proxy `interactive` setting. |
| `animate` | `default`, `on`, `off` | Proxy `animate` setting. |
| `animate_mode` | `native`, `throttle` | Proxy `animateMode` setting. Leave unset for proxy default. |
| `animate_interval` | number | Proxy `animateInterval` in milliseconds. |
| `frame_skip` | number | Proxy `frameSkip` setting. |
| `low_power` | `default`, `on`, `off` | Proxy `lowPower` setting. |
| `height` | number | Card body height in pixels. |
| `refresh_interval` | number | Minutes between forced iframe reloads. `0` or blank disables it. |
| `extra_query` | string | Raw query string appended to the generated URL. |

## Notes

- The card passes options straight through to the proxy URL, so the proxy remains the source of truth.
- The stable ingress path for this add-on is `/app/13fa7b7e_bom_interactive_proxy/`.
- `path` is the most specific location option and should win over `place` or `coords`.
- The built-in editor exposes the most useful dashboard options without needing YAML.
- Tested against BOM Interactive Proxy `1.0.64`.
