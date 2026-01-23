import Imap from 'imap';

const imap = new Imap({
  user: 'testFRIDAY1@bl2020.com',
  password: 'Markt32Markt32',
  host: 'mail.bl2020.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
});

console.log('Connecting to IMAP...');

imap.openImap((err) => {
  if (err) {
    console.log('ERROR opening IMAP:', err.message);
    process.exit(1);
  }
  console.log('IMAP opened, now opening INBOX...');
  
  imap.openBox('INBOX', false, (err, mailbox) => {
    if (err) {
      console.log('ERROR opening box:', err.message);
      process.exit(1);
    }
    console.log('SUCCESS! Connected to INBOX');
    console.log('Total emails:', mailbox.messages.total);
    imap.end();
    process.exit(0);
  });
});

imap.on('error', (err) => {
  console.log('IMAP ERROR:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('TIMEOUT - no response');
  process.exit(1);
}, 5000);
