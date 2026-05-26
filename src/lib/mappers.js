// DB (snake_case) ↔ App (camelCase) mapping functions

export const propertyFromDB = (p) => ({
  id: p.id, name: p.name || '', address: p.address || '',
  type: p.type || 'Single Family',
  purchasePrice: Number(p.purchase_price) || 0,
  monthlyRent: Number(p.monthly_rent) || 0,
  bedrooms: Number(p.bedrooms) || 0,
  bathrooms: Number(p.bathrooms) || 0,
  sqft: Number(p.sqft) || 0,
  status: p.status || 'Occupied', notes: p.notes || '',
  mortgageAccountId: p.mortgage_account_id || '',
  hoa: p.hoa || '', hoaUrl: p.hoa_url || '',
  mudDistrict: p.mud_district || '', mudUrl: p.mud_url || '',
});
export const propertyToDB = (p) => ({
  id: p.id, name: p.name, address: p.address || null,
  type: p.type || null,
  purchase_price: Number(p.purchasePrice) || 0,
  monthly_rent: Number(p.monthlyRent) || 0,
  bedrooms: Number(p.bedrooms) || 0,
  bathrooms: Number(p.bathrooms) || 0,
  sqft: Number(p.sqft) || 0,
  status: p.status || 'Occupied', notes: p.notes || null,
  mortgage_account_id: p.mortgageAccountId || null,
  hoa: p.hoa || null, hoa_url: p.hoaUrl || null,
  mud_district: p.mudDistrict || null, mud_url: p.mudUrl || null,
});

export const tenantFromDB = (t) => ({
  id: t.id, firstName: t.first_name || '', lastName: t.last_name || '',
  email: t.email || '', phone: t.phone || '',
  coTenants: t.co_tenants || [],
  propertyId: t.property_id || '',
  leaseStart: t.lease_start || '', leaseEnd: t.lease_end || '',
  monthlyRent: Number(t.monthly_rent) || 0,
  depositPaid: Number(t.deposit_paid) || 0,
  petDeposit: Number(t.pet_deposit) || 0,
  status: t.status || 'Active', notes: t.notes || '',
});
export const tenantToDB = (t) => ({
  id: t.id, first_name: t.firstName || null, last_name: t.lastName || null,
  email: t.email || null, phone: t.phone || null,
  co_tenants: t.coTenants || [],
  property_id: t.propertyId || null,
  lease_start: t.leaseStart || null, lease_end: t.leaseEnd || null,
  monthly_rent: Number(t.monthlyRent) || 0,
  deposit_paid: Number(t.depositPaid) || 0,
  pet_deposit: Number(t.petDeposit) || 0,
  status: t.status || 'Active', notes: t.notes || null,
});

export const txFromDB = (t) => ({
  id: t.id, sfTxId: t.sf_tx_id || '',
  date: t.date || '', description: t.description || '',
  amount: Number(t.amount) || 0,
  type: t.type || 'Expense', category: t.category || '',
  propertyId: t.property_id || '', ownerId: t.owner_id || '',
  notes: t.notes || '', splits: t.splits || [],
  rentPeriods: t.rent_periods || [],
  taxYear: t.tax_year || null, taxType: t.tax_type || '',
  excluded: t.excluded || false, categorized: t.categorized || false,
});
export const txToDB = (t) => ({
  id: t.id, sf_tx_id: t.sfTxId || null,
  date: t.date, description: t.description,
  amount: Number(t.amount),
  type: t.type, category: t.category || null,
  property_id: t.propertyId || null, owner_id: t.ownerId || null,
  notes: t.notes || null, splits: t.splits || [],
  rent_periods: t.rentPeriods || [],
  tax_year: t.taxYear || null, tax_type: t.taxType || null,
  excluded: t.excluded || false, categorized: t.categorized || false,
});

export const ownerFromDB = (o) => ({
  id: o.id, firstName: o.first_name || '', lastName: o.last_name || '',
  email: o.email || '', phone: o.phone || '',
  ownershipPct: Number(o.ownership_pct) || 0, notes: o.notes || '',
});
export const ownerToDB = (o) => ({
  id: o.id, first_name: o.firstName || null, last_name: o.lastName || null,
  email: o.email || null, phone: o.phone || null,
  ownership_pct: Number(o.ownershipPct) || 0, notes: o.notes || null,
});

export const taxFromDB = (t) => ({
  id: t.id, propertyId: t.property_id || '',
  taxYear: t.tax_year || new Date().getFullYear(),
  taxType: t.tax_type || '',
  annualAmount: Number(t.amount) || 0,
  dueDate: t.due_date || '', notes: t.notes || '',
});
export const taxToDB = (t) => ({
  id: t.id, property_id: t.propertyId || null,
  tax_year: Number(t.taxYear) || null,
  tax_type: t.taxType || null,
  amount: Number(t.annualAmount) || 0,
  due_date: t.dueDate || null, notes: t.notes || null,
});

export const hoaFromDB = (h) => ({
  id: h.id, propertyId: h.property_id || '',
  year: h.year || new Date().getFullYear(),
  annualAmount: Number(h.amount) || 0,
  dueDate: h.due_date || '', notes: h.notes || '',
});
export const hoaToDB = (h) => ({
  id: h.id, property_id: h.propertyId || null,
  year: Number(h.year) || null,
  amount: Number(h.annualAmount) || 0,
  due_date: h.dueDate || null, notes: h.notes || null,
});
