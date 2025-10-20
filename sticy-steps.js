(function () {
  const container = document.querySelector(".section_step-scroll");

  if (!container || typeof ScrollTrigger === "undefined") {
    return;
  }

  const sections = Array.from(container.querySelectorAll(".scroll_section"));
  const lists = Array.from(container.querySelectorAll(".step-scroll_list"));
  const stepItems = lists.flatMap((list) =>
    Array.from(list.querySelectorAll(".step-scroll_item"))
  );
  const stickyTarget = container.querySelector(".step-cards_wrapper");
  const scrollTrack = container.querySelector(".scroll-wrap");

  if (!sections.length || !stepItems.length || !stickyTarget) {
    return;
  }

  const stepCount = sections.length;

  lists.forEach((list) => {
    const items = Array.from(list.querySelectorAll(".step-scroll_item"));
    items.forEach((item, index) => {
      item.dataset.stepIndex = Math.min(stepCount - 1, index).toString();
    });
  });

  let activeStep = -1;
  let transitionFrame = null;

  function setActiveStep(nextStep) {
    const clamped = Math.max(0, Math.min(stepCount - 1, nextStep));
    if (clamped === activeStep) return;

    if (transitionFrame) {
      cancelAnimationFrame(transitionFrame);
    }

    transitionFrame = requestAnimationFrame(() => {
      stepItems.forEach((item) => {
        const index = Number(item.dataset.stepIndex || 0);
        item.classList.toggle("active", index === clamped);
        item.classList.toggle("complete", index < clamped);
        if (index > clamped) {
          item.classList.remove("complete");
        }
      });

      activeStep = clamped;
      transitionFrame = null;
    });
  }

  // Initial state
  setActiveStep(0);

  // Pin the card wrapper while the scroll sections advance
  const totalDistance = () => {
    if (!scrollTrack) return window.innerHeight * stepCount;
    const spacer = scrollTrack.offsetHeight || 0;
    const targetHeight = stickyTarget.offsetHeight || 0;
    return Math.max(spacer, targetHeight * stepCount) - targetHeight;
  };

  ScrollTrigger.create({
    trigger: container,
    start: "top top",
    end: () => "+=" + Math.max(0, totalDistance()),
    pin: stickyTarget,
    pinSpacing: true,
    invalidateOnRefresh: true,
  });

  sections.forEach((section, index) => {
    ScrollTrigger.create({
      trigger: section,
      start: "top center",
      end: "bottom center",
      onEnter: () => setActiveStep(index),
      onEnterBack: () => setActiveStep(index),
    });
  });

  ScrollTrigger.create({
    trigger: container,
    start: "bottom top",
    onEnter: () => setActiveStep(stepCount - 1),
  });

  ScrollTrigger.create({
    trigger: container,
    start: "top top",
    onLeaveBack: () => setActiveStep(0),
  });
})();
