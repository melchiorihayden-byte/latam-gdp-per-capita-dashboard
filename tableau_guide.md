# Tableau Public build guide

Build this workbook yourself in Tableau Public using `data.csv` from the same project folder. The project definition is one observed country-year row; years 2000–2023; endpoint comparisons include only countries with values at both endpoints. Keep all 36 matched countries selected by default.

## Default values to verify

From `numbers_check.md`:

- 2000 equal-country mean: **$8,893.4** (display as about **$8,893**).
- 2023 equal-country mean: **$11,944.1** (display as about **$11,944**).
- Change in equal-country mean: **34.30%**.
- Countries with an increase: **32 / 36**.
- Finding sentence: **Real GDP per capita increased 34.30% across the equally weighted 36-country matched cohort; 32 of 36 countries finished above their 2000 level.**
- Strongest increase: Guyana, **514.46%**; largest decline: Venezuela, RB, **−61.74%**.

## Connect and calculated fields

1. Open Tableau Public and connect to **Text file** `data.csv`. Confirm the four fields are `country`, `iso3`, `year`, and `gdp_per_capita_constant_2015_usd`. Set `year` to a whole number and the GDP field to a decimal number.
2. Create **GDP per capita**: `FLOAT([gdp_per_capita_constant_2015_usd])`.
3. Create **2000 GDP per capita by country**:

   ```tableau
   { FIXED [iso3] : MAX(IF [year] = 2000 THEN [GDP per capita] END) }
   ```

4. Create **2023 GDP per capita by country**:

   ```tableau
   { FIXED [iso3] : MAX(IF [year] = 2023 THEN [GDP per capita] END) }
   ```

5. Create **Matched endpoint country**:

   ```tableau
   NOT ISNULL([2000 GDP per capita by country])
   AND NOT ISNULL([2023 GDP per capita by country])
   ```

6. Create **Country endpoint change %**:

   ```tableau
   [2023 GDP per capita by country] / [2000 GDP per capita by country] - 1
   ```

   Format as Percentage with two decimal places. These fixed fields return one endpoint value per country even though the source has one row per year.

## Worksheets

7. **Annual mean trend:** put `year` on Columns (continuous), `AVG([GDP per capita])` on Rows, and `iso3` on Detail. Filter `Matched endpoint country` to True and keep 2000–2023. Each year has at most one source row per country, so AVG is an equal-country mean. Add the Country quick filter described below.
8. **Top 10 endpoint gains:** put `country` on Rows and `MIN([Country endpoint change %])` on Columns; use Bar marks, sort descending, show labels as percentages, and keep the top 10 countries by this measure. Filter `Matched endpoint country` to True.
9. **Bottom 10 endpoint changes:** duplicate the ranking sheet, sort ascending, and keep the bottom 10. Keep a diverging color around zero if convenient.
10. **KPI sheets:** create one sheet per metric. Put `iso3` on Detail so Tableau has one mark per country and filter `Matched endpoint country` to True. Use these table calculations on Text:

   ```tableau
   // 2000 mean
   WINDOW_AVG(MIN([2000 GDP per capita by country]))

   // 2023 mean
   WINDOW_AVG(MIN([2023 GDP per capita by country]))

   // Change in the equally weighted mean
   WINDOW_AVG(MIN([2023 GDP per capita by country]))
   / WINDOW_AVG(MIN([2000 GDP per capita by country])) - 1

   // Number of matched countries whose 2023 value is higher
   WINDOW_SUM(IIF(MIN([2023 GDP per capita by country]) >
   MIN([2000 GDP per capita by country]), 1, 0))
   ```

   For each table calculation choose **Compute Using → iso3**. The view must contain one mark per country. If the value repeats once per country, that is expected; format the sheet as a text KPI and use a table-calculation `INDEX() = 1` filter computed by `iso3` to show a single mark. Verify it still recomputes after using the Country filter.

## Dashboard and control

11. Make a dashboard with a title stating the question, one country-year row, and 2000–2023. Add four KPI sheets across the top, the annual mean trend, top and bottom rankings, and the one-sentence finding above.
12. Add `country` as a multiple-values dropdown quick filter. From the filter menu choose **Apply to Worksheets → All Using This Data Source**. This one control changes the trend, both ranking charts, the matched cohort, and all four table-calculated KPIs. Default it to all countries.
13. Give every chart a title, display percentage labels on the rankings, format GDP per capita as US dollars with no decimals, and check the four default KPI values against the list above. Test by selecting Brazil, Mexico, and Argentina: for 2010–2023 their matched-cohort values should be 2010 mean **$10,523.0**, 2023 mean **$10,838.6**, change **3.00%**, and **2 / 3** countries increased. (For this spot check, set the fixed endpoint years to 2010 and 2023 in a duplicate workbook or adapt the endpoint fields.)
14. Publish with **File → Save to Tableau Public As**. Copy the public dashboard URL and add it and the matching KPI values to the report page's agreement table and `submission.txt`.

If your Tableau version presents a menu differently, use the current screen and retain the calculated-field definitions and expected values above.
