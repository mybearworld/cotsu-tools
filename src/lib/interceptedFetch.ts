import { LowercaseLevel } from "./levels";

export let stats: {
  userid: string;
  progress: Record<
    LowercaseLevel,
    { learning: number; mature: number; total: number }
  >;
  readyForEarlyReview: string;
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

export const DUMMY_QUESTION_ID = "cotsu-tools-dummy-question";

const _fetch = unsafeWindow.fetch;

export const startInterceptingFetch = () => {
  unsafeWindow.fetch = async (url, options) => {
    let requestBody = options?.body;
    if (
      typeof requestBody === "string" &&
      url === "https://api.cotsu.de/user.php?r=update-progress"
    ) {
      const parsedRequestBody = JSON.parse(requestBody);
      parsedRequestBody.answers = parsedRequestBody.answers.filter(
        (answer: { correct: number; qid: string }) =>
          answer.qid !== DUMMY_QUESTION_ID,
      );
      requestBody = JSON.stringify(parsedRequestBody);
    }
    const response = await _fetch(url, { ...options, body: requestBody });
    let body = await response.text();
    if (typeof url === "string") {
      if (url === "https://api.cotsu.de/user.php?r=stats") {
        stats = JSON.parse(body);
      } else if (
        url.startsWith("https://api.cotsu.de/user.php?r=review-reading") ||
        url.startsWith("https://api.cotsu.de/user.php?r=learn-reading")
      ) {
        const parsedBody = JSON.parse(body);
        if (parsedBody.questions.length !== 0) {
          parsedBody.questionCount = parsedBody.questions.length;
          parsedBody.questions.push({
            writing: "",
            reading: "",
            german: "",
            sentence: "Das war's!",
            sentence_german: "",
            qtype: "3",
            qid: DUMMY_QUESTION_ID,
            kanjis: [],
          });
          readingExercise = parsedBody;
        }
        body = JSON.stringify(parsedBody);
      }
    }
    return new Response(body, response);
  };
};
