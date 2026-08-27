const trackingDefaults = Object.freeze({
  section: "project-index",
  position: "1",
});

function pushLinkClick(link) {
  const data = link?.dataset;
  if (!data?.trackId) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "link_click",
    link_id: data.trackId,
    link_name: data.trackName || link.textContent.trim(),
    link_url: link.href,
    link_type: data.trackType || "external",
    link_position: data.trackPosition || trackingDefaults.position,
    section_name: data.trackSection || trackingDefaults.section,
  });
}
window.dataLayer = window.dataLayer || [];

document.addEventListener("click", (event) => {
  const link = event.target instanceof Element
    ? event.target.closest("a[data-track-id]")
    : null;
  pushLinkClick(link);
});

const revealItems = [...document.querySelectorAll(".reveal")];

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8%" });

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = String(Math.min(index * 45, 220)) + "ms";
    revealObserver.observe(item);
  });
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}
const sections = [...document.querySelectorAll("main section[id]")];
const navLinks = [...document.querySelectorAll(".site-nav a")];

if ("IntersectionObserver" in window && sections.length && navLinks.length) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => link.classList.toggle("is-active", link.hash === "#" + entry.target.id));
    });
  }, { rootMargin: "-35% 0px -55%", threshold: 0 });
  sections.forEach((section) => sectionObserver.observe(section));
}
