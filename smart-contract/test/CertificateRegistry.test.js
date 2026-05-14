const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateRegistry", function () {
  async function deployFixture() {
    const [owner, student, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CertificateRegistry");
    const contract = await Factory.deploy(owner.address);
    await contract.waitForDeployment();
    return { contract, owner, student, other };
  }

  it("issues and verifies a certificate", async function () {
    const { contract, student } = await deployFixture();

    const certHash = ethers.keccak256(ethers.toUtf8Bytes("CERT-2026-001"));
    const certURI = "ipfs://cert/1";

    await expect(contract.issueCertificate(student.address, certHash, certURI))
      .to.emit(contract, "CertificateIssued");

    const result = await contract.verifyByHash(certHash);
    expect(result.exists).to.equal(true);
    expect(result.valid).to.equal(true);
    expect(result.student).to.equal(student.address);
  });

  it("prevents duplicate certificate hash", async function () {
    const { contract, student } = await deployFixture();

    const certHash = ethers.keccak256(ethers.toUtf8Bytes("CERT-2026-001"));
    await contract.issueCertificate(student.address, certHash, "ipfs://cert/1");

    await expect(
      contract.issueCertificate(student.address, certHash, "ipfs://cert/2"),
    ).to.be.reverted;
  });

  it("marks certificate invalid after revocation", async function () {
    const { contract, student } = await deployFixture();

    const certHash = ethers.keccak256(ethers.toUtf8Bytes("CERT-2026-002"));
    await contract.issueCertificate(student.address, certHash, "ipfs://cert/2");

    await expect(contract.revokeCertificate(1, "Fraud report"))
      .to.emit(contract, "CertificateRevoked");

    const result = await contract.verifyByHash(certHash);
    expect(result.exists).to.equal(true);
    expect(result.valid).to.equal(false);
  });

  it("blocks non-owner from issuing", async function () {
    const { contract, student, other } = await deployFixture();

    const certHash = ethers.keccak256(ethers.toUtf8Bytes("CERT-2026-003"));
    await expect(
      contract.connect(other).issueCertificate(student.address, certHash, "ipfs://cert/3"),
    ).to.be.reverted;
  });

  it("blocks transfer (soulbound)", async function () {
    const { contract, student, other } = await deployFixture();

    const certHash = ethers.keccak256(ethers.toUtf8Bytes("CERT-2026-004"));
    await contract.issueCertificate(student.address, certHash, "ipfs://cert/4");

    await expect(
      contract.connect(student).transferFrom(student.address, other.address, 1),
    ).to.be.reverted;
  });
});
