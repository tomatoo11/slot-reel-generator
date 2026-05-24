import { expect } from "chai";
import hre from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const { ethers } = hre;

describe("TomatooMoodDecayNFT", function () {
  async function deployFixture() {
    const [owner, user, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("TomatooMoodDecayNFT");
    const contract = await factory.deploy(owner.address);

    await contract.waitForDeployment();

    await contract.setImageUris([
      "ipfs://stage1-cute",
      "ipfs://stage2-blank",
      "ipfs://stage3-crying",
      "ipfs://stage4-damaged",
      "ipfs://stage5-zombie"
    ]);

    return { contract, owner, user, other };
  }

  it("mints from the owner", async function () {
    const { contract, owner, user } = await loadFixture(deployFixture);

    await expect(contract.connect(owner).mint(user.address))
      .to.emit(contract, "Transfer")
      .withArgs(ethers.ZeroAddress, user.address, 1n);

    expect(await contract.ownerOf(1n)).to.equal(user.address);
    expect(await contract.getMood(1n)).to.equal(0n);
  });

  it("advances through mood stages over time", async function () {
    const { contract, owner, user } = await loadFixture(deployFixture);

    await contract.connect(owner).mint(user.address);
    await time.increase(8 * 24 * 60 * 60);
    expect(await contract.getMood(1n)).to.equal(1n);

    await time.increase(7 * 24 * 60 * 60);
    expect(await contract.getMood(1n)).to.equal(2n);

    await time.increase(8 * 24 * 60 * 60);
    expect(await contract.getMood(1n)).to.equal(3n);

    await time.increase(10 * 24 * 60 * 60);
    expect(await contract.getMood(1n)).to.equal(4n);
  });

  it("resets the mood timer after transfer", async function () {
    const { contract, owner, user, other } = await loadFixture(deployFixture);

    await contract.connect(owner).mint(user.address);
    await time.increase(22 * 24 * 60 * 60);
    expect(await contract.getMood(1n)).to.equal(3n);

    await expect(contract.connect(user).transferFrom(user.address, other.address, 1n))
      .to.emit(contract, "MetadataUpdate")
      .withArgs(1n);

    expect(await contract.getMood(1n)).to.equal(0n);
    expect(await contract.ownerOf(1n)).to.equal(other.address);
  });

  it("updates tokenURI output based on the current stage", async function () {
    const { contract, owner, user } = await loadFixture(deployFixture);

    await contract.connect(owner).mint(user.address);
    const cuteUri = await contract.tokenURI(1n);
    expect(cuteUri).to.contain("data:application/json;base64,");

    await time.increase(31 * 24 * 60 * 60);
    const zombieUri = await contract.tokenURI(1n);

    const zombieMetadata = Buffer.from(zombieUri.split(",")[1], "base64").toString("utf8");
    expect(zombieMetadata).to.contain('"value":"ZOMBIE"');
    expect(zombieMetadata).to.contain("ipfs://stage5-zombie");
  });

  it("restricts admin actions to the owner", async function () {
    const { contract, user } = await loadFixture(deployFixture);

    await expect(contract.connect(user).mint(user.address)).to.be.revertedWithCustomError(
      contract,
      "OwnableUnauthorizedAccount"
    );

    await expect(
      contract.connect(user).setImageUri(0, "ipfs://malicious-replacement")
    ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
  });
});
