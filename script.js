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

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {
  buildPhotoStrip();
  initReveal();
  initButtons();
});

function buildPhotoStrip() {
  const strip = document.querySelector("#photoStrip");
  if (!strip) return;

  const fragment = document.createDocumentFragment();

  IMAGE_FILES.forEach((fileName, index) => {
    const card = document.createElement("figure");
    const image = new Image();

    card.className = "photo-card";
    image.src = `img/${encodeURIComponent(fileName)}`;
    image.alt = `Foto especial ${index + 1}`;
    image.loading = index < 2 ? "eager" : "lazy";
    image.decoding = "async";

    card.append(image);
    fragment.append(card);
  });

  strip.append(fragment);
}

function initReveal() {
  const items = Array.from(document.querySelectorAll(".section-reveal"));

  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    items.forEach((item) => item.classList.add("is-visible"));
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
      threshold: 0.16,
    }
  );

  items.forEach((item) => observer.observe(item));
}

function initButtons() {
  const topButtons = [document.querySelector("#restart"), document.querySelector("#backToTop")];

  topButtons.forEach((button) => {
    button?.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  });
}
