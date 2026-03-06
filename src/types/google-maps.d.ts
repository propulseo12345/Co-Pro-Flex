export {};

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: {
              types?: string[];
              componentRestrictions?: { country: string };
              fields?: string[];
            }
          ) => {
            addListener: (event: string, callback: () => void) => void;
            getPlace: () => {
              address_components?: Array<{
                long_name: string;
                short_name?: string;
                types: string[];
              }>;
              name?: string;
            };
          };
        };
        event?: {
          clearInstanceListeners: (instance: unknown) => void;
        };
      };
    };
  }
}
