import PartnerStoreMemberAccount from "@/components/account/PartnerStoreMemberAccount";
import { fetchActiveStoreByDomain } from "@/lib/partnerStorefront";

/**
 * 夥伴賣場會員中心 /p/{slug}/account/
 * — 共用主站旅客會員 views，鎖死 customer（無 Boss／夥伴後台）
 */
export default function PartnerCustomerAccount({ store }) {
  return <PartnerStoreMemberAccount store={store} />;
}

export async function getServerSideProps(context) {
  const { partnerSlug } = context.params;
  const store = await fetchActiveStoreByDomain(partnerSlug);
  if (!store) return { notFound: true };
  return { props: { store: JSON.parse(JSON.stringify(store)) } };
}
