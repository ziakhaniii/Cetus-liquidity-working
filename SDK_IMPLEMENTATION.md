# SDK Implementation Guide

This bot provides a **framework** for automatic liquidity rebalancing on Cetus. To make it fully functional, you need to complete the SDK initialization with proper Cetus contract addresses for your target network.

## Why SDK Configuration is Needed

The Cetus CLMM SDK requires specific contract package addresses that are deployed on the Sui network. These addresses are different for mainnet and testnet, and may change when Cetus upgrades their contracts.

## Getting the Latest Configuration

### Option 1: From Cetus Documentation (Recommended)

Visit the official Cetus developer documentation:
https://cetus-1.gitbook.io/cetus-developer-docs/developer/via-sdk/getting-started

Look for the "Latest SDK Config" section which provides the current contract addresses for both mainnet and testnet.

### Option 2: From Cetus SDK Repository

Check the examples in the official SDK repository:
https://github.com/CetusProtocol/cetus-clmm-sui-sdk/tree/main/examples

### Option 3: From Cetus NPM Package

The SDK npm package may include configuration examples in the README or examples directory.

## Implementation Steps

### Step 1: Create SDK Configuration File

Create `src/config/sdkConfig.ts`:

```typescript
import { Package, CetusConfigs, ClmmConfig } from '@cetusprotocol/cetus-sui-clmm-sdk';

export interface NetworkSDKConfig {
  fullRpcUrl: string;
  cetus_config: Package<CetusConfigs>;
  clmm_pool: Package<ClmmConfig>;
  integrate: Package;
  deepbook: Package;
  deepbook_endpoint_v2: Package;
  aggregatorUrl: string;
}

// Testnet Configuration
// Get latest addresses from: https://cetus-1.gitbook.io/cetus-developer-docs/developer/via-sdk/getting-started
export const TESTNET_CONFIG: Partial<NetworkSDKConfig> = {
  fullRpcUrl: 'https://fullnode.testnet.sui.io:443',
  cetus_config: {
    package_id: '0x...', // Add testnet package ID
    published_at: '0x...',
  },
  clmm_pool: {
    package_id: '0x...', // Add testnet package ID
    published_at: '0x...',
  },
  integrate: {
    package_id: '0x...', // Add testnet package ID
    published_at: '0x...',
  },
  deepbook: {
    package_id: '0x...', // Add testnet package ID
    published_at: '0x...',
  },
  deepbook_endpoint_v2: {
    package_id: '0x...', // Add testnet package ID
    published_at: '0x...',
  },
  aggregatorUrl: 'https://api-sui.cetus.zone/router_v2',
};

// Mainnet Configuration
export const MAINNET_CONFIG: Partial<NetworkSDKConfig> = {
  fullRpcUrl: 'https://fullnode.mainnet.sui.io:443',
  cetus_config: {
    package_id: '0x...', // Add mainnet package ID
    published_at: '0x...',
  },
  clmm_pool: {
    package_id: '0x...', // Add mainnet package ID
    published_at: '0x...',
  },
  integrate: {
    package_id: '0x...', // Add mainnet package ID
    published_at: '0x...',
  },
  deepbook: {
    package_id: '0x...', // Add mainnet package ID
    published_at: '0x...',
  },
  deepbook_endpoint_v2: {
    package_id: '0x...', // Add mainnet package ID
    published_at: '0x...',
  },
  aggregatorUrl: 'https://api-sui.cetus.zone/router_v2',
};

export function getSDKConfig(network: 'mainnet' | 'testnet'): Partial<NetworkSDKConfig> {
  return network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG;
}
```

### Step 2: Update SDK Service

Modify `src/services/sdk.ts` to use the configuration:

```typescript
import CetusClmmSDK, { SdkOptions } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { getSDKConfig } from '../config/sdkConfig';

// In the initializeSDK method:
private initializeSDK(config: BotConfig): CetusClmmSDK {
  try {
    logger.info(`Initializing Cetus SDK for ${config.network}`);
    
    const networkConfig = getSDKConfig(config.network);
    const rpcUrl = config.suiRpcUrl || this.getDefaultRpcUrl(config.network);
    const address = this.keypair.getPublicKey().toSuiAddress();
    
    const sdkOptions: SdkOptions = {
      fullRpcUrl: rpcUrl,
      simulationAccount: {
        address: address,
      },
      ...networkConfig, // Spread the network-specific configuration
    };
    
    const sdk = new CetusClmmSDK(sdkOptions);
    sdk.senderAddress = address;
    
    logger.info(`SDK initialized with address: ${address}`);
    return sdk;
  } catch (error) {
    logger.error('Failed to initialize Cetus SDK', error);
    throw error;
  }
}
```

### Step 3: Implement Position and Liquidity Operations

Once the SDK is properly configured, you can implement the actual operations:

#### Get Pool Information

```typescript
async getPoolInfo(poolAddress: string): Promise<PoolInfo> {
  const sdk = this.sdkService.getSdk();
  const pool = await sdk.Pool.getPool(poolAddress);
  
  return {
    poolAddress,
    currentTickIndex: Number(pool.current_tick_index),
    currentSqrtPrice: pool.current_sqrt_price.toString(),
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB,
    tickSpacing: Number(pool.tickSpacing),
  };
}
```

#### Get Positions

```typescript
async getPositions(ownerAddress: string): Promise<PositionInfo[]> {
  const sdk = this.sdkService.getSdk();
  const positions = await sdk.Position.getPositionList(ownerAddress);
  
  return positions.map((pos: any) => ({
    positionId: pos.pos_object_id,
    poolAddress: pos.pool,
    tickLower: Number(pos.tick_lower_index),
    tickUpper: Number(pos.tick_upper_index),
    liquidity: pos.liquidity.toString(),
    tokenA: pos.coin_type_a,
    tokenB: pos.coin_type_b,
    inRange: true, // Calculate based on current tick
  }));
}
```

#### Remove Liquidity

```typescript
async removeLiquidity(positionId: string, liquidity: string, pool: PoolInfo) {
  const sdk = this.sdkService.getSdk();
  const keypair = this.sdkService.getKeypair();
  
  const payload = await sdk.Position.removeLiquidityTransactionPayload({
    pos_id: positionId,
    delta_liquidity: liquidity,
    min_amount_a: '0', // Adjust for slippage
    min_amount_b: '0',
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB,
  });
  
  // Sign and execute transaction
  const result = await sdk.fullClient.signAndExecuteTransactionBlock({
    transactionBlock: payload,
    signer: keypair,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });
  
  return result;
}
```

#### Add Liquidity

```typescript
async addLiquidity(
  poolAddress: string,
  tickLower: number,
  tickUpper: number,
  coinAmountA: string,
  coinAmountB: string
) {
  const sdk = this.sdkService.getSdk();
  const keypair = this.sdkService.getKeypair();
  
  const payload = await sdk.Position.openPositionTransactionPayload({
    pool_id: poolAddress,
    tick_lower: tickLower,
    tick_upper: tickUpper,
    coinTypeA: poolInfo.coinTypeA,
    coinTypeB: poolInfo.coinTypeB,
  });
  
  // Add liquidity to the position
  const addLiquidityPayload = await sdk.Position.addLiquidityTransactionPayload({
    ...params,
    amount_a: coinAmountA,
    amount_b: coinAmountB,
    fix_amount_a: true,
  });
  
  // Sign and execute
  const result = await sdk.fullClient.signAndExecuteTransactionBlock({
    transactionBlock: addLiquidityPayload,
    signer: keypair,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });
  
  return result;
}
```

## Testing Your Implementation

### Step 1: Test on Testnet First

Always test on testnet before using mainnet:

```env
NETWORK=testnet
PRIVATE_KEY=your_testnet_wallet_key
POOL_ADDRESS=0x...testnet_pool_address
```

### Step 2: Verify SDK Initialization

Check the logs to ensure SDK initializes without errors:

```bash
npm run dev
```

Look for:
- ✅ "SDK initialized with address: 0x..."
- ✅ No initialization errors

### Step 3: Test Individual Functions

Test each function separately:

1. **Test pool info retrieval**:
   - Verify it returns correct current tick and price
   
2. **Test position retrieval**:
   - Check it finds your positions correctly
   
3. **Test rebalance logic**:
   - Verify it correctly identifies when rebalancing is needed
   
4. **Test transactions** (with small amounts):
   - Try removing and adding liquidity
   - Verify transactions succeed on-chain

### Step 4: Monitor First Rebalances

When running on mainnet:
1. Start with small liquidity amounts
2. Watch the first few rebalances closely
3. Verify transactions complete successfully
4. Check gas costs are reasonable
5. Confirm positions are created correctly

## Common Issues and Solutions

### Issue: "SDK is not properly initialized"

**Solution**: 
- Verify all package addresses are correctly set
- Check that addresses match your network (mainnet/testnet)
- Ensure addresses are current (not from old deployment)

### Issue: "Transaction failed with insufficient gas"

**Solution**:
- Increase `GAS_BUDGET` in `.env`
- Check your wallet has enough SUI for gas

### Issue: "Invalid pool address"

**Solution**:
- Verify the pool exists on your target network
- Check the pool address is correct
- Ensure it's a Cetus CLMM pool

### Issue: "Position not found"

**Solution**:
- Verify you have an open position in the pool
- Check the position hasn't been closed
- Ensure you're using the correct wallet address

## Advanced Topics

### Custom Range Strategies

Implement custom range calculation logic in `src/services/monitor.ts`:

```typescript
calculateOptimalRange(currentTick: number, poolInfo: PoolInfo): { lower: number; upper: number } {
  // Example: Wider ranges for volatile pairs
  const volatility = this.estimateVolatility(poolInfo);
  const rangeMultiplier = volatility > 0.1 ? 2 : 1;
  
  const baseRange = poolInfo.tickSpacing * 10 * rangeMultiplier;
  const lower = Math.floor((currentTick - baseRange) / poolInfo.tickSpacing) * poolInfo.tickSpacing;
  const upper = Math.ceil((currentTick + baseRange) / poolInfo.tickSpacing) * poolInfo.tickSpacing;
  
  return { lower, upper };
}
```

### Transaction Retry Logic

Add retry logic for failed transactions:

```typescript
async executeWithRetry(transaction: any, maxRetries: number = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.executeTransaction(transaction);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await this.delay(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

### Multiple Pool Management

Extend the bot to manage multiple pools:

```typescript
// In bot.ts
async performAllChecks(): Promise<void> {
  const pools = [config.pool1Address, config.pool2Address, config.pool3Address];
  
  await Promise.all(
    pools.map(pool => this.rebalanceService.checkAndRebalance(pool))
  );
}
```

## Resources

- **Cetus Documentation**: https://cetus-1.gitbook.io/cetus-developer-docs/
- **Cetus SDK Repository**: https://github.com/CetusProtocol/cetus-clmm-sui-sdk
- **Cetus SDK NPM**: https://www.npmjs.com/package/@cetusprotocol/cetus-sui-clmm-sdk
- **Sui Documentation**: https://docs.sui.io/
- **Sui TypeScript SDK**: https://sdk.mystenlabs.com/typescript

## Getting Help

If you encounter issues:

1. Check the Cetus documentation for updated contract addresses
2. Review the SDK examples in the GitHub repository
3. Verify your network configuration matches the target network
4. Test each component individually before running the full bot
5. Start with testnet and small amounts

## Contributing

If you successfully implement the SDK integration, consider:
- Sharing your configuration template (without private keys!)
- Contributing back to this repository
- Documenting any issues you encountered and how you solved them

---

**Remember**: This bot is a framework. The actual trading logic and SDK integration are your responsibility. Always test thoroughly and start with small amounts.
