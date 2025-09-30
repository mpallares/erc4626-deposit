# ERC-4626 Deposit Function

A TypeScript implementation of an ERC-4626 vault deposit function with comprehensive testing using real smart contracts on Anvil.

## Overview

This project implements a `deposit` function that creates properly formatted transactions for depositing assets into ERC-4626 compliant vaults. The function includes:

- ✅ Balance validation
- ✅ Allowance checking
- ✅ Max deposit limit enforcement
- ✅ Gas estimation
- ✅ Transaction encoding
- ✅ Custom error handling
- ✅ 100% test coverage

## Project Structure

```
erc4626-deposit/
├── index.ts                     # Main deposit function implementation
├── index.test.ts               # Comprehensive test suite
├── src/
│   ├── TestToken.sol           # ERC-20 token for testing (OpenZeppelin-based)
│   └── TestVault.sol           # ERC-4626 vault for testing (OpenZeppelin-based)
├── lib/
│   ├── openzeppelin-contracts/ # OpenZeppelin contracts (git submodule)
│   └── forge-std/              # Foundry standard library (git submodule)
├── out/                        # Compiled contract artifacts (generated, git-ignored)
├── cache/                      # Build cache (generated, git-ignored)
├── package.json                # Bun project configuration
├── foundry.toml               # Foundry configuration
└── README.md                  # This file
```

## Prerequisites

Before running this project, ensure you have the following installed:

1. **Bun** (JavaScript runtime and package manager)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Foundry** (Ethereum development toolkit)
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

## Installation

1. Clone or navigate to the project directory:
   ```bash
   cd erc4626-deposit
   ```

2. Install JavaScript dependencies:
   ```bash
   bun install
   ```

3. Initialize git submodules (OpenZeppelin contracts):
   ```bash
   git submodule update --init --recursive
   ```

4. Compile the smart contracts:
   ```bash
   forge build
   ```

## Testing

This project includes comprehensive tests that use real smart contracts deployed to a local Anvil instance.

### Run All Tests

```bash
bun run test
```

Or directly:

```bash
bun test index.test.ts
```

### Run Tests with Coverage

```bash
bun test --coverage index.test.ts
```

Expected output:
```
-----------|---------|---------|-------------------
File       | % Funcs | % Lines | Uncovered Line #s
-----------|---------|---------|-------------------
All files  |  100.00 |  100.00 |
 index.ts  |  100.00 |  100.00 |
-----------|---------|---------|-------------------

 7 pass
 0 fail
 27 expect() calls
```


## Usage

### Using the Deposit Function

```typescript
import { createPublicClient, http, parseEther } from 'viem';
import { mainnet } from 'viem/chains';
import { deposit } from './index';

// Create a client for your target network
const client = createPublicClient({
  chain: mainnet,
  transport: http('https://eth-mainnet.alchemyapi.io/v2/YOUR-API-KEY'),
});

// Prepare deposit parameters
const params = {
  wallet: '0x742d35Cc6644C068532A2C0D8F3a2b8D3e8C0b0B', // User's wallet address
  vault: '0xA0b86a33E6C7C2B4F72C8c3f57c9e56a1a9a5e71',  // ERC-4626 vault address
  amount: parseEther('100'), // Amount to deposit (in wei)
};

try {
  // Generate the deposit transaction
  const transaction = await deposit(client, params);

} catch (error) {
  if (error instanceof NotEnoughBalanceError) {
    console.error('User has insufficient token balance');
  } else if (error instanceof MissingAllowanceError) {
    console.error('User needs to approve vault to spend tokens');
  } else if (error instanceof AmountExceedsMaxDepositError) {
    console.error('Deposit amount exceeds vault limit');
  }
}
```

### Function Parameters

The `deposit` function accepts:

- **`client`**: A Viem PublicClient configured for your target blockchain
- **`params`**: Object containing:
  - `wallet`: User's wallet address (must own the tokens)
  - `vault`: ERC-4626 vault contract address
  - `amount`: Amount to deposit in wei (use `parseEther()` for ETH amounts)

### Return Value

Returns a `Transaction` object with:

```typescript
{
  data: `0x${string}`;    // Encoded function call data
  from: `0x${string}`;    // User's wallet address
  to: `0x${string}`;      // Vault contract address
  value: bigint;          // Always 0n for ERC-20 deposits
  gas: bigint;            // Estimated gas for the transaction
}
```



### Test Architecture

The tests approach:

1. **Real Blockchain**: Spins up Anvil (local Ethereum node)
2. **Real Contracts**: Deploys OpenZeppelin-based TestToken (ERC-20) and TestVault (ERC-4626) contracts
3. **Real Interactions**: Tests make actual blockchain calls
4. **Real Gas**: Tests validate actual gas estimation
5. **Production-grade**: Uses audited OpenZeppelin contracts for realistic testing

### Test Cases

The test suite covers:

1. ✅ **Successful deposit** - Happy path with real contract execution
2. ✅ **Insufficient balance** - User doesn't have enough tokens
3. ✅ **Missing allowance** - Vault not approved to spend tokens
4. ✅ **Exceeds max deposit** - Amount exceeds vault's deposit limit
5. ✅ **Error class validation** - Custom error types work correctly
6. ✅ **Gas estimation** - Realistic gas estimates for real contracts

## Smart Contracts

### TestToken (ERC-20)

An OpenZeppelin-based ERC-20 token implementation used for testing:

- **Inherits from**: OpenZeppelin's audited `ERC20` implementation
- **Standard functions**: `balanceOf`, `allowance`, `approve`, `transfer`, `transferFrom`
- **Test helpers**: `mint()` and `burn()` functions for test setup
- **Security**: Uses production-grade, audited code from OpenZeppelin
- **Compliance**: 100% ERC-20 standard compliant

```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    // Minimal wrapper around OpenZeppelin's ERC20
    // with test helper functions
}
```

### TestVault (ERC-4626)

An OpenZeppelin-based ERC-4626 vault implementation for testing:

- **Inherits from**: OpenZeppelin's audited `ERC4626` implementation
- **Standard functions**: `asset()`, `maxDeposit()`, `deposit()`, `withdraw()`, etc.
- **Test helpers**: `setMaxDeposit()` to configure deposit limits for testing
- **Security**: Uses production-grade, audited code from OpenZeppelin
- **Compliance**: 100% ERC-4626 standard compliant
- **Features**: Proper share calculations, event emissions, and vault accounting

```solidity
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract TestVault is ERC4626 {
    // Minimal wrapper around OpenZeppelin's ERC4626
    // with configurable max deposit for testing
}
```

### Why OpenZeppelin?

- ✅ **Audited**: Security-reviewed by multiple firms
- ✅ **Battle-tested**: Used by billions of dollars in production
- ✅ **Standard-compliant**: Guaranteed ERC-20 and ERC-4626 compliance
- ✅ **Maintained**: Regular updates and security patches
- ✅ **Trusted**: Industry standard for Solidity development


## Implementation Details

### ERC-4626 Compliance

The deposit function follows the ERC-4626 standard by:

1. **Reading vault's asset**: Calls `vault.asset()` to get underlying token
2. **Checking balances**: Validates user has sufficient tokens
3. **Checking allowances**: Ensures vault can transfer tokens
4. **Respecting limits**: Honors vault's `maxDeposit` restrictions
5. **Proper encoding**: Creates valid `deposit(uint256,address)` call data


### Transaction Value

For ERC-4626 deposits, the transaction value is always `0n` because:
- We're transferring ERC-20 tokens, not ETH
- The actual token transfer happens via `transferFrom()` inside the vault
- The vault uses the pre-approved allowance to move tokens

## Development

### Code Style

- Uses Bun as runtime and package manager
- TypeScript for type safety
- Viem for Ethereum interactions
- No unnecessary comments (follows project guidelines)


## Troubleshooting

### Anvil Connection Issues

If tests fail with connection errors:

1. Check Foundry installation: `anvil --version`
2. Ensure port 8545 is available

### Contract Compilation Issues

If `forge build` fails:

1. Verify Foundry installation: `forge --version`
2. Check Solidity syntax in `src/*.sol`
3. Update Foundry: `foundryup`
