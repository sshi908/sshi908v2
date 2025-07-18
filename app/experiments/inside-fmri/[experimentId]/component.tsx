"use client";

import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const SLIDE_INTERVAL_MS = 15000;
const SEED_DELAY_MS = 3000;
const INSTRUCTION_DELAY_MS = 5000;

// 단어세트2-3 사이 전용 시간
const RELAX_TIME_BETWEEN_2_3_MS = 1000; // +화면 1초
const INSTRUCTION_TIME_BETWEEN_2_3_MS = 7000; // 설명문 7초

type Props = {
  experimentIdList: string[];
};

type WordMap = { [experimentId: string]: string[] };

type ScreenState =
  | "waiting"
  | "instruction"
  | "secondInstruction"
  | "relax"
  | "words"
  | "ended";

type ExperimentState = {
  isStarted: boolean;
  experimentIndex: number;
  wordIndex: number;
  screenState: ScreenState;
  hasShownInstruction: boolean;
};

export default function ExperimentDisplayComponent({
  experimentIdList,
}: Props) {
  const { push } = useRouter();

  const [words, setWords] = useState<WordMap>({});
  const [state, setState] = useState<ExperimentState>({
    isStarted: false,
    experimentIndex: 0,
    wordIndex: 0,
    screenState: "waiting",
    hasShownInstruction: false,
  });

  // 유틸리티 함수: 지연 실행
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const currentExperimentId = experimentIdList[state.experimentIndex];

  // 상태 업데이트 헬퍼
  const updateState = useCallback(
    (
      updates:
        | Partial<ExperimentState>
        | ((prev: ExperimentState) => Partial<ExperimentState>)
    ) => {
      setState((prev) => ({
        ...prev,
        ...(typeof updates === "function" ? updates(prev) : updates),
      }));
    },
    []
  );

  // 단어세트2-3 사이 특별한 플로우 처리
  const handleSet2To3Transition = useCallback(async () => {
    // 1단계: 첫 번째 +화면 (1초)
    updateState({ screenState: "relax" });
    await delay(RELAX_TIME_BETWEEN_2_3_MS);

    // 2단계: 설명문 (7초)
    updateState({ screenState: "secondInstruction" });
    await delay(INSTRUCTION_TIME_BETWEEN_2_3_MS);

    // 3단계: 두 번째 +화면 (1초)
    updateState({ screenState: "relax" });
    await delay(RELAX_TIME_BETWEEN_2_3_MS);

    // 4단계: 세트3 시작
    updateState({
      screenState: "words",
      experimentIndex: state.experimentIndex + 1,
      wordIndex: 0,
    });
  }, [updateState, state.experimentIndex]);

  // 일반적인 실험 전환 처리
  const handleNormalTransition = useCallback(async () => {
    updateState({ screenState: "relax" });
    await delay(SEED_DELAY_MS);

    updateState((prev) => ({
      screenState: "words",
      experimentIndex:
        prev.experimentIndex < experimentIdList.length
          ? prev.experimentIndex + 1
          : prev.experimentIndex,
      wordIndex: 0,
    }));
  }, [updateState, experimentIdList.length]);

  // 모든 실험 단어 fetch
  const fetchWords = useCallback(async () => {
    const newWords: WordMap = {};
    for (const id of experimentIdList) {
      try {
        const res = await axios.get(`/api/experiments/${id}`);
        newWords[id] = [
          res.data.seedWord,
          ...res.data.words.map((w: { word: string }) => w.word),
        ];
      } catch (err) {
        console.error(`Error fetching words for ${id}:`, err);
      }
    }
    setWords(newWords);
  }, [experimentIdList]);

  // 키 입력 이벤트
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "s" || e.key === "ㄴ") {
        updateState({ isStarted: true });
      }
    },
    [updateState]
  );

  // 단어 fetch (초기)
  useEffect(() => {
    if (experimentIdList.length > 0) fetchWords();
  }, [experimentIdList, fetchWords]);

  // 키 이벤트 등록
  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  // 첫 번째 설명문 표시
  useEffect(() => {
    if (!state.isStarted || !currentExperimentId || state.hasShownInstruction)
      return;

    updateState({ screenState: "instruction" });
    const timer = setTimeout(() => {
      updateState({ screenState: "words", hasShownInstruction: true });
    }, INSTRUCTION_DELAY_MS);

    return () => clearTimeout(timer);
  }, [
    state.isStarted,
    currentExperimentId,
    state.hasShownInstruction,
    updateState,
  ]);

  // 단어 진행 로직
  useEffect(() => {
    if (
      !state.isStarted ||
      !currentExperimentId ||
      state.screenState !== "words"
    ) {
      return;
    }

    const wordList = words[currentExperimentId] || [];
    const isLastWord = state.wordIndex >= wordList.length - 2;

    const timer = setTimeout(() => {
      if (!isLastWord) {
        updateState((prev) => ({ wordIndex: prev.wordIndex + 1 }));
      } else {
        // 단어세트2가 끝난 경우 특별한 플로우 실행
        if (state.experimentIndex === 1) {
          handleSet2To3Transition();
        } else {
          // 다른 단어세트들은 기존 로직 유지
          handleNormalTransition();
        }
      }
    }, SLIDE_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [
    state.isStarted,
    currentExperimentId,
    state.screenState,
    state.experimentIndex,
    state.wordIndex,
    words,
    handleSet2To3Transition,
    handleNormalTransition,
    updateState,
  ]);

  // 실험 종료 여부 확인
  const isEnded =
    state.experimentIndex >= experimentIdList.length ||
    (state.experimentIndex === experimentIdList.length - 1 &&
      words[currentExperimentId] &&
      state.wordIndex >= words[currentExperimentId].length);

  // 화면 렌더링
  if (!state.isStarted || state.screenState === "relax") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-6xl">+</div>
      </div>
    );
  }

  if (
    state.screenState === "instruction" ||
    state.screenState === "secondInstruction"
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black px-8 text-center">
        <div className="text-white text-2xl space-y-16 leading-relaxed">
          <p>왼쪽에 흐린 글씨로 이전에 입력한 단어가 나오고</p>
          <p>오른쪽에는 여러분이 생각해야 할 단어가 큰 글씨로 보일 것입니다.</p>
          <p>오른쪽의 큰 단어를 보고</p>
          <p>자신만의 의미를 떠올려보세요.</p>
          <p>
            '아 내가 이런 생각으로 혹은 아무 의미 없이 이 단어를
            떠올렸겠구나'하고
          </p>
          <p>그 단어에 대한 자신만의 의미를 생각해보세요.</p>
        </div>
      </div>
    );
  }

  if (isEnded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <div
          className="text-6xl text-gray-500 text-center leading-relaxed cursor-pointer"
          onClick={() => {
            const idList = new URLSearchParams(experimentIdList.join(","));
            push(`/experiments/rating/${idList.toString()}`);
          }}
        >
          <div>모든 단어를 연상해주셨습니다.</div>
          <div>감사합니다.</div>
        </div>
      </div>
    );
  }

  // 단어 슬라이드 렌더링
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="relative w-full max-w-3xl h-100 flex items-center justify-center">
        <div className="absolute left-1/5 transform -translate-x-1/2 text-6xl text-gray-500">
          {words[currentExperimentId]?.[state.wordIndex] ?? ""}
        </div>
        <div className="absolute right-1/5 transform translate-x-1/2 text-8xl font-bold text-white">
          {words[currentExperimentId]?.[state.wordIndex + 1] ?? ""}
        </div>
      </div>
    </div>
  );
}
