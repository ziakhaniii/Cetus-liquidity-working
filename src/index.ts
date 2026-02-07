import { CetusRebalanceBot } from './bot';
import { logger } from './utils/logger';

async function main() {
  try {
    logger.info('========================================');
    logger.info('Cetus Liquidity Rebalance Bot');
    logger.info('========================================');

    // Create and start the bot
    const bot = new CetusRebalanceBot();
    
    // Display initial status
    const status = await bot.getStatus();
    logger.info('Bot Status:', status);

    // Start the bot
    await bot.start();

    // Keep the process running
    logger.info('Bot is running. Press Ctrl+C to stop.');

  } catch (error) {
    logger.error('Fatal error occurred', error);
    process.exit(1);
  }
}

// Run the bot
main().catch((error) => {
  logger.error('Unhandled error in main', error);
  process.exit(1);
});
