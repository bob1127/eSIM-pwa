/**
 * About / ScrollHero 首屏標語（飛機窗內）
 * 不做跑馬燈、不綁額外 ScrollTrigger，避免手機滾動卡頓。
 */
export default function HeroComponent() {
  return (
    <div className="relative overflow-visible px-3 sm:px-0">
      <div className="hero-container relative z-10 w-full overflow-visible">
        <div className="hero relative mx-auto flex w-[min(72%,18rem)] max-w-[320px] flex-col items-center justify-center text-center sm:w-[46%] sm:max-w-[380px] py-6 sm:py-10 overflow-visible">
          <h1
            className="relative z-10 font-voyage font-medium text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] text-[1.55rem] leading-[1.45] tracking-[0.06em] sm:text-[clamp(1.25rem,2.8vw,2.15rem)] sm:leading-[1.35] sm:tracking-wide"
            style={{ color: "#fff" }}
          >
            <span className="block">連線。即刻</span>
            <span className="mt-1.5 block text-[0.92em] font-normal tracking-[0.04em] opacity-95 sm:mt-0 sm:text-[1em] sm:font-medium sm:tracking-wide sm:opacity-100">
              帶著 Jeko 走遍世界
            </span>
          </h1>
        </div>
      </div>
    </div>
  );
}
