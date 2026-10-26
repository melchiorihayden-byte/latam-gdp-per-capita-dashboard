# Regional GDP-per-capita dashboard

**Question:** Which Latin American and Caribbean countries made the strongest real GDP-per-capita gains from 2000 to 2023?  
**Reader:** A regional development bank investment strategist.  
**Rows counted:** One World Bank country-year observation; endpoint comparisons use countries with nonmissing values in both endpoint years.  
**Period:** 2000 through 2023, inclusive.

## Data and definitions

`data.csv` is an extract of the World Bank World Development Indicators API for indicator `NY.GDP.PCAP.KD` (GDP per capita, constant 2015 US$), limited to World Bank country records in region code LCN and years 2000–2023. The API returned 935 nonmissing observations across 40 country groups. Thirty-six countries have data at both endpoints. No missing values are filled, and no regional aggregates are included. “Strongest gain” means the largest percentage change in a country’s value, not the largest absolute dollar increase. The source series definition is documented in the [World Bank indicator glossary](https://databank.worldbank.org/metadataglossary/world-development-indicators/series/NY.GDP.PCAP.KD).

For the start and end metrics, only countries observed in both selected endpoint years are included, and each country has equal weight. The percentage change is the 2023 mean divided by the 2000 mean, minus one. The gain count is the number of matched countries whose endpoint increased. Annual trend means use the same matched country cohort, averaging available observations in each year.

## Files

- `index.html` — report, findings, three charts, data-method notes, and agreement-table shell.
- `dashboard.html` — interactive country and endpoint-year filters, four changing metrics, charts, and a detail table.
- `site.css` — shared responsive visual design.
- `site.js` — CSV loading, calculations, filtering, URL state, and SVG charts.
- `data.csv` — source panel data used by both the site and Tableau.
- `check_numbers.py` — reproducible answer-key calculations.
- `verify_site.js` — compares the browser calculation functions with the checked default and filtered values.
- `numbers_check.md` — default values, findings, and a filtered spot-check.
- `tableau_guide.md` — build instructions and expected worksheet values for Tableau Public.
- `AGENTS.md` — locked definitions and project rules.
- `submission.txt` — four-line submission file; links are placeholders until publication is complete.

## Preview locally

From this folder run `uv run python -m http.server 8000`, then open `http://localhost:8000/`. The dashboard uses `fetch` to load `data.csv`, so it needs a local web server (opening the HTML file directly will block the data request).

Run `uv run python check_numbers.py` to regenerate `numbers_check.md`, and `node verify_site.js` to check the website's calculations against the default and filtered answer-key values.

## Publish

Create a **public** GitHub repository named `latam-gdp-per-capita-dashboard`, push this folder, then enable GitHub Pages from the `main` branch root. Tableau Public publication must be completed from Tableau Public after you build and verify the workbook using `tableau_guide.md`. Update the agreement table, Tableau link, and `submission.txt` only after the dashboard is public and its values match the website.
