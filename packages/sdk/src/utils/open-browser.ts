import { exec } from 'node:child_process';
import { platform } from 'node:os';

export function openBrowser(url: string): void {
  const plat = platform();
  let cmd: string;
  if (plat === 'darwin') cmd = `open "${url}"`;
  else if (plat === 'win32') cmd = `start "" "${url}"`;
  else cmd = `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      console.log(`Open ${url} in your browser.`);
    }
  });
}
