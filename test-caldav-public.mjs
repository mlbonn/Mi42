import { createDAVClient } from 'tsdav';

async function testCalDAV() {
  try {
    console.log('Testing CalDAV connection...');
    console.log('Server: https://mail.bl2020.com/caldav');
    console.log('User: agent32@bl2020.com');
    
    const client = await createDAVClient({
      serverUrl: 'https://mail.bl2020.com/caldav',
      credentials: {
        username: 'agent32@bl2020.com',
        password: 'Markt26Markt26',
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });
    
    console.log('✅ Connection successful!');
    
    const calendars = await client.fetchCalendars();
    console.log(`✅ Found ${calendars.length} calendar(s):`);
    calendars.forEach(cal => {
      console.log(`  - ${cal.displayName || 'Unnamed'} (${cal.url})`);
    });
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testCalDAV().catch(console.error);
