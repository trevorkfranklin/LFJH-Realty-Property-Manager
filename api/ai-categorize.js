// Node runtime (not edge) so a large batch has real headroom to finish —
// edge functions are capped at ~25s and this prompt can run long with a full
// examples/uncategorized batch.
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenRouter API key not configured' });

  const { uncategorized, examples, properties, owners, categories } = req.body;

  const propLines   = properties.map(p => `  id="${p.id}" name="${p.name}"`).join('\n');
  const ownerLines  = owners.map(o => `  id="${o.id}" name="${o.name}"`).join('\n');
  const catList     = categories.join(', ');

  const exampleLines = examples.slice(0, 50).map(tx => {
    const propName = properties.find(p => p.id === tx.propertyId)?.name || '';
    let extra = propName ? ` @ ${propName}` : '';
    if (tx.splits?.length) extra += ` splits=${JSON.stringify(tx.splits)}`;
    if (tx.category === 'Rent' && tx.rentPeriods?.length) extra += ` rentPeriods=[${tx.rentPeriods.join(',')}]`;
    if (tx.category === 'Owner Draw' && tx.ownerId) {
      const o = owners.find(o => o.id === tx.ownerId);
      if (o) extra += ` owner="${o.name}"`;
    }
    if (tx.category === 'Property Tax' && tx.taxYear) extra += ` taxYear=${tx.taxYear} taxType=${tx.taxType || '?'}`;
    return `  ${tx.date} | ${tx.type} | $${tx.amount} | "${tx.description}" → ${tx.category}${extra}`;
  }).join('\n');

  const uncatLines = uncategorized.map(tx =>
    `  id="${tx.id}" date=${tx.date} type=${tx.type} amount=$${tx.amount} desc="${tx.description}"${tx.notes ? ` notes="${tx.notes}"` : ''}`
  ).join('\n');

  const system = `You are a property management bookkeeper. Categorize transactions for a residential rental portfolio.

CATEGORIES: ${catList}

PROPERTIES:
${propLines || '  (none)'}

OWNERS:
${ownerLines || '  (none)'}

RULES:
- Rent (Income): tenant rent payments. Set rentPeriods to ["YYYY-MM"] based on the transaction date (the month rent is FOR, usually same or prior month).
- Owner Draw (Expense): distributions/transfers to owners. Set ownerId if the description or pattern matches an owner.
- Property Tax (Expense): county/MUD tax payments. Set taxYear (typically the year on the bill or transaction year) and taxType "County" or "MUD" based on description clues.
- Mortgage (Expense): mortgage/loan payments. Assign to the specific property if identifiable.
- HOA Fees (Expense): HOA dues or assessments.
- Insurance (Expense): insurance premiums.
- Repairs & Maintenance (Expense): repairs, maintenance, supplies, contractors.
- Utilities (Expense): electric, water, gas, etc.
- Management Fees (Expense): property management charges.
- Security Deposit (Income or Expense): deposit received from or returned to tenant.
- Advertising (Expense): listings, marketing.
- Professional Services (Expense): legal, accounting, inspections.
- Other Income / Other Expense: use sparingly for truly unclassifiable items.
- Assign propertyId when the transaction clearly belongs to one property (tenant name, address mention, etc.).
- Use splits array only when one payment explicitly covers multiple properties.
- Leave propertyId null and splits null for portfolio-wide expenses.
- confidence: "high" = very clear match, "medium" = likely, "low" = uncertain guess.

CATEGORIZED EXAMPLES (learn from these patterns):
${exampleLines || '  (no examples yet — use best judgment)'}

Respond ONLY with valid JSON matching this exact schema — no markdown, no explanation:
{
  "suggestions": [
    {
      "id": "transaction-id",
      "category": "Category Name",
      "propertyId": "property-id or null",
      "splits": null,
      "ownerId": null,
      "rentPeriods": null,
      "taxYear": null,
      "taxType": null,
      "confidence": "high"
    }
  ]
}`;

  const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://lt2d-realty-property-manager.vercel.app',
      'X-Title': 'LT2D Realty Property Manager',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-v4-flash',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Categorize these ${uncategorized.length} transactions:\n${uncatLines}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    }),
  });

  if (!orRes.ok) {
    const err = await orRes.text();
    return res.status(orRes.status).send(err);
  }

  const data = await orRes.json();
  const content = data.choices?.[0]?.message?.content || '{"suggestions":[]}';
  return res.status(200).setHeader('Content-Type', 'application/json').send(content);
}
