"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RatingPage() {
  const [experiments, setExperiments] = useState<
    {
      experimentId: string;
      username: string;
      seedWord: string;
      wordCount: number;
      createdAt: string;
    }[]
  >([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    async function fetchExperiments() {
      try {
        const response = await axios.get("/api/experiments");
        setExperiments(response.data);
      } catch (error) {
        console.error("실험 데이터를 불러오는 중 오류 발생:", error);
      }
    }
    fetchExperiments();
  }, []);

  // 사용자 목록 추출
  const users = [...new Set(experiments.map((exp) => exp.username))];

  // 선택된 사용자의 실험들 필터링
  const userExperiments = experiments.filter(
    (exp) => exp.username === selectedUser
  );

  const getExperimentIdList = (experiments: typeof userExperiments) => {
    return experiments.map((exp) => exp.experimentId);
  };

  const handleStartRating = () => {
    if (userExperiments.length === 0) return;

    const experimentIdList = getExperimentIdList(userExperiments);
    const idList = new URLSearchParams(experimentIdList.join(","));

    router.push(`/experiments/rating/${idList.toString()}`);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">단어 평가</h1>

      <div className="w-full max-w-2xl bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          사용자 선택
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            평가할 사용자를 선택하세요:
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">사용자를 선택하세요</option>
            {users.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>

        {selectedUser && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              {selectedUser}님의 실험 목록
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              {userExperiments.length === 0 ? (
                <p className="text-gray-500">
                  선택된 사용자의 실험이 없습니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {userExperiments.map((experiment) => (
                    <li
                      key={experiment.experimentId}
                      className="flex justify-between items-center p-2 bg-white rounded border"
                    >
                      <div>
                        <span className="font-medium">
                          시드 단어: {experiment.seedWord}
                        </span>
                        <span className="text-sm text-gray-500 ml-4">
                          단어 개수: {experiment.wordCount}개
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(experiment.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/experiments")}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-700"
          >
            실험 목록으로 돌아가기
          </button>
          <button
            onClick={handleStartRating}
            disabled={userExperiments.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            평가 시작
          </button>
        </div>
      </div>
    </div>
  );
}
