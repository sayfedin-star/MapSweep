
'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Check, FileText } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Import Logs</h1>
      <div className="bg-white shadow overflow-hidden rounded-md">
        {isLoading ? (
             <div className="p-12 text-center text-gray-500">Loading logs...</div>
         ) : logs.length === 0 ? (
             <div className="p-12 text-center text-gray-500">No logs found.</div>
         ) : (
            <ul className="divide-y divide-gray-200">
                {logs.map((log) => (
                    <li key={log.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${log.warnings ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                                    {log.warnings ? <AlertTriangle size={16} /> : <Check size={16} />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        Imported {log.rowsImported} {log.importType} for <span className="font-bold">{log.domainName || 'Unknown Domain'}</span>
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(log.importedAt).toLocaleString()} • {log.fileName || 'Sitemap Fetch'}
                                    </p>
                                </div>
                            </div>
                            {log.warnings && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Warnings
                                </span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
         )}
      </div>
    </div>
  );
}
