import React from 'react';
import { Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';

export type StellarNetwork = 'testnet' | 'public';

interface BlockExplorerLinkProps {
  txHash?: string;
  address?: string;
  network?: StellarNetwork;
  label?: string;
}

export function BlockExplorerLink({
  txHash,
  address,
  network = 'testnet',
  label,
}: BlockExplorerLinkProps) {
  const targetId = txHash || address;
  if (!targetId) return null;

  const isTx = Boolean(txHash);
  const path = isTx ? `tx/${txHash}` : `account/${address}`;
  const explorerUrl = `https://stellar.expert/explorer/${network}/${path}`;

  const defaultLabel = isTx
    ? `${txHash!.slice(0, 6)}...${txHash!.slice(-6)}`
    : `${address!.slice(0, 6)}...${address!.slice(-6)}`;

  const displayText = label || defaultLabel;

  const handlePress = async () => {
    const supported = await Linking.canOpenURL(explorerUrl);
    if (supported) {
      await Linking.openURL(explorerUrl);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <Text style={styles.linkText}>{displayText} ↗</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  linkText: {
    color: '#2563eb',
    fontSize: 13,
    fontFamily: 'monospace',
    textDecorationLine: 'underline',
  },
});
