/**
 * GoCardless Bank Account Data (ex-Nordigen)
 * API gratuite pour accéder aux comptes bancaires via Open Banking (DSP2).
 *
 * Docs: https://developer.gocardless.com/bank-account-data/overview
 * Base URL: https://bankaccountdata.gocardless.com/api/v2
 */

const BASE_URL = 'https://bankaccountdata.gocardless.com/api/v2';

// ═══ TOKEN MANAGEMENT ═══

interface TokenResponse {
  access: string;
  access_expires: number;
  refresh: string;
  refresh_expires: number;
}

let cachedToken: { access: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  // Return cached if still valid (with 60s margin)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.access;
  }

  const secretId = process.env.GOCARDLESS_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY;

  if (!secretId || !secretKey) {
    throw new Error('GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY must be set');
  }

  const res = await fetch(`${BASE_URL}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GoCardless token error: ${res.status} ${body}`);
  }

  const data = (await res.json()) as TokenResponse;
  cachedToken = {
    access: data.access,
    expiresAt: Date.now() + data.access_expires * 1000,
  };

  return data.access;
}

async function gcFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GoCardless API error: ${res.status} ${body}`);
  }

  return res.json() as Promise<T>;
}

// ═══ INSTITUTIONS ═══

export interface Institution {
  id: string;
  name: string;
  bic: string;
  logo: string;
  countries: string[];
}

export async function listInstitutions(country: string = 'FR'): Promise<Institution[]> {
  return gcFetch<Institution[]>(`/institutions/?country=${country}`);
}

// ═══ REQUISITIONS (bank connection) ═══

interface RequisitionResponse {
  id: string;
  status: string;
  link: string;
  accounts: string[];
  institution_id: string;
}

export interface CreateRequisitionParams {
  institutionId: string;
  redirectUrl: string;
  reference?: string;
}

export async function createRequisition(params: CreateRequisitionParams): Promise<RequisitionResponse> {
  return gcFetch<RequisitionResponse>('/requisitions/', {
    method: 'POST',
    body: JSON.stringify({
      institution_id: params.institutionId,
      redirect: params.redirectUrl,
      reference: params.reference || `coproflex-${Date.now()}`,
    }),
  });
}

export async function getRequisition(requisitionId: string): Promise<RequisitionResponse> {
  return gcFetch<RequisitionResponse>(`/requisitions/${requisitionId}/`);
}

// ═══ ACCOUNTS ═══

interface AccountDetails {
  iban: string;
  currency: string;
  ownerName: string;
  name: string;
  product: string;
}

interface AccountBalance {
  balanceAmount: { amount: string; currency: string };
  balanceType: string;
  referenceDate: string;
}

export interface BankAccount {
  id: string;
  iban: string;
  name: string;
  ownerName: string;
  balance: number;
  currency: string;
  balanceDate: string;
}

export async function getAccountDetails(accountId: string): Promise<AccountDetails> {
  const data = await gcFetch<{ account: AccountDetails }>(`/accounts/${accountId}/details/`);
  return data.account;
}

export async function getAccountBalances(accountId: string): Promise<AccountBalance[]> {
  const data = await gcFetch<{ balances: AccountBalance[] }>(`/accounts/${accountId}/balances/`);
  return data.balances;
}

/**
 * Récupère les détails complets d'un compte (IBAN + solde).
 */
export async function getFullAccount(accountId: string): Promise<BankAccount> {
  const [details, balances] = await Promise.all([
    getAccountDetails(accountId),
    getAccountBalances(accountId),
  ]);

  // Préférer le solde "closingBooked" ou "expected", sinon le premier
  const preferredBalance =
    balances.find(b => b.balanceType === 'closingBooked') ||
    balances.find(b => b.balanceType === 'expected') ||
    balances[0];

  return {
    id: accountId,
    iban: details.iban,
    name: details.name || details.product || 'Compte bancaire',
    ownerName: details.ownerName || '',
    balance: preferredBalance ? parseFloat(preferredBalance.balanceAmount.amount) : 0,
    currency: preferredBalance?.balanceAmount.currency || 'EUR',
    balanceDate: preferredBalance?.referenceDate || new Date().toISOString().split('T')[0],
  };
}

/**
 * Récupère tous les comptes d'une requisition (après que l'utilisateur s'est authentifié).
 */
export async function getRequisitionAccounts(requisitionId: string): Promise<BankAccount[]> {
  const requisition = await getRequisition(requisitionId);

  if (requisition.status !== 'LN') {
    throw new Error(`Requisition not linked yet (status: ${requisition.status})`);
  }

  const accounts = await Promise.all(
    requisition.accounts.map(id => getFullAccount(id))
  );

  return accounts;
}
