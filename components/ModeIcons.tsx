import React from 'react';
import type { ReviewMode } from '../types';
import {
    StarIcon,
    RefactorIcon,
    TesterIcon,
    DesignIcon,
    EnhancementIcon,
    ScalabilityIcon,
    SecurityIcon,
    DocumentationIcon,
    BroomIcon,
    BugAntIcon,
    QuestionMarkCircleIcon,
    BoltIcon,
    PaintBrushIcon,
    CodeBracketIcon,
    ScaleIcon,
    CheckBadgeIcon,
    ScissorsIcon,
    WorkflowIcon,
} from './icons';

export const getModeIcon = (mode: ReviewMode, className: string): JSX.Element => {
    const props = { className };
    switch (mode) {
        case 'REVIEW': return <StarIcon {...props} />;
        case 'BUGFIX': return <BugAntIcon {...props} />;
        case 'REFACTOR': return <RefactorIcon {...props} />;
        case 'Q&A': return <QuestionMarkCircleIcon {...props} />;
        case 'OPTIMIZE': return <BoltIcon {...props} />;
        case 'DESIGNER': return <PaintBrushIcon {...props} />;
        case 'TESTER': return <TesterIcon {...props} />;
        case 'DESIGN': return <DesignIcon {...props} />;
        case 'IMPLEMENT': return <CodeBracketIcon {...props} />;
        case 'ENHANCE': return <EnhancementIcon {...props} />;
        case 'SIMPLIFY': return <ScissorsIcon {...props} />;
        case 'BALANCE': return <ScaleIcon {...props} />;
        case 'VERIFY': return <CheckBadgeIcon {...props} />;
        case 'SCALE': return <ScalabilityIcon {...props} />;
        case 'SECURITY': return <SecurityIcon {...props} />;
        case 'DOCS': return <DocumentationIcon {...props} />;
        case 'CONSOLIDATE': return <BroomIcon {...props} />;
        case 'WORKFLOW': return <WorkflowIcon {...props} />;
        default: return <StarIcon {...props} />;
    }
};

export const MODE_DESCRIPTIONS: Record<ReviewMode, string> = {
    REVIEW: '全面審查程式碼品質、風格和最佳實踐。',
    BUGFIX: '定位、分析並提供潛在錯誤的修復方案。',
    REFACTOR: '改善程式碼結構和可讀性，而不改變其功能。',
    'Q&A': '對程式碼、架構或技術概念提出任何問題。',
    OPTIMIZE: '分析並提升程式碼的執行效能和資源使用效率。',
    DESIGNER: '提供遊戲數值、系統或體驗設計的建議。',
    TESTER: '為現有程式碼產生單元測試或整合測試。',
    DESIGN: '根據需求描述，產出技術設計或架構方案。',
    IMPLEMENT: '根據提供的設計方案，撰寫具體的實現程式碼。',
    ENHANCE: '分析現有功能並提出產品體驗的強化建議。',
    SIMPLIFY: '識別並簡化過度複雜的程式碼或架構。',
    BALANCE: '分析遊戲設定，提出數值與機制的平衡性建議。',
    VERIFY: '驗證程式碼實作是否與設計方案完全一致。',
    SCALE: '評估程式碼在雲端環境下的可擴展性與彈性。',
    SECURITY: '從攻擊者角度審查程式碼，找出安全性漏洞。',
    DOCS: '為程式碼自動產生註解和技術文件。',
    CONSOLIDATE: '統一程式碼庫中的命名、風格和重複邏輯。',
    WORKFLOW: '設定一個多步驟、可重複執行的自動化工作流來持續優化您的專案。',
};

type Example = { title: string; prompt: string; response: string; };

export const MODE_EXAMPLES: Record<ReviewMode, Example> = {
    REVIEW: {
        title: '全面審查 (Review)',
        prompt: `// is-flashing.js
function isFlashing(inventory) {
  let isFlashing = false;
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i].type === 'flash' && inventory[i].remaining > 0) {
      isFlashing = true;
    }
  }
  return isFlashing;
}`,
        response: `### 審查報告
這段程式碼的功能是正確的，但有幾個可以改進的地方，讓它更簡潔、更具現代 JavaScript 風格。

#### 1. 使用 \`some\` 方法簡化迴圈
\`for\` 迴圈的寫法比較冗長。可以使用陣列的 \`some\` 方法來達到同樣的目的，程式碼會更具可讀性。\`some\` 方法會在找到第一個符合條件的元素後立即停止遍歷，效率更高。

### 修改建議
\`\`\`javascript
// is-flashing.js
function hasFlashbang(inventory) {
  return inventory.some(item => item.type === 'flash' && item.remaining > 0);
}
\`\`\``
    },
    BUGFIX: {
        title: '錯誤修復 (Bugfix)',
        prompt: `// calculate-average.js
function calculateAverage(numbers) {
  let sum = 0;
  for (let i = 0; i <= numbers.length; i++) {
    sum += numbers[i];
  }
  return sum / numbers.length;
}`,
        response: `### 錯誤分析
問題出在 \`for\` 迴圈的條件判斷式中 (\`i <= numbers.length\`)。陣列索引是從 0 到 \`length - 1\`，這會導致最後一次迴圈讀取到 \`undefined\`，使計算結果變為 \`NaN\`。

### 修正方案
\`\`\`javascript
// calculate-average.js
function calculateAverage(numbers) {
  if (!numbers || numbers.length === 0) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i];
  }
  return sum / numbers.length;
}
\`\`\``
    },
    REFACTOR: {
        title: '重構 (Refactor)',
        prompt: `function printOrder(order) {
  let total = order.price * order.quantity;
  if (order.isDiscounted) {
    total *= 0.9;
  }
  console.log("Total price:", total);
}`,
        response: `### 重構建議
目前的函式混合了計算和輸出的職責，可以將其拆分為兩個獨立的函式，以符合單一職責原則。

### 修改後
\`\`\`javascript
function calculateTotal(order) {
  let total = order.price * order.quantity;
  if (order.isDiscounted) {
    return total * 0.9;
  }
  return total;
}

function printOrder(order) {
  const total = calculateTotal(order);
  console.log("Total price:", total);
}
\`\`\``
    },
    'Q&A': {
        title: '問答 (Q&A)',
        prompt: `在 JavaScript 中，'==' 和 '===' 有什麼區別？`,
        response: `### \`==\` vs \`===\`

這兩者都是比較運算子，但行為不同：

- **\`==\` (相等)**: 會在比較前進行**類型轉換**。例如，\`'5' == 5\` 會回傳 \`true\`，因為字串 \`'5'\` 被轉換成了數字 \`5\`。
- **\`===\` (嚴格相等)**: **不會**進行類型轉換。如果類型不同，直接回傳 \`false\`。因此，\`'5' === 5\` 會回傳 \`false\`。

**最佳實踐:** 除非你明確需要利用類型轉換的特性，否則**永遠使用 \`===\`** 可以避免許多意想不到的錯誤。`
    },
    OPTIMIZE: {
        title: '效能優化 (Optimize)',
        prompt: `function findUser(users, username) {
  return users.filter(user => user.name === username)[0];
}`,
        response: `### 效能分析
\`filter\` 會遍歷整個陣列，即使在找到匹配項後也不會停止。如果只是要找第一個符合的項目，使用 \`find\` 方法會更有效率，因為它在找到後就會立即返回。

### 優化建議
\`\`\`javascript
function findUser(users, username) {
  return users.find(user => user.name === username);
}
\`\`\``
    },
    DESIGNER: {
        title: '遊戲設計 (Designer)',
        prompt: `我想設計一個新的法師技能：「冰霜新星」。它應該是一個範圍傷害技能，並帶有控場效果。`,
        response: `### 技能設計：冰霜新星

| 屬性 | 設計內容 |
| :--- | :--- |
| **技能名稱** | 冰霜新星 (Frost Nova) |
| **目標** | 施法者周圍半徑 5 公尺內的所有敵人 |
| **傷害** | 50 點冰霜傷害 |
| **控場效果** | **冰凍**: 使目標無法移動，持續 2 秒 |
| **冷卻時間** | 10 秒 |
| **消耗** | 30 點法力 |

**設計理念:** 這是一個中等傷害的控場技能，適合用於拉開距離或為後續高傷害技能做準備。`
    },
    TESTER: {
        title: '產生測試 (Tester)',
        prompt: `// utils.js
export function slugify(text) {
  return text.toLowerCase().replace(/\\s+/g, '-').replace(/[^\\w-]+/g, '');
}`,
        response: `### 測試程式碼 (Jest)

\`\`\`javascript
// utils.test.js
import { slugify } from './utils';

describe('slugify', () => {
  test('應將空格轉換為連字號', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  test('應移除特殊字元', () => {
    expect(slugify('hello!@#world?')).toBe('helloworld');
  });

  test('應轉換為小寫', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
});
\`\`\``
    },
    DESIGN: {
        title: '系統設計 (Design)',
        prompt: `我需要一個簡單的待辦事項 (To-Do) 應用的 API 設計。`,
        response: `### To-Do API 設計

#### 資料模型
\`\`\`json
{
  "id": "string",
  "text": "string",
  "completed": "boolean",
  "createdAt": "timestamp"
}
\`\`\`

#### API 端點
- \`GET /todos\`: 獲取所有待辦事項
- \`POST /todos\`: 新增一筆待辦事項
- \`PUT /todos/:id\`: 更新一筆待辦事項
- \`DELETE /todos/:id\`: 刪除一筆待辦事項`
    },
    IMPLEMENT: {
        title: '實作程式碼 (Implement)',
        prompt: `設計方案：
- 函式名稱: \`greet\`
- 參數: \`name\` (string)
- 回傳: 一個 "Hello, [name]!" 的字串`,
        response: `### 程式碼實作

\`\`\`javascript
/**
 * 產生問候語字串。
 * @param {string} name - 要問候的人名。
 * @returns {string} 問候語。
 */
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\``
    },
    ENHANCE: {
        title: '功能強化 (Enhance)',
        prompt: `這是一個簡單的計數器應用，只有一個按鈕可以增加數字。`,
        response: `### 功能強化建議

#### 1. 核心體驗優化
- **新增「減少」按鈕:** 提供對稱的操作，讓使用者可以修正錯誤。
- **新增「重設」按鈕:** 讓使用者可以快速將計數歸零。

#### 2. 功能擴展
- **步進值設定:** 允許使用者設定每次點擊增加或減少的數值（例如，一次 +5）。
- **儲存功能:** 使用者關閉瀏覽器後，計數器的值能夠被保存並在下次開啟時恢復。`
    },
    SIMPLIFY: {
        title: '簡化程式碼 (Simplify)',
        prompt: `class User {
  constructor(name, age) {
    this._data = { name, age };
  }
  getName() { return this._data.name; }
  getAge() { return this._data.age; }
}`,
        response: `### 簡化建議
這個 \`User\` 類別過於複雜。它使用了一個私有 \`_data\` 物件來儲存屬性，並為每個屬性提供了 getter 方法。對於一個簡單的資料容器來說，這是不必要的封裝。

### 修改後
可以使用一個更簡單的物件字面量或是一個沒有多餘方法的類別來達成。

\`\`\`javascript
// 更簡潔的 Class 寫法
class User {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
}

// 或者，如果不需要 class 的特性，一個簡單的工廠函式即可
const createUser = (name, age) => ({ name, age });
\`\`\``
    },
    BALANCE: {
        title: '遊戲平衡 (Balance)',
        prompt: `技能「火球術」：
- 傷害: 200
- 消耗: 10
- 冷卻: 1 秒

技能「隕石術」：
- 傷害: 200
- 消耗: 50
- 冷卻: 5 秒`,
        response: `### 平衡性分析
「火球術」的效益遠高於「隕石術」。在 5 秒內，火球術可以造成 1000 點傷害（200 * 5），而隕石術只能造成 200 點。

### 調整建議
1.  **提升「隕石術」的獨特性和傷害:** 讓它成為一個高風險高回報的技能。
    -   傷害從 200 提升至 **800**。
    -   新增效果：**造成範圍傷害**。
2.  **微調「火球術」:**
    -   消耗從 10 提升至 **15**。

這樣，玩家需要在持續輸出和爆發傷害之間做出選擇。`
    },
    VERIFY: {
        title: '驗證實作 (Verify)',
        prompt: `**修改方案:**
1. 函式 \`getUser\` 應改為非同步函式 (async)。
2. 若 \`id\` 不存在，應拋出錯誤。

**程式碼:**
\`\`\`javascript
function getUser(id) {
  if (id) {
    return fetch(\`/api/users/\${id}\`);
  }
}
\`\`\``,
        response: `### 驗證結果

- **修改方案 1 (改為 async):**
    - **狀態:** 🔴 未完成
    - **說明:** 函式簽名未加上 \`async\` 關鍵字。
- **修改方案 2 (拋出錯誤):**
    - **狀態:** 🔴 未完成
    - **說明:** 當 \`id\` 不存在時，函式僅返回 \`undefined\`，並未拋出錯誤。

**結論:** 程式碼未完全符合修改方案。`
    },
    SCALE: {
        title: '可擴展性 (Scale)',
        prompt: `app.get('/latest-posts', (req, res) => {
  const posts = db.query('SELECT * FROM posts ORDER BY createdAt DESC LIMIT 10');
  res.json(posts);
});`,
        response: `### 可擴展性分析
在高流量下，每次請求都直接查詢資料庫會造成極大的負載。

### 調整建議
引入快取層（例如 Redis）來降低資料庫壓力。

\`\`\`javascript
app.get('/latest-posts', async (req, res) => {
  const cacheKey = 'latest-posts';
  let posts = await redis.get(cacheKey);

  if (posts) {
    return res.json(JSON.parse(posts));
  }

  posts = await db.query('...');
  // 設定快取，例如 60 秒後過期
  await redis.set(cacheKey, JSON.stringify(posts), 'EX', 60);
  
  res.json(posts);
});
\`\`\``
    },
    SECURITY: {
        title: '安全性 (Security)',
        prompt: `const username = req.query.user;
db.query(\`SELECT * FROM users WHERE name = '\${username}'\`);`,
        response: `### 安全性漏洞報告

- **漏洞類型:** SQL 注入 (SQL Injection)
- **風險等級:** 🔴 **嚴重**
- **位置:** 直接將使用者輸入的 \`username\` 拼接到 SQL 查詢字串中。

**攻擊範例:**
攻擊者可以將 \`username\` 設定為 \`' OR '1'='1\`，這會導致查詢變成 \`SELECT * FROM users WHERE name = '' OR '1'='1'\`，從而繞過驗證並獲取所有使用者資料。

### 修復建議
**永遠不要**自己拼接 SQL 查詢字串。請使用參數化查詢 (Parameterized Queries) 或查詢構建器。

\`\`\`javascript
const username = req.query.user;
db.query('SELECT * FROM users WHERE name = ?', [username]);
\`\`\``
    },
    DOCS: {
        title: '產生文件 (Docs)',
        prompt: `function calculateArea(radius) {
  return Math.PI * radius * radius;
}`,
        response: `### JSDoc 註解

\`\`\`javascript
/**
 * 計算圓形的面積。
 * @param {number} radius - 圓形的半徑。
 * @returns {number} 圓形的面積。
 */
function calculateArea(radius) {
  return Math.PI * radius * radius;
}
\`\`\``
    },
    CONSOLIDATE: {
        title: '統一程式碼 (Consolidate)',
        prompt: `// file A.js
function check_user_active(user) { ... }

// file B.js
function isUserActive(user) { ... }`,
        response: `### 程式碼一致性計畫

#### 1. 冗餘邏輯與命名不一致
- **問題:** 在 \`A.js\` 和 \`B.js\` 中發現了功能相同的函式 \`check_user_active\` 和 \`isUserActive\`。
- **標準方案:** 統一使用駝峰式命名 \`isUserActive\`。

#### 2. 重構計畫
1.  在一個共用的 \`utils/user.js\` 檔案中建立標準的 \`isUserActive\` 函式。
2.  刪除 \`A.js\` 中的 \`check_user_active\`。
3.  將 \`B.js\` 中的 \`isUserActive\` 移至 \`utils/user.js\`。
4.  更新所有呼叫舊函式的地方，改為從 \`utils/user.js\` 導入並使用 \`isUserActive\`。`
    },
    WORKFLOW: {
        title: '自動化工作流 (Workflow)',
        prompt: `此模式可讓您建立一個自動化任務序列。

1.  **上傳您的專案檔案。**
2.  **建立模式序列：** 選擇您想依序執行的模式（例如：1. CONSOLIDATE, 2. REFACTOR）。
3.  **設定循環次數：** 決定整個序列要重複執行幾次。
4.  **開始工作流：** AI 將自動執行每一步，並將修改應用於下一步的輸入。

完成後，您可以下載經過多輪優化的最終版專案檔案。`,
        response: `工作流執行完畢。

### 摘要
- **總循環次數：** 2
- **執行模式：** CONSOLIDATE -> REFACTOR
- **修改檔案數：** 5

您可以檢視下方最終的檔案狀態，或將整個專案打包下載。`
    },
};