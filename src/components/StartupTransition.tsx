import React from "react";

export default function StartupTransition() {
  React.useEffect(() => {
    const startup = document.getElementById("startup");
    if (!startup) return;

    let removalTimeout: number | undefined;
    const removeStartup = () => {
      startup.remove();
      if (removalTimeout !== undefined) window.clearTimeout(removalTimeout);
    };

    startup.addEventListener("transitionend", removeStartup, { once: true });

    const animationFrame = window.requestAnimationFrame(() => {
      startup.classList.add("startup-hidden");
      removalTimeout = window.setTimeout(removeStartup, 250);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      startup.removeEventListener("transitionend", removeStartup);
      if (removalTimeout !== undefined) window.clearTimeout(removalTimeout);
    };
  }, []);

  return null;
}
