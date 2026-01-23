import { createDAVClient } from 'tsdav';

async function testFetchEvents() {
  try {
    console.log('Testing event fetching for agent32...');
    
    const client = await createDAVClient({
      serverUrl: 'https://mail.bl2020.com/webdav/principals/bl2020.com/agent32/',
      credentials: {
        username: 'agent32@bl2020.com',
        password: 'Markt26Markt26',
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });
    
    console.log('✅ Connected!');
    
    const calendars = await client.fetchCalendars();
    console.log(`Found ${calendars.length} calendars`);
    
    for (const cal of calendars) {
      console.log(`\n📅 Calendar: ${cal.displayName}`);
      
      const start = new Date();
      start.setDate(start.getDate() - 7); // 7 days ago
      const end = new Date();
      end.setDate(end.getDate() + 7); // 7 days ahead
      
      const objects = await client.fetchCalendarObjects({
        calendar: cal,
        timeRange: { start: start.toISOString(), end: end.toISOString() }
      });
      
      console.log(`  Events: ${objects.length}`);
      objects.forEach(obj => {
        console.log(`  - ${obj.data}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFetchEvents();
