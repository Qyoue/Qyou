import React from 'react';

export type StellarNetwork = 'testnet' | 'public';

interface BlockExplorerLinkProps {
  txHash?: string;
  address?: string;
  network?: StellarNetwork;
  label?: string;
  showIcon?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function BlockExplorerLink({
  txHash,
  address,
  network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK as StellarNetwork) || 'testnet',
  label,
  showIcon = true,
  className,
  style,
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

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`Verify ${isTx ? 'transaction' : 'account'} on StellarExpert (${network})`}
      className={className}
      data-testid="block-explorer-link"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        color: '#2563eb',
        textDecoration: 'none',
        fontSize: '13px',
        fontFamily: 'monospace',
        ...style,
      }}
    >
      <span>{displayText}</span>
      {showIcon && (
        <span
          aria-hidden="true"
          style={{ fontSize: '11px', textDecoration: 'none', opacity: 0.8 }}
        >
          ↗
        </span>
      )}
    </a>
  );
}
