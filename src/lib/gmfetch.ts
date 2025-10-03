export const gmfetch = (
  options: Pick<GM.Request, "url" | "data" | "headers" | "method">,
) => {
  return new Promise<string>((resolve, reject) => {
    GM.xmlHttpRequest({
      ...options,
      onload: (response) => {
        if (response.status < 200 || response.status > 299) {
          reject();
        }
        resolve(response.response);
      },
      onerror: () => {
        reject();
      },
    });
  });
};
