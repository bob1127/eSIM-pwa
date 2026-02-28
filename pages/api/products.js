export const config = {
  runtime: "edge", // 明确标示为 Edge 函数
};

export default async function handler(req) {
  try {
    const { NEXT_PUBLIC_WP_API_BASE_URL, NEXT_PUBLIC_WC_CONSUMER_KEY, NEXT_PUBLIC_WC_CONSUMER_SECRET } = process.env;

    // 确保环境变量存在
    if (!NEXT_PUBLIC_WP_API_BASE_URL || !NEXT_PUBLIC_WC_CONSUMER_KEY || !NEXT_PUBLIC_WC_CONSUMER_SECRET) {
      console.error('缺少必要的环境变量');
      return new Response(
        JSON.stringify({ error: '环境变量未正确配置' }),
        { status: 500 }
      );
    }

    // 获取请求中的分类 slug 参数
    const url = new URL(req.url);
    const slug = url.searchParams.get('category'); // 获取查询参数 `category`

    // 确保 slug 存在
    if (!slug) {
      return new Response(
        JSON.stringify({ error: "Category slug is required" }),
        { status: 400 }
      );
    }

    // 获取当前时间戳，避免缓存
    const timestamp = new Date().getTime();

    // 获取分类 ID：首先获取分类列表
    const categoriesUrl = `${NEXT_PUBLIC_WP_API_BASE_URL}/wp-json/wc/v3/products/categories?consumer_key=${NEXT_PUBLIC_WC_CONSUMER_KEY}&consumer_secret=${NEXT_PUBLIC_WC_CONSUMER_SECRET}`;

    // 获取分类数据
    const categoriesResponse = await fetch(categoriesUrl);
    
    if (!categoriesResponse.ok) {
      const errorText = await categoriesResponse.text();
      console.error("API 请求分类数据失败，返回的错误信息:", errorText);
      return new Response(
        JSON.stringify({ error: `获取分类数据失败: ${errorText}` }),
        { status: 500 }
      );
    }

    const categories = await categoriesResponse.json();

    // 查找匹配的分类 ID
    const category = categories.find(cat => cat.slug === slug);

    if (!category) {
      return new Response(
        JSON.stringify({ error: `未找到分类 "${slug}"` }),
        { status: 404 }
      );
    }

    // 通过分类 ID 获取产品
    const productsUrl = `${NEXT_PUBLIC_WP_API_BASE_URL}/wp-json/wc/v3/products?consumer_key=${NEXT_PUBLIC_WC_CONSUMER_KEY}&consumer_secret=${NEXT_PUBLIC_WC_CONSUMER_SECRET}&category=${category.id}&timestamp=${timestamp}&per_page=100`;

    // 打印请求的 URL，确保 URL 正确
    console.log('请求产品的 URL:', productsUrl);

    // 使用 fetch 获取产品数据
    const response = await fetch(productsUrl);
    
    // 如果 response 不是 OK，则输出详细的错误信息
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API 请求失败，返回的错误信息:", errorText);
      return new Response(
        JSON.stringify({ error: `请求产品数据失败: ${errorText}` }),
        { status: 500 }
      );
    }

    // 获取响应数据
    const products = await response.json();
    console.log('获取到的产品数据:', products);

    // 如果没有产品，返回一个提示
    if (products.length === 0) {
      console.log('没有找到符合条件的产品。');
    }

    // 返回筛选后的产品数据
    return new Response(JSON.stringify(products), { status: 200 });
  } catch (error) {
    // 捕获错误并返回错误信息
    console.error('获取产品时发生错误:', error.message);
    return new Response(
      JSON.stringify({ error: `获取产品失败: ${error.message}` }),
      { status: 500 }
    );
  }
}
