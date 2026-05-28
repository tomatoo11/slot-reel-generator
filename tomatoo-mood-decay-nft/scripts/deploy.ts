import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const contractFactory = await ethers.getContractFactory("TomatooMoodDecayNFT");
  const requiredLockToken =
    process.env.REQUIRED_LOCK_TOKEN ?? "0x10ad2E982f6cf74D64A36cff28D439FA490cb50F";
  const contract = await contractFactory.deploy(deployer.address, requiredLockToken);

  await contract.waitForDeployment();

  console.log("TomatooMoodDecayNFT deployed to:", await contract.getAddress());
  console.log("Deployer:", deployer.address);
  console.log("Required lock token:", requiredLockToken);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
