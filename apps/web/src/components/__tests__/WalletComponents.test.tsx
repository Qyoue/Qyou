import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletBalanceCard } from '../WalletBalanceCard';
import { WalletSetup } from '../WalletSetup';
import { RewardStatusIndicator } from '../RewardStatusIndicator';

const VALID_KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';

describe('Stellar Web UI Components - Wallet & Reward State Snapshot Tests (#1047)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('WalletBalanceCard (#1047)', () => {
    it('1. Loading State: renders loading indicator and status copy while fetching', () => {
      // Mock fetch that doesn't resolve immediately
      global.fetch = jest.fn(() => new Promise(() => {}));

      const { container } = render(<WalletBalanceCard apiBaseUrl="/api/stellar" />);

      expect(screen.getByTestId('wallet-balance-loading')).toBeInTheDocument();
      expect(screen.getByText(/loading stellar wallet balances/i)).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('2. Error State: renders error alert with message and retry button on fetch rejection', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Horizon RPC unreachable or offline'));

      const { container } = render(<WalletBalanceCard apiBaseUrl="/api/stellar" />);

      await waitFor(() => {
        expect(screen.getByTestId('wallet-balance-error')).toBeInTheDocument();
      });

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Unable to Load Wallet')).toBeInTheDocument();
      expect(screen.getByText('Horizon RPC unreachable or offline')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('3. Empty / Unlinked State: renders unlinked banner and setup call-to-action when wallet not found (404)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 404,
        ok: false,
        json: async () => ({ error: { message: 'No linked Stellar wallet found' } }),
      } as Response);

      const onSetupMock = jest.fn();
      const { container } = render(<WalletBalanceCard apiBaseUrl="/api/stellar" onSetupClick={onSetupMock} />);

      await waitFor(() => {
        expect(screen.getByTestId('wallet-balance-unlinked')).toBeInTheDocument();
      });

      expect(screen.getByText(/no stellar wallet linked yet/i)).toBeInTheDocument();
      expect(screen.getByText(/connect or create a stellar wallet to begin earning queue incentive rewards/i)).toBeInTheDocument();

      const setupBtn = screen.getByTestId('setup-wallet-button');
      expect(setupBtn).toBeInTheDocument();
      fireEvent.click(setupBtn);
      expect(onSetupMock).toHaveBeenCalledTimes(1);
      expect(container).toMatchSnapshot();
    });

    it('4. Populated State: renders active connection status, truncated public key, and native XLM balance', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          success: true,
          wallet: {
            userId: 'user-snapshot-1',
            publicKey: VALID_KEY,
            createdAt: 1714200000000,
          },
          balances: {
            publicKey: VALID_KEY,
            xlm: '250.7500000',
            balances: [
              { asset: 'native', balance: '250.7500000', isNative: true },
            ],
            fetchedAt: 1714200000000,
          },
        }),
      } as Response);

      const { container } = render(<WalletBalanceCard apiBaseUrl="/api/stellar" />);

      await waitFor(() => {
        expect(screen.getByTestId('wallet-balance-card')).toBeInTheDocument();
      });

      expect(screen.getByText(/stellar connected/i)).toBeInTheDocument();
      // Truncated key GBRPYH...7AZTQU
      expect(screen.getByText(/GBRPYH\.\.\.7AZTQU/)).toBeInTheDocument();
      expect(screen.getByTestId('wallet-xlm-balance')).toHaveTextContent('250.7500000 XLM');
      expect(screen.getByTestId('refresh-balance-button')).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });
  });

  describe('WalletSetup (#1047)', () => {
    it('1. Initial Choose State: renders setup options (connect vs generate)', () => {
      const { container } = render(<WalletSetup />);

      expect(screen.getByTestId('choose-custodial')).toBeInTheDocument();
      expect(screen.getByTestId('choose-non-custodial')).toBeInTheDocument();
      expect(screen.getByText(/Option A: Automated Custodial Wallet/i)).toBeInTheDocument();
      expect(screen.getByText(/Option B: Connect Existing Stellar Wallet/i)).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('2. Connect Form State: allows typing public key and validates input', async () => {
      const { container } = render(<WalletSetup />);

      // Click connect card
      fireEvent.click(screen.getByTestId('choose-non-custodial'));

      const input = screen.getByLabelText(/Stellar Public Key/i);
      expect(input).toBeInTheDocument();
      const submitBtn = screen.getByRole('button', { name: /link wallet/i });
      expect(submitBtn).toBeInTheDocument();

      // Submit invalid key
      fireEvent.change(input, { target: { value: 'invalid-stellar-key' } });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/valid 56-character stellar public key/i)).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('3. Populated / Success State: successfully links wallet and renders confirmation banner', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 201,
        ok: true,
        json: async () => ({
          success: true,
          wallet: {
            userId: 'user-test',
            publicKey: VALID_KEY,
            createdAt: 1714200000000,
          },
        }),
      } as Response);

      const onSuccessMock = jest.fn();
      const { container } = render(<WalletSetup onSuccess={onSuccessMock} />);

      fireEvent.click(screen.getByTestId('choose-non-custodial'));
      const input = screen.getByLabelText(/Stellar Public Key/i);
      fireEvent.change(input, { target: { value: VALID_KEY } });
      const submitBtn = screen.getByRole('button', { name: /link wallet/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/stellar wallet connected!/i)).toBeInTheDocument();
      });

      expect(screen.getByText(new RegExp(VALID_KEY))).toBeInTheDocument();
      expect(onSuccessMock).toHaveBeenCalledWith(expect.objectContaining({ publicKey: VALID_KEY }));
      expect(container).toMatchSnapshot();
    });
  });

  describe('RewardStatusIndicator (#1047)', () => {
    it('1. Idle State: returns null when status is idle', () => {
      const { container } = render(<RewardStatusIndicator status="idle" />);
      expect(container.firstChild).toBeNull();
    });

    it('2. Pending State: renders pending alert styling and progress copy', () => {
      const { container } = render(
        <RewardStatusIndicator status="pending" amount="5.0000000" asset="XLM" />
      );

      expect(screen.getByTestId('reward-status-pending')).toBeInTheDocument();
      expect(screen.getByText(/reward distribution pending/i)).toBeInTheDocument();
      expect(screen.getByText(/confirming 5\.0000000 XLM payout on the stellar network/i)).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('3. Confirmed State: renders success badge, confirmed amount, and transaction hash', () => {
      const txHash = 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef';
      const { container } = render(
        <RewardStatusIndicator
          status="confirmed"
          amount="10.0000000"
          asset="XLM"
          txHash={txHash}
        />
      );

      expect(screen.getByTestId('reward-status-confirmed')).toBeInTheDocument();
      expect(screen.getByText(/reward confirmed!/i)).toBeInTheDocument();
      expect(screen.getByText(/\+10\.0000000 XLM received in your linked stellar wallet/i)).toBeInTheDocument();
      expect(screen.getByText(/\(tx: a1b2c3\.\.\.abcdef\)/i)).toBeInTheDocument();
      expect(container).toMatchSnapshot();
    });

    it('4. Failed State: renders error message and retry button', () => {
      const onRetryMock = jest.fn();
      const onDismissMock = jest.fn();
      const { container } = render(
        <RewardStatusIndicator
          status="failed"
          errorMessage="Insufficient contract pool balance"
          onRetry={onRetryMock}
          onDismiss={onDismissMock}
        />
      );

      expect(screen.getByTestId('reward-status-failed')).toBeInTheDocument();
      expect(screen.getByText(/reward distribution delayed/i)).toBeInTheDocument();
      expect(screen.getByText(/insufficient contract pool balance/i)).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryBtn);
      expect(onRetryMock).toHaveBeenCalledTimes(1);

      const dismissBtn = screen.getByRole('button', { name: '×' });
      fireEvent.click(dismissBtn);
      expect(onDismissMock).toHaveBeenCalledTimes(1);

      expect(container).toMatchSnapshot();
    });
  });
});
