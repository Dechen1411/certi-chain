# Smart Contract Module

This module implements on-chain certificate issuance and verification.

## Stack

- Solidity + Hardhat
- OpenZeppelin ERC721 implementation

## Features

- Admin (owner) can issue certificates as soulbound NFTs
- Each certificate stores immutable hash metadata
- Public verification by certificate hash
- Owner can revoke certificates

## Setup

1. Install dependencies:
   npm install
2. Create env file:
   copy .env.example .env
3. Compile:
   npm run compile
4. Test:
   npm run test

## Deploy (local)

1. Terminal A:
   npm run node
2. Terminal B:
   npm run deploy:local

## Deploy (sepolia)

1. Configure `.env` with `RPC_URL` and `PRIVATE_KEY`, or set `CHAIN_RPC_URL`
   and `ISSUER_PRIVATE_KEY` in `../backend/.env`.
2. Make sure the deployer wallet has Sepolia ETH for gas.
3. Run:
   npm run deploy:sepolia

Hardhat enforces Sepolia chain ID `11155111` for this network, so a local RPC URL
cannot be accidentally used for a Sepolia deployment.

## Main Contract

- contracts/CertificateRegistry.sol
