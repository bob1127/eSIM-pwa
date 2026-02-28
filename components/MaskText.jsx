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
  delay = 1.8, // ★ 修改 1: 將預設延遲改為 1.5 秒
  blockColor = "#000",
  stagger = 0.15,
  duration = 0.75,
}) {
  const containerRef = useRef(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      // 1. 取得目標元素
      let elements = [];
      if (containerRef.current.hasAttribute("data-copy-wrapper")) {
        elements = Array.from(containerRef.current.children);
      } else {
        elements = [containerRef.current];
      }

      const lines = [];
      const blocks = [];
      const splits = [];

      // 2. DOM 操作與分割文字
      elements.forEach((element) => {
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

      // 3. 設定初始狀態
      gsap.set(lines, { opacity: 0 });
      gsap.set(blocks, { scaleX: 0, transformOrigin: "left center" });

      // 4. 建立主時間軸
      const tl = gsap.timeline({
        paused: true, // 預設暫停，等待 ScrollTrigger 觸發
        delay: delay, // ★ 套用延遲時間 (1.5秒)
      });

      // 依序建立動畫序列
      blocks.forEach((block, index) => {
        const line = lines[index];
        const startTime = index * stagger;

        // 階段一：色塊展開
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

        // 階段二：顯示文字並切換 transformOrigin
        tl.set(line, { opacity: 1 }, startTime + duration);
        tl.set(
          block,
          { transformOrigin: "right center" },
          startTime + duration,
        );

        // 階段三：色塊收縮
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

      // 5. 設定 ScrollTrigger
      if (animateOnScroll) {
        ScrollTrigger.create({
          trigger: containerRef.current,
          start: "top 80%", // 當視窗捲動到元素頂部 80% 處 (進入視線) 時觸發
          once: true,
          onEnter: () => tl.play(), // 播放動畫 (會包含 1.5秒的 delay)
        });
      } else {
        tl.play();
      }

      // 清理函式
      return () => {
        splits.forEach((split) => split.revert());
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
