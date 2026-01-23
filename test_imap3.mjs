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

imap.on('ready', () => {
  console.log('IMAP ready, opening INBOX...');
  
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

imap.on('end', () => {
  console.log('IMAP connection ended');
});

imap.openImap();

setTimeout(() => {
  console.log('TIMEOUT - no response');
  process.exit(1);
}, 5000);
