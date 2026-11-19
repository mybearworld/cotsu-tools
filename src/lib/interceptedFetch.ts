import { gmfetch } from "./gmfetch";
import { LowercaseLevel } from "./levels";

export let stats: {
  userid: string;
  progress: Record<
    LowercaseLevel,
    { learning: number; mature: number; total: number }
  >;
  readyForEarlyReview: string;
  totalLearned: number;
};
export let readingExercise: {
  questions: {
    writing: string;
    reading: string;
    german: string;
    qid: string;
  }[];
  questionCount: number;
};
export let didntKnowQids = new Set<string>();

export let authorization: string;

const _fetch = unsafeWindow.fetch;

export const startInterceptingFetch = () => {
  unsafeWindow.fetch = async (url, options) => {
    if (options?.headers && "Authorization" in options?.headers) {
      authorization = options.headers.Authorization;
    }
    let requestBody = options?.body;
    const response = await _fetch(url, { ...options });
    let body = await response.text();
    if (typeof url === "string") {
      if (url === "https://api.cotsu.de/user.php?r=stats") {
        stats = JSON.parse(body);
      } else if (
        url.startsWith("https://api.cotsu.de/user.php?r=review-reading") ||
        url.startsWith("https://api.cotsu.de/user.php?r=learn-reading")
      ) {
        readingExercise = JSON.parse(body);
      } else if (
        url === "https://api.cotsu.de/user.php?r=start-reading" &&
        typeof requestBody === "string"
      ) {
        const parsedRequestBody = JSON.parse(requestBody);
        const qids: { qid: string }[] = parsedRequestBody.qids;
        const auth =
          options?.headers ?
            "Authorization" in options.headers ?
              options.headers.Authorization
            : null
          : null;
        if (auth) {
          await gmfetch({
            url: "https://api.cotsu.de/user.php?r=update-progress",
            method: "POST",
            headers: { Authorization: auth },
            data: JSON.stringify({
              answers: qids.map((qid) => ({ qid: qid.qid, correct: 0 })),
            }),
          });
        }
      }
    }
    return new Response(body, response);
  };
};
