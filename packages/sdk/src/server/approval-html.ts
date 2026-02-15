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
  lines.push(`<div class="detail"><span class="detail-label">Amount</span><span class="detail-value amount">${formatCurrency(tx.amount)}</span></div>`);
  lines.push(`<div class="detail"><span class="detail-label">Description</span><span class="detail-value">${esc(tx.description)}</span></div>`);
  if (tx.url) {
    lines.push(`<div class="detail"><span class="detail-label">URL</span><span class="detail-value"><a href="${esc(tx.url)}" target="_blank" rel="noopener">${esc(tx.url)}</a></span></div>`);
  }
  lines.push(`<div class="detail"><span class="detail-label">Transaction</span><span class="detail-value mono">${esc(tx.id)}</span></div>`);
  const contextHtml = `<div class="card">${lines.join('')}</div>`;

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
    background: #000;
    color: #fff;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 40px 16px;
  }
  .container { width: 100%; max-width: 420px; }
  .logo { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .logo svg { color: #666; }
  .logo span { font-size: 18px; font-weight: 500; color: #999; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
  .card {
    background: #111;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 12px;
    border: 1px solid #222;
  }
  .detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #1a1a1a;
  }
  .detail:last-child { border-bottom: none; }
  .detail-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.03em; }
  .detail-value { font-size: 14px; font-weight: 500; text-align: right; max-width: 60%; }
  .detail-value.amount { font-family: ui-monospace, SFMono-Regular, monospace; font-weight: 700; font-size: 16px; }
  .detail-value a { color: #60a5fa; text-decoration: none; }
  .detail-value a:hover { text-decoration: underline; }
  .mono { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; color: #888; }
  label { display: block; font-size: 11px; font-weight: 500; color: #666; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
  input[type="password"], textarea {
    width: 100%;
    padding: 12px 14px;
    background: #0a0a0a;
    border: 1px solid #333;
    border-radius: 10px;
    font-size: 15px;
    font-family: inherit;
    color: #fff;
    outline: none;
    transition: border-color 0.15s;
  }
  input[type="password"]::placeholder, textarea::placeholder { color: #444; }
  input[type="password"]:focus, textarea:focus { border-color: rgba(255,255,255,0.3); }
  textarea { resize: vertical; min-height: 60px; margin-top: 8px; }
  .btn-row { display: flex; gap: 10px; margin-top: 16px; }
  .btn-approve, .btn-deny {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .btn-approve { background: #fff; color: #000; }
  .btn-approve:hover { opacity: 0.85; }
  .btn-approve:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-deny { background: transparent; color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
  .btn-deny:hover { opacity: 0.85; background: rgba(248,113,113,0.05); }
  .btn-deny:disabled { opacity: 0.4; cursor: not-allowed; }
  .error { color: #f87171; font-size: 13px; margin-top: 10px; }
  .success-screen { text-align: center; padding: 40px 0; }
  .checkmark { font-size: 48px; margin-bottom: 16px; }
  .success-msg { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
  .success-hint { font-size: 13px; color: #666; }
  .hidden { display: none; }
  .reason-section { margin-top: 12px; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fade-in { animation: fadeIn 0.4s ease-out forwards; }
</style>
</head>
<body>
<div class="container fade-in">
  <div id="form-view">
    <div class="logo">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M16 14h2"/>
      </svg>
      <span>agentpay</span>
    </div>
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
    <div class="logo">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M16 14h2"/>
      </svg>
      <span>agentpay</span>
    </div>
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
      successIcon.style.color = '#4ade80';
      successMsg.textContent = 'Transaction approved and signed.';
    } else {
      successSubtitle.textContent = 'Purchase Denied';
      successIcon.innerHTML = '&#10007;';
      successIcon.style.color = '#f87171';
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
