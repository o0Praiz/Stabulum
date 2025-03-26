#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');
const { marked } = require('marked');
const handlebars = require('handlebars');
const glob = require('glob');
const solidity_docgen = require('solidity-docgen');
const { execSync } = require('child_process');

/**
 * Stabulum Documentation Generator CLI Tool
 * 
 * This CLI tool automatically generates comprehensive documentation for the Stabulum stablecoin
 * ecosystem, including smart contracts, APIs, integration guides, and technical specifications.
 */

// Configure CLI options
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
  .command('generate', 'Generate documentation', (yargs) => {
    return yargs
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output directory for documentation',
        default: './docs'
      })
      .option('template', {
        alias: 't',
        type: 'string',
        description: 'Documentation template directory',
        default: './templates'
      })
      .option('contracts', {
        alias: 'c',
        type: 'string',
        description: 'Contracts directory',
        default: './contracts'
      })
      .option('format', {
        alias: 'f',
        type: 'string',
        choices: ['markdown', 'html', 'pdf', 'all'],
        description: 'Output format',
        default: 'all'
      })
      .option('toc', {
        type: 'boolean',
        description: 'Generate table of contents',
        default: true
      });
  })
  .command('clean', 'Clean generated documentation', (yargs) => {
    return yargs
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output directory to clean',
        default: './docs'
      });
  })
  .command('watch', 'Watch for changes and regenerate documentation', (yargs) => {
    return yargs
      .option('contracts', {
        alias: 'c',
        type: 'string',
        description: 'Contracts directory to watch',
        default: './contracts'
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output directory for documentation',
        default: './docs'
      });
  })
  .demandCommand(1, 'You need to specify a command')
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .argv;

// Documentation sections
const SECTIONS = {
  OVERVIEW: 'overview',
  CONTRACTS: 'contracts',
  APIS: 'apis',
  INTEGRATION: 'integration',
  GOVERNANCE: 'governance',
  SECURITY: 'security',
  DEPLOYMENT: 'deployment'
};

// Main function to handle commands
async function main() {
  try {
    const command = argv._[0];
    
    switch (command) {
      case 'generate':
        await generateDocumentation();
        break;
      case 'clean':
        cleanDocumentation();
        break;
      case 'watch':
        watchForChanges();
        break;
      default:
        console.error(chalk.red(`Unknown command: ${command}`));
        process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

// Generate documentation
async function generateDocumentation() {
  console.log(chalk.blue('Starting Stabulum documentation generation...'));
  
  const outputDir = argv.output;
  const templateDir = argv.template;
  const contractsDir = argv.contracts;
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate contract documentation
  await generateContractDocs(contractsDir, outputDir);
  
  // Generate API documentation
  generateApiDocs(outputDir);
  
  // Generate integration guides
  generateIntegrationGuides(templateDir, outputDir);
  
  // Generate security documentation
  generateSecurityDocs(templateDir, outputDir);
  
  // Generate governance documentation
  generateGovernanceDocs(templateDir, outputDir);
  
  // Generate index and table of contents
  if (argv.toc) {
    generateTableOfContents(outputDir);
  }
  
  // Convert to specified formats
  if (argv.format === 'all' || argv.format === 'html') {
    convertToHtml(outputDir);
  }
  
  if (argv.format === 'all' || argv.format === 'pdf') {
    convertToPdf(outputDir);
  }
  
  console.log(chalk.green('Documentation generation complete!'));
}

// Generate smart contract documentation using solidity-docgen
async function generateContractDocs(contractsDir, outputDir) {
  console.log(chalk.blue('Generating smart contract documentation...'));
  
  const contractDocsDir = path.join(outputDir, SECTIONS.CONTRACTS);
  if (!fs.existsSync(contractDocsDir)) {
    fs.mkdirSync(contractDocsDir, { recursive: true });
  }
  
  // Use solidity-docgen to generate contract documentation
  try {
    await solidity_docgen.generate({
      inputDir: contractsDir,
      outputDir: contractDocsDir,
      templates: path.join(argv.template, 'contracts'),
      solcVersion: '0.8.19'
    });
    
    // Generate contract summaries
    generateContractSummaries(contractsDir, contractDocsDir);
    
    console.log(chalk.green('Contract documentation generated successfully.'));
  } catch (error) {
    console.error(chalk.red(`Error generating contract documentation: ${error.message}`));
  }
}

// Generate summaries of contract functionality
function generateContractSummaries(contractsDir, outputDir) {
  console.log(chalk.blue('Generating contract summaries...'));
  
  const contracts = [
    { name: 'StabulumToken', description: 'The core ERC-20 token contract for Stabulum stablecoin' },
    { name: 'StabulumReserve', description: 'Manages the reserve assets backing Stabulum' },
    { name: 'StabulumGovernance', description: 'Handles on-chain governance for protocol upgrades' },
    { name: 'StabulumBridge', description: 'Facilitates cross-chain transfers of Stabulum tokens' },
    { name: 'StabulumKYC', description: 'Implements KYC/AML compliance features' },
    { name: 'StabulumStability', description: 'Manages mechanisms for maintaining the stable peg' },
    { name: 'StabulumOracle', description: 'Provides price feed data for stability mechanisms' },
    { name: 'StabulumLiquidity', description: 'Manages DEX liquidity pool integrations' },
    { name: 'StabulumMultisig', description: 'Multi-signature wallet for secure operations' },
    { name: 'StabulumVesting', description: 'Manages token vesting schedules' },
    { name: 'StabulumAirdrop', description: 'Handles token airdrop distribution' },
    { name: 'StabulumDeFi', description: 'Integrates with DeFi protocols' }
  ];
  
  const summaryContent = `# Stabulum Smart Contract Overview\n\n` +
    `This document provides a summary of the smart contracts in the Stabulum ecosystem.\n\n` +
    contracts.map(contract => `## ${contract.name}\n\n${contract.description}\n\n` +
      `[View Full Documentation](./contracts/${contract.name}.md)\n`).join('\n');
  
  fs.writeFileSync(path.join(outputDir, 'contract-summary.md'), summaryContent);
}

// Generate API documentation
function generateApiDocs(outputDir) {
  console.log(chalk.blue('Generating API documentation...'));
  
  const apiDocsDir = path.join(outputDir, SECTIONS.APIS);
  if (!fs.existsSync(apiDocsDir)) {
    fs.mkdirSync(apiDocsDir, { recursive: true });
  }
  
  // Example API documentation structure
  const apiEndpoints = [
    {
      name: 'Token Information',
      endpoint: '/api/v1/token',
      method: 'GET',
      description: 'Returns information about the Stabulum token',
      parameters: [],
      response: {
        type: 'application/json',
        example: '{\n  "name": "Stabulum",\n  "symbol": "STAB",\n  "totalSupply": "1000000000",\n  "price": "1.00"\n}'
      }
    },
    {
      name: 'Reserve Status',
      endpoint: '/api/v1/reserves',
      method: 'GET',
      description: 'Returns information about the current reserve status',
      parameters: [],
      response: {
        type: 'application/json',
        example: '{\n  "totalReserves": "1000000000",\n  "collateralizationRatio": "100",\n  "lastAuditDate": "2024-10-01T00:00:00Z"\n}'
      }
    },
    {
      name: 'User Balance',
      endpoint: '/api/v1/user/{address}/balance',
      method: 'GET',
      description: 'Returns the Stabulum balance for a specific address',
      parameters: [
        { name: 'address', type: 'string', description: 'Ethereum address' }
      ],
      response: {
        type: 'application/json',
        example: '{\n  "address": "0x1234...",\n  "balance": "100.00"\n}'
      }
    }
  ];
  
  const apiDocContent = `# Stabulum API Documentation\n\n` +
    `This document describes the available API endpoints for interacting with the Stabulum ecosystem.\n\n` +
    apiEndpoints.map(api => 
      `## ${api.name}\n\n` +
      `**Endpoint:** \`${api.endpoint}\`\n\n` +
      `**Method:** \`${api.method}\`\n\n` +
      `**Description:** ${api.description}\n\n` +
      (api.parameters.length > 0 ? 
        `**Parameters:**\n\n` +
        api.parameters.map(param => `- \`${param.name}\` (${param.type}): ${param.description}`).join('\n') +
        `\n\n` : '') +
      `**Response:**\n\n` +
      `Content-Type: \`${api.response.type}\`\n\n` +
      "```json\n" + api.response.example + "\n```\n"
    ).join('\n\n');
  
  fs.writeFileSync(path.join(apiDocsDir, 'api-reference.md'), apiDocContent);
}

// Generate integration guides
function generateIntegrationGuides(templateDir, outputDir) {
  console.log(chalk.blue('Generating integration guides...'));
  
  const integrationDocsDir = path.join(outputDir, SECTIONS.INTEGRATION);
  if (!fs.existsSync(integrationDocsDir)) {
    fs.mkdirSync(integrationDocsDir, { recursive: true });
  }
  
  // Generate integration guides from templates or defaults
  const integrationGuides = [
    {
      title: 'DEX Integration Guide',
      filename: 'dex-integration.md',
      content: `# Stabulum DEX Integration Guide

## Overview

This guide provides instructions for integrating Stabulum stablecoin into decentralized exchanges (DEXs).

## Requirements

- Ethereum-compatible DEX
- Support for ERC-20 tokens
- Liquidity pool capabilities

## Integration Steps

1. **Add Stabulum Token**
   - Token Contract Address: \`0x...\` (to be provided after deployment)
   - Symbol: STAB
   - Decimals: 18

2. **Create Liquidity Pools**
   - STAB/ETH
   - STAB/USDC
   - STAB/DAI

3. **Configure Price Oracle**
   - Use Stabulum Oracle at \`0x...\` (to be provided after deployment)
   - Alternatively, integrate with Chainlink or other reliable oracle services

4. **Implement Fee Structure**
   - Standard trading fees apply
   - No additional fees are required by the Stabulum protocol

## Code Example

\`\`\`solidity
// Sample integration code for Uniswap V2 compatible DEXs
IUniswapV2Router02 router = IUniswapV2Router02(ROUTER_ADDRESS);
IERC20 stabulum = IERC20(STABULUM_ADDRESS);

// Approve router to spend tokens
stabulum.approve(address(router), amount);

// Add liquidity
router.addLiquidity(
    STABULUM_ADDRESS,
    WETH_ADDRESS,
    stabulumAmount,
    wethAmount,
    minStabulumAmount,
    minWethAmount,
    address(this),
    block.timestamp + 1800
);
\`\`\`

## Testing

Run integration tests using the Stabulum testnet token available on major test networks:
- Goerli: \`0x...\`
- Sepolia: \`0x...\`
- Binance Smart Chain Testnet: \`0x...\`

## Support

For integration support, please contact the Stabulum team at integration@stabulum.io
`
    },
    {
      title: 'Wallet Integration Guide',
      filename: 'wallet-integration.md',
      content: `# Stabulum Wallet Integration Guide

## Overview

This guide provides instructions for integrating Stabulum stablecoin into wallet applications.

## Requirements

- Support for ERC-20 tokens
- Ethereum/BSC/Polygon network support
- Transaction signing capabilities

## Integration Steps

1. **Add Token Support**
   - Token Contract Address: \`0x...\` (to be provided after deployment)
   - Symbol: STAB
   - Decimals: 18
   - Logo URL: https://stabulum.io/assets/logo.png

2. **Configure Network Support**
   - Primary network: Ethereum Mainnet
   - Secondary networks: BSC, Polygon, Arbitrum, Optimism

3. **Implement Transaction Handling**
   - Standard ERC-20 transfer methods
   - Support for permit functionality (EIP-2612)
   - Support for gasless transactions via meta-transactions

## API Integration

Use the Stabulum API for enhanced functionality:

\`\`\`javascript
// Fetch token information
const tokenInfo = await fetch('https://api.stabulum.io/v1/token')
  .then(response => response.json());

// Get current price and reserve status
const reserveInfo = await fetch('https://api.stabulum.io/v1/reserves')
  .then(response => response.json());

// Display in wallet UI
function displayStabulumInfo(tokenInfo, reserveInfo) {
  // Implementation details
}
\`\`\`

## Advanced Features

Wallets may implement these optional advanced features:
- In-wallet staking of Stabulum tokens
- Reserve audit verification
- Governance voting interface

## Testing

Use the Stabulum testnet token for integration testing before mainnet deployment.

## Support

For integration support, please contact the Stabulum team at wallet@stabulum.io
`
    },
    {
      title: 'DeFi Protocol Integration Guide',
      filename: 'defi-integration.md',
      content: `# Stabulum DeFi Protocol Integration Guide

## Overview

This guide provides instructions for integrating Stabulum stablecoin into DeFi protocols such as lending platforms, yield aggregators, and other financial applications.

## Requirements

- Smart contract system with stablecoin support
- Risk assessment framework for new assets
- Oracle integration capabilities

## Integration Steps

1. **Asset Configuration**
   - Token Contract Address: \`0x...\` (to be provided after deployment)
   - Symbol: STAB
   - Risk Category: Stablecoin
   - Recommended collateral factor: 0.8 (80%)

2. **Oracle Setup**
   - Primary oracle: Stabulum Price Oracle (\`0x...\`)
   - Fallback: Chainlink STAB/USD price feed

3. **Reserve Risk Parameters**
   - Liquidation threshold: 85%
   - Liquidation bonus: 5%
   - Reserve factor: 10%
   - Interest rate strategy: similar to other fiat-backed stablecoins

## Smart Contract Integration

\`\`\`solidity
// Example for adding Stabulum to a lending protocol
function addStabulumAsset() external onlyAdmin {
    // Define interest rate strategy for Stabulum
    InterestRateStrategy stabulumStrategy = new InterestRateStrategy(
        baseVariableBorrowRate,
        variableRateSlope1,
        variableRateSlope2,
        stableRateSlope1,
        stableRateSlope2
    );
    
    // Add Stabulum to the protocol
    lendingPool.initReserve(
        STABULUM_ADDRESS,
        STABULUM_ATOKEN_ADDRESS,
        STABULUM_STABLE_DEBT_TOKEN_ADDRESS,
        STABULUM_VARIABLE_DEBT_TOKEN_ADDRESS,
        stabulumStrategy
    );
    
    // Configure parameters
    lendingPool.configureReserveAsCollateral(
        STABULUM_ADDRESS,
        80_00, // 80% LTV
        85_00, // 85% liquidation threshold
        105_00 // 5% liquidation bonus
    );
    
    // Enable borrowing
    lendingPool.enableBorrowingOnReserve(STABULUM_ADDRESS, true);
    
    // Set reserve factor
    lendingPool.setReserveFactor(STABULUM_ADDRESS, 10_00); // 10%
}
\`\`\`

## Risk Considerations

- Stabulum maintains a 1:1 reserve ratio with fiat currencies
- Regular external audits of reserves
- On-chain proof of reserves available for verification

## Testing Procedure

1. Deploy integration to testnet
2. Test all supported operations:
   - Supply/deposit Stabulum
   - Use Stabulum as collateral
   - Borrow against Stabulum
   - Liquidation scenarios
   - Interest accrual

## Support

For DeFi integration support, please contact the Stabulum team at defi@stabulum.io
`
    }
  ];
  
  // Write integration guides
  integrationGuides.forEach(guide => {
    fs.writeFileSync(path.join(integrationDocsDir, guide.filename), guide.content);
  });
  
  // Generate index file for integration guides
  const integrationIndexContent = `# Stabulum Integration Guides\n\n` +
    `## Available Guides\n\n` +
    integrationGuides.map(guide => `- [${guide.title}](./${guide.filename})`).join('\n');
  
  fs.writeFileSync(path.join(integrationDocsDir, 'index.md'), integrationIndexContent);
}

// Generate security documentation
function generateSecurityDocs(templateDir, outputDir) {
  console.log(chalk.blue('Generating security documentation...'));
  
  const securityDocsDir = path.join(outputDir, SECTIONS.SECURITY);
  if (!fs.existsSync(securityDocsDir)) {
    fs.mkdirSync(securityDocsDir, { recursive: true });
  }
  
  // Security documentation content
  const securityContent = `# Stabulum Security Model

## Overview

Stabulum implements a comprehensive security model to protect user funds, ensure stability, and maintain compliance with regulatory requirements.

## Smart Contract Security

### Audits

All Stabulum smart contracts undergo rigorous security audits by reputable third-party auditing firms:

- Pre-deployment audit by Security Firm A
- Code review by Security Firm B
- Formal verification of critical components by Security Firm C

### Security Features

- **Access Control**: Role-based access control using OpenZeppelin's AccessControl
- **Pausability**: Emergency pause functionality for critical operations
- **Upgradability**: Transparent proxy pattern for contract upgrades
- **Rate Limiting**: Transaction amount limits to prevent large-scale attacks
- **Reentrancy Protection**: Guards against reentrancy attacks

## Reserve Security

### Collateral Management

- 1:1 fiat backing in regulated financial institutions
- Regular third-party audits of reserves
- On-chain proof of reserves mechanism
- Multi-signature control of reserve operations

### Risk Mitigation

- **Diversification**: Reserves held across multiple jurisdictions and institutions
- **Insurance**: Insurance coverage for reserve assets
- **Contingency Fund**: Reserve buffer for emergency situations

## Operational Security

### Key Management

- Multi-signature wallets for administrative operations
- Hardware security modules (HSMs) for key storage
- Time-locked operations for critical changes

### Monitoring and Incident Response

- 24/7 monitoring of contract activity
- Automated alerts for suspicious transactions
- Incident response team on standby
- Bug bounty program

## Compliance Security

### KYC/AML Measures

- Integration with KYC/AML providers
- Transaction monitoring for suspicious activity
- Address blocklisting capabilities for regulatory compliance

### Privacy Considerations

- Compliance with relevant data protection regulations
- Minimization of on-chain personal data

## Security Roadmap

- Regular security audits (quarterly)
- Penetration testing (semi-annually)
- Continuous monitoring and improvement
- Security research partnerships

## Bug Bounty Program

Stabulum maintains a bug bounty program to incentivize responsible disclosure of security vulnerabilities. Rewards range from $1,000 to $50,000 depending on severity.

## Security Contact

For security-related issues, please contact security@stabulum.io or use our secure reporting form at https://stabulum.io/security.
`;
  
  fs.writeFileSync(path.join(securityDocsDir, 'security-model.md'), securityContent);
  
  // Generate security audit placeholder
  const auditContent = `# Security Audits

This document will be updated with links to security audit reports once they are completed.

## Planned Audits

1. **Smart Contract Audit**
   - Auditor: TBD
   - Scope: All Stabulum smart contracts
   - Timeline: Prior to mainnet deployment

2. **Economic Model Audit**
   - Auditor: TBD
   - Scope: Stability mechanism and reserve system
   - Timeline: Prior to mainnet deployment

3. **Penetration Testing**
   - Auditor: TBD
   - Scope: Smart contracts and APIs
   - Timeline: Prior to mainnet deployment

## Bug Bounty Program

Stabulum is committed to security and will launch a bug bounty program after the initial security audits are completed.
`;
  
  fs.writeFileSync(path.join(securityDocsDir, 'audits.md'), auditContent);
}

// Generate governance documentation
function generateGovernanceDocs(templateDir, outputDir) {
  console.log(chalk.blue('Generating governance documentation...'));
  
  const governanceDocsDir = path.join(outputDir, SECTIONS.GOVERNANCE);
  if (!fs.existsSync(governanceDocsDir)) {
    fs.mkdirSync(governanceDocsDir, { recursive: true });
  }
  
  // Governance documentation content
  const governanceContent = `# Stabulum Governance Model

## Overview

Stabulum implements a hybrid governance model that combines off-chain discussion with on-chain voting to ensure both community participation and operational efficiency.

## Governance Structure

### Stakeholders

1. **Token Holders**: Users who hold Stabulum tokens
2. **Core Team**: Initial developers and operators of the protocol
3. **Reserve Custodians**: Entities responsible for managing the reserve assets
4. **Integration Partners**: Key ecosystem partners using Stabulum

### Governance Mechanisms

#### On-Chain Governance

- **Voting System**: Token-weighted voting through the StabulumGovernance contract
- **Proposal Threshold**: 1% of total supply required to submit proposals
- **Voting Period**: 7 days for standard proposals
- **Execution Delay**: 2 days after proposal approval
- **Quorum Requirement**: 4% of total supply must participate

#### Off-Chain Governance

- **Discussion Forum**: Community discussions at forum.stabulum.io
- **Improvement Proposals**: Stabulum Improvement Proposals (SIPs) for protocol changes
- **Working Groups**: Specialized teams focusing on specific aspects of the protocol

## Governance Processes

### Proposal Lifecycle

1. **Ideation**: Community discussion on the forum
2. **SIP Creation**: Formal proposal document created
3. **Feedback Period**: Community feedback and refinement
4. **On-Chain Submission**: Proposal submitted to governance contract
5. **Voting Period**: Token holders vote on the proposal
6. **Execution**: If approved and after delay, proposal is executed

### Emergency Procedures

- **Emergency Council**: Multi-signature group with limited emergency powers
- **Circuit Breaker**: Ability to pause specific functions in emergency situations
- **Emergency Proposals**: Expedited voting process for critical security issues

## Governable Parameters

### Protocol Parameters

- Reserve requirements and composition
- Fee structures
- Stability mechanisms
- Integration requirements
- Upgrade approval

### Operational Parameters

- Oracle configurations
- Risk parameters
- Bridge limits
- KYC/AML requirements

## Governance Roadmap

### Phase 1: Bootstrap Governance

- Core team manages critical parameters
- Community voting on non-critical parameters
- Formation of working groups

### Phase 2: Progressive Decentralization

- Transition to full on-chain governance
- Reduced core team control
- Expanded community voting rights

### Phase 3: Full DAO Governance

- Complete transition to DAO structure
- Core team retains only advisory role
- Full community control of protocol parameters

## Participation Guide

### How to Participate

1. **Join the Forum**: Register at forum.stabulum.io
2. **Acquire Voting Power**: Hold Stabulum tokens
3. **Delegate Votes**: Optionally delegate your votes
4. **Submit Proposals**: Create SIPs for community consideration
5. **Vote on Proposals**: Participate in on-chain voting

### Resources

- Governance Portal: governance.stabulum.io
- Documentation: docs.stabulum.io/governance
- Github: github.com/stabulum/governance
`;
  
  fs.writeFileSync(path.join(governanceDocsDir, 'governance-model.md'), governanceContent);
  
  // Generate voting guide
  const votingGuideContent = `# Stabulum Voting Guide

## Introduction

This guide explains how to participate in Stabulum governance voting.

## Prerequisites

- An Ethereum wallet (MetaMask, Ledger, etc.)
- Stabulum tokens (STAB) in your wallet
- Basic understanding of blockchain transactions

## Connecting to the Governance Portal

1. Visit [governance.stabulum.io](https://governance.stabulum.io)
2. Click "Connect Wallet" and select your wallet provider
3. Approve the connection request in your wallet

## Voting Options

### Direct Voting

1. Navigate to the "Active Proposals" section
2. Review proposal details and supporting documentation
3. Click "Vote" on the proposal you wish to participate in
4. Select "For," "Against," or "Abstain"
5. Confirm the transaction in your wallet

### Vote Delegation

If you prefer to delegate your voting power to another address:

1. Go to the "Delegation" section
2. Enter the Ethereum address of your chosen delegate
3. Click "Delegate" and confirm the transaction
4. Your delegate can now vote with your voting power

## Creating Proposals

To create a governance proposal:

1. Ensure you meet the minimum token threshold (1% of total supply)
2. Draft a Stabulum Improvement Proposal (SIP) and share on the forum
3. After community discussion, go to "Create Proposal" on the governance portal
4. Fill in the proposal details:
   - Title
   - Description
   - Actions (contract calls to be executed if approved)
   - Supporting documentation links
5. Submit the proposal and confirm the transaction

## Tracking Results

- View real-time voting results on the governance portal
- Receive notifications when proposals you've voted on are executed
- Review historical voting data in the "Past Proposals" section

## Best Practices

- Research proposals thoroughly before voting
- Participate in forum discussions
- Consider delegating to active community members if you cannot actively participate
- Vote according to what you believe is best for the long-term health of the protocol

## Support

For governance-related support, contact governance@stabulum.io
`;
  
  fs.writeFileSync(path.join(governanceDocsDir, 'voting-guide.md'), votingGuideContent);
}

// Generate table of contents
function generateTableOfContents(outputDir) {
  console.log(chalk.blue('Generating table of contents...'));
  
  // Generate document tree
  const allDocs = {};
  
  // Get all markdown files recursively
  const allFiles = glob.sync(`${outputDir}/**/*.md`);
  
  // Process files by section
  allFiles.forEach(file => {
    const relativePath = path.relative(outputDir, file);
    const section = relativePath.split(path.sep)[0];
    
    if (!allDocs[section]) {
      allDocs[section] = [];
    }
    
    // Read first line to get title
    const content = fs.readFileSync(file, 'utf-8');
    const titleMatch = content.match(/^#\s+(.*)/);
    const title = titleMatch ? titleMatch[1] : path.basename(file, '.md');
    
    allDocs[section].push({
      title,
      path: relativePath
    });
  });
  
  // Generate TOC content
  let tocContent = '# Stabulum Documentation\n\n';
  
  Object.keys(allDocs).sort().forEach(section => {
    tocContent += `## ${section.charAt(0).toUpperCase() + section.slice(1)}\n\n`;
    
    allDocs[section].forEach(doc => {
      tocContent += `- [${doc.title}](./${doc.path})\n`;
    });
    
    tocContent += '\n';
  });
  
  fs.writeFileSync(path.join(outputDir, 'index.md'), tocContent);
}

// Convert markdown to HTML
function convertToHtml(outputDir) {
  console.log(chalk.blue('Converting documentation to HTML...'));
  
  const htmlDir = path.join(outputDir, 'html');
  if (!fs.existsSync(htmlDir)) {
    fs.mkdirSync(htmlDir, { recursive: true });
  }
  
  // Get all markdown files
  const mdFiles = glob.sync(`${outputDir}/**/*.md`);
  
  // HTML template
  const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}} - Stabulum Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    pre {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    code {
      font-family: Consolas, Monaco, "Andale Mono", monospace;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }