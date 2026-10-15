const root = document.querySelector("[data-catalog]");
if (!(root instanceof HTMLElement)) {
  // projects page only
} else {
  const search = root.querySelector("[data-filter-search]");
  const shownNodes = root.querySelectorAll("[data-shown]");
  const empty = root.querySelector("[data-empty]");
  const cards = [...root.querySelectorAll("[data-project]")];

  const selects = [...root.querySelectorAll("select[data-filter]")];

  function read(name: string): string {
    const select = selects.find((item) => item instanceof HTMLSelectElement && item.dataset.filter === name);
    return select instanceof HTMLSelectElement ? select.value : "";
  }

  function apply() {
    const query = search instanceof HTMLInputElement ? search.value.trim().toLowerCase() : "";
    const kind = read("kind");
    const moduleId = read("module");
    const group = read("group");
    const level = read("level");
    const language = read("language");
    const status = read("status");
    let visible = 0;

    for (const card of cards) {
      if (!(card instanceof HTMLElement)) continue;
      const matches =
        (!kind || card.dataset.kind === kind) &&
        (!moduleId || card.dataset.module === moduleId) &&
        (!group || card.dataset.group === group) &&
        (!level || card.dataset.level === level) &&
        (!language || card.dataset.language === language) &&
        (!status || card.dataset.status === status) &&
        (!query || (card.dataset.search || "").includes(query));
      card.hidden = !matches;
      if (matches) visible += 1;
    }

    for (const node of shownNodes) node.textContent = String(visible);
    if (empty instanceof HTMLElement) empty.hidden = visible !== 0;

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (kind) params.set("kind", kind);
    if (moduleId) params.set("module", moduleId);
    if (group) params.set("group", group);
    if (level) params.set("level", level);
    if (language) params.set("language", language);
    if (status) params.set("status", status);
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  }

  function fillFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (search instanceof HTMLInputElement && params.get("q")) search.value = params.get("q") || "";
    for (const select of selects) {
      if (!(select instanceof HTMLSelectElement)) continue;
      const key = select.dataset.filter;
      if (!key) continue;
      const value = params.get(key);
      if (value && [...select.options].some((option) => option.value === value)) select.value = value;
    }
  }

  fillFromUrl();
  apply();
  root.addEventListener("input", apply);
  root.addEventListener("change", apply);
  root.querySelector("[data-reset]")?.addEventListener("click", () => {
    if (search instanceof HTMLInputElement) search.value = "";
    for (const select of selects) {
      if (select instanceof HTMLSelectElement) select.value = "";
    }
    apply();
  });
}
