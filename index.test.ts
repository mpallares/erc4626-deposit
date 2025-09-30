import { test, expect, beforeAll, afterAll } from "bun:test";
import {
    createPublicClient,
    createWalletClient,
    http,
    parseEther,
    type Address
} from "viem";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
    deposit,
    NotEnoughBalanceError,
    MissingAllowanceError,
    AmountExceedsMaxDepositError
} from "./index";


// Anvil test accounts (pre-funded with ETH)
const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const TEST_ACCOUNT = privateKeyToAccount(TEST_PRIVATE_KEY);

// Contract addresses (set after deployment)
let mockTokenAddress: Address;
let mockVaultAddress: Address;

// Anvil process reference for cleanup
let anvilProcess: any;

// Clients for anvil interaction
const publicClient = createPublicClient({
    chain: foundry,
    transport: http("http://127.0.0.1:8545"),
});

const walletClient = createWalletClient({
    chain: foundry,
    transport: http("http://127.0.0.1:8545"),
    account: TEST_ACCOUNT,
});

// Contract ABIs will be loaded from compiled artifacts
let mockTokenAbi: any;
let mockVaultAbi: any;

beforeAll(async () => {
    console.log("Starting anvil...");

    // Start anvil process: "anvil" will use the system's PATH to find the executable
    anvilProcess = Bun.spawn(["anvil", "--host", "127.0.0.1", "--port", "8545"], {
        stdout: "pipe",
        stderr: "pipe",
    });

    // Wait for anvil to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify anvil is running
    try {
        await publicClient.getBlockNumber();
        console.log("Anvil is running successfully");
    } catch (error) {
        throw new Error("Failed to connect to anvil. Make sure it's running on port 8545");
    }

    // Read compiled bytecode and ABIs from forge artifacts (using OpenZeppelin-based contracts)
    const tokenArtifact = await Bun.file("./out/TestToken.sol/TestToken.json").json();
    const vaultArtifact = await Bun.file("./out/TestVault.sol/TestVault.json").json();

    // Extract ABIs from artifacts
    mockTokenAbi = tokenArtifact.abi;
    mockVaultAbi = vaultArtifact.abi;

    // Deploy TestToken (OpenZeppelin ERC20)
    const tokenHash = await walletClient.deployContract({
        abi: mockTokenAbi,
        bytecode: tokenArtifact.bytecode.object as `0x${string}`,
        args: ["Test Token", "TEST", parseEther("1000000")],
    });

    const tokenReceipt = await publicClient.waitForTransactionReceipt({
        hash: tokenHash,
    });

    mockTokenAddress = tokenReceipt.contractAddress!;
    console.log("TestToken (OpenZeppelin ERC20) deployed at:", mockTokenAddress);

    // Deploy TestVault (OpenZeppelin ERC4626)
    const vaultHash = await walletClient.deployContract({
        abi: mockVaultAbi,
        bytecode: vaultArtifact.bytecode.object as `0x${string}`,
        args: [mockTokenAddress],
    });

    const vaultReceipt = await publicClient.waitForTransactionReceipt({
        hash: vaultHash,
    });

    mockVaultAddress = vaultReceipt.contractAddress!;
    console.log("TestVault (OpenZeppelin ERC4626) deployed at:", mockVaultAddress);

    // Mint test tokens
    const mintHash = await walletClient.writeContract({
        address: mockTokenAddress,
        abi: mockTokenAbi,
        functionName: "mint",
        args: [TEST_ACCOUNT.address, parseEther("10000")],
    });

    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    console.log("Test tokens minted");
});

afterAll(async () => {
    if (anvilProcess) {
        anvilProcess.kill();
        console.log("Anvil process terminated");
    }
});

// TEST 1: Successful deposit with real anvil contracts
test("deposit function - successful deposit with anvil", async () => {
    const depositAmount = parseEther("100");

    // Approve vault to spend tokens
    const approveHash = await walletClient.writeContract({
        address: mockTokenAddress,
        abi: mockTokenAbi,
        functionName: "approve",
        args: [mockVaultAddress, depositAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // Call our deposit function
    const transaction = await deposit(publicClient, {
        wallet: TEST_ACCOUNT.address,
        vault: mockVaultAddress,
        amount: depositAmount,
    });

    // Verify transaction structure
    expect(transaction.from).toBe(TEST_ACCOUNT.address);
    expect(transaction.to).toBe(mockVaultAddress);
    expect(transaction.value).toBe(0n);
    expect(transaction.gas).toBeGreaterThan(21000n); // Real gas estimate
    expect(transaction.data).toMatch(/^0x[a-fA-F0-9]+$/);

    // Actually execute the transaction to prove it works
    const executeHash = await walletClient.sendTransaction(transaction);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: executeHash });
    expect(receipt.status).toBe("success");
});

// TEST 2: Not enough balance error with real contracts
test("deposit function - throws NotEnoughBalanceError with anvil", async () => {
    // Check actual balance first
    const actualBalance = await publicClient.readContract({
        address: mockTokenAddress,
        abi: mockTokenAbi,
        functionName: "balanceOf",
        args: [TEST_ACCOUNT.address],
    }) as bigint;

    // Try to deposit more than balance
    const depositAmount = actualBalance + parseEther("1");

    // Approve vault (so it's not an allowance issue)
    const approveHash = await walletClient.writeContract({
        address: mockTokenAddress,
        abi: mockTokenAbi,
        functionName: "approve",
        args: [mockVaultAddress, depositAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    await expect(deposit(publicClient, {
        wallet: TEST_ACCOUNT.address,
        vault: mockVaultAddress,
        amount: depositAmount,
    })).rejects.toThrow(NotEnoughBalanceError);
});

// TEST 3: Missing allowance error with real contracts
test("deposit function - throws MissingAllowanceError with anvil", async () => {
    const depositAmount = parseEther("100");

    // Reset allowance to 0
    const resetApproveHash = await walletClient.writeContract({
        address: mockTokenAddress,
        abi: mockTokenAbi,
        functionName: "approve",
        args: [mockVaultAddress, 0n],
    });
    await publicClient.waitForTransactionReceipt({ hash: resetApproveHash });

    await expect(deposit(publicClient, {
        wallet: TEST_ACCOUNT.address,
        vault: mockVaultAddress,
        amount: depositAmount,
    })).rejects.toThrow(MissingAllowanceError);
});

// TEST 4: Amount exceeds max deposit error with real contracts
test("deposit function - throws AmountExceedsMaxDepositError with anvil", async () => {
    const depositAmount = parseEther("100");
    const maxDepositAmount = parseEther("50");

    // Set vault max deposit limit
    const setMaxDepositHash = await walletClient.writeContract({
        address: mockVaultAddress,
        abi: mockVaultAbi,
        functionName: "setMaxDeposit",
        args: [maxDepositAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: setMaxDepositHash });

    // Approve tokens (so it's not an allowance issue)
    const approveHash = await walletClient.writeContract({
        address: mockTokenAddress,
        abi: mockTokenAbi,
        functionName: "approve",
        args: [mockVaultAddress, depositAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    await expect(deposit(publicClient, {
        wallet: TEST_ACCOUNT.address,
        vault: mockVaultAddress,
        amount: depositAmount,
    })).rejects.toThrow(AmountExceedsMaxDepositError);

    // Reset max deposit for other tests
    const resetMaxDepositHash = await walletClient.writeContract({
        address: mockVaultAddress,
        abi: mockVaultAbi,
        functionName: "setMaxDeposit",
        args: [parseEther("1000000")],
    });
    await publicClient.waitForTransactionReceipt({ hash: resetMaxDepositHash });
});

// TEST 5: Error classes validation
test("error classes - correct inheritance and messages", () => {
    const notEnoughBalanceError = new NotEnoughBalanceError();
    expect(notEnoughBalanceError).toBeInstanceOf(Error);
    expect(notEnoughBalanceError.message).toBe("Not enough balance");

    const missingAllowanceError = new MissingAllowanceError();
    expect(missingAllowanceError).toBeInstanceOf(Error);
    expect(missingAllowanceError.message).toBe("Not enough allowance");

    const amountExceedsMaxDepositError = new AmountExceedsMaxDepositError();
    expect(amountExceedsMaxDepositError).toBeInstanceOf(Error);
    expect(amountExceedsMaxDepositError.message).toBe("Amount exceeds max deposit");
});

// TEST 6: Real gas estimation validation
test("transaction object validation with real gas estimation", async () => {
    const depositAmount = parseEther("10");

    // Approve vault
    const approveHash = await walletClient.writeContract({
        address: mockTokenAddress,
        abi: mockTokenAbi,
        functionName: "approve",
        args: [mockVaultAddress, depositAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    const transaction = await deposit(publicClient, {
        wallet: TEST_ACCOUNT.address,
        vault: mockVaultAddress,
        amount: depositAmount,
    });

    // Verify transaction structure
    expect(typeof transaction.data).toBe("string");
    expect(transaction.data.startsWith("0x")).toBe(true);
    expect(typeof transaction.from).toBe("string");
    expect(transaction.from.startsWith("0x")).toBe(true);
    expect(typeof transaction.to).toBe("string");
    expect(transaction.to.startsWith("0x")).toBe(true);
    expect(typeof transaction.value).toBe("bigint");
    expect(typeof transaction.gas).toBe("bigint");

    expect(transaction.gas).toBeGreaterThan(21000n); // More than simple transfer
    expect(transaction.gas).toBeLessThan(500000n);   // Less than complex contract
});

// TEST 7: Edge cases with real contracts
test("deposit function - boundary conditions with anvil", async () => {
    // Test with a reasonable amount that won't exceed max deposit
    const depositAmount = parseEther("50");

    // Approve vault
    const approveHash = await walletClient.writeContract({
        address: mockTokenAddress,
        abi: mockTokenAbi,
        functionName: "approve",
        args: [mockVaultAddress, depositAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    const transaction = await deposit(publicClient, {
        wallet: TEST_ACCOUNT.address,
        vault: mockVaultAddress,
        amount: depositAmount,
    });

    expect(transaction).toBeDefined();
    expect(transaction.gas).toBeGreaterThan(0n);
});