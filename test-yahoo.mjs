import yahooFinance from 'yahoo-finance2';
async function test() {
  try {
    const res = await yahooFinance.quote('BBCA.JK');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();
