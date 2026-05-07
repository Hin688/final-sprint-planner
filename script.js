const STORAGE_KEY = "final-sprint-planner-state-v1";
const DB_NAME = "final-sprint-planner-db";
const DB_VERSION = 1;
const FILE_STORE = "files";
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx"];
const SUBJECT_COLORS = ["#bf5b30", "#2f6c62", "#355c9a", "#8e5a9b", "#c48a18", "#bf4f6a", "#4c7a42", "#1f7a8c"];

const state = {
  subjects: [],
  plans: [],
  completed: [],
  rewardRules: defaultRewardRules(),
  redeemed: [],
  rewardTab: "rules",
  rewardPopupOpen: false,
  pendingDeleteSubjectId: "",
  selectedDate: todayKey(),
  currentMonth: firstDayOfMonth(new Date()),
};

const refs = {
  openSubjectModal: document.querySelector("#openSubjectModal"),
  subjectModal: document.querySelector("#subjectModal"),
  closeSubjectModal: document.querySelector("#closeSubjectModal"),
  confirmModal: document.querySelector("#confirmModal"),
  confirmModalTitle: document.querySelector("#confirmModalTitle"),
  confirmModalText: document.querySelector("#confirmModalText"),
  closeConfirmModal: document.querySelector("#closeConfirmModal"),
  cancelConfirmModal: document.querySelector("#cancelConfirmModal"),
  confirmModalAction: document.querySelector("#confirmModalAction"),
  subjectForm: document.querySelector("#subjectForm"),
  subjectName: document.querySelector("#subjectName"),
  subjectGroup: document.querySelector("#subjectGroup"),
  subjectNote: document.querySelector("#subjectNote"),
  subjectList: document.querySelector("#subjectList"),
  completedBoard: document.querySelector("#completedBoard"),
  rewardRules: document.querySelector("#rewardRules"),
  redeemedBoard: document.querySelector("#redeemedBoard"),
  rewardProgressList: document.querySelector("#rewardProgressList"),
  selectedTaskInfo: document.querySelector("#selectedTaskInfo"),
  subjectCardTemplate: document.querySelector("#subjectCardTemplate"),
  subjectCount: document.querySelector("#subjectCount"),
  nextDeadline: document.querySelector("#nextDeadline"),
  planCount: document.querySelector("#planCount"),
  todayFocusTitle: document.querySelector("#todayFocusTitle"),
  todayFocusList: document.querySelector("#todayFocusList"),
  planForm: document.querySelector("#planForm"),
  planDate: document.querySelector("#planDate"),
  planSubject: document.querySelector("#planSubject"),
  planText: document.querySelector("#planText"),
  rewardForm: document.querySelector("#rewardForm"),
  rewardCount: document.querySelector("#rewardCount"),
  rewardLabel: document.querySelector("#rewardLabel"),
  rewardTabs: Array.from(document.querySelectorAll(".reward-tab")),
  rewardRulesPanel: document.querySelector("#rewardRulesPanel"),
  rewardCustomPanel: document.querySelector("#rewardCustomPanel"),
  rewardRedeemedPanel: document.querySelector("#rewardRedeemedPanel"),
  rewardPopup: document.querySelector("#rewardPopup"),
  rewardPopupTitle: document.querySelector("#rewardPopupTitle"),
  closeRewardPopup: document.querySelector("#closeRewardPopup"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  planItemTemplate: document.querySelector("#planItemTemplate"),
  dayModal: document.querySelector("#dayModal"),
  dayModalTitle: document.querySelector("#dayModalTitle"),
  dayModalContent: document.querySelector("#dayModalContent"),
  closeDayModal: document.querySelector("#closeDayModal"),
  infoModal: document.querySelector("#infoModal"),
  infoModalTitle: document.querySelector("#infoModalTitle"),
  infoModalContent: document.querySelector("#infoModalContent"),
  closeInfoModal: document.querySelector("#closeInfoModal"),
  toast: document.querySelector("#toast"),
};

let dbPromise;
let toastTimer;

bootstrap();

async function bootstrap() {
  hydrateState();
  refs.planDate.value = state.selectedDate;
  await renderAll();
  bindEvents();
}

function bindEvents() {
  refs.openSubjectModal.classList.add("reveal-trigger");
  refs.subjectCount.closest(".stat").classList.add("reveal-trigger");
  refs.nextDeadline.closest(".stat").classList.add("reveal-trigger");
  refs.openSubjectModal.addEventListener("click", () => {
    refs.subjectModal.showModal();
    refs.openSubjectModal.blur();
  });
  refs.closeSubjectModal.addEventListener("click", () => {
    refs.subjectModal.close();
    refs.closeSubjectModal.blur();
  });
  refs.subjectForm.addEventListener("submit", handleSubjectSubmit);
  refs.planForm.addEventListener("submit", handlePlanSubmit);
  refs.rewardForm.addEventListener("submit", handleRewardSubmit);
  refs.subjectCount.closest(".stat").addEventListener("click", openSubjectListModal);
  refs.nextDeadline.closest(".stat").addEventListener("click", openNearestProjectModal);
  refs.rewardTabs.forEach((button) => {
    button.classList.add("reveal-trigger");
    button.addEventListener("click", () => {
      state.rewardTab = button.dataset.tab;
      state.rewardPopupOpen = true;
      renderRewardPanels();
      button.blur();
    });
  });
  refs.closeRewardPopup.addEventListener("click", () => {
    state.rewardPopupOpen = false;
    renderRewardPanels();
    refs.rewardTabs.forEach((button) => button.blur());
    refs.closeRewardPopup.blur();
  });
  refs.prevMonth.addEventListener("click", () => changeMonth(-1));
  refs.nextMonth.addEventListener("click", () => changeMonth(1));
  refs.closeDayModal.addEventListener("click", () => refs.dayModal.close());
  refs.closeInfoModal.addEventListener("click", () => refs.infoModal.close());
  refs.closeConfirmModal.addEventListener("click", closeConfirmModal);
  refs.cancelConfirmModal.addEventListener("click", closeConfirmModal);
  refs.confirmModalAction.addEventListener("click", async () => {
    const subjectId = state.pendingDeleteSubjectId;
    closeConfirmModal();
    if (subjectId) {
      await deleteSubject(subjectId);
    }
  });
}

function hydrateState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    state.subjects = Array.isArray(parsed.subjects) ? parsed.subjects : [];
    state.plans = Array.isArray(parsed.plans) ? parsed.plans : [];
    state.completed = Array.isArray(parsed.completed) ? parsed.completed : [];
    state.rewardRules = Array.isArray(parsed.rewardRules) && parsed.rewardRules.length
      ? parsed.rewardRules
      : defaultRewardRules();
    state.redeemed = Array.isArray(parsed.redeemed) ? parsed.redeemed : [];
    state.rewardTab = parsed.rewardTab || "rules";
    state.rewardPopupOpen = false;
    state.selectedDate = parsed.selectedDate || todayKey();
    state.currentMonth = parsed.currentMonth
      ? firstDayOfMonth(new Date(parsed.currentMonth))
      : firstDayOfMonth(new Date());
  } catch (error) {
    console.error("Failed to parse saved state", error);
  }
}

function persistState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      subjects: state.subjects,
      plans: state.plans,
      completed: state.completed,
      rewardRules: state.rewardRules,
      redeemed: state.redeemed,
      rewardTab: state.rewardTab,
      selectedDate: state.selectedDate,
      currentMonth: state.currentMonth.toISOString(),
    }),
  );
}

async function handleSubjectSubmit(event) {
  event.preventDefault();

  const name = refs.subjectName.value.trim();
  if (!name) {
    return;
  }

  const subjectId = crypto.randomUUID();

  state.subjects.unshift({
    id: subjectId,
    name,
    group: refs.subjectGroup.value.trim(),
    note: refs.subjectNote.value.trim(),
    color: pickSubjectColor(),
    examTime: "",
    assignments: [],
    resources: [],
    createdAt: new Date().toISOString(),
  });

  refs.subjectForm.reset();
  refs.subjectModal.close();
  persistState();
  await renderAll();
}

function handlePlanSubmit(event) {
  event.preventDefault();

  const date = refs.planDate.value;
  const text = refs.planText.value.trim();
  if (!date || !text) {
    return;
  }

  state.plans.unshift({
    id: crypto.randomUUID(),
    date,
    subjectId: refs.planSubject.value || "",
    text,
    note: "",
    createdAt: new Date().toISOString(),
  });

  state.selectedDate = date;
  state.currentMonth = firstDayOfMonth(new Date(`${date}T00:00:00`));
  refs.planForm.reset();
  refs.planDate.value = state.selectedDate;
  persistState();
  renderAll();
}

async function renderAll() {
  state.completed.forEach(normalizeCompletedItem);
  await renderSubjects();
  renderSubjectSelect();
  renderCalendar();
  renderTodayFocus();
  renderCompletedBoard();
  renderRewardRules();
  renderRedeemedBoard();
  renderRewardSummary();
  renderRewardPanels();
  renderStats();
  persistState();
}

async function renderSubjects() {
  refs.subjectList.innerHTML = "";

  if (!state.subjects.length) {
    refs.subjectList.innerHTML =
      '<p class="empty-state">还没有科目，先添加第一门需要复习的课程吧</p>';
    return;
  }

  for (const subject of state.subjects) {
    const node = refs.subjectCardTemplate.content.firstElementChild.cloneNode(true);
    normalizeSubject(subject);
    const title = node.querySelector(".subject-title");
    const titleRow = document.createElement("div");
    titleRow.className = "subject-title-row";
    const colorBadge = document.createElement("span");
    colorBadge.className = "subject-color-badge";
    colorBadge.style.background = subject.color;
    const titleText = document.createElement("span");
    titleText.textContent = subject.name;
    titleRow.append(colorBadge, titleText);
    title.appendChild(titleRow);
    node.querySelector(".subject-meta").textContent = subject.group
      ? `${subject.group} · 已上传 ${subject.resources.length} 份资料`
      : `已上传 ${subject.resources.length} 份资料`;
    node.querySelector(".subject-note").textContent = subject.note || "";

    node.querySelector(".subject-delete").addEventListener("click", () => {
      openDeleteSubjectConfirm(subject);
    });

    const examInput = node.querySelector(".exam-time-input");
    const examDisplay = node.querySelector(".exam-time-display");
    examInput.value = normalizeDateValue(subject.examTime);
    examDisplay.textContent = subject.examTime
      ? `考试时间：${formatDateOnly(subject.examTime)}`
      : "暂未设置考试时间";
    node.querySelector(".save-exam-time").addEventListener("click", async () => {
      subject.examTime = examInput.value || "";
      persistState();
      await renderAll();
    });

    node.querySelector(".assignment-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const titleInput = node.querySelector(".assignment-title-input");
      const deadlineInput = node.querySelector(".assignment-deadline-input");
      const title = titleInput.value.trim();
      const deadline = deadlineInput.value;
      if (!title || !deadline) {
        return;
      }
      subject.assignments.unshift({
        id: crypto.randomUUID(),
        title,
        deadline,
        note: "",
      });
      persistState();
      await renderAll();
    });

    node.querySelector(".subject-upload-input").addEventListener("change", async (event) => {
      const files = Array.from(event.target.files || []);
      await appendFilesToSubject(subject.id, files);
    });

    const assignmentList = node.querySelector(".assignment-list");
    if (!subject.assignments.length) {
      assignmentList.innerHTML = '<p class="empty-state">还没有添加作业 DDL</p>';
    } else {
      subject.assignments
        .slice()
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .forEach((assignment) => {
          const item = document.createElement("article");
          item.className = "assignment-item";
          if (isUrgentDeadline(assignment.deadline)) {
            item.classList.add("is-urgent");
          }
          const content = document.createElement("div");
          content.className = "assignment-main";
          content.innerHTML = `<h5>${assignment.title}</h5><p>${formatDateOnly(
            assignment.deadline,
          )}</p>`;
          if (assignment.note) {
            const note = document.createElement("p");
            note.className = "item-note";
            note.textContent = assignment.note;
            content.appendChild(note);
          }
          const actions = document.createElement("div");
          actions.className = "item-actions";
          const noteButton = document.createElement("button");
          noteButton.type = "button";
          noteButton.className = "ghost-btn";
          noteButton.textContent = "添加备注";
          noteButton.addEventListener("click", async () => {
            const nextNote = window.prompt("给这个 DDL 添加备注", assignment.note || "");
            if (nextNote === null) {
              return;
            }
            assignment.note = nextNote.trim();
            persistState();
            await renderAll();
          });
          const completeButton = document.createElement("button");
          completeButton.type = "button";
          completeButton.className = "success-btn";
          completeButton.textContent = "完成";
          completeButton.addEventListener("click", async () => {
            completeAssignment(subject, assignment);
            await renderAll();
          });
          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "danger-btn";
          deleteButton.textContent = "删除";
          deleteButton.addEventListener("click", async () => {
            subject.assignments = subject.assignments.filter((item) => item.id !== assignment.id);
            persistState();
            await renderAll();
          });
          actions.append(noteButton, completeButton, deleteButton);
          item.append(content, actions);
          assignmentList.appendChild(item);
        });
    }

    const resourceList = node.querySelector(".resource-list");
    if (!subject.resources.length) {
      resourceList.innerHTML = '<p class="empty-state">还没有上传资料</p>';
    } else {
      for (const resource of subject.resources) {
        const resourceItem = document.createElement("div");
        resourceItem.className = "resource-link reveal-trigger";
        resourceItem.innerHTML = `<span>${resource.name}</span><small>${formatFileSize(
          resource.size,
        )} · 单击打开</small>`;
        resourceItem.addEventListener("click", async () => {
          await openResourceFile(resource);
        });
        resourceList.appendChild(resourceItem);
      }
    }

    refs.subjectList.appendChild(node);
  }
}

function renderSubjectSelect() {
  refs.planSubject.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "未关联科目";
  refs.planSubject.appendChild(defaultOption);

  for (const subject of state.subjects) {
    const option = document.createElement("option");
    option.value = subject.id;
    option.textContent = subject.name;
    refs.planSubject.appendChild(option);
  }
}

function renderCalendar() {
  const currentMonth = state.currentMonth;
  refs.calendarTitle.textContent = `${currentMonth.getFullYear()} / ${String(
    currentMonth.getMonth() + 1,
  ).padStart(2, "0")}`;
  refs.calendarGrid.innerHTML = "";

  const days = buildCalendarDays(currentMonth);
  const timelineByDate = groupBy(getCalendarTimelineItems(), (item) => item.date);

  for (const day of days) {
    const dayKey = toDateKey(day.date);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-day reveal-trigger";

    if (!day.inCurrentMonth) {
      cell.classList.add("other-month");
    }
    if (dayKey === state.selectedDate) {
      cell.classList.add("selected");
    }
    if (dayKey === todayKey()) {
      cell.classList.add("today");
    }

    cell.innerHTML = `<span class="day-number">${day.date.getDate()}</span><div class="day-markers"></div>`;
    const markers = cell.querySelector(".day-markers");
    const subjectIds = [
      ...new Set((timelineByDate[dayKey] || []).map((item) => item.subjectId).filter(Boolean)),
    ];
    subjectIds.forEach((subjectId) => {
      const subject = state.subjects.find((item) => item.id === subjectId);
      if (!subject) {
        return;
      }
      const marker = document.createElement("span");
      marker.className = "subject-marker";
      marker.style.background = subject.color;
      marker.title = subject.name;
      markers.appendChild(marker);
    });

    cell.addEventListener("click", () => {
      state.selectedDate = dayKey;
      refs.planDate.value = dayKey;
      if (!day.inCurrentMonth) {
        state.currentMonth = firstDayOfMonth(day.date);
      }
      renderAll();
      openDayModal(dayKey);
    });

    refs.calendarGrid.appendChild(cell);
  }
}

function renderTodayFocus() {
  const today = todayKey();
  refs.todayFocusTitle.textContent = formatDate(today);
  refs.todayFocusList.innerHTML = "";

  const items = getDateTimelineItems(today);
  if (!items.length) {
    refs.todayFocusList.innerHTML = '<p class="empty-state">今日宜休</p>';
    return;
  }

  items.forEach((item) => {
    const node = refs.planItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".plan-item-title").textContent = item.title;
    const subject = state.subjects.find((entry) => entry.id === item.subjectId);
    node.querySelector(".plan-item-subject").textContent = item.meta;
    node.querySelector(".plan-item-note").textContent = item.note || "";
    if (subject) {
      node.style.borderLeft = `6px solid ${subject.color}`;
    }
    const actionWrap = document.createElement("div");
    actionWrap.className = "item-actions";
    const noteButton = document.createElement("button");
    noteButton.type = "button";
    noteButton.className = "ghost-btn";
    noteButton.textContent = "添加备注";
    noteButton.addEventListener("click", () => {
      const nextNote = window.prompt(`给这个${item.kind}添加备注`, item.note || "");
      if (nextNote === null) {
        return;
      }
      item.setNote(nextNote.trim());
      persistState();
      renderAll();
    });
    const completeButton = document.createElement("button");
    completeButton.type = "button";
    completeButton.className = "success-btn";
    completeButton.textContent = "完成";
    completeButton.addEventListener("click", () => {
      item.complete();
      renderAll();
    });
    const deleteButton = node.querySelector(".plan-delete");
    deleteButton.addEventListener("click", () => {
      item.remove();
      persistState();
      renderAll();
    });
    actionWrap.append(noteButton, completeButton, deleteButton);
    node.appendChild(actionWrap);
    refs.todayFocusList.appendChild(node);
  });
}

function renderCompletedBoard() {
  refs.completedBoard.innerHTML = "";

  if (!state.completed.length) {
    refs.completedBoard.innerHTML = '<p class="empty-state">还没有完成记录</p>';
    return;
  }

  const grouped = groupBy(state.completed, (item) => item.subjectName || "未关联科目");
  Object.entries(grouped).forEach(([subjectName, items]) => {
    if (!items.length) {
      return;
    }
    const groupNode = document.createElement("section");
    groupNode.className = "completed-group";
    groupNode.innerHTML = `<h4>${subjectName}</h4><div class="completed-list"></div>`;
    const list = groupNode.querySelector(".completed-list");
    items.forEach((item) => {
      const row = document.createElement("article");
      row.className = "completed-item";
      row.style.borderLeftColor = item.color || SUBJECT_COLORS[0];
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `select-dot${item.selected ? " is-selected" : ""}${item.locked ? " is-locked" : ""}`;
      dot.addEventListener("click", () => {
        if (item.locked) {
          return;
        }
        item.selected = !item.selected;
        persistState();
        renderCompletedBoard();
        renderRewardRules();
        renderRewardSummary();
      });
      const content = document.createElement("div");
      content.innerHTML = `<h5>${item.title}</h5><p>${item.subjectName} · ${item.kind} · ${formatDateOnly(
        item.completedAt,
      )}</p>`;
      if (item.note) {
        const note = document.createElement("p");
        note.className = "item-note";
        note.textContent = item.note;
        content.appendChild(note);
      }
      row.append(dot, content);
      list.appendChild(row);
    });
    refs.completedBoard.appendChild(groupNode);
  });
}

function renderRewardRules() {
  refs.rewardRulesPanel.innerHTML = "";
  const selectedCount = state.completed.filter((item) => item.selected).length;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `<p class="section-kicker">奖励机制</p><h3>当前规则</h3><p>已选择 ${selectedCount} 个任务，可以在下方进度栏里直接兑换</p>`;
  const list = document.createElement("div");
  list.className = "reward-rules";

  state.rewardRules
    .slice()
    .sort((a, b) => a.count - b.count)
    .forEach((rule) => {
      const card = document.createElement("article");
      card.className = "reward-rule";
      card.innerHTML = `<strong>完成 ${rule.count} 个兑换 ${rule.label}</strong><p>当前进度 ${Math.min(
        selectedCount,
        rule.count,
      )}/${rule.count}</p>`;
      list.appendChild(card);
    });
  wrapper.appendChild(list);
  refs.rewardRulesPanel.appendChild(wrapper);
}

function renderRedeemedBoard() {
  refs.redeemedBoard.innerHTML = "";

  if (!state.redeemed.length) {
    refs.redeemedBoard.innerHTML = '<p class="empty-state">还没有兑换记录</p>';
    return;
  }

  const counts = state.redeemed.reduce((accumulator, item) => {
    accumulator[item.label] = (accumulator[item.label] || 0) + 1;
    return accumulator;
  }, {});

  Object.entries(counts).forEach(([label, count]) => {
    const row = document.createElement("article");
    row.className = "redeemed-item";
    row.innerHTML = `<strong>${label}</strong><p>已兑换 ${count} 次</p>`;
    refs.redeemedBoard.appendChild(row);
  });
}

function renderRewardPanels() {
  refs.rewardTabs.forEach((button) => {
    button.classList.toggle(
      "is-active",
      state.rewardPopupOpen && button.dataset.tab === state.rewardTab,
    );
  });
  refs.rewardPopupTitle.textContent =
    state.rewardTab === "rules" ? "奖励机制" : state.rewardTab === "custom" ? "自定义奖励" : "兑换记录";
  refs.rewardPopup.classList.toggle("hidden", !state.rewardPopupOpen);
  refs.rewardRulesPanel.classList.toggle("hidden", state.rewardTab !== "rules");
  refs.rewardCustomPanel.classList.toggle("hidden", state.rewardTab !== "custom");
  refs.rewardRedeemedPanel.classList.toggle("hidden", state.rewardTab !== "redeemed");
}

function renderRewardSummary() {
  refs.rewardProgressList.innerHTML = "";
  const selectedCount = state.completed.filter((item) => item.selected).length;

  state.rewardRules
    .slice()
    .sort((a, b) => a.count - b.count)
    .forEach((rule) => {
      const item = document.createElement("article");
      item.className = "reward-progress-item";
      item.innerHTML = `<div><strong>${rule.label}</strong><p>${Math.min(
        selectedCount,
        rule.count,
      )}/${rule.count}</p></div>`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "exchange-btn";
      button.textContent = "兑换";
      button.disabled = selectedCount < rule.count;
      button.addEventListener("click", () => redeemReward(rule));
      item.appendChild(button);
      refs.rewardProgressList.appendChild(item);
    });

  refs.selectedTaskInfo.innerHTML = `<strong>${selectedCount}</strong><p>已选择任务数</p>`;
}

function handleRewardSubmit(event) {
  event.preventDefault();
  const count = Number(refs.rewardCount.value);
  const label = refs.rewardLabel.value.trim();
  if (!count || count < 1 || !label) {
    return;
  }

  state.rewardRules.push({
    id: crypto.randomUUID(),
    count,
    label,
  });
  refs.rewardForm.reset();
  persistState();
  renderAll();
}

function renderStats() {
  refs.subjectCount.textContent = String(state.subjects.length);

  const upcoming = getNearestProject();

  refs.nextDeadline.textContent = upcoming ? upcoming.label : "暂无";

  refs.planCount.textContent = `${getDateTimelineItems(todayKey()).length} 项`;
}

async function deleteSubject(subjectId) {
  const subject = state.subjects.find((item) => item.id === subjectId);
  if (!subject) {
    return;
  }

  await Promise.all(subject.resources.map((resource) => removeFile(resource.id)));
  state.subjects = state.subjects.filter((item) => item.id !== subjectId);
  state.plans = state.plans.filter((plan) => plan.subjectId !== subjectId);
  persistState();
  await renderAll();
}

function openDeleteSubjectConfirm(subject) {
  state.pendingDeleteSubjectId = subject.id;
  refs.confirmModalTitle.textContent = "确认删除科目";
  refs.confirmModalText.textContent = `确认删除“${subject.name}”吗？删除后，这个科目对应的所有 DDL 和复习计划都会一起删除`;
  refs.confirmModal.showModal();
  refs.confirmModalAction.blur();
  refs.cancelConfirmModal.blur();
  refs.closeConfirmModal.blur();
}

function closeConfirmModal() {
  state.pendingDeleteSubjectId = "";
  refs.confirmModal.close();
  refs.closeConfirmModal.blur();
  refs.cancelConfirmModal.blur();
  refs.confirmModalAction.blur();
}

async function appendFilesToSubject(subjectId, files) {
  if (!files.length) {
    return;
  }

  const validFiles = files.filter(isAllowedFile);
  if (validFiles.length !== files.length) {
    alert("仅支持上传 PDF、Word 和 PPT 文件");
    return;
  }

  const subject = state.subjects.find((item) => item.id === subjectId);
  if (!subject) {
    return;
  }

  for (const file of validFiles) {
    const fileId = crypto.randomUUID();
    await saveFile(fileId, file);
    subject.resources.push({
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type || inferMimeType(file.name),
    });
  }

  persistState();
  showToast(`已成功上传 ${validFiles.length} 份资料`);
  await renderAll();
}

function getDeadlineEntries() {
  const entries = [];
  state.subjects.forEach((subject) => {
    normalizeSubject(subject);
    subject.assignments.forEach((assignment) => {
      entries.push({
        type: "assignment",
        id: assignment.id,
        subjectId: subject.id,
        subjectName: subject.name,
        subjectGroup: subject.group,
        subjectColor: subject.color,
        assignmentTitle: assignment.title,
        note: assignment.note || "",
        label: `${subject.name} · ${assignment.title}`,
        date: assignment.deadline.slice(0, 10),
        dateTime: assignment.deadline,
      });
    });
    if (subject.examTime) {
      entries.push({
        type: "exam",
        id: `exam-${subject.id}`,
        subjectId: subject.id,
        subjectName: subject.name,
        subjectGroup: subject.group,
        subjectColor: subject.color,
        note: subject.note || "",
        label: `${subject.name} · 期末考试`,
        date: subject.examTime.slice(0, 10),
        dateTime: subject.examTime,
      });
    }
  });
  return entries;
}

function normalizeSubject(subject) {
  subject.assignments = Array.isArray(subject.assignments) ? subject.assignments : [];
  subject.resources = Array.isArray(subject.resources) ? subject.resources : [];
  subject.assignments.forEach((assignment) => {
    assignment.note ||= "";
  });
  subject.examTime ||= "";
  subject.group ||= "专业课";
  subject.color ||= SUBJECT_COLORS[0];
}

function normalizeCompletedItem(item) {
  item.note ||= "";
  item.selected ||= false;
  item.locked ||= false;
  item.group ||= "未分组";
  item.color ||= SUBJECT_COLORS[0];
}

function completePlan(plan) {
  const subject = state.subjects.find((item) => item.id === plan.subjectId);
  state.completed.unshift({
    id: crypto.randomUUID(),
    kind: "复习安排",
    title: plan.text,
    subjectName: subject ? subject.name : "未关联科目",
    group: subject ? subject.group : "未分组",
    color: subject ? subject.color : SUBJECT_COLORS[0],
    completedAt: plan.date,
    note: plan.note || "",
    selected: false,
  });
  state.plans = state.plans.filter((item) => item.id !== plan.id);
  persistState();
}

function completeAssignment(subject, assignment) {
  state.completed.unshift({
    id: crypto.randomUUID(),
    kind: "作业 DDL",
    title: assignment.title,
    subjectName: subject.name,
    group: subject.group,
    color: subject.color,
    completedAt: todayKey(),
    note: assignment.note || "",
    selected: false,
  });
  subject.assignments = subject.assignments.filter((item) => item.id !== assignment.id);
  persistState();
}

function getNearestProject() {
  const now = Date.now();
  return getDeadlineEntries()
    .filter((entry) => parseDeadlineDate(entry.dateTime).getTime() >= now)
    .sort((a, b) => parseDeadlineDate(a.dateTime) - parseDeadlineDate(b.dateTime))[0];
}

function getCalendarTimelineItems() {
  return [
    ...state.plans.map((plan) => ({
      id: plan.id,
      date: plan.date,
      subjectId: plan.subjectId,
      kind: "复习安排",
    })),
    ...state.subjects.flatMap((subject) =>
      subject.assignments.map((assignment) => ({
        id: assignment.id,
        date: assignment.deadline.slice(0, 10),
        subjectId: subject.id,
        kind: "作业 DDL",
      })),
    ),
  ];
}

function getDateTimelineItems(dateKey) {
  const planItems = state.plans
    .filter((plan) => plan.date === dateKey)
    .map((plan) => {
      const subject = state.subjects.find((item) => item.id === plan.subjectId);
      return {
        id: plan.id,
        kind: "复习安排",
        title: plan.text,
        date: plan.date,
        note: plan.note || "",
        subjectId: plan.subjectId,
        meta: subject ? `${subject.name} · 复习安排` : "未关联科目 · 复习安排",
        setNote(nextNote) {
          plan.note = nextNote;
        },
        complete() {
          completePlan(plan);
        },
        remove() {
          state.plans = state.plans.filter((item) => item.id !== plan.id);
        },
      };
    });

  const assignmentItems = state.subjects.flatMap((subject) =>
    subject.assignments
      .filter((assignment) => assignment.deadline.slice(0, 10) === dateKey)
      .map((assignment) => ({
        id: assignment.id,
        kind: "作业 DDL",
        title: assignment.title,
        date: assignment.deadline,
        note: assignment.note || "",
        subjectId: subject.id,
        meta: `${subject.name} · 作业 DDL`,
        setNote(nextNote) {
          assignment.note = nextNote;
        },
        complete() {
          completeAssignment(subject, assignment);
        },
        remove() {
          subject.assignments = subject.assignments.filter((item) => item.id !== assignment.id);
        },
      })),
  );

  return [...assignmentItems, ...planItems].sort((a, b) => parseDeadlineDate(a.date) - parseDeadlineDate(b.date));
}

function defaultRewardRules() {
  return [
    { id: "snack-default", count: 1, label: "小零食" },
    { id: "tea-default", count: 2, label: "奶茶" },
  ];
}

function redeemReward(rule) {
  const selectedItems = state.completed.filter((item) => item.selected);
  if (selectedItems.length < rule.count) {
    return;
  }

  selectedItems.slice(0, rule.count).forEach((item) => {
    item.selected = false;
    item.locked = true;
  });

  state.redeemed.push({
    id: crypto.randomUUID(),
    label: rule.label,
    count: rule.count,
    redeemedAt: new Date().toISOString(),
  });

  persistState();
  showToast(`已兑换：${rule.label}`);
  renderAll();
}

function findSubjectName(subjectId) {
  return state.subjects.find((subject) => subject.id === subjectId)?.name || "";
}

function pickSubjectColor() {
  return SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length];
}

function changeMonth(delta) {
  const month = new Date(state.currentMonth);
  month.setMonth(month.getMonth() + delta);
  state.currentMonth = firstDayOfMonth(month);
  persistState();
  renderCalendar();
  renderStats();
}

function buildCalendarDays(monthDate) {
  const first = firstDayOfMonth(monthDate);
  const start = new Date(first);
  const firstWeekday = (first.getDay() + 6) % 7;
  start.setDate(start.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      inCurrentMonth: date.getMonth() === first.getMonth(),
    };
  });
}

function groupBy(items, getKey) {
  return items.reduce((accumulator, item) => {
    const key = getKey(item);
    accumulator[key] ||= [];
    accumulator[key].push(item);
    return accumulator;
  }, {});
}

function firstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function todayKey() {
  return toDateKey(new Date());
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatDateTime(dateString) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatDateOnly(dateString) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parseDateInput(dateString));
}

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isUrgentDeadline(dateString) {
  const remaining = parseDeadlineDate(dateString).getTime() - Date.now();
  return remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
}

function parseDateInput(value) {
  if (!value) {
    return new Date();
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
}

function parseDeadlineDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59`);
  }
  return new Date(value);
}

function normalizeDateValue(value) {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

function isAllowedFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return Boolean(extension && ALLOWED_EXTENSIONS.includes(extension));
}

function inferMimeType(filename) {
  const extension = filename.split(".").pop()?.toLowerCase();
  const mimeMap = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return mimeMap[extension] || "application/octet-stream";
}

function openDayModal(dateKey) {
  const timelineItems = getDateTimelineItems(dateKey);
  refs.dayModalTitle.textContent = `${formatDate(dateKey)} 的详细安排`;
  refs.dayModalContent.innerHTML = "";

  if (!timelineItems.length) {
    refs.dayModalContent.innerHTML = '<p class="empty-state">这一天还没有详细安排</p>';
  } else {
    timelineItems.forEach((timelineItem) => {
      const itemNode = document.createElement("article");
      itemNode.className = "plan-item";
      const subject = state.subjects.find((entry) => entry.id === timelineItem.subjectId);
      itemNode.innerHTML = `<div><h4 class="plan-item-title">${timelineItem.title}</h4><p class="plan-item-subject">${timelineItem.meta}</p></div>`;
      if (subject) {
        itemNode.style.borderLeft = `6px solid ${subject.color}`;
      }
      refs.dayModalContent.appendChild(itemNode);
    });
  }

  refs.dayModal.showModal();
}

function openSubjectListModal() {
  refs.infoModalTitle.textContent = "科目清单";
  refs.infoModalContent.innerHTML = "";

  if (!state.subjects.length) {
    refs.infoModalContent.innerHTML = '<p class="empty-state">目前还没有科目</p>';
  } else {
    state.subjects.forEach((subject) => {
      const item = document.createElement("article");
      item.className = "plan-item";
      item.innerHTML = `<div><h4 class="plan-item-title">${subject.name}</h4><p class="plan-item-subject">${subject.group} · 已上传 ${subject.resources.length} 份资料</p></div>`;
      item.style.borderLeft = `6px solid ${subject.color}`;
      refs.infoModalContent.appendChild(item);
    });
  }

  refs.infoModal.showModal();
}

function openNearestProjectModal() {
  const project = getNearestProject();
  refs.infoModalTitle.textContent = "最近项目详情";
  refs.infoModalContent.innerHTML = "";

  if (!project) {
    refs.infoModalContent.innerHTML = '<p class="empty-state">目前没有待处理项目</p>';
    refs.infoModal.showModal();
    return;
  }

  const detail = document.createElement("article");
  detail.className = "project-detail-card";
  const typeLabel = project.type === "exam" ? "期末考试" : "作业 DDL";
  detail.innerHTML = `
    <p class="section-kicker">最近项目</p>
    <h4 class="plan-item-title">${project.subjectName}</h4>
    <p class="plan-item-subject">${typeLabel}</p>
    <p class="detail-line">分组：${project.subjectGroup}</p>
    <p class="detail-line">日期：${formatDateOnly(project.dateTime)}</p>
    ${project.type === "assignment" ? `<p class="detail-line">标题：${project.assignmentTitle}</p>` : ""}
    ${project.note ? `<p class="detail-line">备注：${project.note}</p>` : ""}
  `;
  detail.style.borderLeft = `6px solid ${project.subjectColor}`;
  refs.infoModalContent.appendChild(detail);
  refs.infoModal.showModal();
}

async function openResourceFile(resource) {
  const file = await loadFile(resource.id);
  if (!file) {
    alert("这个文件暂时无法读取，请重新上传");
    return;
  }

  const extension = resource.name.split(".").pop()?.toLowerCase();
  const url = URL.createObjectURL(file);

  if (extension === "pdf") {
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = resource.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  showToast("资料已开始下载，请在本地查看");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    refs.toast.classList.remove("show");
  }, 2200);
}

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(FILE_STORE)) {
          db.createObjectStore(FILE_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

async function saveFile(fileId, file) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE, "readwrite");
    transaction.objectStore(FILE_STORE).put(file, fileId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function loadFile(fileId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE, "readonly");
    const request = transaction.objectStore(FILE_STORE).get(fileId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function removeFile(fileId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE, "readwrite");
    transaction.objectStore(FILE_STORE).delete(fileId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
