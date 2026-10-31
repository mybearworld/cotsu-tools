import { getAccountMode, setAccount, AccountMode } from "./accountMode";
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
export let exerciseMode: AccountMode = "reading";
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
export let writingWrongQids = new Set<string>();
// Native reading successes that must be removed from the displayed score.
export let writingOnlyWrongQids = new Set<string>();

export const DUMMY_QUESTION_ID = "cotsu-tools-dummy-question";

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
        (answer: { correct: number; qid: string }) => {
          if (answer.qid === DUMMY_QUESTION_ID) return [];
          if (answer.correct && writingWrongQids.has(answer.qid)) {
            writingOnlyWrongQids.add(answer.qid);
          }
          return {
            qid: answer.qid,
            correct: didntKnowQids.has(answer.qid) || writingWrongQids.has(answer.qid)
              ? 0 : answer.correct,
          };
        },
      );
      requestBody = JSON.stringify(parsedRequestBody);
    }
    const response = await _fetch(url, { ...options, body: requestBody });
    let body = await response.text();
    if (typeof url === "string") {
      if (url === "https://api.cotsu.de/user.php?r=stats") {
        stats = JSON.parse(body);
        setAccount(stats.userid);
      } else if (
        url.startsWith("https://api.cotsu.de/user.php?r=review-reading") ||
        url.startsWith("https://api.cotsu.de/user.php?r=learn-reading")
      ) {
        const parsedBody = JSON.parse(body);
        exerciseMode = getAccountMode();
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
          didntKnowQids = new Set();
          writingWrongQids = new Set();
          writingOnlyWrongQids = new Set();
        }
        body = JSON.stringify(parsedBody);
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
