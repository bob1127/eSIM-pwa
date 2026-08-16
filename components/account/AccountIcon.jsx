"use client";

import MaterialIcon from "@/components/MaterialIcon";
import ItsHoverIcon from "@/components/icons/ItsHoverIcon";

/** Material 名稱 → [Its Hover](https://www.itshover.com) catalog id */
const MAP = {
  home: "home",
  storefront: "home",
  dashboard: "globe",
  qr_code_2: "qrcode",
  qr_code_scanner: "qrcode",
  speed: "gauge",
  bolt: "gauge",
  notifications: "bell",
  notifications_active: "bell",
  manage_accounts: "user-check",
  help_center: "info",
  help_outline: "info",
  info: "info",
  admin_panel_settings: "star",
  verified_user: "user-check",
  store: "cart",
  inventory_2: "cart",
  add_shopping_cart: "cart",
  mail: "mail",
  mail_outline: "mail",
  search: "search",
  logout: "logout",
  open_in_new: "external",
  pending: "clock",
  check_circle: "checked",
  policy: "info",
  menu_book: "info",
  payments: "wallet",
  error: "alert",
  warning: "alert",
  download: "download",
  refresh: "refresh",
  sync: "refresh",
  menu: "menu",
  sim_card: "wifi",
  chat: "mail",
  edit: "pen",
  person: "user-check",
  favorite: "heart",
  visibility: "eye",
  credit_card: "card",
  account_balance_wallet: "wallet",
  travel_explore: "globe",
  star: "star",
  wifi: "wifi",
};

export default function AccountIcon({
  name,
  size = 24,
  className = "",
  style,
  color,
  ...props
}) {
  const id = MAP[name];
  if (!id) {
    return (
      <MaterialIcon
        name={name}
        size={size}
        className={className}
        style={style}
        {...props}
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={style}
      aria-hidden={props["aria-label"] ? undefined : true}
    >
      <ItsHoverIcon
        name={id}
        size={size}
        color={color || "currentColor"}
        className="!cursor-pointer"
      />
    </span>
  );
}
