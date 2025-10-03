const container = document.querySelector(".section_step-scroll");
if (container) {
  const sections = container.querySelectorAll(".scroll_section");
  const stepItems = container.querySelectorAll(".step-scroll_item");

  if (sections.length > 0) {
    const totalSteps = 2;
    let currentStep = 0;
    let animating = false;
    let isLocked = false;
    let direction = 1;
    let preventScroll = false;
    let unlockTimeout = null;
    let enteredFromBottom = false;

    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    function updateStepClasses(stepIndex) {
      stepItems.forEach((item, i) => {
        const itemIndex = i % 3;
        item.classList.remove("active", "complete");

        if (itemIndex < stepIndex) {
          item.classList.add("complete");
        } else if (itemIndex === stepIndex) {
          item.classList.add("active");

          // Align active step to top of screen (desktop only)
          if (window.innerWidth > 767) {
            setTimeout(() => {
              const itemTop =
                item.getBoundingClientRect().top + window.pageYOffset;

              window.scrollTo({
                top: itemTop,
                behavior: "smooth",
              });
            }, 100);
          }
        }
      });
    }

    function snapAndLock(startStep) {
      if (preventScroll) return;

      preventScroll = true;
      const containerTop =
        container.getBoundingClientRect().top + window.pageYOffset;

      window.scrollTo(0, containerTop);

      isLocked = true;
      currentStep = startStep;
      updateStepClasses(startStep);

      setTimeout(() => {
        preventScroll = false;
      }, 150);
    }

    function animateToStep(stepIndex) {
      if (animating || preventScroll) return;

      animating = true;
      clearTimeout(unlockTimeout);

      updateStepClasses(stepIndex);

      setTimeout(() => {
        currentStep = stepIndex;
        animating = false;

        // Don't auto-unlock when reaching the end going forward
        // Keep locked to prevent jumping
      }, 500);
    }

    function handleScrollUp() {
      if (preventScroll || animating) return;

      direction = 1;
      clearTimeout(unlockTimeout);

      // Handle step advancement
      if (isLocked && currentStep < totalSteps) {
        animateToStep(currentStep + 1);
      }
    }

    function handleScrollDown() {
      if (preventScroll || animating) return;

      direction = -1;
      clearTimeout(unlockTimeout);

      // Handle step regression
      if (isLocked && currentStep > 0) {
        animateToStep(currentStep - 1);
      }
    }

    // Main wheel/touch observer for step navigation
    ScrollTrigger.observe({
      target: window,
      type: "wheel,touch",
      wheelSpeed: -1,
      tolerance: 10,
      throttle: 100,
      onUp: handleScrollUp,
      onDown: handleScrollDown,
    });

    // Container entry trigger - locks at step 0
    ScrollTrigger.create({
      trigger: container,
      start: "top 100px",
      end: "bottom bottom",
      onEnter: () => {
        if (!isLocked) {
          enteredFromBottom = false;
          snapAndLock(0);
        }
      },
      onLeave: () => {
        // When leaving going forward, unlock and set final step
        if (isLocked) {
          isLocked = false;
          clearTimeout(unlockTimeout);
          updateStepClasses(2);
          currentStep = 2;
        }
      },
      onLeaveBack: () => {
        // When leaving going backward, unlock
        if (isLocked) {
          isLocked = false;
          clearTimeout(unlockTimeout);
        }
      },
    });

    // Scroll-up re-entry trigger - locks at final step when scrolling up into container
    ScrollTrigger.create({
      trigger: container,
      start: "top bottom",
      end: "bottom top",
      onEnterBack: () => {
        // Trigger when scrolling up and container top reaches viewport bottom
        if (!isLocked) {
          snapAndLock(totalSteps);
        }
      },
    });

    // Ensure final step is active when past container
    ScrollTrigger.create({
      trigger: container,
      start: "bottom top",
      endTrigger: "body",
      end: "bottom bottom",
      onUpdate: (self) => {
        // Only update if we're completely past the container and not locked
        if (self.progress === 1 && !isLocked) {
          updateStepClasses(2);
          currentStep = 2;
        }
      },
    });

    // Initialize
    updateStepClasses(0);
  }
}
