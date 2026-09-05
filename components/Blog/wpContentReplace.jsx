/**
 * WordPress 媒體區塊 → React 元件（前台跟後台區塊對齊）
 * - 投影片 → WpSlideshow
 * - 並排圖庫 / 圖庫 → WpPhotoWall
 * - 單張圖 → 靠左圖片（點擊開整篇文章幻燈片）
 */
import WpPhotoWall, {
  collectImgsFromGalleryNode,
  extractWpMosaicLayout,
  isImgInsideWpGallery,
  isWpGalleryNode,
} from "@/components/Blog/WpPhotoWall";
import WpSlideshow, {
  collectSlidesFromNode,
  isImgInsideWpSlideshow,
  isWpSlideshowNode,
  readAutoplay,
} from "@/components/Blog/WpSlideshow";
import { normalizeWpAssetUrl } from "@/lib/wordpress";
import { cfImgSrc, unwrapCfImageSrc } from "@/lib/cfImageLoader";
import { domToReact, attributesToProps } from "html-react-parser";

function WpContentImg({ src, alt, className, onClick, ariaLabel }) {
  const handleError = (e) => {
    const el = e?.currentTarget;
    if (!el) return;
    const orig = unwrapCfImageSrc(el.getAttribute("src") || src);
    if (orig && el.getAttribute("src") !== orig) {
      el.setAttribute("src", orig);
    }
  };

  const img = (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={handleError}
    />
  );

  if (!onClick) return img;

  return (
    <button
      type="button"
      className="wp-single-img__btn"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {img}
    </button>
  );
}

export function createWpContentReplace({
  normalizeUrl = normalizeWpAssetUrl,
  imageWrapperClassName = "wp-single-img my-10 text-left",
  imageClassName = "wp-single-img__media",
  onOpenLightbox,
  onH2,
} = {}) {
  let imageCursor = 0;

  const parseOptions = {
    replace: (node) => {
      if (node.type !== "tag") return undefined;

      // 1) 投影片
      if (isWpSlideshowNode(node)) {
        const slides = collectSlidesFromNode(node);
        if (!slides.length) return null;
        const startIndex = imageCursor;
        imageCursor += slides.length;
        return (
          <WpSlideshow
            images={slides}
            autoplay={readAutoplay(node)}
            lightboxStartIndex={startIndex}
            onOpenLightbox={onOpenLightbox}
          />
        );
      }

      // 2) 並排圖庫 / 圖庫（獨立幻燈片，不併入整篇文章）
      if (isWpGalleryNode(node)) {
        const mosaic = extractWpMosaicLayout(node);
        const imgs = mosaic?.images?.length
          ? mosaic.images
          : collectImgsFromGalleryNode(node);
        if (!imgs.length) return null;
        const cls = String(node.attribs?.class || "");
        const isWide = /alignwide|alignfull/.test(cls);
        return (
          <WpPhotoWall
            images={imgs}
            isWide={isWide}
            layout="square"
          />
        );
      }

      // 3) 標題（可選）
      if (node.name === "h2" && onH2) {
        return onH2(node, parseOptions);
      }

      // 4) 單張圖（排除已在投影片／圖庫內的）
      if (node.name === "img" && node.attribs?.src) {
        if (isImgInsideWpSlideshow(node) || isImgInsideWpGallery(node)) {
          return null;
        }
        const globalIndex = imageCursor++;
        const orig = normalizeUrl(node.attribs.src);
        const src = cfImgSrc(orig, 960);
        const alt = node.attribs.alt || "";
        const clickable = typeof onOpenLightbox === "function";

        return (
          <div className={imageWrapperClassName}>
            <WpContentImg
              src={src}
              alt={alt}
              className={imageClassName}
              onClick={
                clickable ? () => onOpenLightbox(globalIndex) : undefined
              }
              ariaLabel={`查看圖片 ${globalIndex + 1}`}
            />
          </div>
        );
      }

      // 5) 表格
      if (node.name === "table") {
        const tableProps = attributesToProps(node.attribs || {});
        const mergedClass = ["wp-blog-table", tableProps.className]
          .filter(Boolean)
          .join(" ");
        return (
          <div className="wp-table-wrap wp-compare-wrap my-10 overflow-x-auto">
            <table
              {...tableProps}
              className={mergedClass}
              style={{ ...tableProps.style, display: "table", width: "100%" }}
            >
              {domToReact(node.children, parseOptions)}
            </table>
          </div>
        );
      }

      return undefined;
    },
  };

  return parseOptions;
}
