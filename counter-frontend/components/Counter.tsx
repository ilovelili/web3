'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, defineChain } from 'viem';
import { localhost } from 'viem/chains';
import { counterABI, COUNTER_ADDRESS } from '../lib/counter';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Define a custom localhost chain with chainId 31337
const localhost31337 = defineChain({
  id: 31337,
  name: 'Localhost 31337',
  network: 'localhost',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
});

export default function Counter() {
  const [account, setAccount] = useState<string | null>(null);
  const [counterValue, setCounterValue] = useState<bigint>(0n);
  const [newNumber, setNewNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const publicClient = createPublicClient({
    chain: localhost31337,
    transport: http('http://127.0.0.1:8545'),
  });

  const walletClient = typeof window !== 'undefined' && window.ethereum
    ? createWalletClient({
      chain: localhost31337,
      transport: custom(window.ethereum),
    })
    : null;

  const connectWallet = async () => {
    if (!walletClient) return;

    try {
      const accounts = await walletClient.requestAddresses();
      setAccount(accounts[0]);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const readCounter = async () => {
    try {
      const result = await publicClient.readContract({
        address: COUNTER_ADDRESS,
        abi: counterABI,
        functionName: 'number',
      });
      setCounterValue(result);
    } catch (error) {
      console.error('Failed to read counter:', error);
    }
  };

  const increment = async () => {
    if (!walletClient || !account) return;

    setLoading(true);
    try {
      const hash = await walletClient.writeContract({
        address: COUNTER_ADDRESS,
        abi: counterABI,
        functionName: 'increment', // how to auto-complete this?
        account: account as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      await readCounter();
    } catch (error) {
      console.error('Failed to increment:', error);
    } finally {
      setLoading(false);
    }
  };

  const setNumber = async () => {
    if (!walletClient || !account || !newNumber) return;

    setLoading(true);
    try {
      const hash = await walletClient.writeContract({
        address: COUNTER_ADDRESS,
        abi: counterABI,
        functionName: 'setNumber',
        args: [BigInt(newNumber)],
        account: account as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      await readCounter();
      setNewNumber('');
    } catch (error) {
      console.error('Failed to set number:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    readCounter();
  }, []);

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Counter Contract Demo</h1>

      <div className="mb-6">
        <p className="text-gray-600 mb-2">Counter Value:</p>
        <p className="text-3xl font-bold text-blue-600">{counterValue.toString()}</p>
      </div>

      {!account ? (
        <button
          onClick={connectWallet}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Connected: {account.slice(0, 6)}...{account.slice(-4)}
          </p>

          <button
            onClick={increment}
            disabled={loading}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Processing...' : 'Increment (+1)'}
          </button>

          <div className="flex gap-2">
            <input
              type="number"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="Enter number"
              className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={setNumber}
              disabled={loading || !newNumber}
              className="bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
            >
              Set
            </button>
          </div>

          <button
            onClick={readCounter}
            className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
          >
            Refresh Counter
          </button>
        </div>
      )}
    </div>
  );
}