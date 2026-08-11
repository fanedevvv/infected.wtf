module.exports = {
  apps: [
    {
      name: 'infected-discord-bot',
      cwd: __dirname,
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
    },
  ],
};
