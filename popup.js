const historyElement = document.querySelector("#history");
const scrollContainer = historyElement;
const searchInput = document.querySelector("#search");
const loadingElement = document.querySelector("#loading");
const clearHistoryButton = document.querySelector("#clear-history");
const emptyTemplate = document.querySelector("#empty-template");

const pageSize = 150;

let currentQuery = "";
let currentItems = [];
let renderedCount = 0;

const formatDateKey = date => {
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Heute";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Gestern";
  }

  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

const formatTime = date => date.toLocaleTimeString("de-DE", {
  hour: "2-digit",
  minute: "2-digit"
});

const getHostname = url => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  }
  catch {
    return url;
  }
};

const createEntry = item => {
  const date = new Date(item.lastVisitTime);

  const link = document.createElement("a");

  link.className = "entry";
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.title = `${item.title || item.url}\n${item.url}`;

  const favicon = document.createElement("div");
  favicon.className = "favicon";

  const faviconImage = document.createElement("img");
  faviconImage.src =
    "https://www.google.com/s2/favicons?domain=" +
    encodeURIComponent(item.url) +
    "&sz=64";

  favicon.appendChild(faviconImage);

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
  deleteButton.title = "Eintrag löschen";
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

const ensureSection = dateKey => {
  let section = document.querySelector(`[data-date="${CSS.escape(dateKey)}"]`);

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
  historyElement.appendChild(section);

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
  historyElement.innerHTML = "";
  renderedCount = 0;
};

const renderEmpty = () => {
  clearHistory();
  historyElement.appendChild(
    emptyTemplate.content.cloneNode(true)
  );
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
    loadHistory();
  }, 180);
});

historyElement.addEventListener("scroll", () => {
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

loadHistory();


clearHistoryButton.addEventListener("click", async () => {
  const confirmed = confirm(
    "Möchtest du wirklich den gesamten Verlauf löschen?"
  );

  if (!confirmed) {
    return;
  }

  await chrome.history.deleteAll();

  currentItems = [];
  renderEmpty();
});
