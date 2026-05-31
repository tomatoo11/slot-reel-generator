import hre from "hardhat";

const { ethers } = hre;

const ERC1155_ABI = [
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function isApprovedForAll(address account, address operator) external view returns (bool)"
];

async function main() {
  const wallet = process.env.CHECK_WALLET;
  const tomatooContract = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const lockToken = process.env.NEXT_PUBLIC_REQUIRED_LOCK_TOKEN;

  if (!wallet) {
    throw new Error("CHECK_WALLET is not set");
  }
  if (!tomatooContract) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set");
  }
  if (!lockToken) {
    throw new Error("NEXT_PUBLIC_REQUIRED_LOCK_TOKEN is not set");
  }

  const tomatoo = await ethers.getContractAt("TomatooMoodDecayNFT", tomatooContract);
  const requiredToken = new ethers.Contract(lockToken, ERC1155_ABI, ethers.provider);

  const ownedTokenId = await tomatoo.tokenOfOwner(wallet);
  const lockBalance = await requiredToken.balanceOf(wallet, 1);
  const isApproved = await requiredToken.isApprovedForAll(wallet, tomatooContract);
  let lockToMintSimulation = "not-run";

  try {
    const data = tomatoo.interface.encodeFunctionData("lockToMint");
    await ethers.provider.call({
      from: wallet,
      to: tomatooContract,
      data
    });
    lockToMintSimulation = "ok";
  } catch (error) {
    lockToMintSimulation = (error as Error).message;
  }

  console.log("wallet:", wallet);
  console.log("tomatooContract:", tomatooContract);
  console.log("ownedTomatooTokenId:", ownedTokenId.toString());
  console.log("requiredLockTokenBalance:", lockBalance.toString());
  console.log("approvedForNewContract:", isApproved);
  console.log("lockToMintSimulation:", lockToMintSimulation);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
