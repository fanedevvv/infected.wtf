module.exports = {
  apps: [
    {
      name: "infected-status",
      cwd: __dirname,
      script: "monitor.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 50,
      min_uptime: "10s",
      exp_backoff_restart_delay: 2000,
      watch: false,
      max_memory_restart: "150M",
    },
  ],
};
