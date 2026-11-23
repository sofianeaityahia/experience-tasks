(() => {
  const STORAGE_KEY = "experience_tasks_v1";
  const THEME_KEY = "experience_tasks_theme";

  // State
  let tasks = loadTasks();
  let currentFilter = "all"; // all | active | completed
  let currentCategory = "همه";
  let searchQuery = "";
  let lastDeleted = null;
  let toastTimer = null;

  // DOM Elements
  const taskForm = document.getElementById("taskForm");
  const taskTitle = document.getElementById("taskTitle");
  const taskNote = document.getElementById("taskNote");
  const taskCategory = document.getElementById("taskCategory");
  const customTag = document.getElementById("customTag");

  const taskList = document.getElementById("taskList");
  const emptyState = document.getElementById("emptyState");
  const emptyTitle = document.getElementById("emptyTitle");
  const emptyDesc = document.getElementById("emptyDesc");
  const categoryChips = document.getElementById("categoryChips");

  const totalCount = document.getElementById("totalCount");
  const activeCount = document.getElementById("activeCount");
  const doneCount = document.getElementById("doneCount");

  const filterButtons = document.querySelectorAll(".tab-btn");
  const searchInput = document.getElementById("searchInput");

  const themeToggle = document.getElementById("themeToggle");
  const sunIcon = document.getElementById("sunIcon");
  const moonIcon = document.getElementById("moonIcon");

  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");

  const editModal = document.getElementById("editModal");
  const editForm = document.getElementById("editForm");
  const editTaskId = document.getElementById("editTaskId");
  const editTitle = document.getElementById("editTitle");
  const editNote = document.getElementById("editNote");
  const editCategory = document.getElementById("editCategory");
  const editTag = document.getElementById("editTag");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  const toast = document.getElementById("toast");

  // Helpers
  const persianNumber = new Intl.NumberFormat("fa-IR");
  const persianDate = new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function formatNumber(n) {
    return persianNumber.format(n);
  }

  function formatDate(isoString) {
    try {
      return persianDate.format(new Date(isoString));
    } catch {
      return "";
    }
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // Theme
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const isDark = theme === "dark";
    sunIcon.hidden = !isDark;
    moonIcon.hidden = isDark;
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      applyTheme("dark");
    } else {
      applyTheme("light");
    }
  }

  // Toast
  function showToast(message, options = {}) {
    clearTimeout(toastTimer);
    toast.innerHTML = "";

    const textSpan = document.createElement("span");
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    if (options.undoAction) {
      const undoBtn = document.createElement("button");
      undoBtn.type = "button";
      undoBtn.className = "toast-undo";
      undoBtn.textContent = "بازگردانی";
      undoBtn.addEventListener("click", () => {
        options.undoAction();
        toast.hidden = true;
      });
      toast.appendChild(undoBtn);
    }

    toast.hidden = false;
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, options.duration || 3500);
  }

  // Render Stats
  function renderStats() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const active = total - completed;

    totalCount.textContent = formatNumber(total);
    activeCount.textContent = formatNumber(active);
    doneCount.textContent = formatNumber(completed);
  }

  // Render Category Chips
  function renderCategoryChips() {
    const categories = Array.from(new Set(tasks.map((t) => t.category).filter(Boolean)));
    categoryChips.innerHTML = "";

    if (categories.length <= 1) {
      currentCategory = "همه";
      return;
    }

    if (currentCategory !== "همه" && !categories.includes(currentCategory)) {
      currentCategory = "همه";
    }

    const allOptions = ["همه", ...categories];
    allOptions.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (cat === currentCategory ? " active" : "");
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        currentCategory = cat;
        render();
      });
      categoryChips.appendChild(btn);
    });
  }

  // Filtering
  function getFilteredTasks() {
    const q = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      if (currentFilter === "active" && task.completed) return false;
      if (currentFilter === "completed" && !task.completed) return false;
      if (currentCategory !== "همه" && task.category !== currentCategory) return false;

      if (q) {
        const haystack = [task.title, task.note, task.category, task.tag]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }

  // Render Task List
  function render() {
    renderStats();
    renderCategoryChips();

    const filtered = getFilteredTasks();
    taskList.innerHTML = "";

    if (filtered.length === 0) {
      emptyState.hidden = false;
      if (tasks.length === 0) {
        emptyTitle.textContent = "هنوز تجربه‌ای ثبت نکرده‌اید";
        emptyDesc.textContent = "اولین تجربه یا تسک خود را از کادر بالا بنویسید تا اینجا نمایش داده شود.";
      } else {
        emptyTitle.textContent = "موردی یافت نشد";
        emptyDesc.textContent = "فیلتر یا عبارت جستجو را تغییر دهید.";
      }
      return;
    }

    emptyState.hidden = true;

    filtered.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-card" + (task.completed ? " completed" : "");
      li.dataset.id = task.id;

      // Checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-checkbox";
      checkbox.checked = Boolean(task.completed);
      checkbox.setAttribute("aria-label", `تغییر وضعیت ${task.title}`);
      checkbox.addEventListener("change", () => toggleTask(task.id));

      // Body
      const body = document.createElement("div");
      body.className = "task-body";

      const topRow = document.createElement("div");
      topRow.className = "task-top";

      const titleEl = document.createElement("div");
      titleEl.className = "task-title";
      titleEl.textContent = task.title;
      titleEl.title = "برای ویرایش کلیک کنید";
      titleEl.addEventListener("click", () => openEditModal(task.id));

      // Actions
      const actions = document.createElement("div");
      actions.className = "task-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "action-btn";
      editBtn.title = "ویرایش";
      editBtn.setAttribute("aria-label", "ویرایش تجربه");
      editBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      `;
      editBtn.addEventListener("click", () => openEditModal(task.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "action-btn delete";
      deleteBtn.title = "حذف";
      deleteBtn.setAttribute("aria-label", "حذف تجربه");
      deleteBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
        </svg>
      `;
      deleteBtn.addEventListener("click", () => deleteTask(task.id));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      topRow.appendChild(titleEl);
      topRow.appendChild(actions);
      body.appendChild(topRow);

      if (task.note && task.note.trim()) {
        const noteEl = document.createElement("div");
        noteEl.className = "task-note";
        noteEl.textContent = task.note;
        body.appendChild(noteEl);
      }

      // Meta
      const meta = document.createElement("div");
      meta.className = "task-meta";

      if (task.category) {
        const catBadge = document.createElement("span");
        catBadge.className = "badge";
        catBadge.textContent = task.category;
        meta.appendChild(catBadge);
      }

      if (task.tag && task.tag.trim()) {
        const tagBadge = document.createElement("span");
        tagBadge.className = "badge badge-tag";
        tagBadge.textContent = `#${task.tag.trim()}`;
        meta.appendChild(tagBadge);
      }

      const dateEl = document.createElement("span");
      dateEl.textContent = formatDate(task.createdAt);
      meta.appendChild(dateEl);

      body.appendChild(meta);

      li.appendChild(checkbox);
      li.appendChild(body);
      taskList.appendChild(li);
    });
  }

  // CRUD Operations
  function addTask(title, note, category, tag) {
    const newTask = {
      id: generateId(),
      title: title.trim(),
      note: note.trim(),
      category: category || "عمومی",
      tag: tag.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    saveTasks();
    render();
    showToast("تجربه جدید ثبت شد.");
  }

  function toggleTask(id) {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    target.completed = !target.completed;
    saveTasks();
    render();
  }

  function deleteTask(id) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return;

    const [removed] = tasks.splice(index, 1);
    lastDeleted = { item: removed, index };
    saveTasks();
    render();

    showToast("تجربه حذف شد.", {
      duration: 5000,
      undoAction: () => {
        if (!lastDeleted) return;
        tasks.splice(lastDeleted.index, 0, lastDeleted.item);
        lastDeleted = null;
        saveTasks();
        render();
      },
    });
  }

  // Edit Modal
  function openEditModal(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    editTaskId.value = task.id;
    editTitle.value = task.title;
    editNote.value = task.note || "";
    editCategory.value = task.category || "عمومی";
    editTag.value = task.tag || "";

    editModal.hidden = false;
    editTitle.focus();
  }

  function closeEditModal() {
    editModal.hidden = true;
  }

  // Backup & Restore
  function exportData() {
    if (tasks.length === 0) {
      showToast("موردی برای پشتیبان‌گیری وجود ندارد.");
      return;
    }
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `experiences-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("فایل پشتیبان دانلود شد.");
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const incoming = Array.isArray(parsed) ? parsed : parsed.tasks;
        if (!Array.isArray(incoming)) {
          throw new Error("Invalid format");
        }

        const sanitized = incoming
          .filter((item) => item && typeof item.title === "string" && item.title.trim())
          .map((item) => ({
            id: typeof item.id === "string" ? item.id : generateId(),
            title: item.title.trim(),
            note: typeof item.note === "string" ? item.note : "",
            category: typeof item.category === "string" ? item.category : "عمومی",
            tag: typeof item.tag === "string" ? item.tag : "",
            completed: Boolean(item.completed),
            createdAt: item.createdAt || new Date().toISOString(),
          }));

        if (sanitized.length === 0) {
          showToast("فایل انتخاب‌شده معتبر نیست یا خالی است.");
          return;
        }

        const existingIds = new Set(tasks.map((t) => t.id));
        const merged = [...sanitized.filter((t) => !existingIds.has(t.id)), ...tasks];
        tasks = merged;
        saveTasks();
        render();
        showToast(`${formatNumber(sanitized.length)} مورد با موفقیت بازیابی شد.`);
      } catch {
        showToast("خطا در خواندن فایل پشتیبان.");
      }
    };
    reader.readAsText(file);
  }

  // Event Listeners
  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = taskTitle.value.trim();
    if (!title) {
      taskTitle.focus();
      return;
    }
    addTask(title, taskNote.value, taskCategory.value, customTag.value);
    taskForm.reset();
    taskTitle.focus();
  });

  taskNote.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      taskForm.requestSubmit();
    }
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    render();
  });

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  exportBtn.addEventListener("click", exportData);
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      importData(file);
      importFile.value = "";
    }
  });

  editForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = editTaskId.value;
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const updatedTitle = editTitle.value.trim();
    if (!updatedTitle) return;

    target.title = updatedTitle;
    target.note = editNote.value.trim();
    target.category = editCategory.value || "عمومی";
    target.tag = editTag.value.trim();

    saveTasks();
    render();
    closeEditModal();
    showToast("تغییرات ذخیره شد.");
  });

  closeModalBtn.addEventListener("click", closeEditModal);
  cancelEditBtn.addEventListener("click", closeEditModal);
  editModal.addEventListener("click", (e) => {
    if (e.target === editModal) closeEditModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !editModal.hidden) {
      closeEditModal();
    }
  });

  // Init
  initTheme();
  render();
})();
