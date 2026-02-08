export interface PassphraseContext {
  action: 'buy' | 'approve';
  merchant?: string;
  amount?: number;
  description?: string;
  txId?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatCurrency(n: number): string {
  return '$' + n.toFixed(2);
}

export function getPassphraseHtml(token: string, context?: PassphraseContext): string {
  const actionLabel = context?.action === 'approve' ? 'Approve Transaction' : 'Approve Purchase';
  const buttonLabel = context?.action === 'approve' ? 'Unlock &amp; Approve' : 'Unlock &amp; Approve';

  let contextHtml = '';
  if (context) {
    const lines: string[] = [];
    if (context.merchant) lines.push(`<div class="detail"><span class="detail-label">Merchant</span><span class="detail-value">${esc(context.merchant)}</span></div>`);
    if (context.amount !== undefined) lines.push(`<div class="detail"><span class="detail-label">Amount</span><span class="detail-value">${formatCurrency(context.amount)}</span></div>`);
    if (context.description) lines.push(`<div class="detail"><span class="detail-label">Description</span><span class="detail-value">${esc(context.description)}</span></div>`);
    if (context.txId) lines.push(`<div class="detail"><span class="detail-label">Transaction</span><span class="detail-value" style="font-family:monospace;font-size:12px;">${esc(context.txId)}</span></div>`);
    if (lines.length > 0) {
      contextHtml = `<div class="card context-card">${lines.join('')}</div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentPay — Passphrase Required</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f5f5f5;
    color: #111;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 40px 16px;
  }
  .container { width: 100%; max-width: 420px; }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
  .card {
    background: #fff;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 16px;
    border: 1px solid #e0e0e0;
  }
  .context-card { padding: 16px 20px; }
  .detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  .detail:last-child { border-bottom: none; }
  .detail-label { font-size: 13px; color: #666; }
  .detail-value { font-size: 14px; font-weight: 600; }
  label { display: block; font-size: 13px; font-weight: 500; color: #333; margin-bottom: 6px; }
  input[type="password"] {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 15px;
    outline: none;
    transition: border-color 0.15s;
  }
  input[type="password"]:focus { border-color: #111; }
  button {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
    margin-top: 16px;
    background: #111;
    color: #fff;
  }
  button:hover { opacity: 0.85; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { color: #c62828; font-size: 13px; margin-top: 10px; }
  .success-screen {
    text-align: center;
    padding: 40px 0;
  }
  .checkmark {
    font-size: 48px;
    margin-bottom: 16px;
  }
  .success-msg {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .success-hint {
    font-size: 13px;
    color: #666;
  }
  .hidden { display: none; }
</style>
</head>
<body>
<div class="container">
  <div id="form-view">
    <h1>AgentPay</h1>
    <p class="subtitle">${esc(actionLabel)}</p>
    ${contextHtml}
    <div class="card">
      <label for="passphrase">Passphrase</label>
      <input type="password" id="passphrase" placeholder="Enter your passphrase" autofocus>
      <div id="error" class="error hidden"></div>
      <button id="submit">${buttonLabel}</button>
    </div>
  </div>
  <div id="success-view" class="hidden">
    <h1>AgentPay</h1>
    <p class="subtitle">${esc(actionLabel)}</p>
    <div class="card">
      <div class="success-screen">
        <div class="checkmark">&#10003;</div>
        <div class="success-msg">Passphrase received</div>
        <div class="success-hint">You can close this tab.</div>
      </div>
    </div>
  </div>
</div>
<script>
(function() {
  var token = ${JSON.stringify(token)};
  var form = document.getElementById('form-view');
  var success = document.getElementById('success-view');
  var input = document.getElementById('passphrase');
  var btn = document.getElementById('submit');
  var errDiv = document.getElementById('error');

  function submit() {
    var passphrase = input.value;
    if (!passphrase) {
      errDiv.textContent = 'Passphrase is required.';
      errDiv.classList.remove('hidden');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    errDiv.classList.add('hidden');

    fetch('/passphrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, passphrase: passphrase })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.error) {
        errDiv.textContent = data.error;
        errDiv.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = '${buttonLabel}';
      } else {
        form.classList.add('hidden');
        success.classList.remove('hidden');
      }
    })
    .catch(function() {
      errDiv.textContent = 'Failed to submit. Is the CLI still running?';
      errDiv.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = '${buttonLabel}';
    });
  }

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') submit();
  });
})();
</script>
</body>
</html>`;
}
