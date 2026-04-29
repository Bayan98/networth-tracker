'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { Upload, Plus, Sparkles, Copy, Check, ChevronDown, FileText } from 'lucide-react'
import { parseAndVerify } from '@networth/utils'
import type { ParsedRow, ImportRow } from '@networth/utils'
import type { Portfolio } from '@networth/types'
import { AddPortfolioDialog } from '@/components/assets/add-portfolio-dialog'
import { Dialog } from '@/components/ui/dialog'
import { importAssets } from '@/app/(main)/settings/actions'
import type { ImportResult } from '@/app/(main)/settings/actions'

type ProviderKey = 'csv' | 'manual'

const PROVIDERS: { id: ProviderKey; name: string; sub: string; icon: React.ReactNode }[] = [
  { id: 'csv',    name: 'CSV file',     sub: 'Upload a statement file', icon: <Upload size={16} /> },
  { id: 'manual', name: 'Manual entry', sub: 'Paste or type rows',      icon: <Plus size={16} /> },
]

const TEMPLATE_CSV = [
  'asset_name,symbol,asset_type,currency,transaction_type,quantity,price,date,notes',
  'Apple Inc,AAPL,stock,USD,buy,10,145.00,2024-01-15,',
  'Bitcoin,BTC,crypto,USD,buy,0.5,42000.00,2024-02-01,',
  'My Apartment,,real_estate,USD,,1,450000,2024-03-01,NYC property',
].join('\n')

const AI_PROMPT = `Convert the data I'll provide into this exact CSV format for a portfolio tracker. Output ONLY the CSV, no explanation.

Required columns (in this order):
asset_name,symbol,asset_type,currency,transaction_type,quantity,price,date,notes

Rules:
- asset_type must be one of: stock, bond, etf, crypto, mutual_fund, real_estate, cash, commodity, deposit, transport, business, other
- transaction_type must be one of: buy, sell, dividend, deposit, withdrawal, split — or leave blank for assets with a manual price only
- If transaction_type is blank, put the current value in the price column (treated as manual price)
- date must be YYYY-MM-DD — if unknown, use today's date
- currency must be a 3-letter ISO code (e.g. USD, EUR, GBP) — default to USD if unknown
- quantity and price must be plain numbers without currency symbols or commas
- Do NOT include a portfolio column

Example output:
asset_name,symbol,asset_type,currency,transaction_type,quantity,price,date,notes
Apple Inc,AAPL,stock,USD,buy,10,145.00,2024-01-15,
Bitcoin,BTC,crypto,USD,buy,0.5,42000.00,2024-02-01,
My Apartment,,real_estate,USD,,1,450000,2024-03-01,NYC property

Here is my data:
[PASTE YOUR DATA HERE — screenshots, PDFs, Excel exports, brokerage statements, or plain text all work]`

interface Props {
  portfolios: Portfolio[]
  userId: string
}

export function ImportAssets({ portfolios, userId }: Props) {
  const [selected, setSelected] = useState<ProviderKey>('csv')
  const [dragOver, setDragOver] = useState(false)
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [manualText, setManualText] = useState('')
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
  const [showNewPortfolio, setShowNewPortfolio] = useState(false)
  const [verifyResult, setVerifyResult] = useState<ParsedRow[] | null>(null)
  const [showAiPrompt, setShowAiPrompt] = useState(false)
  const [copied, setCopied] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileSelect(file: File) {
    setCsvFileName(file.name)
    setVerifyResult(null)
    setImportDone(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      setVerifyResult(parseAndVerify(e.target?.result as string))
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  function handleVerify() {
    setImportDone(null)
    setVerifyResult(parseAndVerify(manualText))
  }

  async function handleImport() {
    if (!verifyResult) return
    const validRows = verifyResult.filter(r => r.errors.length === 0) as ImportRow[]
    if (validRows.length === 0) return

    setImporting(true)
    try {
      const result = await importAssets(validRows, selectedPortfolioId)
      setImportDone(result)
    } catch (e) {
      setImportDone({
        assetsCreated: 0,
        transactionsCreated: 0,
        errors: [e instanceof Error ? e.message : 'Import failed'],
      })
    } finally {
      setImporting(false)
    }
  }

  function copyPrompt() {
    navigator.clipboard.writeText(AI_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function resetSource() {
    setVerifyResult(null)
    setImportDone(null)
    setCsvFileName(null)
    setManualText('')
  }

  const validRows = verifyResult?.filter(r => r.errors.length === 0) ?? []
  const errorRows = verifyResult?.filter(r => r.errors.length > 0) ?? []

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Import assets</h3>
            <div className="sub">Bring in holdings from a file or paste rows.</div>
          </div>
        </div>

        {/* Portfolio selector */}
        <div style={{ marginBottom: 20 }}>
          <div className="empty-label" style={{ marginBottom: 8 }}>Add to portfolio</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                value={selectedPortfolioId ?? ''}
                onChange={(e) => setSelectedPortfolioId(e.target.value || null)}
                style={{
                  appearance: 'none',
                  padding: '7px 28px 7px 10px',
                  fontSize: 13,
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: selectedPortfolioId ? 'var(--ink)' : 'var(--ink-faint)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  minWidth: 180,
                }}
              >
                <option value="">No portfolio</option>
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 8, pointerEvents: 'none', color: 'var(--ink-faint)' }} />
            </div>
            <button
              onClick={() => setShowNewPortfolio(true)}
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Plus size={12} /> New portfolio
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 18 }} className="import-grid">
          {/* Source selector */}
          <div>
            <div className="empty-label" style={{ marginBottom: 8 }}>Source</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelected(p.id); resetSource() }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 1fr auto',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    border: `1px solid ${selected === p.id ? 'var(--border-strong)' : 'var(--border)'}`,
                    background: selected === p.id ? 'var(--surface-2)' : 'var(--surface)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background .12s, border-color .12s',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    display: 'grid', placeItems: 'center',
                    background: 'var(--bg-sunken)', border: '1px solid var(--border)',
                    color: 'var(--ink-2)',
                  }}>
                    {p.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{p.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload / paste area */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="empty-label">{selected === 'csv' ? 'Upload file' : 'Paste rows'}</div>
              <button
                onClick={() => setShowAiPrompt(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 11, color: 'var(--accent)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '2px 0', fontFamily: 'var(--font-sans)',
                }}
              >
                <Sparkles size={11} /> Get AI prompt
              </button>
            </div>

            {selected === 'csv' ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '32px 20px',
                  background: dragOver ? 'var(--accent-soft)' : 'var(--bg-sunken)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'background .15s, border-color .15s',
                  minHeight: 198,
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  display: 'grid', placeItems: 'center', color: 'var(--ink-2)',
                }}>
                  {csvFileName ? <FileText size={18} /> : <Upload size={18} />}
                </div>
                {csvFileName ? (
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{csvFileName}</div>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Drop a CSV file here</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)', maxWidth: 280 }}>
                      Download our template to ensure columns match.
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '7px 12px' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse files
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '7px 12px' }}
                    onClick={downloadTemplate}
                  >
                    Download template
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-sunken)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}>
                <textarea
                  value={manualText}
                  onChange={(e) => { setManualText(e.target.value); setVerifyResult(null); setImportDone(null) }}
                  placeholder={'asset_name,symbol,asset_type,currency,transaction_type,quantity,price,date,notes\nApple Inc,AAPL,stock,USD,buy,10,145.00,2024-01-15,\nBitcoin,BTC,crypto,USD,buy,0.5,42000,2024-02-01,'}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--ink)',
                    minHeight: 148,
                  }}
                />
                <div style={{
                  padding: '10px 16px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '7px 12px' }}
                    onClick={handleVerify}
                    disabled={!manualText.trim()}
                  >
                    Verify import
                  </button>
                </div>
              </div>
            )}

            {/* Verify + import result area */}
            {importDone ? (
              <div style={{
                marginTop: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius)',
                background: 'color-mix(in srgb, var(--pos) 8%, transparent)',
                border: '1px solid var(--pos)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--pos)' }}>
                  Imported {importDone.assetsCreated} asset{importDone.assetsCreated !== 1 ? 's' : ''} and {importDone.transactionsCreated} transaction{importDone.transactionsCreated !== 1 ? 's' : ''}
                </div>
                {importDone.errors.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                    {importDone.errors.length} partial error{importDone.errors.length !== 1 ? 's' : ''}:
                    {importDone.errors.map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}
                <Link
                  href="/assets"
                  style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
                >
                  View assets →
                </Link>
              </div>
            ) : verifyResult !== null ? (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {errorRows.length === 0 ? (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius)',
                    background: 'color-mix(in srgb, var(--pos) 8%, transparent)',
                    border: '1px solid var(--pos)',
                    fontSize: 13,
                    color: 'var(--pos)',
                    fontWeight: 500,
                  }}>
                    {validRows.length} row{validRows.length !== 1 ? 's' : ''} ready to import
                  </div>
                ) : (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius)',
                    background: 'color-mix(in srgb, var(--neg) 6%, transparent)',
                    border: '1px solid var(--neg)',
                    fontSize: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}>
                    <div style={{ fontWeight: 500, color: 'var(--neg)', fontSize: 13 }}>
                      {errorRows.length} row{errorRows.length !== 1 ? 's' : ''} with errors
                      {validRows.length > 0 && `, ${validRows.length} valid`}
                    </div>
                    {errorRows.map(row => (
                      <div key={row.rowNum} style={{ color: 'var(--ink-2)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>Row {row.rowNum}:</span>{' '}
                        {row.errors.join(' · ')}
                      </div>
                    ))}
                  </div>
                )}

                {validRows.length > 0 && (
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '7px 12px', alignSelf: 'flex-end' }}
                  >
                    {importing
                      ? 'Importing…'
                      : `Import ${validRows.length} row${validRows.length !== 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 11, color: 'var(--ink-faint)' }}>
              <span>🔒 Encrypted at rest</span>
              <span>·</span>
              <span>Never traded on your behalf</span>
            </div>
          </div>
        </div>
      </div>

      {showAiPrompt && (
        <Dialog title="AI import prompt" onClose={() => { setShowAiPrompt(false); setCopied(false) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Copy this prompt into any AI chat (Claude, ChatGPT, Gemini, etc.), attach your data — screenshots, PDFs, brokerage exports, or plain text — and paste the output here.
            </p>
            <div style={{
              background: 'var(--bg-sunken)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink)',
              whiteSpace: 'pre-wrap',
              maxHeight: 280,
              overflowY: 'auto',
              lineHeight: 1.6,
            }}>
              {AI_PROMPT}
            </div>
            <button
              onClick={copyPrompt}
              className="btn btn-primary"
              style={{ fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy prompt'}
            </button>
          </div>
        </Dialog>
      )}

      {showNewPortfolio && (
        <AddPortfolioDialog
          userId={userId}
          onClose={() => setShowNewPortfolio(false)}
        />
      )}
    </>
  )
}
