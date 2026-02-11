export function getSetupHtml(token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentPay — Setup</title>
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
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
  .card {
    background: #fff;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 16px;
    border: 1px solid #e0e0e0;
  }
  .card-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f0f0;
  }
  label { display: block; font-size: 13px; font-weight: 500; color: #333; margin-bottom: 6px; }
  input[type="text"], input[type="password"], input[type="email"], input[type="tel"], input[type="number"] {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 15px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
  }
  input:focus { border-color: #111; }
  .field { margin-bottom: 14px; }
  .field:last-child { margin-bottom: 0; }
  .row { display: flex; gap: 12px; }
  .row > .field { flex: 1; }
  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }
  .checkbox-row input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
  .checkbox-row label {
    margin-bottom: 0;
    cursor: pointer;
    font-size: 14px;
  }
  .btn-submit {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    background: #111;
    color: #fff;
    transition: opacity 0.15s;
  }
  .btn-submit:hover { opacity: 0.85; }
  .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { color: #c62828; font-size: 13px; margin-top: 10px; }
  .success-screen {
    text-align: center;
    padding: 40px 0;
  }
  .checkmark { font-size: 48px; margin-bottom: 16px; color: #2e7d32; }
  .success-msg { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
  .success-hint { font-size: 13px; color: #666; }
  .hidden { display: none; }
  .hint { font-size: 12px; color: #999; margin-top: 4px; }
</style>
</head>
<body>
<div class="container">
  <div id="form-view">
    <h1>AgentPay</h1>
    <p class="subtitle">Initial Setup</p>

    <div class="card">
      <div class="card-title">Passphrase</div>
      <div class="field">
        <label for="passphrase">Choose a passphrase</label>
        <input type="password" id="passphrase" placeholder="Enter passphrase" autofocus>
      </div>
      <div class="field">
        <label for="passphrase-confirm">Confirm passphrase</label>
        <input type="password" id="passphrase-confirm" placeholder="Re-enter passphrase">
      </div>
    </div>

    <div class="card">
      <div class="card-title">Budget</div>
      <div class="row">
        <div class="field">
          <label for="budget">Total budget ($)</label>
          <input type="number" id="budget" placeholder="0" min="0" step="0.01">
        </div>
        <div class="field">
          <label for="limit-per-tx">Per-transaction limit ($)</label>
          <input type="number" id="limit-per-tx" placeholder="0" min="0" step="0.01">
        </div>
      </div>
      <div class="hint">Leave at 0 to set later via <code>agentpay budget</code>.</div>
    </div>

    <div class="card">
      <div class="card-title">Card</div>
      <div class="field">
        <label for="card-number">Card number</label>
        <input type="text" id="card-number" placeholder="4111 1111 1111 1111" autocomplete="cc-number">
      </div>
      <div class="row">
        <div class="field">
          <label for="card-expiry">Expiry (MM/YY)</label>
          <input type="text" id="card-expiry" placeholder="MM/YY" autocomplete="cc-exp" maxlength="5">
        </div>
        <div class="field">
          <label for="card-cvv">CVV</label>
          <input type="text" id="card-cvv" placeholder="123" autocomplete="cc-csc" maxlength="4">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Personal</div>
      <div class="field">
        <label for="name">Full name</label>
        <input type="text" id="name" placeholder="Jane Doe" autocomplete="name">
      </div>
      <div class="row">
        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" placeholder="jane@example.com" autocomplete="email">
        </div>
        <div class="field">
          <label for="phone">Phone</label>
          <input type="tel" id="phone" placeholder="+1 555-0100" autocomplete="tel">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Billing Address</div>
      <div class="field">
        <label for="billing-street">Street</label>
        <input type="text" id="billing-street" autocomplete="billing street-address">
      </div>
      <div class="row">
        <div class="field">
          <label for="billing-city">City</label>
          <input type="text" id="billing-city" autocomplete="billing address-level2">
        </div>
        <div class="field">
          <label for="billing-state">State</label>
          <input type="text" id="billing-state" autocomplete="billing address-level1">
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label for="billing-zip">ZIP</label>
          <input type="text" id="billing-zip" autocomplete="billing postal-code">
        </div>
        <div class="field">
          <label for="billing-country">Country</label>
          <input type="text" id="billing-country" placeholder="US" autocomplete="billing country">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Shipping Address</div>
      <div class="checkbox-row">
        <input type="checkbox" id="same-as-billing" checked>
        <label for="same-as-billing">Same as billing</label>
      </div>
      <div id="shipping-fields" class="hidden">
        <div class="field">
          <label for="shipping-street">Street</label>
          <input type="text" id="shipping-street" autocomplete="shipping street-address">
        </div>
        <div class="row">
          <div class="field">
            <label for="shipping-city">City</label>
            <input type="text" id="shipping-city" autocomplete="shipping address-level2">
          </div>
          <div class="field">
            <label for="shipping-state">State</label>
            <input type="text" id="shipping-state" autocomplete="shipping address-level1">
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label for="shipping-zip">ZIP</label>
            <input type="text" id="shipping-zip" autocomplete="shipping postal-code">
          </div>
          <div class="field">
            <label for="shipping-country">Country</label>
            <input type="text" id="shipping-country" placeholder="US" autocomplete="shipping country">
          </div>
        </div>
      </div>
    </div>

    <div id="error" class="error hidden"></div>
    <button class="btn-submit" id="btn-submit">Complete Setup</button>
  </div>

  <div id="success-view" class="hidden">
    <h1>AgentPay</h1>
    <p class="subtitle">Setup Complete</p>
    <div class="card">
      <div class="success-screen">
        <div class="checkmark">&#10003;</div>
        <div class="success-msg">Your wallet is ready.</div>
        <div class="success-hint">You can close this tab and return to the terminal.</div>
      </div>
    </div>
  </div>
</div>
<script>
(function() {
  var token = ${JSON.stringify(token)};
  var formView = document.getElementById('form-view');
  var successView = document.getElementById('success-view');
  var btnSubmit = document.getElementById('btn-submit');
  var errDiv = document.getElementById('error');
  var sameAsBilling = document.getElementById('same-as-billing');
  var shippingFields = document.getElementById('shipping-fields');

  sameAsBilling.addEventListener('change', function() {
    shippingFields.classList.toggle('hidden', sameAsBilling.checked);
  });

  function val(id) { return document.getElementById(id).value.trim(); }

  function showError(msg) {
    errDiv.textContent = msg;
    errDiv.classList.remove('hidden');
  }

  function clearError() {
    errDiv.classList.add('hidden');
  }

  btnSubmit.addEventListener('click', function() {
    clearError();

    var passphrase = val('passphrase');
    var passphraseConfirm = val('passphrase-confirm');

    if (!passphrase) { showError('Passphrase is required.'); return; }
    if (passphrase !== passphraseConfirm) { showError('Passphrases do not match.'); return; }

    var cardNumber = val('card-number');
    var cardExpiry = val('card-expiry');
    var cardCvv = val('card-cvv');
    if (!cardNumber || !cardExpiry || !cardCvv) { showError('Card number, expiry, and CVV are required.'); return; }

    var name = val('name');
    var email = val('email');
    var phone = val('phone');
    if (!name || !email || !phone) { showError('Name, email, and phone are required.'); return; }

    var billingStreet = val('billing-street');
    var billingCity = val('billing-city');
    var billingState = val('billing-state');
    var billingZip = val('billing-zip');
    var billingCountry = val('billing-country');
    if (!billingStreet || !billingCity || !billingState || !billingZip || !billingCountry) {
      showError('All billing address fields are required.'); return;
    }

    var shippingStreet, shippingCity, shippingState, shippingZip, shippingCountry;
    if (sameAsBilling.checked) {
      shippingStreet = billingStreet;
      shippingCity = billingCity;
      shippingState = billingState;
      shippingZip = billingZip;
      shippingCountry = billingCountry;
    } else {
      shippingStreet = val('shipping-street');
      shippingCity = val('shipping-city');
      shippingState = val('shipping-state');
      shippingZip = val('shipping-zip');
      shippingCountry = val('shipping-country');
      if (!shippingStreet || !shippingCity || !shippingState || !shippingZip || !shippingCountry) {
        showError('All shipping address fields are required.'); return;
      }
    }

    var budget = parseFloat(document.getElementById('budget').value) || 0;
    var limitPerTx = parseFloat(document.getElementById('limit-per-tx').value) || 0;

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Setting up...';

    fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        passphrase: passphrase,
        budget: budget,
        limitPerTx: limitPerTx,
        card: { number: cardNumber, expiry: cardExpiry, cvv: cardCvv },
        name: name,
        email: email,
        phone: phone,
        billingAddress: { street: billingStreet, city: billingCity, state: billingState, zip: billingZip, country: billingCountry },
        shippingAddress: { street: shippingStreet, city: shippingCity, state: shippingState, zip: shippingZip, country: shippingCountry }
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.error) {
        showError(data.error);
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Complete Setup';
      } else {
        formView.classList.add('hidden');
        successView.classList.remove('hidden');
        setTimeout(function() { window.close(); }, 3000);
      }
    })
    .catch(function() {
      showError('Failed to submit. Is the CLI still running?');
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Complete Setup';
    });
  });
})();
</script>
</body>
</html>`;
}
