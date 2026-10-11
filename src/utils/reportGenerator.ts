import { AnalysisItem } from '../types';
import { ALL_THEMES } from './themes';

export function generateMarkdownReport(items: AnalysisItem[]): string {
  if (items.length === 0) {
    return '# Tonewise Sentiment Report\n\nNo review data available yet. Analyze comments to generate insights.';
  }

  const total = items.length;
  const positiveCount = items.filter((i) => i.finalSentiment === 'positive').length;
  const neutralCount = items.filter((i) => i.finalSentiment === 'neutral').length;
  const negativeCount = items.filter((i) => i.finalSentiment === 'negative').length;

  const posPct = ((positiveCount / total) * 100).toFixed(1);
  const neuPct = ((neutralCount / total) * 100).toFixed(1);
  const negPct = ((negativeCount / total) * 100).toFixed(1);

  // Engine agreement
  const itemsWithBoth = items.filter((i) => i.huggingFace !== null && i.huggingFace !== undefined);
  const agreementCount = itemsWithBoth.filter((i) => !i.needsReview).length;
  const disagreementCount = itemsWithBoth.filter((i) => i.needsReview).length;
  const agreementPct =
    itemsWithBoth.length > 0 ? ((agreementCount / itemsWithBoth.length) * 100).toFixed(1) : '100.0';

  // Theme statistics
  const themeStats = ALL_THEMES.map((theme) => {
    const themeItems = items.filter((i) => i.themes.includes(theme));
    const themePos = themeItems.filter((i) => i.finalSentiment === 'positive').length;
    const themeNeu = themeItems.filter((i) => i.finalSentiment === 'neutral').length;
    const themeNeg = themeItems.filter((i) => i.finalSentiment === 'negative').length;
    return {
      theme,
      total: themeItems.length,
      pos: themePos,
      neu: themeNeu,
      neg: themeNeg,
      negRate: themeItems.length > 0 ? (themeNeg / themeItems.length) * 100 : 0,
      posRate: themeItems.length > 0 ? (themePos / themeItems.length) * 100 : 0,
    };
  }).filter((t) => t.total > 0);

  // Top complaints (themes sorted by negative count)
  const topComplaints = [...themeStats]
    .filter((t) => t.neg > 0)
    .sort((a, b) => b.neg - a.neg);

  // Top praises (themes sorted by positive count)
  const topPraises = [...themeStats]
    .filter((t) => t.pos > 0)
    .sort((a, b) => b.pos - a.pos);

  // Notable samples
  const disagreements = items.filter((i) => i.needsReview).slice(0, 3);
  const topNegative = items.filter((i) => i.finalSentiment === 'negative').slice(0, 3);
  const topPositive = items.filter((i) => i.finalSentiment === 'positive').slice(0, 3);

  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# Tonewise Executive Sentiment Report
*Generated on ${now} • ${total} Total Reviews Evaluated*

---

## 1. Executive Summary
**${positiveCount} of ${total} comments (${posPct}%) are positive, ${neutralCount} (${neuPct}%) neutral, and ${negativeCount} (${negPct}%) negative.**

| Metric | Count | Share |
| :--- | :---: | :---: |
| **Total Analyzed** | **${total}** | **100.0%** |
| **Positive** (Mint) | ${positiveCount} | ${posPct}% |
| **Neutral** (Amber) | ${neutralCount} | ${neuPct}% |
| **Negative** (Coral) | ${negativeCount} | ${negPct}% |
| **Dual Engine Consensus** | ${agreementCount} / ${itemsWithBoth.length || total} | ${agreementPct}% |
| **Flagged for Review (Disagreements)** | ${disagreementCount} | ${(100 - Number(agreementPct)).toFixed(1)}% |

---

## 2. Thematic Drivers

### Common Problems (Primary Friction Areas)
${
  topComplaints.length > 0
    ? topComplaints
        .map(
          (t, idx) =>
            `${idx + 1}. **${t.theme}**: ${t.neg} negative reviews (${t.negRate.toFixed(1)}% negative share out of ${t.total} mentions)`
        )
        .join('\n')
    : '_No significant negative theme friction detected in this dataset._'
}

### What Gets Praised (Key Value Highlights)
${
  topPraises.length > 0
    ? topPraises
        .map(
          (t, idx) =>
            `${idx + 1}. **${t.theme}**: ${t.pos} positive mentions (${t.posRate.toFixed(1)}% praise share out of ${t.total} mentions)`
        )
        .join('\n')
    : '_No clear praise clusters identified in this dataset._'
}

### Sentiment Matrix by Theme
| Theme Category | Total Mentions | Positive | Neutral | Negative |
| :--- | :---: | :---: | :---: | :---: |
${
  themeStats.length > 0
    ? themeStats
        .map(
          (t) =>
            `| ${t.theme} | ${t.total} | ${t.pos} | ${t.neu} | ${t.neg} |`
        )
        .join('\n')
    : '| None tagged | 0 | 0 | 0 | 0 |'
}

---

## 3. Engine Reconciliation Analysis
- **VADER (Rule-Based)** vs. **RoBERTa (Deep Attention Transformer)**:
- Total consensus items: **${agreementCount}**
- Items where engines diverged: **${disagreementCount}** (${(100 - Number(agreementPct)).toFixed(1)}%)
- *Note:* The reconciler prioritizes RoBERTa when transformer confidence is $\\ge 70\\%$, addressing complex pragmatic cases like delayed orders or subtle passive dissatisfaction.

${
  disagreements.length > 0
    ? `### Flagged Divergence Examples:
${disagreements
  .map(
    (d, i) =>
      `> **${i + 1}. "${d.text}"**\n> *VADER:* **${d.vader.label.toUpperCase()}** (compound ${d.vader.compound > 0 ? '+' : ''}${d.vader.compound}) | *RoBERTa:* **${d.huggingFace?.label.toUpperCase() || 'N/A'}** (${((d.huggingFace?.probabilities[d.huggingFace.label] || 0) * 100).toFixed(1)}%) → Selected: **${d.finalSentiment.toUpperCase()}**`
  )
  .join('\n\n')}`
    : ''
}

---

## 4. Notable Verbatim Samples

### Negative Friction Highlights
${
  topNegative.length > 0
    ? topNegative
        .map((n, i) => `${i + 1}. *"${n.text}"* — Themes: \`${n.themes.join(', ') || 'General'}\``)
        .join('\n')
    : '_None recorded._'
}

### Positive Praise Highlights
${
  topPositive.length > 0
    ? topPositive
        .map((p, i) => `${i + 1}. *"${p.text}"* — Themes: \`${p.themes.join(', ') || 'General'}\``)
        .join('\n')
    : '_None recorded._'
}

---

## 5. Strategic Recommendations
1. **Focus on Top Complaints**: Immediately address root causes in **${topComplaints[0]?.theme || 'Customer Experience'}** to mitigate negative feedback velocity.
2. **Double Down on Strengths**: Amplify high-praise attributes from **${topPraises[0]?.theme || 'Product Experience'}** in product messaging and support workflows.
3. **Audit Borderline Cases**: Review the ${disagreementCount} flagged items to identify evolving terminology or emerging issues that rule-based systems overlook.

*Report created locally with Tonewise. Data never left your device.*
`;

  return md;
}
