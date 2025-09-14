const LOWERCASE_LEVELS = {
  N5: "n5",
  N4: "n4",
  N3: "n3",
  N2: "n2",
  N1: "n1",
} as const;

export let stats: {
  progress: Record<
    (typeof LOWERCASE_LEVELS)[keyof typeof LOWERCASE_LEVELS],
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
