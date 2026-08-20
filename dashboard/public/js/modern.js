document.addEventListener("DOMContentLoaded", () => {
  const button = document.querySelector("[data-sidebar-toggle]");

  if (!button) return;

  button.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });
});
