const mongoose = require('mongoose');
const { Section, RawMaterial, Supplier, Worker, Customer, FinishedGood, Company } = require('./models');

// Sample data for master data
const sampleSections = [
  {
    name: 'Production Floor',
    code: 'PROD-FLOOR',
    sectionGroup: 'Kiln Group',
    mainSection: 'Production',
    subSection: 'Floor Operations',
    description: 'Main production area for ceramic manufacturing',
    isNonMaterial: false,
    status: 'active'
  },
  {
    name: 'Quality Control',
    code: 'QC',
    sectionGroup: 'Kiln Group',
    mainSection: 'Quality',
    subSection: 'Inspection',
    description: 'Quality inspection and testing area',
    isNonMaterial: false,
    status: 'active'
  },
  {
    name: 'Packaging',
    code: 'PKG',
    sectionGroup: 'Packing Group',
    mainSection: 'Packaging',
    subSection: 'Final Packing',
    description: 'Packaging and dispatch section',
    isNonMaterial: false,
    status: 'active'
  },
  {
    name: 'Raw Material Storage',
    code: 'RM-STORAGE',
    sectionGroup: 'Clay Group',
    mainSection: 'Storage',
    subSection: 'Raw Materials',
    description: 'Storage area for raw materials',
    isNonMaterial: false,
    status: 'active'
  },
  {
    name: 'Finished Goods Storage',
    code: 'FG-STORAGE',
    sectionGroup: 'Packing Group',
    mainSection: 'Storage',
    subSection: 'Finished Goods',
    description: 'Storage area for finished products',
    isNonMaterial: false,
    status: 'active'
  }
];

const sampleRawMaterials = [
  {
    name: 'White Clay',
    code: 'CLAY-WHT-001',
    description: 'High quality white clay for premium ceramics',
    unit: 'Kg',
    currentStock: 5000,
    minStock: 1000,
    maxStock: 10000,
    rate: 25.50,
    materialType: 'Clay Material'
  },
  {
    name: 'Red Clay',
    code: 'CLAY-RED-002',
    description: 'Standard red clay for regular ceramics',
    unit: 'Kg',
    currentStock: 3500,
    minStock: 800,
    maxStock: 8000,
    rate: 22.75,
    materialType: 'Clay Material'
  },
  {
    name: 'Clear Glaze',
    code: 'GLAZE-001',
    description: 'Clear glaze for ceramic finishing',
    unit: 'Liters',
    currentStock: 200,
    minStock: 50,
    maxStock: 500,
    rate: 45.00,
    materialType: 'Glaze Material'
  }
];

const sampleSuppliers = [
  {
    name: 'Clay Suppliers Ltd',
    code: 'SUP-CLAY-001',
    email: 'info@claysuppliers.com',
    phone: '+92-42-1112345',
    address: 'Industrial Area, Lahore',
    city: 'Lahore',
    country: 'Pakistan',
    paymentTerms: '30 days',
    creditLimit: 50000,
    currentBalance: 15000,
    supplierType: 'Raw Material',
    status: 'active'
  },
  {
    name: 'Chemical Suppliers Co',
    code: 'SUP-CHEM-001',
    email: 'orders@chemicalsuppliers.com',
    phone: '+92-42-2223456',
    address: 'Industrial Zone, Karachi',
    city: 'Karachi',
    country: 'Pakistan',
    paymentTerms: 'Custom Days',
    creditLimit: 25000,
    currentBalance: 8000,
    supplierType: 'Raw Material',
    status: 'active'
  }
];

const sampleWorkers = [
  {
    name: 'Ahmed Hassan',
    code: 'WRK-001',
    email: 'ahmed@aks.com',
    phone: '+92-300-1234567',
    address: 'Lahore, Pakistan',
    designation: 'Production Worker',
    sectionGroup: 'Production Floor',
    department: 'Production',
    joinDate: new Date('2023-01-15'),
    salary: 35000,
    workerType: 'Per Piece',
    status: 'active',
    skills: ['Ceramic Molding', 'Quality Control']
  },
  {
    name: 'Muhammad Ali',
    code: 'WRK-002',
    email: 'ali@aks.com',
    phone: '+92-300-2345678',
    address: 'Lahore, Pakistan',
    designation: 'QC Inspector',
    sectionGroup: 'Quality Control',
    department: 'Quality',
    joinDate: new Date('2023-03-20'),
    salary: 42000,
    workerType: 'Monthly',
    status: 'active',
    skills: ['Quality Inspection', 'Documentation']
  },
  {
    name: 'Fatima Bibi',
    code: 'WRK-003',
    email: 'fatima@aks.com',
    phone: '+92-300-3456789',
    address: 'Lahore, Pakistan',
    designation: 'Packaging Staff',
    sectionGroup: 'Packaging',
    department: 'Packaging',
    joinDate: new Date('2023-02-10'),
    salary: 28000,
    workerType: 'Monthly',
    status: 'active',
    skills: ['Packaging', 'Inventory Management']
  }
];

const sampleCustomers = [
  {
    name: 'ABC Ceramics Store',
    code: 'CUST-001',
    email: 'orders@abcceramics.com',
    phone: '+92-42-5551234',
    address: 'Main Market, Lahore',
    city: 'Lahore',
    country: 'Pakistan',
    creditLimit: 100000,
    currentBalance: 25000,
    paymentTerms: '30 days',
    customerType: 'Retail',
    status: 'active'
  },
  {
    name: 'XYZ Construction',
    code: 'CUST-002',
    email: 'purchases@xyzconstruction.com',
    phone: '+92-42-6662345',
    address: 'Gulberg, Lahore',
    city: 'Lahore',
    country: 'Pakistan',
    creditLimit: 200000,
    currentBalance: 45000,
    paymentTerms: '30 days',
    customerType: 'Corporate',
    status: 'active'
  }
];

const sampleFinishedGoods = [
  {
    name: 'Premium Ceramic Tiles',
    code: 'FG-TILE-001',
    description: 'High quality ceramic tiles for premium customers',
    category: 'Simple',
    size: '10',
    unit: 'Pieces',
    color: 'White',
    grossWeight: 2.5,
    grossGlaze: 0.8,
    grossColor: 1.2,
    netWeight: 2.1,
    netGlaze: 0.7,
    netColor: 1.0,
    status: 'active'
  },
  {
    name: 'Decorative Ceramic Plates',
    code: 'FG-PLATE-001',
    description: 'Handcrafted decorative ceramic plates',
    category: 'Flower',
    size: '8',
    unit: 'Pieces',
    color: 'Blue',
    grossWeight: 0.8,
    grossGlaze: 0.3,
    grossColor: 0.5,
    netWeight: 0.7,
    netGlaze: 0.25,
    netColor: 0.4,
    status: 'active'
  },
  {
    name: 'Ceramic Mugs Set',
    code: 'FG-MUG-001',
    description: 'Set of 6 ceramic mugs with traditional designs',
    category: 'Full Flower',
    size: '6',
    unit: 'Pieces',
    color: 'Brown',
    grossWeight: 1.2,
    grossGlaze: 0.4,
    grossColor: 0.8,
    netWeight: 1.0,
    netGlaze: 0.35,
    netColor: 0.6,
    status: 'active'
  }
];

async function seedMasterData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aks_digirec');
    console.log('Connected to MongoDB');

    // Get company ID (assuming first company)
    const company = await Company.findOne();
    if (!company) {
      console.error('No company found. Please run seed.js first.');
      process.exit(1);
    }

    const companyId = company._id;

    // Clear existing master data
    await Section.deleteMany({ companyId });
    await RawMaterial.deleteMany({ companyId });
    await Supplier.deleteMany({ companyId });
    await Worker.deleteMany({ companyId });
    await Customer.deleteMany({ companyId });
    await FinishedGood.deleteMany({ companyId });
    console.log('Cleared existing master data');

    // Insert sections
    const sections = await Section.insertMany(
      sampleSections.map(section => ({ ...section, companyId }))
    );
    console.log(`Created ${sections.length} sections`);

    // Insert raw materials
    const rawMaterials = await RawMaterial.insertMany(
      sampleRawMaterials.map(material => ({ ...material, companyId }))
    );
    console.log(`Created ${rawMaterials.length} raw materials`);

    // Insert suppliers
    const suppliers = await Supplier.insertMany(
      sampleSuppliers.map(supplier => ({ ...supplier, companyId }))
    );
    console.log(`Created ${suppliers.length} suppliers`);

    // Insert workers
    const workers = await Worker.insertMany(
      sampleWorkers.map(worker => ({ ...worker, companyId }))
    );
    console.log(`Created ${workers.length} workers`);

    // Insert customers
    const customers = await Customer.insertMany(
      sampleCustomers.map(customer => ({ ...customer, companyId }))
    );
    console.log(`Created ${customers.length} customers`);

    // Insert finished goods
    const finishedGoods = await FinishedGood.insertMany(
      sampleFinishedGoods.map(good => ({ ...good, companyId }))
    );
    console.log(`Created ${finishedGoods.length} finished goods`);

    console.log('\n=== Master Data Seeded Successfully ===');
    console.log('Sample Data Created:');
    console.log('- 5 Sections');
    console.log('- 3 Raw Materials');
    console.log('- 2 Suppliers');
    console.log('- 3 Workers');
    console.log('- 2 Customers');
    console.log('- 3 Finished Goods');
    console.log('\nYou can now view Master Data in the application!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding master data:', error);
    process.exit(1);
  }
}

seedMasterData();
