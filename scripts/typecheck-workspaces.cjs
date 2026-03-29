const { spawnSync } = require('child_process');

const requiredEnv = {
  API_PORT: '4000',
  MONGO_URI: 'mongodb://localhost:27017/qyou',
  JWT_ACCESS_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
  JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz654321',
  STELLAR_NETWORK: 'TESTNET',
  STELLAR_SECRET_KEY: 'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

const checks = [
  {
    name: 'stellar/client',
    command: ['npm', 'run', 'typecheck', '--workspace=stellar/client'],
    env: requiredEnv,
  },
  {
    name: 'apps/api',
    command: ['npm', 'run', 'typecheck', '--workspace=apps/api'],
    env: requiredEnv,
  },
];

const skipped = [
  'apps/admin-web (framework workspace baseline still relies on build-driven type validation)',
  'apps/mobile (Expo workspace remains lint-driven until dedicated typecheck cleanup lands)',
];

for (const item of checks) {
  // eslint-disable-next-line no-console
  console.log(`\n> Typechecking ${item.name}`);
  const result = spawnSync(item.command[0], item.command.slice(1), {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ...item.env,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

for (const item of skipped) {
  // eslint-disable-next-line no-console
  console.log(`- Skipped ${item}`);
}
