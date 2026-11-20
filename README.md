<a href="https://crawlcove.com/download?utm_source=github&utm_medium=readme&utm_campaign=seo-mcp-server"><img src="https://raw.githubusercontent.com/CrawlCove/.github/main/banners/seo-mcp-server.svg" width="1200" alt="seo-mcp-server: Crawl a site, list SEO issues, inspect pages and find broken links from inside Claude, Cursor and other AI assistants." /></a>

# seo-mcp-server

An **SEO MCP server** for Claude, Cursor, Claude Code and any other MCP client: it crawls your site and answers from the real crawl data. Ask "which pages are missing meta descriptions?", "what links to the 404s?" or "crawl staging and tell me what's wrong" and the assistant calls these tools instead of guessing.

<img src="docs/demo.svg" width="980" alt="Terminal recording: calling the crawl_site tool on the SEO test site returns 80 pages and 10 issues by type">

*The `crawl_site` tool called through the MCP Inspector CLI against [seo-test-site](https://github.com/CrawlCove/seo-test-site), a public site full of planted SEO problems. In Claude or Cursor the assistant makes the same call when you ask it to crawl a site.*

## Quick start

```sh
claude mcp add crawlcove -- npx -y github:CrawlCove/seo-mcp-server
```

Then ask Claude Code: *"Crawl https://crawlcove.github.io/seo-test-site/ and list the broken links with the pages that link to them."* Other clients are below.

## Setup

Requires Node 18+. Nothing to install: MCP clients run the server with `npx` straight from GitHub (the npm package is coming).

**Claude Desktop**, in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "crawlcove": {
      "command": "npx",
      "args": ["-y", "github:CrawlCove/seo-mcp-server"]
    }
  }
}
```

**Claude Code:**

```sh
claude mcp add crawlcove -- npx -y github:CrawlCove/seo-mcp-server
```

**Cursor**, in `.cursor/mcp.json` in your project (or the global one):

```json
{
  "mcpServers": {
    "crawlcove": {
      "command": "npx",
      "args": ["-y", "github:CrawlCove/seo-mcp-server"]
    }
  }
}
```

The first start takes a few seconds while `npx` fetches the package; after that it is cached.

## Tools

| Tool | What it does |
|---|---|
| `crawl_site` `{url, maxPages?, ignoreRobots?}` | Live crawl of a site (same-origin, breadth-first, robots.txt respected), up to **200 pages**. Becomes the active dataset. |
| `load_export` `{path}` | Load a Crawl Cove desktop app JSON export (Reports → Export → JSON) or a `crawlcove-cli` JSON result from disk. No page cap. |
| `get_issues` `{type?, limit?}` | The SEO issues in the active dataset. Types: `broken-page`, `missing-title`, `long-title`, `duplicate-title`, `missing-meta-description`, `long-meta-description`, `missing-h1`, `multiple-h1`, `noindex`, `redirect-chain`, `missing-canonical`. |
| `get_page` `{url}` | Everything recorded about one URL: status, title, meta description, H1 count, canonical, robots, redirect hops, broken links out. |
| `list_broken_links` `{limit?}` | Broken internal links as *source page → broken target*, so you know which page to fix. |
| `list_pages` `{status?, indexable?, urlContains?, limit?}` | Pages with status and title, filtered. |

Things to ask once it is connected:

- "Crawl https://staging.example.com and list every issue."
- "Which pages are missing meta descriptions? Draft one for each."
- "What links to the 404s?"
- "Load ~/Downloads/crawl-export.json and show me the noindex pages."

## Where the data comes from

- **Live crawls** use the same crawler as [seo-crawler-cli](https://github.com/CrawlCove/seo-crawler-cli): same-origin links only, robots.txt honoured (a `User-agent: crawlcove-cli` group is respected over `*`), a hard cap of 200 pages so an assistant cannot accidentally hammer a site. Broken-link *sources* are available because the crawler keeps the link graph.
- **Desktop exports** follow [crawlcove-export-spec](https://github.com/CrawlCove/seo-crawl-export-spec) and carry more per page (depth, word count, content type, X-Robots-Tag-aware indexability) with no page cap, but no link graph, so `list_broken_links` lists the broken pages and points you at the app for inlinks.

## Works with CrawlCove

This server is the assistant-facing half of [Crawl Cove](https://crawlcove.com/?utm_source=github&utm_medium=seo-mcp-server), the desktop SEO crawler. For anything past 200 pages, for history over time, for Search Console data next to the crawl, or to fix findings in bulk, run the crawl in the desktop app and hand its export to `load_export`.

This repo has its own page on crawlcove.com: [Crawl Cove MCP server](https://crawlcove.com/open-source/crawlcove-mcp?utm_source=github&utm_medium=seo-mcp-server).

## Development

```sh
npm ci && npm run build && npm test
```

`dist/` is committed (it is what `npx github:…` runs); CI fails if it is stale. The server logic is in `src/server.ts`; the pure dataset layer (`src/dataset.ts`) has no MCP dependency and is exported for scripting.

## Related tools

<!-- related:start, kept in step by CrawlCove/.github scripts/related.mjs -->
| Repo | What it does |
|---|---|
| [seo-crawler-cli](https://github.com/CrawlCove/seo-crawler-cli) | Crawl a site from a script or CI. Checks status codes, redirect chains, titles, meta descriptions, H1s, canonicals, noindex and broken links, and fails the build on regressions. |
| [seo-audit-action](https://github.com/CrawlCove/seo-audit-action) | Crawl a staging or preview URL on every pull request. Fails the check on broken links, missing titles, noindex and redirect chains, with the details as a PR comment. |
| [claude-seo-plugin](https://github.com/CrawlCove/claude-seo-plugin) | Seven SEO skills for Claude Code backed by a real site crawl: audits, broken links, redirects, titles and fixes, from a chat. |
| [seo-chrome-extension](https://github.com/CrawlCove/seo-chrome-extension) | On-page SEO checker with an AI visibility report: which AI crawlers can read the page, snippet blocks, llms.txt and extractability. Nothing leaves the browser. |
| [xml-sitemap-validator](https://github.com/CrawlCove/xml-sitemap-validator) | Check a sitemap or sitemap index against the sitemaps.org protocol and search engine limits. Flags bad URLs, lastmod dates and cross-host entries. |
| [robots-txt-tester](https://github.com/CrawlCove/robots-txt-tester) | Fetch and lint a robots.txt, test which URLs each crawler may fetch and see the deciding line. Fails deploys that block the site. |
| [redirect-chain-checker](https://github.com/CrawlCove/redirect-chain-checker) | Follow every hop of a URL's redirects and flag chains, loops, HTTPS downgrades, meta refreshes and redirects to error pages. |
| [hreflang-checker](https://github.com/CrawlCove/hreflang-checker) | Validate the hreflang tags on a page or across a whole XML sitemap, including self-reference, x-default and return tags. |
| [schema-markup-validator](https://github.com/CrawlCove/schema-markup-validator) | Check every schema.org node on a page against the required and recommended properties for rich results. |
| [seo-test-site](https://github.com/CrawlCove/seo-test-site) | A deliberately broken SEO test site with every planted problem and its expected finding listed, for testing any SEO crawler. |
| [seo-crawl-export-spec](https://github.com/CrawlCove/seo-crawl-export-spec) | An open format for site crawl data: JSON Schema and CSV column reference, with a real sample export and a validator script. |
| [seo-crawl-export-js](https://github.com/CrawlCove/seo-crawl-export-js) | Load, query and convert site crawl data in JavaScript and TypeScript, with typed pages, issues by type and status filters. |
| [screaming-frog-export-converter](https://github.com/CrawlCove/screaming-frog-export-converter) | Turn an SEO Spider internal_all.csv into the open JSON crawl export format, with a report of which columns carried over. |
| [seo-audit-google-sheets](https://github.com/CrawlCove/seo-audit-google-sheets) | An Apps Script add-on that turns a site crawl export into an audit workbook: pages, issues by type, pages by status and title and meta flags. |
| [wordpress-seo-connector](https://github.com/CrawlCove/wordpress-seo-connector) | Bulk-apply fixes from the Crawl Cove desktop crawler to Yoast SEO, Rank Math, SEOPress or AIOSEO, with a change log and one-click revert. |
<!-- related:end -->

## License

MIT, see [LICENSE](LICENSE).
