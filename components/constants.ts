import type { ReviewMode } from '../types';

export const DIFF_INSTRUCTION = '所有程式碼修改建議必須使用 diff 格式呈現。';

export const SHARED_DEPENDENCY_INSTRUCTION = `• **相依性檢查:** 在修改過程中，時刻注意避免循環依賴 (circular dependency)。當函式或模組簽名變更時，需同步更新所有引用此模組的檔案，確保導入路徑 (import path) 和函式呼叫簽名 (function call signature) 都已正確更新。`;

export const WORKFLOW_STEP_PROMPT = `You are an expert AI assistant performing a step in an automated code improvement workflow.
The current step is: **{MODE_NAME}**.

Your primary goal is to perform the task associated with this mode and provide ALL code modifications strictly in diff format. Do not include explanations or any other text unless the mode explicitly requires it (like 'Q&A' or 'REVIEW'). Adhere to the principles of the specified mode.

The principles for the **{MODE_NAME}** mode are as follows:
---
{MODE_PROMPT}
---

Analyze the provided files and generate your response based *only* on the current step's goal. Ensure every code change is within a \`\`\`diff block.
`;

export const WORKFLOW_MODES: ReviewMode[] = [
    'REVIEW', 'REFACTOR', 'SIMPLIFY', 'DOCS', 'CONSOLIDATE',
    'BUGFIX', 'OPTIMIZE', 'TESTER', 'SECURITY',
    'DESIGN', 'IMPLEMENT', 'SCALE', 'VERIFY', 'POLISH',
    'Q&A', 'DESIGNER', 'ENHANCE', 'BALANCE'
];

export const SCOPING_PROMPT = `You are an expert code analysis AI. Your task is to identify which of the provided files are relevant to the user's request. Analyze the user's goal and the list of file paths to determine the necessary context for a complete and accurate response. Do NOT analyze the file contents, only the file paths.

User's Request:
"""
{USER_MESSAGE}
"""

Available File Paths:
{FILE_LIST}

Your response MUST be a JSON object. Do not include any other text, explanation, or markdown formatting. The JSON object must have a single key "relevant_files", which is an array of strings. Each string must be the exact file path of a file you deem relevant. If no files seem relevant, return an empty array.

Example Response:
{
  "relevant_files": [
    "src/components/CodeReviewer.tsx",
    "src/services/geminiService.ts"
  ]
}
`;

export const DEEP_DIVE_MESSAGES = [
  '分析語法樹...',
  '檢查設計模式應用...',
  '評估演算法複雜度...',
  '尋找潛在的記憶體洩漏...',
  '審查錯誤處理機制...',
  '驗證程式碼風格一致性...',
  '比對最佳實踐...',
  '正在模擬執行路徑...',
];

export const MODE_SPECIFIC_MESSAGES: Partial<Record<ReviewMode, string[]>> = {
  SECURITY: [
    '掃描 OWASP Top 10 風險...',
    '檢查相依性套件漏洞...',
    '分析潛在的資料洩漏點...',
    '模擬權限繞過攻擊路徑...'
  ],
  OPTIMIZE: [
    '分析演算法的時間複雜度...',
    '評估記憶體分配效率...',
    '尋找非同步處理機會...',
    '檢查資料庫查詢瓶頸...'
  ],
};
