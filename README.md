# FloodAid Bangkok

A bilingual English/Thai flood-awareness app for eastern Bangkok, prepared for GitHub Pages at https://daytondeltap.github.io/flood-aid/.

## Publish

1. Open **Settings → Pages** in this repository and select **GitHub Actions** as the source.
2. Open **Actions → Deploy FloodAid to GitHub Pages → Run workflow** if the initial deployment failed before Pages was enabled.

The workflow builds and deploys on pushes to `main`, manual runs, and an hourly schedule. Scheduled execution may be delayed by GitHub. This is snapshot-based public data, not a real-time monitoring service.

## Google Maps key

The app works with OpenStreetMap by default. Open **Map settings** in the top bar to enter your Google Maps browser key. It is stored only in that tab's session. Enable **Maps JavaScript API** and billing, and restrict the key to **https://daytondeltap.github.io/*** and **Maps JavaScript API**.

For a site-wide key, add the repository Actions secret `GOOGLE_MAPS_BROWSER_KEY`, then run the workflow. The build injects it into public browser configuration: browser API keys are visible to visitors even when supplied via a build secret. Use website and API restrictions; never use a server-only secret. The key changes the basemap only. It does not supply flood depths, stock availability or routing data.

## Backend status / Supabase

GitHub Pages serves static files; it cannot run the included Worker or database. Maps, public sensor snapshots, weather, directory listings and route checks run in this version. Shared community reports, account-saved destinations and personalized watches are explicitly unavailable until a backend is connected.

Supabase is optional. A backend with authentication and a database is needed to restore shared reports and private account data; Supabase Auth/Postgres with row-level security would suit that role, as would a properly authenticated Worker/database service. **No Supabase account or project has been accessed or changed.** No records or credentials from the original private hosted app have been copied here.

`worker/`, `db/` and `drizzle/` preserve backend reference source. They are not deployed by this workflow. The previous trusted Sites authentication header is accepted only when the reference test environment explicitly sets `TRUSTED_SITES_DISPATCH=true`. A future public backend must implement and verify real authentication; do not enable that flag on an untrusted public endpoint.

## Development

Use Node 24 and Python 3.12+:

```sh
npm ci
npm run data:refresh
npm test
npm run build
python -m http.server 8080 --directory dist
```

`dist/` is the static Pages artifact. Tests cover source normalization, stale-data rules, route evidence, backend permissions, UI controls and Pages base-path/backend handling. Google Maps authorization must be checked with your restricted browser key after hosting is enabled.

## Sources and limitations

- ThaiWater public flood-road observations: source observation timestamps are retained. Readings older than 60 minutes are marked stale, even if downloaded recently. Heat intensity represents measured water depth near sensors, not soil saturation or complete inundation coverage.
- OpenStreetMap directory snapshots via an Overpass mirror; refresh roughly every six hours. Listings do not establish whether a business is open or has supplies. Failed updates retain existing snapshots with their original timestamps.
- Open-Meteo weather fetched by the browser.
- OSRM driving routes from FOSSGIS (`routing.openstreetmap.de`), with browser caching and throttling. Routes are not flood-aware. Sensor/report evidence does not certify a safe route; unmonitored areas remain unknown.
- Optional Google Maps basemap retains Google attribution. See the app's Privacy & terms page for external-provider details.

Public readings and directory snapshots in `web/data/` contain no private-site user records. The original hosted app is not removed by this migration.

## Retailer inventory routing

The Supplies view now has a separate retailer-stock panel with product/branch search, retailer filters, distance radius, optional device location, source observation times and quantities when provided. GPS stays in the browser. Inventory coordinates come from each feed, not guessed matches to directory names. A null quantity means the provider did not supply a count; zero means unavailable. Readings over 15 minutes old and failed sources do not establish current stock.

No 7-Eleven Thailand, Makro Thailand or restaurant inventory feed is connected by default. No documented public branch-inventory API was verified for those retailers. A Google Maps or Firebase key cannot grant retailer inventory access. Official retailer links let visitors check directly while access is being arranged. 7Delivery and ALL Online listings are not interchangeable with local store stock. Delivery-platform partner APIs require merchant credentials and cover authorized branches.

To connect an approved retailer API or adapter, add the GitHub Actions secret `INVENTORY_PROVIDERS_JSON`. Its keys are `7-eleven`, `makro`, and `restaurants`; each value contains `url` (HTTPS JSON endpoint) and optionally `bearerToken`. The scheduled workflow routes each provider separately. Only normalized public inventory is published; endpoint configuration and tokens stay in Actions. Connect only feeds whose stock information is intended for public display. This is an adapter contract, not a claim that retailers use this endpoint format. A native retailer response must be converted by its approved adapter to this schema:

```json
{"rows":[{"branchId":"retailer-branch-id","branchName":"Branch name","lat":13.812,"lng":100.731,"productId":"sku","productName":"Drinking water","quantity":null,"unit":"bottles","status":"unknown","observedAt":1791021000000,"url":"https://retailer.example/product"}]}
```

`observedAt` is the retailer's observation timestamp in Unix milliseconds, not the adapter download time. `status` accepts `available`, `limited`, `unavailable`, `unknown`. `quantity` must be a nonnegative number or null. Branch and product IDs/names are required. Records are limited to Bangkok and nearby coordinates. Invalid records are discarded. Provider failures retain earlier readings but mark the source unavailable. Removed connections remove their readings. No customer/account/order data belongs in a feed. Snapshot refresh is hourly, subject to GitHub scheduling delays; the refresh button reloads the last publication rather than contacting protected retailer APIs. Firebase is not required for this read-only snapshot integration.

Research: [CP ALL 7Delivery / ALL Online](https://www.cpall.co.th/en/sustain/social-dimension/customer-relationship-management), [Foodpanda partner catalog documentation](https://developer.foodpanda.com/en/documentation/catalog-api-use-cases). Neither supplies unrestricted access to other merchants' stock.

## Map usability and history

Map settings accepts a single Maps JavaScript browser key for all map views, with optional persistent storage on the device. A universal key for all visitors is entered as the existing `GOOGLE_MAPS_BROWSER_KEY` Actions secret; Map settings links to its entry page and the deployment workflow. Changes to a loaded SDK key reload the app rather than silently reusing the previous key.

Google Maps uses direct drag/zoom, keyboard shortcuts and fullscreen controls. Sensor overlays use a viewport-sized, pixel-density-aware canvas and clickable centimetre labels; they do not rely on Google's retired HeatmapLayer API. No current wet measurements means no current heat layer. The map explains this and offers the latest recorded time. Historical readings must never be presented as current flooding.

History shows an exact Bangkok date/time and date/time picker, with a slider spanning recorded measurements. The map and sensor list share the selected historical time. Snapshots accumulate up to 30 days of readings as they are collected; missing past measurements cannot be reconstructed. The available range can include older current-source records. District changes clear the old journey/history state.
