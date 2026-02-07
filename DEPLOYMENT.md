# Deployment Guide

This guide explains different ways to deploy and run the Cetus Liquidity Rebalance Bot.

## Option 1: Direct Execution

The simplest way to run the bot:

```bash
# Copy and configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Install and run
npm install
npm run build
npm start
```

## Option 2: Using the Startup Script

For convenience, use the provided startup script:

```bash
chmod +x start.sh
./start.sh
```

## Option 3: Systemd Service (Linux)

For running the bot as a system service:

### 1. Create service file

Create `/etc/systemd/system/cetus-bot.service`:

```ini
[Unit]
Description=Cetus Liquidity Rebalance Bot
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/Cetus-liquidity-
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:/var/log/cetus-bot.log
StandardError=append:/var/log/cetus-bot-error.log

[Install]
WantedBy=multi-user.target
```

### 2. Enable and start service

```bash
sudo systemctl daemon-reload
sudo systemctl enable cetus-bot
sudo systemctl start cetus-bot
sudo systemctl status cetus-bot
```

### 3. View logs

```bash
sudo journalctl -u cetus-bot -f
```

## Option 4: Docker (Future Enhancement)

Docker support can be added in future versions. Example Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["npm", "start"]
```

## Option 5: PM2 Process Manager

Using PM2 for process management:

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start dist/index.js --name cetus-bot

# View logs
pm2 logs cetus-bot

# Auto-restart on system reboot
pm2 startup
pm2 save
```

## Option 6: Screen/Tmux Session

For simple background execution:

### Using screen:
```bash
screen -S cetus-bot
npm start
# Press Ctrl+A, then D to detach
# screen -r cetus-bot to reattach
```

### Using tmux:
```bash
tmux new -s cetus-bot
npm start
# Press Ctrl+B, then D to detach
# tmux attach -t cetus-bot to reattach
```

## Monitoring

### Check if bot is running:

```bash
# PM2
pm2 status

# Systemd
sudo systemctl status cetus-bot

# Process
ps aux | grep "node.*index.js"
```

### View logs:

The bot logs to stdout/stderr. Redirect as needed:

```bash
# To file
npm start > bot.log 2>&1

# With systemd
sudo journalctl -u cetus-bot -f

# With PM2
pm2 logs cetus-bot
```

## Best Practices

1. **Use a dedicated server or VPS** for 24/7 operation
2. **Set up monitoring** to alert you if the bot stops
3. **Backup your .env file** securely
4. **Rotate logs** to prevent disk space issues
5. **Test on testnet** before mainnet deployment
6. **Start with small amounts** to verify everything works
7. **Monitor the first few rebalances** manually

## Security Hardening

1. **File Permissions**:
   ```bash
   chmod 600 .env  # Only owner can read/write
   chmod 700 dist/  # Only owner can access
   ```

2. **Firewall**:
   - Only allow necessary outbound connections
   - Block all inbound connections if not needed

3. **User Isolation**:
   - Run bot as non-root user
   - Use dedicated user account

4. **Secrets Management**:
   - Consider using environment variable injection
   - Use encrypted storage for private keys
   - Implement key rotation if possible

## Troubleshooting Deployment

### Bot stops unexpectedly:
- Check system resources (memory, disk space)
- Review error logs
- Verify network connectivity
- Check SUI node availability

### Out of memory errors:
- Increase Node.js heap size: `NODE_OPTIONS="--max-old-space-size=4096" npm start`
- Monitor memory usage with `htop` or similar

### Network issues:
- Verify RPC endpoint is accessible
- Check firewall settings
- Test with curl: `curl -X POST YOUR_RPC_URL -H "Content-Type: application/json"`

## Updating the Bot

```bash
# Stop the bot
pm2 stop cetus-bot  # or sudo systemctl stop cetus-bot

# Pull latest changes
git pull

# Rebuild
npm install
npm run build

# Restart
pm2 start cetus-bot  # or sudo systemctl start cetus-bot
```

## Multiple Instances

To run multiple bots for different pools:

```bash
# Create separate directories
mkdir pool1 pool2
cp -r src package.json tsconfig.json pool1/
cp -r src package.json tsconfig.json pool2/

# Configure each with different .env
cd pool1 && cp ../.env.example .env && nano .env
cd ../pool2 && cp ../.env.example .env && nano .env

# Run each instance
cd pool1 && npm install && npm run build && pm2 start dist/index.js --name pool1-bot
cd ../pool2 && npm install && npm run build && pm2 start dist/index.js --name pool2-bot
```
