import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';

interface WalletSetupScreenProps {
  onSuccess?: (wallet: { publicKey: string }) => void;
  apiBaseUrl?: string;
  authToken?: string;
}

export function WalletSetupScreen({
  onSuccess,
  apiBaseUrl = 'http://localhost:4000/api/stellar',
  authToken,
}: WalletSetupScreenProps) {
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'options' | 'manual'>('options');
  const [successAddress, setSuccessAddress] = useState<string | null>(null);

  const isValidKey = (key: string) => /^G[A-Z2-7]{55}$/.test(key.trim());

  const handleLink = async (keyToLink: string) => {
    if (!isValidKey(keyToLink)) {
      Alert.alert('Invalid Key', 'Please provide a valid 56-character Stellar public key starting with G.');
      return;
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/wallet`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ publicKey: keyToLink.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to link Stellar wallet');
      }

      const wallet = data.wallet || { publicKey: keyToLink.trim() };
      setSuccessAddress(wallet.publicKey);
      if (onSuccess) {
        onSuccess(wallet);
      }
    } catch (err: unknown) {
      Alert.alert('Setup Error', err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleCustodialCreate = () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let generatedKey = 'G';
    for (let i = 0; i < 55; i++) {
      generatedKey += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    handleLink(generatedKey);
  };

  if (successAddress) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>Wallet Connected!</Text>
          <Text style={styles.addressText}>{successAddress}</Text>
          <Text style={styles.hintText}>
            You will now receive automatic Stellar rewards when waiting in eligible queues.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stellar Wallet Setup</Text>
      <Text style={styles.subtitle}>
        Link a Stellar account to collect token and XLM incentives for queue participation.
      </Text>

      {mode === 'options' ? (
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCustodialCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Managed Wallet</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setMode('manual')}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Link Existing Stellar Key</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Stellar Public Key</Text>
          <TextInput
            style={styles.input}
            placeholder="GBRPYHIL2CI3FNQ4BXLFMNDLF..."
            value={publicKey}
            onChangeText={setPublicKey}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleLink(publicKey)}
            disabled={loading || !publicKey.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Confirm & Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.textButton}
            onPress={() => setMode('options')}
            disabled={loading}
          >
            <Text style={styles.textButtonLabel}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonGroup: {
    gap: 12,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  textButton: {
    padding: 12,
    alignItems: 'center',
  },
  textButtonLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  successCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 13,
    color: '#047857',
    fontFamily: 'monospace',
    marginBottom: 12,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 13,
    color: '#065f46',
    textAlign: 'center',
    lineHeight: 18,
  },
});
