/**
 * LINE Pay 一站結帳：地址／運費準備 + 呼叫 Medusa linepay-checkout
 * （前端只打這支，少一次瀏覽器往返）
 */
import type { NextApiRequest, NextApiResponse } from "next"
import {
  linkCartToReferral,
  resolveActiveReferralPartner,
} from "../../../lib/resolveReferralPartner"
import { getVerifiedReferralCodeFromRequest } from "../../../lib/referralSignature"
import {
  cartItemsToPlanChecks,
  validatePlansAvailability,
} from "../../../lib/esim/planAvailability"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" })
  }

  const { cartId, orderInfo } = req.body || {}
  if (!cartId) {
    return res.status(400).json({ success: false, message: "缺少 cartId" })
  }

  const MEDUSA_URL = (
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  ).replace(/\/$/, "")
  const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
  }

  const parseMedusaError = (data: any) => {
    if (!data) return "未知錯誤"
    if (data.message) return data.message
    if (Array.isArray(data.errors) && data.errors[0]?.message) {
      return data.errors[0].message
    }
    return JSON.stringify(data)
  }

  const fetchMedusa = async (stepName: string, url: string, options: RequestInit = {}) => {
    const response = await fetch(url, options)
    const text = await response.text()
    let data: any
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      throw Object.assign(new Error(`[${stepName}] Medusa 回傳格式錯誤。`), {
        code: "MEDUSA_PARSE",
      })
    }
    if (!response.ok) {
      const detail = parseMedusaError(data)
      const err: any = new Error(`[${stepName}] 失敗: ${detail}`)
      if (
        detail.toLowerCase().includes("already completed") ||
        detail.includes("已完成")
      ) {
        err.code = "CART_COMPLETED"
      }
      throw err
    }
    return data
  }

  try {
    // 1) 一次抓 cart：檢查是否已結帳 + 是否已有運費
    const cartCheck = await fetchMedusa(
      "取得購物車",
      `${MEDUSA_URL}/store/carts/${cartId}?fields=*items,*items.metadata,*items.variant,*items.variant.sku,*items.variant.metadata,*items.product`,
      { headers },
    )
    if (cartCheck.cart?.completed_at) {
      return res.status(400).json({
        success: false,
        code: "CART_COMPLETED",
        message:
          "此購物車已完成結帳，請重新整理頁面後再試（系統會自動建立新購物車）。",
      })
    }

    // 供應商目錄核對：已下架／幽靈舊名會被 planMap 偷換成別的貨 → 禁止付款
    const planCheck = await validatePlansAvailability(
      cartItemsToPlanChecks(cartCheck.cart?.items || []),
    )
    if (!planCheck.ok) {
      return res.status(409).json({
        success: false,
        code: planCheck.code || "PLAN_UNAVAILABLE",
        message: planCheck.message,
        invalid: planCheck.invalid,
      })
    }

    const addressPayload = {
      first_name: orderInfo?.name || "eSIM",
      last_name: orderInfo?.name || "Customer",
      address_1:
        String(orderInfo?.address || "").trim() ||
        "eSIM digital delivery (no shipping)",
      city: String(orderInfo?.city || "").trim() || "Taipei",
      country_code: "tw",
      postal_code: String(orderInfo?.postalCode || "").trim() || "100",
      phone: orderInfo?.phone || "",
    }

    const referralCode = getVerifiedReferralCodeFromRequest(req)
    // 推薦綁定與地址更新可平行（彼此不依賴）
    const referralPromise = (async () => {
      if (!referralCode) return
      const refPartner = await resolveActiveReferralPartner(referralCode)
      if (refPartner) await linkCartToReferral(cartId, refPartner, referralCode)
    })()

    await Promise.all([
      referralPromise,
      fetchMedusa("更新地址", `${MEDUSA_URL}/store/carts/${cartId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: orderInfo?.email,
          shipping_address: addressPayload,
          billing_address: addressPayload,
          ...(referralCode
            ? { metadata: { jeko_referral_code: referralCode } }
            : {}),
        }),
      }),
    ])

    const hasShipping = (cartCheck.cart?.shipping_methods || []).length > 0
    if (!hasShipping) {
      const shipOptionsData = await fetchMedusa(
        "取得運費選項",
        `${MEDUSA_URL}/store/shipping-options?cart_id=${cartId}`,
        { headers },
      )
      const optionId = shipOptionsData.shipping_options?.[0]?.id
      if (!optionId) {
        throw Object.assign(
          new Error(
            "無可用運費：請在 Medusa 後台為台灣區設定「eSIM Digital Delivery」免運方案。",
          ),
          { code: "NO_SHIPPING" },
        )
      }
      await fetchMedusa(
        "套用運費",
        `${MEDUSA_URL}/store/carts/${cartId}/shipping-methods`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ option_id: optionId }),
        },
      )
    }

    // 2) 同一支 API 內呼叫 Medusa LINE Pay（不再回瀏覽器再打一次）
    const backendRes = await fetch(`${MEDUSA_URL}/store/linepay-checkout`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        cart_id: cartId,
        orderInfo: orderInfo || {},
      }),
    })
    const data = await backendRes.json().catch(() => ({}))
    if (!backendRes.ok || !data?.success || !data?.paymentUrl) {
      return res.status(backendRes.status || 400).json({
        success: false,
        message: data?.message || "LINE Pay 建單失敗",
        detail: data,
      })
    }

    return res.status(200).json(data)
  } catch (error: any) {
    const status = error?.code === "CART_COMPLETED" ? 400 : 500
    return res.status(status).json({
      success: false,
      code: error?.code || "CHECKOUT_ERROR",
      message: error?.message || "LINE Pay 結帳失敗",
    })
  }
}
