import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { countIssues, detectShape, findIssues, findPage, fromJsonText, listBrokenLinks, listPages } from '../src/dataset.js'

const desktopText = readFileSync(new URL('./fixtures/desktop-export.json', import.meta.url), 'utf8')
const cliText = readFileSync(new URL('./fixtures/cli-result.json', import.meta.url), 'utf8')

describe('shape detection and loading', () => {
  it('recognises both supported shapes and rejects anything else', () => {
    expect(detectShape(JSON.parse(desktopText))).toBe('desktop-export')
    expect(detectShape(JSON.parse(cliText))).toBe('cli-result')
    expect(detectShape({ pages: [] })).toBeNull()
    expect(detectShape('nope')).toBeNull()
    expect(() => fromJsonText('{"foo":1}', 'x.json')).toThrow(/neither a Crawl Cove desktop export/)
    expect(() => fromJsonText('{bad', 'x.json')).toThrow(/not valid JSON/)
  })

  it('maps a desktop export page for page, with no link graph', () => {
    const ds = fromJsonText(desktopText, 'export.json')
    expect(ds.source).toBe('desktop-export')
    expect(ds.pages).toHaveLength(7)
    const home = ds.pages[0]
    expect(home.url).toBe('https://acmebakery.example/')
    expect(home.brokenInternalLinks).toBeNull()
    expect(home.depth).toBe(0)
    expect(home.wordCount).toBe(480)
  })

  it('maps a CLI result and keeps its link graph and robots list', () => {
    const ds = fromJsonText(cliText, 'cli.json')
    expect(ds.source).toBe('cli-result')
    expect(ds.robotsBlocked).toEqual(['https://acme.test/private'])
    expect(ds.pages[0].brokenInternalLinks).toEqual(['https://acme.test/missing'])
    expect(ds.pages[0].depth).toBeNull()
  })
})

describe('issues', () => {
  const ds = fromJsonText(cliText, 'cli.json')

  it('finds every planted issue type once, and skips content checks on broken pages', () => {
    const counts = countIssues(ds)
    expect(counts['broken-page']).toBe(1) // /missing
    expect(counts['missing-title']).toBe(1) // /about only — the 404 is not double-reported
    expect(counts['missing-meta-description']).toBe(1)
    expect(counts['missing-h1']).toBe(1)
    expect(counts['missing-canonical']).toBe(1)
    expect(counts["duplicate-title"]).toBe(2) // "/" and "/blog" share the default "A page"; "/hidden" is noindex and "/old" redirected, so neither competes
    expect(counts.noindex).toBe(1)
    expect(counts['redirect-chain']).toBe(1)
    expect(counts['long-title']).toBe(0)
  })

  it('does not call canonicalised variants or noindex pages duplicate titles', () => {
    const page = (url: string, extra: Record<string, unknown> = {}) => ({
      url, finalUrl: url, statusCode: 200, redirectHops: 0, fetchError: null, title: 'Shop | Harbour Lights', titleLength: 21,
      metaDescription: 'd', metaLength: 1, h1Count: 1, canonical: url, robotsMeta: null, indexable: true, brokenInternalLinks: [], ...extra
    })
    const shop = 'https://acme.test/shop/'
    const result = {
      seedUrl: shop, crawledAt: '2026-11-20T00:00:00.000Z', maxPages: 100, pageCount: 5, truncated: false,
      pages: [
        page(shop),
        page(shop + '?sort=price', { canonical: shop }),
        page(shop + '?colour=blue', { canonical: '/shop/' }),
        page('https://acme.test/old-shop', { robotsMeta: 'noindex', indexable: false }),
        page('https://acme.test/shop-copy')
      ]
    }
    const issues = findIssues(fromJsonText(JSON.stringify(result), 'r.json'), 'duplicate-title')
    expect(issues.map((i) => i.url)).toEqual([shop, 'https://acme.test/shop-copy'])
    expect(issues[0].detail).toBe('"Shop | Harbour Lights" is used on 2 pages')
  })

  it('filters by type and orders by ISSUE_TYPES', () => {
    expect(findIssues(ds, 'noindex')).toEqual([{ type: 'noindex', url: 'https://acme.test/hidden', detail: 'robots meta: noindex, nofollow' }])
    const all = findIssues(ds)
    expect(all[0].type).toBe('broken-page')
  })

  it('flags long titles and long meta descriptions on the desktop export', () => {
    const d = fromJsonText(desktopText, 'export.json')
    const counts = countIssues(d)
    expect(counts['long-title']).toBeGreaterThanOrEqual(1)
    expect(counts['broken-page']).toBeGreaterThanOrEqual(2) // the 404 and the timeout
    expect(findIssues(d, 'broken-page').map((i) => i.detail)).toContain('HTTP 404')
  })
})

describe('lookups', () => {
  const ds = fromJsonText(cliText, 'cli.json')

  it('finds a page exactly, without scheme, or without the trailing slash', () => {
    expect(findPage(ds, 'https://acme.test/about')?.url).toBe('https://acme.test/about')
    expect(findPage(ds, 'acme.test/about/')?.url).toBe('https://acme.test/about')
    expect(findPage(ds, 'https://acme.test/new')?.url).toBe('https://acme.test/old') // by final URL
    expect(findPage(ds, 'https://acme.test/nope')).toBeUndefined()
  })

  it('lists broken links as source → target with the target’s failure, or null without a link graph', () => {
    expect(listBrokenLinks(ds)).toEqual([{ source: 'https://acme.test/', target: 'https://acme.test/missing', detail: 'HTTP 404' }])
    expect(listBrokenLinks(fromJsonText(desktopText, 'x'))).toBeNull()
  })

  it('filters pages', () => {
    expect(listPages(ds, { status: 404 }).map((p) => p.url)).toEqual(['https://acme.test/missing'])
    expect(listPages(ds, { indexable: false })).toHaveLength(2)
    expect(listPages(ds, { urlContains: 'blog' })).toHaveLength(1)
  })
})
