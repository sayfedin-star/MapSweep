'use client';
export const runtime = 'edge';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart2, ChevronDown, ChevronUp, Copy, Check, Settings } from 'lucide-react';

interface AnalysisItem {
  word: string;
  count: number;
  urls: string[];
}

export default function SlugAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ domainName: string, totalUrls: number, allUrls: string[], analysis: AnalysisItem[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedWords, setExpandedWords] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/domains/${id}/slug-analysis`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (word: string) => {
    const newSet = new Set(expandedWords);
    if (newSet.has(word)) {
      newSet.delete(word);
    } else {
      newSet.add(word);
    }
    setExpandedWords(newSet);
  };

  const copyAllUrls = () => {
    if (data?.allUrls) {
      navigator.clipboard.writeText(data.allUrls.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading && !data) return <div className="p-8 text-center text-gray-500">Analyzing slugs...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load analysis.</div>;

  const maxCount = data.analysis.length > 0 ? data.analysis[0].count : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Topic Analysis</h1>
                <p className="text-sm text-gray-500">
                    Word frequency from {data.totalUrls} recipe URLs on <span className="font-medium text-gray-900">{data.domainName}</span>
                </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
            >
              <Settings size={16} />
              Manage Stop Words
            </Link>
            <button
              onClick={copyAllUrls}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              {copied ? 'Copied!' : `Copy All ${data.totalUrls} URLs`}
            </button>
          </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
         <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
             <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
                 <BarChart2 size={20} className="text-indigo-500"/>
                 Most Frequent Terms
             </h3>
             <span className="text-xs text-gray-500">
               Excludes common words per <Link href="/dashboard/settings" className="text-indigo-600 hover:underline">global settings</Link>
             </span>
         </div>
         <div className="px-6 py-6">
             {isLoading ? (
               <div className="text-center py-8 text-gray-500">Refreshing analysis...</div>
             ) : (
             <div className="space-y-4">
             {data.analysis.map((item, idx) => (
                 <div key={idx} className="border rounded-lg overflow-hidden">
                     <button 
                        onClick={() => toggleExpand(item.word)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 text-left"
                     >
                         <span className="w-8 text-right text-xs text-gray-400 font-mono">#{idx + 1}</span>
                         <div className="flex-1">
                             <div className="flex justify-between text-sm mb-1">
                                 <span className="font-medium text-gray-800 capitalize">{item.word}</span>
                                 <span className="text-gray-500">{item.count} occurrences ({item.urls.length} URLs)</span>
                             </div>
                             <div className="w-full bg-gray-100 rounded-full h-2">
                                 <div 
                                    className="bg-indigo-500 h-2 rounded-full" 
                                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                                 ></div>
                             </div>
                         </div>
                         {expandedWords.has(item.word) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                     </button>
                     {expandedWords.has(item.word) && (
                         <div className="border-t bg-gray-50 p-4 max-h-64 overflow-y-auto">
                             <div className="flex justify-between items-center mb-2">
                                 <span className="text-xs font-medium text-gray-500">URLs containing &quot;{item.word}&quot;</span>
                                 <button 
                                    onClick={() => navigator.clipboard.writeText(item.urls.join('\n'))}
                                    className="text-xs text-indigo-600 hover:text-indigo-900"
                                 >
                                    Copy URLs
                                 </button>
                             </div>
                             <ul className="space-y-1">
                                 {item.urls.map((url, i) => (
                                     <li key={i} className="text-xs text-gray-600 truncate">
                                         <a href={url} target="_blank" rel="noreferrer" className="hover:text-indigo-600 hover:underline">{url}</a>
                                     </li>
                                 ))}
                             </ul>
                         </div>
                     )}
                 </div>
             ))}
             </div>
             )}
             {data.analysis.length === 0 && !isLoading && (
                 <p className="text-center text-gray-500 py-10">No significant words found. Try importing more URLs.</p>
             )}
         </div>
      </div>
    </div>
  );
}

