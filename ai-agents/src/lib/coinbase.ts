import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";

if (!process.env.CDP_API_KEY_NAME || !process.env.CDP_API_KEY_PRIVATE_KEY) {
  throw new Error("CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY must be set");
}

const { CDP_API_KEY_NAME, CDP_API_KEY_PRIVATE_KEY } = process.env;

const apiKeyString = CDP_API_KEY_PRIVATE_KEY as string;

Coinbase.configure({
  apiKeyName: CDP_API_KEY_NAME as string,
  privateKey: apiKeyString.replaceAll("\\n", "\n") as string,
});

export async function importWallet(minEthBalance: number = 0, minUsdcBalance: number = 0): Promise<Wallet> {
  console.log(`Importing wallet with minimum ETH balance: ${minEthBalance}, minimum USDC balance: ${minUsdcBalance}`);
  const { WALLET_DATA } = process.env;

  let wallet: Wallet;

  try {
    const seedData = JSON.parse(WALLET_DATA || "{}");
    console.log(`Parsed wallet data. Found ${Object.keys(seedData).length} wallet(s)`);

    if (Object.keys(seedData).length === 0) {
      console.log('No existing wallet found. Creating a new wallet...');
      wallet = await Wallet.create();
      let exportData = await wallet.export();
      const newWalletData = JSON.stringify({ 
        [exportData['walletId'] as string]: { 
          'seed': exportData['seed'] as string 
        } 
      });
      console.log(`Created new wallet: ${exportData['walletId']}`);
      process.env.WALLET_DATA = newWalletData;
      return wallet;
    } else {
      console.log('Existing wallet found. Importing...');
      const walletId = Object.keys(seedData)[0];
      const seed = seedData[walletId]?.seed;
      wallet = await Wallet.import({ seed, walletId });
      console.log(`Imported existing wallet with ID: ${walletId}`);
    }

    console.log(`Wallet address: ${await wallet.getDefaultAddress()}`);

    // Fund USDC if needed
    const currentUsdcBalance = await wallet.getBalance(Coinbase.assets.Usdc);
    if (currentUsdcBalance.lessThan(minUsdcBalance)) {
      console.log(`Funding wallet with USDC...`);
      await wallet.faucet(Coinbase.assets.Usdc);
    }

    // Fund ETH if needed
    const currentEthBalance = await wallet.getBalance(Coinbase.assets.Eth);
    if (currentEthBalance.lessThan(minEthBalance)) {
      console.log(`Funding wallet with ETH...`);
      await wallet.faucet();
    }

    return wallet;
  } catch (e) {
    console.error('Failed to import wallet:', e);
    throw e;
  }
} 