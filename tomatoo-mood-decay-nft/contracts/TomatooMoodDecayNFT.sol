// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract TomatooMoodDecayNFT is ERC1155, ERC1155Holder, Ownable {
    using Strings for uint256;

    event MetadataUpdate(uint256 tokenId);

    enum Mood {
        CUTE,
        BLANK,
        CRYING,
        DAMAGED,
        ZOMBIE
    }

    uint256 public constant MAX_PER_WALLET = 1;
    address public immutable REQUIRED_LOCK_TOKEN;
    uint256 public constant REQUIRED_LOCK_TOKEN_ID = 1;
    uint256 public constant REQUIRED_LOCK_AMOUNT = 5;

    uint256 private constant SECONDS_PER_DAY = 1 days;

    uint256 public nextTokenId = 1;

    mapping(uint256 tokenId => uint256 lastReceivedAt) private _lastReceivedAt;
    mapping(uint256 tokenId => bool exists) private _exists;
    mapping(address account => uint256 tokenId) private _ownedTokenId;
    mapping(Mood mood => string imageUri) private _imageUris;

    constructor(address initialOwner, address requiredLockToken) ERC1155("") Ownable(initialOwner) {
        require(requiredLockToken != address(0), "Tomatoo: lock token is zero");
        REQUIRED_LOCK_TOKEN = requiredLockToken;
    }

    function name() external pure returns (string memory) {
        return "Tomatoo Mood Decay NFT";
    }

    function symbol() external pure returns (string memory) {
        return "TOMATOO";
    }

    function mint(address to) external onlyOwner returns (uint256) {
        return _mintNext(to);
    }

    function lockToMint() external returns (uint256) {
        IERC1155(REQUIRED_LOCK_TOKEN).safeTransferFrom(
            msg.sender,
            address(this),
            REQUIRED_LOCK_TOKEN_ID,
            REQUIRED_LOCK_AMOUNT,
            ""
        );

        return _mintNext(msg.sender);
    }

    function tokenOfOwner(address account) external view returns (uint256) {
        return _ownedTokenId[account];
    }

    function lockedBalance() external view returns (uint256) {
        return IERC1155(REQUIRED_LOCK_TOKEN).balanceOf(address(this), REQUIRED_LOCK_TOKEN_ID);
    }

    function setImageUri(Mood mood, string calldata imageUri) external onlyOwner {
        _imageUris[mood] = imageUri;
        emit BatchMetadataUpdate(1, nextTokenId - 1);
    }

    function setImageUris(string[5] calldata imageUris) external onlyOwner {
        _imageUris[Mood.CUTE] = imageUris[0];
        _imageUris[Mood.BLANK] = imageUris[1];
        _imageUris[Mood.CRYING] = imageUris[2];
        _imageUris[Mood.DAMAGED] = imageUris[3];
        _imageUris[Mood.ZOMBIE] = imageUris[4];
        emit BatchMetadataUpdate(1, nextTokenId - 1);
    }

    function refreshMetadata(uint256 id) external {
        _requireExistingToken(id);
        emit MetadataUpdate(id);
    }

    function getMood(uint256 id) public view returns (Mood) {
        _requireExistingToken(id);

        uint256 elapsed = block.timestamp - _lastReceivedAt[id];

        if (elapsed < 7 days) {
            return Mood.CUTE;
        }
        if (elapsed < 14 days) {
            return Mood.BLANK;
        }
        if (elapsed < 21 days) {
            return Mood.CRYING;
        }
        if (elapsed < 30 days) {
            return Mood.DAMAGED;
        }

        return Mood.ZOMBIE;
    }

    function daysSinceTransfer(uint256 id) external view returns (uint256) {
        _requireExistingToken(id);
        return (block.timestamp - _lastReceivedAt[id]) / SECONDS_PER_DAY;
    }

    function lastTransferAtOf(uint256 id) external view returns (uint256) {
        _requireExistingToken(id);
        return _lastReceivedAt[id];
    }

    function uri(uint256 id) public view override returns (string memory) {
        Mood mood = getMood(id);
        uint256 daysHeld = (block.timestamp - _lastReceivedAt[id]) / SECONDS_PER_DAY;
        return _buildUri(id, mood, daysHeld);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, ERC1155Holder) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _mintNext(address to) internal returns (uint256 tokenId) {
        require(to != address(0), "Tomatoo: mint to zero");
        require(_ownedTokenId[to] == 0, "Tomatoo: wallet already owns one");

        tokenId = nextTokenId;
        nextTokenId++;
        _exists[tokenId] = true;
        _mint(to, tokenId, 1, "");
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        require(ids.length == 1, "Tomatoo: one token per transfer");
        require(values.length == 1 && values[0] == 1, "Tomatoo: amount must be one");

        uint256 id = ids[0];

        if (from != address(0)) {
            require(_exists[id], "Tomatoo: invalid token id");
            require(_ownedTokenId[from] == id, "Tomatoo: sender does not own token");
        }

        if (to != address(0)) {
            require(_ownedTokenId[to] == 0, "Tomatoo: wallet already owns one");
        }

        super._update(from, to, ids, values);

        if (from != address(0)) {
            _ownedTokenId[from] = 0;
        }

        if (to != address(0)) {
            _ownedTokenId[to] = id;
            _lastReceivedAt[id] = block.timestamp;
            emit MetadataUpdate(id);
        }
    }

    function _buildUri(uint256 id, Mood mood, uint256 daysHeld) internal view returns (string memory) {
        string memory moodName = _moodName(mood);
        string memory imageUri = _imageUris[mood];
        string memory json = Base64.encode(
            bytes(
                string.concat(
                    '{"name":"Tomatoo Mood Decay #',
                    id.toString(),
                    '","description":"An ERC-1155 tomato king NFT. Each wallet can hold one Tomatoo, and each token mood decays over time after being received.","image":"',
                    imageUri,
                    '","attributes":[',
                    '{"trait_type":"Mood","value":"',
                    moodName,
                    '"},',
                    '{"display_type":"number","trait_type":"Days Since Received","value":',
                    daysHeld.toString(),
                    '}]}'
                )
            )
        );

        return string.concat("data:application/json;base64,", json);
    }

    function _requireExistingToken(uint256 id) internal view {
        require(_exists[id], "Tomatoo: invalid token id");
    }

    function _moodName(Mood mood) internal pure returns (string memory) {
        if (mood == Mood.CUTE) {
            return "CUTE";
        }
        if (mood == Mood.BLANK) {
            return "BLANK";
        }
        if (mood == Mood.CRYING) {
            return "CRYING";
        }
        if (mood == Mood.DAMAGED) {
            return "DAMAGED";
        }

        return "ZOMBIE";
    }

    event BatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId);
}
