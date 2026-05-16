(function () {
  const packs = window.QUIZ_PACKS || [];
  const appConfig = {
    storagePrefix: "dynamic-quiz-skeleton",
    reviewDelayHours: 24,
  };

  const els = {
    packSelect: document.getElementById("packSelect"),
    courseLabel: document.getElementById("courseLabel"),
    appTitle: document.getElementById("appTitle"),
    positionLabel: document.getElementById("positionLabel"),
    knownLabel: document.getElementById("knownLabel"),
    markedLabel: document.getElementById("markedLabel"),
    dueLabel: document.getElementById("dueLabel"),
    progressFill: document.getElementById("progressFill"),
    topicSelect: document.getElementById("topicSelect"),
    modeSelect: document.getElementById("modeSelect"),
    difficultySelect: document.getElementById("difficultySelect"),
    searchInput: document.getElementById("searchInput"),
    shuffleToggle: document.getElementById("shuffleToggle"),
    instantFeedbackToggle: document.getElementById("instantFeedbackToggle"),
    exportBtn: document.getElementById("exportBtn"),
    resetBtn: document.getElementById("resetBtn"),
    questionType: document.getElementById("questionType"),
    difficultyLabel: document.getElementById("difficultyLabel"),
    tagList: document.getElementById("tagList"),
    questionText: document.getElementById("questionText"),
    questionMedia: document.getElementById("questionMedia"),
    questionImage: document.getElementById("questionImage"),
    questionImageCaption: document.getElementById("questionImageCaption"),
    answersForm: document.getElementById("answersForm"),
    feedback: document.getElementById("feedback"),
    prevBtn: document.getElementById("prevBtn"),
    markBtn: document.getElementById("markBtn"),
    submitBtn: document.getElementById("submitBtn"),
    sessionActions: document.getElementById("sessionActions"),
    restartBtn: document.getElementById("restartBtn"),
    restartMarkedBtn: document.getElementById("restartMarkedBtn"),
    revealNextBtn: document.getElementById("revealNextBtn"),
    revealAllBtn: document.getElementById("revealAllBtn"),
    knownBtn: document.getElementById("knownBtn"),
    unknownBtn: document.getElementById("unknownBtn"),
    nextBtn: document.getElementById("nextBtn"),
    referencePanel: document.getElementById("referencePanel"),
    referenceTitle: document.getElementById("referenceTitle"),
    referenceExcerpt: document.getElementById("referenceExcerpt"),
    referenceLink: document.getElementById("referenceLink"),
    questionDots: document.getElementById("questionDots"),
  };

  const runtime = {
    packs: [],
    pack: emptyPack(),
    questions: [],
    visible: [],
    currentIndex: 0,
    filters: {
      topic: "all",
      mode: "all",
      difficulty: "all",
      search: "",
      shuffle: false,
      instantFeedback: false,
    },
    shuffleNonce: 0,
    shuffleCache: {
      signature: "",
      nonce: -1,
      orderIds: [],
    },
    appState: { activePackId: null },
    state: { byId: {}, currentId: null },
  };

  init();

  function init() {
    runtime.packs = normalizePacks(packs);
    if (!runtime.packs.length) runtime.packs = [emptyPack()];
    runtime.appState = loadAppState();

    const requestedPackId = runtime.appState.activePackId;
    runtime.pack = runtime.packs.find((pack) => pack.id === requestedPackId) || runtime.packs[0];

    runtime.questions = normalizeQuestions(runtime.pack.questions);
    runtime.state = loadState();
    hydrateFilters();
    renderPackOptions();
    renderPackMeta();
    renderTopicOptions();
    attachEvents();
    render();
  }

  function emptyPack() {
    return {
      id: "empty",
      title: "Ures kikerdezo",
      course: "Nincs adatcsomag",
      version: "0",
      topics: [{ id: "all", label: "Minden temakor" }],
      questions: [],
    };
  }

  function normalizeQuestions(questions) {
    return (questions || []).map((question, index) => {
      const fallbackBoxes =
        (question.answerItems || []).length > 0
          ? [{ id: "default", title: question.revealTitle || "Felfedheto valaszok", items: question.answerItems }]
          : [];
      const revealBoxes = (question.revealBoxes || fallbackBoxes).map((box, boxIndex) => ({
        id: box.id || `box-${boxIndex + 1}`,
        title: box.title || `Box ${boxIndex + 1}`,
        items: box.items || [],
      }));
      return {
        difficulty: "medium",
        tags: [],
        topic: "general",
        reference: {},
        answerItems: [],
        revealBoxes,
        ...question,
        revealBoxes,
        id: question.id || `question-${index + 1}`,
      };
    });
  }

  function normalizePacks(inputPacks) {
    return (inputPacks || []).map((pack, index) => ({
      ...emptyPack(),
      ...pack,
      id: pack?.id || `pack-${index + 1}`,
      topics: pack?.topics?.length ? pack.topics : [{ id: "all", label: "Minden temakor" }],
      questions: pack?.questions || [],
    }));
  }

  function appStorageKey() {
    return `${appConfig.storagePrefix}:app`;
  }

  function loadAppState() {
    try {
      const saved = JSON.parse(localStorage.getItem(appStorageKey()));
      return saved && typeof saved === "object" ? saved : { activePackId: null };
    } catch {
      return { activePackId: null };
    }
  }

  function saveAppState() {
    runtime.appState.activePackId = runtime.pack?.id || null;
    localStorage.setItem(appStorageKey(), JSON.stringify(runtime.appState));
  }

  function storageKey() {
    return `${appConfig.storagePrefix}:${runtime.pack.id}:${runtime.pack.version}`;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey()));
      return saved && typeof saved === "object" ? saved : { byId: {}, currentId: null };
    } catch {
      return { byId: {}, currentId: null };
    }
  }

  function saveState() {
    const current = runtime.questions[runtime.currentIndex];
    runtime.state.currentId = current?.id || null;
    runtime.state.filters = runtime.filters;
    localStorage.setItem(storageKey(), JSON.stringify(runtime.state));
    saveAppState();
  }

  function hydrateFilters() {
    runtime.filters = {
      ...runtime.filters,
      ...(runtime.state.filters || {}),
    };
    const savedIndex = runtime.questions.findIndex((question) => question.id === runtime.state.currentId);
    runtime.currentIndex = savedIndex >= 0 ? savedIndex : 0;
  }

  function qState(id) {
    runtime.state.byId[id] ||= {
      marked: false,
      status: "new",
      selected: [],
      text: "",
      notes: "",
      attempts: 0,
      lastAnsweredAt: null,
      revealed: false,
      revealedCount: 0,
      revealedByBox: {},
    };
    return runtime.state.byId[id];
  }

  function renderPackOptions() {
    els.packSelect.innerHTML = "";
    runtime.packs.forEach((pack) => {
      const option = document.createElement("option");
      option.value = pack.id;
      option.textContent = pack.title || pack.id;
      els.packSelect.appendChild(option);
    });
    els.packSelect.value = runtime.pack.id;
  }

  function renderPackMeta() {
    els.courseLabel.textContent = runtime.pack.course || "Tananyag";
    els.appTitle.textContent = runtime.pack.title || "Kikerdezo skeleton";
  }

  function renderTopicOptions() {
    els.topicSelect.innerHTML = "";
    const topicIds = new Set(runtime.questions.map((question) => question.topic));
    const configured = runtime.pack.topics || [];
    const topics = configured.length
      ? configured
      : [{ id: "all", label: "Minden temakor" }, ...Array.from(topicIds).map((id) => ({ id, label: id }))];

    topics.forEach((topic) => {
      if (topic.id !== "all" && !topicIds.has(topic.id)) return;
      const option = document.createElement("option");
      option.value = topic.id;
      option.textContent = topic.label;
      els.topicSelect.appendChild(option);
    });
    if (!Array.from(els.topicSelect.options).some((option) => option.value === runtime.filters.topic)) {
      runtime.filters.topic = "all";
    }
    els.topicSelect.value = runtime.filters.topic;
  }

  function buildVisible() {
    const term = runtime.filters.search.trim().toLowerCase();
    const filtered = runtime.questions.filter((question) => {
      const saved = qState(question.id);
      const matchesTopic = runtime.filters.topic === "all" || question.topic === runtime.filters.topic;
      const matchesDifficulty =
        runtime.filters.difficulty === "all" || question.difficulty === runtime.filters.difficulty;
      const matchesMode =
        runtime.filters.mode === "all" ||
        (runtime.filters.mode === "new" && saved.status === "new") ||
        (runtime.filters.mode === "marked" && saved.marked) ||
        (runtime.filters.mode === "wrong" && saved.status === "wrong") ||
        (runtime.filters.mode === "due" && isDue(saved));
      const matchesSearch = !term || searchableText(question).includes(term);
      return matchesTopic && matchesDifficulty && matchesMode && matchesSearch;
    });

    runtime.visible = runtime.filters.shuffle ? shuffledVisible(filtered) : filtered;
    const current = runtime.questions[runtime.currentIndex];
    if (!runtime.visible.includes(current)) {
      runtime.currentIndex = runtime.visible.length ? runtime.questions.indexOf(runtime.visible[0]) : 0;
    }
  }

  function searchableText(question) {
    return [
      question.prompt,
      question.explanation,
      question.topic,
      question.difficulty,
      question.reference?.title,
      question.reference?.excerpt,
      question.media?.caption,
      question.media?.alt,
      ...(question.tags || []),
      ...(question.answerItems || []),
      ...(question.revealBoxes || []).flatMap((box) => [box.title, ...(box.items || [])]),
      ...(question.options || []).map((option) => option.text),
    ]
      .join(" ")
      .toLowerCase();
  }

  function stableShuffle(items) {
    const signature = items.map((item) => item.id).join("|");
    const cache = runtime.shuffleCache;
    if (cache.signature !== signature || cache.nonce !== runtime.shuffleNonce) {
      const orderIds = items.map((item) => item.id);
      fisherYates(orderIds);
      cache.signature = signature;
      cache.nonce = runtime.shuffleNonce;
      cache.orderIds = orderIds;
    }

    const byId = new Map(items.map((item) => [item.id, item]));
    return cache.orderIds.map((id) => byId.get(id)).filter(Boolean);
  }

  function fisherYates(values) {
    for (let i = values.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
  }

  function shuffledVisible(items) {
    return stableShuffle(items);
  }

  function isDue(saved) {
    if (saved.status === "wrong" || saved.status === "unknown") return true;
    if (saved.status === "new") return false;
    if (!saved.lastAnsweredAt) return false;
    const delay = appConfig.reviewDelayHours * 60 * 60 * 1000;
    return Date.now() - Date.parse(saved.lastAnsweredAt) >= delay;
  }

  function render() {
    buildVisible();
    syncControls();
    renderStats();

    if (!runtime.questions.length) {
      renderEmpty("Nincs betoltott kerdesadat.");
      return;
    }

    if (!runtime.visible.length) {
      renderEmpty("Ebben a szuresben most nincs kerdes.");
      saveState();
      return;
    }

    const question = runtime.questions[runtime.currentIndex];
    const saved = qState(question.id);
    const currentVisibleIndex = runtime.visible.indexOf(question);
    const visiblePosition = currentVisibleIndex + 1;
    const atStart = currentVisibleIndex <= 0;
    const atEnd = currentVisibleIndex >= runtime.visible.length - 1;

    els.positionLabel.textContent = `${visiblePosition} / ${runtime.visible.length}`;
    els.questionType.textContent = questionTypeLabel(question.type);
    els.difficultyLabel.textContent = difficultyLabel(question.difficulty);
    els.tagList.textContent = (question.tags || []).join(" / ") || "nincs tag";
    els.questionText.textContent = question.prompt;
    els.markBtn.textContent = saved.marked ? "Jeloles levetele" : "Megjelolom";
    els.markBtn.setAttribute("aria-pressed", String(saved.marked));

    renderMedia(question);
    renderAnswers(question, saved);
    renderActionModes(question, saved);
    renderSessionActions(atStart, atEnd);
    renderFeedback(question, saved);
    renderReference(question);
    renderDots();
    saveState();
  }

  function syncControls() {
    els.packSelect.value = runtime.pack.id;
    els.topicSelect.value = runtime.filters.topic;
    els.modeSelect.value = runtime.filters.mode;
    els.difficultySelect.value = runtime.filters.difficulty;
    els.searchInput.value = runtime.filters.search;
    els.shuffleToggle.checked = runtime.filters.shuffle;
    els.instantFeedbackToggle.checked = runtime.filters.instantFeedback;
  }

  function renderStats() {
    els.knownLabel.textContent = `${countByStatus("known")} tudott`;
    els.markedLabel.textContent = `${runtime.questions.filter((question) => qState(question.id).marked).length} jelolt`;
    els.dueLabel.textContent = `${runtime.questions.filter((question) => isDue(qState(question.id))).length} gyakorlando`;
    const answered = runtime.questions.filter((question) => qState(question.id).status !== "new").length;
    els.progressFill.style.width = `${runtime.questions.length ? (answered / runtime.questions.length) * 100 : 0}%`;
  }

  function renderEmpty(message) {
    els.positionLabel.textContent = "0 / 0";
    els.questionType.textContent = "-";
    els.difficultyLabel.textContent = "-";
    els.tagList.textContent = "";
    els.questionText.textContent = message;
    els.answersForm.innerHTML = "";
    els.questionMedia.classList.add("hidden");
    els.questionImage.src = "";
    els.questionImage.alt = "";
    els.questionImageCaption.textContent = "";
    els.feedback.className = "feedback hidden";
    els.referenceTitle.textContent = "-";
    els.referenceExcerpt.textContent = "";
    els.referenceLink.href = "#";
    els.referencePanel.classList.add("hidden");
    els.questionDots.innerHTML = "";
    els.prevBtn.disabled = true;
    els.nextBtn.disabled = true;
    els.sessionActions.classList.add("hidden");
  }

  function countByStatus(status) {
    return runtime.questions.filter((question) => qState(question.id).status === status).length;
  }

  function questionTypeLabel(type) {
    const labels = {
      single: "Egy valasz",
      multi: "Tobb valasz",
      text: "Rovid valasz",
      "self-list": "Onellenorzos felsorolas",
    };
    return labels[type] || "Kerdes";
  }

  function difficultyLabel(difficulty) {
    const labels = {
      easy: "Konnyu",
      medium: "Kozepes",
      hard: "Nehez",
    };
    return labels[difficulty] || difficulty;
  }

  function renderAnswers(question, saved) {
    els.answersForm.innerHTML = "";
    if (question.type === "self-list") {
      renderSelfListAnswer(question, saved);
      return;
    }
    if (question.type === "text") {
      renderTextAnswer(question, saved);
      return;
    }

    const inputType = question.type === "multi" ? "checkbox" : "radio";
    (question.options || []).forEach((option) => {
      const label = document.createElement("label");
      label.className = "answer-option";
      if (saved.revealed && (question.answers || []).includes(option.id)) label.classList.add("correct");
      if (saved.revealed && saved.selected.includes(option.id) && !(question.answers || []).includes(option.id)) {
        label.classList.add("wrong");
      }

      const input = document.createElement("input");
      input.type = inputType;
      input.name = "answer";
      input.value = String(option.id);
      input.checked = saved.selected.includes(option.id);
      input.addEventListener("change", () => {
        saved.selected = selectedAnswers(question.type, input);
        saved.revealed = false;
        saveState();
        if (runtime.filters.instantFeedback && question.type === "single") checkAnswer();
        else render();
      });

      const text = document.createElement("span");
      text.textContent = option.text;
      label.append(input, text);
      els.answersForm.appendChild(label);
    });
  }

  function renderSelfListAnswer(question, saved) {
    const prompt = document.createElement("label");
    prompt.className = "text-answer";

    const caption = document.createElement("span");
    caption.textContent = question.answerLabel || "Sajat valaszod";

    const textarea = document.createElement("textarea");
    textarea.value = saved.notes || "";
    textarea.placeholder = question.placeholder || "Ird le a sajat felsorolasod, majd fedd fel a hivatalos pontokat.";
    textarea.addEventListener("input", () => {
      saved.notes = textarea.value;
      saveState();
    });
    prompt.append(caption, textarea);
    els.answersForm.appendChild(prompt);

    saved.revealedByBox ||= {};
    const boxes = question.revealBoxes || [];
    boxes.forEach((box, boxIndex) => {
      const boxId = box.id || `box-${boxIndex + 1}`;
      const cleaned = (box.items || []).map((item) => String(item || "").trim()).filter(Boolean);
      const fallbackText =
        boxId === "normal" ? "Ennel a sornal nincs kulon ep szerv leiras a forrasban." : "Nincs kulon rogzitett pont.";
      const items = cleaned.length ? cleaned : [fallbackText];
      const defaultRevealed = cleaned.length ? 0 : 1;
      const revealed = Math.min(saved.revealedByBox[boxId] ?? defaultRevealed, items.length);

      const list = document.createElement("section");
      list.className = "self-list";

      const head = document.createElement("div");
      head.className = "reveal-box-head";
      const title = document.createElement("p");
      title.className = "self-list-title";
      title.textContent = box.title;
      const stat = document.createElement("span");
      stat.className = "reveal-stat";
      stat.textContent = `${revealed} / ${items.length}`;
      head.append(title, stat);
      list.appendChild(head);

      const actions = document.createElement("div");
      actions.className = "reveal-box-actions";
      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "secondary";
      nextBtn.textContent = "Kov. pont";
      nextBtn.disabled = revealed >= items.length;
      nextBtn.addEventListener("click", () => revealNextInBox(question.id, boxId));
      const allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "secondary";
      allBtn.textContent = "Osszes";
      allBtn.disabled = revealed >= items.length;
      allBtn.addEventListener("click", () => revealAllInBox(question.id, boxId));
      actions.append(nextBtn, allBtn);
      list.appendChild(actions);

      const ul = document.createElement("ul");
      items.forEach((item, index) => {
        const li = document.createElement("li");
        const visible = index < revealed;
        li.textContent = visible ? item : `${index + 1}. pont (rejtett)`;
        if (!visible) li.classList.add("masked");
        ul.appendChild(li);
      });
      list.appendChild(ul);
      els.answersForm.appendChild(list);
    });
  }

  function renderMedia(question) {
    const media = question.media;
    if (!media?.src) {
      els.questionMedia.classList.add("hidden");
      els.questionImage.src = "";
      els.questionImage.alt = "";
      els.questionImageCaption.textContent = "";
      return;
    }
    els.questionImage.src = media.src;
    els.questionImage.alt = media.alt || question.prompt;
    els.questionImageCaption.textContent = media.caption || "";
    els.questionMedia.classList.remove("hidden");
  }

  function renderActionModes(question, saved) {
    const isSelfList = question.type === "self-list";
    els.revealNextBtn.classList.add("hidden");
    els.revealAllBtn.classList.add("hidden");
    if (isSelfList) {
      els.submitBtn.textContent = "Onellenorzeses";
      els.submitBtn.disabled = true;
      els.revealNextBtn.disabled = true;
      els.revealAllBtn.disabled = true;
      return;
    }
    els.submitBtn.textContent = "Ellenorzes";
    els.submitBtn.disabled = false;
    els.revealNextBtn.disabled = true;
    els.revealAllBtn.disabled = true;
  }

  function renderSessionActions(atStart, atEnd) {
    els.prevBtn.disabled = atStart;
    els.nextBtn.disabled = atEnd;
    els.sessionActions.classList.toggle("hidden", !atEnd);
    els.restartMarkedBtn.disabled = !runtime.questions.some((question) => qState(question.id).marked);
  }

  function renderTextAnswer(question, saved) {
    const label = document.createElement("label");
    label.className = "text-answer";

    const caption = document.createElement("span");
    caption.textContent = question.answerLabel || "Valasz";

    const input = document.createElement("input");
    input.type = "text";
    input.value = saved.text || "";
    input.placeholder = question.placeholder || "";
    input.addEventListener("input", () => {
      saved.text = input.value;
      saved.revealed = false;
      saveState();
    });

    label.append(caption, input);
    els.answersForm.appendChild(label);
  }

  function selectedAnswers(type, changedInput) {
    if (type === "single") return [Number(changedInput.value)];
    return Array.from(els.answersForm.querySelectorAll("input:checked")).map((input) => Number(input.value));
  }

  function renderFeedback(question, saved) {
    els.feedback.className = "feedback hidden";
    if (!saved.revealed) return;
    if (question.type === "self-list") {
      const boxes = question.revealBoxes || [];
      const total = boxes.reduce((sum, box) => sum + (box.items || []).length, 0);
      const revealed = boxes.reduce((sum, box, boxIndex) => {
        const boxId = box.id || `box-${boxIndex + 1}`;
        return sum + Math.min(saved.revealedByBox?.[boxId] || 0, (box.items || []).length);
      }, 0);
      els.feedback.classList.remove("hidden");
      els.feedback.classList.remove("bad");
      els.feedback.textContent = `${revealed}/${total} valaszpont felfedve. Jelold a kerdest Tudom vagy Nem tudom allapotura.`;
      return;
    }

    const good = isCorrect(question, saved);
    els.feedback.classList.remove("hidden");
    els.feedback.classList.toggle("bad", !good);
    els.feedback.textContent = good ? "Helyes valasz." : `Nem pontos. Helyes megoldas: ${correctAnswerText(question)}`;
  }

  function renderReference(question) {
    const title = (question.reference?.title || "").trim();
    const excerpt = (question.reference?.excerpt || "").trim();
    const url = (question.reference?.url || "").trim();
    const explanation = (question.explanation || "").trim();
    const hasContent = Boolean(title || excerpt || explanation || (url && url !== "#"));

    if (!hasContent) {
      els.referencePanel.classList.add("hidden");
      els.referenceTitle.textContent = "-";
      els.referenceExcerpt.textContent = "";
      els.referenceLink.href = "#";
      return;
    }

    els.referencePanel.classList.remove("hidden");
    els.referenceTitle.textContent = title || "Kiegeszito informacio";
    els.referenceExcerpt.textContent = explanation || excerpt;
    els.referenceLink.href = url || "#";
  }

  function renderDots() {
    els.questionDots.innerHTML = "";
    runtime.visible.forEach((question) => {
      const saved = qState(question.id);
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `dot ${saved.status}`;
      if (saved.marked) dot.classList.add("marked");
      if (runtime.questions[runtime.currentIndex] === question) dot.classList.add("active");
      dot.textContent = String(runtime.questions.indexOf(question) + 1);
      dot.title = question.prompt;
      dot.addEventListener("click", () => {
        runtime.currentIndex = runtime.questions.indexOf(question);
        render();
      });
      els.questionDots.appendChild(dot);
    });
  }

  function normalizeAnswer(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function isCorrect(question, saved) {
    if (question.type === "self-list") return false;
    if (question.type === "text") {
      const accepted = question.accept || [];
      return accepted.some((answer) => normalizeAnswer(answer) === normalizeAnswer(saved.text));
    }
    return arraysEqual(saved.selected, question.answers || []);
  }

  function arraysEqual(a, b) {
    const left = [...a].sort((x, y) => x - y);
    const right = [...b].sort((x, y) => x - y);
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function correctAnswerText(question) {
    if (question.type === "self-list") {
      return (question.revealBoxes || [])
        .flatMap((box) => (box.items || []).map((item) => `${box.title}: ${item}`))
        .join("; ");
    }
    if (question.type === "text") return (question.accept || []).join(" vagy ");
    return (question.answers || [])
      .map((id) => (question.options || []).find((option) => option.id === id)?.text)
      .filter(Boolean)
      .join("; ");
  }

  function checkAnswer() {
    const question = runtime.questions[runtime.currentIndex];
    if (!question) return;
    if (question.type === "self-list") {
      showNotice("Ennel a kerdestipusnal boxon belul tudod egyesevel felfedni a pontokat.");
      return;
    }

    const saved = qState(question.id);
    if (question.type !== "text") {
      saved.selected = Array.from(els.answersForm.querySelectorAll("input:checked")).map((input) => Number(input.value));
    }
    saved.revealed = true;
    saved.attempts += 1;
    saved.lastAnsweredAt = new Date().toISOString();
    saved.status = isCorrect(question, saved) ? "known" : "wrong";
    render();
  }

  function revealNextAnswer() {
    const question = runtime.questions[runtime.currentIndex];
    if (!question || question.type !== "self-list") return;
    const saved = qState(question.id);
    const items = question.answerItems || [];
    saved.revealedCount = Math.min((saved.revealedCount || 0) + 1, items.length);
    saved.revealed = true;
    saved.attempts += 1;
    saveState();
    render();
  }

  function revealAllAnswers() {
    const question = runtime.questions[runtime.currentIndex];
    if (!question || question.type !== "self-list") return;
    const saved = qState(question.id);
    const items = question.answerItems || [];
    saved.revealedCount = items.length;
    saved.revealed = true;
    saved.attempts += 1;
    saveState();
    render();
  }

  function revealNextInBox(questionId, boxId) {
    const question = runtime.questions.find((item) => item.id === questionId);
    if (!question || question.type !== "self-list") return;
    const box = (question.revealBoxes || []).find((item) => item.id === boxId);
    if (!box) return;
    const saved = qState(questionId);
    saved.revealedByBox ||= {};
    saved.revealedByBox[boxId] = Math.min((saved.revealedByBox[boxId] || 0) + 1, (box.items || []).length);
    saved.revealed = true;
    saved.attempts += 1;
    saveState();
    render();
  }

  function revealAllInBox(questionId, boxId) {
    const question = runtime.questions.find((item) => item.id === questionId);
    if (!question || question.type !== "self-list") return;
    const box = (question.revealBoxes || []).find((item) => item.id === boxId);
    if (!box) return;
    const saved = qState(questionId);
    saved.revealedByBox ||= {};
    saved.revealedByBox[boxId] = (box.items || []).length;
    saved.revealed = true;
    saved.attempts += 1;
    saveState();
    render();
  }

  function markKnown() {
    const question = runtime.questions[runtime.currentIndex];
    if (!question) return;
    const saved = qState(question.id);
    saved.status = "known";
    saved.marked = false;
    saved.revealed = false;
    saved.lastAnsweredAt = new Date().toISOString();
    render();
  }

  function markUnknown() {
    const question = runtime.questions[runtime.currentIndex];
    if (!question) return;
    const saved = qState(question.id);
    saved.status = "unknown";
    saved.marked = true;
    saved.revealed = false;
    saved.lastAnsweredAt = new Date().toISOString();
    render();
  }

  function toggleMarked() {
    const question = runtime.questions[runtime.currentIndex];
    if (!question) return;
    const saved = qState(question.id);
    saved.marked = !saved.marked;
    render();
  }

  function go(delta) {
    buildVisible();
    if (!runtime.visible.length) return;
    const current = runtime.questions[runtime.currentIndex];
    const visibleIndex = Math.max(runtime.visible.indexOf(current), 0);
    const nextVisibleIndex = clamp(visibleIndex + delta, 0, runtime.visible.length - 1);
    runtime.currentIndex = runtime.questions.indexOf(runtime.visible[nextVisibleIndex]);
    render();
  }

  function activatePack(packId) {
    const nextPack = runtime.packs.find((pack) => pack.id === packId);
    if (!nextPack || nextPack.id === runtime.pack.id) return;

    runtime.pack = nextPack;
    runtime.questions = normalizeQuestions(runtime.pack.questions);
    runtime.state = loadState();
    runtime.currentIndex = 0;
    runtime.filters = {
      topic: "all",
      mode: "all",
      difficulty: "all",
      search: "",
      shuffle: false,
      instantFeedback: false,
    };
    runtime.shuffleCache = {
      signature: "",
      nonce: -1,
      orderIds: [],
    };
    runtime.shuffleNonce = 0;
    hydrateFilters();
    renderPackMeta();
    renderTopicOptions();
    saveAppState();
    render();
  }

  function resetQuestionProgress(question, options = {}) {
    const saved = qState(question.id);
    const preserveMarked = options.preserveMarked !== false;
    const keepMarked = preserveMarked ? saved.marked : false;
    saved.status = "new";
    saved.selected = [];
    saved.text = "";
    saved.notes = "";
    saved.attempts = 0;
    saved.lastAnsweredAt = null;
    saved.revealed = false;
    saved.revealedCount = 0;
    saved.revealedByBox = {};
    saved.marked = keepMarked;
  }

  function restartFromBeginning() {
    buildVisible();
    if (!runtime.visible.length) return;
    runtime.visible.forEach((question) => resetQuestionProgress(question, { preserveMarked: true }));
    runtime.currentIndex = runtime.questions.indexOf(runtime.visible[0]);
    render();
  }

  function restartMarkedOnly() {
    runtime.filters.mode = "marked";
    runtime.filters.topic = "all";
    runtime.filters.difficulty = "all";
    runtime.filters.search = "";
    buildVisible();
    if (!runtime.visible.length) {
      showNotice("Nincs megjelolt kerdes.");
      render();
      return;
    }
    runtime.visible.forEach((question) => resetQuestionProgress(question, { preserveMarked: true }));
    runtime.currentIndex = runtime.questions.indexOf(runtime.visible[0]);
    render();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function exportState() {
    const payload = JSON.stringify(runtime.state, null, 2);
    if (!navigator.clipboard?.writeText) {
      showNotice(payload);
      return;
    }
    navigator.clipboard
      .writeText(payload)
      .then(() => showNotice("Haladas JSON a vagolapra masolva."))
      .catch(() => showNotice(payload));
  }

  function showNotice(message) {
    els.feedback.className = "feedback";
    els.feedback.textContent = message;
  }

  function resetState() {
    const ok = window.confirm("Toroljem a skeleton kikerdezo mentett haladasat?");
    if (!ok) return;
    localStorage.removeItem(storageKey());
    runtime.state = { byId: {}, currentId: null };
    runtime.currentIndex = 0;
    render();
  }

  function attachEvents() {
    els.packSelect.addEventListener("change", (event) => {
      activatePack(event.target.value);
    });
    els.topicSelect.addEventListener("change", (event) => {
      runtime.filters.topic = event.target.value;
      render();
    });
    els.modeSelect.addEventListener("change", (event) => {
      runtime.filters.mode = event.target.value;
      render();
    });
    els.difficultySelect.addEventListener("change", (event) => {
      runtime.filters.difficulty = event.target.value;
      render();
    });
    els.searchInput.addEventListener("input", (event) => {
      runtime.filters.search = event.target.value;
      render();
    });
    els.shuffleToggle.addEventListener("change", (event) => {
      runtime.filters.shuffle = event.target.checked;
      if (runtime.filters.shuffle) {
        runtime.shuffleNonce += 1;
        buildVisible();
        if (runtime.visible.length) {
          runtime.currentIndex = runtime.questions.indexOf(runtime.visible[0]);
        }
      } else {
        runtime.shuffleCache.signature = "";
        runtime.shuffleCache.orderIds = [];
      }
      render();
    });
    els.instantFeedbackToggle.addEventListener("change", (event) => {
      runtime.filters.instantFeedback = event.target.checked;
      render();
    });
    els.submitBtn.addEventListener("click", checkAnswer);
    els.revealNextBtn.addEventListener("click", revealNextAnswer);
    els.revealAllBtn.addEventListener("click", revealAllAnswers);
    els.prevBtn.addEventListener("click", () => go(-1));
    els.nextBtn.addEventListener("click", () => go(1));
    els.restartBtn.addEventListener("click", restartFromBeginning);
    els.restartMarkedBtn.addEventListener("click", restartMarkedOnly);
    els.markBtn.addEventListener("click", toggleMarked);
    els.knownBtn.addEventListener("click", markKnown);
    els.unknownBtn.addEventListener("click", markUnknown);
    els.exportBtn.addEventListener("click", exportState);
    els.resetBtn.addEventListener("click", resetState);

    document.addEventListener("keydown", (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "Enter") checkAnswer();
      if (event.key.toLowerCase() === "m") toggleMarked();
    });
  }
})();
