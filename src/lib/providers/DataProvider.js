/**
 * DataProvider Interface
 * Base class for all stock data sources to ensure a consistent API structure.
 */
export class DataProvider {
  /**
   * Retrieves array of formatted stock objects.
   * @returns {Promise<Array>} Array of stock objects
   */
  async getStocks() {
    throw new Error('getStocks() must be implemented by subclass');
  }

  /**
   * Retrieves market overview data (IHSG).
   * @returns {Promise<Object>} Market overview data
   */
  async getMarketData() {
    throw new Error('getMarketData() must be implemented by subclass');
  }

  /**
   * Retrieves sector performance metrics.
   * @returns {Promise<Object>} Sector performance dict
   */
  async getSectorPerformance() {
    throw new Error('getSectorPerformance() must be implemented by subclass');
  }
}
