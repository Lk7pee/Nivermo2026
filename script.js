"use strict";

const IMAGE_FILES = [
  "WhatsApp Image 2026-07-07 at 13.40.22 (1).jpeg",
  "WhatsApp Image 2026-07-07 at 13.40.22.jpeg",
  "WhatsApp Image 2026-07-07 at 13.40.23 (1).jpeg",
  "WhatsApp Image 2026-07-07 at 13.40.23 (2).jpeg",
  "WhatsApp Image 2026-07-07 at 13.40.23.jpeg",
  "WhatsApp Image 2026-07-07 at 13.40.24 (1).jpeg",
  "WhatsApp Image 2026-07-07 at 13.40.24.jpeg",
  "WhatsApp Image 2026-07-07 at 13.40.25 (1).jpeg",
  "WhatsApp Image 2026-07-07 at 13.40.25 (2).jpeg",
  "WhatsApp Image 2026-07-07 at 13.40.25.jpeg",
  "WhatsApp Image 2026-07-07 at 13.40.26.jpeg",
];

const IMAGE_EXTENSIONS = /\.(avif|webp|png|jpe?g|gif|bmp)$/i;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = {
  images: [],
  parallaxItems: [],
  activeModalCard: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

document.addEventListener("DOMContentLoaded", () => {
  initExperience();
  initReveals();
  initCapsule();
  initTyping();
  initRestart();
  initModal();

  loadMuseumImages().then((images) => {
    state.images = images;
    buildGallery(images);
    hydrateFavoriteCards(images);
    initParallax();
  });

  initMemorySky();
});

function initExperience() {
  const enterButton = $("#enterExperience");
  const museum = $("#museum");

  enterButton?.addEventListener("click", () => {
    document.body.classList.add("experience-open");
    museum?.removeAttribute("aria-hidden");
    window.scrollTo({ top: 0, behavior: "auto" });
  });
}

async function loadMuseumImages() {
  const listedImages = IMAGE_FILES.map((file) => normalizeImagePath(file));
  const discoveredImages = await discoverImagesFromFolder().catch(() => []);
  return uniquePaths([...listedImages, ...discoveredImages]).filter((path) =>
    IMAGE_EXTENSIONS.test(path)
  );
}

async function discoverImagesFromFolder() {
  const response = await fetch("img/", { cache: "no-store" });
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok || !contentType.includes("text/html")) {
    return [];
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  return $$("a[href]", doc)
    .map((link) => link.getAttribute("href") || "")
    .map((href) => {
      try {
        const url = new URL(href, response.url);
        const decodedPath = decodeURIComponent(url.pathname.replace(/\\/g, "/"));
        const marker = "/img/";
        const markerIndex = decodedPath.lastIndexOf(marker);
        return markerIndex >= 0 ? decodedPath.slice(markerIndex + 1) : decodedPath;
      } catch {
        return href;
      }
    })
    .filter((path) => IMAGE_EXTENSIONS.test(path))
    .map((path) => normalizeImagePath(path));
}

function normalizeImagePath(path) {
  const normalized = path.replace(/\\/g, "/").replace(/^\.?\//, "").trim();
  const withFolder = normalized.startsWith("img/") ? normalized : `img/${normalized}`;

  try {
    return encodeURI(decodeURIComponent(withFolder));
  } catch {
    return encodeURI(withFolder);
  }
}

function uniquePaths(paths) {
  return [...new Set(paths.filter(Boolean))];
}

function buildGallery(images) {
  const gallery = $("#livingGallery");
  const empty = $("#emptyGallery");

  if (!gallery) return;

  gallery.innerHTML = "";
  empty.hidden = images.length > 0;

  const fragment = document.createDocumentFragment();

  images.forEach((src, index) => {
    const figure = document.createElement("figure");
    const image = new Image();

    figure.className = "gallery-photo is-loading";
    figure.style.setProperty("--rotate", `${rotationFor(index)}deg`);
    figure.style.transitionDelay = `${Math.min(index * 28, 240)}ms`;

    image.src = src;
    image.alt = `Momento guardado ${index + 1}`;
    image.decoding = "async";
    image.loading = index < 3 ? "eager" : "lazy";

    image.addEventListener("load", () => {
      classifyImage(image, figure);
      state.parallaxItems.push(figure);
    });

    image.addEventListener("error", () => {
      figure.remove();
      empty.hidden = gallery.children.length > 0;
    });

    figure.append(image);
    fragment.append(figure);
  });

  gallery.append(fragment);
}

function classifyImage(image, host) {
  const width = image.naturalWidth || 1;
  const height = image.naturalHeight || 1;
  const ratio = width / height;
  const className = ratio > 1.12 ? "landscape" : ratio < 0.88 ? "portrait" : "square";

  host.classList.remove("is-loading", "landscape", "portrait", "square");
  host.classList.add(className);
  host.style.setProperty("--natural-ratio", `${width} / ${height}`);

  image.width = width;
  image.height = height;
  image.dataset.width = String(width);
  image.dataset.height = String(height);
  image.dataset.orientation = className;
}

function rotationFor(index) {
  const rotations = [-3.4, 2.2, -1.4, 3.1, -2.2, 1.5, -2.8, 2.7, -1, 1.9, -3];
  return rotations[index % rotations.length];
}

function hydrateFavoriteCards(images) {
  const cards = $$(".favorite-card");

  cards.forEach((card, index) => {
    const slot = $(".favorite-photo", card);
    const requestedIndex = Number.parseInt(card.dataset.photoIndex || `${index}`, 10);
    const imageSrc = images.length ? images[requestedIndex % images.length] : "";

    card.dataset.imageSrc = imageSrc;

    if (!slot || !imageSrc) return;

    const image = new Image();
    image.src = imageSrc;
    image.alt = "";
    image.decoding = "async";
    image.loading = "lazy";

    image.addEventListener("load", () => classifyImage(image, slot));
    slot.replaceChildren(image);
  });
}

function initModal() {
  const modal = $("#momentModal");
  const panel = $(".moment-modal__panel", modal);

  $$(".favorite-card").forEach((card) => {
    card.addEventListener("click", () => openMomentModal(card));
  });

  $$("[data-close-modal]", modal).forEach((control) => {
    control.addEventListener("click", closeMomentModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal?.classList.contains("is-open")) {
      closeMomentModal();
    }
  });

  panel?.addEventListener("click", (event) => event.stopPropagation());
}

function openMomentModal(card) {
  const modal = $("#momentModal");
  const panel = $(".moment-modal__panel", modal);
  const title = $(".favorite-card__content strong", card)?.textContent.trim() || "";
  const text = $(".favorite-card__content span:last-child", card)?.textContent.trim() || "";
  const number = $(".favorite-number", card)?.textContent.trim() || "";
  const imageSrc = card.dataset.imageSrc || "";
  const modalPhoto = $("#modalPhoto");
  const modalPhotoWrap = $("#modalPhotoWrap");

  state.activeModalCard = card;

  $("#modalTitle").textContent = title;
  $("#modalText").textContent = text;
  $("#modalNumber").textContent = number ? `Momento ${number}` : "";

  if (imageSrc) {
    modalPhoto.hidden = false;
    modalPhotoWrap.hidden = false;
    modalPhoto.src = imageSrc;
    modalPhoto.alt = title;
  } else {
    modalPhoto.removeAttribute("src");
    modalPhoto.hidden = true;
    modalPhotoWrap.hidden = true;
  }

  modal.classList.add("is-open");
  modal.removeAttribute("aria-hidden");
  document.body.classList.add("modal-open");

  requestAnimationFrame(() => {
    playModalExpansion(card, panel);
    panel.focus({ preventScroll: true });
  });
}

function playModalExpansion(card, panel) {
  if (!panel || prefersReducedMotion || typeof panel.animate !== "function") return;

  const cardRect = card.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const scaleX = Math.max(cardRect.width / panelRect.width, 0.24);
  const scaleY = Math.max(cardRect.height / panelRect.height, 0.18);
  const deltaX = cardRect.left + cardRect.width / 2 - (panelRect.left + panelRect.width / 2);
  const deltaY = cardRect.top + cardRect.height / 2 - (panelRect.top + panelRect.height / 2);

  panel.animate(
    [
      {
        opacity: 0.2,
        filter: "blur(10px)",
        transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
      },
      {
        opacity: 1,
        filter: "blur(0)",
        transform: "translate3d(0, 0, 0) scale(1)",
      },
    ],
    {
      duration: 430,
      easing: "cubic-bezier(0.2, 0.82, 0.2, 1)",
    }
  );
}

function closeMomentModal() {
  const modal = $("#momentModal");
  const panel = $(".moment-modal__panel", modal);

  modal?.classList.remove("is-open");
  modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (state.activeModalCard) {
    state.activeModalCard.focus({ preventScroll: true });
  }

  if (panel) {
    panel.scrollTop = 0;
  }
}

function initCapsule() {
  const scene = $("#capsuleScene");
  const button = $("#timeCapsule");
  const letter = $("#letterPanel");

  button?.addEventListener("click", () => {
    const isOpen = scene.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(isOpen));
    letter?.setAttribute("aria-hidden", String(!isOpen));
  });
}

function initTyping() {
  const target = $("#typingText");
  const phrases = $$("#lovePhrases li")
    .map((item) => item.textContent.trim())
    .filter(Boolean);

  if (!target || phrases.length === 0) return;

  if (prefersReducedMotion) {
    target.textContent = phrases[0];
    return;
  }

  let phraseIndex = 0;
  let charIndex = 0;

  const typePhrase = () => {
    const phrase = phrases[phraseIndex];
    target.classList.remove("is-fading");
    target.textContent = phrase.slice(0, charIndex);

    if (charIndex < phrase.length) {
      charIndex += 1;
      window.setTimeout(typePhrase, 58);
      return;
    }

    window.setTimeout(() => {
      target.classList.add("is-fading");

      window.setTimeout(() => {
        phraseIndex = (phraseIndex + 1) % phrases.length;
        charIndex = 0;
        target.textContent = "";
        target.classList.remove("is-fading");
        window.setTimeout(typePhrase, 180);
      }, 340);
    }, 1500);
  };

  typePhrase();
}

function initMemorySky() {
  const sky = $("#memorySky");
  const pop = $("#memoryPop");
  const memories = $$("#skyMemories li")
    .map((item) => item.textContent.trim())
    .filter(Boolean);

  if (!sky || !pop || memories.length === 0) return;

  for (let index = 0; index < 20; index += 1) {
    const star = document.createElement("button");
    const x = 8 + seededValue(index + 1) * 84;
    const y = 8 + seededValue(index + 41) * 82;
    const size = 10 + seededValue(index + 71) * 13;
    const speed = 2.4 + seededValue(index + 101) * 2.8;

    star.type = "button";
    star.className = "memory-star";
    star.setAttribute("aria-label", `Lembrança ${index + 1}`);
    star.style.left = `${x}%`;
    star.style.top = `${y}%`;
    star.style.setProperty("--star-size", `${size}px`);
    star.style.setProperty("--star-speed", `${speed}s`);
    star.style.animationDelay = `${seededValue(index + 131) * -4}s`;

    star.addEventListener("click", () => {
      const memory = memories[Math.floor(Math.random() * memories.length)];
      showMemoryPop(sky, pop, star, memory);
    });

    sky.append(star);
  }
}

function seededValue(seed) {
  const value = Math.sin(seed * 999.91) * 10000;
  return value - Math.floor(value);
}

function showMemoryPop(sky, pop, star, memory) {
  const skyRect = sky.getBoundingClientRect();
  const starRect = star.getBoundingClientRect();
  const x = starRect.left - skyRect.left + starRect.width / 2;
  const y = starRect.top - skyRect.top + starRect.height / 2;
  const safeX = Math.min(Math.max(x, 130), skyRect.width - 130);
  const nearTop = y < 112;

  pop.textContent = memory;
  pop.style.left = `${safeX}px`;
  pop.style.top = `${y}px`;
  pop.classList.toggle("is-below", nearTop);
  pop.classList.add("is-visible");
}

function initReveals() {
  const revealItems = $$("[data-reveal]");

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.18,
    }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function initParallax() {
  if (prefersReducedMotion) return;

  let frame = 0;

  const update = () => {
    frame = 0;

    if (window.innerWidth < 980) {
      state.parallaxItems.forEach((item) => item.style.setProperty("--parallax", "0px"));
      return;
    }

    const viewportMiddle = window.innerHeight / 2;

    state.parallaxItems.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const distance = rect.top + rect.height / 2 - viewportMiddle;
      const strength = index % 2 === 0 ? -0.018 : 0.014;
      const offset = Math.max(Math.min(distance * strength, 18), -18);
      item.style.setProperty("--parallax", `${offset.toFixed(2)}px`);
    });
  };

  const requestUpdate = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  requestUpdate();
}

function initRestart() {
  $("#restartStory")?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  });
}
