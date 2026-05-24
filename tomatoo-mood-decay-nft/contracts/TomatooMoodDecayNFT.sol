// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TomatooMoodDecayNFT is ERC721, Ownable {
    using Strings for uint256;

    event MetadataUpdate(uint256 tokenId);

    enum Mood {
        CUTE,
        BLANK,
        CRYING,
        DAMAGED,
        ZOMBIE
    }

    uint256 private constant SECONDS_PER_DAY = 1 days;

    uint256 private _nextTokenId = 1;

    mapping(uint256 tokenId => uint256 lastTransferAt) private _lastTransferAt;
    mapping(Mood mood => string imageUri) private _imageUris;

    constructor(address initialOwner) ERC721("Tomatoo Mood Decay NFT", "TOMATOO") Ownable(initialOwner) {}

    function mint(address to) external onlyOwner returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }

    function setImageUri(Mood mood, string calldata imageUri) external onlyOwner {
        _imageUris[mood] = imageUri;
    }

    function setImageUris(string[5] calldata imageUris) external onlyOwner {
        _imageUris[Mood.CUTE] = imageUris[0];
        _imageUris[Mood.BLANK] = imageUris[1];
        _imageUris[Mood.CRYING] = imageUris[2];
        _imageUris[Mood.DAMAGED] = imageUris[3];
        _imageUris[Mood.ZOMBIE] = imageUris[4];
    }

    function getMood(uint256 tokenId) public view returns (Mood) {
        _requireOwned(tokenId);

        uint256 elapsed = block.timestamp - _lastTransferAt[tokenId];

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

    function daysSinceTransfer(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return (block.timestamp - _lastTransferAt[tokenId]) / SECONDS_PER_DAY;
    }

    function lastTransferAtOf(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return _lastTransferAt[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        Mood mood = getMood(tokenId);
        string memory moodName = _moodName(mood);
        string memory imageUri = _imageUris[mood];
        string memory json = Base64.encode(
            bytes(
                string.concat(
                    '{"name":"Tomatoo Mood Decay #',
                    tokenId.toString(),
                    '","description":"A tomato king that decays over time and is restored by transfer.","image":"',
                    imageUri,
                    '","attributes":[',
                    '{"trait_type":"Mood","value":"',
                    moodName,
                    '"},',
                    '{"display_type":"number","trait_type":"Last Transfer At","value":',
                    _lastTransferAt[tokenId].toString(),
                    '},',
                    '{"display_type":"number","trait_type":"Days Since Transfer","value":',
                    ((block.timestamp - _lastTransferAt[tokenId]) / SECONDS_PER_DAY).toString(),
                    '}]}'
                )
            )
        );

        return string.concat("data:application/json;base64,", json);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = super._update(to, tokenId, auth);

        if (to != address(0)) {
            _lastTransferAt[tokenId] = block.timestamp;
            emit MetadataUpdate(tokenId);
        }
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
