const mongoose = require('mongoose');
const { Company, User, Worker, Role } = require('../src/models');
require('dotenv').config();

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digirec');
    
    console.log('=== COMPANIES ===');
    const companies = await Company.find().select('_id name code');
    companies.forEach(c => console.log(`${c._id}: ${c.name} (${c.code})`));
    
    console.log('\n=== USERS ===');
    const users = await User.find().select('_id email firstName lastName company isActive').populate('company', 'name');
    users.forEach(u => console.log(`${u._id}: ${u.email} - ${u.firstName} ${u.lastName} (Company: ${u.company?.name}) [${u.isActive ? 'active' : 'inactive'}]`));
    
    console.log('\n=== ROLES ===');
    const roles = await Role.find().select('_id name displayName isSystem');
    roles.forEach(r => console.log(`${r._id}: ${r.name} - ${r.displayName?.en || r.displayName} [System: ${r.isSystem}]`));
    
    console.log('\n=== WORKERS COUNT BY COMPANY ===');
    for (const company of companies) {
      const count = await Worker.countDocuments({ companyId: company._id });
      console.log(`\n${company.name}: ${count} workers`);
      
      const workers = await Worker.find({ companyId: company._id }).select('code firstName lastName department').limit(15);
      workers.forEach(w => console.log(`  - ${w.code}: ${w.firstName} ${w.lastName}`));
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkData();
