console.log("main.js loaded ✅");

const csvPath = "data/aiddata.csv";

const COL_YEAR = "Commitment Year";
const COL_AMOUNT = "Amount (Constant USD 2021)";
const COL_SECTOR = "Sector Name";

let allRows = [];
let selectedYear = null;

// ---------- helpers ----------
function normalizeKey(key) {
  return String(key).replace(/\u00A0/g, " ").trim();
}

function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[normalizeKey(k)] = v;
  }
  return out;
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function toYear(value) {
  const y = Number(String(value).trim());
  return Number.isFinite(y) ? y : null;
}

// ---------- load + prepare ----------
d3.csv(csvPath)
  .then((raw) => {
    console.log("CSV loaded ✅");
    console.log("Rows:", raw.length);

    const data = raw.map(normalizeRow);

    console.log("Normalized column names:", Object.keys(data[0]));
    console.log("Sample year value:", data[0][COL_YEAR]);
    console.log("Sample amount value:", data[0][COL_AMOUNT]);

    allRows = data
      .map((d) => ({
        year: toYear(d[COL_YEAR]),
        sector: (d[COL_SECTOR] || "").trim(),
        amount: toNumber(d[COL_AMOUNT]),
      }))
      .filter((d) => d.year !== null && d.amount > 0);

    const totalsByYear = d3
      .rollups(
        allRows,
        (v) => d3.sum(v, (d) => d.amount),
        (d) => d.year
      )
      .map(([year, total]) => ({ year, total }))
      .sort((a, b) => d3.ascending(a.year, b.year));

    console.log("Year chart data points:", totalsByYear.length);

    drawYearBarChart(totalsByYear);

    selectedYear = d3.max(totalsByYear, (d) => d.year);
d3.select("#sector-title").text(`Sectors for Selected Year: ${selectedYear}`);
    console.log("Selected year:", selectedYear);

    drawSectorBarChart(buildSectorTotals(selectedYear));
  })
  .catch((err) => {
    console.error("CSV load failed ❌", err);
  });

// ---------- chart 1 (Year totals) ----------
function drawYearBarChart(data) {
  const width = 900;
  const height = 320;

  const margin = { top: 20, right: 20, bottom: 60, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  d3.select("#chart-year").selectAll("*").remove();

  const svg = d3
    .select("#chart-year")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.year))
    .range([0, innerWidth])
    .padding(0.15);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.total) || 0])
    .nice()
    .range([innerHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => i % 2 === 0)))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  g.append("g").call(d3.axisLeft(y));

  const tooltip = d3.select("#tooltip");

  g.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.year))
    .attr("y", (d) => y(d.total))
    .attr("width", x.bandwidth())
    .attr("height", (d) => innerHeight - y(d.total))
    .on("mousemove", (event, d) => {
      tooltip
        .style("opacity", 1)
        .text(`Year: ${d.year} | Total: ${d3.format(",.2f")(d.total)}`)
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY + 12 + "px");
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    })
    .on("click", (event, d) => {
      selectedYear = d.year;
d3.select("#sector-title").text(`Sectors for Selected Year: ${selectedYear}`);
      drawSectorBarChart(buildSectorTotals(selectedYear));
    });
}

// ---------- data for chart 2 ----------
function buildSectorTotals(year) {
  const filtered = allRows.filter((d) => d.year === year && d.sector !== "");

  return d3
    .rollups(
      filtered,
      (v) => d3.sum(v, (d) => d.amount),
      (d) => d.sector
    )
    .map(([sector, total]) => ({ sector, total }))
    .sort((a, b) => d3.descending(a.total, b.total))
    .slice(0, 12);
}

// ---------- chart 2 (Sectors for selected year) ----------
function drawSectorBarChart(data) {
  const width = 900;
  const height = 360;

  const margin = { top: 20, right: 20, bottom: 120, left: 160 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  d3.select("#barchart").selectAll("*").remove();

  const svg = d3
    .select("#barchart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.sector))
    .range([0, innerWidth])
    .padding(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.total) || 0])
    .nice()
    .range([innerHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  g.append("g").call(d3.axisLeft(y));

  const tooltip = d3.select("#tooltip");

g.selectAll("rect")
  .data(data)
  .enter()
  .append("rect")
  .attr("x", (d) => x(d.sector))
  .attr("y", (d) => y(d.total))
  .attr("width", x.bandwidth())
  .attr("height", (d) => innerHeight - y(d.total))
  .on("mousemove", (event, d) => {
    tooltip
      .style("opacity", 1)
      .text(`${d.sector} | Total: ${d3.format(",.2f")(d.total)}`)
      .style("left", event.pageX + 12 + "px")
      .style("top", event.pageY + 12 + "px");
  })
  .on("mouseleave", () => {
    tooltip.style("opacity", 0);
  });

}
