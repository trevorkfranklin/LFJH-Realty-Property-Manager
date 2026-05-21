export const sampleProperties = [
  {
    id: 'p1', name: '123 Oak Street',
    address: '123 Oak Street, Austin, TX 78701',
    type: 'Single Family', purchasePrice: 285000, monthlyRent: 2200,
    bedrooms: 3, bathrooms: 2, sqft: 1450, status: 'Occupied', notes: '',
  },
  {
    id: 'p2', name: '456 Maple Ave, Unit 2B',
    address: '456 Maple Ave Unit 2B, Austin, TX 78704',
    type: 'Condo', purchasePrice: 195000, monthlyRent: 1650,
    bedrooms: 2, bathrooms: 1, sqft: 980, status: 'Occupied', notes: '',
  },
  {
    id: 'p3', name: '789 Pine Road',
    address: '789 Pine Road, Round Rock, TX 78664',
    type: 'Single Family', purchasePrice: 340000, monthlyRent: 2600,
    bedrooms: 4, bathrooms: 2, sqft: 2100, status: 'Vacant', notes: 'Needs new paint',
  },
];

export const sampleTenants = [
  {
    id: 't1', firstName: 'James', lastName: 'Martinez',
    email: 'james.martinez@email.com', phone: '(512) 555-0101',
    propertyId: 'p1', leaseStart: '2024-01-01', leaseEnd: '2026-12-31',
    monthlyRent: 2200, depositPaid: 2200, status: 'Active', notes: '',
  },
  {
    id: 't2', firstName: 'Sarah', lastName: 'Chen',
    email: 'sarah.chen@email.com', phone: '(512) 555-0202',
    propertyId: 'p2', leaseStart: '2024-03-01', leaseEnd: '2026-02-28',
    monthlyRent: 1650, depositPaid: 1650, status: 'Active', notes: '',
  },
];

export const sampleTransactions = [
  { id: 'tx1', date: '2026-05-01', description: 'Rent - James Martinez', amount: 2200, type: 'Income', category: 'Rent', propertyId: 'p1', notes: '' },
  { id: 'tx2', date: '2026-05-01', description: 'Rent - Sarah Chen', amount: 1650, type: 'Income', category: 'Rent', propertyId: 'p2', notes: '' },
  { id: 'tx3', date: '2026-05-05', description: 'Plumber - 123 Oak Street', amount: 320, type: 'Expense', category: 'Repairs & Maintenance', propertyId: 'p1', notes: 'Fixed kitchen sink leak' },
  { id: 'tx4', date: '2026-05-10', description: 'Property Insurance - Oak Street', amount: 145, type: 'Expense', category: 'Insurance', propertyId: 'p1', notes: '' },
  { id: 'tx5', date: '2026-05-12', description: 'Mortgage Payment - 789 Pine Road', amount: 1850, type: 'Expense', category: 'Mortgage', propertyId: 'p3', notes: '' },
  { id: 'tx6', date: '2026-04-01', description: 'Rent - James Martinez', amount: 2200, type: 'Income', category: 'Rent', propertyId: 'p1', notes: '' },
  { id: 'tx7', date: '2026-04-01', description: 'Rent - Sarah Chen', amount: 1650, type: 'Income', category: 'Rent', propertyId: 'p2', notes: '' },
  { id: 'tx8', date: '2026-04-15', description: 'Lawn Service', amount: 180, type: 'Expense', category: 'Landscaping', propertyId: 'p1', notes: '' },
  { id: 'tx9', date: '2026-03-01', description: 'Rent - James Martinez', amount: 2200, type: 'Income', category: 'Rent', propertyId: 'p1', notes: '' },
  { id: 'tx10', date: '2026-03-01', description: 'Rent - Sarah Chen', amount: 1650, type: 'Income', category: 'Rent', propertyId: 'p2', notes: '' },
  { id: 'tx11', date: '2026-03-08', description: 'HVAC Service', amount: 280, type: 'Expense', category: 'Repairs & Maintenance', propertyId: 'p2', notes: '' },
  { id: 'tx12', date: '2026-02-01', description: 'Rent - James Martinez', amount: 2200, type: 'Income', category: 'Rent', propertyId: 'p1', notes: '' },
  { id: 'tx13', date: '2026-02-01', description: 'Rent - Sarah Chen', amount: 1650, type: 'Income', category: 'Rent', propertyId: 'p2', notes: '' },
  { id: 'tx14', date: '2026-01-01', description: 'Rent - James Martinez', amount: 2200, type: 'Income', category: 'Rent', propertyId: 'p1', notes: '' },
  { id: 'tx15', date: '2026-01-01', description: 'Rent - Sarah Chen', amount: 1650, type: 'Income', category: 'Rent', propertyId: 'p2', notes: '' },
];

export const samplePropertyTaxes = [
  { id: 'pt1', propertyId: 'p1', taxYear: 2025, annualAmount: 4200, dueDate: '2026-01-31', paid: true, paidDate: '2026-01-15', notes: '' },
  { id: 'pt2', propertyId: 'p2', taxYear: 2025, annualAmount: 3100, dueDate: '2026-01-31', paid: true, paidDate: '2026-01-20', notes: '' },
  { id: 'pt3', propertyId: 'p3', taxYear: 2025, annualAmount: 5400, dueDate: '2026-01-31', paid: false, paidDate: null, notes: 'Pending payment' },
  { id: 'pt4', propertyId: 'p1', taxYear: 2026, annualAmount: 4350, dueDate: '2027-01-31', paid: false, paidDate: null, notes: '' },
];

export const TRANSACTION_CATEGORIES = [
  'Rent', 'Late Fee', 'Security Deposit', 'Mortgage', 'Property Tax',
  'Insurance', 'Repairs & Maintenance', 'Landscaping', 'Utilities',
  'HOA Fees', 'Management Fees', 'Advertising', 'Professional Services',
  'Other Income', 'Other Expense',
];

export const PROPERTY_TYPES = [
  'Single Family', 'Condo', 'Townhouse', 'Duplex', 'Multi-Family', 'Commercial', 'Land',
];
