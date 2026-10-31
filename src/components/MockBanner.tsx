import type { Dataset } from "@/lib/data/types";

export function MockBanner({ dataset }: { dataset: Dataset }) {
  if (!dataset.isMock) return null;
  return (
    <p className="banner">
      <strong>Mock data.</strong> Tardimap&rsquo;s reconstruction isn&rsquo;t public yet, so these numbers come from an
      illustrative dataset (<code>{dataset.version}</code>). The app reads data through an adapter, so real data drops
      in without changing the pages.
    </p>
  );
}
