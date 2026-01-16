export const runtime = 'edge';
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface Keyword {
  id: number;
  keyword_text: string;
  position: number;
  search_volume: number;
  pinterest_pin_url: string | null;
  recipe_url: string | null;
}

interface PinAnalysis {
  pinterest_pin_url: string;
  keyword_count: number;
  total_volume: number;
  recipe_url: string | null;
}

interface Stats {
  total_keywords: number;
  total_volume: number;
}

export default function KeywordAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [pinAnalysis, setPinAnalysis] = useState<PinAnalysis[]>([]);
  const [stats, setStats] = useState<Stats>({ total_keywords: 0, total_volume: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [domainName, setDomainName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'keywords' | 'pins'>('keywords');
  const [expandedPin, setExpandedPin] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch domain info
      const domainRes = await fetch(`/api/domains/${id}`);
      if (domainRes.ok) {
        const domain = await domainRes.json();
        setDomainName(domain.domainName);
      }

      // Fetch keyword analysis
      const res = await fetch(`/api/domains/${id}/keyword-analysis`);
      if (res.ok) {
        const data = await res.json();
        setKeywords(data.keywords || []);
        setPinAnalysis(data.pinAnalysis || []);
        setStats(data.stats || { total_keywords: 0, total_volume: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredKeywords = keywords.filter(k =>
    k.keyword_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getKeywordsForPin = (pinUrl: string) => {
    return keywords.filter(k => k.pinterest_pin_url === pinUrl);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keyword Analysis</h1>
          <p className="text-gray-500">{domainName}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 uppercase font-medium">Total Keywords</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total_keywords}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 uppercase font-medium">Total Volume</p>
          <p className="text-3xl font-bold text-gray-900">{Number(stats.total_volume).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 uppercase font-medium">Unique Pins</p>
          <p className="text-3xl font-bold text-gray-900">{pinAnalysis.length}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b flex">
          <button
            onClick={() => setActiveTab('keywords')}
            className={`flex-1 py-4 px-6 text-sm font-medium ${
              activeTab === 'keywords'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Keywords ({keywords.length})
          </button>
          <button
            onClick={() => setActiveTab('pins')}
            className={`flex-1 py-4 px-6 text-sm font-medium ${
              activeTab === 'pins'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Pin Analysis ({pinAnalysis.length})
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : activeTab === 'keywords' ? (
          <div>
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Keywords Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Link</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pin</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredKeywords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        {searchTerm ? 'No keywords matching your search' : 'No keywords found for this domain'}
                      </td>
                    </tr>
                  ) : (
                    filteredKeywords.map((keyword) => (
                      <tr key={keyword.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{keyword.keyword_text}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{keyword.position}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{keyword.search_volume?.toLocaleString() || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          {keyword.recipe_url ? (
                            <a
                              href={keyword.recipe_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline truncate block max-w-[200px]"
                              title={keyword.recipe_url}
                            >
                              {new URL(keyword.recipe_url).pathname}
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {keyword.pinterest_pin_url ? (
                            <a
                              href={keyword.pinterest_pin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#E60023] hover:underline"
                            >
                              View Pin <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Pin Analysis Tab */
          <div className="divide-y divide-gray-200">
            {pinAnalysis.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No pins found for this domain</div>
            ) : (
              pinAnalysis.map((pin) => (
                <div key={pin.pinterest_pin_url} className="bg-white">
                  <button
                    onClick={() => setExpandedPin(expandedPin === pin.pinterest_pin_url ? null : pin.pinterest_pin_url)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={pin.pinterest_pin_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#E60023] hover:underline flex items-center gap-1"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <span className="text-sm text-gray-600 truncate max-w-[300px]" title={pin.pinterest_pin_url}>
                          {pin.pinterest_pin_url}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-lg font-bold text-indigo-600">{pin.keyword_count}</p>
                        <p className="text-xs text-gray-500">keywords</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">{Number(pin.total_volume).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">total volume</p>
                      </div>
                      {expandedPin === pin.pinterest_pin_url ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Keywords List */}
                  {expandedPin === pin.pinterest_pin_url && (
                    <div className="px-6 pb-4 bg-gray-50">
                      <table className="min-w-full">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {getKeywordsForPin(pin.pinterest_pin_url).map((kw) => (
                            <tr key={kw.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">{kw.keyword_text}</td>
                              <td className="px-4 py-2 text-sm text-gray-500">{kw.position}</td>
                              <td className="px-4 py-2 text-sm text-gray-500">{kw.search_volume?.toLocaleString() || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

