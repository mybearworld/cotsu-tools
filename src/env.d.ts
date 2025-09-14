declare namespace GM {
  export const xmlHttpRequest: (options: {
    url: string;
    data?: string;
    headers?: Record<string, string>;
    method?: string;
    onload: (response: { response: string; status: string }) => void;
    onerror: (response: { response: string; status: string }) => void;
  }) => void;
  export namespace info {
    export namespace script {
      export const version: string;
    }
  }
}

declare const unsafeWindow: Window;
