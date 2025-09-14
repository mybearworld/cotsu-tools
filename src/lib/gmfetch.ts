export const gmfetch = (options: {
  url: string;
  data?: string;
  headers?: Record<string, string>;
  method?: string;
}) => {
  return new Promise<string>((resolve, reject) => {
    GM.xmlHttpRequest({
      ...options,
      onload: (response) => {
        resolve(response.response);
      },
      onerror: () => {
        reject();
      },
    });
  });
};
