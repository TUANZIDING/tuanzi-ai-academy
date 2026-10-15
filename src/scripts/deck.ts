const root = document.documentElement;
const deck = document.querySelector("[data-deck]");
if (deck instanceof HTMLElement) {
  const slides = [...deck.querySelectorAll<HTMLElement>("[data-slide]")];
  const current = deck.querySelector("[data-slide-current]");
  const total = deck.querySelector("[data-slide-total]");
  let index = 0;
  if (total) total.textContent = String(slides.length);

  function show(next: number) {
    if (!slides.length) return;
    index = Math.max(0, Math.min(slides.length - 1, next));
    slides.forEach((slide, i) => {
      const on = i === index;
      slide.classList.toggle("is-on", on);
      slide.hidden = !on;
    });
    if (current) current.textContent = String(index + 1);
  }

  function exitRead() {
    localStorage.setItem("tuanzi-display", "read");
    delete root.dataset.display;
    document.dispatchEvent(new CustomEvent("academy:display"));
  }

  deck.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-deck-action]");
    if (!(button instanceof HTMLButtonElement)) return;
    const action = button.dataset.deckAction;
    if (action === "next") show(index + 1);
    if (action === "prev") show(index - 1);
    if (action === "exit") exitRead();
  });

  document.addEventListener("keydown", (event) => {
    if (root.dataset.display !== "project") return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      show(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      show(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      show(0);
    } else if (event.key === "End") {
      event.preventDefault();
      show(slides.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      exitRead();
    }
  });

  document.addEventListener("academy:display", () => {
    if (root.dataset.display === "project") deck.focus();
  });

  show(0);
  if (root.dataset.display === "project") deck.focus();
}
