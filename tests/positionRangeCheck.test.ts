import assert from 'assert';
import { PositionMonitorService } from '../src/services/monitor';
import { BotConfig } from '../src/config';

/**
 * Tests for the position range-check and rebalance-decision logic.
 *
 * Validates:
 *  1. isPositionInRange correctly classifies in-range / out-of-range positions.
 *  2. calculateOptimalRange preserves the old position's range width when
 *     the preserveRangeWidth parameter is supplied.
 *
 * Run with:  npx ts-node tests/positionRangeCheck.test.ts
 */

const STUB_PRIVATE_KEY = 'a'.repeat(64);
const STUB_POOL_ADDRESS = '0x' + '0'.repeat(64);

function buildService(overrides: Partial<BotConfig> = {}): PositionMonitorService {
  const config: BotConfig = {
    network: 'mainnet',
    privateKey: STUB_PRIVATE_KEY,
    checkInterval: 300,
    rebalanceThreshold: 0.05,
    poolAddress: STUB_POOL_ADDRESS,
    maxSlippage: 0.01,
    gasBudget: 100_000_000,
    logLevel: 'error',
    verboseLogs: false,
    ...overrides,
  };
  const sdkStub = {} as InstanceType<typeof import('../src/services/sdk').CetusSDKService>;
  return new PositionMonitorService(sdkStub, config);
}

// ── isPositionInRange ───────────────────────────────────────────────────

{
  const svc = buildService();

  // Tick inside the range
  assert.strictEqual(svc.isPositionInRange(100, 200, 150), true);
  console.log('✔ tick inside range → in range');

  // Tick exactly on lower bound (inclusive)
  assert.strictEqual(svc.isPositionInRange(100, 200, 100), true);
  console.log('✔ tick on lower bound → in range');

  // Tick exactly on upper bound (inclusive)
  assert.strictEqual(svc.isPositionInRange(100, 200, 200), true);
  console.log('✔ tick on upper bound → in range');

  // Tick below range → out of range
  assert.strictEqual(svc.isPositionInRange(100, 200, 99), false);
  console.log('✔ tick below range → out of range');

  // Tick above range → out of range
  assert.strictEqual(svc.isPositionInRange(100, 200, 201), false);
  console.log('✔ tick above range → out of range');

  // Negative ticks
  assert.strictEqual(svc.isPositionInRange(-200, -100, -150), true);
  console.log('✔ negative tick inside range → in range');

  assert.strictEqual(svc.isPositionInRange(-200, -100, -201), false);
  console.log('✔ negative tick below range → out of range');
}

// ── calculateOptimalRange with preserveRangeWidth ───────────────────────

{
  const svc = buildService(); // no config rangeWidth

  const tickSpacing = 60;

  // Without preserveRangeWidth → tightest range (1 tick spacing)
  {
    const { lower, upper } = svc.calculateOptimalRange(1000, tickSpacing);
    assert.strictEqual(upper - lower, tickSpacing, 'default should be tightest range');
    console.log('✔ no preserveRangeWidth → tightest range');
  }

  // With preserveRangeWidth → centred range using old width
  {
    const oldWidth = 600; // e.g. old position was [700, 1300]
    const { lower, upper } = svc.calculateOptimalRange(1000, tickSpacing, oldWidth);
    // ticksBelow = 300, ticksAbove = 300
    // lower = floor((1000-300)/60)*60 = 660
    // upper = ceil((1000+300)/60)*60  = 1320
    assert.strictEqual(lower, 660, 'preserveRangeWidth lower');
    assert.strictEqual(upper, 1320, 'preserveRangeWidth upper');
    assert.ok(upper - lower >= oldWidth, 'new range should be at least as wide as old');
    console.log('✔ preserveRangeWidth → centred range preserving old width');
  }

  // preserveRangeWidth with negative tick
  {
    const { lower, upper } = svc.calculateOptimalRange(-100, tickSpacing, 600);
    // ticksBelow = 300, ticksAbove = 300
    // lower = floor((-100-300)/60)*60 = floor(-400/60)*60 = -420
    // upper = ceil((-100+300)/60)*60  = ceil(200/60)*60   = 240
    assert.strictEqual(lower, -420);
    assert.strictEqual(upper, 240);
    assert.ok(lower <= -100 && -100 <= upper, 'current tick within new range');
    console.log('✔ preserveRangeWidth with negative tick');
  }

  // preserveRangeWidth should take precedence over config.rangeWidth
  {
    const svcWithConfig = buildService({ rangeWidth: 120 });
    const { lower, upper } = svcWithConfig.calculateOptimalRange(1000, tickSpacing, 600);
    // Should use preserveRangeWidth=600, NOT config rangeWidth=120
    assert.ok(upper - lower > 120, 'preserveRangeWidth should override config');
    console.log('✔ preserveRangeWidth takes precedence over config rangeWidth');
  }
}

// ── shouldRebalance only flags out-of-range positions ───────────────────

{
  const svc = buildService({ rebalanceThreshold: 0.05 });

  const poolInfo = {
    poolAddress: STUB_POOL_ADDRESS,
    currentTickIndex: 150,
    currentSqrtPrice: '0',
    coinTypeA: '',
    coinTypeB: '',
    tickSpacing: 60,
  };

  // Position fully in range, not near boundary
  {
    const pos = {
      positionId: 'p1',
      poolAddress: STUB_POOL_ADDRESS,
      tickLower: 100,
      tickUpper: 200,
      liquidity: '1000',
      tokenA: '',
      tokenB: '',
      inRange: true,
    };
    assert.strictEqual(svc.shouldRebalance(pos, poolInfo), false);
    console.log('✔ position comfortably in range → no rebalance');
  }

  // Position out of range (tick above upper)
  {
    const pos = {
      positionId: 'p2',
      poolAddress: STUB_POOL_ADDRESS,
      tickLower: 100,
      tickUpper: 140,
      liquidity: '1000',
      tokenA: '',
      tokenB: '',
      inRange: false,
    };
    assert.strictEqual(svc.shouldRebalance(pos, poolInfo), true);
    console.log('✔ position out of range → rebalance needed');
  }

  // Position out of range (tick below lower)
  {
    const pos = {
      positionId: 'p3',
      poolAddress: STUB_POOL_ADDRESS,
      tickLower: 160,
      tickUpper: 200,
      liquidity: '1000',
      tokenA: '',
      tokenB: '',
      inRange: false,
    };
    assert.strictEqual(svc.shouldRebalance(pos, poolInfo), true);
    console.log('✔ position out of range (below) → rebalance needed');
  }
}

console.log('\nAll positionRangeCheck tests passed ✅');
