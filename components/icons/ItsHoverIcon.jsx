"use client";

import AirplaneIcon from "./airplane-icon";
import CameraIcon from "./camera-icon";
import ClockIcon from "./clock-icon";
import CreditCardIcon from "./credit-card-icon";
import EyeIcon from "./eye-icon";
import FacebookIcon from "./facebook-icon";
import FilledBellIcon from "./filled-bell-icon";
import GlobeIcon from "./globe-icon";
import HeartIcon from "./heart-icon";
import HomeIcon from "./home-icon";
import InfoCircleIcon from "./info-circle-icon";
import InstagramIcon from "./instagram-icon";
import MapPinIcon from "./map-pin-icon";
import StarIcon from "./star-icon";
import TriangleAlertIcon from "./triangle-alert-icon";
import UserCheckIcon from "./user-check-icon";
import UserPlusIcon from "./user-plus-icon";
import WalletIcon from "./wallet-icon";
import WifiIcon from "./wifi-icon";
import {
  CartIcon,
  CheckedIcon,
  DownloadIcon,
  ExternalLinkIcon,
  GaugeIcon,
  GearIcon,
  LogoutIcon,
  MailIcon,
  MenuIcon,
  PenIcon,
  QrcodeIcon,
  RefreshIcon,
  SearchIcon,
} from "./account-set";

/** [Its Hover](https://www.itshover.com) 動態圖示，供文章元件挑選 */
export const ITS_HOVER_CATALOG = [
  { id: "airplane", label: "飛機", Component: AirplaneIcon },
  { id: "globe", label: "地球", Component: GlobeIcon },
  { id: "map-pin", label: "地標", Component: MapPinIcon },
  { id: "wifi", label: "Wi-Fi", Component: WifiIcon },
  { id: "camera", label: "相機", Component: CameraIcon },
  { id: "home", label: "住宿", Component: HomeIcon },
  { id: "star", label: "星星", Component: StarIcon },
  { id: "heart", label: "愛心", Component: HeartIcon },
  { id: "eye", label: "瀏覽", Component: EyeIcon },
  { id: "clock", label: "時鐘", Component: ClockIcon },
  { id: "info", label: "資訊", Component: InfoCircleIcon },
  { id: "alert", label: "提醒", Component: TriangleAlertIcon },
  { id: "bell", label: "通知", Component: FilledBellIcon },
  { id: "wallet", label: "錢包", Component: WalletIcon },
  { id: "card", label: "信用卡", Component: CreditCardIcon },
  { id: "instagram", label: "Instagram", Component: InstagramIcon },
  { id: "facebook", label: "Facebook", Component: FacebookIcon },
  { id: "user-plus", label: "追蹤", Component: UserPlusIcon },
  { id: "user-check", label: "已追蹤", Component: UserCheckIcon },
  { id: "gear", label: "設定", Component: GearIcon },
  { id: "qrcode", label: "QR", Component: QrcodeIcon },
  { id: "cart", label: "購物車", Component: CartIcon },
  { id: "logout", label: "登出", Component: LogoutIcon },
  { id: "download", label: "下載", Component: DownloadIcon },
  { id: "checked", label: "完成", Component: CheckedIcon },
  { id: "search", label: "搜尋", Component: SearchIcon },
  { id: "mail", label: "郵件", Component: MailIcon },
  { id: "menu", label: "選單", Component: MenuIcon },
  { id: "gauge", label: "流量", Component: GaugeIcon },
  { id: "external", label: "外開", Component: ExternalLinkIcon },
  { id: "refresh", label: "重新整理", Component: RefreshIcon },
  { id: "pen", label: "編輯", Component: PenIcon },
];

export const ITS_HOVER_ICON_IDS = ITS_HOVER_CATALOG.map((item) => item.id);

export default function ItsHoverIcon({
  name = "airplane",
  size = 32,
  color = "currentColor",
  className = "",
  strokeWidth = 2,
}) {
  const item = ITS_HOVER_CATALOG.find((i) => i.id === name) || ITS_HOVER_CATALOG[0];
  const Icon = item.Component;
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}
