<div align="center">
  <h1>🚂 ZKRail</h1>
  <p><strong>Decentralized UPI Payments powered by Zero Knowledge Proofs</strong></p>

![image](https://github.com/user-attachments/assets/c90534d8-7b51-42bb-bd2f-6aed89da92ec)

  
  <p>
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#development">Development</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Base-Sepolia-blue" alt="Base Sepolia" />
    <img src="https://img.shields.io/badge/USDC-Payments-green" alt="USDC Payments" />
    <img src="https://img.shields.io/badge/AI-Powered-purple" alt="AI Powered" />
  </p>
</div>

## 🌟 Overview

ZKRail is a revolutionary payment infrastructure that bridges traditional UPI payments with blockchain technology using zero-knowledge proofs. It enables secure, private, and efficient cross-border payments while maintaining the simplicity of UPI transactions.

## 🎯 Use Cases

- **Cross-Border Remittances**: Send money internationally using UPI
- **Private Business Payments**: Keep transaction details confidential
- **Decentralized Payment Networks**: Build on top of our intent-based architecture
- **AI-Enhanced Payments**: Natural language payment processing

## ✨ Features

- **UPI Integration**: Send payments to any UPI ID directly from your crypto wallet
- **Zero-Knowledge Privacy**: Transaction details are kept private using ZK proofs
- **AI-Powered CLI**: Natural language interface for initiating payments
- **Cross-Border Support**: Seamless international payments using USDC
- **Intent-Based Architecture**: Decentralized intent matching for optimal payment routing
- **Bond-Based Security**: Solver bonding mechanism ensures payment reliability

## 🏗 Architecture

![image](https://github.com/user-attachments/assets/3fbc49a3-ee37-42b9-a0f1-2d8fd9594b78)


## 🚀 Technical Stack

- **Smart Contracts**: Solidity, Foundry
- **Backend**: TypeScript, Node.js
- **AI Integration**: GPT-4, LangChain
- **Blockchain**: Base Sepolia Network
- **Payment**: USDC, UPI
- **Privacy**: Zero Knowledge Proofs
- **SDK**: Coinbase Cloud CDP

## 🚀 Quick Start

1. Install dependencies:

```bash
yarn install
```

2. Set up your environment variables:

```bash
cp .env.example .env
# Add your API keys and configuration
```

3. Start the payment CLI:

```bash
yarn cli
```

4. Make your first payment:

```bash
transfer 100 rs to user@upi
```

## 🛠 Development

### Prerequisites

- Node.js >= v18.18
- Yarn
- Foundry
- Coinbase Cloud API Keys

### Environment Variables

```bash
CDP_API_KEY_NAME=your_api_key_name
CDP_API_KEY_PRIVATE_KEY=your_private_key
OPENAI_API_KEY=your_openai_key
```

### Local Setup

1. Clone the repository:

```bash
git clone https://github.com/your-username/zkrail.git
cd zkrail
```

2. Install dependencies:

```bash
yarn install
```

3. Start local blockchain:

```bash
yarn chain
```

4. Deploy contracts:

```bash
yarn deploy
```

5. Run the development server:

```bash
yarn dev
```

## 📜 License

MIT License - see [LICENSE](LICENSE) for details

---

# 🏗 Scaffold-ETH 2

<h4 align="center">
  <a href="https://docs.scaffoldeth.io">Documentation</a> |
  <a href="https://scaffoldeth.io">Website</a>
</h4>

🧪 An open-source, up-to-date toolkit for building decentralized applications (dapps) on the Ethereum blockchain. It's designed to make it easier for developers to create and deploy smart contracts and build user interfaces that interact with those contracts.

⚙️ Built using NextJS, RainbowKit, Foundry, Wagmi, Viem, and Typescript.

- ✅ **Contract Hot Reload**: Your frontend auto-adapts to your smart contract as you edit it.
- 🪝 **[Custom hooks](https://docs.scaffoldeth.io/hooks/)**: Collection of React hooks wrapper around [wagmi](https://wagmi.sh/) to simplify interactions with smart contracts with typescript autocompletion.
- 🧱 [**Components**](https://docs.scaffoldeth.io/components/): Collection of common web3 components to quickly build your frontend.
- 🔥 **Burner Wallet & Local Faucet**: Quickly test your application with a burner wallet and local faucet.
- 🔐 **Integration with Wallet Providers**: Connect to different wallet providers and interact with the Ethereum network.

![Debug Contracts tab](https://github.com/scaffold-eth/scaffold-eth-2/assets/55535804/b237af0c-5027-4849-a5c1-2e31495cccb1)

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v18.18)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Quickstart

To get started with Scaffold-ETH 2, follow the steps below:

1. Install dependencies if it was skipped in CLI:

```
cd my-dapp-example
yarn install
```

2. Run a local network in the first terminal:

```
yarn chain
```

This command starts a local Ethereum network using Foundry. The network runs on your local machine and can be used for testing and development. You can customize the network configuration in `packages/foundry/foundry.toml`.

3. On a second terminal, deploy the test contract:

```
yarn deploy
```

This command deploys a test smart contract to the local network. The contract is located in `packages/foundry/contracts` and can be modified to suit your needs. The `yarn deploy` command uses the deploy script located in `packages/foundry/script` to deploy the contract to the network. You can also customize the deploy script.

4. On a third terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your smart contract using the `Debug Contracts` page. You can tweak the app config in `packages/nextjs/scaffold.config.ts`.

Run smart contract test with `yarn foundry:test`

- Edit your smart contracts in `packages/foundry/contracts`
- Edit your frontend homepage at `packages/nextjs/app/page.tsx`. For guidance on [routing](https://nextjs.org/docs/app/building-your-application/routing/defining-routes) and configuring [pages/layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts) checkout the Next.js documentation.
- Edit your deployment scripts in `packages/foundry/script`


## Documentation

Visit our [docs](https://docs.scaffoldeth.io) to learn how to start building with Scaffold-ETH 2.

To know more about its features, check out our [website](https://scaffoldeth.io).

## Contributing to Scaffold-ETH 2

We welcome contributions to Scaffold-ETH 2!

Please see [CONTRIBUTING.MD](https://github.com/scaffold-eth/scaffold-eth-2/blob/main/CONTRIBUTING.md) for more information and guidelines for contributing to Scaffold-ETH 2.
