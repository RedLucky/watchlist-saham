import { MockProvider } from './providers/MockProvider';
import { DatabaseProvider } from './providers/DatabaseProvider';

const providerType = process.env.DATA_PROVIDER || 'database';

let activeProvider;

if (providerType === 'database') {
  activeProvider = new DatabaseProvider();
} else {
  activeProvider = new MockProvider();
}

/**
 * Returns the currently active data provider based on environment configuration.
 */
export function getActiveProvider() {
  return activeProvider;
}
