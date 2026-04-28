const fs = require('fs');
const path = require('path');

const TARGETS = ['api', 'admin-web', 'mobile', 'stellar'];

function findWorkspaceRoot(startDir) {
  let current = startDir;
  while (current !== path.dirname(current)) {
    const packageJsonPath = path.join(current, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (Array.isArray(pkg.workspaces)) {
          return current;
        }
      } catch {
        // Ignore parse failures while traversing upward.
      }
    }
    current = path.dirname(current);
  }
  return startDir;
}

function parseDotEnv(content) {
  const parsed = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const idx = line.indexOf('=');
    if (idx === -1) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

function loadEnvFiles() {
  const cwd = process.cwd();
  const root = findWorkspaceRoot(cwd);
  const envFiles = [
    path.join(root, '.env'),
    path.join(root, '.env.local'),
    path.join(cwd, '.env'),
    path.join(cwd, '.env.local'),
  ];

  for (const file of envFiles) {
    if (!fs.existsSync(file)) {
      continue;
    }

    const parsed = parseDotEnv(fs.readFileSync(file, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

const envSchemas = {
  api: {
    API_PORT: [isRequired(), isWholeNumber(), isInRange(1, 65535)],
    MONGO_URI: [isRequired(), isUrl()],
    JWT_ACCESS_SECRET: [isRequired(), minLength(32)],
    JWT_REFRESH_SECRET: [isRequired(), minLength(32)],
    STELLAR_NETWORK: [isRequired(), oneOf(['TESTNET', 'MAINNET'])],
    STELLAR_SECRET_KEY: [
      isRequired(),
      matches(/^S[A-Z2-7]{55}$/, 'must be a valid Stellar secret key'),
    ],
  },
  'admin-web': {
    NEXT_PUBLIC_API_URL: [isRequired(), isUrl()],
    ADMIN_JWT_SECRET: [isRequired(), minLength(32)],
  },
  mobile: {
    EXPO_PUBLIC_API_URL: [isRequired(), isUrl()],
  },
  stellar: {
    STELLAR_NETWORK: [isRequired(), oneOf(['TESTNET', 'MAINNET'])],
    STELLAR_SECRET_KEY: [
      isRequired(),
      matches(/^S[A-Z2-7]{55}$/, 'must be a valid Stellar secret key'),
    ],
  },
};

function isRequired() {
  return (key, value) => {
    if (value === undefined || value === null || value === '') {
      return `❌ Missing Env Var: ${key} is required`;
    }
    return null;
  };
}

function isWholeNumber() {
  return (key, value) => {
    if (!/^\d+$/.test(String(value))) {
      return `❌ Invalid Env Var: ${key} must be a whole number`;
    }
    return null;
  };
}

function isInRange(min, max) {
  return (key, value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
      return `❌ Invalid Env Var: ${key} must be between ${min} and ${max}`;
    }
    return null;
  };
}

function isUrl() {
  return (key, value) => {
    try {
      new URL(value);
      return null;
    } catch {
      return `❌ Invalid Env Var: ${key} must be a valid URL`;
    }
  };
}

function minLength(length) {
  return (key, value) => {
    if (String(value).length < length) {
      return `❌ Invalid Env Var: ${key} must be at least ${length} characters`;
    }
    return null;
  };
}

function oneOf(values) {
  return (key, value) => {
    if (!values.includes(String(value))) {
      return `❌ Invalid Env Var: ${key} must be one of: ${values.join(', ')}`;
    }
    return null;
  };
}

function matches(regex, message) {
  return (key, value) => {
    if (!regex.test(String(value))) {
      return `❌ Invalid Env Var: ${key} ${message}`;
    }
    return null;
  };
}

function validateSchema(schema, sourceEnv) {
  const errors = [];

  for (const [key, validators] of Object.entries(schema)) {
    const value = sourceEnv[key];

    for (const validate of validators) {
      const error = validate(key, value);
      if (error) {
        errors.push(error);
        break;
      }
    }
  }

  return errors;
}

function validateTargetEnv(target, sourceEnv = process.env) {
  const schema = envSchemas[target];
  if (!schema) {
    throw new Error(`Unknown env validation target "${target}". Use one of: ${TARGETS.join(', ')}`);
  }

  const errors = validateSchema(schema, sourceEnv);
  if (errors.length > 0) {
    throw new Error(`Environment validation failed for ${target}:\n${errors.join('\n')}`);
  }
}

function runCli() {
  const target = process.argv[2];
  if (!target) {
    console.error(`Usage: node libs/config/validate-env.cjs <${TARGETS.join('|')}>`);
    process.exit(1);
  }

  loadEnvFiles();

  try {
    validateTargetEnv(target);
    console.log(`✅ Environment validation passed for ${target}`);
  } catch (error) {
    console.error(String(error.message || error));
    process.exit(1);
  }
}

module.exports = {
  loadEnvFiles,
  validateTargetEnv,
};

if (require.main === module) {
  runCli();
}
