import { createDAVClient } from 'tsdav';

async function testCalDAV() {
  try {
    console.log('Testing CalDAV from Hetzner...');
    console.log('URL: https://mail.bl2020.com/webdav/principals/bl2020.com/agent32/');
    
    const client = await createDAVClient({
      serverUrl: 'https://mail.bl2020.com/webdav/principals/bl2020.com/agent32/',
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
      console.log(`  - ${cal.displayName || 'Unnamed'}`);
    });
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testCalDAV();
