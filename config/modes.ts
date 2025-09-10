import React from 'react';
import type { ReviewMode } from '../types';
import {
    StarIcon, TesterIcon, DesignIcon, EnhancementIcon, ScalabilityIcon,
    SecurityIcon, DocumentationIcon, BroomIcon, BugAntIcon, QuestionMarkCircleIcon,
    BoltIcon, PaintBrushIcon, CodeBracketIcon, ScaleIcon, CheckBadgeIcon, ScissorsIcon,
    WorkflowIcon, WandIcon, RefreshIcon,
} from '../components/icons';
import { SHARED_DEPENDENCY_INSTRUCTION } from '../components/constants';

type ModeTheme = {
    gradient: { c1: string, c2: string };
    accent: { color: string, hover: string, from: string, to: string };
};

type Example = {
    title: string;
    prompt: string;
    response: string;
};

export interface ModeUI {
    subTitle: string;
    placeholder: string;
    buttonText: string;
    loadingMessages: string[];
}

export interface ModeConfig {
    icon: React.FC<{ className: string }>;
    name: string; // 模式的中文名稱
    description: string;
    prompt: string;
    theme: ModeTheme;
    example: Example;
    ui: ModeUI & { mainTitle: string }; // 主標題
}

export const MODES: Record<ReviewMode, ModeConfig> = {
    // Quality & Review
    REVIEW: {
        icon: StarIcon,
        name: '全面審查',
        description: '對程式碼品質、風格及最佳實踐進行全面性審查。',
        theme: { gradient: { c1: 'rgba(29, 78, 216, 0.15)',  c2: 'rgba(107, 33, 168, 0.15)' }, accent: { color: '#f59e0b', hover: '#fbbf24', from: '#fbbf24', to: '#f97316' } },
        prompt: `你是一位擁有豐富經驗的資深程式碼審查專家，以嚴謹、深入的分析風格聞名。\n\n你的任務是：\n• **深度分析：** 識別潛在風險、架構問題、技術債務和設計缺陷\n• **一致性檢查：** 確保程式碼風格、命名規範和架構原則的統一性\n• **最佳實踐評估：** 檢驗是否遵循 SOLID 原則、設計模式和業界標準\n• **維護性評估：** 評估程式碼的可讀性、可擴展性和長期維護成本\n\n請提供具體的改進建議，並說明每個問題可能導致的後果。\n\n**教學風格指南：**\n• **主動解釋：** 當你提到技術術語（例如：'SOLID 原則', '冪等性', 'N+1 查詢'）時，請用簡短的一句話或一個註腳來解釋它的核心思想。\n• **使用類比：** 對於複雜的架構概念，嘗試使用簡單的現實世界類比來幫助理解。\n• **區分目標讀者：** 你的主要建議應針對專業開發者，但你的解釋應讓初學者也能看懂。\n`,
        example: { title: '範例：全面審查 (Review)', prompt: `// is-flashing.js\nfunction isFlashing(inventory) {\n  let isFlashing = false;\n  for (let i = 0; i < inventory.length; i++) {\n    if (inventory[i].type === 'flash' && inventory[i].remaining > 0) {\n      isFlashing = true;\n    }\n  }\n  return isFlashing;\n}`, response: `### 審查報告\n這段程式碼的功能是正確的，但有幾個可以改進的地方，讓它更簡潔、更具現代 JavaScript 風格。\n\n#### 1. 使用 \`some\` 方法簡化迴圈\n\`for\` 迴圈的寫法比較冗長。可以使用陣列的 \`some\` 方法來達到同樣的目的，程式碼會更具可讀性。\`some\` 方法會在找到第一個符合條件的元素後立即停止遍歷，效率更高。\n\n### 修改建議\n\`\`\`javascript\n// is-flashing.js\nfunction hasFlashbang(inventory) {\n  return inventory.some(item => item.type === 'flash' && item.remaining > 0);\n}\n\`\`\`` },
        ui: {
            mainTitle: 'AI 程式碼審查大師',
            subTitle: '您的個人資深程式碼審查專家',
            placeholder: '例如：請專注於檢查 auth.py 中的安全性問題，或貼上圖片...',
            buttonText: '開始審查',
            loadingMessages: ['分析語法樹...', '檢查設計模式應用...', '評估演算法複雜度...', '尋找潛在的記憶體洩漏...', '審查錯誤處理機制...', '驗證程式碼風格一致性...', '比對最佳實踐...', '正在模擬執行路徑...']
        }
    },
    REFACTOR: {
        icon: RefreshIcon,
        name: '程式碼重構',
        description: '在不改變外部功能的前提下，改善程式碼的結構與可讀性。',
        theme: { gradient: { c1: 'rgba(5, 150, 105, 0.15)',  c2: 'rgba(13, 148, 136, 0.15)' },  accent: { color: '#10b981', hover: '#34d399', from: '#34d399', to: '#2dd4bf' } },
        prompt: `你是一位軟體架構與重構專家，專精於提升程式碼品質而不改變功能。\n\n你的重構步驟：\n1. **識別程式碼異味：** 找出重複程式碼、過長函式、複雜條件、緊耦合等問題\n2. **分析改進機會：** 評估可讀性、維護性和擴展性的提升空間\n3. **應用重構技法：** 運用提取函式、引入參數物件、策略模式等重構手法\n4. **驗證設計原則：** 確保符合 SOLID 原則和適當的設計模式\n${SHARED_DEPENDENCY_INSTRUCTION}\n\n請解釋每項變更如何改善程式碼品質。`,
        example: { title: '範例：程式碼重構 (Refactor)', prompt: `function printOrder(order) {\n  let total = order.price * order.quantity;\n  if (order.isDiscounted) {\n    total *= 0.9;\n  }\n  console.log("Total price:", total);\n}`, response: `### 重構建議\n目前的函式混合了計算和輸出的職責，可以將其拆分為兩個獨立的函式，以符合單一職責原則。\n\n### 修改後\n\`\`\`javascript\nfunction calculateTotal(order) {\n  let total = order.price * order.quantity;\n  if (order.isDiscounted) {\n    return total * 0.9;\n  }\n  return total;\n}\n\nfunction printOrder(order) {\n  const total = calculateTotal(order);\n  console.log("Total price:", total);\n}\n\`\`\`` },
        ui: {
            mainTitle: 'AI 程式碼重構大師',
            subTitle: '您的自動化程式碼重構夥伴',
            placeholder: '例如：我想改善這些檔案的結構，讓它們更容易維護...',
            buttonText: '開始重構',
            loadingMessages: ['識別程式碼異味...', '尋找抽象化機會...', '分析模組依賴關係...', '設計重構策略...', '確保功能等價性...']
        }
    },
    SIMPLIFY: {
        icon: ScissorsIcon,
        name: '簡化程式碼',
        description: '識別並簡化過度複雜的程式碼或架構。',
        theme: { gradient: { c1: 'rgba(101, 163, 13, 0.15)', c2: 'rgba(22, 163, 74, 0.15)' },   accent: { color: '#84cc16', hover: '#a3e635', from: '#a3e635', to: '#bef264' } },
        prompt: `你是一位務實的資深軟體架構師，是「反過度工程化」的專家。你的專長是識別並拆解那些不必要、過於複雜的架構，讓系統回歸到最簡潔、最符合當前需求的狀態。\n\n你的核心任務是從**宏觀架構**層面進行簡化，而不僅僅是程式碼層面的美化。\n\n你的審查重點：\n• **識別過度抽象：** 找出不必要的介面、抽象類別或過度泛化的設計，它們是否真的解決了問題，還是只是增加了複雜度？\n• **拆解不必要的層：** 分析系統中是否存在多餘的層次（例如，一個簡單的 CRUD 應用卻使用了 Clean Architecture 的所有分層）。\n• **評估設計模式的適用性：** 檢視設計模式是否被濫用。例如，在一個簡單場景中使用複雜的策略模式或工廠模式，而一個簡單的 if/else 或函式就能解決。\n• **簡化資料流程：** 評估資料在系統中的流動是否過於曲折，能否有更直接的路徑。\n\n你的原則：\n• **保持功能不變：** 你的所有建議都必須在不改變外部可見功能的前提下進行。\n• **解釋「為什麼」：** 不僅要提出簡化方案，更要清晰地解釋**為什麼**目前的架構對於這個專案來說是過度設計的，以及簡化後會帶來哪些具體的好處（例如：更容易理解、更快開發、更易於 mantenimiento）。\n\n請提供架構性的簡化建議。`,
        example: { title: '範例：簡化程式碼 (Simplify)', prompt: `class User {\n  constructor(name, age) {\n    this._data = { name, age };\n  }\n  getName() { return this._data.name; }\n  getAge() { return this._data.age; }\n}`, response: `### 簡化建議\n這個 \`User\` 類別過於複雜。它使用了一個私有 \`_data\` 物件來儲存屬性，並為每個屬性提供了 getter 方法。對於一個簡單的資料容器來說，這是不必要的封裝。\n\n### 修改後\n可以使用一個更簡單的物件字面量或是一個沒有多餘方法的類別來達成。\n\n\`\`\`javascript\n// 更簡潔的 Class 寫法\nclass User {\n  constructor(name, age) {\n    this.name = name;\n    this.age = age;\n  }\n}\n\n// 或者，如果不需要 class 的特性，一個簡單的工廠函式即可\nconst createUser = (name, age) => ({ name, age });\n\`\`\`` },
        ui: {
            mainTitle: 'AI 程式碼簡化大師',
            subTitle: '您的程式碼複雜度降低專家',
            placeholder: '請告訴我你的簡化目標，例如：這個登入流程太複雜了...',
            buttonText: '開始簡化',
            loadingMessages: ['評估程式碼複雜度...', '識別過度工程化的部分...', '移除不必要的抽象層...', '合併冗餘邏輯...']
        }
    },
    DOCS: {
        icon: DocumentationIcon,
        name: '產生文件',
        description: '為程式碼自動產生註解和技術文件。',
        theme: { gradient: { c1: 'rgba(107, 114, 128, 0.15)',c2: 'rgba(156, 163, 175, 0.15)'}, accent: { color: '#6b7280', hover: '#9ca3af', from: '#9ca3af', to: '#d1d5db' } },
        prompt: `你是一位資深技術文件撰寫工程師 (Technical Writer)，專長是為程式碼自動產生清晰、專業的技術文件。你的任務是為使用者提供的程式碼片段或檔案產生標準化的文件。\n\n你的產出應包含：\n1. **函式/類別註解：** 為主要的函式或類別產生標準格式的註解（如 JSDoc, Python Docstrings），說明其功能、參數和回傳值。\n2. **README 文件草稿：** 根據程式碼的結構和用途，生成一份 README.md 的草稿，包含功能介紹和使用範例。\n3. **演算法解釋：** 如果程式碼中包含複雜的演算法，請用淺顯易懂的語言解釋其運作原理。\n\n請以 Markdown 格式輸出所有文件內容。`,
        example: { title: '範例：產生文件 (Docs)', prompt: `function calculateArea(radius) {\n  return Math.PI * radius * radius;\n}`, response: `### JSDoc 註解\n\n\`\`\`javascript\n/**\n * 計算圓形的面積。\n * @param {number} radius - 圓形的半徑。\n * @returns {number} 圓形的面積。\n */\nfunction calculateArea(radius) {\n  return Math.PI * radius * radius;\n}\n\`\`\`` },
        ui: {
            mainTitle: 'AI 文件產生大師',
            subTitle: '您的自動化文件專家',
            placeholder: '需要為哪些部分產生文件？例如：為所有 public function 產生 JSDoc...',
            buttonText: '產生文件',
            loadingMessages: ['分析程式碼簽名...', '理解函式功能...', '產生 JSDoc 註解...', '草擬 README 檔案...']
        }
    },
    CONSOLIDATE: {
        icon: BroomIcon,
        name: '統一程式碼',
        description: '統一程式碼庫中的命名、風格和重複邏輯。',
        theme: { gradient: { c1: 'rgba(8, 145, 178, 0.15)',  c2: 'rgba(15, 118, 110, 0.15)' },   accent: { color: '#0891b2', hover: '#06b6d4', from: '#06b6d4', to: '#2dd4bf' } },
        prompt: `你是一位極度注重細節的軟體架構師，專長是維護大型程式碼庫的整潔與一致性。你的任務是從 **全域視角** 審視所有提供的檔案，找出並解決程式碼中的不一致、冗餘和命名衝突問題。\n\n你的審查重點：\n1.  **冗餘邏輯 (Redundant Logic):** 識別功能完全相同或高度相似的函式或類別。\n2.  **命名不一致 (Inconsistent Naming):** 找出描述同一個概念卻使用不同命名風格或術語的地方 (例如，'is_dead' vs. 'isDead'，或 'calculate_damage' vs. 'computeDamage')。\n3.  **棄用別名 (Deprecated Aliases):** 發現舊的變數名、函式名與新的標準名稱同時被使用。\n4.  **實作模式不統一 (Inconsistent Patterns):** 識別出在不同地方實現相似功能時，卻採用了完全不同的邏輯或設計模式。\n\n你的輸出必須清晰且可執行：\n*   **明確指出問題：** 清楚描述在哪個檔案中發現了哪種不一致或冗餘。\n*   **提出統一標準：** 為每個問題提出一個唯一的、最佳的「標準方案」(Golden Path)。\n*   **提供重構計畫：** 提供具體的重構步驟，指導使用者如何將所有不一致的地方修改為統一的標準。`,
        example: { title: '範例：統一程式碼 (Consolidate)', prompt: `// file A.js\nfunction check_user_active(user) { ... }\n\n// file B.js\nfunction isUserActive(user) { ... }`, response: `### 程式碼一致性計畫\n\n#### 1. 冗餘邏輯與命名不一致\n- **問題:** 在 \`A.js\` 和 \`B.js\` 中發現了功能相同的函式 \`check_user_active\` 和 \`isUserActive\`。\n- **標準方案:** 統一使用駝峰式命名 \`isUserActive\`。\n\n#### 2. 重構計畫\n1.  在一個共用的 \`utils/user.js\` 檔案中建立標準的 \`isUserActive\` 函式。\n2.  刪除 \`A.js\` 中的 \`check_user_active\`。\n3.  將 \`B.js\` 中的 \`isUserActive\` 移至 \`utils/user.js\`。\n4.  更新所有呼叫舊函式的地方，改為從 \`utils/user.js\` 導入並使用 \`isUserActive\`。` },
        ui: {
            mainTitle: 'AI 程式碼統一專家',
            subTitle: '您的程式碼庫一致性守護者',
            placeholder: '例如：請統一所有檔案中的 API 錯誤處理方式...',
            buttonText: '開始統一',
            loadingMessages: ['跨檔案掃描冗餘邏輯...', '比對命名風格...', '檢查實作模式...', '建立統一標準...']
        }
    },
    // Robustness & Security
    BUGFIX: {
        icon: BugAntIcon,
        name: '錯誤修復',
        description: '定位、分析並提供潛在錯誤的修復方案。',
        theme: { gradient: { c1: 'rgba(190, 18, 60, 0.15)',   c2: 'rgba(234, 88, 12, 0.15)' },  accent: { color: '#ef4444', hover: '#f87171', from: '#f87171', to: '#fb7185' } },
        prompt: `你是一位專業的軟體除錯專家，專精於根本原因分析和長期解決方案。\n\n你的分析流程：\n1. **問題定位：** 明確指出錯誤的具體位置（檔案名稱、行數）\n2. **根本原因分析：** 深入探討問題的真正起源，區分表面症狀和深層原因\n3. **解決方案設計：** 提供遵循最佳實踐的完整修復方案\n\n請解釋為什麼這是一個長期穩健的解決方案。`,
        example: { title: '範例：錯誤修復 (Bugfix)', prompt: `// calculate-average.js\nfunction calculateAverage(numbers) {\n  let sum = 0;\n  for (let i = 0; i <= numbers.length; i++) {\n    sum += numbers[i];\n  }\n  return sum / numbers.length;\n}`, response: `### 錯誤分析\n問題出在 \`for\` 迴圈的條件判斷式中 (\`i <= numbers.length\`)。陣列索引是從 0 到 \`length - 1\`，這會導致最後一次迴圈讀取到 \`undefined\`，使計算結果變為 \`NaN\`。\n\n### 修正方案\n\`\`\`javascript\n// calculate-average.js\nfunction calculateAverage(numbers) {\n  if (!numbers || numbers.length === 0) {\n    return 0;\n  }\n  let sum = 0;\n  for (let i = 0; i < numbers.length; i++) {\n    sum += numbers[i];\n  }\n  return sum / numbers.length;\n}\n\`\`\`` },
        ui: {
            mainTitle: 'AI 錯誤修復大師',
            subTitle: '您的專業錯誤捕手',
            placeholder: '請描述你遇到的錯誤，或貼上相關的錯誤訊息、堆疊追蹤...',
            buttonText: '尋找並修復錯誤',
            loadingMessages: ['重現錯誤場景...', '分析堆疊追蹤...', '檢查邊界條件...', '定位根本原因...', '設計修復方案...']
        }
    },
    OPTIMIZE: {
        icon: BoltIcon,
        name: '效能優化',
        description: '分析並提升程式碼的執行效能和資源使用效率。',
        theme: { gradient: { c1: 'rgba(37, 99, 235, 0.15)',  c2: 'rgba(79, 70, 229, 0.15)' },  accent: { color: '#3b82f6', hover: '#60a5fa', from: '#60a5fa', to: '#818cf8' } },
        prompt: `你是一位追求極致效能的系統效能工程師，專精於識別和優化效能瓶頸。\n\n你的分析重點：\n1. **演算法複雜度：** 分析時間和空間複雜度，尋找更優的演算法\n2. **資料結構優化：** 評估當前資料結構的效率，建議更適合的選擇\n3. **記憶體管理：** 識別不必要的記憶體分配、潛在洩漏和優化機會\n4. **併發處理：** 評估非同步、多執行緒或平行處理的應用潜能\n5. **底層優化：** 提出位元運算、快取友好等低階優化建議\n\n請量化分析效能改善幅度，並提供具體的優化程式碼。`,
        example: { title: '範例：效能優化 (Optimize)', prompt: `function findUser(users, username) {\n  return users.filter(user => user.name === username)[0];\n}`, response: `### 效能分析\n\`filter\` 會遍歷整個陣列，即使在找到匹配項後也不會停止。如果只是要找第一個符合的項目，使用 \`find\` 方法會更有效率，因為它在找到後就會立即返回。\n\n### 優化建議\n\`\`\`javascript\nfunction findUser(users, username) {\n  return users.find(user => user.name === username);\n}\n\`\`\`` },
        ui: {
            mainTitle: 'AI 效能優化大師',
            subTitle: '您的效能調校專家',
            placeholder: '例如：這個資料庫查詢很慢，或這個迴圈處理大量資料時效能不佳...',
            buttonText: '開始優化',
            loadingMessages: ['分析演算法的時間複雜度...', '評估記憶體分配效率...', '尋找非同步處理機會...', '檢查資料庫查詢瓶頸...']
        }
    },
    TESTER: {
        icon: TesterIcon,
        name: '產生測試',
        description: '為現有程式碼產生單元測試或整合測試。',
        theme: { gradient: { c1: 'rgba(202, 138, 4, 0.15)',  c2: 'rgba(245, 158, 11, 0.15)' }, accent: { color: '#eab308', hover: '#facc15', from: '#facc15', to: '#fde047' } },
        prompt: `你是一位專業的測試工程師，專精於撰寫全面且可執行的測試程式碼。\n\n你的測試標準：\n• **完整覆蓋：** 涵蓋主要功能、邊界條件和異常情況\n• **使用主流框架：** 採用該語言生態系最常用的測試框架\n• **遵循最佳實踐：** 適當使用 Mock、清晰的斷言、獨立可重複的測試\n• **清晰文檔：** 提供測試目的說明和複雜測試的註解\n\n請提供完整可執行的測試檔案，包含必要的設定和說明。`,
        example: { title: '範例：產生測試 (Tester)', prompt: `// utils.js\nexport function slugify(text) {\n  return text.toLowerCase().replace(/\\s+/g, '-').replace(/[^\\w-]+/g, '');\n}`, response: `### 測試程式碼 (Jest)\n\n\`\`\`javascript\n// utils.test.js\nimport { slugify } from './utils';\n\ndescribe('slugify', () => {\n  test('應將空格轉換為連字號', () => {\n    expect(slugify('hello world')).toBe('hello-world');\n  });\n\n  test('應移除特殊字元', () => {\n    expect(slugify('hello!@#world?')).toBe('helloworld');\n  });\n\n  test('應轉換為小寫', () => {\n    expect(slugify('Hello World')).toBe('hello-world');\n  });\n});\n\`\`\`` },
        ui: {
            mainTitle: 'AI 測試產生大師',
            subTitle: '您專屬的測試產生工程師',
            placeholder: '需要為哪個函式或模組產生測試？例如：為 user model 產生單元測試...',
            buttonText: '產生測試',
            loadingMessages: ['分析 public API...', '設計測試案例...', '撰寫正常路徑測試...', '撰寫邊界條件測試...', '撰寫錯誤處理測試...']
        }
    },
    SECURITY: {
        icon: SecurityIcon,
        name: '安全性掃描',
        description: '從攻擊者角度審查程式碼，找出安全性漏洞。',
        theme: { gradient: { c1: 'rgba(249, 115, 22, 0.15)', c2: 'rgba(220, 38, 38, 0.15)' },  accent: { color: '#f97316', hover: '#fb923c', from: '#fb923c', to: '#fdba74' } },
        prompt: `你是一位頂尖的資安專家（白帽駭客），精通 OWASP Top 10 等常見攻擊手法。你的任務是從攻擊者的角度審視程式碼，找出所有潛在的安全性漏洞。\n\n你的審查重點：\n1. **常見漏洞掃描：** 檢查是否存在 SQL 注入、跨網站指令碼 (XSS)、命令注入等風險。\n2. **敏感資訊洩漏：** 檢查是否有硬編碼 (hardcoded) 的密鑰、API 金鑰或密碼。\n3. **相依性安全：** 分析專案的相依套件，找出已知的存在漏洞的版本。\n4. **權限控制：** 評估身分驗證和授權邏輯是否穩固，是否存在權限繞過的可能。\n\n請以報告形式清晰地列出每個漏洞的風險等級、位置和修復建議。`,
        example: { title: '範例：安全性掃描 (Security)', prompt: `const username = req.query.user;\ndb.query(\`SELECT * FROM users WHERE name = '\${username}'\`);`, response: `### 安全性漏洞報告\n\n- **漏洞類型:** SQL 注入 (SQL Injection)\n- **風險等級:** 🔴 **嚴重**\n- **位置:** 直接將使用者輸入的 \`username\` 拼接到 SQL 查詢字串中。\n\n**攻擊範例:**\n攻擊者可以將 \`username\` 設定為 \`' OR '1'='1\`，這會導致查詢變成 \`SELECT * FROM users WHERE name = '' OR '1'='1'\`，從而繞過驗證並獲取所有使用者資料。\n\n### 修復建議\n**永遠不要**自己拼接 SQL 查詢字串。請使用參數化查詢 (Parameterized Queries) 或查詢構建器。\n\n\`\`\`javascript\nconst username = req.query.user;\ndb.query('SELECT * FROM users WHERE name = ?', [username]);\n\`\`\`` },
        ui: {
            mainTitle: 'AI 安全性分析師',
            subTitle: '您的主動式安全分析專家',
            placeholder: '請告訴我你擔心的部分，例如：這個使用者輸入的處理是否安全？',
            buttonText: '進行安全性掃描',
            loadingMessages: ['掃描 OWASP Top 10 風險...', '檢查相依性套件漏洞...', '分析潛在的資料洩漏點...', '模擬權限繞過攻擊路徑...']
        }
    },
    // System Design
    DESIGN: {
        icon: DesignIcon,
        name: '系統設計',
        description: '根據需求描述，產出技術設計或架構方案。',
        theme: { gradient: { c1: 'rgba(71, 85, 105, 0.15)',  c2: 'rgba(100, 116, 139, 0.15)' },accent: { color: '#64748b', hover: '#94a3b8', from: '#94a3b8', to: '#cbd5e1' } },
        prompt: `你是一位系統架構師，專精於將需求轉化為清晰可執行的技術方案。\n\n你的設計流程：\n1. **需求分析：** 澄清並確認對使用者需求的理解\n2. **架構設計：** 描述整體架構和模組間的互動關係\n3. **詳細規格：** 定義檔案結構、API 介面和資料模型\n5. **風險評估：** 指出潛在挑戰和技術權衡\n\n請產出專業的技術設計文檔，使團隊成員能據此高效開發。`,
        example: { title: '範例：系統設計 (Design)', prompt: `我需要一個簡單的待辦事項 (To-Do) 應用的 API 設計。`, response: `### To-Do API 設計\n\n#### 資料模型\n\`\`\`json\n{\n  "id": "string",\n  "text": "string",\n  "completed": "boolean",\n  "createdAt": "timestamp"\n}\n\`\`\`\n\n#### API 端點\n- \`GET /todos\`: 獲取所有待辦事項\n- \`POST /todos\`: 新增一筆待辦事項\n- \`PUT /todos/:id\`: 更新一筆待辦事項\n- \`DELETE /todos/:id\`: 刪除一筆待辦事項` },
        ui: {
            mainTitle: 'AI 系統架構師',
            subTitle: '您的專業系統架構專家',
            placeholder: '請描述你的需求或想建立的系統...',
            buttonText: '開始設計',
            loadingMessages: ['分析需求...', '繪製架構圖...', '定義資料模型...', '設計 API 端點...']
        }
    },
    IMPLEMENT: {
        icon: CodeBracketIcon,
        name: '實作程式碼',
        description: '根據提供的設計方案，撰寫具體的實現程式碼。',
        theme: { gradient: { c1: 'rgba(79, 70, 229, 0.15)',  c2: 'rgba(124, 58, 237, 0.15)' }, accent: { color: '#4f46e5', hover: '#6366f1', from: '#6366f1', to: '#818cf8' } },
        prompt: `你是一位資深軟體工程師，專精於將設計方案和需求轉化為高品質的程式碼。\n\n你的實現準則：\n• **適當註解：** 為關鍵邏輯提供簡潔的說明\n• **整合指導：** 說明如何將新程式碼與現有系統整合\n${SHARED_DEPENDENCY_INSTRUCTION}`,
        example: { title: '範例：實作程式碼 (Implement)', prompt: `設計方案：\n- 函式名稱: \`greet\`\n- 參數: \`name\` (string)\n- 回傳: 一個 "Hello, [name]!" 的字串`, response: `### 程式碼實作\n\n\`\`\`javascript\n/**\n * 產生問候語字串。\n * @param {string} name - 要問候的人名。\n * @returns {string} 問候語。\n */\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\`\`\`` },
        ui: {
            mainTitle: 'AI 程式碼實作家',
            subTitle: '您的高效率程式碼實作夥伴',
            placeholder: '請貼上你的設計文檔、需求或偽代碼...',
            buttonText: '開始實作',
            loadingMessages: ['解析設計方案...', '建立檔案結構...', '撰寫核心邏輯...', '處理邊界情況...']
        }
    },
    SCALE: {
        icon: ScalabilityIcon,
        name: '可擴展性分析',
        description: '評估程式碼在雲端環境下的可擴展性與彈性。',
        theme: { gradient: { c1: 'rgba(14, 165, 233, 0.15)', c2: 'rgba(59, 130, 246, 0.15)' }, accent: { color: '#0ea5e9', hover: '#38bdf8', from: '#38bdf8', to: '#7dd3fc' } },
        prompt: `你是一位經驗豐富的網站可靠性工程師 (SRE) 與分散式系統專家。你的任務是分析程式碼在雲端原生環境下的可擴展性與彈性，確保系統能應對高併發和大規模流量。\n\n你的分析重點：\n1. **資料庫查詢效率：** 檢查是否有效使用索引，是否存在 N+1 查詢問題。\n2. **無狀態設計：** 識別服務的狀態性，評估其水平擴展的難易度。\n3. **快取策略：** 建議適當的快取策略（例如 Redis）來降低後端負載。\n4. **非同步處理：** 分析使用訊息佇列處理非同步任務的機會。\n\n請提供具體的架構調整建議和程式碼範例。`,
        example: { title: '範例：可擴展性分析 (Scale)', prompt: `app.get('/latest-posts', (req, res) => {\n  const posts = db.query('SELECT * FROM posts ORDER BY createdAt DESC LIMIT 10');\n  res.json(posts);\n});`, response: `### 可擴展性分析\n在高流量下，每次請求都直接查詢資料庫會造成極大的負載。\n\n### 調整建議\n引入快取層（例如 Redis）來降低資料庫壓力。\n\n\`\`\`javascript\napp.get('/latest-posts', async (req, res) => {\n  const cacheKey = 'latest-posts';\n  let posts = await redis.get(cacheKey);\n\n  if (posts) {\n    return res.json(JSON.parse(posts));\n  }\n\n  posts = await db.query('...');\n  // 設定快取，例如 60 秒後過期\n  await redis.set(cacheKey, JSON.stringify(posts), 'EX', 60);\n  \n  res.json(posts);\n});\n\`\`\`` },
        ui: {
            mainTitle: 'AI 可擴展性顧問',
            subTitle: '您的雲原生可擴展性顧問',
            placeholder: '請指出你擔心的效能瓶頸，例如：這個 API 在高併發下會不會有問題？',
            buttonText: '分析可擴展性',
            loadingMessages: ['分析資料庫查詢...', '評估服務狀態性...', '設計快取策略...', '尋找非同步任務機會...']
        }
    },
    VERIFY: {
        icon: CheckBadgeIcon,
        name: '驗證實作',
        description: '驗證程式碼實作是否與設計方案完全一致。',
        theme: { gradient: { c1: 'rgba(22, 163, 74, 0.15)',  c2: 'rgba(132, 204, 22, 0.15)' },  accent: { color: '#22c55e', hover: '#4ade80', from: '#4ade80', to: '#86efac' } },
        prompt: `你是一位極度細心且精確的軟體品質保證 (QA) 工程師，專長是驗證程式碼的實作是否與設計方案完全一致。\n\n你的任務是：\n1.  **比對方案與實作：** 使用者會提供一份「修改方案」或「設計文檔」，以及修改後的程式碼。你的唯一目標是逐點比對，確認每一項要求是否都已在程式碼中正確且完整地實現。\n3.  **明確回報結果：**\n    *   對於已完成的項目，請明確指出「已完成」。\n    *   對於未完成或不完全符合的項目，請精確指出差異點，並說明應如何修改才能符合方案。\n    *   如果所有項目都已完成，請在最後給出「驗證通過，所有修改均已正確實作」的總結。\n${SHARED_DEPENDENCY_INSTRUCTION}\n\n你的輸出應該像一份驗證清單，清晰、直接、不帶任何多餘的評論。`,
        example: { title: '範例：驗證實作 (Verify)', prompt: `**修改方案:**\n1. 函式 \`getUser\` 應改為非同步函式 (async)。\n2. 若 \`id\` 不存在，應拋出錯誤。\n\n**程式碼:**\n\`\`\`javascript\nfunction getUser(id) {\n  if (id) {\n    return fetch(\`/api/users/\${id}\`);\n  }\n}\n\`\`\``, response: `### 驗證結果\n\n- **修改方案 1 (改為 async):**\n    - **狀態:** 🔴 未完成\n    - **說明:** 函式簽名未加上 \`async\` 關鍵字。\n- **修改方案 2 (拋出錯誤):**\n    - **狀態:** 🔴 未完成\n    - **說明:** 當 \`id\` 不存在時，函式僅返回 \`undefined\`，並未拋出錯誤。\n\n**結論:** 程式碼未完全符合修改方案。` },
        ui: {
            mainTitle: 'AI 實作驗證師',
            subTitle: '您的實作驗證專家',
            placeholder: '請在上方提供修改後的程式碼，並在此處貼上原始的修改要求或設計文檔...',
            buttonText: '開始驗證',
            loadingMessages: ['比對設計需求...', '檢查函式簽名...', '驗證邏輯實作...', '確認錯誤處理...']
        }
    },
    // Creative & Q&A
    'Q&A': {
        icon: QuestionMarkCircleIcon,
        name: '技術問答',
        description: '對程式碼、架構或技術概念提出任何問題。',
        theme: { gradient: { c1: 'rgba(14, 165, 233, 0.15)', c2: 'rgba(6, 182, 212, 0.15)' },   accent: { color: '#06b6d4', hover: '#22d3ee', from: '#22d3ee', to: '#67e8f9' } },
        prompt: `你是一位友善且經驗豐富的程式設計導師，樂於分享知識並引導思考。\n\n你的回應方式：\n• **清晰解答：** 提供準確、易懂的回答\n• **實例輔助：** 適當時提供程式碼或類比說明\n• **深度引導：** 鼓勵思考問題的更深層次和相關概念\n• **最佳實踐：** 分享業界標準和推薦做法\n\n歡迎任何關於程式碼、架構、技術概念或開發實踐的問題！`,
        example: { title: '範例：技術問答 (Q&A)', prompt: `在 JavaScript 中，'==' 和 '===' 有什麼區別？`, response: `### \`==\` vs \`===\`\n\n這兩者都是比較運算子，但行為不同：\n\n- **\`==\` (相等)**: 會在比較前進行**類型轉換**。例如，\`'5' == 5\` 會回傳 \`true\`，因為字串 \`'5'\` 被轉換成了數字 \`5\`。\n- **\`===\` (嚴格相等)**: **不會**進行類型轉換。如果類型不同，直接回傳 \`false\`。因此，\`'5' === 5\` 會回傳 \`false\`。\n\n**最佳實踐:** 除非你明確需要利用類型轉換的特性，否則**永遠使用 \`===\`** 可以避免許多意想不到的錯誤。` },
        ui: {
            mainTitle: 'AI 技術問答導師',
            subTitle: '您友善且知識淵博的技術導師',
            placeholder: '請問有什麼問題嗎？例如：在 JavaScript 中，== 和 === 有什麼區別？',
            buttonText: '提出問題',
            loadingMessages: ['正在思考您的問題...', '組織最佳解答...', '尋找相關程式碼範例...', '準備類比說明...']
        }
    },
    DESIGNER: {
        icon: PaintBrushIcon,
        name: '遊戲設計',
        description: '提供遊戲數值、系統或體驗設計的建議。',
        theme: { gradient: { c1: 'rgba(147, 51, 234, 0.15)', c2: 'rgba(219, 39, 119, 0.15)' }, accent: { color: '#a855f7', hover: '#c084fc', from: '#c084fc', to: '#d8b4fe' } },
        prompt: `你是一位資深遊戲設計師，專精於數值平衡、系統設計和玩家體驗。\n\n你的設計準則：\n• **一致性：** 確保新設計與現有系統的風格和數值邏輯保持統一\n• **平衡性：** 維持遊戲平衡，避免過強或過弱的設計\n• **創新性：** 在框架內創造有趣、獨特的遊戲機制\n• **可用性：** 產出清晰的設計文檔，便於開發實現\n\n請使用結構化格式（表格、列表）呈現設計內容，並說明設計理念。`,
        example: { title: '範例：遊戲設計 (Designer)', prompt: `我想設計一個新的法師技能：「冰霜新星」。它應該是一個範圍傷害技能，並帶有控場效果。`, response: `### 技能設計：冰霜新星\n\n| 屬性 | 設計內容 |\n| :--- | :--- |\n| **技能名稱** | 冰霜新星 (Frost Nova) |\n| **目標** | 施法者周圍半徑 5 公尺內的所有敵人 |\n| **傷害** | 50 點冰霜傷害 |\n| **控場效果** | **冰凍**: 使目標無法移動，持續 2 秒 |\n| **冷卻時間** | 10 秒 |\n| **消耗** | 30 點法力 |\n\n**設計理念:** 這是一個中等傷害的控場技能，適合用於拉開距離或為後續高傷害技能做準備。` },
        ui: {
            mainTitle: 'AI 遊戲設計師',
            subTitle: '您充滿創意的遊戲設計夥伴',
            placeholder: '請描述你的設計需求，例如：我需要一個新的戰士技能...',
            buttonText: '開始設計',
            loadingMessages: ['構思遊戲機制...', '設計核心循環...', '平衡數值...', '撰寫設計文檔...']
        }
    },
    ENHANCE: {
        icon: EnhancementIcon,
        name: '功能強化',
        description: '分析現有功能並提出產品體驗的強化建議。',
        theme: { gradient: { c1: 'rgba(192, 38, 211, 0.15)', c2: 'rgba(225, 29, 72, 0.15)' },   accent: { color: '#ec4899', hover: '#f472b6', from: '#f472b6', to: '#f87171' } },
        prompt: `你是一位產品設計專家，專精於使用者體驗分析和產品功能強化。\n\n你的分析架構：\n### 1. 產品現狀分析\n• 總結核心功能和使用者價值主張\n• 識別主要優勢和改進機會\n\n### 2. 功能強化建議\n**核心體驗優化：** 改善主要功能流程和使用體驗\n**功能擴展：** 提出能顯著增加產品價值的新功能\n**使用者黏著度：** 設計提升留存和參與度的機制\n**體驗細節：** 優化 UI/UX 和使用便利性\n\n請為每項建議說明設計理念和預期效果。`,
        example: { title: '範例：功能強化 (Enhance)', prompt: `這是一個簡單的計數器應用，只有一個按鈕可以增加數字。`, response: `### 功能強化建議\n\n#### 1. 核心體驗優化\n- **新增「減少」按鈕:** 提供對稱的操作，讓使用者可以修正錯誤。\n- **新增「重設」按鈕:** 讓使用者可以快速將計數歸零。\n\n#### 2. 功能擴展\n- **步進值設定:** 允許使用者設定每次點擊增加或減少的數值（例如，一次 +5）。\n- **儲存功能:** 使用者關閉瀏覽器後，計數器的值能夠被保存並在下次開啟時恢復。` },
        ui: {
            mainTitle: 'AI 產品體驗專家',
            subTitle: '您的產品體驗強化專家',
            placeholder: '請描述現有的功能，或你希望改善的使用者體驗...',
            buttonText: '提出強化建議',
            loadingMessages: ['分析使用者流程...', '尋找體驗痛點...', '構思新功能...', '評估產品價值...']
        }
    },
    BALANCE: {
        icon: ScaleIcon,
        name: '遊戲平衡',
        description: '分析遊戲設定，提出數值與機制的平衡性建議。',
        theme: { gradient: { c1: 'rgba(13, 148, 136, 0.15)', c2: 'rgba(6, 182, 212, 0.15)' },   accent: { color: '#14b8a6', hover: '#2dd4bf', from: '#2dd4bf', to: '#06b6d4' } },
        prompt: `你是一位頂級的遊戲數值與系統平衡設計師，以創造公平、深度且有趣的玩家體驗而聞名。\n\n你的任務是分析使用者提供的遊戲設定（例如技能、角色、經濟系統等），並提出具體的平衡性調整建議。\n\n你的分析與建議應遵循以下原則：\n1. **風險與回報：** 強大的效果必須伴隨相應的成本、冷卻時間或觸發條件。確保沒有「無腦最強」的選擇。\n2. **避免無效選項：** 每個選項（技能、裝備等）都應該在特定情境下有其價值，避免出現完全無用或被完全支配的設計。\n3. **情境多樣性：** 鼓勵不同的策略和玩法。你的調整 sollte 讓更多組合變得可行，而不是收斂到單一最優解。\n4. **清晰與直觀：** 規則和描述應該清晰易懂。如果發現模糊不清的描述（如「特定條件」），請提出明確化的建議。\n5. **具體數值調整：** 不僅要說「增強」或「削弱」，還要提供具體的數字建議（例如：將傷害從 1.0x 提升至 1.5x，或將冷卻時間從 3 回合減少到 2 回合）。\n6. **解釋理由：** 說明你為什麼要這樣調整，以及預期會對遊戲體驗產生什麼正面影響。\n\n請以結構化、清晰的方式呈現你的分析和修改建議。`,
        example: { title: '範例：遊戲平衡 (Balance)', prompt: `技能「火球術」：\n- 傷害: 200\n- 消耗: 10\n- 冷卻: 1 秒\n\n技能「隕石術」：\n- 傷害: 200\n- 消耗: 50\n- 冷卻: 5 秒`, response: `### 平衡性分析\n「火球術」的效益遠高於「隕石術」。在 5 秒內，火球術可以造成 1000 點傷害（200 * 5），而隕石術只能造成 200 點。\n\n### 調整建議\n1.  **提升「隕石術」的獨特性和傷害:** 讓它成為一個高風險高回報的技能。\n    -   傷害從 200 提升至 **800**。\n    -   新增效果：**造成範圍傷害**。\n2.  **微調「火球術」:**\n    -   消耗從 10 提升至 **15**。\n\n這樣，玩家需要在持續輸出和爆發傷害之間做出選擇。` },
        ui: {
            mainTitle: 'AI 遊戲平衡設計師',
            subTitle: '您的專業遊戲平衡設計師',
            placeholder: '請貼上你需要平衡的遊戲數值或機制設定...',
            buttonText: '提出平衡建議',
            loadingMessages: ['分析數值模型...', '模擬遊戲對戰...', '評估風險與回報...', '調整核心參數...']
        }
    },
    POLISH: {
        icon: WandIcon,
        name: 'UI/UX 潤飾',
        description: '優化前端程式碼，提升 UI 視覺美感與 UX 互動體驗。',
        theme: { gradient: { c1: 'rgba(219, 39, 119, 0.15)', c2: 'rgba(236, 72, 153, 0.15)' }, accent: { color: '#f43f5e', hover: '#fb7185', from: '#fb7185', to: '#f87171' } },
        prompt: `你是一位頂尖的 UI/UX 設計師與前端開發專家，擁有像素級的精準眼光和對使用者體驗的深刻理解。你的任務是審查前端程式碼（HTML, CSS, JS/TSX），並提出能顯著提升視覺美感和互動體驗的具體建議。\n\n你的審查重點：\n1.  **視覺一致性：** 檢查間距、顏色、字體大小和圓角等是否在整個介面中保持一致。\n2.  **互動回饋：** 評估按鈕、連結和輸入框等互動元素是否提供了清晰的 hover、active 和 focus 狀態。\n3.  **微動畫與轉場：** 建議加入細膩的轉場 (transition) 或微動畫，讓使用者介面感覺更流暢、更生動。\n4.  **排版與易讀性：** 評估文字的行高、字間距和對比度，確保內容清晰易讀。\n5.  **響應式設計：** 檢查元件在不同螢幕尺寸下的表現，確保沒有跑版或內容被截斷的問題。\n\n你的輸出必須是可執行的：\n*   **提供具體程式碼：** 直接提供修改後的 CSS 或組件程式碼。\n*   **解釋設計理念：** 簡要說明每項修改背後的原因，以及它如何改善使用者體驗或視覺效果。\n*   **使用 Diff 格式：** 所有程式碼修改建議都必須使用 diff 格式呈現。`,
        example: { title: '範例：UI/UX 潤飾 (Polish)', prompt: `<!-- button.html -->\n<button class="bg-blue-500 text-white p-2 rounded">\n  Click Me\n</button>`, response: `### UI/UX 潤飾建議\n\n這個按鈕缺少互動回饋，會讓使用者感覺遲鈍。我們可以透過增加轉場效果和 hover/active 狀態來顯著提升體驗。\n\n#### 修改建議\n\n\`\`\`diff\n--- a/button.html\n+++ b/button.html\n@@ -1,3 +1,3 @@\n-<button class="bg-blue-500 text-white p-2 rounded">\n+<button class="bg-blue-500 text-white px-4 py-2 rounded font-semibold transition-all duration-200 ease-in-out hover:bg-blue-600 active:scale-95 transform">\n   Click Me\n </button>\n\`\`\`\n\n#### 設計理念\n1.  **\`transition-all\`**: 讓所有屬性變化（如背景色和大小）都變得平滑。\n2.  **\`hover:bg-blue-600\`**: 當滑鼠懸停時，按鈕顏色變深，提供視覺回饋。\n3.  **\`active:scale-95\`**: 當使用者點擊時，按鈕會輕微縮小，模擬真實的按壓感。\n4.  **調整內距 (\`p-2\` -> \`px-4 py-2\`)**: 讓按鈕看起來更均衡。` },
        ui: {
            mainTitle: 'AI UI/UX 潤飾師',
            subTitle: '您的 UI/UX 體驗優化專家',
            placeholder: '請提供前端程式碼（HTML/CSS/JSX/TSX），我將為您潤飾...',
            buttonText: '開始潤飾',
            loadingMessages: ['檢查視覺一致性...', '評估互動回饋...', '設計微動畫...', '優化排版與易讀性...']
        }
    },
    // Automation
    WORKFLOW: {
        icon: WorkflowIcon,
        name: '自動化工作流',
        description: '設定一個多步驟、可重複執行的自動化工作流來持續優化您的專案。',
        theme: { gradient: { c1: 'rgba(13, 148, 136, 0.15)', c2: 'rgba(8, 145, 178, 0.15)' },   accent: { color: '#0d9488', hover: '#14b8a6', from: '#14b8a6', to: '#0891b2' } },
        prompt: 'This is an automated workflow mode.',
        example: { title: '範例：自動化工作流 (Workflow)', prompt: `此模式可讓您建立一個自動化任務序列。\n\n1.  **上傳您的專案檔案。**\n2.  **建立模式序列：** 選擇您想依序執行的模式（例如：1. CONSOLIDATE, 2. REFACTOR）。\n3.  **設定循環次數：** 決定整個序列要重複執行幾次。\n4.  **開始工作流：** AI 將自動執行每一步，並將修改應用於下一步的輸入。\n\n完成後，您可以下載經過多輪優化的最終版專案檔案。`, response: `工作流執行完畢。\n\n### 摘要\n- **總循環次數：** 2\n- **執行模式：** CONSOLIDATE -> REFACTOR\n- **修改檔案數：** 5\n\n您可以檢視下方最終的檔案狀態，或將整個專案打包下載。` },
        ui: {
            mainTitle: 'AI 自動化工作流',
            subTitle: '您的自動化專案優化管道',
            placeholder: '',
            buttonText: '開始工作流',
            loadingMessages: ['初始化工作流...', '載入專案檔案...', '驗證模式序列...', '準備執行環境...']
        }
    },
};
