import { authorization } from "./interceptedFetch";
import { gmfetch } from "./gmfetch";

export const kanjiSearch = async (
  kanji: string,
): Promise<KanjiSearchWord[]> => {
  const response = await gmfetch({
    url: `https://api.cotsu.de/user.php?r=search&search=${kanji}`,
    method: "GET",
    headers: {
      Authorization: authorization,
    },
  });
  return [
    ...JSON.parse(response).words,
    ...JSON.parse(response).kanjis,
  ] as KanjiSearchWord[];
};

export type KanjiSearchWord = {
  word: string;
  reading: string;
  word_de: string | null;
  qid: string;
  list: string;
  lastseen: string | null;
  maturity: string | null;
};
