// Match the current file to the correct navigation pill.
(function setActiveNavPill() {
  // Stop early if a page ever loads without the shared navigation.
  const links = document.querySelectorAll(".nav-link.nav-pill[data-nav]");
  if (!links.length) return;

  // Treat the old home.html route as Home while any cached links are still around.
  const file = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const activeKey = file === "index.html" || file === "home.html"
    ? "home"
    : file === "projects.html"
      ? "projects"
      : file === "resume.html"
        ? "resume"
        : null;

  // The visible pill and aria-current value always move together.
  links.forEach((link) => {
    const isActive = link.dataset.nav === activeKey;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
})();
