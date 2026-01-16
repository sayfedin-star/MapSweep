'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, CheckCircle, FileText, Link as LinkIcon, FileSpreadsheet } from 'lucide-react';

export default function KeywordImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [importMethod, setImportMethod] = useState<'file' | 'sheets'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ count: number; warnings: number } | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`/api/domains/${id}/keywords/upload`, {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        if (res.ok) {
            setResult(data);
        } else {
            setError(data.error || 'Upload failed');
        }
    } catch (err) {
        console.error(err);
        setError('Upload failed');
    } finally {
        setIsUploading(false);
    }
  };

  const handleSheetsImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetsUrl) return;

    setIsUploading(true);
    setError('');

    try {
        // Handle various Google Sheets URL formats
        let csvUrl = sheetsUrl.trim();
        
        // If it's already a direct CSV link (published to web), use as-is
        if (csvUrl.includes('output=csv') || csvUrl.endsWith('.csv')) {
          // Already a CSV URL, use directly
        }
        // Handle /d/e/ "Publish to web" URLs
        else if (csvUrl.includes('/d/e/')) {
          // Check if output=csv is missing, add it
          if (!csvUrl.includes('output=csv')) {
            csvUrl = csvUrl.includes('?') 
              ? `${csvUrl}&output=csv` 
              : `${csvUrl}?output=csv`;
          }
        }
        // Handle standard Google Sheets URLs (/d/SHEET_ID/)
        else if (csvUrl.includes('docs.google.com/spreadsheets/d/')) {
          const match = csvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match) {
            const sheetId = match[1];
            const gidMatch = csvUrl.match(/gid=(\d+)/);
            const gid = gidMatch ? gidMatch[1] : '0';
            csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
          }
        }

        const res = await fetch(`/api/domains/${id}/keywords/upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: csvUrl }),
        });
        const data = await res.json();
        if (res.ok) {
            setResult(data);
        } else {
            setError(data.error || 'Import failed');
        }
    } catch (err) {
        console.error(err);
        setError('Import failed');
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Import Keywords</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {!result ? (
          <>
            {/* Import Method Tabs */}
            <div className="border-b flex">
              <button
                onClick={() => setImportMethod('file')}
                className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 ${
                  importMethod === 'file' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Upload size={18} />
                Upload CSV File
              </button>
              <button
                onClick={() => setImportMethod('sheets')}
                className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 ${
                  importMethod === 'sheets' 
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileSpreadsheet size={18} />
                Google Sheets URL
              </button>
            </div>

            <div className="p-6">
              {importMethod === 'file' ? (
                <form onSubmit={handleFileUpload} className="space-y-6">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                            <Upload />
                        </div>
                        <div className="mt-4 flex text-sm text-gray-600 justify-center">
                            <label className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500">
                                <span>Upload a file</span>
                                <input 
                                    type="file" 
                                    className="sr-only" 
                                    accept=".csv"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">CSV up to 10MB (Pinclicks export format)</p>
                        {file && (
                            <div className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 py-2 px-4 rounded-full">
                                <FileText size={16} />
                                {file.name}
                            </div>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={!file || isUploading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isUploading ? 'Importing...' : 'Start Import'}
                    </button>
                </form>
              ) : (
                <form onSubmit={handleSheetsImport} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Google Sheets URL
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LinkIcon size={18} className="text-gray-400" />
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

                    <div className="bg-amber-50 p-4 rounded-md text-sm text-amber-800 border border-amber-200">
                        <p className="font-semibold mb-3">Required columns in your sheet:</p>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-white p-2 rounded border">
                              <span className="font-mono font-bold">Keyword</span>
                              <span className="text-xs text-gray-500 block">The search term</span>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <span className="font-mono font-bold">Volume</span>
                              <span className="text-xs text-gray-500 block">Search volume</span>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <span className="font-mono font-bold">Link</span>
                              <span className="text-xs text-gray-500 block">Page URL (https://...)</span>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <span className="font-mono font-bold">Pin</span>
                              <span className="text-xs text-gray-500 block">Pinterest pin URL</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600">Optional: Position, Change columns will also be imported if present.</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700 border">
                        <p className="font-semibold mb-1">Share your sheet:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Click <strong>Share</strong> → <strong>&quot;Anyone with the link&quot;</strong></li>
                            <li>Copy the URL and paste it above</li>
                        </ol>
                    </div>


                    <button 
                        type="submit" 
                        disabled={!sheetsUrl || isUploading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isUploading ? 'Importing...' : 'Import from Google Sheets'}
                    </button>
                </form>
              )}

              {error && (
                <div className="mt-4 bg-red-50 p-4 rounded-md text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 bg-blue-50 p-4 rounded-md text-sm text-blue-700">
                  <p className="font-semibold mb-1">Note:</p>
                  <ul className="list-disc pl-5 space-y-1">
                      <li>This will <strong>overwrite</strong> all current rankings for this domain.</li>
                      <li>Volume and Change columns are optional but recommended.</li>
                  </ul>
              </div>
            </div>
          </>
        ) : (
            <div className="text-center py-12 px-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Import Complete</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Successfully imported {result.count} keywords.
                    {result.warnings > 0 && ` (${result.warnings} new URLs created)`}
                </p>
                 <div className="mt-6 flex justify-center gap-4">
                    <button 
                        onClick={() => router.push(`/dashboard/domains`)}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        Return to Domains
                    </button>
                    <button 
                        onClick={() => router.push(`/dashboard/keywords`)}
                         className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        View Keyword Analysis
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
