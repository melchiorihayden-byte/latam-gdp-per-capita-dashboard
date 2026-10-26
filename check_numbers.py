"""Compute the project answer key from the supplied World Bank CSV."""
from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
START = 2000
END = 2023


def load_rows():
    rows = []
    with (ROOT / "data.csv").open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            rows.append({
                "country": row["country"],
                "iso3": row["iso3"],
                "year": int(row["year"]),
                "value": float(row["gdp_per_capita_constant_2015_usd"]),
            })
    return rows


def analyze(rows, start=START, end=END, selected=None):
    selected = set(selected) if selected else None
    by_country = defaultdict(dict)
    for row in rows:
        if start <= row["year"] <= end and (selected is None or row["iso3"] in selected):
            by_country[row["iso3"]][row["year"]] = row
    paired = []
    for years in by_country.values():
        if start in years and end in years:
            a, b = years[start], years[end]
            change = (b["value"] / a["value"] - 1) * 100
            paired.append({"country": a["country"], "iso3": a["iso3"], "start": a["value"], "end": b["value"], "change_pct": change, "change_usd": b["value"] - a["value"]})
    paired.sort(key=lambda r: r["change_pct"], reverse=True)
    if not paired:
        return {"start": start, "end": end, "n": 0, "start_mean": None, "end_mean": None, "change_pct": None, "gainers": 0, "paired": [], "series": []}
    start_mean = sum(r["start"] for r in paired) / len(paired)
    end_mean = sum(r["end"] for r in paired) / len(paired)
    series = []
    for year in range(start, end + 1):
        vals = [country[year]["value"] for code, country in by_country.items() if start in country and end in country and year in country]
        series.append({"year": year, "mean": sum(vals) / len(vals) if vals else None, "n": len(vals)})
    return {"start": start, "end": end, "n": len(paired), "start_mean": start_mean, "end_mean": end_mean, "change_pct": (end_mean / start_mean - 1) * 100, "gainers": sum(r["end"] > r["start"] for r in paired), "paired": paired, "series": series}


def fmt(value, digits=1):
    return "—" if value is None else f"{value:,.{digits}f}"


def main():
    rows = load_rows()
    result = analyze(rows)
    ranked = result["paired"]
    lows = sorted(ranked, key=lambda r: r["change_pct"])
    filtered = analyze(rows, 2010, 2023, ["BRA", "MEX", "ARG"])
    out = [
        "# Ground truth: World Bank GDP per capita, Latin America & Caribbean",
        "",
        "## Locked default view",
        "",
        f"- Source rows: {len(rows):,} observed country-year records; {len({r['iso3'] for r in rows})} countries appear at least once.",
        f"- Matched endpoint countries: {result['n']} with values in both {START} and {END}.",
        f"- {START} mean GDP per capita: ${fmt(result['start_mean'])} constant 2015 US$.",
        f"- {END} mean GDP per capita: ${fmt(result['end_mean'])} constant 2015 US$.",
        f"- Change in equally weighted mean: {fmt(result['change_pct'], 2)}%.",
        f"- Countries with an increase: {result['gainers']} of {result['n']}.",
        "",
        "## Findings",
        "",
        f"1. Largest percentage gain: {ranked[0]['country']} ({ranked[0]['iso3']}), {ranked[0]['change_pct']:.2f}% (${ranked[0]['change_usd']:,.0f}).",
        f"2. Largest percentage decline: {lows[0]['country']} ({lows[0]['iso3']}), {lows[0]['change_pct']:.2f}% (${lows[0]['change_usd']:,.0f}).",
        f"3. {result['gainers']} of {result['n']} matched countries ({result['gainers']/result['n']*100:.1f}%) finished above their 2000 level.",
        "",
        "## Tableau / dashboard spot check: Brazil, Mexico, Argentina; 2010–2023",
        "",
        f"- Matched countries: {filtered['n']}",
        f"- 2010 mean: ${fmt(filtered['start_mean'])}",
        f"- 2023 mean: ${fmt(filtered['end_mean'])}",
        f"- Change in equally weighted mean: {fmt(filtered['change_pct'], 2)}%",
        f"- Countries with an increase: {filtered['gainers']} of {filtered['n']}",
        "",
        "## Country endpoint ranking (top 10)",
        "",
        "| Country | ISO3 | 2000 (US$) | 2023 (US$) | Change |",
        "|---|---:|---:|---:|---:|",
    ]
    for r in ranked[:10]:
        out.append(f"| {r['country']} | {r['iso3']} | ${r['start']:,.0f} | ${r['end']:,.0f} | {r['change_pct']:.2f}% |")
    out += ["", "## Bottom 10 endpoint ranking", "", "| Country | ISO3 | 2000 (US$) | 2023 (US$) | Change |", "|---|---:|---:|---:|---:|"]
    for r in lows[:10]:
        out.append(f"| {r['country']} | {r['iso3']} | ${r['start']:,.0f} | ${r['end']:,.0f} | {r['change_pct']:.2f}% |")
    (ROOT / "numbers_check.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    print("\n".join(out[:22]))


if __name__ == "__main__":
    main()
