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

export const DUMMY_QUESTION_ID = "cotsu-tools-dummy-question";
export const DUMMY_QUESTION_WRITING = "漢字 foo bar"; //  // Kanji are required to get the reading question to show up; Latin characters to make sure the writing stays unique
export const DUMMY_QUESTION_INCORRECT_READING = "えいじ";
export const DUMMY_QUESTION_READING = "かんじ";

export let authorization: string;

const _fetch = unsafeWindow.fetch;

export const startInterceptingFetch = () => {
  unsafeWindow.fetch = async (url, options) => {
    if (options?.headers && "Authorization" in options?.headers) {
      authorization = options.headers.Authorization;
    }
    let requestBody = options?.body;
    if (
      typeof requestBody === "string" &&
      url === "https://api.cotsu.de/user.php?r=update-progress"
    ) {
      const parsedRequestBody = JSON.parse(requestBody);
      parsedRequestBody.answers = parsedRequestBody.answers.flatMap(
        (answer: { correct: number; qid: string }) =>
          answer.qid === DUMMY_QUESTION_ID ?
            []
          : {
              qid: answer.qid,
              correct: didntKnowQids.has(answer.qid) ? 0 : answer.correct,
            },
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
          parsedBody.questions.length = 3;
          parsedBody.questions.push({
            writing: DUMMY_QUESTION_WRITING,
            reading: DUMMY_QUESTION_READING, // An empty reading makes it a writing question.
            german: "",
            sentence: "Das war's!",
            sentence_german: null,
            qtype: "3",
            qid: DUMMY_QUESTION_ID,
            kanjis: [],
          });
          readingExercise = parsedBody;
          didntKnowQids = new Set();
        }
        parsedBody.questionCount = parsedBody.questions.length;
        body = JSON.stringify(parsedBody);
        readingExercise = parsedBody;
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
