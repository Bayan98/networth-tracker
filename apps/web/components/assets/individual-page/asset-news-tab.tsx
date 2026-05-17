import { ExternalLink } from 'lucide-react'
import type { NewsItem } from '@/lib/hooks/use-asset-news'

export function AssetNewsTab({ news }: { news: NewsItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {news.map((item, index) => (
        <a
          key={index}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            padding: '14px 0',
            borderBottom: index < news.length - 1 ? '1px solid var(--ink-3)' : 'none',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 4, lineHeight: 1.4 }}>
            {item.title}
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--ink-faint)', alignItems: 'center' }}>
            <span>{item.publisher}</span>
            <span>·</span>
            <span>{new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <ExternalLink size={10} style={{ marginLeft: 'auto', color: 'var(--ink-faint)' }} />
          </div>
        </a>
      ))}
    </div>
  )
}
