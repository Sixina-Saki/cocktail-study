
/* ===== app_v1.js ===== */

// app_v1.js
// Ver1: データ読み込み・Vol選択・順番学習・ランダム学習

window.CocktailTrainer = {
  selectedVols: [],
  mode: "sequential",
  allCocktails: [],

  loadData() {
    this.allCocktails = [
      ...(window.vol1 || []),
      ...(window.vol2 || []),
      ...(window.vol3 || []),
      ...(window.vol4 || []),
      ...(window.vol5 || []),
      ...(window.vol6 || []),
      ...(window.vol7 || []),
      ...(window.vol8 || [])
    ];
    console.log("Loaded cocktails:", this.allCocktails.length);
  },

  setSelectedVols(vols) {
    this.selectedVols = vols;
    localStorage.setItem(
      "selectedVols",
      JSON.stringify(vols)
    );
  },

  getFilteredCocktails() {
    if (this.selectedVols.length === 0) {
      return this.allCocktails;
    }

    return this.allCocktails.filter(
      c => this.selectedVols.includes(c.vol)
    );
  },

  getSequentialQuestions() {
    return this.getFilteredCocktails();
  },

  getRandomQuestions() {
    const list = [...this.getFilteredCocktails()];

    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );
      [list[i], list[j]] = [list[j], list[i]];
    }

    return list;
  },

  getQuestion() {
    if (this.mode === "sequential") {
      return this.getSequentialQuestions();
    }

    return this.getRandomQuestions();
  }
};

window.addEventListener("load", () => {
  CocktailTrainer.loadData();

  const savedVols = localStorage.getItem(
    "selectedVols"
  );

  if (savedVols) {
    CocktailTrainer.selectedVols =
      JSON.parse(savedVols);
  }
});


/* ===== app_v2.js ===== */

// app_v2.js
// Ver2: 正誤判定・部分点システム

window.ScoreEngine = {

  evaluate(recipeCorrect, garnishCorrect) {

    if (recipeCorrect && garnishCorrect) {
      return {
        score: 100,
        label: "完全正解",
        review: false
      };
    }

    if (recipeCorrect && !garnishCorrect) {
      return {
        score: 75,
        label: "レシピ正解・付属不正解",
        review: true
      };
    }

    if (!recipeCorrect && garnishCorrect) {
      return {
        score: 25,
        label: "レシピ不正解・付属正解",
        review: true
      };
    }

    return {
      score: 0,
      label: "不正解",
      review: true
    };
  },

  isMastered(streak) {
    return streak >= 3;
  },

  updateLearningState(stats, result) {

    stats.totalAnswers++;

    if (result.score === 100) {
      stats.correctAnswers++;
      stats.streak++;
    } else {
      stats.streak = 0;
      stats.reviewTarget = true;
    }

    if (this.isMastered(stats.streak)) {
      stats.reviewTarget = false;
      stats.mastered = true;
    }

    stats.accuracy =
      Math.round(
        (stats.correctAnswers /
         stats.totalAnswers) * 100
      );

    return stats;
  },

  createEmptyStats() {
    return {
      totalAnswers: 0,
      correctAnswers: 0,
      accuracy: 0,
      streak: 0,
      reviewTarget: false,
      mastered: false
    };
  }

};

// 使用例
/*
const result =
ScoreEngine.evaluate(
  true,
  false
);

console.log(result.score);
// 75

let stats =
ScoreEngine.createEmptyStats();

stats =
ScoreEngine.updateLearningState(
  stats,
  result
);
*/


/* ===== app_v3.js ===== */

// app_v3.js
// Ver3: LocalStorage・復習モード・単一特訓モード

window.StorageManager = {

  KEY_STATS: "cocktail_stats",
  KEY_SETTINGS: "cocktail_settings",

  loadStats() {
    const raw = localStorage.getItem(this.KEY_STATS);
    return raw ? JSON.parse(raw) : {};
  },

  saveStats(stats) {
    localStorage.setItem(
      this.KEY_STATS,
      JSON.stringify(stats)
    );
  },

  loadSettings() {
    const raw = localStorage.getItem(this.KEY_SETTINGS);

    return raw ? JSON.parse(raw) : {
      selectedVols: [],
      mode: "random_review_priority",
      answerMode: "input"
    };
  },

  saveSettings(settings) {
    localStorage.setItem(
      this.KEY_SETTINGS,
      JSON.stringify(settings)
    );
  }

};

window.ReviewEngine = {

  getReviewTargets(allCocktails, stats) {
    return allCocktails.filter(c => {
      return stats[c.name] &&
             stats[c.name].reviewTarget;
    });
  },

  getReviewPriorityQuestions(
    normalQuestions,
    reviewQuestions
  ) {
    const result = [];

    const reviewCount =
      Math.floor(
        (normalQuestions.length +
         reviewQuestions.length) * 0.3
      );

    result.push(
      ...reviewQuestions.slice(
        0,
        reviewCount
      )
    );

    result.push(...normalQuestions);

    return result;
  }

};

window.SingleTraining = {

  target: null,

  setTarget(cocktailName) {
    this.target = cocktailName;
  },

  clearTarget() {
    this.target = null;
  },

  getQuestions(allCocktails) {

    if (!this.target) {
      return [];
    }

    return allCocktails.filter(
      c => c.name === this.target
    );
  }

};

window.addEventListener("beforeunload", () => {

  if (window.CocktailTrainer) {

    StorageManager.saveSettings({
      selectedVols:
        CocktailTrainer.selectedVols,
      mode:
        CocktailTrainer.mode,
      answerMode:
        CocktailTrainer.answerMode
    });

  }

});


/* ===== app_v4.js ===== */

// app_v4.js
// Ver4: 統計・バックアップ・復元・三段階削除確認

window.StatisticsEngine = {

  getGlobalStats(statsMap) {
    const values = Object.values(statsMap);

    const totalAnswers =
      values.reduce((a, s) => a + (s.totalAnswers || 0), 0);

    const totalCorrect =
      values.reduce((a, s) => a + (s.correctAnswers || 0), 0);

    const mastered =
      values.filter(s => s.mastered).length;

    const reviewTargets =
      values.filter(s => s.reviewTarget).length;

    return {
      totalAnswers,
      totalCorrect,
      accuracy:
        totalAnswers === 0
          ? 0
          : Math.round(
              totalCorrect / totalAnswers * 100
            ),
      mastered,
      reviewTargets
    };
  },

  getWeakRanking(statsMap) {
    return Object.entries(statsMap)
      .sort((a,b)=>a[1].accuracy-b[1].accuracy)
      .slice(0,10);
  },

  getStrongRanking(statsMap) {
    return Object.entries(statsMap)
      .sort((a,b)=>b[1].accuracy-a[1].accuracy)
      .slice(0,10);
  },

  getStudyRanking(statsMap) {
    return Object.entries(statsMap)
      .sort((a,b)=>b[1].totalAnswers-a[1].totalAnswers)
      .slice(0,10);
  }

};

window.BackupEngine = {

  exportBackup() {

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      stats:
        localStorage.getItem(
          "cocktail_stats"
        ),
      settings:
        localStorage.getItem(
          "cocktail_settings"
        )
    };

    const blob =
      new Blob(
        [JSON.stringify(payload,null,2)],
        {type:"application/json"}
      );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;
    a.download =
      "cocktail_backup.json";

    a.click();

    URL.revokeObjectURL(url);
  },

  importBackup(jsonText) {

    const data = JSON.parse(jsonText);

    if(data.stats){
      localStorage.setItem(
        "cocktail_stats",
        data.stats
      );
    }

    if(data.settings){
      localStorage.setItem(
        "cocktail_settings",
        data.settings
      );
    }

    return true;
  }

};

window.ResetEngine = {

  step1() {
    return confirm(
      "すべての学習データを削除します。続行しますか？"
    );
  },

  step2() {
    return confirm(
      "本当に削除しますか？この操作は元に戻せません。"
    );
  },

  step3() {

    const input =
      prompt(
        "最終確認です。「削除」と入力してください。"
      );

    return input === "削除";
  },

  execute() {

    if(!this.step1()) return false;
    if(!this.step2()) return false;
    if(!this.step3()) return false;

    localStorage.clear();

    alert(
      "すべての学習データを削除しました。"
    );

    location.reload();

    return true;
  }

};


/* ===== app_v5.js ===== */

// app_v5.js
// Ver5: 図鑑モード・Vol順/五十音順切替・学習システム説明

window.LibraryEngine = {

  getAllCocktails() {
    return [
      ...(window.vol1 || []),
      ...(window.vol2 || []),
      ...(window.vol3 || []),
      ...(window.vol4 || []),
      ...(window.vol5 || []),
      ...(window.vol6 || []),
      ...(window.vol7 || []),
      ...(window.vol8 || [])
    ];
  },

  getByVolOrder() {
    return this.getAllCocktails().sort((a, b) => {
      if (a.vol !== b.vol) return a.vol - b.vol;
      return 0;
    });
  },

  getByKanaOrder() {
    return this.getAllCocktails().sort((a, b) =>
      a.name.localeCompare(b.name, "ja")
    );
  },

  findByName(name) {
    return this.getAllCocktails().find(
      c => c.name === name
    );
  }

};

window.HelpEngine = {

  getLearningGuide() {
    return {
      green: "3回連続正解達成。習得済み。",
      yellow: "学習中。",
      red: "復習対象。",
      reviewRule:
        "一度でも間違えると復習対象。3回連続正解で解除。",
      scoring:
        "100点=完全正解 / 75点=レシピのみ正解 / 25点=付属のみ正解 / 0点=不正解"
    };
  }

};

window.ProgressEngine = {

  getVolProgress(vol, statsMap) {

    const cocktails =
      LibraryEngine.getAllCocktails()
        .filter(c => c.vol === vol);

    const mastered =
      cocktails.filter(c =>
        statsMap[c.name] &&
        statsMap[c.name].mastered
      ).length;

    return {
      total: cocktails.length,
      mastered,
      percent:
        cocktails.length === 0
          ? 0
          : Math.round(
              mastered /
              cocktails.length *
              100
            )
    };
  }

};


/* ===== app_v6.js ===== */

// app_v6.js
// Ver6: 問題表示UI・回答UI・結果画面

window.UIEngine = {

  currentQuestion: null,

  setQuestion(question) {
    this.currentQuestion = question;
  },

  getQuestion() {
    return this.currentQuestion;
  },

  createInputQuestionHTML(question) {
    return `
      <div class="question-card">
        <h2>${question.name}</h2>

        <label>レシピ入力</label>
        <textarea id="recipeInput"></textarea>

        <label>付属入力</label>
        <textarea id="garnishInput"></textarea>

        <button id="submitAnswer">
          回答する
        </button>
      </div>
    `;
  },

  createChoiceQuestionHTML(question, choices) {

    const buttons = choices.map(choice => {
      return `
        <button class="choice-btn"
                data-value="${choice}">
          ${choice}
        </button>
      `;
    }).join("");

    return `
      <div class="question-card">
        <h2>${question.name}</h2>

        <div class="choices">
          ${buttons}
        </div>
      </div>
    `;
  },

  createResultHTML(result) {

    return `
      <div class="result-card">

        <h2>${result.score}%</h2>

        <p>${result.label}</p>

        <button id="nextQuestion">
          次の問題へ
        </button>

      </div>
    `;
  },

  render(targetId, html) {
    const target =
      document.getElementById(targetId);

    if (!target) return false;

    target.innerHTML = html;

    return true;
  }

};

window.QuestionFlow = {

  currentIndex: 0,
  questions: [],

  start(questions) {
    this.questions = questions;
    this.currentIndex = 0;
  },

  getCurrent() {
    return this.questions[this.currentIndex];
  },

  hasNext() {
    return (
      this.currentIndex <
      this.questions.length - 1
    );
  },

  next() {

    if (this.hasNext()) {
      this.currentIndex++;
      return true;
    }

    return false;
  }

};


/* ===== app_v7.js ===== */

// app_v7.js
// Ver7: ホーム画面・Vol選択・モード選択・設定・統計画面

window.ScreenEngine = {

  createHomeScreen() {
    return `
      <div class="home-screen">
        <h1>Cocktail Trainer</h1>

        <button data-screen="study">
          学習開始
        </button>

        <button data-screen="review">
          復習モード
        </button>

        <button data-screen="library">
          カクテル図鑑
        </button>

        <button data-screen="stats">
          統計
        </button>

        <button data-screen="backup">
          バックアップ
        </button>

        <button data-screen="settings">
          設定
        </button>

        <button data-screen="help">
          学習システム説明
        </button>
      </div>
    `;
  },

  createVolSelectScreen() {

    let html = `
      <div class="vol-select">
        <h2>Vol選択</h2>
    `;

    for(let i=1;i<=8;i++){
      html += `
        <label>
          <input type="checkbox"
                 value="${i}"
                 class="vol-checkbox">
          Vol${i}
        </label><br>
      `;
    }

    html += `
      <button id="saveVolSelect">
        保存
      </button>
      </div>
    `;

    return html;
  },

  createModeSelectScreen() {
    return `
      <div class="mode-select">
        <h2>学習モード選択</h2>

        <button data-mode="sequential">
          順番学習
        </button>

        <button data-mode="random">
          ランダム学習
        </button>

        <button data-mode="random_review_priority">
          ランダム＋復習優先
        </button>

        <button data-mode="review">
          復習モード
        </button>

        <button data-mode="single">
          単一特訓
        </button>
      </div>
    `;
  },

  createStatisticsScreen(stats) {
    return `
      <div class="statistics-screen">
        <h2>統計</h2>

        <p>総回答数: ${stats.totalAnswers}</p>
        <p>総正答率: ${stats.accuracy}%</p>
        <p>習得済み: ${stats.mastered}</p>
        <p>復習対象: ${stats.reviewTargets}</p>
      </div>
    `;
  },

  createBackupScreen() {
    return `
      <div class="backup-screen">
        <h2>バックアップ</h2>

        <button id="exportBackup">
          JSONバックアップ作成
        </button>

        <input type="file"
               id="importBackupFile">

        <button id="importBackup">
          復元
        </button>
      </div>
    `;
  },

  createSettingsScreen() {
    return `
      <div class="settings-screen">
        <h2>設定</h2>

        <button id="resetData">
          学習データ初期化
        </button>

        <button id="clearSingleTraining">
          単一特訓解除
        </button>
      </div>
    `;
  }

};
