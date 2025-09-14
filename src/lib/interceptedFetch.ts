import { LowercaseLevel } from "./levels";

export let stats: {
  progress: Record<
    LowercaseLevel,
    { learning: number; mature: number; total: number }
  >;
  readyForEarlyReview: string;
};
export let readingExercise: {
  questions: { writing: string; reading: string; german: string }[];
};

const _fetch = unsafeWindow.fetch;

export const startInterceptingFetch = () => {
  unsafeWindow.fetch = async (url, options) => {
    const response = await _fetch(url, options);
    const body = await response.text();
    if (typeof url === "string") {
      if (url === "https://api.cotsu.de/user.php?r=stats") {
        stats = JSON.parse(body);
      } else if (
        url.startsWith("https://api.cotsu.de/user.php?r=review-reading") ||
        url.startsWith("https://api.cotsu.de/user.php?r=learn-reading")
      ) {
        readingExercise = JSON.parse(body);
      }
    }
    return new Response(body, response);
  };
};
