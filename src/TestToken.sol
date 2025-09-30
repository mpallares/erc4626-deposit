// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Simple ERC20 token for testing purposes
 * Uses OpenZeppelin's audited implementation
 */
contract TestToken is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    // Mint function for testing - allows anyone to mint (only for tests!)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // Burn function for testing
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}