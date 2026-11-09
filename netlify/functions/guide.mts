import type { Config } from "@netlify/functions";

// GET /api/guide?p=<slug>   header x-guest-code: <code> (optional)
// Reads Properties + Topics from Airtable. Token never leaves the server.
// Private topics come back as title-only unless the guest code matches.

const API = "https://api.airtable.com/v0";

async function at(path: string, token: string) {
  const r = await fetch(`${API}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Airtable ${r.status}: ${await r.text()}`);
  return r.json();
}

async function all(base: string, table: string, params: URLSearchParams, token: string) {
  const out: any[] = [];
  let offset = "";
  do {
    if (offset) params.set("offset", offset);
    const j = await at(`${base}/${encodeURIComponent(table)}?${params}`, token);
    out.push(...j.records);
    offset = j.offset || "";
  } while (offset);
  return out;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const photos = (a: any[] = []) =>
  a.filter((x) => (x.type || "image/").startsWith("image/")).map((x) => ({
    url: x.thumbnails?.full?.url || x.url,
    thumb: x.thumbnails?.large?.url || x.url,
    w: x.width, h: x.height,
  }));
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export default async (req: Request) => {
  const token = Netlify.env.get("AIRTABLE_TOKEN");
  const base = Netlify.env.get("AIRTABLE_BASE_ID");
  if (!token || !base) return json({ error: "Guide not configured (AIRTABLE_TOKEN / AIRTABLE_BASE_ID missing)." }, 503);

  const slug = (new URL(req.url).searchParams.get("p") || Netlify.env.get("DEFAULT_PROPERTY") || "").trim().toLowerCase();
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return json({ error: "Unknown guide." }, 404);

  try {
    const props = await all(base, "Properties",
      new URLSearchParams({ filterByFormula: `AND(LOWER({Slug})='${esc(slug)}',{Active})`, maxRecords: "1" }), token);
    if (!props.length) return json({ error: "Unknown guide." }, 404);
    const p = props[0].fields;

    const given = (req.headers.get("x-guest-code") || "").trim().toLowerCase();
    const real = String(p["Guest Code"] || "").trim().toLowerCase();
    const unlocked = !!real && given === real;
    if (given && !unlocked) await new Promise((r) => setTimeout(r, 800)); // slow down guessing

    const params = new URLSearchParams({
      filterByFormula: `AND({Published},FIND('|${esc(p.Name)}|','|'&ARRAYJOIN({Property},'|')&'|'))`,
    });
    params.append("sort[0][field]", "Order");
    const recs = await all(base, "Topics", params, token);

    const topics = recs.map((r) => {
      const f = r.fields;
      const locked = !!f.Private && !unlocked;
      return {
        id: r.id,
        title: f.Title || "",
        section: f.Section || "Other",
        subsection: f.Subsection || "",
        order: f.Order ?? 999,
        private: !!f.Private,
        locked,
        body: locked ? "" : f.Body || "",
        photos: locked ? [] : photos(f.Photos),
        video: locked ? "" : f["Video URL"] || "",
      }; // "Notes for Host" is deliberately never returned
    });

    return json({
      property: {
        name: p.Name, address: p.Address || "", lat: p.Latitude ?? null, lng: p.Longitude ?? null,
        hostName: p["Host Name"] || "", hostPhone: p["Host Phone"] || "", hostEmail: p["Host Email"] || "",
        accent: p["Accent Color"] || "#1F7A8C", cover: photos(p["Cover Photo"])[0] || null,
        hasCode: !!real,
      },
      unlocked,
      topics,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Could not load the guide right now." }, 502);
  }
};

export const config: Config = {
  path: "/api/guide",
  method: "GET",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
