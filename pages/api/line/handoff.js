import { createLineHandoff, getLineHandoff } from "../../../lib/lineHandoffStore";

export default function handler(req, res) {
  if (req.method === "POST") {
    const text = req.body?.text;
    const id = createLineHandoff(text);
    return res.status(200).json({ ok: true, id });
  }

  if (req.method === "GET") {
    const id = req.query?.id;
    const text = getLineHandoff(id);
    if (!text) {
      return res.status(404).json({ ok: false, error: "轉介已過期，請回網站重新產生" });
    }
    return res.status(200).json({ ok: true, text });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
