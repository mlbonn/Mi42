import { getContactsByCompany } from './server/db';

async function main() {
  const companyId = '8ae7f083-a627-4a10-a774-c38cc3114f15';
  console.log('Testing getContactsByCompany for:', companyId);
  
  const contacts = await getContactsByCompany(companyId);
  console.log('Found contacts:', contacts.length);
  console.log('Contacts:', contacts.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, email: c.email })));
  
  process.exit(0);
}

main();

