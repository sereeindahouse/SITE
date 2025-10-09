document.addEventListener("click", function (e) {
  const el = e.target.closest && e.target.closest(".header-search-icon");
  if (!el) return;
  e.preventDefault();
  // prompt for username to search
  const term = window.prompt("Enter username to search (e.g. saraa):");
  if (!term) return; // cancelled or empty
  const q = "/search?term=" + encodeURIComponent(term.trim());
  window.location.href = q;
});