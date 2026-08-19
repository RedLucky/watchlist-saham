
import { getActiveProvider } from './src/lib/dataService.js';
import { scoreAllStocks } from './src/lib/scoring/index.js';
import { getModeConfig, getStyleConfig } from './src/lib/modes.js';
import { calculateSectorStrengths } from './src/lib/sectorRotation.js';
import yf from 'yahoo-finance2';

async function test() {
  const provider = getActiveProvider();
  console.log('Fetching from provider...');
  const stocks = await provider.getStocks();
  console.log('Fetched', stocks.length, 'stocks.');
  
  if (stocks.length > 0) {
    const marketData = await provider.getMarketData();
    const sectorPerf = await provider.getSectorPerformance();
    const { map: sectorMap } = calculateSectorStrengths(sectorPerf);
    
    console.log('Sample stock data:', Object.keys(stocks[0]));
    
    const modeConfig = getModeConfig('growth');
    const styleConfig = getStyleConfig('swing');
    
    console.log('Scoring stocks...');
    const scored = scoreAllStocks(stocks, modeConfig.weights, styleConfig, sectorMap);
    console.log('Total scored non-filtered:', scored.length);
    if(scored.length > 0) {
        console.log('Highest score:', scored[0].score, 'for', scored[0].ticker);
    } else {
        console.log('No stocks passed hardFilter or scored anything.');
    }
  }
}
test().catch(console.error);

