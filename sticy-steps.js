const container = document.querySelector(".section_step-scroll");

if (!container || typeof ScrollTrigger === "undefined") {
  return;
}

const sections = Array.from(container.querySelectorAll(".scroll_section"));
const stepItems = Array.from(container.querySelectorAll(".step-scroll_item"));

if (!sections.length || !stepItems.length) {
  return;
}

const stepCount = sections.length;
const itemsPerStep = Math.max(1, Math.floor(stepItems.length / stepCount));

stepItems.forEach((item, index) => {
  item.dataset.stepIndex = Math.min(
    stepCount - 1,
    Math.floor(index / itemsPerStep)
  ).toString();
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

// Trigger for each scroll section to update active step on enter/exit
sections.forEach((section, index) => {
  ScrollTrigger.create({
    trigger: section,
    start: "top center",
    end: "bottom center",
    onEnter: () => setActiveStep(index),
    onEnterBack: () => setActiveStep(index),
  });
});

// When the section leaves the viewport going forward, freeze on the last step
ScrollTrigger.create({
  trigger: container,
  start: "bottom top",
  end: "bottom top+=1",
  onEnter: () => setActiveStep(stepCount - 1),
});

// Reset to the first step once the user scrolls above the component
ScrollTrigger.create({
  trigger: container,
  start: "top top",
  end: "top top+=1",
  onLeaveBack: () => setActiveStep(0),
});
