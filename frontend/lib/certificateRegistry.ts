import {
  Contract,
  JsonRpcProvider,
  isAddress,
  keccak256,
  toUtf8Bytes,
} from "ethers";
import { API_BASE_URL, parseApiError } from "./api";

const registryAbi = [
  "function verifyByHash(bytes32 certificateHash) external view returns (bool exists, bool valid, uint256 tokenId, address student, uint256 issuedAt)",
  "function getCertificate(uint256 tokenId) external view returns (bytes32 certificateHash, uint256 issuedAt, bool revoked, address student, string certificateURI)",
] as const;

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
  txHash?: string;
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

const getReadProvider = (): JsonRpcProvider => {
  return new JsonRpcProvider(getRpcUrl(), getChainId(), {
    staticNetwork: true,
  });
};

export const createCertificateHash = (certificateId: string): string => {
  return keccak256(toUtf8Bytes(certificateId.trim().toUpperCase()));
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

const sortCertificates = (certificates: StudentCertificateRecord[]): StudentCertificateRecord[] => {
  return certificates.sort((a, b) => {
    const byIssuedAt = b.issuedAt - a.issuedAt;
    if (byIssuedAt !== 0) {
      return byIssuedAt;
    }
    return Number(b.tokenId) - Number(a.tokenId);
  });
};

const normalizeCertificateRecord = (certificate: StudentCertificateRecord): StudentCertificateRecord => ({
  ...certificate,
  tokenId: certificate.tokenId || certificate.certificateId,
  studentEmail: certificate.studentEmail || "",
  studentId: certificate.studentId || "",
  completionDate: certificate.completionDate || "",
  grade: certificate.grade || "",
  department: certificate.department || "",
  description: certificate.description || "",
  nftHash: certificate.nftHash || "",
  tokenUri: certificate.tokenUri || "",
  revoked: Boolean(certificate.revoked),
  issuedAt: Number(certificate.issuedAt || 0),
});

const fetchCertificateList = async (path: string): Promise<StudentCertificateRecord[]> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const payload = await response.json() as { certificates?: StudentCertificateRecord[] };
  return sortCertificates((payload.certificates || []).map(normalizeCertificateRecord));
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

  return fetchCertificateList("/student/certificates");
};

export const getAllCertificates = async (): Promise<StudentCertificateRecord[]> => {
  return fetchCertificateList("/certificates");
};

export const getRegistryStats = async (): Promise<RegistryStats> => {
  const response = await fetch(`${API_BASE_URL}/certificates/stats`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const stats = await response.json() as RegistryStats;
  return {
    ...stats,
    recentCertificates: (stats.recentCertificates || []).map(normalizeCertificateRecord),
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
