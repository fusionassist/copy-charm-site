// Renders a JSON-LD <script> tag with the given Schema.org payload.
//
// Use this from route components when you want a route to expose
// structured data to search engines and AI crawlers. The payload is
// stringified safely — embedded `</script>` sequences are escaped.

type JsonLdProps = {
  data: Record<string, unknown> | ReadonlyArray<Record<string, unknown>>;
  id?: string;
};

function safeStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data, id }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      {...(id ? { id } : {})}
      dangerouslySetInnerHTML={{ __html: safeStringify(data) }}
    />
  );
}
