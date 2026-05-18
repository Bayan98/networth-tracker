'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Upload, Plus, Sparkles, Copy, Check, ChevronDown, FileText, X } from 'lucide-react'
import { parseAndVerify } from '@networth/utils'
import type { ParsedRow, ImportRow } from '@networth/utils'
import type { Portfolio } from '@networth/types'
import { AddPortfolioDialog } from '@/components/assets'
import { importAssets } from '@/app/(main)/settings/actions'
import type { ImportResult } from '@/app/(main)/settings/actions'

type ProviderKey = 'csv' | 'manual'

const PROVIDERS: { id: ProviderKey; name: string; sub: string; icon: React.ReactNode }[] = [
  { id: 'csv',    name: 'CSV file',     sub: 'Upload a statement file', icon: <Upload size={16} /> },
  { id: 'manual', name: 'Manual entry', sub: 'Paste or type rows',      icon: <Plus size={16} /> },
]

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
  const [templateCsv, setTemplateCsv] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/import-template.csv').then(r => r.text()),
      fetch('/ai-prompt.md').then(r => r.text()),
    ]).then(([csv, prompt]) => {
      setTemplateCsv(csv)
      setAiPrompt(prompt)
    })
  }, [])

  function downloadTemplate() {
    if (!templateCsv) return
    const blob = new Blob([templateCsv], { type: 'text/csv' })
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
    if (!aiPrompt) return
    navigator.clipboard.writeText(aiPrompt)
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
        <header className="ds-section-head">
          <h2 className="ds-section-title">Import assets</h2>
          <span className="ds-section-meta">CSV · manual</span>
        </header>

        <div style={{ marginBottom: 20 }}>
          <div className="ds-field-label">Add to portfolio</div>
          <div className="import-portfolio-row">
            <div className="import-portfolio-select-wrap">
              <select
                value={selectedPortfolioId ?? ''}
                onChange={(e) => setSelectedPortfolioId(e.target.value || null)}
                style={{
                  appearance: 'none',
                  padding: '7px 28px 7px 10px',
                  fontSize: 13,
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--ink-3)',
                  background: 'var(--surface)',
                  color: selectedPortfolioId ? 'var(--ink)' : 'var(--ink-faint)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
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
          <div>
            <div className="ds-field-label">Source</div>
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
                    border: `1px solid ${selected === p.id ? 'var(--ink)' : 'var(--ink-3)'}`,
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
                    background: 'var(--bg-sunken)', border: '1px solid var(--ink-3)',
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

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="ds-field-label" style={{ marginBottom: 0 }}>{selected === 'csv' ? 'Upload file' : 'Paste rows'}</div>
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
                  background: 'var(--surface)', border: '1px solid var(--ink-3)',
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
                border: '1px solid var(--ink-3)',
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
                  borderTop: '1px solid var(--ink-3)',
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

            {importDone ? (
              <div
                className="callout callout-pos"
                style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <div style={{ fontWeight: 500 }}>
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
                  <div className="callout callout-pos" style={{ fontWeight: 500 }}>
                    {validRows.length} row{validRows.length !== 1 ? 's' : ''} ready to import
                  </div>
                ) : (
                  <div
                    className="callout callout-neg"
                    style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}
                  >
                    <div style={{ fontWeight: 500, fontSize: 13 }}>
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
        <div
          className="rmodal-scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAiPrompt(false)
              setCopied(false)
            }
          }}
        >
          <div className="rmodal wide">
            <div className="rmodal-head">
              <div>
                <div className="rmodal-kicker">Import helper</div>
                <h2>AI import prompt</h2>
                <div className="rmodal-desc">
                  Copy this into any AI chat (Claude, ChatGPT, Gemini), attach your data — screenshots, PDFs, brokerage exports, or plain text — and paste the output back here.
                </div>
              </div>
              <button
                className="iconbtn"
                onClick={() => { setShowAiPrompt(false); setCopied(false) }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rmodal-body">
              <div style={{
                background: 'var(--bg-sunken)',
                border: '1px solid var(--ink-3)',
                borderRadius: 'var(--radius)',
                padding: '12px 14px',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--ink)',
                whiteSpace: 'pre-wrap',
                maxHeight: 320,
                overflowY: 'auto',
                lineHeight: 1.6,
              }}>
                {aiPrompt || 'Loading prompt…'}
              </div>
            </div>

            <div className="rmodal-foot">
              <div className="rmodal-hint">
                {copied ? 'Prompt copied to clipboard.' : 'Then paste the AI output into the import form.'}
              </div>
              <div className="rmodal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setShowAiPrompt(false); setCopied(false) }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={copyPrompt}
                  className="btn btn-primary"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy prompt'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
