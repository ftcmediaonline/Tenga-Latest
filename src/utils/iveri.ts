/** iVeri Lite field names and helpers (see iVeri Lite Developer Guide). */

export const IVERI_NONCE_FIELD = 'Lite_Merchant_Nonce';

/** Max 20 chars per Ecom_ConsumerOrderID / MerchantReference. */
export function generateIveriOrderNumber(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `TNG${t.slice(-8)}${r}`.slice(0, 20);
}

export function isIveriPaymentSuccess(status: unknown): boolean {
  const s = String(status ?? '');
  return s === '0' || s === 'Success' || s === 'APPROVED';
}

export function parseIveriPayload(source: Record<string, unknown> | null | undefined): {
  orderNumber: string | null;
  status: string | null;
  transactionIndex: string | null;
  nonce: string | null;
  description: string | null;
} {
  if (!source) {
    return { orderNumber: null, status: null, transactionIndex: null, nonce: null, description: null };
  }
  const get = (key: string) => {
    const v = source[key];
    return v != null ? String(v) : null;
  };
  return {
    orderNumber:
      get('Ecom_ConsumerOrderID') ||
      get('MerchantReference') ||
      get('Lite_Consumer_Order_ID'),
    status: get('Lite_Payment_Card_Status') || get('Lite_Status'),
    transactionIndex: get('Lite_TransactionIndex') || get('Lite_BankReference'),
    nonce: get(IVERI_NONCE_FIELD),
    description: get('Lite_Result_Description'),
  };
}

export function parseIveriFromUrl(search: string, hash = ''): ReturnType<typeof parseIveriPayload> {
  const params = new URLSearchParams(search);
  const record: Record<string, string> = {};
  params.forEach((v, k) => {
    record[k] = v;
  });
  if (hash.startsWith('#')) {
    new URLSearchParams(hash.slice(1)).forEach((v, k) => {
      record[k] = v;
    });
  }
  return parseIveriPayload(record);
}

export function verifyIveriNonce(received: string | null, orderNumber: string): boolean {
  if (!received) return false;
  const expected = sessionStorage.getItem(`iveri_nonce_${orderNumber}`);
  return !!expected && expected === received;
}

export function saveIveriCheckoutSession(orderNumber: string, nonce: string, pendingOrder: unknown) {
  sessionStorage.setItem(`iveri_nonce_${orderNumber}`, nonce);
  sessionStorage.setItem(`iveri_pending_${orderNumber}`, JSON.stringify(pendingOrder));
}

export function loadIveriPendingOrder<T>(orderNumber: string): T | null {
  const raw = sessionStorage.getItem(`iveri_pending_${orderNumber}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearIveriCheckoutSession(orderNumber: string) {
  sessionStorage.removeItem(`iveri_nonce_${orderNumber}`);
  sessionStorage.removeItem(`iveri_pending_${orderNumber}`);
}

export type IveriPendingOrder = {
  orderNumber: string;
  items: { name: string; qty: number; price: number; image: string }[];
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  shippingMethod: string;
  shippingCost: number;
  subtotal: number;
  total: number;
  merchantTrace?: string;
  checkoutNonce?: string;
};
