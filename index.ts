import type { PublicClient } from 'viem';
import { encodeFunctionData, erc20Abi, erc4626Abi } from 'viem';

export type DepositParams = {
  wallet: `0x${string}`;
  vault: `0x${string}`;
  amount: bigint;
};

type Transaction = {
  data: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  gas: bigint;
};

export class NotEnoughBalanceError extends Error {
  constructor() {
    super('Not enough balance');
  }
}

export class MissingAllowanceError extends Error {
  constructor() {
    super('Not enough allowance');
  }
}

export class AmountExceedsMaxDepositError extends Error {
  constructor() {
    super('Amount exceeds max deposit');
  }
}

/**
 * Deposit an amount of an asset into a given vault.
 *
 * @throws {NotEnoughBalanceError} if the wallet does not have enough balance to deposit the amount
 * @throws {MissingAllowanceError} if the wallet does not have enough allowance to deposit the amount
 * @throws {AmountExceedsMaxDepositError} if the amount exceeds the max deposit
 */

export async function deposit(
  client: PublicClient,
  { wallet, vault, amount }: DepositParams
): Promise<Transaction> {
  // Get the underlying asset address from the vault
  const assetAddress = await client.readContract({
    address: vault,
    abi: erc4626Abi,
    functionName: 'asset',
  });

  // Check user's balance of the underlying asset
  const userBalance = await client.readContract({
    address: assetAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [wallet],
  });

  if (userBalance < amount) {
    throw new NotEnoughBalanceError();
  }

  // Check allowance for the vault to spend the asset
  const allowance = await client.readContract({
    address: assetAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [wallet, vault],
  });

  if (allowance < amount) {
    throw new MissingAllowanceError();
  }

  // Check the max deposit limit
  const maxDeposit = await client.readContract({
    address: vault,
    abi: erc4626Abi,
    functionName: 'maxDeposit',
    args: [wallet],
  });

  if (amount > maxDeposit) {
    throw new AmountExceedsMaxDepositError();
  }

  // Encode the deposit transaction data
  const data = encodeFunctionData({
    abi: erc4626Abi,
    functionName: 'deposit',
    args: [amount, wallet],
  });

  // Estimate gas for the transaction
  const gas = await client.estimateGas({
    account: wallet,
    to: vault,
    data,
    value: 0n,
  });

  return {
    data,
    from: wallet,
    to: vault,
    value: 0n,
    gas,
  };
}
