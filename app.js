class ExerciseTracker {
  constructor() {
    this.exercises = JSON.parse(localStorage.getItem("exercises")) || [];
    this.deletedExercise = null; // 削除された運動履歴を保存
    this.form = document.getElementById("exerciseForm");
    this.weeklyChart = null;
    this.monthlyChart = null;
    this.goal = JSON.parse(localStorage.getItem("goal")) || {
      type: "time",
      value: 0,
      startDate: null,
    };
    this.init();
  }

  init() {
    this.initializeEventListeners();
    this.loadExercises();
    this.initializeCharts();
    this.updateUI();
    this.autoFillMETs();
    this.loadGoal();
    this.updateProgress();
    this.setupUndoButton(); // 削除取り消しボタンのセットアップ
  }

  setupUndoButton() {
    const undoButton = document.getElementById("undoDeleteBtn");
    if (undoButton) {
      undoButton.addEventListener("click", () => this.undoDelete());
    }
  }

  loadExercises() {
    const savedExercises = localStorage.getItem("exercises");
    this.exercises = savedExercises ? JSON.parse(savedExercises) : [];
  }

  initializeEventListeners() {
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    document.getElementById("exerciseType").addEventListener("change", (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const mets = selectedOption.dataset.mets;
      if (mets) {
        document.getElementById("exerciseIntensity").value = mets;
      }
    });

    document.getElementById("setTodayBtn").addEventListener("click", () => {
      this.setDateToToday();
    });

    document.getElementById("prevDayBtn").addEventListener("click", () => {
      this.changeDateByDays(-1);
    });

    document.getElementById("nextDayBtn").addEventListener("click", () => {
      this.changeDateByDays(1);
    });

    document.getElementById("setGoalBtn").addEventListener("click", () => {
      this.setGoal();
    });
  }

  handleFormSubmit() {
    const height = Number(document.getElementById("height").value) / 100; // cm to meters
    const weight = Number(document.getElementById("weight").value);
    const bmi = this.calculateBMI(weight, height);

    const formData = {
      date: document.getElementById("exerciseDate").value,
      type: document.getElementById("exerciseType").value,
      duration: Number(document.getElementById("exerciseDuration").value),
      intensity: Number(document.getElementById("exerciseIntensity").value),
      weight: weight,
      memo: document.getElementById("memo").value,
      calories: this.calculateCalories(
        Number(document.getElementById("exerciseDuration").value),
        Number(document.getElementById("exerciseIntensity").value),
        weight
      ),
      bmi: bmi,
      id: Date.now(),
    };

    this.exercises.push(formData);
    this.saveToLocalStorage();
    this.updateUI();
    this.updateProgress();

    // フォームの特定のフィールドのみリセット
    this.form.querySelector("#exerciseType").value = "";
    this.form.querySelector("#exerciseDuration").value = "";
    this.form.querySelector("#exerciseIntensity").value = "";
    this.form.querySelector("#memo").value = "";

    this.showNotification("運動を記録しました！");
  }

  calculateCalories(duration, mets, weight) {
    return Math.round((duration * mets * 3.5 * weight) / 200);
  }

  calculateBMI(weight, height) {
    return (weight / (height * height)).toFixed(2);
  }

  saveToLocalStorage() {
    localStorage.setItem("exercises", JSON.stringify(this.exercises));
  }

  updateUI() {
    this.updateTotalStats();
    this.updateHistory();
    this.updateCharts();
  }

  updateTotalStats() {
    const totalTime = this.exercises.reduce(
      (sum, exercise) => sum + exercise.duration,
      0
    );
    const totalCalories = this.exercises.reduce(
      (sum, exercise) => sum + exercise.calories,
      0
    );

    document.getElementById(
      "totalExerciseTime"
    ).textContent = `総運動時間: ${totalTime}分`;
    document.getElementById(
      "totalCalories"
    ).textContent = `総消費カロリー: ${totalCalories}kcal`;
  }

  updateHistory() {
    const historyContainer = document.getElementById("exerciseHistory");
    historyContainer.innerHTML = "";

    const sortedExercises = this.exercises.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    const recentExercises = sortedExercises.slice(0, 3);
    const olderExercises = sortedExercises.slice(3);

    recentExercises.forEach((exercise) => {
      const historyItem = this.createHistoryItem(exercise);
      historyContainer.appendChild(historyItem);
    });

    if (olderExercises.length > 0) {
      const accordion = document.createElement("div");
      accordion.className = "accordion";

      const accordionButton = document.createElement("button");
      accordionButton.className = "accordion-button";
      accordionButton.textContent = "過去の記録を表示";
      accordionButton.addEventListener("click", () => {
        accordionContent.classList.toggle("active");
        accordionButton.textContent = accordionContent.classList.contains(
          "active"
        )
          ? "過去の記録を隠す"
          : "過去の記録を表示";
      });

      const accordionContent = document.createElement("div");
      accordionContent.className = "accordion-content";

      olderExercises.forEach((exercise) => {
        const historyItem = this.createHistoryItem(exercise);
        accordionContent.appendChild(historyItem);
      });

      accordion.appendChild(accordionButton);
      accordion.appendChild(accordionContent);
      historyContainer.appendChild(accordion);
    }
  }

  createHistoryItem(exercise) {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    historyItem.innerHTML = `
      <div>日付: ${exercise.date}</div>
      <div>種目: ${exercise.type}</div>
      <div>時間: ${exercise.duration}分</div>
      <div>消費カロリー: ${exercise.calories}kcal</div>
      <div>身長: ${exercise.height}cm</div>
      <div>体重: ${exercise.weight}kg</div>
      <div>BMI: ${exercise.bmi}</div>
      <div>メモ: ${exercise.memo || "-"}</div>
      <button onclick="exerciseTracker.deleteExercise(${
        exercise.id
      })" class="delete-btn">削除</button>
    `;
    return historyItem;
  }

  deleteExercise(id) {
    const index = this.exercises.findIndex((exercise) => exercise.id === id);
    if (index !== -1) {
      this.deletedExercise = this.exercises[index]; // 削除履歴を保存
      this.exercises.splice(index, 1);
      this.saveToLocalStorage();
      this.updateUI();
      this.showUndoButton(); // 削除取り消しボタンを表示
    }
  }

  undoDelete() {
    if (this.deletedExercise) {
      this.exercises.push(this.deletedExercise);
      this.deletedExercise = null;
      this.saveToLocalStorage();
      this.updateUI();
      this.hideUndoButton(); // 削除取り消しボタンを非表示
    }
  }

  showUndoButton() {
    const undoButton = document.getElementById("undoDeleteBtn");
    if (undoButton) {
      undoButton.style.display = "block";
    }
  }

  hideUndoButton() {
    const undoButton = document.getElementById("undoDeleteBtn");
    if (undoButton) {
      undoButton.style.display = "none";
    }
  }

  initializeCharts() {
    const ctxMonthly = document.getElementById("monthlyChart");
    if (ctxMonthly) {
      const context = ctxMonthly.getContext("2d");
      this.monthlyChart = new Chart(context, {
        type: "line",
        data: {
          labels: Array.from({ length: 30 }, (_, i) => i + 1),
          datasets: [
            {
              label: "消費カロリー",
              data: [],
              borderColor: "#FF4081",
              backgroundColor: "rgba(255, 64, 129, 0.2)",
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.4,
              hidden: false,
            },
            {
              label: "体重",
              data: [],
              borderColor: "#3F51B5",
              backgroundColor: "rgba(63, 81, 181, 0.2)",
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.4,
              hidden: false,
            },
            {
              label: "運動時間",
              data: [],
              borderColor: "#4CAF50",
              backgroundColor: "rgba(76, 175, 80, 0.2)",
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.4,
              hidden: false,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(0, 0, 0, 0.1)",
              },
            },
            x: {
              grid: {
                color: "rgba(0, 0, 0, 0.1)",
              },
            },
          },
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: {
                color: "#333",
              },
            },
          },
        },
      });

      document
        .getElementById("toggleCalories")
        .addEventListener("change", (e) => {
          this.monthlyChart.data.datasets[0].hidden = !e.target.checked;
          this.monthlyChart.update();
        });

      document
        .getElementById("toggleWeight")
        .addEventListener("change", (e) => {
          this.monthlyChart.data.datasets[1].hidden = !e.target.checked;
          this.monthlyChart.update();
        });

      document
        .getElementById("toggleDuration")
        .addEventListener("change", (e) => {
          this.monthlyChart.data.datasets[2].hidden = !e.target.checked;
          this.monthlyChart.update();
        });
    } else {
      console.error("monthlyChart element not found");
    }

    const ctxWeekly = document.getElementById("weeklyChart");
    if (ctxWeekly) {
      const context = ctxWeekly.getContext("2d");
      this.weeklyChart = new Chart(context, {
        type: "line",
        data: {
          labels: Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`),
          datasets: [
            {
              label: "消費カロリー",
              data: [],
              borderColor: "#FF4081",
              backgroundColor: "rgba(255, 64, 129, 0.2)",
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.4,
              hidden: false,
            },
            {
              label: "体重",
              data: [],
              borderColor: "#3F51B5",
              backgroundColor: "rgba(63, 81, 181, 0.2)",
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.4,
              hidden: false,
            },
            {
              label: "運動時間",
              data: [],
              borderColor: "#4CAF50",
              backgroundColor: "rgba(76, 175, 80, 0.2)",
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.4,
              hidden: false,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(0, 0, 0, 0.1)",
              },
            },
            x: {
              grid: {
                color: "rgba(0, 0, 0, 0.1)",
              },
            },
          },
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: {
                color: "#333",
              },
            },
          },
        },
      });

      document
        .getElementById("toggleWeeklyCalories")
        .addEventListener("change", (e) => {
          this.weeklyChart.data.datasets[0].hidden = !e.target.checked;
          this.weeklyChart.update();
        });

      document
        .getElementById("toggleWeeklyWeight")
        .addEventListener("change", (e) => {
          this.weeklyChart.data.datasets[1].hidden = !e.target.checked;
          this.weeklyChart.update();
        });

      document
        .getElementById("toggleWeeklyDuration")
        .addEventListener("change", (e) => {
          this.weeklyChart.data.datasets[2].hidden = !e.target.checked;
          this.weeklyChart.update();
        });
    } else {
      console.error("weeklyChart element not found");
    }
  }

  updateCharts() {
    const daysInMonth = 30;
    const caloriesData = new Array(daysInMonth).fill(0);
    const weightData = new Array(daysInMonth).fill(0);
    const durationData = new Array(daysInMonth).fill(0);

    const daysInWeek = 7;
    const weeklyCaloriesData = new Array(daysInWeek).fill(0);
    const weeklyWeightData = new Array(daysInWeek).fill(0);
    const weeklyDurationData = new Array(daysInWeek).fill(0);

    this.exercises.forEach((exercise) => {
      const date = new Date(exercise.date);
      const day = date.getDate() - 1; // 日付を0始まりのインデックスに変換

      caloriesData[day] += exercise.calories;
      weightData[day] = exercise.weight; // 最新の体重を使用
      durationData[day] += exercise.duration;

      // 最新7日間のデータを集計
      const today = new Date();
      const diffTime = Math.abs(today - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        const weekDay = 7 - diffDays; // 最新の日付がインデックス0になるように
        weeklyCaloriesData[weekDay] += exercise.calories;
        weeklyWeightData[weekDay] = exercise.weight;
        weeklyDurationData[weekDay] += exercise.duration;
      }
    });

    if (this.monthlyChart) {
      this.monthlyChart.data.datasets[0].data = caloriesData;
      this.monthlyChart.data.datasets[1].data = weightData;
      this.monthlyChart.data.datasets[2].data = durationData;
      this.monthlyChart.update();
    }

    if (this.weeklyChart) {
      this.weeklyChart.data.datasets[0].data = weeklyCaloriesData;
      this.weeklyChart.data.datasets[1].data = weeklyWeightData;
      this.weeklyChart.data.datasets[2].data = weeklyDurationData;
      this.weeklyChart.update();
    }
  }

  isThisWeek(date) {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    return date >= weekStart && date <= weekEnd;
  }

  isThisMonth(date) {
    const now = new Date();
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }

  showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
  autoFillMETs() {
    const exerciseTypeSelect = document.getElementById("exerciseType");
    exerciseTypeSelect.addEventListener("change", (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const mets = selectedOption.dataset.mets;
      if (mets) {
        document.getElementById("exerciseIntensity").value = mets;
      }
    });
  }

  setDateToToday() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("exerciseDate").value = today;
  }

  changeDateByDays(days) {
    const dateInput = document.getElementById("exerciseDate");
    const currentDate = new Date(dateInput.value);
    currentDate.setDate(currentDate.getDate() + days);
    dateInput.value = currentDate.toISOString().split("T")[0];
  }

  setGoal() {
    const goalType = document.getElementById("goalType").value;
    const goalValue = Number(document.getElementById("goalValue").value);
    const goalStartDate = document.getElementById("goalStartDate").value;

    if (goalValue > 0 && goalStartDate) {
      this.goal = {
        type: goalType,
        value: goalValue,
        startDate: goalStartDate,
      };
      localStorage.setItem("goal", JSON.stringify(this.goal));
      this.updateProgress();
      this.showNotification("目標を設定しました！");
    } else {
      this.showNotification("有効な目標値と開始日を入力してください。");
    }
  }

  updateProgress() {
    let progress = 0;
    const startDate = new Date(this.goal.startDate);

    const filteredExercises = this.exercises.filter(
      (exercise) => new Date(exercise.date) >= startDate
    );

    if (this.goal.type === "time") {
      const totalTime = filteredExercises.reduce(
        (sum, exercise) => sum + exercise.duration,
        0
      );
      progress = (totalTime / this.goal.value) * 100;
    } else if (this.goal.type === "calories") {
      const totalCalories = filteredExercises.reduce(
        (sum, exercise) => sum + exercise.calories,
        0
      );
      progress = (totalCalories / this.goal.value) * 100;
    } else if (this.goal.type === "days") {
      const uniqueDays = new Set(
        filteredExercises.map((exercise) => exercise.date)
      ).size;
      progress = (uniqueDays / this.goal.value) * 100;
    }

    progress = Math.min(progress, 100); // 100%を超えないようにする
    const progressBar = document.getElementById("progress");
    progressBar.style.width = `${progress}%`;
    document.getElementById(
      "progressPercentage"
    ).textContent = `${progress.toFixed(2)}%`;

    // 達成率に応じて色を変える
    if (progress < 50) {
      progressBar.style.backgroundColor = "#f44336"; // 赤
    } else if (progress < 75) {
      progressBar.style.backgroundColor = "#ffc107"; // 黄色
    } else {
      progressBar.style.backgroundColor = "#4caf50"; // 緑
    }
  }

  loadGoal() {
    if (this.goal.value > 0) {
      document.getElementById("goalType").value = this.goal.type;
      document.getElementById("goalValue").value = this.goal.value;
      document.getElementById("goalStartDate").value = this.goal.startDate;
    }
  }
}

// 通知用のスタイルを動的に追加
const style = document.createElement("style");
style.textContent = `
.notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: var(--success-color);
    color: white;
    padding: 15px 25px;
    border-radius: var(--border-radius);
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease-out;
    z-index: 1000;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.delete-btn {
    background-color: var(--error-color);
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.3s;
}

.delete-btn:hover {
    opacity: 0.9;
}
`;
document.head.appendChild(style);

// アプリケーションの初期化
let exerciseTracker;
document.addEventListener("DOMContentLoaded", () => {
  exerciseTracker = new ExerciseTracker();

  // 初期データがない場合、身長と体重入力を促す
  if (!localStorage.getItem("userHeight")) {
    const height = prompt("初期設定：現在の身長(cm)を入力してください");
    if (height) {
      localStorage.setItem("userHeight", height);
      document.getElementById("height").value = height;
    }
  } else {
    document.getElementById("height").value =
      localStorage.getItem("userHeight");
  }

  if (!localStorage.getItem("userWeight")) {
    const weight = prompt("初期設定：現在の体重(kg)を入力してください");
    if (weight) {
      localStorage.setItem("userWeight", weight);
      document.getElementById("weight").value = weight;
    }
  } else {
    document.getElementById("weight").value =
      localStorage.getItem("userWeight");
  }

  // 今日の日付を初期値として設定
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("exerciseDate").value = today;

  // モーダルウィンドウの制御
  const metsModal = document.getElementById("metsModal");
  const metsInfo = document.getElementById("metsInfo");
  const closeBtn = document.querySelector(".close-btn");

  metsInfo.addEventListener("click", () => {
    metsModal.style.display = "block";
  });

  closeBtn.addEventListener("click", () => {
    metsModal.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target === metsModal) {
      metsModal.style.display = "none";
    }
  });

  const addExerciseBtn = document.getElementById("addExerciseBtn");
  const exerciseTypeSelect = document.getElementById("exerciseType");
  const addExerciseModal = document.getElementById("addExerciseModal");
  const saveExerciseBtn = document.getElementById("saveExerciseBtn");

  // モーダルを開くためのイベントリスナー
  addExerciseBtn.addEventListener("click", () => {
    const selectedOption =
      exerciseTypeSelect.options[exerciseTypeSelect.selectedIndex];
    if (selectedOption.value === "") {
      // "選択してください"が選択されている場合もモーダルを開く
      addExerciseModal.style.display = "block";
    } else if (addExerciseBtn.textContent === "追加") {
      addExerciseModal.style.display = "block";
    } else if (selectedOption.classList.contains("user-added")) {
      if (confirm("この運動項目を削除しますか？")) {
        selectedOption.remove();
        addExerciseBtn.textContent = "追加";
        addExerciseBtn.classList.remove("animate");
      }
    }
  });

  // 新しい運動を保存するためのイベントリスナー
  saveExerciseBtn.addEventListener("click", () => {
    const name = document.getElementById("newExerciseName").value;
    const mets = document.getElementById("newExerciseMets").value;

    if (name && mets) {
      const option = document.createElement("option");
      option.value = name.toLowerCase();
      option.textContent = name;
      option.dataset.mets = mets;
      option.className = "select-option user-added";

      exerciseTypeSelect.appendChild(option);

      addExerciseModal.style.display = "none";
      document.getElementById("newExerciseName").value = "";
      document.getElementById("newExerciseMets").value = "";
    }
  });

  // 運動項目が選択されたときのイベントリスナー
  exerciseTypeSelect.addEventListener("change", () => {
    const selectedOption =
      exerciseTypeSelect.options[exerciseTypeSelect.selectedIndex];
    if (selectedOption.classList.contains("user-added")) {
      addExerciseBtn.textContent = "削除";
      addExerciseBtn.classList.add("animate");
    } else {
      addExerciseBtn.textContent = "追加";
      addExerciseBtn.classList.remove("animate");
    }
  });

  // モーダルを閉じるためのイベントリスナー
  document.querySelector(".close-add-btn").addEventListener("click", () => {
    addExerciseModal.style.display = "none";
  });
});
