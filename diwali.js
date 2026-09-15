/**
 * Happy Diwali Celebration Overlay
 * Jai Pari Mata Medical Store
 *
 * Isolated fireworks engine, starfield,
 * cinematic celebration controller and cleanup.
 */

(function () {
  'use strict';

  const CELEBRATION_DURATION_MS = 7500;
  const ROCKET_START_DELAY = 1500;

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const COLOR_PALETTES = [
    ['#ffe066', '#ffd700', '#ffb700', '#fff3b0', '#ff9800'],
    ['#ffaa00', '#ff7700', '#ff5500', '#ffc107', '#ffe082'],
    ['#ff2a6d', '#ff5e7e', '#ff1744', '#ff7597', '#ffebee'],
    ['#d500f9', '#aa00ff', '#e040fb', '#ba68c8', '#ede7f6'],
    ['#00e676', '#1de9b6', '#00b0ff', '#69f0ae', '#b9f6ca'],
    ['#00e5ff', '#2979ff', '#00b4d8', '#90e0ef', '#e0f7fa'],
    ['#ffd700', '#ff1744', '#ff9100', '#ffea00', '#ffffff']
  ];

  const PATTERNS = [
    'circular',
    'ring',
    'double_ring',
    'star',
    'chrysanthemum'
  ];

  let celebrationContainer = null;
  let canvas = null;
  let ctx = null;

  let animationFrameId = null;
  let rocketTimer = null;
  let autoCloseTimer = null;

  let cinematicTimers = [];

  let previousActiveElement = null;
  let isClosed = false;

  let stars = [];
  let rockets = [];
  let particles = [];

  let dpr = 1;
  let width = 0;
  let height = 0;

  /**
   * =========================
   * STAR
   * =========================
   */

  class Star {
    constructor() {
      this.reset();
      this.alpha = Math.random();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height * 0.75;

      this.radius = Math.random() * 1.4 + 0.5;

      this.baseAlpha = Math.random() * 0.5 + 0.3;

      this.twinkleSpeed =
        Math.random() * 0.02 + 0.008;

      this.phase =
        Math.random() * Math.PI * 2;
    }

    update() {
      this.phase += this.twinkleSpeed;

      this.alpha =
        this.baseAlpha +
        Math.sin(this.phase) * 0.25;

      this.alpha = Math.max(
        0.1,
        Math.min(0.95, this.alpha)
      );
    }

    draw(context) {
      context.beginPath();

      context.arc(
        this.x,
        this.y,
        this.radius,
        0,
        Math.PI * 2
      );

      context.fillStyle =
        `rgba(255,245,220,${this.alpha})`;

      context.fill();
    }
  }

  /**
   * =========================
   * ROCKET
   * =========================
   */

  class Rocket {
    constructor() {
      this.x =
        width * (0.12 + Math.random() * 0.76);

      this.y = height + 15;

      this.targetY =
        height * (0.15 + Math.random() * 0.37);

      /*
       * FIX:
       * Proper physics calculation.
       *
       * Previous formula was too slow, causing
       * rockets to explode before reaching target.
       */

      this.gravity = 0.035;

      const distance =
        this.y - this.targetY;

      this.speed =
        Math.sqrt(
          2 * this.gravity * distance
        ) * (0.90 + Math.random() * 0.08);

      this.vy = -this.speed;

      this.vx =
        (Math.random() - 0.5) * 1.4;

      this.palette =
        COLOR_PALETTES[
          Math.floor(
            Math.random() *
            COLOR_PALETTES.length
          )
        ];

      this.color = this.palette[0];

      this.pattern =
        PATTERNS[
          Math.floor(
            Math.random() * PATTERNS.length
          )
        ];

      this.trail = [];
      this.maxTrailLength = 7;

      this.dead = false;
    }

    update() {
      if (this.dead) return;

      this.trail.push({
        x: this.x,
        y: this.y
      });

      if (
        this.trail.length >
        this.maxTrailLength
      ) {
        this.trail.shift();
      }

      this.x += this.vx;
      this.y += this.vy;

      this.vy += this.gravity;

      /*
       * Explode at target height.
       */
      if (
        this.y <= this.targetY ||
        this.vy >= 0
      ) {
        this.explode();
        this.dead = true;
      }
    }

    draw(context) {
      if (this.trail.length > 1) {
        context.beginPath();

        context.moveTo(
          this.trail[0].x,
          this.trail[0].y
        );

        for (
          let i = 1;
          i < this.trail.length;
          i++
        ) {
          context.lineTo(
            this.trail[i].x,
            this.trail[i].y
          );
        }

        context.strokeStyle =
          'rgba(255,200,80,0.45)';

        context.lineWidth = 2.5;

        context.stroke();
      }

      context.beginPath();

      context.arc(
        this.x,
        this.y,
        2.5,
        0,
        Math.PI * 2
      );

      context.fillStyle = '#fffdf0';

      context.shadowColor = '#ffb700';
      context.shadowBlur = 10;

      context.fill();

      context.shadowBlur = 0;
    }

    explode() {
      createExplosion(
        this.x,
        this.y,
        this.palette,
        this.pattern
      );
    }
  }

  /**
   * =========================
   * PARTICLE
   * =========================
   */

  class Particle {
    constructor(
      x,
      y,
      vx,
      vy,
      color,
      options = {}
    ) {
      this.x = x;
      this.y = y;

      this.vx = vx;
      this.vy = vy;

      this.color = color;

      this.friction =
        options.friction ?? 0.97;

      this.gravity =
        options.gravity ?? 0.055;

      this.decay =
        options.decay ??
        (0.012 + Math.random() * 0.012);

      this.size =
        options.size ??
        (Math.random() * 2.2 + 1.2);

      this.hasTrail =
        options.hasTrail ?? false;

      this.trail = [];

      this.alpha = 1;

      this.dead = false;

      this.sparkle =
        Math.random() > 0.4;
    }

    update() {
      if (this.dead) return;

      if (this.hasTrail) {
        this.trail.push({
          x: this.x,
          y: this.y,
          alpha: this.alpha
        });

        if (this.trail.length > 4) {
          this.trail.shift();
        }
      }

      this.vx *= this.friction;
      this.vy *= this.friction;

      this.vy += this.gravity;

      this.x += this.vx;
      this.y += this.vy;

      this.alpha -= this.decay;

      if (this.alpha <= 0.01) {
        this.dead = true;
      }
    }

    draw(context) {
      if (this.dead) return;

      const currentAlpha =
        this.sparkle &&
        Math.random() < 0.25
          ? Math.min(1, this.alpha * 1.4)
          : this.alpha;

      if (
        this.hasTrail &&
        this.trail.length > 1
      ) {
        context.beginPath();

        context.moveTo(
          this.trail[0].x,
          this.trail[0].y
        );

        for (
          let i = 1;
          i < this.trail.length;
          i++
        ) {
          context.lineTo(
            this.trail[i].x,
            this.trail[i].y
          );
        }

        context.strokeStyle = this.color;

        context.globalAlpha =
          currentAlpha * 0.5;

        context.lineWidth =
          this.size * 0.7;

        context.stroke();
      }

      context.beginPath();

      context.arc(
        this.x,
        this.y,
        this.size,
        0,
        Math.PI * 2
      );

      context.fillStyle = this.color;

      context.globalAlpha =
        currentAlpha;

      context.shadowColor = this.color;
      context.shadowBlur = 8;

      context.fill();

      context.shadowBlur = 0;
      context.globalAlpha = 1;
    }
  }

  /**
   * =========================
   * EXPLOSION
   * =========================
   */

  function createExplosion(
    x,
    y,
    palette,
    pattern
  ) {
    const isMobile = width < 768;

    const baseCount =
      isMobile ? 40 : 75;

    switch (pattern) {

      /**
       * CIRCULAR
       */
      case 'circular':
      default: {
        const count = baseCount;

        const speedMax =
          isMobile ? 4.2 : 6.0;

        for (let i = 0; i < count; i++) {
          const angle =
            Math.random() *
            Math.PI * 2;

          const speed =
            (Math.random() * 0.6 + 0.4) *
            speedMax;

          particles.push(
            new Particle(
              x,
              y,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              palette[
                Math.floor(
                  Math.random() *
                  palette.length
                )
              ],
              {
                friction: 0.968,
                gravity: 0.05,
                decay:
                  0.014 +
                  Math.random() * 0.01
              }
            )
          );
        }

        break;
      }

      /**
       * RING
       */
      case 'ring': {
        const count =
          Math.floor(baseCount * 0.85);

        const ringSpeed =
          (isMobile ? 3.5 : 5) +
          Math.random() * 1.2;

        const color =
          palette[
            Math.floor(
              Math.random() *
              palette.length
            )
          ];

        for (let i = 0; i < count; i++) {
          const angle =
            (i / count) *
            Math.PI * 2;

          const speed =
            ringSpeed *
            (0.92 + Math.random() * 0.16);

          particles.push(
            new Particle(
              x,
              y,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              color,
              {
                friction: 0.965,
                gravity: 0.045,
                decay: 0.016
              }
            )
          );
        }

        break;
      }

      /**
       * DOUBLE RING
       */
      case 'double_ring': {
        const outerCount =
          Math.floor(baseCount * 0.7);

        const innerCount =
          Math.floor(baseCount * 0.4);

        const outerColor =
          palette[0];

        const innerColor =
          palette[1] || palette[0];

        for (
          let i = 0;
          i < outerCount;
          i++
        ) {
          const angle =
            (i / outerCount) *
            Math.PI * 2;

          const speed =
            (isMobile ? 4.2 : 5.8) *
            (0.94 + Math.random() * 0.12);

          particles.push(
            new Particle(
              x,
              y,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              outerColor,
              {
                friction: 0.965,
                gravity: 0.045,
                decay: 0.017
              }
            )
          );
        }

        for (
          let i = 0;
          i < innerCount;
          i++
        ) {
          const angle =
            (i / innerCount) *
            Math.PI * 2;

          const speed =
            (isMobile ? 2.3 : 3.2) *
            (0.94 + Math.random() * 0.12);

          particles.push(
            new Particle(
              x,
              y,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              innerColor,
              {
                friction: 0.965,
                gravity: 0.04,
                decay: 0.02
              }
            )
          );
        }

        break;
      }

      /**
       * STAR
       */
      case 'star': {
        const points = 5;

        const count =
          Math.floor(baseCount * 0.9);

        const baseSpeed =
          isMobile ? 4 : 5.5;

        const color =
          palette[
            Math.floor(
              Math.random() *
              palette.length
            )
          ];

        for (let i = 0; i < count; i++) {
          const angle =
            (i / count) *
            Math.PI * 2;

          const mod =
            0.55 +
            0.45 *
            Math.cos(points * angle);

          const speed =
            baseSpeed *
            mod *
            (0.85 + Math.random() * 0.3);

          particles.push(
            new Particle(
              x,
              y,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              color,
              {
                friction: 0.965,
                gravity: 0.04,
                decay: 0.015
              }
            )
          );
        }

        break;
      }

      /**
       * CHRYSANTHEMUM
       */
      case 'chrysanthemum': {
        const count =
          Math.floor(baseCount * 1.1);

        const speedMax =
          isMobile ? 3.8 : 5.2;

        for (let i = 0; i < count; i++) {
          const angle =
            Math.random() *
            Math.PI * 2;

          const speed =
            Math.random() *
            speedMax;

          const color =
            palette[
              Math.floor(
                Math.random() *
                palette.length
              )
            ];

          particles.push(
            new Particle(
              x,
              y,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              color,
              {
                friction: 0.975,
                gravity: 0.065,
                decay:
                  0.009 +
                  Math.random() * 0.008,
                hasTrail: true,
                size: 1.8
              }
            )
          );
        }

        break;
      }
    }
  }

  /**
   * =========================
   * ROCKET CONTROLLER
   * =========================
   */

  function scheduleNextRocket() {
    if (isClosed) return;

    const maxConcurrent =
      width < 768 ? 2 : 3;

    if (
      rockets.length <
      maxConcurrent
    ) {
      rockets.push(
        new Rocket()
      );
    }

    const nextDelay =
      450 +
      Math.random() * 750;

    rocketTimer = setTimeout(
      scheduleNextRocket,
      nextDelay
    );
  }

  /**
   * =========================
   * RENDER
   * =========================
   */

  function render() {
    if (
      isClosed ||
      !ctx
    ) {
      return;
    }

    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    /**
     * Stars
     */
    for (
      let i = 0;
      i < stars.length;
      i++
    ) {
      stars[i].update();
      stars[i].draw(ctx);
    }

    /**
     * Fireworks
     */
    ctx.save();

    ctx.globalCompositeOperation =
      'lighter';

    /**
     * Rockets
     */
    for (
      let i = rockets.length - 1;
      i >= 0;
      i--
    ) {
      const rocket =
        rockets[i];

      rocket.update();
      rocket.draw(ctx);

      if (rocket.dead) {
        rockets.splice(i, 1);
      }
    }

    /**
     * Particles
     */
    for (
      let i = particles.length - 1;
      i >= 0;
      i--
    ) {
      const particle =
        particles[i];

      particle.update();
      particle.draw(ctx);

      if (particle.dead) {
        particles.splice(i, 1);
      }
    }

    ctx.restore();

    animationFrameId =
      requestAnimationFrame(render);
  }

  /**
   * =========================
   * RESIZE
   * =========================
   */

  function handleResize() {
    if (
      !canvas ||
      isClosed
    ) {
      return;
    }

    dpr = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    width =
      window.innerWidth;

    height =
      window.innerHeight;

    canvas.width =
      Math.floor(
        width * dpr
      );

    canvas.height =
      Math.floor(
        height * dpr
      );

    canvas.style.width =
      width + 'px';

    canvas.style.height =
      height + 'px';

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    /**
     * Recreate stars
     */
    const starCount =
      width < 768 ? 45 : 85;

    stars = [];

    for (
      let i = 0;
      i < starCount;
      i++
    ) {
      stars.push(
        new Star()
      );
    }
  }

  /**
   * =========================
   * KEYBOARD
   * =========================
   */

  function trapFocus(e) {
    if (
      isClosed ||
      !celebrationContainer
    ) {
      return;
    }

    if (
      e.key === 'Escape'
    ) {
      e.preventDefault();
      closeCelebration();
      return;
    }

    if (
      e.key !== 'Tab'
    ) {
      return;
    }

    const focusables =
      celebrationContainer.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

    if (
      focusables.length === 0
    ) {
      e.preventDefault();
      return;
    }

    const first =
      focusables[0];

    const last =
      focusables[
        focusables.length - 1
      ];

    if (
      e.shiftKey &&
      document.activeElement === first
    ) {
      e.preventDefault();
      last.focus();
    } else if (
      !e.shiftKey &&
      document.activeElement === last
    ) {
      e.preventDefault();
      first.focus();
    }
  }

  /**
   * =========================
   * CLOSE
   * =========================
   */

  function closeCelebration() {
    if (isClosed) {
      return;
    }

    isClosed = true;

    /**
     * Clear all timers
     */
    if (autoCloseTimer) {
      clearTimeout(
        autoCloseTimer
      );
      autoCloseTimer = null;
    }

    if (rocketTimer) {
      clearTimeout(
        rocketTimer
      );
      rocketTimer = null;
    }

    cinematicTimers.forEach(
      timer => clearTimeout(timer)
    );

    cinematicTimers = [];

    /**
     * Stop animation
     */
    if (animationFrameId) {
      cancelAnimationFrame(
        animationFrameId
      );

      animationFrameId = null;
    }

    /**
     * Fade out
     */
    if (
      celebrationContainer
    ) {
      celebrationContainer.classList.remove(
        'diwali-visible'
      );

      celebrationContainer.classList.add(
        'diwali-closing'
      );

      const containerToRemove =
        celebrationContainer;

      setTimeout(() => {
        if (
          containerToRemove &&
          containerToRemove.parentNode
        ) {
          containerToRemove.remove();
        }
      }, 700);
    }

    /**
     * Restore body
     */
    document.body.style.overflow = '';

    /**
     * Restore accessibility
     */
    document
      .querySelectorAll(
        'header, main, footer, .floating-whatsapp'
      )
      .forEach(el => {
        el.removeAttribute(
          'aria-hidden'
        );
      });

    /**
     * Remove listeners
     */
    window.removeEventListener(
      'resize',
      handleResize
    );

    window.removeEventListener(
      'keydown',
      trapFocus
    );

    /**
     * Clear simulation
     */
    rockets = [];
    particles = [];
    stars = [];

    /**
     * Restore focus
     */
    if (
      previousActiveElement &&
      typeof previousActiveElement.focus ===
        'function' &&
      document.contains(
        previousActiveElement
      )
    ) {
      previousActiveElement.focus();
    }

    celebrationContainer = null;
    canvas = null;
    ctx = null;
  }

  /**
   * =========================
   * INITIALIZE
   * =========================
   */

  function initDiwaliCelebration() {
    celebrationContainer =
      document.getElementById(
        'diwali-celebration'
      );

    if (
      !celebrationContainer
    ) {
      return;
    }

    canvas =
      celebrationContainer.querySelector(
        '.diwali-canvas'
      );

    if (!canvas) {
      return;
    }

    ctx =
      canvas.getContext(
        '2d',
        {
          alpha: true
        }
      );

    if (!ctx) {
      return;
    }

    previousActiveElement =
      document.activeElement;

    /**
     * Close button
     */
    const closeBtn =
      celebrationContainer.querySelector(
        '.diwali-close-btn'
      );

    if (closeBtn) {
      closeBtn.addEventListener(
        'click',
        closeCelebration
      );
    }

    /**
     * Accessibility
     */
    document
      .querySelectorAll(
        'header, main, footer, .floating-whatsapp'
      )
      .forEach(el => {
        el.setAttribute(
          'aria-hidden',
          'true'
        );
      });

    /**
     * Lock scrolling
     */
    document.body.style.overflow =
      'hidden';

    /**
     * Event listeners
     */
    window.addEventListener(
      'resize',
      handleResize
    );

    window.addEventListener(
      'keydown',
      trapFocus
    );

    /**
     * Canvas setup
     */
    handleResize();

    /**
     * 200ms:
     * Overlay appears
     */
    cinematicTimers.push(
      setTimeout(() => {
        if (
          isClosed ||
          !celebrationContainer
        ) {
          return;
        }

        celebrationContainer.classList.add(
          'diwali-visible'
        );

        if (closeBtn) {
          closeBtn.focus();
        }
      }, 200)
    );

    /**
     * 800ms:
     * Card animation
     */
    cinematicTimers.push(
      setTimeout(() => {
        if (
          isClosed ||
          !celebrationContainer
        ) {
          return;
        }

        const card =
          celebrationContainer.querySelector(
            '.diwali-card'
          );

        if (card) {
          card.classList.add(
            'diwali-card-active'
          );
        }
      }, 800)
    );

    /**
     * Reduced motion
     */
    if (
      prefersReducedMotion
    ) {
      autoCloseTimer =
        setTimeout(
          closeCelebration,
          CELEBRATION_DURATION_MS
        );

      return;
    }

    /**
     * Start fireworks
     */
    cinematicTimers.push(
      setTimeout(() => {
        if (isClosed) {
          return;
        }

        scheduleNextRocket();
      }, ROCKET_START_DELAY_MS)
    );

    /**
     * Start animation
     */
    render();

    /**
     * Auto close
     */
    autoCloseTimer =
      setTimeout(
        closeCelebration,
        CELEBRATION_DURATION_MS
      );
  }

  /**
   * =========================
   * DOM READY
   * =========================
   */

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initDiwaliCelebration,
      {
        once: true
      }
    );
  } else {
    initDiwaliCelebration();
  }

})();