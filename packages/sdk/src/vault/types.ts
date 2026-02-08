export interface BillingCredentials {
  card: {
    number: string;
    expiry: string;
    cvv: string;
  };
  name: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  email: string;
  phone: string;
}

export interface EncryptedVault {
  ciphertext: string;
  salt: string;
  iv: string;
}
