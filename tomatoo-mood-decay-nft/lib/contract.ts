export const contractAddress =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "0x1fA4FC2eA3617aa15eB7daa60a8Bd961C8D0EeB7";

export const contractAbi = [
  "function mint(address to) external returns (uint256)",
  "function lockToMint() external returns (uint256)",
  "function lockedBalance() external view returns (uint256)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function tokenOfOwner(address account) external view returns (uint256)",
  "function getMood(uint256 id) external view returns (uint8)",
  "function daysSinceTransfer(uint256 id) external view returns (uint256)",
  "function lastTransferAtOf(uint256 id) external view returns (uint256)",
  "function refreshMetadata(uint256 id) external",
  "function uri(uint256 id) external view returns (string)",
  "function owner() external view returns (address)"
] as const;

export const requiredLockTokenAddress =
  process.env.NEXT_PUBLIC_REQUIRED_LOCK_TOKEN ?? "0x10ad2E982f6cf74D64A36cff28D439FA490cb50F";
export const requiredLockTokenId = 1n;
export const requiredLockAmount = 5n;
export const requiredLockTokenName = "ありがとまとぅーNFT";
export const requiredLockTokenImage = "https://storage.googleapis.com/tukuru-kun/images/kg9TlwIWUU5qkuXo.jpeg";
export const requiredLockTokenMetadata =
  "https://tukuru-metadata.mad-member-tools.com/metadata/8453/0x10ad2e982f6cf74d64a36cff28d439fa490cb50f/1.json";

export const lockTokenAbi = [
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function isApprovedForAll(address account, address operator) external view returns (bool)",
  "function setApprovalForAll(address operator, bool approved) external"
] as const;

export const moodLabels = ["元気", "無表情", "泣き", "傷だらけ", "？"] as const;

export const stageCards = [
  {
    stage: "ステージ1",
    mood: "元気",
    window: "0日から7日未満",
    image: "/assets/stage1-cute.png",
    description: "明るくてかわいいトマト王。王冠も衣装もきれいで、まだ元気いっぱいです。"
  },
  {
    stage: "ステージ2",
    mood: "無表情",
    window: "7日から14日未満",
    image: "/assets/stage2-blank.png",
    description: "少し気持ちが落ち着いた状態。背景も暗くなり、表情から元気が消えます。"
  },
  {
    stage: "ステージ3",
    mood: "泣き",
    window: "14日から21日未満",
    image: "/assets/stage3-crying.png",
    description: "涙が止まらない状態。王国の空気も重くなり、寂しさが強くなります。"
  },
  {
    stage: "ステージ4",
    mood: "傷だらけ",
    window: "21日から30日未満",
    image: "/assets/stage4-damaged.png",
    description: "体も王冠も傷み始めます。かわいさは残りつつ、かなりボロボロです。"
  },
  {
    stage: "ステージ5",
    mood: "？",
    window: "30日以上",
    image: "/assets/stage5-zombie.png",
    description: "30日を超えた先に現れる、まだ秘密の最終形態です。"
  }
] as const;
