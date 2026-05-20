const { PrivyClient } = require("@privy-io/node");
const { isAddress } = require("ethers");

const getLinkedEthereumWalletAddresses = (privyUser) => {
  const linkedAccounts = privyUser?.linked_accounts || privyUser?.linkedAccounts || [];

  return linkedAccounts
    .filter((account) => {
      const address = account?.address;
      if (typeof address !== "string" || !isAddress(address)) {
        return false;
      }

      const chainType = account.chain_type || account.chainType;
      if (account?.type === "wallet") {
        return chainType === "ethereum";
      }

      return account?.type === "smart_wallet";
    })
    .map((account) => account.address);
};

const createPrivyAccessTokenVerifier = ({
  appId,
  appSecret,
  apiUrl,
  jwtVerificationKey,
}) => {
  const trimmedAppId = String(appId || "").trim();
  const trimmedAppSecret = String(appSecret || "").trim();

  if (!trimmedAppId || !trimmedAppSecret) {
    return null;
  }

  const client = new PrivyClient({
    appId: trimmedAppId,
    appSecret: trimmedAppSecret,
    ...(apiUrl ? { apiUrl } : {}),
    ...(jwtVerificationKey ? { jwtVerificationKey } : {}),
  });

  return async (accessToken) => {
    const claims = await client.utils().auth().verifyAccessToken(accessToken);
    const privyUser = await client.users()._get(claims.user_id);

    return {
      privyUserId: claims.user_id,
      walletAddresses: getLinkedEthereumWalletAddresses(privyUser),
    };
  };
};

module.exports = {
  createPrivyAccessTokenVerifier,
  getLinkedEthereumWalletAddresses,
};
