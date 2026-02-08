export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentPay Dashboard</title>
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
  .container { width: 100%; max-width: 480px; }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
  h2 { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 32px; }
  .card {
    background: #fff;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 16px;
    border: 1px solid #e0e0e0;
  }
  label { display: block; font-size: 13px; font-weight: 500; color: #333; margin-bottom: 4px; }
  input, select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 14px;
    margin-bottom: 16px;
    outline: none;
    transition: border-color 0.15s;
  }
  input:focus { border-color: #111; }
  .row { display: flex; gap: 12px; }
  .row > div { flex: 1; }
  button {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  button:hover { opacity: 0.85; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: #111; color: #fff; }
  .btn-secondary { background: #e0e0e0; color: #111; }

  /* Progress bar for wizard */
  .progress { display: flex; gap: 6px; margin-bottom: 24px; }
  .progress .step {
    flex: 1; height: 4px; border-radius: 2px; background: #e0e0e0;
    transition: background 0.3s;
  }
  .progress .step.active { background: #111; }

  /* Balance display */
  .balance-display {
    text-align: center;
    padding: 32px 0;
  }
  .balance-amount {
    font-size: 48px;
    font-weight: 700;
    letter-spacing: -1px;
  }
  .balance-label { font-size: 13px; color: #666; margin-top: 4px; }

  /* Budget bar */
  .budget-bar-container { margin: 16px 0; }
  .budget-bar {
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
  }
  .budget-bar-fill {
    height: 100%;
    background: #111;
    border-radius: 4px;
    transition: width 0.3s;
  }
  .budget-bar-labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #666;
    margin-top: 4px;
  }

  /* Stats grid */
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .stat { text-align: center; padding: 12px; background: #f9f9f9; border-radius: 8px; }
  .stat-value { font-size: 18px; font-weight: 700; }
  .stat-label { font-size: 11px; color: #666; margin-top: 2px; }

  /* Add funds inline */
  .add-funds-row { display: flex; gap: 8px; }
  .add-funds-row input { margin-bottom: 0; flex: 1; }
  .add-funds-row button { width: auto; padding: 10px 20px; }

  /* Transactions */
  .tx-list { margin-top: 12px; }
  .tx-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f0;
    font-size: 13px;
  }
  .tx-item:last-child { border-bottom: none; }
  .tx-merchant { font-weight: 500; }
  .tx-amount { font-weight: 600; }
  .tx-status {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
  }
  .tx-status.completed { background: #e6f4ea; color: #1e7e34; }
  .tx-status.pending { background: #fff8e1; color: #f57f17; }
  .tx-status.failed { background: #fde8e8; color: #c62828; }
  .tx-status.rejected { background: #fde8e8; color: #c62828; }
  .tx-status.approved { background: #e3f2fd; color: #1565c0; }
  .tx-status.executing { background: #e3f2fd; color: #1565c0; }

  .error { color: #c62828; font-size: 13px; margin-top: 8px; }
  .success { color: #1e7e34; font-size: 13px; margin-top: 8px; }
  .hidden { display: none; }

  /* Checkbox row for same-as-billing */
  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }
  .checkbox-row input { width: auto; margin: 0; }
  .checkbox-row label { margin: 0; }
</style>
</head>
<body>
<div class="container" id="app">
  <div id="loading">Loading...</div>
</div>

<script>
const App = {
  state: { isSetup: false, wallet: null, recentTransactions: [], wizardStep: 1 },

  async init() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      this.state.isSetup = data.isSetup;
      this.state.wallet = data.wallet;
      this.state.recentTransactions = data.recentTransactions || [];
    } catch (e) {
      console.error('Failed to load status', e);
    }
    this.render();
  },

  render() {
    const app = document.getElementById('app');
    if (this.state.isSetup && this.state.wallet) {
      app.innerHTML = this.renderDashboard();
      this.bindDashboard();
    } else if (this.state.isSetup) {
      app.innerHTML = '<div class="card"><h2>Setup detected</h2><p>Wallet data could not be loaded. Try running <code>agentpay budget --set 100</code> from the CLI.</p></div>';
    } else {
      app.innerHTML = this.renderWizard();
      this.bindWizard();
    }
  },

  fmt(n) {
    return '$' + Number(n).toFixed(2);
  },

  renderDashboard() {
    const w = this.state.wallet;
    const pct = w.budget > 0 ? Math.min(100, (w.spent / w.budget) * 100) : 0;
    const txHtml = this.state.recentTransactions.length === 0
      ? '<p style="color:#666;font-size:13px;">No transactions yet.</p>'
      : this.state.recentTransactions.map(tx => \`
          <div class="tx-item">
            <div>
              <div class="tx-merchant">\${this.esc(tx.merchant)}</div>
              <div style="color:#999;font-size:11px;">\${new Date(tx.createdAt).toLocaleDateString()}</div>
            </div>
            <div style="text-align:right">
              <div class="tx-amount">\${this.fmt(tx.amount)}</div>
              <span class="tx-status \${tx.status}">\${tx.status}</span>
            </div>
          </div>\`).join('');

    return \`
      <h1>AgentPay</h1>
      <p class="subtitle">Wallet Dashboard</p>

      <div class="card">
        <div class="balance-display">
          <div class="balance-amount">\${this.fmt(w.balance)}</div>
          <div class="balance-label">Available Balance</div>
        </div>
        <div class="budget-bar-container">
          <div class="budget-bar"><div class="budget-bar-fill" style="width:\${pct.toFixed(1)}%"></div></div>
          <div class="budget-bar-labels">
            <span>\${this.fmt(w.spent)} spent</span>
            <span>\${this.fmt(w.budget)} budget</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="stats">
          <div class="stat"><div class="stat-value">\${this.fmt(w.budget)}</div><div class="stat-label">Total Budget</div></div>
          <div class="stat"><div class="stat-value">\${this.fmt(w.spent)}</div><div class="stat-label">Total Spent</div></div>
          <div class="stat"><div class="stat-value">\${this.fmt(w.balance)}</div><div class="stat-label">Remaining</div></div>
          <div class="stat"><div class="stat-value">\${w.limitPerTx > 0 ? this.fmt(w.limitPerTx) : 'None'}</div><div class="stat-label">Per-Tx Limit</div></div>
        </div>
      </div>

      <div class="card">
        <h2>Add Funds</h2>
        <div class="add-funds-row">
          <input type="number" id="fundAmount" placeholder="Amount" min="0.01" step="0.01">
          <button class="btn-primary" id="fundBtn">Add</button>
        </div>
        <div id="fundMsg"></div>
      </div>

      <div class="card">
        <h2>Recent Transactions</h2>
        <div class="tx-list">\${txHtml}</div>
      </div>
    \`;
  },

  bindDashboard() {
    const btn = document.getElementById('fundBtn');
    const input = document.getElementById('fundAmount');
    const msg = document.getElementById('fundMsg');

    btn.addEventListener('click', async () => {
      const amount = parseFloat(input.value);
      if (!amount || amount <= 0) {
        msg.innerHTML = '<p class="error">Enter a valid amount.</p>';
        return;
      }
      btn.disabled = true;
      btn.textContent = '...';
      try {
        const res = await fetch('/api/fund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount }),
        });
        const data = await res.json();
        if (data.error) {
          msg.innerHTML = '<p class="error">' + this.esc(data.error) + '</p>';
        } else {
          this.state.wallet = data.wallet;
          input.value = '';
          this.render();
        }
      } catch (e) {
        msg.innerHTML = '<p class="error">Request failed.</p>';
      }
      btn.disabled = false;
      btn.textContent = 'Add';
    });
  },

  renderWizard() {
    const step = this.state.wizardStep;
    const steps = [1, 2, 3, 4];
    const progressHtml = '<div class="progress">' + steps.map(s =>
      '<div class="step' + (s <= step ? ' active' : '') + '"></div>'
    ).join('') + '</div>';

    const titles = ['Create Passphrase', 'Card Information', 'Personal Details', 'Budget & Limits'];

    let fields = '';
    if (step === 1) {
      fields = \`
        <label for="w_pass">Passphrase</label>
        <input type="password" id="w_pass" placeholder="Choose a strong passphrase">
        <label for="w_pass2">Confirm Passphrase</label>
        <input type="password" id="w_pass2" placeholder="Confirm your passphrase">
      \`;
    } else if (step === 2) {
      fields = \`
        <label for="w_cardNum">Card Number</label>
        <input type="text" id="w_cardNum" placeholder="4242 4242 4242 4242">
        <div class="row">
          <div><label for="w_expiry">Expiry</label><input type="text" id="w_expiry" placeholder="MM/YY"></div>
          <div><label for="w_cvv">CVV</label><input type="text" id="w_cvv" placeholder="123"></div>
        </div>
      \`;
    } else if (step === 3) {
      fields = \`
        <label for="w_name">Full Name</label>
        <input type="text" id="w_name" placeholder="Jane Doe">
        <div class="row">
          <div><label for="w_email">Email</label><input type="email" id="w_email" placeholder="jane@example.com"></div>
          <div><label for="w_phone">Phone</label><input type="tel" id="w_phone" placeholder="+1 555 0123"></div>
        </div>
        <label for="w_street">Street Address</label>
        <input type="text" id="w_street" placeholder="123 Main St">
        <div class="row">
          <div><label for="w_city">City</label><input type="text" id="w_city" placeholder="San Francisco"></div>
          <div><label for="w_state">State</label><input type="text" id="w_state" placeholder="CA"></div>
        </div>
        <div class="row">
          <div><label for="w_zip">ZIP</label><input type="text" id="w_zip" placeholder="94102"></div>
          <div><label for="w_country">Country</label><input type="text" id="w_country" placeholder="US" value="US"></div>
        </div>
      \`;
    } else if (step === 4) {
      fields = \`
        <label for="w_budget">Initial Budget ($)</label>
        <input type="number" id="w_budget" placeholder="200" min="0" step="0.01">
        <label for="w_limit">Per-Transaction Limit ($)</label>
        <input type="number" id="w_limit" placeholder="50 (0 = no limit)" min="0" step="0.01">
      \`;
    }

    return \`
      <h1>AgentPay</h1>
      <p class="subtitle">Step \${step} of 4 — \${titles[step - 1]}</p>
      \${progressHtml}
      <div class="card">
        \${fields}
        <div id="wizardError"></div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          \${step > 1 ? '<button class="btn-secondary" id="wizBack">Back</button>' : ''}
          <button class="btn-primary" id="wizNext">\${step === 4 ? 'Complete Setup' : 'Continue'}</button>
        </div>
      </div>
    \`;
  },

  // Wizard form data persisted across steps
  wizardData: {},

  bindWizard() {
    const step = this.state.wizardStep;
    const errDiv = document.getElementById('wizardError');
    const nextBtn = document.getElementById('wizNext');
    const backBtn = document.getElementById('wizBack');

    // Restore saved data into fields
    this.restoreWizardFields(step);

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.saveWizardFields(step);
        this.state.wizardStep--;
        this.render();
      });
    }

    nextBtn.addEventListener('click', async () => {
      errDiv.innerHTML = '';

      if (step === 1) {
        const pass = document.getElementById('w_pass').value;
        const pass2 = document.getElementById('w_pass2').value;
        if (!pass) { errDiv.innerHTML = '<p class="error">Passphrase is required.</p>'; return; }
        if (pass !== pass2) { errDiv.innerHTML = '<p class="error">Passphrases do not match.</p>'; return; }
        this.wizardData.passphrase = pass;
        this.state.wizardStep = 2;
        this.render();
      } else if (step === 2) {
        this.saveWizardFields(step);
        const d = this.wizardData;
        if (!d.cardNumber) { errDiv.innerHTML = '<p class="error">Card number is required.</p>'; return; }
        if (!d.expiry) { errDiv.innerHTML = '<p class="error">Expiry is required.</p>'; return; }
        if (!d.cvv) { errDiv.innerHTML = '<p class="error">CVV is required.</p>'; return; }
        this.state.wizardStep = 3;
        this.render();
      } else if (step === 3) {
        this.saveWizardFields(step);
        const d = this.wizardData;
        if (!d.name) { errDiv.innerHTML = '<p class="error">Full name is required.</p>'; return; }
        this.state.wizardStep = 4;
        this.render();
      } else if (step === 4) {
        this.saveWizardFields(step);
        const d = this.wizardData;

        nextBtn.disabled = true;
        nextBtn.textContent = 'Setting up...';

        try {
          const res = await fetch('/api/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              passphrase: d.passphrase,
              credentials: {
                card: { number: d.cardNumber, expiry: d.expiry, cvv: d.cvv },
                name: d.name,
                billingAddress: { street: d.street || '', city: d.city || '', state: d.state || '', zip: d.zip || '', country: d.country || 'US' },
                shippingAddress: { street: d.street || '', city: d.city || '', state: d.state || '', zip: d.zip || '', country: d.country || 'US' },
                email: d.email || '',
                phone: d.phone || '',
              },
              budget: parseFloat(d.budget) || 0,
              limitPerTx: parseFloat(d.limit) || 0,
            }),
          });
          const result = await res.json();
          if (result.error) {
            errDiv.innerHTML = '<p class="error">' + this.esc(result.error) + '</p>';
            nextBtn.disabled = false;
            nextBtn.textContent = 'Complete Setup';
          } else {
            this.state.isSetup = true;
            this.state.wallet = result.wallet;
            this.state.recentTransactions = [];
            this.wizardData = {};
            this.render();
          }
        } catch (e) {
          errDiv.innerHTML = '<p class="error">Setup request failed.</p>';
          nextBtn.disabled = false;
          nextBtn.textContent = 'Complete Setup';
        }
      }
    });
  },

  saveWizardFields(step) {
    const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    if (step === 2) {
      this.wizardData.cardNumber = val('w_cardNum');
      this.wizardData.expiry = val('w_expiry');
      this.wizardData.cvv = val('w_cvv');
    } else if (step === 3) {
      this.wizardData.name = val('w_name');
      this.wizardData.email = val('w_email');
      this.wizardData.phone = val('w_phone');
      this.wizardData.street = val('w_street');
      this.wizardData.city = val('w_city');
      this.wizardData.state = val('w_state');
      this.wizardData.zip = val('w_zip');
      this.wizardData.country = val('w_country');
    } else if (step === 4) {
      this.wizardData.budget = val('w_budget');
      this.wizardData.limit = val('w_limit');
    }
  },

  restoreWizardFields(step) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    if (step === 2) {
      set('w_cardNum', this.wizardData.cardNumber);
      set('w_expiry', this.wizardData.expiry);
      set('w_cvv', this.wizardData.cvv);
    } else if (step === 3) {
      set('w_name', this.wizardData.name);
      set('w_email', this.wizardData.email);
      set('w_phone', this.wizardData.phone);
      set('w_street', this.wizardData.street);
      set('w_city', this.wizardData.city);
      set('w_state', this.wizardData.state);
      set('w_zip', this.wizardData.zip);
      set('w_country', this.wizardData.country);
    } else if (step === 4) {
      set('w_budget', this.wizardData.budget);
      set('w_limit', this.wizardData.limit);
    }
  },

  esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  },
};

App.init();
</script>
</body>
</html>`;
}
