// Returns true if a transaction contributes to the given YYYY-MM month.
// Rent with rentPeriods uses those periods; everything else uses transaction date.
export function txInMonth(tx, month) {
  if (tx.category === 'Rent' && tx.rentPeriods?.length > 0)
    return tx.rentPeriods.includes(month);
  return tx.date.startsWith(month);
}

// Returns true if a transaction contributes to ANY month in the given year.
export function txInYear(tx, year) {
  const y = String(year);
  if (tx.category === 'Rent' && tx.rentPeriods?.length > 0)
    return tx.rentPeriods.some(p => p.startsWith(y));
  return tx.date.startsWith(y);
}

// Amount attributable to a specific YYYY-MM month.
// Rent is split equally across all its rentPeriods.
export function amountForMonth(tx, month) {
  if (tx.category === 'Rent' && tx.rentPeriods?.length > 0) {
    if (!tx.rentPeriods.includes(month)) return 0;
    return Number(tx.amount) / tx.rentPeriods.length;
  }
  return tx.date.startsWith(month) ? Number(tx.amount) : 0;
}

// Amount attributable to a specific year (handles multi-year rent spans).
export function amountForYear(tx, year) {
  const y = String(year);
  if (tx.category === 'Rent' && tx.rentPeriods?.length > 0) {
    const inYear = tx.rentPeriods.filter(p => p.startsWith(y)).length;
    if (!inYear) return 0;
    return Number(tx.amount) * inYear / tx.rentPeriods.length;
  }
  return tx.date.startsWith(y) ? Number(tx.amount) : 0;
}

// Amount attributable to a specific property in a specific year,
// accounting for both splits and rentPeriods.
export function amountForPropertyYear(tx, propertyId, year) {
  const base = amountForYear(tx, year);
  if (base === 0) return 0;
  if (tx.splits?.length) {
    const sp = tx.splits.find(s => s.propertyId === propertyId);
    return sp ? base * sp.percentage / 100 : 0;
  }
  return tx.propertyId === propertyId ? base : 0;
}

// Amount attributable to a specific property in a specific month.
export function amountForPropertyMonth(tx, propertyId, month) {
  const base = amountForMonth(tx, month);
  if (base === 0) return 0;
  if (tx.splits?.length) {
    const sp = tx.splits.find(s => s.propertyId === propertyId);
    return sp ? base * sp.percentage / 100 : 0;
  }
  return tx.propertyId === propertyId ? base : 0;
}
