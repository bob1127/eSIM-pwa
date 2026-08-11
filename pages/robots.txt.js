import { SITE_URL } from "../lib/seo.config";

export default function Robots() {}

export async function getServerSideProps({ res }) {
  const body = `User-agent: *
Allow: /
Allow: /p/
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /checkout
Disallow: /Cart
Disallow: /cart
Disallow: /login
Disallow: /my-account
Disallow: /my-esim
Disallow: /account
Disallow: /partner/
Disallow: /test
Disallow: /pending
Disallow: /thank-you
Disallow: /reset-password
Disallow: /profile
Disallow: /wizard
Disallow: /linepay
Disallow: /ecpay

# 夥伴賣場私密頁（公開賣場／商品／文章可索引，與主站 SEO 互聯）
Disallow: /*/account
Disallow: /*/cart
Disallow: /*/login

Sitemap: ${SITE_URL}/sitemap.xml
`;

  res.setHeader("Content-Type", "text/plain");
  res.write(body);
  res.end();

  return { props: {} };
}
