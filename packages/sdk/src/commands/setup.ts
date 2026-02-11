export async function setupCommand(): Promise<void> {
  console.log('AgentPay Setup');
  console.log('══════════════\n');
  console.log('Opening setup form in browser...\n');

  const { requestBrowserSetup } = await import('../server/setup-server.js');
  const result = await requestBrowserSetup();

  if (result.completed) {
    console.log('\nSetup complete! Next steps:');
    console.log('  agentpay status     Check your wallet');
    console.log('  agentpay budget     View/adjust budget');
  }
}
