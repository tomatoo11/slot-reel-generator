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
  requiredLockTokenImage,
  requiredLockTokenId,
  requiredLockTokenMetadata,
  requiredLockTokenName
} from "../lib/contract";

type InjectedProvider = {
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  isPhantom?: boolean;
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

type WalletOption = {
  id: string;
  name: string;
  provider: InjectedProvider;
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

function isMetaMaskProvider(provider: InjectedProvider | null | undefined) {
  return Boolean(provider?.isMetaMask && !provider.isOkxWallet && !provider.isOKExWallet);
}

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
  return "ウォレット";
}

function getInjectedProvider() {
  if (typeof window === "undefined") {
    return null;
  }

  const injected = window.ethereum;

  if (!injected) {
    return null;
  }

  const providers = Array.isArray(injected.providers) ? injected.providers : [injected];
  return providers.find((provider) => isMetaMaskProvider(provider)) ?? injected;
}

function formatError(error: unknown) {
  const message = (error as Error).message ?? String(error);

  if (message.includes("user rejected") || message.includes("User rejected")) {
    return "ウォレットで操作がキャンセルされました。";
  }
  if (message.includes("insufficient funds")) {
    return "ガス代用のBase ETHが足りません。";
  }
  if (message.includes("wallet already owns one")) {
    return "このウォレットはすでにTomatooを1体持っています。";
  }
  if (message.includes("ERC1155InsufficientBalance")) {
    return "ロックに必要なNFTの枚数が足りません。";
  }
  if (message.includes("missing revert data") || message.includes("execution reverted")) {
    return "取引が失敗しました。対象NFTの枚数、ロック許可、接続ネットワークを確認してください。";
  }

  return message;
}

function shortenAddress(address: string) {
  if (!address) {
    return "";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function MintPanel() {
  const [wallet, setWallet] = useState<string>("");
  const [status, setStatus] = useState<string>(
    "ウォレットを接続すると、保有状況とTomatooの状態を確認できます。"
  );
  const [mood, setMood] = useState<string>("未確認");
  const [daysSinceTransfer, setDaysSinceTransfer] = useState<string>("-");
  const [tomatooTokenId, setTomatooTokenId] = useState<bigint>(0n);
  const [lockBalance, setLockBalance] = useState<string>("0");
  const [isLockApproved, setIsLockApproved] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [successTxHash, setSuccessTxHash] = useState<string>("");
  const [hasMintedEdition, setHasMintedEdition] = useState<boolean>(false);
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

      if (allOptions.length === 0) {
        setStatus("対応ウォレットが見つかりません。MetaMaskなどのEVMウォレットで開いてください。");
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

      setStatus("ウォレットを選んで接続してください。");
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

  function getSelectedProvider() {
    const selectedOption = walletOptions.find((option) => option.id === selectedWalletId);
    return selectedOption?.provider ?? getInjectedProvider();
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
      const switchError = error as { code?: number };

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

  async function readWalletState(account: string, provider: BrowserProvider) {
    const contract = new Contract(contractAddress, contractAbi, provider);
    const lockToken = new Contract(requiredLockTokenAddress, lockTokenAbi, provider);
    const ownedTokenId = (await contract.tokenOfOwner(account)) as bigint;
    const currentLockBalance = (await lockToken.balanceOf(account, requiredLockTokenId)) as bigint;
    const currentLockApproval = (await lockToken.isApprovedForAll(account, contractAddress)) as boolean;

    setWallet(account);
    setTomatooTokenId(ownedTokenId);
    setLockBalance(currentLockBalance.toString());
    setIsLockApproved(currentLockApproval);
    setHasMintedEdition(ownedTokenId > 0n);

    if (ownedTokenId === 0n) {
      setMood("未保有");
      setDaysSinceTransfer("-");
      return;
    }

    const currentMood = Number(await contract.getMood(ownedTokenId));
    const days = (await contract.daysSinceTransfer(ownedTokenId)) as bigint;

    setMood(moodLabels[currentMood] ?? "不明");
    setDaysSinceTransfer(days.toString());
  }

  async function connectWallet() {
    const preferredProvider = getSelectedProvider();

    if (!preferredProvider) {
      setStatus("ウォレットが選択されていません。先にウォレットを選んでください。");
      return;
    }

    setIsBusy(true);

    try {
      await ensureBase(preferredProvider);
      const provider = new BrowserProvider(preferredProvider);
      const accounts = await provider.send("eth_requestAccounts", []);
      const account = accounts[0] ?? "";
      const selectedName =
        walletOptions.find((option) => option.id === selectedWalletId)?.name ?? "選択したウォレット";

      await readWalletState(account, provider);
      setStatus(`${selectedName}で接続しました: ${shortenAddress(account)}`);
    } catch (error) {
      setStatus(`ウォレット接続に失敗しました: ${formatError(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function refreshMood() {
    const preferredProvider = getSelectedProvider();

    if (!preferredProvider) {
      setStatus("ウォレットが見つかりません。");
      return;
    }

    setIsBusy(true);

    try {
      await ensureBase(preferredProvider);
      const provider = new BrowserProvider(preferredProvider);
      const accounts = wallet ? [wallet] : await provider.send("eth_requestAccounts", []);
      const account = accounts[0] ?? "";

      if (!account) {
        setStatus("Tomatooの状態を読む前にウォレットを接続してください。");
        return;
      }

      await readWalletState(account, provider);
      setStatus("このウォレットのTomatoo状態を読み込みました。OpenSea対応版ではtokenIdごとに見た目が変わります。");
    } catch (error) {
      setStatus(`読み込みに失敗しました: ${formatError(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function approveLockToken() {
    const preferredProvider = getSelectedProvider();

    if (!preferredProvider) {
      setStatus("ウォレットが見つかりません。");
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
      setStatus(`ロック許可の取引を送信しました: ${tx.hash}`);
      await tx.wait();
      await readWalletState(account, provider);
      setStatus("ロック許可が完了しました。次に「5枚ロックしてミント」を押せます。");
    } catch (error) {
      setStatus(`ロック許可に失敗しました: ${formatError(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function lockFiveAndMint() {
    const preferredProvider = getSelectedProvider();

    if (!preferredProvider) {
      setStatus("ウォレットが見つかりません。");
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
      setStatus(`ロックミントの取引を送信しました: ${tx.hash}`);
      await tx.wait();

      await readWalletState(account, provider);
      setSuccessTxHash(tx.hash);
      setHasMintedEdition(true);

      setMood("元気");
      setDaysSinceTransfer("0");
      setStatus(`対象NFTを${requiredLockAmount.toString()}枚ロックして、Tomatooをミントしました。`);
    } catch (error) {
      setStatus(`ロックミントに失敗しました: ${formatError(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function refreshOpenSeaMetadata() {
    const preferredProvider = getSelectedProvider();

    if (!preferredProvider || tomatooTokenId === 0n) {
      setStatus("OpenSea更新の前に、Tomatooの状態を確認してください。");
      return;
    }

    setIsBusy(true);

    try {
      await ensureBase(preferredProvider);
      const provider = new BrowserProvider(preferredProvider);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractAbi, signer);
      const tx = await contract.refreshMetadata(tomatooTokenId);

      setStatus(`OpenSea向けのメタデータ更新通知を送信しました: ${tx.hash}`);
      await tx.wait();
      setStatus("メタデータ更新通知が完了しました。OpenSea側の表示反映には少し時間がかかる場合があります。");
    } catch (error) {
      setStatus(`メタデータ更新通知に失敗しました: ${formatError(error)}`);
    } finally {
      setIsBusy(false);
    }
  }

  const openSeaUrl =
    tomatooTokenId > 0n
      ? `https://opensea.io/assets/base/${contractAddress}/${tomatooTokenId.toString()}`
      : "";

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">ウォレット</p>
          <h2>ミントと状態確認</h2>
        </div>
        <button className="ghost-button" type="button" onClick={connectWallet} disabled={isBusy}>
          {wallet ? "再接続" : "ウォレット接続"}
        </button>
      </div>

      <div className="panel-grid">
        <div className="field">
          <label htmlFor="walletProvider">ウォレット</label>
          <select
            id="walletProvider"
            value={selectedWalletId}
            onChange={(event) => setSelectedWalletId(event.target.value)}
          >
            {walletOptions.length === 0 ? (
              <option value="">ウォレット未検出</option>
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
            状態を確認
          </button>
          <button type="button" onClick={approveLockToken} disabled={isBusy || isLockApproved}>
            ロック許可
          </button>
          <button type="button" onClick={lockFiveAndMint} disabled={isBusy || hasMintedEdition}>
            5枚ロックしてミント
          </button>
          <button type="button" onClick={refreshOpenSeaMetadata} disabled={isBusy || tomatooTokenId === 0n}>
            OpenSea表示を更新
          </button>
        </div>
      </div>

      <div className="risk-note">
        <h3>ミント前に確認してください</h3>
        <div className="lock-token-preview">
          <img src={requiredLockTokenImage} alt={requiredLockTokenName} />
          <div>
            <span className="stat-label">ロックされるNFT</span>
            <strong>{requiredLockTokenName}</strong>
            <p>
              tokenId {requiredLockTokenId.toString()} を{requiredLockAmount.toString()}枚ロックします。
            </p>
            <a href={requiredLockTokenMetadata} target="_blank" rel="noreferrer">
              メタデータを確認
            </a>
          </div>
        </div>
        <p>
          ミントすると、指定されたBase ERC-1155 NFTのtokenId {requiredLockTokenId.toString()} を
          {requiredLockAmount.toString()}枚、Tomatooコントラクトの中にロックします。ロックされたNFTはあなたのウォレットから出ていきます。
        </p>
        <p>
          OpenSea対応版では、ミントされたTomatooごとに個別のtokenIdが発行されます。OpenSeaはそのtokenIdの
          <code>uri(tokenId)</code> を読むため、時間経過後の画像変化に対応しやすくなります。
        </p>
        <p>
          ロック先Tomatoo: <span>{contractAddress}</span>
        </p>
        <p>
          対象NFT: <span>{requiredLockTokenAddress}</span>
        </p>
      </div>

      <div className="stats">
        <div>
          <span className="stat-label">接続ウォレット</span>
          <strong title={wallet || undefined}>{wallet ? shortenAddress(wallet) : "未接続"}</strong>
        </div>
        <div>
          <span className="stat-label">Tomatoo tokenId</span>
          <strong>{tomatooTokenId > 0n ? `#${tomatooTokenId.toString()}` : "未保有"}</strong>
        </div>
        <div>
          <span className="stat-label">現在の状態</span>
          <strong>{mood}</strong>
        </div>
        <div>
          <span className="stat-label">対象NFT保有数</span>
          <strong>
            {lockBalance} / {requiredLockAmount.toString()}
          </strong>
        </div>
        <div>
          <span className="stat-label">ロック許可</span>
          <strong>{isLockApproved ? "許可済み" : "未許可"}</strong>
        </div>
        <div>
          <span className="stat-label">受け取り後の日数</span>
          <strong>{daysSinceTransfer}</strong>
        </div>
      </div>

      <p className="status">{status}</p>

      {hasMintedEdition ? (
        <div className="success-note">
          <h3>ミント済み</h3>
          <p>
            このウォレットはTomatoo NFT
            {tomatooTokenId > 0n ? ` #${tomatooTokenId.toString()}` : ""} を保有しています。OpenSeaではこの
            tokenIdごとのメタデータが表示されます。
          </p>
          <div className="actions">
            {successTxHash ? (
              <a href={`https://basescan.org/tx/${successTxHash}`} target="_blank" rel="noreferrer">
                BaseScanで取引を確認
              </a>
            ) : (
              <a href={`https://basescan.org/address/${contractAddress}`} target="_blank" rel="noreferrer">
                BaseScanでTomatooを確認
              </a>
            )}
            {openSeaUrl ? (
              <a href={openSeaUrl} target="_blank" rel="noreferrer">
                OpenSeaで見る
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
