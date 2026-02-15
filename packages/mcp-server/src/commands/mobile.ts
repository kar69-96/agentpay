import { loadConfig, saveConfig } from '@useagentpay/sdk';

export function mobileCommand(
  mode: string,
  options: { notifyCommand?: string; notifyWebhook?: string },
): void {
  const enabled = mode === 'on';
  if (mode !== 'on' && mode !== 'off') {
    console.error('Usage: agentpay mobile <on|off>');
    process.exit(1);
  }

  const config = loadConfig();
  config.mobileMode = enabled;

  if (options.notifyCommand !== undefined) {
    config.notifyCommand = options.notifyCommand;
  }
  if (options.notifyWebhook !== undefined) {
    config.notifyWebhook = options.notifyWebhook;
  }

  saveConfig(config);

  console.log(`Mobile approval mode: ${enabled ? 'ON' : 'OFF'}`);
  if (enabled) {
    console.log('Approval links will be tunneled via Cloudflare for mobile access.');
    console.log('Requires cloudflared to be installed: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/');
    if (config.notifyCommand) {
      console.log(`Notify command: ${config.notifyCommand}`);
    }
    if (config.notifyWebhook) {
      console.log(`Notify webhook: ${config.notifyWebhook}`);
    }
    if (!config.notifyCommand && !config.notifyWebhook) {
      console.log('\nTip: Set a notification method so you get the approval link on your phone:');
      console.log('  agentpay mobile on --notify-command "open -g {{url}}"');
      console.log('  agentpay mobile on --notify-webhook "https://hooks.example.com/notify"');
    }
  }
}
