module.exports = {
  apps: [
    {
      name: "infected-wtf",
      cwd: "/var/www/infected.wtf",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3100",
      interpreter: "/usr/bin/node",
      env: {
        NODE_ENV: "production",
        PORT: "3100",
      },
      autorestart: true,
      watch: false,
      max_restarts: 50,
      min_uptime: "10s",
      restart_delay: 2000,
      exp_backoff_restart_delay: 500,
      kill_timeout: 10000,
      listen_timeout: 15000,
      max_memory_restart: "600M",
      time: true,
    },
  ],
};
