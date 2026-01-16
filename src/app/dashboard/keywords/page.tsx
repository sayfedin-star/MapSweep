
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function KeywordReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKeyword, setSelectedKeyword] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchReport(1);
  }, []);

  const fetchReport = async (page: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/keyword-coverage?page=${page}&limit=50`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
        setPagination(json.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = async (keyword: any) => {
    setSelectedKeyword(keyword);
    setIsLoadingDetails(true);
    try {
        const res = await fetch(`/api/keywords/${keyword.id}/rankings`);
        if (res.ok) {
            const json = await res.json();
            setDetails(json);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoadingDetails(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchReport(newPage);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl font-bold text-gray-900">Keyword Coverage</h1>
           <p className="text-gray-500">
             All keywords from Competitor Domains sorted by number of ranking competitors.
             {pagination.total > 0 && (
               <span className="ml-2 font-medium text-indigo-600">({pagination.total.toLocaleString()} total)</span>
             )}
           </p>
         </div>
       </div>

       <div className="bg-white shadow overflow-hidden rounded-lg">
         {isLoading ? (
             <div className="p-12 text-center text-gray-500">Loading report...</div>
         ) : data.length === 0 ? (
             <div className="p-12 text-center text-gray-500">No data found. Import keywords first.</div>
         ) : (
           <>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keyword</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competitors</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Volume</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(row)}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.keyword_text}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.domain_count}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.volume?.toLocaleString() || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <span className="text-indigo-600 hover:text-indigo-900">View Pins</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} keywords
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex items-center gap-1">
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 rounded text-sm ${
                            pagination.page === pageNum
                              ? 'bg-indigo-600 text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
           </>
         )}
       </div>

       <Modal
         isOpen={!!selectedKeyword}
         onClose={() => setSelectedKeyword(null)}
         title={`Rankings for "${selectedKeyword?.keyword_text}"`}
       >
         <div className="max-h-[60vh] overflow-y-auto min-h-[300px]">
            {isLoadingDetails ? (
                <div className="flex justify-center items-center h-32">
                    <span className="text-gray-500">Loading pins...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {details.map((item, idx) => (
                        <div key={idx} className="border rounded p-4 flex flex-col gap-2 relative">
                            <div className="absolute top-2 right-2 bg-gray-100 rounded px-2 py-1 text-xs font-bold text-gray-600">
                                #{item.position}
                            </div>
                            <h4 className="font-semibold text-gray-900">{item.domainName}</h4>
                            
                            {/* Pin Link / Preview */}
                            {item.pinterestPinUrl ? (
                                <a 
                                    href={item.pinterestPinUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 block w-full bg-[#E60023] text-white text-center py-2 rounded text-sm font-bold hover:bg-[#ad081b] transition-colors flex items-center justify-center gap-2"
                                >
                                    View on Pinterest <ExternalLink size={14}/>
                                </a>
                            ) : (
                                <div className="mt-2 block w-full bg-gray-100 text-gray-400 text-center py-2 rounded text-sm">
                                    No Pin URL
                                </div>
                            )}

                            {/* Recipe Link */}
                            {item.url && (
                                <a 
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 hover:underline truncate"
                                >
                                    {item.url}
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}
         </div>
       </Modal>
    </div>
  );
}
