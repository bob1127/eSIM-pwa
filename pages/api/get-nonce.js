export default async function handler(req, res) {
  try {
    const response = await fetch("https://starislandbaby.com/test/wp-admin/admin-ajax.php?action=generate_nonce", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch nonce" });
    }

    const data = await response.json();
    if (!data.success) {
      return res.status(500).json({ error: "Failed to retrieve nonce" });
    }

    return res.status(200).json({ nonce: data.data.nonce });
  } catch (error) {
    console.error("Error fetching nonce:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
