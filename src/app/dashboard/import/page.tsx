'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, CheckCircle, FileSpreadsheet, Loader2 } from 'lucide-react';

interface ImportResult {
  domain: string;
  keywordsImported: number;
  urlsCreated: number;
}

interface ImportResponse {
  success: boolean;
  results: ImportResult[];
  totalDomains: number;
  totalKeywords: number;
}

export default function MultiImportPage() {
  const router = useRouter();
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetsUrl) return;

    setIsImporting(true);
    setError('');
    setProgress('Fetching spreadsheet...');

    try {
      // Convert Google Sheets URL to standard format
      let processedUrl = sheetsUrl;
      if (sheetsUrl.includes('docs.google.com/spreadsheets')) {
        const match = sheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          processedUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/edit`;
        }
      }

      setProgress('Processing all tabs...');
      
      const res = await fetch('/api/keywords/import-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: processedUrl }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setResult(data);
        setProgress('');
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err) {
      console.error(err);
      setError('Import failed - check console for details');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Import Keywords</h1>
          <p className="text-gray-500">Import multiple competitors from one Google Sheet</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {!result ? (
          <div className="p-6">
            <form onSubmit={handleImport} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Sheets URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileSpreadsheet size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Paste the URL from your browser. The sheet must be shared (Anyone with link can view).
                </p>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
                <p className="font-semibold text-indigo-900 mb-2">✨ Multi-Domain Import</p>
                <ul className="text-sm text-indigo-700 space-y-1">
                  <li>• Automatically imports <strong>all tabs</strong> in your spreadsheet</li>
                  <li>• Detects domain from <strong>Link column</strong> URLs</li>
                  <li>• Creates new domains if needed</li>
                  <li>• <strong>10-50x faster</strong> than single imports</li>
                </ul>
              </div>

              <div className="bg-amber-50 p-4 rounded-md text-sm text-amber-800 border border-amber-200">
                <p className="font-semibold mb-2">Required columns in each tab:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2 rounded border">
                    <span className="font-mono font-bold">Keyword</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="font-mono font-bold">Volume</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="font-mono font-bold">Link</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="font-mono font-bold">Pin</span>
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-2">Position and Change columns are optional.</p>
              </div>

              {isImporting && progress && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Loader2 className="animate-spin text-blue-600" size={20} />
                  <span className="text-sm text-blue-700">{progress}</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 p-4 rounded-md text-sm text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!sheetsUrl || isImporting}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Importing All Domains...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Import All Tabs
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Import Complete!</h3>
              <p className="text-sm text-gray-500 mt-1">
                Imported {result.totalKeywords.toLocaleString()} keywords across {result.totalDomains} domains
              </p>
            </div>

            <div className="space-y-3">
              {result.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{r.domain}</p>
                    <p className="text-xs text-gray-500">
                      {r.urlsCreated > 0 && `${r.urlsCreated} new URLs created`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-indigo-600">{r.keywordsImported.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">keywords</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => router.push('/dashboard/domains')}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View Competitors
              </button>
              <button
                onClick={() => router.push('/dashboard/keywords')}
                className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Keyword Coverage
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
