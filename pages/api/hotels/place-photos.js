/**
 * 飯店圖片 API
 * - 有 GOOGLE_MAPS_API_KEY：使用 Google Places 照片
 * - 無 API Key：回傳 OpenStreetMap 靜態地圖（不同縮放）作為備援
 */
function osmMapUrls(lat, lng) {
  const base = "https://staticmap.openstreetmap.de/staticmap.php";
  const mk = `markers=${lat},${lng},red-pushpin`;
  return [
    `${base}?center=${lat},${lng}&zoom=15&size=800x600&${mk}`,
    `${base}?center=${lat},${lng}&zoom=17&size=800x600&${mk}`,
  ];
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, lat, lng } = req.query;
  const latN = parseFloat(lat);
  const lngN = parseFloat(lng);

  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
    return res.status(400).json({ error: "Missing lat/lng" });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (!key) {
    return res.status(200).json({
      photos: osmMapUrls(latN, lngN),
      source: "osm-map",
    });
  }

  try {
    const query = encodeURIComponent(`${name || "hotel"} Japan`);
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${latN},${lngN}&radius=3000&key=${key}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    const place = searchData.results?.[0];
    const photoRefs = place?.photos?.slice(0, 3) || [];

    if (photoRefs.length === 0) {
      return res.status(200).json({
        photos: osmMapUrls(latN, lngN),
        source: "osm-map",
      });
    }

    const photos = photoRefs.map(
      (p) =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${key}`,
    );

    return res.status(200).json({
      photos,
      source: "google-places",
      placeName: place.name,
    });
  } catch {
    return res.status(200).json({
      photos: osmMapUrls(latN, lngN),
      source: "osm-map",
    });
  }
}
