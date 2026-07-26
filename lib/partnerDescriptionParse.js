export function parsePartnerType(description) {
  if (!description) return "—";
  const match = description.match(/【合作類型】(.*?)(?:\n|$)/);
  return match ? match[1].trim() : "—";
}

export function parseCooperationModel(description, partner) {
  if (partner?.cooperation_model === "referral") return "專屬推薦連結";
  if (partner?.cooperation_model === "store") return "專屬賣場";
  if (!description) return "—";
  const match = description.match(/【合作模式】(.*?)(?:\n|$)/);
  return match ? match[1].trim() : "專屬賣場";
}

export function parseDescriptionField(description, key) {
  if (!description) return null;
  const re = new RegExp(`【${key}】(.*?)(?:\\n|$)`);
  const match = description.match(re);
  return match ? match[1].trim() : null;
}
