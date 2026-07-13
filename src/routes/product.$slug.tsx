import { createFileRoute, notFound } from "@tanstack/react-router";

import { ProductPage } from "@/components/blocks/ProductPage";
import { getProduct, getProductComponent } from "@/lib/mdx";

// Dynamic product route for MDX-backed products in src/content/products/.
//
// Runtime precedence (production): the wp-mirror is served first, so legacy
// /product/<slug>/ URLs that still have a mirror snapshot are handled there.
// Brand-new slugs (no mirror file) fall through to this TanStack route. New
// products also appear automatically in /sitemap.xml and /api/products.json
// via the runtime frontmatter loader in start-node.mjs.

const SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://interactivedisplays.ie";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) return {};
    const base = SITE_URL.replace(/\/+$/, "");
    const canonical = `${base}/product/${product.slug}`;
    const image = product.heroImage.startsWith("http")
      ? product.heroImage
      : `${base}${product.heroImage}`;
    return {
      meta: [
        { title: product.metaTitle },
        { name: "description", content: product.metaDescription },
        { property: "og:title", content: product.metaTitle },
        { property: "og:description", content: product.metaDescription },
        { property: "og:type", content: "product" },
        { property: "og:url", content: canonical },
        { property: "og:image", content: image },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: ProductRoute,
});

function ProductRoute() {
  const { slug } = Route.useParams();
  const product = getProduct(slug);
  const Body = getProductComponent(slug);
  if (!product || !Body) throw notFound();
  return <ProductPage product={product} Body={Body} />;
}
