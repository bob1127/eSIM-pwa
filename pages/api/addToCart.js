export async function addToCart(productId, quantity = 1) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_WP_API_BASE_URL}wp-json/wc/store/Cart/add-item`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // 保持 WooCommerce 的 Session
      body: JSON.stringify({
        id: productId, 
        quantity: quantity,
      }),
    });

    if (!response.ok) throw new Error("加入購物車失敗");
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("加入購物車錯誤:", error);
    return null;
  }
}
