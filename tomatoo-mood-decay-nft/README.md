# Tomatoo Mood Decay NFT

Tomatoo Mood Decay NFT is an ERC-1155 project for Base. A cute pixel-art tomato king changes mood over time after it is received. The project uses one unique `tokenId` per minted Tomatoo so marketplaces like OpenSea can read the standard `uri(tokenId)` and display token-specific metadata.

## Included

- Solidity `^0.8.24` contract with OpenZeppelin Contracts v5
- ERC-1155 with unique token IDs, one Tomatoo per wallet
- Public lock-to-mint flow that locks 5 units of a required Base ERC-1155 token
- Fully on-chain Base64 JSON metadata from the standard `uri(tokenId)`
- Time-based mood stages stored per Tomatoo token ID
- Transfer reset: when a Tomatoo moves to a new wallet, its timer returns to day 0
- Owner-only admin mint and image URI management
- Public `refreshMetadata(tokenId)` helper that emits `MetadataUpdate(tokenId)`
- TypeScript Hardhat tests
- Next.js + TypeScript mint site

## Mood Schedule

- `0 to <7 days`: `CUTE`
- `7 to <14 days`: `BLANK`
- `14 to <21 days`: `CRYING`
- `21 to <30 days`: `DAMAGED`
- `30+ days`: `ZOMBIE`

## OpenSea Support

The old fixed-token version used the same `tokenId = 1` for everyone. That is bad for OpenSea because OpenSea normally reads only `uri(tokenId)`.

This version mints a new token ID for each Tomatoo:

- First mint: `tokenId = 1`
- Second mint: `tokenId = 2`
- Third mint: `tokenId = 3`

Because each Tomatoo has its own token ID, `uri(tokenId)` can return the correct current image for that specific NFT. This is the important change for OpenSea.

OpenSea may still cache metadata. If the contract has changed but OpenSea is slow to update, use the site's `OpenSea表示を更新` button or OpenSea's refresh metadata action.

## Current Base Deployment

- OpenSea-friendly Tomatoo contract: `0x1fA4FC2eA3617aa15eB7daa60a8Bd961C8D0EeB7`
- BaseScan: `https://basescan.org/address/0x1fA4FC2eA3617aa15eB7daa60a8Bd961C8D0EeB7#code`
- Required lock token: `0x10ad2E982f6cf74D64A36cff28D439FA490cb50F`
- Required lock token ID: `1`
- Required lock amount: `5`

## Lock-to-Mint Requirement

Users can mint one Tomatoo by locking 5 units of the required ERC-1155 token:

- Required lock token contract on Base: `0x10ad2E982f6cf74D64A36cff28D439FA490cb50F`
- Required lock token ID: `1`
- Required lock amount: `5`
- Maximum Tomatoo per wallet: `1`

The required token is transferred into the Tomatoo contract and held there. This is a lock, not a burn. The tokens leave the user's wallet, but still exist on-chain inside the Tomatoo contract.

Before calling `lockToMint()`, users must approve the Tomatoo contract by calling `setApprovalForAll(tomatooContractAddress, true)` on the required ERC-1155 token. The frontend includes a `ロック許可` button for this.

## Main Contract Functions

- `lockToMint()` locks 5 required NFTs and mints one unique Tomatoo.
- `mint(address to)` lets the owner mint one unique Tomatoo.
- `tokenOfOwner(address account)` returns the Tomatoo token ID held by a wallet, or `0` if none.
- `getMood(uint256 tokenId)` returns the current mood stage.
- `daysSinceTransfer(uint256 tokenId)` returns days since the token was received.
- `uri(uint256 tokenId)` returns OpenSea-readable on-chain metadata.
- `refreshMetadata(uint256 tokenId)` emits `MetadataUpdate(tokenId)`.

## Local Setup

```bash
npm install
cp .env.example .env
npm run compile
npm run test
npm run dev
```

## Base Deployment

1. Set `BASE_RPC_URL`, `PRIVATE_KEY`, `REQUIRED_LOCK_TOKEN`, and `NEXT_PUBLIC_REQUIRED_LOCK_TOKEN` in `.env`.
2. Deploy:

   ```bash
   npm run deploy:base
   ```

3. Copy the new deployed address into `NEXT_PUBLIC_CONTRACT_ADDRESS`.
4. Upload the five stage images to IPFS.
5. Put the five `STAGE*_IMAGE_URI` values in `.env`.
6. Run:

   ```bash
   npm run set-images:base
   ```

7. Update the same `NEXT_PUBLIC_CONTRACT_ADDRESS` value in Vercel.

## Placeholder Assets

These files are used by the site gallery:

- `public/assets/stage1-cute.png`
- `public/assets/stage2-blank.png`
- `public/assets/stage3-crying.png`
- `public/assets/stage4-damaged.png`
- `public/assets/stage5-zombie.png`

## Upload Images to IPFS with Pinata

Pinata has a free plan. Add a JWT to `.env`:

```bash
PINATA_JWT=your-pinata-jwt
```

Then upload:

```bash
npm run upload:pinata
```

Copy the printed `STAGE*_IMAGE_URI` values into `.env`, then run:

```bash
npm run set-images:base
```
