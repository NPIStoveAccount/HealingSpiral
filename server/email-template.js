const TIER_COLORS = {
  1: '#4ade80', // Exemplary - green
  2: '#86efac', // Strong - light green
  3: '#fde047', // Moderate - yellow
  4: '#fbbf24', // Developing - amber
  5: '#fb923c', // Emerging - orange
  6: '#f87171', // Minimal - red
  7: '#991b1b', // Harmful - dark red
};

export function buildEmailHTML({ scores, dimensions, tierLabels, modalities }) {
  const dimRows = (dimensions || []).map(d => {
    const tier = scores?.[d.id] || 4;
    const label = tierLabels?.[tier] || 'N/A';
    const color = TIER_COLORS[tier] || '#888';
    const pct = Math.max(10, ((7 - tier) / 6) * 100);
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2520;font-size:14px;">
          ${d.emoji || ''} ${d.label || d.id}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2520;width:180px;">
          <div style="background:#1a1714;border-radius:4px;height:14px;width:100%;">
            <div style="background:${color};border-radius:4px;height:14px;width:${pct}%;"></div>
          </div>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2520;text-align:center;">
          <span style="background:${color};color:#0e0c0a;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">
            ${label}
          </span>
        </td>
      </tr>`;
  }).join('');

  const lowestDims = (dimensions || []).filter(d => (scores?.[d.id] || 0) >= 5);
  const growthEdge = lowestDims.length > 0
    ? `<div style="background:#1a1714;border:1px solid #c9a227;border-radius:8px;padding:16px;margin:24px 0;">
        <p style="color:#c9a227;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Key Growth Edge</p>
        <p style="color:#e8e0d4;margin:0;font-size:14px;">
          Your strongest growth opportunity lies in <strong>${lowestDims.map(d => d.label).slice(0, 2).join(' and ')}</strong>.
          ${lowestDims[0]?.description || ''}
        </p>
      </div>`
    : '';

  const modalityList = (modalities || []).slice(0, 5).map(m =>
    `<li style="padding:4px 0;font-size:14px;">${m.name}</li>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0e0c0a;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">

    <div style="text-align:center;padding:24px 0;">
      <div style="font-size:32px;color:#c9a227;">&#9678;</div>
      <h1 style="color:#e8e0d4;font-size:28px;margin:8px 0 4px;">The Healing Spiral</h1>
      <p style="color:#8a7a68;font-size:14px;margin:0;">Your Personal Profile</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <thead>
        <tr>
          <th style="padding:8px 12px;text-align:left;color:#c9a227;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #c9a227;">Dimension</th>
          <th style="padding:8px 12px;text-align:left;color:#c9a227;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #c9a227;">Level</th>
          <th style="padding:8px 12px;text-align:center;color:#c9a227;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #c9a227;">Tier</th>
        </tr>
      </thead>
      <tbody style="color:#e8e0d4;">
        ${dimRows}
      </tbody>
    </table>

    ${growthEdge}

    ${modalityList ? `
    <div style="margin:24px 0;">
      <h3 style="color:#c9a227;font-size:16px;margin:0 0 12px;">Top Recommended Modalities</h3>
      <ul style="color:#e8e0d4;margin:0;padding-left:20px;">
        ${modalityList}
      </ul>
    </div>` : ''}

    <div style="text-align:center;padding:32px 0 16px;border-top:1px solid #2a2520;margin-top:32px;">
      <p style="color:#8a7a68;font-size:12px;margin:0;">The Healing Spiral &mdash; An integrative map of personal evolution</p>
    </div>
  </div>
</body>
</html>`;
}
