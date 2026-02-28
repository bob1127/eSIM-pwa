import React from "react";

const BlobBackground = () => {
  return (
    /* 修改重點：
       1. 將 absolute 改為 fixed -> 讓背景固定在視窗，不隨卷軸移動
       2. 維持 inset-0 w-full h-full -> 填滿整個視窗
       3. z-index 為 -10 -> 確保在所有內容下方
    */
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-gray-100/50 -z-10 pointer-events-none">
      <style>{`
        @keyframes blob-float-exaggerated {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            /* 浮誇位移：往左上飄，放大 */
            transform: translate(-50px, -80px) scale(1.2);
          }
          66% {
            /* 浮誇位移：往右下飄，縮小 */
            transform: translate(50px, 80px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .blob-animate-wild {
          animation: blob-float-exaggerated 8s ease-in-out infinite alternate;
        }
      `}</style>

      {/* 1. 紫色超大色塊：[右上] */}
      <div
        className="blob-animate-wild absolute -top-20 -right-[10%] w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-purple-400/80 rounded-full mix-blend-multiply filter blur-3xl"
        style={{ animationDelay: "0s" }}
      ></div>

      {/* 2. 黃色超大色塊：[右中] */}
      <div
        className="blob-animate-wild absolute top-[20%] -right-[20%] w-[350px] h-[350px] md:w-[550px] md:h-[550px] bg-yellow-300/80 rounded-full mix-blend-multiply filter blur-3xl"
        style={{ animationDelay: "-3s" }}
      ></div>

      {/* 3. 粉色超大色塊：[右下] */}
      <div
        className="blob-animate-wild absolute -bottom-20 right-[5%] w-[450px] h-[450px] md:w-[650px] md:h-[650px] bg-pink-400/80 rounded-full mix-blend-multiply filter blur-3xl"
        style={{ animationDelay: "-5s" }}
      ></div>
    </div>
  );
};

export default BlobBackground;
