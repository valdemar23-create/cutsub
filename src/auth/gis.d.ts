/**
 * Tipos mínimos da Google Identity Services (modelo de token OAuth 2.0).
 * Referência: https://developers.google.com/identity/oauth2/web/reference/js-reference
 * Escritos à mão para evitar uma dependência só de tipos.
 */
declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token: string;
    expires_in: number | string;
    token_type: string;
    scope: string;
    error?: string;
    error_description?: string;
    error_uri?: string;
  }

  interface ClientConfigError {
    type: 'popup_failed_to_open' | 'popup_closed' | 'unknown';
    message?: string;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: ClientConfigError) => void;
    prompt?: '' | 'none' | 'consent' | 'select_account';
    include_granted_scopes?: boolean;
  }

  interface OverridableTokenClientConfig {
    prompt?: '' | 'none' | 'consent' | 'select_account';
  }

  interface TokenClient {
    requestAccessToken(overrideConfig?: OverridableTokenClientConfig): void;
  }

  interface RevocationResponse {
    successful: boolean;
    error?: string;
    error_description?: string;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
  function hasGrantedAllScopes(response: TokenResponse, firstScope: string, ...restScopes: string[]): boolean;
  function revoke(accessToken: string, done?: (response: RevocationResponse) => void): void;
}

interface Window {
  google?: { accounts?: { oauth2?: unknown } };
}
