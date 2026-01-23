import { createDAVClient } from 'tsdav';

async function testWebDAV() {
  try {
    console.log('Testing WebDAV connection...');
    console.log('Server: https://mail.bl2020.com/webdav/principals/bl2020.com/agent32/');
    console.log('User: agent32@bl2020.com');
    
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
      console.log(`    URL: ${cal.url}`);
    });
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testWebDAV().catch(console.error);
