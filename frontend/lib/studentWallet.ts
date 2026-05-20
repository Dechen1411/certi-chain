import type { User } from "../context/AuthContext";
import { API_BASE_URL, parseApiError } from "./api";

export async function bindStudentWallet(
  walletAddress: string,
  privyAccessToken: string,
): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/student/wallet/bind`, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${privyAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ walletAddress }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const payload = await response.json() as { user: User };
  return payload.user;
}
