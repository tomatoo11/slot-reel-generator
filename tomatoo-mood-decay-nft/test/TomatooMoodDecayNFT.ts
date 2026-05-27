import { expect } from "chai";
import hre from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const { ethers } = hre;
const TOMATOO_ID = 1n;

describe("TomatooMoodDecayNFT", function () {
  async function deployFixture() {
    const [owner, user, other] = await ethers.getSigners();
    const burnFactory = await ethers.getContractFactory("MockBurnableERC1155");
    const burnToken = await burnFactory.deploy();
    await burnToken.waitForDeployment();

    const factory = await ethers.getContractFactory("TomatooMoodDecayNFT");
    const contract = await factory.deploy(owner.address, await burnToken.getAddress());

    await contract.waitForDeployment();

    await contract.setImageUris([
      "ipfs://stage1-cute",
      "ipfs://stage2-blank",
      "ipfs://stage3-crying",
      "ipfs://stage4-damaged",
      "ipfs://stage5-zombie"
    ]);

    return { burnToken, contract, owner, user, other };
  }

  it("mints one ERC-1155 edition from the owner", async function () {
    const { contract, owner, user } = await loadFixture(deployFixture);

    await expect(contract.connect(owner).mint(user.address))
      .to.emit(contract, "TransferSingle")
      .withArgs(owner.address, ethers.ZeroAddress, user.address, TOMATOO_ID, 1n);

    expect(await contract.balanceOf(user.address, TOMATOO_ID)).to.equal(1n);
    expect(await contract.getMood(user.address, TOMATOO_ID)).to.equal(0n);
  });

  it("prevents a wallet from holding more than one edition", async function () {
    const { contract, owner, user } = await loadFixture(deployFixture);

    await contract.connect(owner).mint(user.address);

    await expect(contract.connect(owner).mint(user.address)).to.be.revertedWith(
      "Tomatoo: wallet already owns one"
    );
  });

  it("locks five required ERC-1155 tokens to mint one edition", async function () {
    const { burnToken, contract, user } = await loadFixture(deployFixture);

    await burnToken.mint(user.address, TOMATOO_ID, 5n);
    await burnToken.connect(user).setApprovalForAll(await contract.getAddress(), true);

    await expect(contract.connect(user).lockToMint())
      .to.emit(contract, "TransferSingle")
      .withArgs(user.address, ethers.ZeroAddress, user.address, TOMATOO_ID, 1n);

    expect(await burnToken.balanceOf(user.address, TOMATOO_ID)).to.equal(0n);
    expect(await burnToken.balanceOf(await contract.getAddress(), TOMATOO_ID)).to.equal(5n);
    expect(await contract.lockedBalance()).to.equal(5n);
    expect(await contract.balanceOf(user.address, TOMATOO_ID)).to.equal(1n);
    expect(await contract.getMood(user.address, TOMATOO_ID)).to.equal(0n);
  });

  it("requires lock token approval before lock minting", async function () {
    const { burnToken, contract, user } = await loadFixture(deployFixture);

    await burnToken.mint(user.address, TOMATOO_ID, 5n);

    await expect(contract.connect(user).lockToMint()).to.be.reverted;
  });

  it("advances wallet mood stages over time", async function () {
    const { contract, owner, user } = await loadFixture(deployFixture);

    await contract.connect(owner).mint(user.address);
    await time.increase(8 * 24 * 60 * 60);
    expect(await contract.getMood(user.address, TOMATOO_ID)).to.equal(1n);

    await time.increase(7 * 24 * 60 * 60);
    expect(await contract.getMood(user.address, TOMATOO_ID)).to.equal(2n);

    await time.increase(8 * 24 * 60 * 60);
    expect(await contract.getMood(user.address, TOMATOO_ID)).to.equal(3n);

    await time.increase(10 * 24 * 60 * 60);
    expect(await contract.getMood(user.address, TOMATOO_ID)).to.equal(4n);
  });

  it("resets the receiver mood timer after transfer", async function () {
    const { contract, owner, user, other } = await loadFixture(deployFixture);

    await contract.connect(owner).mint(user.address);
    await time.increase(22 * 24 * 60 * 60);
    expect(await contract.getMood(user.address, TOMATOO_ID)).to.equal(3n);

    await expect(
      contract.connect(user).safeTransferFrom(user.address, other.address, TOMATOO_ID, 1n, "0x")
    )
      .to.emit(contract, "MetadataUpdate")
      .withArgs(TOMATOO_ID);

    expect(await contract.balanceOf(user.address, TOMATOO_ID)).to.equal(0n);
    expect(await contract.balanceOf(other.address, TOMATOO_ID)).to.equal(1n);
    expect(await contract.getMood(other.address, TOMATOO_ID)).to.equal(0n);
  });

  it("prevents transfer to a wallet that already owns one", async function () {
    const { contract, owner, user, other } = await loadFixture(deployFixture);

    await contract.connect(owner).mint(user.address);
    await contract.connect(owner).mint(other.address);

    await expect(
      contract.connect(user).safeTransferFrom(user.address, other.address, TOMATOO_ID, 1n, "0x")
    ).to.be.revertedWith("Tomatoo: wallet already owns one");
  });

  it("updates holder-specific uriFor output based on the current stage", async function () {
    const { contract, owner, user } = await loadFixture(deployFixture);

    await contract.connect(owner).mint(user.address);
    const cuteUri = await contract.uriFor(user.address, TOMATOO_ID);
    expect(cuteUri).to.contain("data:application/json;base64,");

    await time.increase(31 * 24 * 60 * 60);
    const zombieUri = await contract.uriFor(user.address, TOMATOO_ID);

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
