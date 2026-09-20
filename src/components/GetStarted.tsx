import { useEffect, useState } from "react";

function GetStarted({}) {
  const [logoExpanded, setLogoExpanded] = useState(false);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setLogoExpanded(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="flex w-160 max-w-full items-stretch gap-2 text-text-muted">
      <div className="flex flex-1 items-center justify-center">
        <div
          aria-label="Kyte"
          role="img"
          className={`${logoExpanded ? "size-56" : "size-28"} bg-bg-secondary-tint transition-[width,height] duration-200 ease-out`}
          style={{
            WebkitMask: 'url("/kyte.svg") center / contain no-repeat',
            mask: 'url("/kyte.svg") center / contain no-repeat',
          }}
        />
      </div>
    </div>
  );
}

export default GetStarted;
