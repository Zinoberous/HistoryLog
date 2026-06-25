const historyElement = document.querySelector("#history");
const historyListElement = document.querySelector("#history-list");
const searchInput = document.querySelector("#search");
const loadingElement = document.querySelector("#loading");
const clearHistoryButton = document.querySelector("#clear-history");
const emptyTemplate = document.querySelector("#empty-template");
const recentlyClosedEntries = document.querySelector("#recently-closed-entries");
const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector("#theme-icon");
const languageSelect = document.querySelector("#language-select");
const tabButtons = document.querySelectorAll("[data-tab]");
const allPanel = document.querySelector("#all-panel");
const recentlyClosedPanel = document.querySelector("#recently-closed-panel");
const confirmOverlay = document.querySelector("#confirm-overlay");
const confirmCancelButton = document.querySelector("#confirm-cancel");
const confirmAcceptButton = document.querySelector("#confirm-accept");

const pageSize = 150;
const themeStorageKey = "quickHistoryTheme";
const languageStorageKey = "quickHistoryLanguage";

const translations = {
  en: {
    appTitle: "History",
    allTab: "All",
    cancel: "Cancel",
    clearHistory: "Clear history",
    confirmClearTitle: "Clear history?",
    deleteEntry: "Delete entry",
    empty: "No entries found",
    languageLabel: "Language",
    loading: "Loading more entries...",
    noRecentlyClosed: "No recently closed entries",
    openTab: "Open tab",
    restoreSession: "Restore session",
    recentlyClosed: "Recently closed",
    searchPlaceholder: "Search history...",
    switchTheme: "Switch theme",
    today: "Today",
    yesterday: "Yesterday",
    tabs: count => `${count} ${count === 1 ? "tab" : "tabs"}`,
    confirmClear: "Do you really want to clear the entire history?"
  },
  de: {
    appTitle: "Verlauf",
    allTab: "Alles",
    cancel: "Abbrechen",
    clearHistory: "Verlauf löschen",
    confirmClearTitle: "Verlauf löschen?",
    deleteEntry: "Eintrag löschen",
    empty: "Keine Einträge gefunden",
    languageLabel: "Sprache",
    loading: "Weitere Einträge werden geladen...",
    noRecentlyClosed: "Keine zuletzt geschlossenen Einträge",
    openTab: "Tab öffnen",
    restoreSession: "Session wiederherstellen",
    recentlyClosed: "Zuletzt geschlossen",
    searchPlaceholder: "Verlauf durchsuchen...",
    switchTheme: "Theme wechseln",
    today: "Heute",
    yesterday: "Gestern",
    tabs: count => `${count} ${count === 1 ? "Tab" : "Tabs"}`,
    confirmClear: "Möchtest du wirklich den gesamten Verlauf löschen?"
  }
};

let currentQuery = "";
let currentItems = [];
let recentlyClosedSessions = [];
let renderedCount = 0;
let currentLanguage = "en";
let currentTheme = "dark";
let activeTab = "all";
let lastFocusedElement = null;

const getStoredPreference = key => {
  const value = localStorage.getItem(key);

  return value === "system" ? null : value;
};

const getSystemLanguage = () =>
  navigator.language.toLowerCase().startsWith("de") ? "de" : "en";

const getSystemTheme = () =>
  matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

const t = key => translations[currentLanguage][key];

const applyTheme = theme => {
  document.documentElement.dataset.theme = theme;
  currentTheme = theme;
  themeIcon.textContent = theme === "dark" ? "☾" : "☀";
};

const translateWithin = root => {
  root.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });

  root.querySelectorAll("[data-i18n-title]").forEach(element => {
    element.title = t(element.dataset.i18nTitle);
  });

  root.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
    element.setAttribute(
      "aria-label",
      t(element.dataset.i18nAriaLabel)
    );
  });
};

const applyTranslations = () => {
  document.documentElement.lang = currentLanguage;
  document.title = t("appTitle");
  translateWithin(document);
};

const applyPreferences = () => {
  const storedTheme = getStoredPreference(themeStorageKey);
  const storedLanguage = getStoredPreference(languageStorageKey);

  currentLanguage = storedLanguage || getSystemLanguage();
  languageSelect.value = currentLanguage;

  applyTheme(storedTheme || getSystemTheme());
  applyTranslations();
};

const renderEmptyMessage = message => {
  const emptyContent = emptyTemplate.content.cloneNode(true);
  const title = emptyContent.querySelector("[data-i18n]");

  if (title) {
    title.textContent = message;
  }

  return emptyContent;
};

const setActiveTab = tab => {
  activeTab = tab;

  tabButtons.forEach(button => {
    const isActive = button.dataset.tab === tab;

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  allPanel.hidden = tab !== "all";
  recentlyClosedPanel.hidden = tab !== "recent";
  loadingElement.style.display = "none";

  if (tab === "recent") {
    renderRecentlyClosed();
    return;
  }

  loadHistory();
};

const openConfirmDialog = () => {
  lastFocusedElement = document.activeElement;
  confirmOverlay.hidden = false;
  confirmCancelButton.focus();
};

const closeConfirmDialog = () => {
  confirmOverlay.hidden = true;

  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
};

const formatDateKey = date => {
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return t("today");
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return t("yesterday");
  }

  return date.toLocaleDateString(currentLanguage === "de" ? "de-DE" : "en-US", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

const formatTime = date => date.toLocaleTimeString(
  currentLanguage === "de" ? "de-DE" : "en-US",
  {
  hour: "2-digit",
  minute: "2-digit"
  }
);

const getHostname = url => {
  if (!url) {
    return "";
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  }
  catch {
    return url;
  }
};

const getFaviconUrl = url =>
  "https://www.google.com/s2/favicons?domain=" +
  encodeURIComponent(url || "") +
  "&sz=64";

const createFavicon = url => {
  const favicon = document.createElement("div");
  favicon.className = "favicon";

  const faviconImage = document.createElement("img");
  faviconImage.src = getFaviconUrl(url);

  favicon.appendChild(faviconImage);

  return favicon;
};

const getTabDetails = tab => {
  const url = tab.url || tab.pendingUrl || "";

  return {
    title: tab.title || url || t("recentlyClosed"),
    url,
    subtitle: getHostname(url)
  };
};

const createEntry = item => {
  const date = new Date(item.lastVisitTime);

  const link = document.createElement("a");

  link.className = "entry";
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.title = `${item.title || item.url}\n${item.url}`;

  const favicon = createFavicon(item.url);

  const content = document.createElement("div");
  content.className = "content";

  const time = document.createElement("div");
  time.className = "time";
  time.textContent = formatTime(date);

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = item.title || item.url;

  const url = document.createElement("div");
  url.className = "url";
  url.textContent = getHostname(item.url);

  content.append(title, url);

  const deleteButton = document.createElement("button");

  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.title = t("deleteEntry");
  deleteButton.textContent = "✕";

  deleteButton.addEventListener("click", async event => {
    event.preventDefault();
    event.stopPropagation();

    await chrome.history.deleteUrl({
      url: item.url
    });

    link.remove();
  });

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.append(time, deleteButton);

  link.append(favicon, content, meta);

  return {
    element: link,
    dateKey: formatDateKey(date)
  };
};

const getRecentlyClosedItemDetails = session => {
  if (session.tab) {
    const tab = getTabDetails(session.tab);

    return {
      sessionId: session.tab.sessionId,
      title: tab.title,
      url: tab.url,
      subtitle: tab.subtitle,
      lastModified: session.lastModified
    };
  }

  const tabs = session.window?.tabs || [];
  const activeWindowTab =
    tabs.find(tab => tab.active && (tab.url || tab.pendingUrl)) ||
    tabs.find(tab => tab.url || tab.pendingUrl) ||
    tabs[0];

  if (!activeWindowTab) {
    return null;
  }

  const tab = getTabDetails(activeWindowTab);

  return {
    sessionId: session.window.sessionId,
    title: tab.title,
    url: tab.url,
    subtitle: t("tabs")(tabs.length),
    lastModified: session.lastModified
  };
};

const restoreRecentlyClosedSession = async sessionId => {
  try {
    if (sessionId) {
      await chrome.sessions.restore(sessionId);
    }
    else {
      await chrome.sessions.restore();
    }
  }
  catch (error) {
    console.warn("Could not restore recently closed session.", error);
  }

  loadRecentlyClosed();
};

const createRecentTabRow = tab => {
  const item = getTabDetails(tab);
  const link = document.createElement("a");

  link.className = "recent-child";
  link.href = item.url || "#";
  link.target = "_blank";
  link.rel = "noreferrer";
  link.title = `${item.title}\n${item.url}`;

  if (!item.url) {
    link.removeAttribute("href");
  }

  const content = document.createElement("div");
  content.className = "content";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = item.title;

  const url = document.createElement("div");
  url.className = "url";
  url.textContent = item.subtitle;

  content.append(title, url);
  link.append(createFavicon(item.url), content);

  return link;
};

const createRecentlyClosedGroup = session => {
  const item = getRecentlyClosedItemDetails(session);
  const tabs = session.window?.tabs || [];

  if (!item || tabs.length <= 1) {
    return null;
  }

  const details = document.createElement("details");
  details.className = "recent-group";

  const summary = document.createElement("summary");
  summary.className = "entry recent-entry recent-summary";
  summary.title = `${item.title}\n${item.url}`;

  const chevron = document.createElement("span");
  chevron.className = "chevron";
  chevron.setAttribute("aria-hidden", "true");

  const content = document.createElement("div");
  content.className = "content";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = item.title;

  const subtitle = document.createElement("div");
  subtitle.className = "url";
  subtitle.textContent = item.subtitle;

  const meta = document.createElement("div");
  meta.className = "meta";

  const time = document.createElement("div");
  time.className = "time";
  time.textContent = item.lastModified
    ? formatTime(new Date(item.lastModified * 1000))
    : "";

  const restoreButton = document.createElement("button");
  restoreButton.className = "restore-button";
  restoreButton.type = "button";
  restoreButton.title = t("restoreSession");
  restoreButton.textContent = "↺";

  restoreButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    restoreRecentlyClosedSession(item.sessionId);
  });

  content.append(title, subtitle);
  meta.append(time, restoreButton);
  summary.append(chevron, createFavicon(item.url), content, meta);

  const children = document.createElement("div");
  children.className = "recent-children";

  tabs
    .filter(tab => tab.url || tab.pendingUrl || tab.title)
    .forEach(tab => {
      children.appendChild(createRecentTabRow(tab));
    });

  details.append(summary, children);

  return details;
};

const createRecentlyClosedEntry = session => {
  if (session.window?.tabs?.length > 1) {
    return createRecentlyClosedGroup(session);
  }

  const item = getRecentlyClosedItemDetails(session);

  if (!item) {
    return null;
  }

  const button = document.createElement("button");
  button.className = "entry recent-entry";
  button.type = "button";
  button.title = `${item.title}\n${item.url}`;

  const content = document.createElement("div");
  content.className = "content";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = item.title;

  const url = document.createElement("div");
  url.className = "url";
  url.textContent = item.subtitle;

  const meta = document.createElement("div");
  meta.className = "meta";

  const time = document.createElement("div");
  time.className = "time";
  time.textContent = item.lastModified
    ? formatTime(new Date(item.lastModified * 1000))
    : "";

  content.append(title, url);
  meta.appendChild(time);
  button.append(createFavicon(item.url), content, meta);

  button.addEventListener("click", () => {
    restoreRecentlyClosedSession(item.sessionId);
  });

  return button;
};

const sessionMatchesQuery = session => {
  if (!currentQuery) {
    return true;
  }

  const item = getRecentlyClosedItemDetails(session);

  if (!item) {
    return false;
  }

  const query = currentQuery.toLowerCase();
  const tabs = session.window?.tabs || [];
  const tabMatches = tabs.some(tab => {
    const item = getTabDetails(tab);

    return [
      item.title,
      item.url,
      item.subtitle
    ].some(value => (value || "").toLowerCase().includes(query));
  });

  return tabMatches || [
    item.title,
    item.url,
    item.subtitle
  ].some(value => (value || "").toLowerCase().includes(query));
};

const renderRecentlyClosed = () => {
  recentlyClosedEntries.innerHTML = "";

  const entries = recentlyClosedSessions
    .filter(sessionMatchesQuery)
    .map(createRecentlyClosedEntry)
    .filter(Boolean);

  if (entries.length === 0) {
    recentlyClosedEntries.appendChild(
      renderEmptyMessage(t("noRecentlyClosed"))
    );
    return;
  }

  recentlyClosedEntries.append(...entries);
};

const loadRecentlyClosed = () => {
  chrome.sessions.getRecentlyClosed(
    {
      maxResults: 25
    },
    sessions => {
      recentlyClosedSessions = sessions;
      renderRecentlyClosed();
    }
  );
};

const ensureSection = dateKey => {
  let section = historyListElement.querySelector(
    `[data-date="${CSS.escape(dateKey)}"]`
  );

  if (section) {
    return section.querySelector(".entries");
  }

  section = document.createElement("section");
  section.className = "section";
  section.dataset.date = dateKey;

  const title = document.createElement("h2");
  title.className = "section-title";
  title.textContent = dateKey;

  const entries = document.createElement("div");
  entries.className = "entries";

  section.append(title, entries);
  historyListElement.appendChild(section);

  return entries;
};

const renderNextPage = () => {
  const nextItems = currentItems.slice(
    renderedCount,
    renderedCount + pageSize
  );

  for (const item of nextItems) {
    const entry = createEntry(item);
    const section = ensureSection(entry.dateKey);

    section.appendChild(entry.element);
  }

  renderedCount += nextItems.length;

  loadingElement.style.display = "none";
};

const clearHistory = () => {
  historyListElement.innerHTML = "";
  renderedCount = 0;
};

const renderEmpty = () => {
  clearHistory();
  historyListElement.appendChild(renderEmptyMessage(t("empty")));
  loadingElement.style.display = "none";
};

const loadHistory = () => {
  chrome.history.search(
    {
      text: currentQuery,
      startTime: 0,
      maxResults: 100000
    },
    items => {
      currentItems = items.sort(
        (a, b) => b.lastVisitTime - a.lastVisitTime
      );

      clearHistory();

      if (currentItems.length === 0) {
        renderEmpty();
        return;
      }

      renderNextPage();
    }
  );
};

let debounceId;

searchInput.addEventListener("input", () => {
  clearTimeout(debounceId);

  debounceId = setTimeout(() => {
    currentQuery = searchInput.value.trim();

    if (activeTab === "recent") {
      renderRecentlyClosed();
      return;
    }

    loadHistory();
  }, 180);
});

themeToggle.addEventListener("click", () => {
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  localStorage.setItem(themeStorageKey, nextTheme);
  applyTheme(nextTheme);
});

languageSelect.addEventListener("change", () => {
  localStorage.setItem(languageStorageKey, languageSelect.value);
  currentLanguage = languageSelect.value;
  applyTranslations();
  loadRecentlyClosed();
  loadHistory();
});

tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
  });
});

historyElement.addEventListener("scroll", () => {
  if (activeTab !== "all") {
    return;
  }

  const distanceToBottom =
    historyElement.scrollHeight -
    historyElement.scrollTop -
    historyElement.clientHeight;

  if (
    distanceToBottom < 120 &&
    renderedCount < currentItems.length
  ) {
    renderNextPage();
  }
});

matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
  if (!getStoredPreference(themeStorageKey)) {
    applyTheme(getSystemTheme());
  }
});

applyPreferences();
setActiveTab("all");
loadRecentlyClosed();


clearHistoryButton.addEventListener("click", async () => {
  openConfirmDialog();
});

confirmCancelButton.addEventListener("click", () => {
  closeConfirmDialog();
});

confirmAcceptButton.addEventListener("click", async () => {
  await chrome.history.deleteAll();

  currentItems = [];
  renderEmpty();
  closeConfirmDialog();
});

confirmOverlay.addEventListener("click", event => {
  if (event.target === confirmOverlay) {
    closeConfirmDialog();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !confirmOverlay.hidden) {
    closeConfirmDialog();
  }
});
