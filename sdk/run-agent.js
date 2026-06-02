const { BankOfAIAgent } = require("./dist/index.js");

async function run() {
  console.log("[Test] Initializing Bank of AI Agent...");
  const agent = new BankOfAIAgent({
    apiKey: "fr_test_key_123",
  });

  console.log("[Test] Running agent opportunity execution...");
  await agent.executeOpportunity({
    asset: "USDC",
    amount: "10000000", // 10 USDC
    strategyAddress: "0x7d9a65d06dcc435a52D5880C6310Bd6E96c156DB",
  });
  console.log("[Test] Run complete.");
}

run().catch(console.error);
