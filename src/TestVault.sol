// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * Simple ERC4626 vault for testing purposes
 * Uses OpenZeppelin's audited ERC4626 implementation
 */
contract TestVault is ERC4626 {
    uint256 private _maxDepositAmount;

    constructor(IERC20 asset_) ERC20("Test Vault", "TVAULT") ERC4626(asset_) {
        _maxDepositAmount = type(uint256).max;
    }

    // Override maxDeposit to allow testing deposit limits
    function maxDeposit(address) public view override returns (uint256) {
        return _maxDepositAmount;
    }

    // Helper function for testing - allows setting max deposit limit
    function setMaxDeposit(uint256 maxAmount) external {
        _maxDepositAmount = maxAmount;
    }
}