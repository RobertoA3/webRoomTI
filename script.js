/**
 * RoomTI ā3 — Controlador Global de Secuencia por Scroll
 * Canvas Fijo a Pantalla Completa, Avance y Retroceso Suave y Fusión con Sección Blanca
 */

document.addEventListener('DOMContentLoaded', () => {
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  const topbar = document.querySelector('.hero-topbar');
  const mobileLinks = document.querySelectorAll('.mobile-nav-panel .nav-link');

  if (mobileToggle && topbar) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = topbar.classList.toggle('menu-open');
      mobileToggle.setAttribute('aria-expanded', String(isOpen));
    });

    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        topbar.classList.remove('menu-open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) {
        topbar.classList.remove('menu-open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const TOTAL_FRAMES = 120;
  const canvas = document.getElementById('global-sequence-canvas');
  const initialFrameImg = document.getElementById('global-initial-frame');
  const whiteSection = document.getElementById('plataforma');
  const imageModal = document.getElementById('workflow-image-modal');
  const imageModalTriggers = document.querySelectorAll('.service-image-trigger');
  const imageModalContent = imageModal?.querySelector('.image-modal-content');
  const imageModalClose = imageModal?.querySelector('.image-modal-close');

  if (imageModal && imageModalContent && typeof imageModal.showModal === 'function') {
    imageModalTriggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const image = trigger.querySelector('img');
        if (!image) return;
        imageModalContent.src = image.currentSrc || image.src;
        imageModalContent.alt = image.alt;
        imageModal.setAttribute('aria-label', image.alt);
        imageModal.showModal();
      });
    });
    imageModalClose?.addEventListener('click', () => imageModal.close());
    imageModal.addEventListener('click', (event) => {
      if (event.target === imageModal) imageModal.close();
    });
  }

  initBedsCarousel();
  initPasilloSequence();

  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Generador de rutas para los 120 fotogramas
  const getFramePath = (index) => {
    const padded = String(index + 1).padStart(4, '0');
    return `graficas/sequence/frame_${padded}.webp?v=20261020-lossless`;
  };

  // Almacén de imágenes en memoria
  const images = new Array(TOTAL_FRAMES);
  let currentDrawnIndex = -1;
  let isCanvasReady = false;

  // Ajuste de tamaño del Canvas con soporte Retina (DPR)
  const resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (currentDrawnIndex >= 0 && images[currentDrawnIndex]) {
        drawFrame(images[currentDrawnIndex]);
      }
    }
  };

  let currentProgress = 0;

  // Dibuja el fotograma con escala 'cover' sin distorsión
  const drawFrame = (img, progress = currentProgress) => {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Escala proporcional para cubrir toda la ventana
    const scale = Math.max(cw / iw, ch / ih);
    const nw = iw * scale;
    const nh = ih * scale;

    // Centrado óptico:
    // En el inicio amplio (Hero), biasX es 0.58 para dar espacio al texto editorial
    // Conforme la cámara hace zoom hacia el logo RoomTI ā3, converge al centro 0.50
    const isMobile = window.innerWidth <= 760;
    const biasX = isMobile ? 0.5 : (0.58 - (progress * 0.08));
    const offsetX = (cw - nw) * biasX;
    const offsetY = (ch - nh) * 0.5;

    ctx.drawImage(img, offsetX, offsetY, nw, nh);

    // Ocultar suavemente la imagen inicial estática tras el primer trazo en canvas
    if (!isCanvasReady && initialFrameImg) {
      isCanvasReady = true;
      initialFrameImg.style.opacity = '0';
    }
  };

  // Renderizar un índice específico (o el más cercano cargado si aún descarga)
  const renderFrameIndex = (targetIndex, progress = currentProgress) => {
    currentProgress = progress;
    if (targetIndex === currentDrawnIndex) return;

    if (images[targetIndex] && images[targetIndex].complete) {
      drawFrame(images[targetIndex], progress);
      currentDrawnIndex = targetIndex;
      return;
    }

    // Buscar fotograma más próximo ya en memoria
    let closestIndex = -1;
    let minDiff = Infinity;
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      if (images[i] && images[i].complete) {
        const diff = Math.abs(i - targetIndex);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }
    }

    if (closestIndex >= 0 && closestIndex !== currentDrawnIndex) {
      drawFrame(images[closestIndex], progress);
      currentDrawnIndex = closestIndex;
    }
  };

  // 1. Cargar el fotograma inicial inmediatamente (Frame 0001)
  const initialImg = new Image();
  initialImg.src = getFramePath(0);
  images[0] = initialImg;

  initialImg.onload = () => {
    resizeCanvas();
    drawFrame(initialImg);
    currentDrawnIndex = 0;
  };

  // 2. Precarga asíncrona del resto de los fotogramas
  const preloadRemainingFrames = () => {
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      images[i] = img;
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(preloadRemainingFrames);
  } else {
    setTimeout(preloadRemainingFrames, 100);
  }

  // 3. Sincronización del Scroll con la Secuencia de Inicio a Fin
  let ticking = false;

  const updateScrollSequence = () => {
    if (reducedMotionQuery.matches) {
      renderFrameIndex(0);
      ticking = false;
      return;
    }

    // La secuencia cubre desde la parte superior hasta la llegada a la sección blanca
    const scrollY = window.scrollY || window.pageYOffset || 0;
    
    // Distancia objetivo: hasta el inicio de la sección blanca (#plataforma)
    let targetDistance = whiteSection ? whiteSection.offsetTop - (window.innerHeight * 0.4) : (document.documentElement.scrollHeight - window.innerHeight);
    if (targetDistance <= 0) targetDistance = 1;

    // Progreso normalizado de 0.0 a 1.0
    const progress = Math.max(0, Math.min(1, scrollY / targetDistance));

    // Mapeo al índice de fotograma (0 a 119)
    const targetFrame = Math.min(TOTAL_FRAMES - 1, Math.floor(progress * TOTAL_FRAMES));
    renderFrameIndex(targetFrame, progress);

    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollSequence);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    resizeCanvas();
    updateScrollSequence();
  }, { passive: true });

  // Inicialización de dimensiones
  resizeCanvas();

  // Escucha de preferencias de movimiento reducido
  reducedMotionQuery.addEventListener('change', (e) => {
    if (e.matches) {
      renderFrameIndex(0);
    } else {
      updateScrollSequence();
    }
  });
});

function initBedsCarousel() {
  const carousel = document.querySelector('.beds-carousel');
  if (!carousel) return;
  const slides = Array.from(carousel.querySelectorAll('.bed-figure'));
  const controls = carousel.querySelector('.beds-carousel-controls');
  if (slides.length < 2 || !controls) return;
  let current = 0;

  const show = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, position) => {
      slide.hidden = position !== current;
    });
    slides[current].querySelector('img').loading = 'eager';
  };

  carousel.querySelector('.carousel-arrow-prev').addEventListener('click', () => show(current - 1));
  carousel.querySelector('.carousel-arrow-next').addEventListener('click', () => show(current + 1));
  carousel.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  show(0);
  controls.hidden = false;
}

// Secuencia independiente del recorrido: carga cercana al viewport y caché acotada.
function initPasilloSequence() {
  const section = document.getElementById('video_con_pasillo');
  const canvas = section?.querySelector('.pasillo-canvas');
  const context = canvas?.getContext('2d', { alpha: false });
  if (!context) return;

  const PASILLO_TOTAL_FRAMES = 120;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 760px)');
  const frames = new Map();
  const failed = new Set();
  let active = false;
  let pending = false;
  let loading = 0;
  let target = 0;
  let drawn = -1;

  const paint = () => {
    let nearest = -1;
    for (const [index, frame] of frames) {
      if (frame.loaded && (nearest < 0 || Math.abs(index - target) < Math.abs(nearest - target))) {
        nearest = index;
      }
    }
    if (nearest < 0 || nearest === drawn) return;
    const image = frames.get(nearest).image;
    // Llena el área visible sin franjas, manteniendo la proporción y el centro.
    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    drawn = nearest;
    canvas.classList.add('is-ready');
  };

  const trimCache = () => {
    for (const [index, frame] of frames) {
      if (frame.loaded && index !== drawn && (!active || Math.abs(index - target) > 8)) {
        frames.delete(index);
      }
    }
  };

  const loadNearby = () => {
    if (!active || motion.matches || mobile.matches) return;
    // Prioriza el destino actual, incluso al saltar o invertir el scroll.
    const nearby = [target];
    for (let offset = 1; offset <= 4; offset++) nearby.push(target + offset, target - offset);
    trimCache();
    for (const index of nearby) {
      if (loading >= 4) break;
      if (index < 0 || index >= PASILLO_TOTAL_FRAMES || frames.has(index) || failed.has(index)) continue;
      const image = new Image();
      const frame = { image, loaded: false };
      frames.set(index, frame);
      loading++;
      image.onload = () => {
        loading--;
        frame.loaded = true;
        if (active && !motion.matches) scheduleUpdate();
        else trimCache();
      };
      image.onerror = () => {
        loading--;
        frames.delete(index);
        failed.add(index);
        if (active && !motion.matches) scheduleUpdate();
      };
      image.src = `graficas/pasillo-sequence/frame_${String(index + 1).padStart(4, '0')}.webp?v=20261020-lossless`;
    }
  };

  const update = () => {
    pending = false;
    if (!active || motion.matches || mobile.matches) return;
    const bounds = section.getBoundingClientRect();
    const stage = section.querySelector('.pasillo-stage');
    const distance = Math.max(1, section.offsetHeight - stage.offsetHeight);
    const progress = Math.max(0, Math.min(1, -bounds.top / distance));
    target = Math.round(progress * (PASILLO_TOTAL_FRAMES - 1));
    loadNearby();
    paint();
  };

  function scheduleUpdate() {
    if (!pending) {
      pending = true;
      window.requestAnimationFrame(update);
    }
  }

  const resize = () => {
    if (mobile.matches) {
      frames.clear();
      drawn = -1;
      canvas.classList.remove('is-ready');
      canvas.width = 1;
      canvas.height = 1;
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      drawn = -1;
      if (!motion.matches) paint();
    }
    scheduleUpdate();
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active) scheduleUpdate();
      else trimCache();
    }, { rootMargin: '600px 0px' });
    observer.observe(section);
  } else {
    active = true;
  }

  window.addEventListener('scroll', () => {
    if (active && !motion.matches && !mobile.matches) scheduleUpdate();
  }, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  motion.addEventListener('change', () => {
    canvas.classList.remove('is-ready');
    drawn = -1;
    trimCache();
    resize();
  });
  resize();
}
