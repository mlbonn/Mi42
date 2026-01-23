const Imap = require('imap');

const imap = new Imap({
  user: 'testFRIDAY1@bl2020.com',
  password: 'Markt32Markt32',
  host: 'mail.bl2020.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
});

imap.openBox('INBOX', false, (err, mailbox) => {
  if (err) {
    console.log('ERROR:', err.message);
    process.exit(1);
  }
  console.log('SUCCESS! Connected to INBOX');
  console.log('Total emails:', mailbox.messages.total);
  imap.end();
});

imap.on('error', (err) => {
  console.log('IMAP ERROR:', err.message);
  process.exit(1);
});

setTimeout(() => process.exit(1), 5000);
