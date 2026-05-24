export const contractAddress =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000";

export const contractAbi = [
  "function mint(address to) external returns (uint256)",
  "function getMood(uint256 tokenId) external view returns (uint8)",
  "function daysSinceTransfer(uint256 tokenId) external view returns (uint256)",
  "function owner() external view returns (address)"
] as const;

export const moodLabels = ["CUTE", "BLANK", "CRYING", "DAMAGED", "ZOMBIE"] as const;

export const stageCards = [
  {
    stage: "Stage 1",
    mood: "CUTE",
    window: "0 to <7 days",
    image: "/assets/stage1-cute.png",
    description: "Warm, bright, charming tomato king with a hopeful smile."
  },
  {
    stage: "Stage 2",
    mood: "BLANK",
    window: "7 to <14 days",
    image: "/assets/stage2-blank.png",
    description: "The kingdom loses its sparkle and the king goes emotionally flat."
  },
  {
    stage: "Stage 3",
    mood: "CRYING",
    window: "14 to <21 days",
    image: "/assets/stage3-crying.png",
    description: "Tears arrive, the mood darkens, and the room becomes heavy."
  },
  {
    stage: "Stage 4",
    mood: "DAMAGED",
    window: "21 to <30 days",
    image: "/assets/stage4-damaged.png",
    description: "The body wears down and the royal look starts to collapse."
  },
  {
    stage: "Stage 5",
    mood: "ZOMBIE",
    window: "30+ days",
    image: "/assets/stage5-zombie.png",
    description: "The tomato king is fully eerie, undead, and ready for the crypt."
  }
] as const;
