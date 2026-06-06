const path = require('path');

const APP_DIR = '/var/www/minetracker';

module.exports = {
  apps: [
    {
      name: 'minetracker-api',
      script: path.join(APP_DIR, 'apps/api/dist/main.js'),
      cwd: path.join(APP_DIR, 'apps/api'),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env_file: path.join(APP_DIR, 'apps/api/.env'),
      error_file: '/var/log/minetracker/api-error.log',
      out_file: '/var/log/minetracker/api-out.log',
      time: true,
    },
    {
      name: 'minetracker-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: path.join(APP_DIR, 'apps/web'),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/minetracker/web-error.log',
      out_file: '/var/log/minetracker/web-out.log',
      time: true,
    },
  ],
};
