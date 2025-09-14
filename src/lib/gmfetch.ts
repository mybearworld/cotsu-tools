export const gmfetch = (
  options: Pick<GM.Request, "url" | "data" | "headers" | "method">,
) => {
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
