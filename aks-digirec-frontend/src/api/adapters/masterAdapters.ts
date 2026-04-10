/**
 * Adapters to transform backend API responses to frontend types
 */

export const adaptSection = (s: any) => ({
  ...s,
  _id: s._id,
  companyId: s.companyId,
  code: s.code || '',
  sectionGroup: s.sectionGroup || s.name?.en || '',
  mainSection: s.mainSection || '',
  subSection: s.subSection || '',
  isNonMaterial: s.isNonMaterial || false,
  status: s.status || (s.isActive !== false ? 'active' : 'inactive'),
});

export const adaptRawMaterial = (m: any) => {
  if (!m) return m;
  return {
    ...m,
    _id: m._id || m.id,
    companyId: m.companyId,
    name: m.name || '',
    code: m.code || '',
    materialType: m.materialType || '',
    unit: m.unit || '',
    stock: m.stock ?? 0,
    amount: m.amount ?? 0,
    rate: m.rate ?? 0,
    minStock: m.minStock ?? 0,
    maxStock: m.maxStock ?? 0,
    status: m.status || (m.isActive !== false ? 'active' : 'inactive'),
  };
};

export const adaptSupplier = (s: any) => {
  if (!s) return s;
  return {
    ...s,
    _id: s._id || s.id,
    companyId: s.companyId,
    name: s.name || '',
    code: s.code || '',
    supplierType: s.supplierType || '',
    contactPerson: s.contactPerson || '',
    cellNumber: s.cellNumber || '',
    email: s.email || '',
    address: s.address || '',
    city: s.city || '',
    currentBalance: s.currentBalance ?? 0,
    paymentTerms: s.paymentTerms || '',
    status: s.status || (s.isActive !== false ? 'active' : 'inactive'),
  };
};

export const adaptWorker = (w: any) => {
  if (!w) return w;
  return {
    ...w,
    _id: w._id || w.id,
    companyId: w.companyId,
    name: w.name || '',
    code: w.code || '',
    advanceFixed: w.advanceFixed ?? 0,
    sectionGroup: w.sectionGroup || '',
    workerType: w.workerType || '',
    fatherName: w.fatherName || '',
    cnic: w.cnic || '',
    cellNumber: w.cellNumber || '',
    joinDate: w.joinDate,
    status: w.status || (w.isActive !== false ? 'active' : 'inactive'),
  };
};

export const adaptCustomer = (c: any) => {
  if (!c) return c;
  return {
    ...c,
    _id: c._id || c.id,
    companyId: c.companyId,
    name: c.name || '',
    code: c.code || '',
    customerType: c.customerType || '',
    contactPerson: c.contactPerson || '',
    cellNumber: c.cellNumber || '',
    currentBalance: c.currentBalance ?? 0,
    creditLimit: c.creditLimit ?? 0,
    status: c.status || (c.isActive !== false ? 'active' : 'inactive'),
  };
};

export const adaptFinishedGood = (f: any) => {
  if (!f) return f;
  return {
    ...f,
    _id: f._id || f.id,
    companyId: f.companyId,
    name: f.name || '',
    code: f.code || '',
    size: f.size || '',
    category: f.category || '',
    color: f.color || '',
    stock: f.stock ?? 0,
    costPrice: f.costPrice ?? 0,
    sellingPrice: f.sellingPrice ?? 0,
    minStock: f.minStock ?? 0,
    maxStock: f.maxStock ?? 0,
    status: f.status || (f.isActive !== false ? 'active' : 'inactive'),
  };
};
