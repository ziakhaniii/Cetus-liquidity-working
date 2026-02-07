# Quick Start Guide

Get your Cetus Liquidity Rebalance Bot running in 5 minutes!

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ A Sui wallet with some SUI for gas
- ✅ Your wallet's private key
- ✅ A Cetus pool address you want to manage

## 5-Minute Setup

### Step 1: Install (1 minute)

```bash
# Clone the repository
git clone https://github.com/daniel4e393653-cmd/Cetus-liquidity-.git
cd Cetus-liquidity-

# Install dependencies
npm install
```

### Step 2: Configure (2 minutes)

```bash
# Copy the example configuration
cp .env.example .env

# Edit the configuration
nano .env  # or use your favorite editor
```

**Minimum required configuration:**
```env
PRIVATE_KEY=your_64_character_hex_private_key_here
POOL_ADDRESS=0x...your_pool_address_here
```

### Step 3: Build (1 minute)

```bash
npm run build
```

### Step 4: Test (30 seconds)

First, test on testnet:
```env
# In your .env file
NETWORK=testnet
```

### Step 5: Run (30 seconds)

```bash
# Start the bot
npm start

# Or use the startup script
./start.sh
```

## What Happens Next?

1. **Initialization** (~5 seconds)
   - Bot connects to Sui network
   - Loads your wallet
   - Initializes Cetus SDK

2. **First Check** (immediate)
   - Checks your positions
   - Analyzes if rebalancing is needed
   - Logs the status

3. **Monitoring** (ongoing)
   - Checks positions every 5 minutes (configurable)
   - Automatically rebalances when needed
   - Logs all activities

## Expected Output

When you start the bot, you should see:

```
[2026-02-07T12:00:00.000Z] [INFO] ========================================
[2026-02-07T12:00:00.000Z] [INFO] Cetus Liquidity Rebalance Bot
[2026-02-07T12:00:00.000Z] [INFO] ========================================
[2026-02-07T12:00:00.100Z] [INFO] Initializing Cetus Rebalance Bot...
[2026-02-07T12:00:00.500Z] [INFO] Initializing Sui client with RPC: https://...
[2026-02-07T12:00:01.000Z] [INFO] Initializing Cetus SDK for mainnet
[2026-02-07T12:00:01.200Z] [INFO] SDK initialized with address: 0x...
[2026-02-07T12:00:01.300Z] [INFO] Bot initialized successfully
[2026-02-07T12:00:01.400Z] [INFO] Starting Cetus Rebalance Bot...
[2026-02-07T12:00:01.500Z] [INFO] === Performing position check ===
...
```

## Verification Checklist

✅ **Bot started successfully**
- You see "Bot initialized successfully" message
- No error messages in the logs

✅ **Network connection working**
- Bot connects to Sui RPC
- Can query pool information

✅ **Wallet loaded**
- Your wallet address is displayed
- Can check balances

✅ **Pool found**
- Pool information is retrieved
- Current tick is displayed

## Common First-Time Issues

### Issue: "Missing required environment variable"
**Fix**: Make sure you've set `PRIVATE_KEY` and `POOL_ADDRESS` in `.env`

### Issue: "Invalid private key format"
**Fix**: 
- Remove any `0x` prefix from your private key
- Ensure it's exactly 64 hexadecimal characters
- Don't use quotes around the key

### Issue: "Failed to initialize Cetus SDK"
**Fix**:
- Check your network connection
- Verify the RPC endpoint is accessible
- Try using `NETWORK=testnet` first

### Issue: "Cannot find module"
**Fix**:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Next Steps

1. **Monitor Initial Behavior**
   - Watch the logs for the first few checks
   - Verify it's detecting positions correctly
   - Check that thresholds are appropriate

2. **Optimize Configuration**
   - Adjust `CHECK_INTERVAL` based on volatility
   - Tune `REBALANCE_THRESHOLD` based on gas costs
   - See [CONFIGURATION.md](CONFIGURATION.md) for details

3. **Set Up Production**
   - Use a process manager (PM2, systemd)
   - Configure log rotation
   - Set up monitoring/alerts
   - See [DEPLOYMENT.md](DEPLOYMENT.md) for details

## Quick Commands Reference

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Build only
npm run build

# Clean build artifacts
npm run clean

# Stop the bot
# Press Ctrl+C in the terminal
```

## Getting Help

**Before asking for help, check:**
1. Error messages in the logs
2. This Quick Start guide
3. [README.md](README.md) for detailed docs
4. [CONFIGURATION.md](CONFIGURATION.md) for config help
5. [DEPLOYMENT.md](DEPLOYMENT.md) for deployment help

**Still need help?**
- Open an issue on GitHub with:
  - Your configuration (without private key!)
  - Error messages
  - What you've tried
  - Log output

## Safety Reminders

⚠️ **Before using real funds:**
1. Test on testnet first
2. Start with small amounts
3. Monitor the first few rebalances manually
4. Verify gas costs are acceptable
5. Ensure your strategy is profitable

🔒 **Security:**
- Never share your private key
- Never commit `.env` to git
- Use a dedicated wallet for the bot
- Keep your wallet secure

## Success Criteria

Your bot is working correctly when:
- ✅ Starts without errors
- ✅ Successfully connects to Sui network
- ✅ Finds and monitors your pool
- ✅ Performs periodic checks
- ✅ Rebalances when needed
- ✅ Logs all activities clearly

## Performance Expectations

**Typical behavior:**
- Check interval: 5 minutes (300 seconds)
- Rebalance frequency: Varies by volatility (could be 0-10+ times per day)
- Gas per rebalance: ~0.1-0.5 SUI (network dependent)
- In-range time: Target 80-95%

**Adjust if:**
- Rebalancing too often → Increase threshold
- Missing rebalances → Decrease threshold or interval
- High gas costs → Increase interval or threshold

---

🎉 **Congratulations!** Your bot is now running. Monitor it for the first day and adjust as needed.

For advanced configuration and optimization, see the full documentation.
