# Configuration Guide

This guide provides detailed information about all configuration options and best practices.

## Environment Variables Reference

### Network Configuration

#### NETWORK
- **Type**: `mainnet` | `testnet`
- **Default**: `mainnet`
- **Description**: Which Sui network to connect to
- **Example**: `NETWORK=testnet`

#### SUI_RPC_URL
- **Type**: String (URL)
- **Default**: Public RPC endpoint for selected network
- **Description**: Custom Sui RPC endpoint (optional)
- **Example**: `SUI_RPC_URL=https://your-custom-rpc.example.com`
- **Notes**: 
  - Leave empty to use default public endpoints
  - Use private RPC for better reliability and rate limits

### Wallet Configuration

#### PRIVATE_KEY
- **Type**: String (64-character hex)
- **Required**: Yes
- **Description**: Your Sui wallet private key
- **Example**: `PRIVATE_KEY=1234567890abcdef...` (64 characters)
- **Security**: 
  - Never commit this to git
  - Never share publicly
  - Use a dedicated wallet for the bot
  - Store securely (encrypted if possible)

### Bot Behavior

#### CHECK_INTERVAL
- **Type**: Number (seconds)
- **Default**: `300` (5 minutes)
- **Description**: How often to check positions
- **Example**: `CHECK_INTERVAL=600`
- **Recommendations**:
  - Stable markets: 600-1800 (10-30 minutes)
  - Volatile markets: 180-300 (3-5 minutes)
  - High gas cost: Increase interval
  - Low gas cost: Decrease for more responsive rebalancing

#### REBALANCE_THRESHOLD
- **Type**: Number (decimal percentage)
- **Default**: `0.05` (5%)
- **Description**: Trigger rebalance when price is within this % of range boundary
- **Example**: `REBALANCE_THRESHOLD=0.10` (10%)
- **Recommendations**:
  - Conservative (less rebalancing): 0.10-0.20 (10-20%)
  - Balanced: 0.05-0.10 (5-10%)
  - Aggressive (more rebalancing): 0.02-0.05 (2-5%)
  - Consider gas costs vs. out-of-range time

### Pool Configuration

#### POOL_ADDRESS
- **Type**: String (Sui address)
- **Required**: Yes
- **Description**: The Cetus pool address to manage
- **Example**: `POOL_ADDRESS=0x1234...abcd`
- **How to find**:
  1. Visit Cetus DEX
  2. Select your pool
  3. Copy the pool address from URL or pool info

### Position Configuration

#### LOWER_TICK / UPPER_TICK
- **Type**: Number (integer)
- **Default**: Auto-calculated
- **Description**: Manual tick boundaries for your position
- **Example**: 
  ```
  LOWER_TICK=-100
  UPPER_TICK=100
  ```
- **Notes**:
  - Leave empty for automatic range calculation
  - Must be multiples of tick spacing
  - Wider range = less rebalancing, lower fees
  - Narrower range = more fees, more rebalancing

#### RANGE_WIDTH
- **Type**: Number (ticks)
- **Default**: `tick_spacing * 10`
- **Description**: Width of the range in ticks (used for auto-calculation)
- **Example**: `RANGE_WIDTH=200`
- **Recommendations**:
  - Stablecoin pairs: 20-50 ticks
  - Correlated assets: 50-100 ticks
  - Volatile pairs: 100-500 ticks

#### TOKEN_A_AMOUNT / TOKEN_B_AMOUNT
- **Type**: String (amount with decimals)
- **Default**: Not set
- **Description**: Initial token amounts for new positions
- **Example**: 
  ```
  TOKEN_A_AMOUNT=1000.5
  TOKEN_B_AMOUNT=500.25
  ```
- **Notes**:
  - Required for creating new positions
  - Should be proportional to current price
  - Use decimals appropriate for token

### Risk Management

#### MAX_SLIPPAGE
- **Type**: Number (decimal percentage)
- **Default**: `0.01` (1%)
- **Description**: Maximum acceptable slippage for swaps
- **Example**: `MAX_SLIPPAGE=0.005` (0.5%)
- **Recommendations**:
  - Stable/liquid pools: 0.001-0.01 (0.1-1%)
  - Volatile pools: 0.01-0.05 (1-5%)
  - Large positions: Lower slippage
  - Small positions: Can accept higher slippage

#### GAS_BUDGET
- **Type**: Number (MIST)
- **Default**: `100000000` (0.1 SUI)
- **Description**: Maximum gas budget per transaction
- **Example**: `GAS_BUDGET=200000000` (0.2 SUI)
- **Notes**:
  - 1 SUI = 1,000,000,000 MIST
  - Increase if transactions fail with "InsufficientGas"
  - Monitor actual gas usage and adjust

### Logging

#### LOG_LEVEL
- **Type**: `debug` | `info` | `warn` | `error`
- **Default**: `info`
- **Description**: Minimum log level to display
- **Example**: `LOG_LEVEL=debug`
- **Levels**:
  - `debug`: All messages (very verbose)
  - `info`: Normal operation messages
  - `warn`: Warnings only
  - `error`: Errors only

#### VERBOSE_LOGS
- **Type**: Boolean
- **Default**: `false`
- **Description**: Include detailed data in logs
- **Example**: `VERBOSE_LOGS=true`
- **Notes**:
  - Helpful for debugging
  - Creates larger log files
  - May expose sensitive data

## Configuration Examples

### Example 1: Conservative Strategy (Stablecoin Pool)

```env
NETWORK=mainnet
PRIVATE_KEY=your_key_here
POOL_ADDRESS=0x...

# Check every 15 minutes
CHECK_INTERVAL=900

# Rebalance when within 15% of boundary
REBALANCE_THRESHOLD=0.15

# Tight range for stablecoins
RANGE_WIDTH=30

# Low slippage for stablecoins
MAX_SLIPPAGE=0.002

# Standard gas
GAS_BUDGET=100000000

LOG_LEVEL=info
VERBOSE_LOGS=false
```

### Example 2: Aggressive Strategy (Volatile Pool)

```env
NETWORK=mainnet
PRIVATE_KEY=your_key_here
POOL_ADDRESS=0x...

# Check every 3 minutes
CHECK_INTERVAL=180

# Rebalance when within 5% of boundary
REBALANCE_THRESHOLD=0.05

# Wide range for volatile pairs
RANGE_WIDTH=300

# Higher slippage tolerance
MAX_SLIPPAGE=0.03

# Higher gas budget for complex transactions
GAS_BUDGET=200000000

LOG_LEVEL=debug
VERBOSE_LOGS=true
```

### Example 3: Balanced Strategy

```env
NETWORK=mainnet
PRIVATE_KEY=your_key_here
POOL_ADDRESS=0x...

# Check every 5 minutes
CHECK_INTERVAL=300

# Standard rebalance threshold
REBALANCE_THRESHOLD=0.08

# Medium range
RANGE_WIDTH=150

# Moderate slippage
MAX_SLIPPAGE=0.01

# Standard gas
GAS_BUDGET=100000000

LOG_LEVEL=info
VERBOSE_LOGS=false
```

## Best Practices

### 1. Start Conservative
- Begin with longer intervals and wider thresholds
- Monitor performance for a few days
- Gradually optimize based on results

### 2. Consider Gas Costs
- Calculate: (gas_cost * rebalances_per_day) vs. potential_fee_gains
- Increase thresholds if gas costs are too high
- Use longer check intervals during low volatility

### 3. Pool-Specific Configuration
- Research the pool's historical volatility
- Check typical daily price range
- Observe when the pool is most active
- Adjust range width accordingly

### 4. Monitor and Adjust
- Track rebalance frequency
- Measure fee collection vs. gas costs
- Compare in-range time percentage
- Adjust configuration based on performance

### 5. Test First
- Always test on testnet first
- Start with small amounts on mainnet
- Gradually increase position size
- Keep detailed records of performance

### 6. Security
- Use environment-specific .env files
- Never commit .env to version control
- Rotate private keys periodically
- Use separate wallets for different strategies

## Troubleshooting Configuration

### Too Many Rebalances
**Problem**: Bot rebalances too often, high gas costs

**Solutions**:
- Increase `REBALANCE_THRESHOLD` (e.g., from 0.05 to 0.10)
- Increase `CHECK_INTERVAL` (e.g., from 300 to 600)
- Widen `RANGE_WIDTH`

### Not Rebalancing When Expected
**Problem**: Position goes out of range without rebalancing

**Solutions**:
- Decrease `REBALANCE_THRESHOLD`
- Decrease `CHECK_INTERVAL`
- Check logs for errors
- Verify sufficient gas balance

### High Slippage
**Problem**: Transactions failing due to slippage

**Solutions**:
- Increase `MAX_SLIPPAGE`
- Use better RPC endpoint
- Rebalance during lower volatility
- Check pool liquidity

### Transaction Failures
**Problem**: Transactions consistently failing

**Solutions**:
- Increase `GAS_BUDGET`
- Check wallet has sufficient SUI balance
- Verify RPC endpoint is working
- Check network congestion

## Advanced Configuration

### Multiple Strategies
Run multiple bots with different configurations:

```bash
# Conservative bot
BOT_CONFIG=conservative.env npm start

# Aggressive bot  
BOT_CONFIG=aggressive.env npm start
```

### Dynamic Configuration
For advanced users, configuration can be modified at runtime by updating the config service.

### Custom Tick Calculation
Implement custom logic in `src/services/monitor.ts` for specific range calculation strategies.
