# Tomatoo Mood Decay NFT

Tomatoo Mood Decay NFT is a full-stack ERC-721 project where a pixel-art tomato king gradually decays after its last transfer. The metadata is fully on-chain, the token image changes by mood stage, and every transfer resets the timer back to the cheerful first state.

## Included

- Solidity `^0.8.24` contract with OpenZeppelin Contracts v5
- Dynamic `tokenURI()` with on-chain Base64 JSON metadata
- Time-based mood stages driven by `lastTransferAt`
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

Any normal transfer resets the token to `CUTE`.

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

## Sepolia deployment

1. Set `SEPOLIA_RPC_URL` and `PRIVATE_KEY` in `.env`.
2. Deploy:

   ```bash
   npm run deploy:sepolia
   ```

3. Copy the deployed address into `NEXT_PUBLIC_CONTRACT_ADDRESS`.
4. Upload your final stage artwork to IPFS or another content-addressed host.
5. Call `setImageUris()` from the contract owner account with the five stage image URIs.

## Frontend notes

- The mint button calls `mint(connectedWallet)`, so only the contract owner can mint successfully.
- The mood reader calls `getMood(tokenId)` and `daysSinceTransfer(tokenId)` directly on-chain.
- The UI uses placeholder art from `public/assets/`. Replace those files with final square NFT images when your artwork is ready.

## Placeholder assets

These files are already wired into the gallery and intended for easy swap-in:

- `public/assets/stage1-cute.png`
- `public/assets/stage2-blank.png`
- `public/assets/stage3-crying.png`
- `public/assets/stage4-damaged.png`
- `public/assets/stage5-zombie.png`

## Practical customization

- Change collection name and symbol in the contract constructor call.
- Update metadata description in `tokenURI()`.
- Replace placeholder stage URIs with your final IPFS image links.
- Restyle the app in `app/globals.css` if you want a different presentation.
