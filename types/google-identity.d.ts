/**
 * Google Identity Services, the small surface of it we actually call.
 *
 * Lived inside the login page until the account gate needed the same button.
 * A global augmentation that only exists while one particular page is in the
 * compilation is a trap, so it lives here now.
 */
export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            nonce: string;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}
