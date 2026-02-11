import type { Transaction } from '../transactions/types.js';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatCurrency(n: number): string {
  return '$' + n.toFixed(2);
}

export function getApprovalHtml(token: string, tx: Transaction): string {
  const lines: string[] = [];
  lines.push(`<div class="detail"><span class="detail-label">Merchant</span><span class="detail-value">${esc(tx.merchant)}</span></div>`);
  lines.push(`<div class="detail"><span class="detail-label">Amount</span><span class="detail-value">${formatCurrency(tx.amount)}</span></div>`);
  lines.push(`<div class="detail"><span class="detail-label">Description</span><span class="detail-value">${esc(tx.description)}</span></div>`);
  if (tx.url) {
    lines.push(`<div class="detail"><span class="detail-label">URL</span><span class="detail-value"><a href="${esc(tx.url)}" target="_blank" rel="noopener" style="color:#111;">${esc(tx.url)}</a></span></div>`);
  }
  lines.push(`<div class="detail"><span class="detail-label">Transaction</span><span class="detail-value" style="font-family:monospace;font-size:12px;">${esc(tx.id)}</span></div>`);
  const contextHtml = `<div class="card context-card">${lines.join('')}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentPay — Approve Purchase</title>
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
  input[type="password"], textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 15px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
  }
  input[type="password"]:focus, textarea:focus { border-color: #111; }
  textarea { resize: vertical; min-height: 60px; margin-top: 8px; }
  .btn-row { display: flex; gap: 12px; margin-top: 16px; }
  .btn-approve, .btn-deny {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .btn-approve { background: #111; color: #fff; }
  .btn-approve:hover { opacity: 0.85; }
  .btn-approve:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-deny { background: #fff; color: #c62828; border: 2px solid #c62828; }
  .btn-deny:hover { opacity: 0.85; }
  .btn-deny:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { color: #c62828; font-size: 13px; margin-top: 10px; }
  .success-screen {
    text-align: center;
    padding: 40px 0;
  }
  .checkmark { font-size: 48px; margin-bottom: 16px; }
  .success-msg { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
  .success-hint { font-size: 13px; color: #666; }
  .hidden { display: none; }
  .reason-section { margin-top: 12px; }
</style>
</head>
<body>
<div class="container">
  <div id="form-view">
    <h1>AgentPay</h1>
    <p class="subtitle">Approve Purchase</p>
    ${contextHtml}
    <div class="card">
      <label for="passphrase">Passphrase</label>
      <input type="password" id="passphrase" placeholder="Enter your passphrase" autofocus>
      <div id="reason-section" class="reason-section hidden">
        <label for="reason">Reason (optional)</label>
        <textarea id="reason" placeholder="Why are you denying this purchase?"></textarea>
      </div>
      <div id="error" class="error hidden"></div>
      <div class="btn-row">
        <button class="btn-approve" id="btn-approve">Approve</button>
        <button class="btn-deny" id="btn-deny">Deny</button>
      </div>
    </div>
  </div>
  <div id="success-view" class="hidden">
    <h1>AgentPay</h1>
    <p class="subtitle" id="success-subtitle"></p>
    <div class="card">
      <div class="success-screen">
        <div class="checkmark" id="success-icon"></div>
        <div class="success-msg" id="success-msg"></div>
        <div class="success-hint">This tab will close automatically.</div>
      </div>
    </div>
  </div>
</div>
<script>
(function() {
  var token = ${JSON.stringify(token)};
  var form = document.getElementById('form-view');
  var successView = document.getElementById('success-view');
  var input = document.getElementById('passphrase');
  var btnApprove = document.getElementById('btn-approve');
  var btnDeny = document.getElementById('btn-deny');
  var errDiv = document.getElementById('error');
  var reasonSection = document.getElementById('reason-section');
  var reasonInput = document.getElementById('reason');
  var successSubtitle = document.getElementById('success-subtitle');
  var successIcon = document.getElementById('success-icon');
  var successMsg = document.getElementById('success-msg');
  var denyMode = false;

  function showError(msg) {
    errDiv.textContent = msg;
    errDiv.classList.remove('hidden');
  }

  function clearError() {
    errDiv.classList.add('hidden');
  }

  function disableButtons() {
    btnApprove.disabled = true;
    btnDeny.disabled = true;
  }

  function enableButtons() {
    btnApprove.disabled = false;
    btnDeny.disabled = false;
  }

  function showSuccess(approved) {
    form.classList.add('hidden');
    successView.classList.remove('hidden');
    if (approved) {
      successSubtitle.textContent = 'Purchase Approved';
      successIcon.innerHTML = '&#10003;';
      successIcon.style.color = '#2e7d32';
      successMsg.textContent = 'Transaction approved and signed.';
    } else {
      successSubtitle.textContent = 'Purchase Denied';
      successIcon.innerHTML = '&#10007;';
      successIcon.style.color = '#c62828';
      successMsg.textContent = 'Transaction has been denied.';
    }
    setTimeout(function() { window.close(); }, 3000);
  }

  function doApprove() {
    var passphrase = input.value;
    if (!passphrase) {
      showError('Passphrase is required to approve.');
      return;
    }
    clearError();
    disableButtons();
    btnApprove.textContent = 'Approving...';

    fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, passphrase: passphrase })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.error) {
        showError(data.error);
        enableButtons();
        btnApprove.textContent = 'Approve';
      } else {
        showSuccess(true);
      }
    })
    .catch(function() {
      showError('Failed to submit. Is the CLI still running?');
      enableButtons();
      btnApprove.textContent = 'Approve';
    });
  }

  function doReject() {
    if (!denyMode) {
      denyMode = true;
      reasonSection.classList.remove('hidden');
      btnDeny.textContent = 'Confirm Deny';
      reasonInput.focus();
      return;
    }
    clearError();
    disableButtons();
    btnDeny.textContent = 'Denying...';

    fetch('/api/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, reason: reasonInput.value || undefined })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.error) {
        showError(data.error);
        enableButtons();
        btnDeny.textContent = 'Confirm Deny';
      } else {
        showSuccess(false);
      }
    })
    .catch(function() {
      showError('Failed to submit. Is the CLI still running?');
      enableButtons();
      btnDeny.textContent = 'Confirm Deny';
    });
  }

  btnApprove.addEventListener('click', doApprove);
  btnDeny.addEventListener('click', doReject);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doApprove();
  });
})();
</script>
</body>
</html>`;
}
