"use client";
import React, { useRef } from "react";

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(SplitText, ScrollTrigger);

export default function Copy({
  children,
  animateOnScroll = true,
  delay = 0,
  blockColor = "#000",
  stagger = 0.15,
  duration = 0.75,
}) {
  const containerRef = useRef(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      let cancelled = false;
      let splits = [];
      let scrollTrigger = null;
      let tl = null;

      const run = () => {
        if (cancelled || !containerRef.current) return;

        let elements = [];
        if (containerRef.current.hasAttribute("data-copy-wrapper")) {
          elements = Array.from(containerRef.current.children);
        } else {
          elements = [containerRef.current];
        }

        const lines = [];
        const blocks = [];
        splits = [];

        elements.forEach((element) => {
          if (!element || !element.isConnected) return;
          const split = SplitText.create(element, {
            type: "lines",
            linesClass: "block-line++",
            lineThreshold: 0.1,
          });

          splits.push(split);

          split.lines.forEach((line) => {
            const wrapper = document.createElement("div");
            wrapper.className = "block-line-wrapper";
            wrapper.style.position = "relative";
            wrapper.style.display = "block";
            wrapper.style.overflow = "hidden";

            line.parentNode.insertBefore(wrapper, line);
            wrapper.appendChild(line);

            const block = document.createElement("div");
            block.className = "block-revealer";
            block.style.backgroundColor = blockColor;
            block.style.position = "absolute";
            block.style.top = "0";
            block.style.left = "0";
            block.style.width = "100%";
            block.style.height = "100%";
            block.style.zIndex = "2";

            wrapper.appendChild(block);

            lines.push(line);
            blocks.push(block);
          });
        });

        if (!lines.length) return;

        gsap.set(lines, { opacity: 0 });
        gsap.set(blocks, { scaleX: 0, transformOrigin: "left center" });

        tl = gsap.timeline({
          paused: true,
          delay,
        });

        blocks.forEach((block, index) => {
          const line = lines[index];
          const startTime = index * stagger;

          tl.to(
            block,
            {
              scaleX: 1,
              duration: duration,
              ease: "power4.inOut",
              transformOrigin: "left center",
            },
            startTime,
          );

          tl.set(line, { opacity: 1 }, startTime + duration);
          tl.set(
            block,
            { transformOrigin: "right center" },
            startTime + duration,
          );

          tl.to(
            block,
            {
              scaleX: 0,
              duration: duration,
              ease: "power4.inOut",
            },
            startTime + duration,
          );
        });

        if (animateOnScroll) {
          scrollTrigger = ScrollTrigger.create({
            trigger: containerRef.current,
            start: "top bottom",
            once: true,
            onEnter: () => tl?.play(),
          });
        } else {
          tl.play();
        }
      };

      const fontsReady =
        typeof document !== "undefined" && document.fonts?.ready
          ? document.fonts.ready
          : Promise.resolve();

      fontsReady.then(() => {
        if (cancelled) return;
        // 下一幀再切字，避免與 hydration / layout 搶同一幀
        requestAnimationFrame(run);
      });

      return () => {
        cancelled = true;
        scrollTrigger?.kill();
        tl?.kill();
        splits.forEach((split) => {
          try {
            split.revert();
          } catch {
            /* ignore */
          }
        });
        const wrappers = containerRef.current?.querySelectorAll(
          ".block-line-wrapper",
        );
        wrappers?.forEach((wrapper) => {
          if (wrapper.parentNode && wrapper.firstChild) {
            while (wrapper.firstChild) {
              wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
            }
            wrapper.remove();
          }
        });
      };
    },
    {
      scope: containerRef,
      dependencies: [animateOnScroll, delay, blockColor, stagger, duration],
    },
  );

  if (React.Children.count(children) === 1) {
    return React.cloneElement(children, { ref: containerRef });
  }

  return (
    <div ref={containerRef} data-copy-wrapper="true">
      {children}
    </div>
  );
}
