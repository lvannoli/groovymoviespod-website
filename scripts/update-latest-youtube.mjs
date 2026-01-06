// scripts/update-latest-youtube.mjs
import fs from "node:fs/promises";

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const apiKey = mustGetEnv("YT_API_KEY");
  const channelId = mustGetEnv("YT_CHANNEL_ID");
  const outPath = process.env.OUT_PATH || "latest.json";

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", "3");
  url.searchParams.set("type", "video");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`YouTube API error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  const videos = items.map(it => {
    const id = it?.id?.videoId;
    const sn = it?.snippet || {};
    const title = sn.title || "Episode";
    const publishedAt = sn.publishedAt || null;
    const thumb =
      sn?.thumbnails?.high?.url ||
      sn?.thumbnails?.medium?.url ||
      sn?.thumbnails?.default?.url ||
      (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null);

    return { id, title, thumb, publishedAt };
  }).filter(v => v.id && v.thumb);

  if (!videos.length) throw new Error("No videos returned from API.");

  const payload = {
    generatedAt: new Date().toISOString(),
    channelId,
    videos
  };

  await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`Wrote ${outPath} with ${videos.length} videos.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});