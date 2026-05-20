import {
  Contract,
  JsonRpcProvider,
  isAddress,
  keccak256,
  toUtf8Bytes,
} from "ethers";

const registryAbi = [
  "function issueCertificate(address student, bytes32 certificateHash, string certificateURI) external returns (uint256)",
  "function verifyByHash(bytes32 certificateHash) external view returns (bool exists, bool valid, uint256 tokenId, address student, uint256 issuedAt)",
  "function getCertificate(uint256 tokenId) external view returns (bytes32 certificateHash, uint256 issuedAt, bool revoked, address student, string certificateURI)",
  "event CertificateIssued(uint256 indexed tokenId, address indexed student, bytes32 indexed certificateHash, string tokenURI)",
  "event CertificateRevoked(uint256 indexed tokenId, bytes32 indexed certificateHash, string reason)",
] as const;

const DEFAULT_EVENT_LOOKBACK_BLOCKS = 10;
const DEFAULT_EVENT_QUERY_CHUNK_BLOCKS = 10;

export interface StudentCertificateRecord {
  tokenId: string;
  certificateId: string;
  certificateType: string;
  issueDate: string;
  issuedAt: number;
  studentName: string;
  studentEmail?: string;
  studentId?: string;
  studentWalletAddress: string;
  completionDate?: string;
  grade?: string;
  department?: string;
  description?: string;
  nftHash: string;
  revoked: boolean;
  tokenUri: string;
}

export interface RegistryStats {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  issuedThisMonth: number;
  recentCertificates: StudentCertificateRecord[];
}

const getContractAddress = (): string => {
  const address = import.meta.env.VITE_CERTIFICATE_REGISTRY_ADDRESS;
  if (!address) {
    throw new Error("Missing VITE_CERTIFICATE_REGISTRY_ADDRESS in frontend environment");
  }
  return address;
};

const getRpcUrl = (): string => {
  const rpcUrl = import.meta.env.VITE_CHAIN_RPC_URL;
  if (!rpcUrl) {
    throw new Error("Missing VITE_CHAIN_RPC_URL in frontend environment");
  }
  return rpcUrl;
};

const getChainId = (): number => {
  const configuredChainId = Number(import.meta.env.VITE_CHAIN_ID || 31337);
  if (!Number.isInteger(configuredChainId) || configuredChainId <= 0) {
    throw new Error("Invalid VITE_CHAIN_ID in frontend environment");
  }
  return configuredChainId;
};

const getOptionalPositiveIntegerEnv = (value: string | undefined): number | null => {
  if (!value?.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const getEventQueryStartBlock = (latestBlock: number): number => {
  const deploymentBlock = getOptionalPositiveIntegerEnv(
    import.meta.env.VITE_CERTIFICATE_REGISTRY_DEPLOYMENT_BLOCK,
  );

  if (deploymentBlock !== null) {
    return Math.min(deploymentBlock, latestBlock);
  }

  const lookbackBlocks = getOptionalPositiveIntegerEnv(
    import.meta.env.VITE_EVENT_LOOKBACK_BLOCKS,
  ) ?? DEFAULT_EVENT_LOOKBACK_BLOCKS;

  return Math.max(0, latestBlock - lookbackBlocks);
};

const getEventQueryChunkSize = (): number => {
  const configuredChunkSize = getOptionalPositiveIntegerEnv(
    import.meta.env.VITE_EVENT_QUERY_CHUNK_BLOCKS,
  ) ?? DEFAULT_EVENT_QUERY_CHUNK_BLOCKS;

  return Math.max(1, configuredChunkSize);
};

const getReadProvider = (): JsonRpcProvider => {
  return new JsonRpcProvider(getRpcUrl(), getChainId(), {
    staticNetwork: true,
  });
};

export const createCertificateHash = (certificateId: string): string => {
  return keccak256(toUtf8Bytes(certificateId.trim().toUpperCase()));
};

const encodeBase64 = (value: string): string => {
  const encoded = new TextEncoder().encode(value);
  let binary = "";
  encoded.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

export const buildCertificateMetadataUri = (metadata: Record<string, string>): string => {
  const json = JSON.stringify(metadata);
  return `data:application/json;base64,${encodeBase64(json)}`;
};

export const parseMetadataUri = (metadataUri: string): Record<string, string> | null => {
  if (!metadataUri.startsWith("data:application/json;base64,")) {
    return null;
  }

  try {
    const encoded = metadataUri.replace("data:application/json;base64,", "");
    const decoded = atob(encoded);
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Record<string, string>;
    return parsed;
  } catch {
    return null;
  }
};

export const getRegistryReadContract = () => {
  const provider = getReadProvider();
  return new Contract(getContractAddress(), registryAbi, provider);
};

const toCertificateRecord = async (
  contract: Contract,
  tokenId: bigint,
): Promise<StudentCertificateRecord | null> => {
  const certificateData = await contract.getCertificate(tokenId);
  const certificateHash = String(certificateData[0]);
  const issuedAt = Number(certificateData[1]);
  const revoked = Boolean(certificateData[2]);
  const studentWalletAddress = String(certificateData[3]);
  const metadataUri = String(certificateData[4]);
  const metadata = parseMetadataUri(metadataUri);

  return {
    tokenId: tokenId.toString(),
    certificateId: metadata?.certificateId || `TOKEN-${tokenId.toString()}`,
    certificateType: metadata?.certificateType || "Certificate",
    issueDate: metadata?.issueDate || new Date(issuedAt * 1000).toISOString().split("T")[0],
    issuedAt,
    studentName: metadata?.studentName || "Unknown",
    studentEmail: metadata?.studentEmail || "",
    studentId: metadata?.studentId || "",
    studentWalletAddress,
    completionDate: metadata?.completionDate || "",
    grade: metadata?.grade || "",
    department: metadata?.department || "",
    description: metadata?.notes || "",
    nftHash: certificateHash,
    revoked,
    tokenUri: metadataUri,
  } satisfies StudentCertificateRecord;
};

const sortCertificates = (certificates: StudentCertificateRecord[]): StudentCertificateRecord[] => {
  return certificates.sort((a, b) => {
    const byIssuedAt = b.issuedAt - a.issuedAt;
    if (byIssuedAt !== 0) {
      return byIssuedAt;
    }
    return Number(b.tokenId) - Number(a.tokenId);
  });
};

type CertificateIssuedLog = {
  args?: readonly unknown[];
};

const getCertificatesFromFilter = async (
  filter: ReturnType<Contract["filters"]["CertificateIssued"]>,
): Promise<StudentCertificateRecord[]> => {
  const contract = getRegistryReadContract();
  const provider = getReadProvider();
  const latestBlock = await provider.getBlockNumber();
  const startBlock = getEventQueryStartBlock(latestBlock);
  const queryChunkSize = getEventQueryChunkSize();
  const logs: CertificateIssuedLog[] = [];

  for (let fromBlock = startBlock; fromBlock <= latestBlock; fromBlock += queryChunkSize) {
    const toBlock = Math.min(fromBlock + queryChunkSize - 1, latestBlock);
    const chunk = await contract.queryFilter(filter, fromBlock, toBlock);
    logs.push(...(chunk as CertificateIssuedLog[]));
  }

  const certificates: Array<StudentCertificateRecord | null> = await Promise.all(
    logs.map(async (log) => {
      const args = log.args;
      if (!Array.isArray(args) || args.length === 0) {
        return null;
      }

      const tokenId = args[0] as bigint;
      return toCertificateRecord(contract, tokenId);
    }),
  );

  const validCertificates: StudentCertificateRecord[] = certificates.filter(
    (item): item is StudentCertificateRecord => item !== null,
  );

  return sortCertificates(validCertificates);
};

export const getStudentCertificates = async (
  studentWalletAddress: string,
): Promise<StudentCertificateRecord[]> => {
  const normalizedAddress = studentWalletAddress.trim();
  if (!normalizedAddress) {
    return [];
  }
  if (!isAddress(normalizedAddress)) {
    throw new Error("Invalid student wallet address");
  }

  const contract = getRegistryReadContract();
  const filter = contract.filters.CertificateIssued(null, normalizedAddress, null);
  return getCertificatesFromFilter(filter);
};

export const getAllCertificates = async (): Promise<StudentCertificateRecord[]> => {
  const contract = getRegistryReadContract();
  const filter = contract.filters.CertificateIssued();
  return getCertificatesFromFilter(filter);
};

export const getRegistryStats = async (): Promise<RegistryStats> => {
  const certificates = await getAllCertificates();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const revokedCertificates = certificates.filter((certificate) => certificate.revoked).length;
  const issuedThisMonth = certificates.filter((certificate) => {
    return certificate.issueDate.slice(0, 7) === currentMonth;
  }).length;

  return {
    totalCertificates: certificates.length,
    activeCertificates: certificates.length - revokedCertificates,
    revokedCertificates,
    issuedThisMonth,
    recentCertificates: certificates.slice(0, 5),
  };
};

export const getReadableError = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    if (error.message.includes("user rejected")) {
      return "Transaction was rejected.";
    }
    return error.message;
  }
  return "Something went wrong while communicating with the blockchain.";
};
