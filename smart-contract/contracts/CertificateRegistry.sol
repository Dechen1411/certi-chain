// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CertificateRegistry is ERC721, ERC721URIStorage, Ownable {
    struct CertificateData {
        bytes32 certificateHash;
        uint256 issuedAt;
        bool revoked;
    }

    uint256 private _nextTokenId = 1;

    mapping(uint256 => CertificateData) private _certificateByToken;
    mapping(bytes32 => uint256) private _tokenByCertificateHash;

    event CertificateIssued(uint256 indexed tokenId, address indexed student, bytes32 indexed certificateHash, string tokenURI);
    event CertificateRevoked(uint256 indexed tokenId, bytes32 indexed certificateHash, string reason);

    error CertificateAlreadyExists();
    error CertificateNotFound();
    error CertificateAlreadyRevoked();
    error SoulboundTransferNotAllowed();

    constructor(address initialOwner) ERC721("CertifyPro Certificate", "CERTPRO") Ownable(initialOwner) {}

    function issueCertificate(
        address student,
        bytes32 certificateHash,
        string memory certificateURI
    ) external onlyOwner returns (uint256 tokenId) {
        if (student == address(0)) {
            revert("Invalid student address");
        }
        if (bytes(certificateURI).length == 0) {
            revert("Certificate URI required");
        }
        if (_tokenByCertificateHash[certificateHash] != 0) {
            revert CertificateAlreadyExists();
        }

        tokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(student, tokenId);
        _setTokenURI(tokenId, certificateURI);

        _certificateByToken[tokenId] = CertificateData({
            certificateHash: certificateHash,
            issuedAt: block.timestamp,
            revoked: false
        });
        _tokenByCertificateHash[certificateHash] = tokenId;

        emit CertificateIssued(tokenId, student, certificateHash, certificateURI);
    }

    function revokeCertificate(uint256 tokenId, string calldata reason) external onlyOwner {
        if (_ownerOf(tokenId) == address(0)) {
            revert CertificateNotFound();
        }

        CertificateData storage data = _certificateByToken[tokenId];
        if (data.revoked) {
            revert CertificateAlreadyRevoked();
        }

        data.revoked = true;
        emit CertificateRevoked(tokenId, data.certificateHash, reason);
    }

    function verifyByHash(bytes32 certificateHash)
        external
        view
        returns (bool exists, bool valid, uint256 tokenId, address student, uint256 issuedAt)
    {
        tokenId = _tokenByCertificateHash[certificateHash];
        if (tokenId == 0) {
            return (false, false, 0, address(0), 0);
        }

        CertificateData memory data = _certificateByToken[tokenId];
        return (true, !data.revoked, tokenId, ownerOf(tokenId), data.issuedAt);
    }

    function getCertificate(uint256 tokenId)
        external
        view
        returns (bytes32 certificateHash, uint256 issuedAt, bool revoked, address student, string memory certificateURI)
    {
        if (_ownerOf(tokenId) == address(0)) {
            revert CertificateNotFound();
        }

        CertificateData memory data = _certificateByToken[tokenId];
        return (data.certificateHash, data.issuedAt, data.revoked, ownerOf(tokenId), tokenURI(tokenId));
    }

    // Soulbound behavior: disable transfers after minting.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert SoulboundTransferNotAllowed();
        }
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
