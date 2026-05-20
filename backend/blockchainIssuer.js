const {
  Contract,
  JsonRpcProvider,
  Wallet,
  isAddress,
  keccak256,
  toUtf8Bytes,
} = require("ethers");

const registryAbi = [
  "function issueCertificate(address student, bytes32 certificateHash, string certificateURI) external returns (uint256)",
  "event CertificateIssued(uint256 indexed tokenId, address indexed student, bytes32 indexed certificateHash, string tokenURI)",
];

const createCertificateHash = (certificateId) => {
  return keccak256(toUtf8Bytes(certificateId.trim().toUpperCase()));
};

const buildCertificateMetadataUri = (metadata) => {
  const json = JSON.stringify(metadata);
  return `data:application/json;base64,${Buffer.from(json, "utf8").toString("base64")}`;
};

const issueCertificateOnChain = async (certificate, config) => {
  const rpcUrl = config.chainRpcUrl;
  const contractAddress = config.certificateRegistryAddress;
  const issuerPrivateKey = config.issuerPrivateKey;

  if (!rpcUrl || !contractAddress || !issuerPrivateKey) {
    throw new Error("Missing blockchain issuer environment variables");
  }

  if (!isAddress(certificate.studentWalletAddress)) {
    throw new Error("Invalid student wallet address");
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(issuerPrivateKey, provider);
  const contract = new Contract(contractAddress, registryAbi, signer);

  const certificateHash = createCertificateHash(certificate.certificateId);
  const certificateURI = buildCertificateMetadataUri(certificate);

  const tx = await contract.issueCertificate(
    certificate.studentWalletAddress,
    certificateHash,
    certificateURI,
  );

  const receipt = await tx.wait();
  let tokenId = "";

  for (const log of receipt.logs || []) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "CertificateIssued") {
        tokenId = parsed.args.tokenId.toString();
        break;
      }
    } catch {
      // Ignore logs from other contracts in the same transaction receipt.
    }
  }

  return {
    txHash: tx.hash,
    tokenId,
    certificateHash,
    tokenUri: certificateURI,
  };
};

module.exports = {
  issueCertificateOnChain,
};
