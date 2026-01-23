import Imap from 'imap';
import { simpleParser } from 'mailparser';

export interface FetchedEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  date: Date;
  uid: number;
}

export interface IMAPConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  ssl: boolean;
}

export class IMAPEmailFetcher {
  private imap: Imap;
  private config: IMAPConfig;

  constructor(config: IMAPConfig) {
    this.config = config;
    this.imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.ssl,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 10000,
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.once('ready', () => resolve());
      this.imap.once('error', reject);
      this.imap.connect();
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.end();
      this.imap.once('end', () => resolve());
      this.imap.once('error', reject);
    });
  }

  async fetchEmails(folder: string = 'INBOX', limit: number = 50): Promise<FetchedEmail[]> {
    return new Promise((resolve, reject) => {
      this.imap.openBox(folder, false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        const totalEmails = box.messages.total;
        const start = Math.max(1, totalEmails - limit + 1);
        const f = this.imap.seq.fetch(start + ':' + totalEmails, { bodies: '' });
        const emails: FetchedEmail[] = [];
        let pending = 0;

        f.on('message', (msg, seqno) => {
          pending++;
          simpleParser(msg as any, async (err, parsed) => {
            if (!err) {
              emails.push({
                id: String(seqno),
                from: parsed.from?.text || '',
                to: parsed.to?.text || '',
                subject: parsed.subject || '(no subject)',
                text: parsed.text || '',
                html: parsed.html || '',
                date: parsed.date || new Date(),
                uid: seqno,
              });
            }
            pending--;
            if (pending === 0) {
              resolve(emails);
            }
          });
        });

        f.on('error', reject);
        f.on('end', () => {
          if (pending === 0) resolve(emails);
        });
      });
    });
  }
}
