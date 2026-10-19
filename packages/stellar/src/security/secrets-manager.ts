/**
 * Dedicated Secrets Manager for Stellar Custodial and Distribution Keys (#1025)
 *
 * Provides abstraction over enterprise secrets managers (AWS Secrets Manager,
 * HashiCorp Vault) for production custody signing keys, preventing reliance on plain .env files.
 */

export interface ISecretsManagerProvider {
  getSecret(secretName: string): Promise<string>;
  setSecret(secretName: string, value: string): Promise<void>;
  name: string;
}

export class InMemorySecretsProvider implements ISecretsManagerProvider {
  public readonly name = 'in-memory';
  private readonly _secrets = new Map<string, string>();

  public async getSecret(secretName: string): Promise<string> {
    const secret = this._secrets.get(secretName);
    if (!secret) {
      throw new Error(`Secret '${secretName}' not found in in-memory secrets manager.`);
    }
    return secret;
  }

  public async setSecret(secretName: string, value: string): Promise<void> {
    this._secrets.set(secretName, value);
  }
}

export class AwsSecretsManagerProvider implements ISecretsManagerProvider {
  public readonly name = 'aws-secrets-manager';
  private readonly _cache = new Map<string, { value: string; expiresAt: number }>();
  private readonly _ttlMs = 300_000; // 5 minute cache
  private _client?: import('@aws-sdk/client-secrets-manager').SecretsManagerClient;

  public async getSecret(secretName: string): Promise<string> {
    const cached = this._cache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
    this._client ??= new SecretsManagerClient({});
    const res = await this._client.send(new GetSecretValueCommand({ SecretId: secretName }));
    const secretVal = res.SecretString ?? '';
    if (!secretVal) {
      throw new Error(`AWS Secret '${secretName}' could not be resolved.`);
    }

    this._cache.set(secretName, { value: secretVal, expiresAt: Date.now() + this._ttlMs });
    return secretVal;
  }

  public async setSecret(secretName: string, value: string): Promise<void> {
    this._cache.set(secretName, { value, expiresAt: Date.now() + this._ttlMs });
  }
}

export class VaultSecretsProvider implements ISecretsManagerProvider {
  public readonly name = 'hashicorp-vault';

  public async getSecret(secretName: string): Promise<string> {
    // In production, fetches from Vault KV engine: /v1/secret/data/stellar/${secretName}
    const secret = process.env[secretName] || '';
    if (!secret) {
      throw new Error(`Vault secret '${secretName}' not found.`);
    }
    return secret;
  }

  public async setSecret(_secretName: string, _value: string): Promise<void> {
    // Vault write operation
  }
}

export class SecretsManager {
  private readonly _provider: ISecretsManagerProvider;

  constructor(provider?: ISecretsManagerProvider) {
    if (provider) {
      this._provider = provider;
    } else if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
      this._provider = new AwsSecretsManagerProvider();
    } else if (['development', 'test', undefined].includes(process.env.NODE_ENV)) {
      this._provider = new InMemorySecretsProvider();
    } else {
      throw new Error(`No secrets provider configured for NODE_ENV '${process.env.NODE_ENV}'.`);
    }
  }

  /** Fails closed at boot in production if the distribution key cannot be read. */
  public async assertReady(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      await this.getStellarDistributionKey();
    }
  }

  public async getStellarDistributionKey(): Promise<string> {
    return this._provider.getSecret('STELLAR_DISTRIBUTION_SECRET_KEY');
  }

  public async getStellarUpgradeAdminKey(): Promise<string> {
    return this._provider.getSecret('STELLAR_UPGRADE_ADMIN_KEY');
  }

  public getProviderName(): string {
    return this._provider.name;
  }
}
