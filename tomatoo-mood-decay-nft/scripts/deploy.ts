import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const contractFactory = await ethers.getContractFactory("TomatooMoodDecayNFT");
  const contract = await contractFactory.deploy(deployer.address);

  await contract.waitForDeployment();

  console.log("TomatooMoodDecayNFT deployed to:", await contract.getAddress());
  console.log("Deployer:", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
