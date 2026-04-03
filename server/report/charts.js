function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function svgDoc(width, height, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
${body}
</svg>`;
}

function lineChart(data, { valueKey, secondaryKey, title, stroke = '#1f6feb', fill = 'rgba(31, 111, 235, 0.14)', formatter = (value) => String(value) }) {
  const width = 980;
  const height = 360;
  const margin = { top: 42, right: 28, bottom: 54, left: 74 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const values = data.map((entry) => Number(entry[valueKey]) || 0);
  const secondaryValues = secondaryKey ? data.map((entry) => Number(entry[secondaryKey]) || 0) : [];
  const maxValue = Math.max(...values, ...secondaryValues, 1);
  const xStep = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth / 2;
  const x = (index) => margin.left + (data.length > 1 ? index * xStep : plotWidth / 2);
  const y = (value) => margin.top + plotHeight - (value / maxValue) * plotHeight;

  const linePoints = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const areaPoints = data.length > 1
    ? [
      `${margin.left},${margin.top + plotHeight}`,
      ...values.map((value, index) => `${x(index)},${y(value)}`),
      `${margin.left + plotWidth},${margin.top + plotHeight}`,
    ].join(' ')
    : '';
  const secondaryPoints = secondaryValues.length > 0
    ? secondaryValues.map((value, index) => `${x(index)},${y(value)}`).join(' ')
    : '';
  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = (maxValue / tickCount) * index;
    return {
      value,
      y: y(value),
    };
  });
  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return svgDoc(width, height, `
    <rect width="${width}" height="${height}" rx="24" fill="#ffffff"/>
    <text x="${margin.left}" y="26" font-size="18" font-family="Arial, sans-serif" font-weight="700" fill="#122033">${escapeXml(title)}</text>
    ${yTicks.map((tick) => `
      <line x1="${margin.left}" y1="${tick.y}" x2="${margin.left + plotWidth}" y2="${tick.y}" stroke="#e6edf5" stroke-width="1"/>
      <text x="${margin.left - 12}" y="${tick.y + 4}" text-anchor="end" font-size="11" font-family="Arial, sans-serif" fill="#5c6b7e">${escapeXml(formatter(tick.value))}</text>
    `).join('')}
    <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" stroke="#98a6b7" stroke-width="1.2"/>
    <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" stroke="#98a6b7" stroke-width="1.2"/>
    ${areaPoints ? `<polygon points="${areaPoints}" fill="${fill}"/>` : ''}
    ${secondaryPoints ? `<polyline points="${secondaryPoints}" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="8 6" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    ${data.length > 1
      ? `<polyline points="${linePoints}" stroke="${stroke}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<line x1="${x(0)}" y1="${margin.top + plotHeight}" x2="${x(0)}" y2="${y(values[0])}" stroke="${stroke}" stroke-width="3.5" stroke-linecap="round"/>`}
    ${values.map((value, index) => `
      <circle cx="${x(index)}" cy="${y(value)}" r="${data.length > 40 ? 0 : 3.8}" fill="${stroke}"/>
    `).join('')}
    ${data.map((entry, index) => index % labelStep === 0 || index === data.length - 1 ? `
      <text x="${x(index)}" y="${height - 18}" text-anchor="middle" font-size="11" font-family="Arial, sans-serif" fill="#5c6b7e">${escapeXml(entry.label)}</text>
    ` : '').join('')}
  `);
}

function horizontalBarChart(data, { title, formatter = (value) => String(value), getValue, getLabel, getColor }) {
  const width = 980;
  const height = 360;
  const margin = { top: 46, right: 100, bottom: 24, left: 220 };
  const plotWidth = width - margin.left - margin.right;
  const barGap = 18;
  const barHeight = Math.min(28, (height - margin.top - margin.bottom - barGap * (data.length - 1)) / Math.max(data.length, 1));
  const maxValue = Math.max(...data.map(getValue), 1);

  return svgDoc(width, height, `
    <rect width="${width}" height="${height}" rx="24" fill="#ffffff"/>
    <text x="${margin.left}" y="28" font-size="18" font-family="Arial, sans-serif" font-weight="700" fill="#122033">${escapeXml(title)}</text>
    ${data.map((entry, index) => {
      const y = margin.top + index * (barHeight + barGap);
      const value = getValue(entry);
      const barWidth = clamp((value / maxValue) * plotWidth, 0, plotWidth);
      return `
        <text x="${margin.left - 18}" y="${y + barHeight / 2 + 4}" text-anchor="end" font-size="13" font-family="Arial, sans-serif" fill="#122033">${escapeXml(getLabel(entry))}</text>
        <rect x="${margin.left}" y="${y}" width="${plotWidth}" height="${barHeight}" rx="12" fill="#eef3f8"/>
        <rect x="${margin.left}" y="${y}" width="${barWidth}" height="${barHeight}" rx="12" fill="${getColor(entry)}"/>
        <text x="${margin.left + plotWidth + 12}" y="${y + barHeight / 2 + 4}" font-size="12" font-family="Arial, sans-serif" fill="#475569">${escapeXml(formatter(value))}</text>
      `;
    }).join('')}
  `);
}

function stackedBarChart(data, { title, segments }) {
  const width = 980;
  const height = 380;
  const margin = { top: 52, right: 30, bottom: 56, left: 74 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const totals = data.map((entry) => segments.reduce((sum, segment) => sum + (Number(entry[segment.key]) || 0), 0));
  const maxValue = Math.max(...totals, 1);
  const barWidth = Math.max(10, plotWidth / Math.max(data.length * 1.8, 1));
  const gap = data.length > 1 ? (plotWidth - data.length * barWidth) / (data.length - 1) : 0;
  const labelStep = Math.max(1, Math.ceil(data.length / 7));

  return svgDoc(width, height, `
    <rect width="${width}" height="${height}" rx="24" fill="#ffffff"/>
    <text x="${margin.left}" y="30" font-size="18" font-family="Arial, sans-serif" font-weight="700" fill="#122033">${escapeXml(title)}</text>
    ${Array.from({ length: 5 }, (_, index) => {
      const value = (maxValue / 4) * index;
      const y = margin.top + plotHeight - (value / maxValue) * plotHeight;
      return `
        <line x1="${margin.left}" y1="${y}" x2="${margin.left + plotWidth}" y2="${y}" stroke="#e6edf5" stroke-width="1"/>
        <text x="${margin.left - 12}" y="${y + 4}" text-anchor="end" font-size="11" font-family="Arial, sans-serif" fill="#5c6b7e">${escapeXml(Math.round(value / 1000).toLocaleString('de-CH'))}k</text>
      `;
    }).join('')}
    ${data.map((entry, index) => {
      const x = margin.left + index * (barWidth + gap);
      let offset = 0;
      const rects = segments.map((segment) => {
        const value = Number(entry[segment.key]) || 0;
        const h = maxValue > 0 ? (value / maxValue) * plotHeight : 0;
        const y = margin.top + plotHeight - offset - h;
        offset += h;
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="6" fill="${segment.color}"/>`;
      }).join('');
      const label = index % labelStep === 0 || index === data.length - 1
        ? `<text x="${x + barWidth / 2}" y="${height - 18}" text-anchor="middle" font-size="11" font-family="Arial, sans-serif" fill="#5c6b7e">${escapeXml(entry.label)}</text>`
        : '';
      return `${rects}${label}`;
    }).join('')}
    ${segments.map((segment, index) => `
      <rect x="${margin.left + index * 156}" y="${height - 34}" width="12" height="12" rx="3" fill="${segment.color}"/>
      <text x="${margin.left + 18 + index * 156}" y="${height - 24}" font-size="11" font-family="Arial, sans-serif" fill="#334155">${escapeXml(segment.label)}</text>
    `).join('')}
  `);
}

module.exports = {
  horizontalBarChart,
  lineChart,
  stackedBarChart,
};
