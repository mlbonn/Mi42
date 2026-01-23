module.exports = {
  apps: [{
    name: 'email-fetcher',
    script: 'dist/emailFetcherWorker.js',
    cwd: '/home/manus02/friday-crm',
    env: {
      DATABASE_URL: 'mysql://bluser:1Ev3eZcJ8bO0o69O@localhost:3306/friday_crm'
    }
  }]
};
