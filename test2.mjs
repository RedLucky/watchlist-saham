import { YahooProvider } from './src/lib/providers/YahooProvider.js'; const p = new YahooProvider(); p.getMarketData().then(console.log).catch(console.error);
