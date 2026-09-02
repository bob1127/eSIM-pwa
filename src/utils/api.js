import { clientError } from "@/lib/clientLogger";

export async function addToCart(productId, quantity) {
  try {
    const res = await fetch("/api/Cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, quantity }),
    });

    const data = await res.json();
    if (!res.ok) {
      clientError("❌ 加入購物車失敗:", data);
      return null;
    }
    return data;
  } catch (error) {
    clientError("API Error:", error);
    return null;
  }
}
