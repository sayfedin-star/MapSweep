
'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function SitemapImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [url, setUrl] = useState('');
  const [step, setStep] = useState(1); // 1: Input, 2: Selection/Review, 3: Processing, 4: Result
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null); // Fetch result
  const [processResult, setProcessResult] = useState<any>(null); // DB Save result
  const [selectedSitemaps, setSelectedSitemaps] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<string>('');
  const router = useRouter();

  const handleProcessSelectedSitemaps = async () => {
        setIsLoading(true);
        const sitemaps = Array.from(selectedSitemaps);
        const allUrls: { loc: string; lastmod?: string }[] = [];
        const BATCH_SIZE = 5;
        
        for (let i = 0; i < sitemaps.length; i += BATCH_SIZE) {
            setProgress(`Fetching sitemaps ${i + 1}-${Math.min(i + BATCH_SIZE, sitemaps.length)} of ${sitemaps.length}...`);
            const batch = sitemaps.slice(i, i + BATCH_SIZE);
            const promises = batch.map(async (smUrl) => {
                try {
                    const res = await fetch(`/api/domains/${id}/sitemap/fetch`, {
                        method: 'POST',
                        body: JSON.stringify({ url: smUrl }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.urls) {
                            return data.urls as { loc: string; lastmod?: string }[];
                        }
                    }
                } catch (e) {
                    console.error(`Failed to fetch sub-sitemap ${smUrl}`, e);
                }
                return [];
            });

            const results = await Promise.all(promises);
            for (const urlsArr of results) {
                allUrls.push(...urlsArr);
            }
        }

        setProgress('');
        setIsLoading(false);
        if (allUrls.length > 0) {
            setResult({ urls: allUrls, sitemaps: [] }); 
        } else {
            alert('Failed to fetch any selected sitemaps.');
        }
  };

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStep(2); // Move to review immediately while loading visually
    try {
        const res = await fetch(`/api/domains/${id}/sitemap/fetch`, {
            method: 'POST',
            body: JSON.stringify({ url }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok) {
            setResult(data);
        } else {
            alert(data.error);
            setStep(1);
        }
    } catch (err) {
        console.error(err);
        setStep(1);
    } finally {
        setIsLoading(false);
    }
  };

  const handleProcess = async () => {
    setIsLoading(true);
    setStep(3);
    try {
        // If sitemap index, we should actually iterate and fetch sub-sitemaps automatically (MVP simplification: Just error or ask user to input sub-sitemap)
        // **Correction**: The briefing said "Show list... let user select". 
        // For MVP, if user sees sub-sitemaps, they will have to manually copy one and go back. 
        // Or we implement recursion here? 
        // Let's implement: If URLs found, process. If Sitemaps found, show them and say "Please import these individually (MVP)".
        
        if (result.sitemaps && result.sitemaps.length > 0) {
             alert('Sitemap Index detected. This MVP version requires importing sub-sitemaps individually. Please copy a URL below.');
             setIsLoading(false);
             setStep(2); // Stay on review to copy links
             return;
        }

        const res = await fetch(`/api/domains/${id}/sitemap/process`, {
            method: 'POST',
            body: JSON.stringify({ urls: result.urls }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        setProcessResult(data);
        setStep(4);
    } catch (err) {
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Import Sitemap</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {step === 1 && (
            <form onSubmit={handleFetch} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Sitemap URL</label>
                    <input 
                        type="url" 
                        required 
                        placeholder="https://example.com/sitemap.xml"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Supports standard XML sitemaps and Sitemap Indexes.
                    </p>
                </div>
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Fetch Sitemap'}
                </button>
            </form>
        )}

        {step === 2 && (
             <div className="space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        <p className="mt-2 text-sm text-gray-500">Parsing sitemap...</p>
                    </div>
                ) : result?.sitemaps?.length > 0 ? (
                    <div>
                        <div className="rounded-md bg-yellow-50 p-4 mb-4">
                             <div className="flex">
                                 <div className="flex-shrink-0">
                                     <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                 </div>
                                 <div className="ml-3">
                                     <h3 className="text-sm font-medium text-yellow-800">Sitemap Index Detected</h3>
                                     <div className="mt-2 text-sm text-yellow-700">
                                         <p>Found {result.sitemaps.length} sub-sitemaps. Select the ones you want to import.</p>
                                     </div>
                                 </div>
                             </div>
                        </div>

                        <div className="mb-4 flex justify-between items-center bg-gray-50 p-3 rounded-md border">
                            <span className="text-sm font-medium text-gray-700">
                                {selectedSitemaps.size} selected
                            </span>
                            <div className="space-x-2 flex">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(Array.from(result.sitemaps).join('\n'));
                                        alert('Sitemap URLs copied to clipboard!');
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Copy List
                                </button>
                                <button 
                                    onClick={() => setSelectedSitemaps(new Set(result.sitemaps))}
                                    className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                                >
                                    Select All
                                </button>
                                <button 
                                    onClick={() => setSelectedSitemaps(new Set())}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        <ul className="divide-y divide-gray-200 border rounded-md max-h-96 overflow-y-auto mb-4">
                            {result.sitemaps.map((sm: string, i: number) => (
                                <li key={i} className="px-4 py-3 flex items-start text-sm hover:bg-gray-50">
                                    <div className="flex items-center h-5">
                                        <input
                                            id={`sitemap-${i}`}
                                            name={`sitemap-${i}`}
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            checked={selectedSitemaps.has(sm)}
                                            onChange={(e) => {
                                                const newSet = new Set(selectedSitemaps);
                                                if (e.target.checked) newSet.add(sm);
                                                else newSet.delete(sm);
                                                setSelectedSitemaps(newSet);
                                            }}
                                        />
                                    </div>
                                    <label htmlFor={`sitemap-${i}`} className="ml-3 w-full cursor-pointer">
                                        <span className="block text-gray-900 break-all">{sm}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>

                        <div className="flex flex-col gap-2">
                             <button 
                                onClick={handleProcessSelectedSitemaps}
                                disabled={selectedSitemaps.size === 0 || isLoading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : `Fetch & Import Selected (${selectedSitemaps.size})`}
                            </button>
                             {isLoading && <p className="text-center text-xs text-gray-500">{progress || 'Processing...'}</p>}
                        </div>
                    </div>
                ) : result?.urls?.length > 0 ? (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">Found {result.urls.length} URLs</h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(result.urls.map((u: { loc: string }) => u.loc).join('\n'));
                                        alert('All URLs copied!');
                                    }}
                                    className="inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Copy All
                                </button>
                                <button 
                                    onClick={handleProcess}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                                >
                                    Import All
                                </button>
                            </div>
                        </div>
                        <ul className="divide-y divide-gray-200 border rounded-md max-h-96 overflow-y-auto bg-gray-50">
                            {result.urls.slice(0, 100).map((u: { loc: string }, i: number) => (
                                <li key={i} className="px-4 py-2 text-xs text-gray-600 truncate">
                                    {u.loc}
                                </li>
                            ))}
                            {result.urls.length > 100 && (
                                <li className="px-4 py-2 text-xs text-center text-gray-500 font-medium">
                                    ...and {result.urls.length - 100} more
                                </li>
                            )}
                        </ul>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No URLs found in this sitemap.</p>
                        <button onClick={() => setStep(1)} className="mt-4 text-indigo-600 hover:underline">Try another URL</button>
                    </div>
                )}
             </div>
        )}

        {step === 4 && processResult && (
            <div className="text-center py-12">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Import Successful</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Successfully processed {processResult.added} URLs.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                    <button 
                        onClick={() => router.push(`/dashboard/domains`)}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        Return to Domains
                    </button>
                    <button 
                        onClick={() => router.push(`/dashboard/domains/${id}/slug-analysis`)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        View Slug Analysis
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
