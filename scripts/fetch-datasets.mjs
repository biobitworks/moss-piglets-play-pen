// Fetch public starter datasets and normalise them into data/datasets/<id>/neurons.json.
//   npm run data:fetch                 # all datasets
//   npm run data:fetch -- celegans     # one dataset (prefix match)
// Each output file has { id, fetchedAt, source, neurons: [...], edges?: [[pre, post, weight, kind], ...] }.
// Large files are gitignored; C. elegans is small and committed so the app works offline.
// See docs/DATASETS.md for what each dataset is and why it is here.
import { mkdirSync, writeFileSync } from "node:fs";

const RAW = "https://raw.githubusercontent.com";
const OUT = new URL("../data/datasets/", import.meta.url);

function parseDelimited(text, sep) {
  // Small RFC 4180 parser: handles quoted fields with separators and doubled quotes.
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === sep) row.push(field), (field = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += c;
  }
  if (field || row.length) row.push(field), rows.push(row);
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null && !(typeof v === "number" && Number.isNaN(v))));

const DATASETS = {
  async "celegans-hermaphrodite"() {
    // Cook et al. 2019 hermaphrodite connectome as packaged by OpenWorm c302 (chemical + electrical, with weights).
    const url = `${RAW}/openworm/c302/master/c302/data/herm_full_edgelist.csv`;
    const rows = parseDelimited(await get(url), ",");
    const kindOf = (n) => (/^(BWM|dBWM|vBWM|pm\d|mc\d|g\d|e\d|hmc|um|vm|intmu|anal|sph|mu_)/i.test(n) ? "muscle/other" : "neuron");
    const ids = new Map();
    const edges = [];
    for (const r of rows) {
      const a = r.Source.trim(), b = r.Target.trim(), w = Number(r.Weight) || 1;
      if (!a || !b) continue;
      for (const x of [a, b]) if (!ids.has(x)) ids.set(x, { id: x, name: x, class: x.replace(/(L|R|\d+|DL|DR|VL|VR)$/, ""), kind: kindOf(x) });
      edges.push([a, b, w, r.Type.trim()]);
    }
    return { source: url, neurons: [...ids.values()], edges };
  },
  async "flywire-fafb"() {
    // FlyWire whole-brain neuron annotations (Schlegel et al. 2024 / Dorkenwald et al. 2024), one row per neuron.
    const url = `${RAW}/flyconnectome/flywire_annotations/main/supplemental_files/Supplemental_file1_neuron_annotations.tsv`;
    const rows = parseDelimited(await get(url), "\t");
    const neurons = rows.map((r) =>
      clean({
        id: r.root_id, name: r.cell_type || r.hemibrain_type || undefined, type: r.cell_type || r.hemibrain_type || undefined,
        super_class: r.super_class, class: r.cell_class, sub_class: r.cell_sub_class, flow: r.flow, side: r.side,
        nt: r.top_nt, nt_conf: r.top_nt_conf ? +(+r.top_nt_conf).toFixed(2) : undefined, hemilineage: r.ito_lee_hemilineage,
        hemibrain_type: r.hemibrain_type, fbbt_id: r.fbbt_id, nerve: r.nerve,
        soma: r.soma_x ? [+r.soma_x, +r.soma_y, +r.soma_z] : undefined,
      }),
    );
    return { source: url, neurons };
  },
  async "hemibrain"() {
    // Hemibrain v1.2.1 neuron metadata as matched to FlyWire (includes pre/post synapse counts per neuron).
    const url = `${RAW}/flyconnectome/flywire_annotations/main/supplemental_files/Supplemental_file5_hemibrain_meta.csv`;
    const rows = parseDelimited(await get(url), ",");
    const neurons = rows.map((r) =>
      clean({ id: r.bodyId, name: r.instance, type: r.type, class: r.cell_class, hemilineage: r.ito_lee_hemilineage, side: r.side, cbf: r.cellBodyFiber, pre: +r.pre, post: +r.post, fbbt_id: r.fbbt_id, cropped: r.cropped === "True" || undefined }),
    );
    return { source: url, neurons };
  },
};

const only = process.argv[2];
for (const [id, load] of Object.entries(DATASETS)) {
  if (only && !id.startsWith(only)) continue;
  const t = Date.now();
  try {
    const d = await load();
    const dir = new URL(`${id}/`, OUT);
    mkdirSync(dir, { recursive: true });
    writeFileSync(new URL("neurons.json", dir), JSON.stringify({ id, fetchedAt: new Date().toISOString(), ...d }));
    console.log(`${id}: ${d.neurons.length} neurons${d.edges ? `, ${d.edges.length} edges` : ""} in ${Date.now() - t} ms`);
  } catch (e) {
    console.error(`${id}: FAILED ${e.message}`);
    process.exitCode = 1;
  }
}
