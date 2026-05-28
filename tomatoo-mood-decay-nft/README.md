# Tomatoo Mood Decay NFT

Tomatoo Mood Decay NFT is a full-stack ERC-1155 edition project where a pixel-art tomato king gradually decays after a wallet receives it. Each wallet can hold only one edition of token ID `1`. The metadata JSON is generated on-chain, the holder-specific image changes by mood stage, and receiving the edition resets that wallet back to the cheerful first state.

## Included

- Solidity `^0.8.24` contract with OpenZeppelin Contracts v5
- ERC-1155 edition using fixed token ID `1`
- One edition maximum per wallet
- Public lock-to-mint flow that locks 5 units of a required Base ERC-1155 token
- Standard `uri(id)` plus holder-specific `uriFor(account, id)` with on-chain Base64 JSON metadata
- Time-based mood stages driven by each wallet's last received timestamp
- Owner-only minting and stage image URI management
- TypeScript Hardhat tests for minting, mood transitions, transfer reset, metadata output, and admin restrictions
- Next.js + TypeScript mint site with wallet connection, mint action, mood lookup, and stage gallery
- Square PNG placeholders in `public/assets/` that can be replaced with final art

## Mood schedule

- `0 to <7 days`: `CUTE`
- `7 to <14 days`: `BLANK`
- `14 to <21 days`: `CRYING`
- `21 to <30 days`: `DAMAGED`
- `30+ days`: `ZOMBIE`

Any normal transfer resets the receiver's wallet mood to `CUTE`.

## Lock-to-mint requirement

Users can mint one Tomatoo edition by locking 5 units of the required ERC-1155 token:

- Required lock token contract on Base: `0x10ad2E982f6cf74D64A36cff28D439FA490cb50F`
- Required lock token ID: `1`
- Required lock amount: `5`
- Minted Tomatoo token ID: `1`
- Maximum Tomatoo balance per wallet: `1`

The required token is transferred into the Tomatoo contract and held there. This is a lock, not a burn: the tokens leave the user's wallet, but they still exist on-chain inside the Tomatoo contract.

Before calling `lockToMint()`, users must approve the Tomatoo contract as an operator on the required ERC-1155 token by calling `setApprovalForAll(tomatooContractAddress, true)`. The frontend includes an `Approve Lock NFT` button for this.

## ERC-1155 metadata note

The ERC-1155 standard `uri(uint256 id)` function only receives the token ID. It does not receive the holder wallet address, so it cannot know which wallet's mood to render. For that reason:

- `uri(1)` returns valid default on-chain metadata for the edition.
- `uriFor(account, 1)` returns the wallet-specific metadata that follows that account's decay timer.
- The frontend reads `getMood(account, 1)`, `daysSinceTransfer(account, 1)`, and `uriFor(account, 1)` for the connected wallet.

## Project structure

- `contracts/TomatooMoodDecayNFT.sol`
- `test/TomatooMoodDecayNFT.ts`
- `scripts/deploy.ts`
- `app/`
- `components/`
- `lib/`
- `public/assets/`

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your values:

   ```bash
   cp .env.example .env
   ```

3. Compile and test:

   ```bash
   npm run compile
   npm run test
   ```

4. Start the frontend:

   ```bash
   npm run dev
   ```

## Base deployment

1. Set `BASE_RPC_URL`, `PRIVATE_KEY`, `REQUIRED_LOCK_TOKEN`, and `NEXT_PUBLIC_REQUIRED_LOCK_TOKEN` in `.env`.
2. Deploy:

   ```bash
   npm run deploy:base
   ```

3. Copy the deployed address into `NEXT_PUBLIC_CONTRACT_ADDRESS`.
4. Upload your final stage artwork to IPFS or another content-addressed host.
5. Call `setImageUris()` from the contract owner account with the five stage image URIs.

## Frontend notes

- The `Lock 5 & Mint` button calls `lockToMint()`, which transfers 5 required ERC-1155 tokens into the Tomatoo contract and mints one Tomatoo edition.
- The `Approve Lock NFT` button allows the Tomatoo contract to transfer the required ERC-1155 tokens.
- The owner mint button calls `mint(connectedWallet)`, so only the contract owner can use that admin path successfully.
- Minting fails if the target wallet already owns one edition.
- Transfers fail if the receiver wallet already owns one edition.
- The mood reader calls `getMood(account, 1)` and `daysSinceTransfer(account, 1)` directly on-chain.
- The UI uses placeholder art from `public/assets/`. Replace those files with final square NFT images when your artwork is ready.

## Placeholder assets

These files are already wired into the gallery and intended for easy swap-in:

- `public/assets/stage1-cute.png`
- `public/assets/stage2-blank.png`
- `public/assets/stage3-crying.png`
- `public/assets/stage4-damaged.png`
- `public/assets/stage5-zombie.png`

## Upload images to IPFS with Pinata

Pinata has a free plan and supports uploading files to IPFS with a JWT API key. Create a Pinata account, generate a JWT, and add it to `.env`:

```bash
PINATA_JWT=your-pinata-jwt
```

Then upload the five local stage images:

```bash
npm run upload:pinata
```

The script prints these values and saves them to `pinata-upload-results.json`:

```bash
STAGE1_IMAGE_URI=ipfs://...
STAGE2_IMAGE_URI=ipfs://...
STAGE3_IMAGE_URI=ipfs://...
STAGE4_IMAGE_URI=ipfs://...
STAGE5_IMAGE_URI=ipfs://...
```

Copy those five `STAGE*_IMAGE_URI` values into `.env`, then update the Base contract:

```bash
npm run set-images:base
```

## Practical customization

- Change collection name and symbol in the contract constructor call.
- Update metadata description in `_buildUri()`.
- Replace placeholder stage URIs with your final IPFS image links.
- Restyle the app in `app/globals.css` if you want a different presentation.
