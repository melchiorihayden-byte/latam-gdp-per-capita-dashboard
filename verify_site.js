// Run the website's browser calculation functions against the saved CSV.
const fs = require('node:fs');
const vm = require('node:vm');
const context = { document: { addEventListener() {} }, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync('site.js', 'utf8'), context, { filename: 'site.js' });
const rows = context.parseCSV(fs.readFileSync('data.csv', 'utf8'));
const all = context.analyze(rows, 2000, 2023, null);
const spot = context.analyze(rows, 2010, 2023, new Set(['BRA', 'MEX', 'ARG']));
const report = {
  rows: rows.length,
  groups: new Set(rows.map(r => r.iso3)).size,
  default: { pairs: all.n, startMean: all.startMean, endMean: all.endMean, changePct: all.changePct, gainers: all.gainers, top: all.paired[0].country, bottom: [...all.paired].sort((a,b)=>a.changePct-b.changePct)[0].country },
  spotCheck: { pairs: spot.n, startMean: spot.startMean, endMean: spot.endMean, changePct: spot.changePct, gainers: spot.gainers }
};
console.log(JSON.stringify(report, null, 2));
const close = (a,b) => Math.abs(a-b) < 0.05;
if (report.rows !== 935 || report.groups !== 40 || all.n !== 36 || all.gainers !== 32 ||
    !close(all.startMean, 8893.4) || !close(all.endMean, 11944.1) || !close(all.changePct, 34.30) ||
    spot.n !== 3 || spot.gainers !== 2 || !close(spot.startMean, 10523.0) || !close(spot.endMean, 10838.6) || !close(spot.changePct, 3.00)) {
  process.exitCode = 1;
}
