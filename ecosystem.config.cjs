module.exports = {
  apps: [
    {
      name: 'friday-crm',
      script: './dist/_core/index.js',
      cwd: '/home/manus02/friday-crm',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'scout-worker',
      script: './server/scoutWorkerDaemon.ts',
      cwd: '/home/manus02/friday-crm',
      interpreter: './node_modules/.bin/tsx',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'email-send-worker',
      script: './server/emailSendWorkerDaemon.ts',
      cwd: '/home/manus02/friday-crm',
      interpreter: './node_modules/.bin/tsx',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'hunter-worker',
      script: './server/hunterWorkerDaemon.ts',
      cwd: '/home/manus02/friday-crm',
      interpreter: './node_modules/.bin/tsx',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'agent-worker',
      script: './dist/agentWorkerDaemon.js',
      cwd: '/home/manus02/friday-crm',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
