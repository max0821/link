const projects = Object.freeze([
  {
    id: "ai-notes",
    number: "01",
    label: "LATEST NOTES",
    kicker: "BUILD IN PUBLIC · AI NOTES",
    title: "AI心得",
    description: "把我實際用 ChatGPT 做 Skill、做免費 Social Link 的過程，整理成可以直接照著做的方法。",
    // 固定的 AI 心得主圖；文章縮圖只由 insights 使用，不會反過來決定主圖。
    image: "./assets/ai-notes-cover.svg?v=20260823-2",
    href: "#",
    cta: "查看心得",
    tags: ["ChatGPT", "實作筆記", "免費分享"],
    insights: [
      {
        date: "2026.08.25",
        dateISO: "2026-08-25",
        meta: "01 / PUBLIC BENCHMARK",
        title: "ChatGPT Sites 效能實測報告",
        description: "官方條件、實測配置與 Hosting 能力的公開評測",
        image: "./05/assets/hero-observatory-v2.png",
        href: "https://link.9sweb.com/05/",
        trackId: "ai-chatgpt-sites-benchmark",
        trackType: "benchmark",
      },
      {
        date: "2026.08.23",
        dateISO: "2026-08-23",
        meta: "02 / GA4 + GTM",
        title: "用 AI 做 GA4 / GTM 成長報告",
        description: "把唯讀數據整理成可驗證的每日成長任務",
        image: "./assets/og.png",
        href: "https://github.com/max0821/ga4-gtm-analytics-health",
        trackId: "ai-ga-growth-report",
        trackType: "analytics",
      },
      {
        date: "2026.08.22",
        dateISO: "2026-08-22",
        meta: "03 / SOCIAL LINK",
        title: "免費客製自己的 Social Linktree",
        description: "GitHub 免費免主機，ChatGPT 連動後輕鬆搞定",
        image: "./assets/ai-social-linktree-thread.png",
        href: "https://www.threads.com/share/FalBiuCAX/",
        trackId: "ai-social-linktree",
        trackType: "social",
      },
      {
        date: "2026.08.22",
        dateISO: "2026-08-22",
        meta: "04 / AGENT SKILL",
        title: "Web Design Skill",
        description: "說明及安裝方式",
        image: "./assets/web-design-skill.png",
        href: "https://github.com/max0821/web-design-skill",
        trackId: "ai-web-design-skill",
        trackType: "article",
      },
    ],
    accent: "#c9ff63",
    accentRgb: "201, 255, 99",
  },
  {
    id: "lootsu",
    number: "02",
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
    number: "03",
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
]);

const root = document.querySelector(".arcade");
const stage = document.querySelector(".game-stage");
const stageShell = document.querySelector(".stage-shell");
const projectImages = [...document.querySelectorAll("[data-project-image]")];
const secondaryInsightImage = document.querySelector(".insight-art-secondary");
const projectKicker = document.querySelector(".game-kicker");
const projectTitle = document.querySelector(".stage-copy h2");
const projectDescription = document.querySelector(".game-description");
const projectTags = document.querySelector(".tag-row");
const insightList = document.querySelector(".insight-list");
const projectLink = document.querySelector(".play-button");
const projectLinkLabel = projectLink.querySelector("span");
const projectNumber = document.querySelector(".game-number");
const nowPlayingLabel = document.querySelector(".now-playing-label");
const edgeLabel = document.querySelector(".edge-label");
const stageCopy = document.querySelector(".stage-copy");
const tabs = [...document.querySelectorAll(".world-tab")];

const trackingDefaults = Object.freeze({
  section: "project-index",
  position: "1",
});

function setTrackingAttributes(element, attributes) {
  if (!element) return;
  const values = {
    id: attributes.id,
    name: attributes.name,
    type: attributes.type,
    position: attributes.position ?? trackingDefaults.position,
    section: attributes.section ?? trackingDefaults.section,
  };
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      element.dataset[`track${key[0].toUpperCase()}${key.slice(1)}`] = String(value);
    }
  });
}

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

const imageReady = projects.map((project, index) => {
  const dependencies = project.insights
    ? [projectImages[index], secondaryInsightImage]
    : [projectImages[index]];

  return Promise.all(dependencies.map(waitForImage)).then(
    () => true,
    () => false,
  );
});

function restartProjectMotion(activeImage) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const animatedElements = [stageShell, activeImage, stageCopy];
  if (projects[activeIndex].insights) animatedElements.push(secondaryInsightImage);
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
  nowPlayingLabel.textContent = project.label ?? "FEATURED PROJECT";
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
  if (project.href.startsWith("http")) {
    projectLink.target = "_blank";
    projectLink.rel = "noopener noreferrer";
  } else {
    projectLink.removeAttribute("target");
    projectLink.removeAttribute("rel");
  }
  setTrackingAttributes(projectLink, {
    id: `project-${project.id}`,
    name: project.title,
    type: "project",
    position: project.number,
    section: project.id,
  });

  const hasInsights = Array.isArray(project.insights) && project.insights.length > 0;
  projectTags.hidden = hasInsights;
  projectLink.hidden = hasInsights;
  insightList.hidden = !hasInsights;

  if (hasInsights) {
    insightList.replaceChildren(
      ...project.insights.map((insight) => {
        const link = document.createElement("a");
        link.className = "insight-card";
        link.href = insight.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        setTrackingAttributes(link, {
          id: insight.trackId || `${project.id}-${insight.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
          name: insight.title,
          type: insight.trackType || "article",
          position: String(project.insights.indexOf(insight) + 1),
          section: project.id,
        });

        const thumbnail = document.createElement("img");
        thumbnail.className = "insight-card-image";
        thumbnail.src = insight.image;
        thumbnail.alt = "";

        const copy = document.createElement("span");
        copy.className = "insight-card-copy";

        const meta = document.createElement("small");
        const published = document.createElement("time");
        published.dateTime = insight.dateISO;
        published.textContent = insight.date;
        meta.append(published, ` · ${insight.meta}`);

        const title = document.createElement("strong");
        title.textContent = insight.title;

        const description = document.createElement("span");
        description.textContent = insight.description;

        const arrow = document.createElement("i");
        arrow.textContent = "↗";
        arrow.setAttribute("aria-hidden", "true");

        copy.append(meta, title, description);
        link.append(thumbnail, copy, arrow);
        return link;
      }),
    );
  } else {
    insightList.replaceChildren();
  }

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
