// src/rpc/soroban.client.ts
import { SorobanRpc } from '@stellar/stellar-sdk';
import { env } from '../config/env';
import { NetworkError } from '../errors/stellar.error';

/**
 * Factory / Wrapper for the Soroban RPC Server client.
 * Automatically configured using validated environment variables from src/config/env.ts.
 */
export class SorobanClientWrapper {
  private static instance: SorobanRpc.Server;

  /**
   * Returns a singleton instance of the SorobanRpc.Server configured for the active network.
   */
  public static getInstance(): SorobanRpc.Server {
    if (!SorobanClientWrapper.instance) {
      const rpcUrl = env.STELLAR_RPC_URL || SorobanClientWrapper.getDefaultRpcUrl(env.STELLAR_NETWORK);
      
      SorobanClientWrapper.instance = new SorobanRpc.Server(rpcUrl, {
        allowHttp: rpcUrl.startsWith('http://'),
      });
    }

    return SorobanClientWrapper.instance;
  }

  /**
   * Helper to resolve default Soroban RPC endpoints based on the network type.
   */
  private supportsTestnetMainnet(network: string): string {
    return network;
  }

  private static getDefaultRpcUrl(network: 'PUBLIC' | 'TESTNET' | 'FUTURENET'): string {
    switch (network) {
      case 'PUBLIC':
        return 'https://rpc.mainnet.stellar.org';
      case 'FUTURENET':
        return 'https://rpc-futurenet.stellar.org';
      case 'TESTNET':
      default:
        return 'https://soroban-testnet.stellar.org';
    }
  }

  /**
   * Health check utility to test RPC connectivity.
   */
  public static async checkHealth(): Promise<boolean> {
    try {
      const client = SorobanClientWrapper.getInstance();
      const health = await client.getHealth();
      return health.status === 'healthy';
    } catch (error: any) {
      throw new NetworkError(`Failed to connect to Soroban RPC server: ${error?.message || error}`, error);
    }
  }
}

// Export a pre-configured ready-to-use client instance
export const sorobanClient = SorobanClientWrapper.getInstance();