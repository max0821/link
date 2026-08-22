const projects = Object.freeze([
  {
    id: "lootsu",
    number: "01",
    kicker: "TAIWAN FOLK ARCADE",
    title: "擲筊 × 爐主",
    description: "擲出聖筊、累積香火，替你的縣市與神明衝上全台排行。",
    image: "./assets/lootsu-og.png",
    href: "https://lootsu.9sweb.com/",
    cta: "進廟擲筊",
    tags: ["免下載", "全台排行", "手機直玩"],
    accent: "#ffb938",
    accentRgb: "255, 87, 39",
  },
  {
    id: "maxabounce",
    number: "02",
    kicker: "DEEP SPACE ARCADE",
    title: "MaxAbounce",
    description: "擊碎磚陣、測繪星球、解鎖曲速，把未知星域變成你的疆界。",
    image: "./assets/maxabounce-og.png",
    href: "https://maxabounce.9sweb.com/",
    cta: "啟航打磚",
    tags: ["免下載", "星圖征服", "手機直玩"],
    accent: "#57d5ff",
    accentRgb: "32, 154, 255",
  },
  {
    id: "web-design",
    number: "03",
    kicker: "OPEN SOURCE · AGENT SKILL",
    title: "Web Design Skill",
    description: "把視覺方向、素材規劃、精準切版與 render-based QA，變成一套可安裝的 Agent Skill。",
    image: "./assets/web-design-skill.png",
    href: "https://github.com/max0821/web-design-skill",
    cta: "查看 Skill",
    tags: ["v1.2.1", "MIT", "GitHub"],
    accent: "#c9ff63",
    accentRgb: "201, 255, 99",
  },
]);

const root = document.querySelector(".arcade");
const stage = document.querySelector(".game-stage");
const stageShell = document.querySelector(".stage-shell");
const projectImages = [...document.querySelectorAll("[data-project-image]")];
const projectKicker = document.querySelector(".game-kicker");
const projectTitle = document.querySelector(".stage-copy h2");
const projectDescription = document.querySelector(".game-description");
const projectTags = document.querySelector(".tag-row");
const projectLink = document.querySelector(".play-button");
const projectLinkLabel = projectLink.querySelector("span");
const projectNumber = document.querySelector(".game-number");
const edgeLabel = document.querySelector(".edge-label");
const stageCopy = document.querySelector(".stage-copy");
const tabs = [...document.querySelectorAll(".world-tab")];

let activeIndex = 0;
let pendingIndex = null;
let selectionVersion = 0;
let touchStartX = null;

function normalizeIndex(index) {
  return (index + projects.length) % projects.length;
}

function waitForImage(image) {
  const loaded = image.complete
    ? image.naturalWidth > 0
      ? Promise.resolve()
      : Promise.reject(new Error(`Image failed to load: ${image.currentSrc || image.src}`))
    : new Promise((resolve, reject) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", () => reject(new Error(`Image failed to load: ${image.src}`)), { once: true });
      });

  return loaded.then(async () => {
    if (typeof image.decode !== "function") return;
    try {
      await image.decode();
    } catch (error) {
      if (!image.complete || image.naturalWidth === 0) throw error;
    }
  });
}

const imageReady = projects.map((_, index) =>
  waitForImage(projectImages[index]).then(
    () => true,
    () => false,
  ),
);

function restartProjectMotion(activeImage) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const animatedElements = [stageShell, activeImage, stageCopy];
  animatedElements.forEach((element) => {
    element.style.animation = "none";
  });
  void stageShell.offsetWidth;
  animatedElements.forEach((element) => {
    element.style.removeProperty("animation");
  });
}

function setPendingProject(index) {
  pendingIndex = index;
  stage.setAttribute("aria-busy", "true");
  tabs.forEach((tab, tabIndex) => {
    tab.classList.toggle("pending", tabIndex === index && tabIndex !== activeIndex);
  });
}

function clearPendingProject() {
  pendingIndex = null;
  stage.setAttribute("aria-busy", "false");
  tabs.forEach((tab) => tab.classList.remove("pending"));
}

function commitProject(nextIndex, animate = true) {
  activeIndex = normalizeIndex(nextIndex);
  const project = projects[activeIndex];
  const activeImage = projectImages[activeIndex];

  root.dataset.world = project.id;
  root.style.setProperty("--accent", project.accent);
  root.style.setProperty("--accent-rgb", project.accentRgb);
  stageShell.dataset.projectTitle = project.title;

  tabs.forEach((tab, index) => {
    const isActive = index === activeIndex;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });

  projectImages.forEach((image, index) => {
    const isActive = index === activeIndex;
    image.classList.toggle("active", isActive);
    image.setAttribute("aria-hidden", String(!isActive));
  });
  projectKicker.textContent = project.kicker;
  projectTitle.textContent = project.title;
  projectDescription.textContent = project.description;
  projectNumber.textContent = `${project.number} / ${String(projects.length).padStart(2, "0")}`;
  edgeLabel.textContent = `9SWEB / ${project.number}`;

  projectTags.replaceChildren(
    ...project.tags.map((tag) => {
      const item = document.createElement("span");
      item.textContent = tag;
      return item;
    }),
  );

  projectLink.href = project.href;
  projectLinkLabel.textContent = project.cta;

  clearPendingProject();
  if (animate) restartProjectMotion(activeImage);
}

async function selectProject(nextIndex) {
  const targetIndex = normalizeIndex(nextIndex);
  const requestVersion = ++selectionVersion;

  if (targetIndex === activeIndex) {
    clearPendingProject();
    return;
  }

  setPendingProject(targetIndex);

  const isReady = await imageReady[targetIndex];
  if (!isReady) {
    if (requestVersion === selectionVersion) clearPendingProject();
    return;
  }

  if (requestVersion !== selectionVersion) return;
  commitProject(targetIndex);
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    selectProject(Number(tab.dataset.project));
  });
});

window.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  const navigationIndex = pendingIndex ?? activeIndex;
  if (event.key === "ArrowLeft") selectProject(navigationIndex - 1);
  if (event.key === "ArrowRight") selectProject(navigationIndex + 1);
});

stage.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const bounds = stage.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
  stage.style.setProperty("--tilt-x", `${-y * 3.5}deg`);
  stage.style.setProperty("--tilt-y", `${x * 4.5}deg`);
});

stage.addEventListener("pointerleave", () => {
  stage.style.setProperty("--tilt-x", "0deg");
  stage.style.setProperty("--tilt-y", "0deg");
});

stage.addEventListener("touchstart", (event) => {
  touchStartX = event.touches[0]?.clientX ?? null;
}, { passive: true });

stage.addEventListener("touchend", (event) => {
  if (touchStartX === null) return;
  const endX = event.changedTouches[0]?.clientX ?? touchStartX;
  const delta = endX - touchStartX;
  if (Math.abs(delta) > 48) {
    const navigationIndex = pendingIndex ?? activeIndex;
    selectProject(delta < 0 ? navigationIndex + 1 : navigationIndex - 1);
  }
  touchStartX = null;
}, { passive: true });

commitProject(0, false);
