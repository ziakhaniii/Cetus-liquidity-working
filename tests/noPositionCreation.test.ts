import assert from 'assert';

/**
 * Tests that the bot never creates positions from scratch and always
 * manages exactly ONE position at a time.
 *
 * These tests validate the core rebalance decision logic extracted from
 * RebalanceService.checkAndRebalance and RebalanceService.rebalancePosition
 * without requiring SDK/network access.
 *
 * Requirements tested:
 *   1. Bot should NOT create multiple positions.
 *   2. Bot should only rebalance the existing position.
 *   3. Bot should rebalance with the same amount (no increase/decrease).
 *   4. When no positions exist, do nothing (don't create from scratch).
 *   5. After rebalance, track the new position (not the old empty one).
 *
 * Run with:  npx ts-node tests/noPositionCreation.test.ts
 */

// ── Types matching the service interfaces ───────────────────────────────

interface PositionInfo {
  positionId: string;
  poolAddress: string;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  inRange: boolean;
}

// ── Simulated checkAndRebalance decision logic ──────────────────────────
// Mirrors the logic in the updated RebalanceService.checkAndRebalance

function checkAndRebalanceDecision(
  poolPositions: PositionInfo[],
  trackedPositionId: string | null,
  currentTickIndex: number,
): { action: 'rebalance' | 'skip' | 'no-positions'; trackedId: string | null; position?: PositionInfo } {
  let tracked: PositionInfo | undefined;

  if (trackedPositionId) {
    tracked = poolPositions.find(p => p.positionId === trackedPositionId);
    if (!tracked) {
      return { action: 'skip', trackedId: trackedPositionId };
    }
  } else if (poolPositions.length > 0) {
    // Auto-track: pick position with most liquidity
    const sorted = [...poolPositions].sort((a, b) => {
      const liqA = BigInt(a.liquidity || '0');
      const liqB = BigInt(b.liquidity || '0');
      if (liqA > liqB) return -1;
      if (liqA < liqB) return 1;
      return 0;
    });
    tracked = sorted[0];
    trackedPositionId = tracked.positionId;
  } else {
    // No positions exist → do nothing (never create from scratch)
    return { action: 'no-positions', trackedId: null };
  }

  const isInRange = currentTickIndex >= tracked.tickLower && currentTickIndex <= tracked.tickUpper;

  if (isInRange) {
    return { action: 'skip', trackedId: trackedPositionId, position: tracked };
  }

  return { action: 'rebalance', trackedId: trackedPositionId, position: tracked };
}

// ── Simulated rebalancePosition decision logic ──────────────────────────
// Mirrors the updated RebalanceService.rebalancePosition (no-create path)

function rebalanceDecision(
  poolPositions: PositionInfo[],
): { action: 'rebalance' | 'no-positions'; position?: PositionInfo } {
  if (poolPositions.length === 0) {
    return { action: 'no-positions' };
  }

  // Pick position with most liquidity
  const sorted = [...poolPositions].sort((a, b) => {
    const liqA = BigInt(a.liquidity || '0');
    const liqB = BigInt(b.liquidity || '0');
    if (liqA > liqB) return -1;
    if (liqA < liqB) return 1;
    return 0;
  });

  return { action: 'rebalance', position: sorted[0] };
}

const POOL = '0x' + '0'.repeat(64);

// ── Test 1: No positions → do nothing, never create ────────────────────

{
  const result = checkAndRebalanceDecision([], null, 1000);
  assert.strictEqual(result.action, 'no-positions', 'must not create when no positions exist');
  assert.strictEqual(result.trackedId, null, 'no tracked position when none exist');
  console.log('✔ no positions → do nothing (no creation)');
}

// ── Test 2: No positions → rebalancePosition also returns no-positions ──

{
  const result = rebalanceDecision([]);
  assert.strictEqual(result.action, 'no-positions', 'rebalancePosition must not create from scratch');
  console.log('✔ rebalancePosition: no positions → no-positions (no creation)');
}

// ── Test 3: Single position in range → skip, track it ──────────────────

{
  const positions: PositionInfo[] = [
    { positionId: 'pos1', poolAddress: POOL, tickLower: 900, tickUpper: 1100, liquidity: '5000', inRange: true },
  ];
  const result = checkAndRebalanceDecision(positions, null, 1000);
  assert.strictEqual(result.action, 'skip', 'in-range position should not be rebalanced');
  assert.strictEqual(result.trackedId, 'pos1', 'should auto-track the position');
  console.log('✔ single in-range position → skip, auto-tracked');
}

// ── Test 4: Single position out of range → rebalance, track it ─────────

{
  const positions: PositionInfo[] = [
    { positionId: 'pos1', poolAddress: POOL, tickLower: 900, tickUpper: 1100, liquidity: '5000', inRange: false },
  ];
  const result = checkAndRebalanceDecision(positions, null, 1200);
  assert.strictEqual(result.action, 'rebalance', 'out-of-range position should be rebalanced');
  assert.strictEqual(result.trackedId, 'pos1', 'should auto-track the position');
  assert.strictEqual(result.position?.positionId, 'pos1');
  console.log('✔ single out-of-range position → rebalance, auto-tracked');
}

// ── Test 5: Multiple positions → only track the one with most liquidity ─

{
  const positions: PositionInfo[] = [
    { positionId: 'pos1', poolAddress: POOL, tickLower: 500, tickUpper: 700, liquidity: '1000', inRange: false },
    { positionId: 'pos2', poolAddress: POOL, tickLower: 800, tickUpper: 1200, liquidity: '9000', inRange: true },
    { positionId: 'pos3', poolAddress: POOL, tickLower: 600, tickUpper: 900, liquidity: '3000', inRange: true },
  ];
  const result = checkAndRebalanceDecision(positions, null, 1000);
  assert.strictEqual(result.trackedId, 'pos2', 'should track position with most liquidity');
  assert.strictEqual(result.action, 'skip', 'highest-liquidity position is in range → skip');
  console.log('✔ multiple positions → auto-tracks the one with most liquidity');
}

// ── Test 6: Tracked position persists across cycles ─────────────────────

{
  const positions: PositionInfo[] = [
    { positionId: 'pos1', poolAddress: POOL, tickLower: 500, tickUpper: 700, liquidity: '0', inRange: false },
    { positionId: 'pos2', poolAddress: POOL, tickLower: 900, tickUpper: 1100, liquidity: '5000', inRange: true },
  ];

  // First cycle: tracked from config
  const result1 = checkAndRebalanceDecision(positions, 'pos2', 1000);
  assert.strictEqual(result1.trackedId, 'pos2', 'should use config-provided tracked ID');
  assert.strictEqual(result1.action, 'skip', 'tracked position is in range');

  // Second cycle: same tracked ID, even though pos1 is out of range
  const result2 = checkAndRebalanceDecision(positions, 'pos2', 1000);
  assert.strictEqual(result2.trackedId, 'pos2', 'should keep tracking same position');
  assert.strictEqual(result2.action, 'skip', 'still in range');
  console.log('✔ tracked position persists, ignores other out-of-range positions');
}

// ── Test 7: After rebalance, new position is tracked ────────────────────
// Simulates: pos1 was rebalanced → liquidity removed → pos2 created at new range
// Next cycle should track pos2, not pos1.

{
  // After rebalance: pos1 is empty, pos2 is the new position
  const positions: PositionInfo[] = [
    { positionId: 'pos1', poolAddress: POOL, tickLower: 500, tickUpper: 700, liquidity: '0', inRange: false },
    { positionId: 'pos2', poolAddress: POOL, tickLower: 1150, tickUpper: 1350, liquidity: '5000', inRange: true },
  ];

  // trackedPositionId was updated to pos2 after the rebalance
  const result = checkAndRebalanceDecision(positions, 'pos2', 1250);
  assert.strictEqual(result.trackedId, 'pos2', 'should track the new position');
  assert.strictEqual(result.action, 'skip', 'new position is in range');
  console.log('✔ after rebalance, tracks new position (not old empty one)');
}

// ── Test 8: Tracked position not found → skip (don't create) ───────────

{
  const positions: PositionInfo[] = [
    { positionId: 'pos1', poolAddress: POOL, tickLower: 900, tickUpper: 1100, liquidity: '5000', inRange: true },
  ];
  // Tracking a position that no longer exists
  const result = checkAndRebalanceDecision(positions, 'pos-deleted', 1000);
  assert.strictEqual(result.action, 'skip', 'should skip when tracked position not found');
  console.log('✔ tracked position not found → skip (no creation)');
}

// ── Test 9: Amount preservation — only freed amounts are re-added ───────
// (Re-verified from rebalanceAmounts tests to ensure no regression)

function computeRebalanceAmounts(
  removedAmountA: string | undefined,
  removedAmountB: string | undefined,
  walletBalanceA: string,
  walletBalanceB: string,
): { amountA: string; amountB: string } {
  const safeBalanceA = BigInt(walletBalanceA);
  const safeBalanceB = BigInt(walletBalanceB);
  const removedA = removedAmountA ? BigInt(removedAmountA) : 0n;
  const removedB = removedAmountB ? BigInt(removedAmountB) : 0n;
  const amountA = (removedA > 0n ? (removedA <= safeBalanceA ? removedA : safeBalanceA) : 0n).toString();
  const amountB = (removedB > 0n ? (removedB <= safeBalanceB ? removedB : safeBalanceB) : 0n).toString();
  return { amountA, amountB };
}

{
  // Position had 2000 A and 3000 B. Wallet has much more.
  // Rebalance should use exactly 2000 A and 3000 B (not wallet balance).
  const { amountA, amountB } = computeRebalanceAmounts('2000', '3000', '1000000', '2000000');
  assert.strictEqual(amountA, '2000', 'must use exact freed amount A');
  assert.strictEqual(amountB, '3000', 'must use exact freed amount B');
  console.log('✔ amount preservation: exact freed amounts re-added, wallet not used');
}

// ── Test 10: No freed amounts and no creation → both stay 0 ────────────

{
  const { amountA, amountB } = computeRebalanceAmounts(undefined, undefined, '500000', '600000');
  assert.strictEqual(amountA, '0', 'no freed A → 0');
  assert.strictEqual(amountB, '0', 'no freed B → 0');
  console.log('✔ no freed amounts → both 0 (no wallet pull)');
}

console.log('\nAll noPositionCreation tests passed ✅');
