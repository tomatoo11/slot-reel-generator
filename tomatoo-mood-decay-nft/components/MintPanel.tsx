"use client";

import { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";

import {
  contractAbi,
  contractAddress,
  lockTokenAbi,
  moodLabels,
  requiredLockAmount,
  requiredLockTokenAddress,
  requiredLockTokenId,
  tomatooTokenId
} from "../lib/contract";

type InjectedProvider = {
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  isPhantom?: boolean;
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

type Eip6963Detail = {
  info: {
    rdns: string;
    name: string;
    icon: string;
    uuid: string;
  };
  provider: InjectedProvider;
};

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<Eip6963Detail>;
  }

  interface Window {
    ethereum?: InjectedProvider & {
      providers?: InjectedProvider[];
    };
  }
}

function isMetaMaskProvider(provider: InjectedProvider | null | undefined) {
  if (!provider) {
    return false;
  }

  return Boolean(provider.isMetaMask && !provider.isOkxWallet && !provider.isOKExWallet);
}

function getInjectedMetaMaskProvider() {
  if (typeof window === "undefined") {
    return null;
  }

  const injected = window.ethereum;

  if (!injected) {
    return null;
  }

  const providers = Array.isArray(injected.providers) ? injected.providers : [injected];
  const metaMaskProvider = providers.find((provider) => isMetaMaskProvider(provider));

  return metaMaskProvider ?? (isMetaMaskProvider(injected) ? injected : null);
}

type WalletOption = {
  id: string;
  name: string;
  provider: InjectedProvider;
};

const BASE_CHAIN_ID = "0x2105";
const BASE_NETWORK_PARAMS = {
  chainId: BASE_CHAIN_ID,
  chainName: "Base",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"]
};

function inferInjectedWalletName(provider: InjectedProvider) {
  if (provider.isMetaMask && !provider.isOkxWallet && !provider.isOKExWallet) {
    return "MetaMask";
  }
  if (provider.isPhantom) {
    return "Phantom";
  }
  if (provider.isOkxWallet || provider.isOKExWallet) {
    return "OKX Wallet";
  }
  return "Injected Wallet";
}

export function MintPanel() {
  const [wallet, setWallet] = useState<string>("");
  const [status, setStatus] = useState<string>("Connect a wallet to inspect or mint.");
  const [mood, setMood] = useState<string>("Unknown");
  const [daysSinceTransfer, setDaysSinceTransfer] = useState<string>("-");
  const [balance, setBalance] = useState<string>("0");
  const [lockBalance, setLockBalance] = useState<string>("0");
  const [isLockApproved, setIsLockApproved] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [metaMaskProvider, setMetaMaskProvider] = useState<InjectedProvider | null>(null);
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");

  useEffect(() => {
    const announcedProviders = new Map<string, WalletOption>();

    const selectProvider = () => {
      const injected = window.ethereum;
      const injectedOptions =
        injected && Array.isArray(injected.providers)
          ? injected.providers.map((provider, index) => ({
              id: `injected-${index}-${inferInjectedWalletName(provider)}`,
              name: inferInjectedWalletName(provider),
              provider
            }))
          : injected
            ? [
                {
                  id: "injected-default",
                  name: inferInjectedWalletName(injected),
                  provider: injected
                }
              ]
            : [];

      const allOptions = [...announcedProviders.values()];

      for (const option of injectedOptions) {
        const alreadyListed = allOptions.some((existing) => existing.provider === option.provider);
        if (!alreadyListed) {
          allOptions.push(option);
        }
      }

      setWalletOptions(allOptions);

      const announcedMetaMask = allOptions.find((option) => isMetaMaskProvider(option.provider));
      const fallbackMetaMask = getInjectedMetaMaskProvider();
      const selectedProvider = announcedMetaMask?.provider ?? fallbackMetaMask ?? null;

      setMetaMaskProvider(selectedProvider);

      if (allOptions.length === 0) {
        setStatus("No supported injected wallet was detected. Open this page in a browser/profile where MetaMask, Phantom, or another EVM wallet is enabled.");
        return;
      }

      setSelectedWalletId((current) => {
        if (current && allOptions.some((option) => option.id === current)) {
          return current;
        }

        const preferredOption =
          allOptions.find((option) => isMetaMaskProvider(option.provider)) ?? allOptions[0];
        return preferredOption.id;
      });

      setStatus("Choose a wallet provider, then connect from the selected wallet.");
    };

    const onAnnounceProvider = (event: CustomEvent<Eip6963Detail>) => {
      announcedProviders.set(event.detail.info.uuid, {
        id: event.detail.info.uuid,
        name: event.detail.info.name,
        provider: event.detail.provider
      });
      selectProvider();
    };

    window.addEventListener("eip6963:announceProvider", onAnnounceProvider as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    selectProvider();

    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounceProvider as EventListener);
    };
  }, []);

  useEffect(() => {
    if (metaMaskProvider || window.ethereum) {
      return;
    }

    if (!window.ethereum) {
      setStatus("MetaMask was not detected. Install it to mint or read on-chain mood.");
    }
  }, [metaMaskProvider]);

  function getSelectedProvider() {
    const selectedOption = walletOptions.find((option) => option.id === selectedWalletId);
    return selectedOption?.provider ?? metaMaskProvider ?? getInjectedMetaMaskProvider();
  }

  async function ensureBase(provider: InjectedProvider) {
    const currentChainId = (await provider.request({
      method: "eth_chainId"
    })) as string;

    if (currentChainId?.toLowerCase() === BASE_CHAIN_ID) {
      return;
    }

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_CHAIN_ID }]
      });
    } catch (error) {
      const switchError = error as { code?: number; message?: string };

      if (switchError.code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [BASE_NETWORK_PARAMS]
        });
        return;
      }

      throw error;
    }
  }

  async function connectWallet() {
    const preferredProvider = getSelectedProvider();

    if (!preferredProvider) {
      setStatus("No wallet provider is selected. Pick a wallet first.");
      return;
    }

    setIsBusy(true);

    try {
      await ensureBase(preferredProvider);
      const provider = new BrowserProvider(preferredProvider);
      const accounts = await provider.send("eth_requestAccounts", []);
      const account = accounts[0] ?? "";

      setWallet(account);
      const selectedName =
        walletOptions.find((option) => option.id === selectedWalletId)?.name ?? "selected wallet";
      setStatus(`Connected with ${selectedName}: ${account}`);
    } catch (error) {
      setStatus(`Wallet connection failed: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function refreshMood() {
    const preferredProvider = getSelectedProvider();

    if (!preferredProvider) {
      setStatus("MetaMask was not detected.");
      return;
    }

    setIsBusy(true);

    try {
      await ensureBase(preferredProvider);
      const provider = new BrowserProvider(preferredProvider);
      const contract = new Contract(contractAddress, contractAbi, provider);
      const accounts = wallet ? [wallet] : await provider.send("eth_requestAccounts", []);
      const account = accounts[0] ?? "";

      if (!account) {
        setStatus("Connect a wallet before reading your edition.");
        return;
      }

      const currentBalance = await contract.balanceOf(account, tomatooTokenId);
      const lockToken = new Contract(requiredLockTokenAddress, lockTokenAbi, provider);
      const currentLockBalance = await lockToken.balanceOf(account, requiredLockTokenId);
      const currentLockApproval = await lockToken.isApprovedForAll(account, contractAddress);

      setWallet(account);
      setBalance(currentBalance.toString());
      setLockBalance(currentLockBalance.toString());
      setIsLockApproved(currentLockApproval);

      if (currentBalance === 0n) {
        setMood("Not owned");
        setDaysSinceTransfer("-");
        setStatus("This wallet does not own the Tomatoo edition yet.");
        return;
      }

      const currentMood = Number(await contract.getMood(account, tomatooTokenId));
      const days = await contract.daysSinceTransfer(account, tomatooTokenId);

      setMood(moodLabels[currentMood] ?? "Unknown");
      setDaysSinceTransfer(days.toString());
      setStatus("Loaded mood for your wallet's Tomatoo edition.");
    } catch (error) {
      setStatus(`Reading token failed: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function mintToSelf() {
    const preferredProvider = getSelectedProvider();

    if (!preferredProvider) {
      setStatus("MetaMask was not detected.");
      return;
    }

    setIsBusy(true);

    try {
      await ensureBase(preferredProvider);
      const provider = new BrowserProvider(preferredProvider);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const contract = new Contract(contractAddress, contractAbi, signer);
      const tx = await contract.mint(account);

      setStatus(`Mint transaction sent: ${tx.hash}`);
      await tx.wait();
      setWallet(account);
      setBalance("1");
      setMood("CUTE");
      setDaysSinceTransfer("0");
      setStatus(`Minted one edition to ${account}. If you are not the contract owner, this call will revert.`);
    } catch (error) {
      setStatus(`Mint failed: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function approveLockToken() {
    const preferredProvider = getSelectedProvider();

    if (!preferredProvider) {
      setStatus("MetaMask was not detected.");
      return;
    }

    setIsBusy(true);

    try {
      await ensureBase(preferredProvider);
      const provider = new BrowserProvider(preferredProvider);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const lockToken = new Contract(requiredLockTokenAddress, lockTokenAbi, signer);
      const tx = await lockToken.setApprovalForAll(contractAddress, true);

      setWallet(account);
      setStatus(`Approval transaction sent: ${tx.hash}`);
      await tx.wait();
      setIsLockApproved(true);
      setStatus("Lock token approval is enabled. You can now lock 5 and mint.");
    } catch (error) {
      setStatus(`Approval failed: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function lockFiveAndMint() {
    const preferredProvider = getSelectedProvider();

    if (!preferredProvider) {
      setStatus("MetaMask was not detected.");
      return;
    }

    setIsBusy(true);

    try {
      await ensureBase(preferredProvider);
      const provider = new BrowserProvider(preferredProvider);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const contract = new Contract(contractAddress, contractAbi, signer);
      const tx = await contract.lockToMint();

      setWallet(account);
      setStatus(`Lock-to-mint transaction sent: ${tx.hash}`);
      await tx.wait();
      setBalance("1");
      setMood("CUTE");
      setDaysSinceTransfer("0");
      setStatus(`Locked ${requiredLockAmount.toString()} required NFTs and minted one Tomatoo edition.`);
    } catch (error) {
      setStatus(`Lock-to-mint failed: ${(error as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Wallet</p>
          <h2>Mint & Mood Console</h2>
        </div>
        <button className="ghost-button" type="button" onClick={connectWallet} disabled={isBusy}>
          {wallet ? "Reconnect" : "Connect Wallet"}
        </button>
      </div>

      <div className="panel-grid">
        <div className="field">
          <label htmlFor="walletProvider">Wallet Provider</label>
          <select
            id="walletProvider"
            value={selectedWalletId}
            onChange={(event) => setSelectedWalletId(event.target.value)}
          >
            {walletOptions.length === 0 ? (
              <option value="">No wallet detected</option>
            ) : (
              walletOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="actions">
          <button type="button" onClick={refreshMood} disabled={isBusy}>
            Read My Edition
          </button>
          <button type="button" onClick={approveLockToken} disabled={isBusy || isLockApproved}>
            Approve Lock NFT
          </button>
          <button type="button" onClick={lockFiveAndMint} disabled={isBusy}>
            Lock 5 & Mint
          </button>
          <button type="button" onClick={mintToSelf} disabled={isBusy}>
            Owner Mint
          </button>
        </div>
      </div>

      <div className="stats">
        <div>
          <span className="stat-label">Connected wallet</span>
          <strong>{wallet || "Not connected"}</strong>
        </div>
        <div>
          <span className="stat-label">Current mood</span>
          <strong>{mood}</strong>
        </div>
        <div>
          <span className="stat-label">Edition balance</span>
          <strong>{balance} / 1</strong>
        </div>
        <div>
          <span className="stat-label">Lock NFT balance</span>
          <strong>{lockBalance} / {requiredLockAmount.toString()}</strong>
        </div>
        <div>
          <span className="stat-label">Lock approval</span>
          <strong>{isLockApproved ? "Approved" : "Not approved"}</strong>
        </div>
        <div>
          <span className="stat-label">Days since transfer</span>
          <strong>{daysSinceTransfer}</strong>
        </div>
      </div>

      <p className="status">{status}</p>
    </section>
  );
}
