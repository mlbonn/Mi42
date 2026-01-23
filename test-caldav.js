const { createDAVClient } = require('tsdav');

async function testCalDAV() {
  try {
    console.log('Testing CalDAV connection...');
    console.log('Server: https://176.0.1.191/caldav');
    console.log('User: agent32@bl2020.com');
    
    const client = await createDAVClient({
      serverUrl: 'https://176.0.1.191/caldav',
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
    process.exit(1);
  }
}

testCalDAV();
