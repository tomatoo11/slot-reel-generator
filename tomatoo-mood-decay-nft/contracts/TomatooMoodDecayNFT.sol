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

    uint256 public constant TOMATOO_ID = 1;
    uint256 public constant MAX_PER_WALLET = 1;
    address public immutable REQUIRED_LOCK_TOKEN;
    uint256 public constant REQUIRED_LOCK_TOKEN_ID = 1;
    uint256 public constant REQUIRED_LOCK_AMOUNT = 5;

    uint256 private constant SECONDS_PER_DAY = 1 days;

    mapping(address account => uint256 lastReceivedAt) private _lastReceivedAt;
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

    function mint(address to) external onlyOwner {
        require(balanceOf(to, TOMATOO_ID) == 0, "Tomatoo: wallet already owns one");
        _mint(to, TOMATOO_ID, 1, "");
    }

    function lockToMint() external {
        require(balanceOf(msg.sender, TOMATOO_ID) == 0, "Tomatoo: wallet already owns one");

        IERC1155(REQUIRED_LOCK_TOKEN).safeTransferFrom(
            msg.sender,
            address(this),
            REQUIRED_LOCK_TOKEN_ID,
            REQUIRED_LOCK_AMOUNT,
            ""
        );

        _mint(msg.sender, TOMATOO_ID, 1, "");
    }

    function lockedBalance() external view returns (uint256) {
        return IERC1155(REQUIRED_LOCK_TOKEN).balanceOf(address(this), REQUIRED_LOCK_TOKEN_ID);
    }

    function setImageUri(Mood mood, string calldata imageUri) external onlyOwner {
        _imageUris[mood] = imageUri;
        emit MetadataUpdate(TOMATOO_ID);
    }

    function setImageUris(string[5] calldata imageUris) external onlyOwner {
        _imageUris[Mood.CUTE] = imageUris[0];
        _imageUris[Mood.BLANK] = imageUris[1];
        _imageUris[Mood.CRYING] = imageUris[2];
        _imageUris[Mood.DAMAGED] = imageUris[3];
        _imageUris[Mood.ZOMBIE] = imageUris[4];
        emit MetadataUpdate(TOMATOO_ID);
    }

    function getMood(address account, uint256 id) public view returns (Mood) {
        _requireValidOwner(account, id);

        uint256 elapsed = block.timestamp - _lastReceivedAt[account];

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

    function daysSinceTransfer(address account, uint256 id) external view returns (uint256) {
        _requireValidOwner(account, id);
        return (block.timestamp - _lastReceivedAt[account]) / SECONDS_PER_DAY;
    }

    function lastTransferAtOf(address account, uint256 id) external view returns (uint256) {
        _requireValidOwner(account, id);
        return _lastReceivedAt[account];
    }

    function uri(uint256 id) public view override returns (string memory) {
        require(id == TOMATOO_ID, "Tomatoo: invalid token id");
        return _buildUri(TOMATOO_ID, Mood.CUTE, 0);
    }

    function uriFor(address account, uint256 id) external view returns (string memory) {
        Mood mood = getMood(account, id);
        uint256 daysHeld = (block.timestamp - _lastReceivedAt[account]) / SECONDS_PER_DAY;
        return _buildUri(id, mood, daysHeld);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, ERC1155Holder) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        for (uint256 i = 0; i < ids.length; i++) {
            require(ids[i] == TOMATOO_ID, "Tomatoo: invalid token id");
            require(values[i] == 1, "Tomatoo: amount must be one");
        }

        if (to != address(0)) {
            require(balanceOf(to, TOMATOO_ID) == 0, "Tomatoo: wallet already owns one");
        }

        super._update(from, to, ids, values);

        if (to != address(0)) {
            _lastReceivedAt[to] = block.timestamp;
            emit MetadataUpdate(TOMATOO_ID);
        }
    }

    function _buildUri(uint256 id, Mood mood, uint256 daysHeld) internal view returns (string memory) {
        string memory moodName = _moodName(mood);
        string memory imageUri = _imageUris[mood];
        string memory json = Base64.encode(
            bytes(
                string.concat(
                    '{"name":"Tomatoo Mood Decay Edition #',
                    id.toString(),
                    '","description":"An ERC-1155 tomato king edition. Each wallet can hold one edition, and its mood decays over time after receiving it.","image":"',
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

    function _requireValidOwner(address account, uint256 id) internal view {
        require(id == TOMATOO_ID, "Tomatoo: invalid token id");
        require(balanceOf(account, id) == 1, "Tomatoo: account does not own edition");
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
}
