import { getDataset, summarize } from "@/lib/data";

export async function GET() {
  const ds = await getDataset();
  return Response.json({
    source: ds.source,
    version: ds.version,
    isMock: ds.isMock,
    species: ds.species,
    ...summarize(ds),
  });
}
