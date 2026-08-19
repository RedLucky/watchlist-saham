import { DataProvider } from './DataProvider';
import { mockStocks, marketData } from '@/data/mockStocks';

export class MockProvider extends DataProvider {
  async getStocks() {
    return mockStocks;
  }

  async getMarketData() {
    return {
      indexName: marketData.index.name,
      indexValue: marketData.index.value,
      indexChange: marketData.index.change,
      indexTrend: marketData.index.trend,
      volumeVsAvg: marketData.volumeVsAvg,
      advanceDecline: marketData.advanceDecline,
    };
  }

  async getSectorPerformance() {
    return marketData.sectorPerformance;
  }
}
