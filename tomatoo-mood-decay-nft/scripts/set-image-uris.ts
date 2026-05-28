import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const imageUris = [
    process.env.STAGE1_IMAGE_URI,
    process.env.STAGE2_IMAGE_URI,
    process.env.STAGE3_IMAGE_URI,
    process.env.STAGE4_IMAGE_URI,
    process.env.STAGE5_IMAGE_URI
  ];

  if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set");
  }

  for (const [index, uri] of imageUris.entries()) {
    if (!uri) {
      throw new Error(`STAGE${index + 1}_IMAGE_URI is not set`);
    }
  }

  const contract = await ethers.getContractAt("TomatooMoodDecayNFT", contractAddress);
  const tx = await contract.setImageUris(imageUris as [string, string, string, string, string]);

  console.log("setImageUris transaction:", tx.hash);
  await tx.wait();
  console.log("Image URIs updated on:", contractAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
