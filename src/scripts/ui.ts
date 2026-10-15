const root = document.documentElement;
const THEME = "tuanzi-theme";
const LANG = "tuanzi-lang";
const DISPLAY = "tuanzi-display";

function setTheme(theme: string) {
  root.dataset.theme = theme === "dark" ? "dark" : "light";
}

function setLang(lang: string) {
  root.lang = lang === "en" ? "en" : "zh";
  document.dispatchEvent(new CustomEvent("academy:lang"));
}

function setDisplay(mode: string) {
  if (mode === "project") root.dataset.display = "project";
  else delete root.dataset.display;
  document.dispatchEvent(new CustomEvent("academy:display"));
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest("[data-action]");
  if (!(button instanceof HTMLButtonElement)) return;
  const action = button.dataset.action;
  if (action === "theme") {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME, next);
    setTheme(next);
  }
  if (action === "lang") {
    const next = root.lang === "en" ? "zh" : "en";
    localStorage.setItem(LANG, next);
    setLang(next);
  }
  if (action === "display") {
    const next = root.dataset.display === "project" ? "read" : "project";
    localStorage.setItem(DISPLAY, next);
    setDisplay(next);
  }
});

const form = document.querySelector("[data-feedback]");
if (form instanceof HTMLFormElement) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const want = String(data.get("want") || "").trim();
    const error = form.querySelector("[data-feedback-error]");
    if (!want) {
      if (error instanceof HTMLElement) error.hidden = false;
      const field = form.querySelector("[name=want]");
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    if (error instanceof HTMLElement) error.hidden = true;
    const name = String(data.get("name") || "").trim();
    const role = String(data.get("role") || "").trim();
    const note = String(data.get("note") || "").trim();
    const english = root.lang === "en";
    const subject = english ? "Tuanzi AI Academy: what I want to learn" : "团子 AI 课堂：想学的内容";
    const lines = [
      english ? `Name: ${name || "-"}` : `称呼：${name || "—"}`,
      english ? `Role: ${role || "-"}` : `身份：${role || "—"}`,
      english ? `I want to learn:\n${want}` : `想学：\n${want}`,
      note ? (english ? `Note:\n${note}` : `补充：\n${note}`) : "",
    ].filter(Boolean);
    const email = form.dataset.email || "";
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n\n"))}`;
  });
}
