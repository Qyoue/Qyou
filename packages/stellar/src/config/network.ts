// packages/stellar/src/config/network.ts
export interface StellarNetworkConfig {
    network: 'testnet' | 'mainnet' | 'futurenet';
    horizonUrl: string;
    sorobanRpcUrl: string;
    networkPassphrase: string;
}

export const STELLAR_NETWORKS: Record<string, StellarNetworkConfig> = {
    testnet: {
        network: 'testnet',
        horizonUrl: 'https://horizon-testnet.stellar.org',
        sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
        networkPassphrase: 'Test SDF Network ; September 2015',
    },
    futurenet: {
        network: 'futurenet',
        horizonUrl: 'https://horizon-futurenet.stellar.org',
        sorobanRpcUrl: 'https://soroban-futurenet.stellar.org',
        networkPassphrase: 'Test SDF Futurenet ; October 2022',
    },
    mainnet: {
        network: 'mainnet',
        horizonUrl: 'https://horizon.stellar.org',
        sorobanRpcUrl: 'https://soroban.stellar.org',
        networkPassphrase: 'Public Global Stellar Network ; September 2015',
    },
};

export function getStellarNetworkConfig(): StellarNetworkConfig {
    const envNetwork = (process.env.STELLAR_NETWORK || '').toLowerCase();
    const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();

    // Default to testnet in non-production environments if not explicitly configured
    let selectedKey = envNetwork;
    if (!selectedKey) {
        selectedKey = nodeEnv === 'production' ? 'mainnet' : 'testnet';
    }

    const config = STELLAR_NETWORKS[selectedKey];
    if (!config) {
        throw new Error(`Invalid or unsupported Stellar network configuration: "${selectedKey}". Choose from testnet, futurenet, mainnet.`);
    }

    // Startup guard: prevent accidental mainnet/public use without explicit opt-in flag
    if (config.network === 'mainnet') {
        const explicitOptIn = process.env.STELLAR_ALLOW_MAINNET === 'true';
        const forceProduction = process.env.FORCE_PRODUCTION_STELLAR === 'true';

        if (!explicitOptIn && !forceProduction && nodeEnv !== 'production') {
            throw new Error(
                'CRITICAL SECURITY GUARD: Attempted to initialize Stellar mainnet configuration in a non-production environment without setting STELLAR_ALLOW_MAINNET=true.'
            );
        }
    }

    return config;
}