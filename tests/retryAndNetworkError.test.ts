import assert from 'assert';
import { PositionMonitorService } from '../src/services/monitor';
import { BotConfig } from '../src/config';

/**
 * Tests for PositionMonitorService retry logic and network error detection.
 * Run with: npx ts-node tests/retryAndNetworkError.test.ts
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
  const sdkStub = {
    getRpcUrl: () => 'https://test-rpc.example.com',
  } as any;
  return new PositionMonitorService(sdkStub, config);
}

// Access the private methods via bracket notation for testing
function isNetworkError(svc: PositionMonitorService, msg: string): boolean {
  return (svc as any).isNetworkError(msg);
}

async function retryWithBackoff<T>(
  svc: PositionMonitorService,
  operation: () => Promise<T>,
  name: string,
  maxRetries: number = 3,
  delay: number = 10
): Promise<T> {
  return (svc as any).retryWithBackoff(operation, name, maxRetries, delay);
}

// ── isNetworkError detects transient network issues ─────────────────────

{
  const svc = buildService();

  // Should detect as network errors
  const networkMessages = [
    'fetch failed',
    'TypeError: fetch failed',
    'network error occurred',
    'ECONNREFUSED 127.0.0.1:443',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND fullnode.mainnet.sui.io',
    'request timeout',
    'socket hang up',
    'EAI_AGAIN',
    'EHOSTUNREACH',
    'EPIPE',
    'request to https://example.com failed',
    'getaddrinfo ENOTFOUND example.com',
  ];

  for (const msg of networkMessages) {
    assert.strictEqual(isNetworkError(svc, msg), true, `should detect as network error: "${msg}"`);
  }
  console.log('✔ isNetworkError detects transient network errors');

  // Should NOT detect as network errors
  const nonNetworkMessages = [
    'Pool not found: 0x123',
    'Invalid private key format',
    'Insufficient balance',
    'Transaction failed: Unknown error',
  ];

  for (const msg of nonNetworkMessages) {
    assert.strictEqual(isNetworkError(svc, msg), false, `should NOT detect as network error: "${msg}"`);
  }
  console.log('✔ isNetworkError does not false-positive on non-network errors');
}

// ── retryWithBackoff succeeds on first try ──────────────────────────────

async function runAsyncTests() {
  {
    const svc = buildService();
    let callCount = 0;

    const result = await retryWithBackoff(svc, async () => {
      callCount++;
      return 'success';
    }, 'test-immediate', 3, 10);

    assert.strictEqual(result, 'success');
    assert.strictEqual(callCount, 1, 'should only call once on success');
    console.log('✔ retryWithBackoff succeeds immediately');
  }

  // ── retryWithBackoff retries on network error and eventually succeeds ───

  {
    const svc = buildService();
    let callCount = 0;

    const result = await retryWithBackoff(svc, async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error('fetch failed');
      }
      return 'recovered';
    }, 'test-retry', 3, 10);

    assert.strictEqual(result, 'recovered');
    assert.strictEqual(callCount, 3, 'should retry until success');
    console.log('✔ retryWithBackoff retries network errors and recovers');
  }

  // ── retryWithBackoff does NOT retry non-network errors ──────────────────

  {
    const svc = buildService();
    let callCount = 0;

    try {
      await retryWithBackoff(svc, async () => {
        callCount++;
        throw new Error('Pool not found: 0x123');
      }, 'test-no-retry', 3, 10);
      assert.fail('should have thrown');
    } catch (error) {
      assert.strictEqual(callCount, 1, 'should not retry non-network errors');
      assert.ok(error instanceof Error && error.message.includes('Pool not found'));
    }
    console.log('✔ retryWithBackoff does not retry non-network errors');
  }

  // ── retryWithBackoff throws after max retries ───────────────────────────

  {
    const svc = buildService();
    let callCount = 0;

    try {
      await retryWithBackoff(svc, async () => {
        callCount++;
        throw new Error('ETIMEDOUT');
      }, 'test-exhaust', 2, 10);
      assert.fail('should have thrown');
    } catch (error) {
      // maxRetries=2 means attempts 0,1,2 = 3 total attempts
      assert.strictEqual(callCount, 3, 'should exhaust all retries');
      assert.ok(error instanceof Error && error.message.includes('ETIMEDOUT'));
    }
    console.log('✔ retryWithBackoff throws after exhausting retries');
  }

  console.log('\nAll retry and network error tests passed ✅');
}

runAsyncTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
