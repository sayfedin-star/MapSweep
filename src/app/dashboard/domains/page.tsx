
'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, Globe } from 'lucide-react';
import { Modal } from '@/components/Modal';

interface Domain {
  id: number;
  domainName: string;
  pinclicksAccountUrl: string | null;
  monthlyViews: number;
  totalKeywords: number;
  totalRecipeUrls: number;
  status: string;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState({ domainName: '', pinclicksAccountUrl: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/domains');
      if (res.ok) {
        const data = await res.json();
        setDomains(data);
      }
    } catch (error) {
      console.error('Failed to load domains', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDomain),
      });

      if (res.ok) {
        setNewDomain({ domainName: '', pinclicksAccountUrl: '' });
        setIsModalOpen(false);
        fetchDomains();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add domain');
      }
    } catch (error) {
      console.error(error);
      alert('Error connecting to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure? This will delete all tracked data for this domain.')) return;
    try {
      const res = await fetch(`/api/domains/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDomains(domains.filter((d) => d.id !== id));
      }
    } catch (error) {
        console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Competitor Domains</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Competitor
        </button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-gray-500">Loading competitors...</div>
      ) : domains.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
           <Globe className="mx-auto h-12 w-12 text-gray-400" />
           <span className="mt-2 block text-sm font-medium text-gray-900">No competitors tracked yet</span>
           <button
             onClick={() => setIsModalOpen(true)}
             className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
             Add your first domain
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {domains.map((domain) => (
            <div key={domain.id} className="relative flex flex-col justify-between rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <div>
                <div className="flex items-start justify-between">
                   <h3 className="text-lg font-semibold text-gray-900 truncate" title={domain.domainName}>
                     {domain.domainName}
                   </h3>
                   <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                     domain.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                   }`}>
                     {domain.status}
                   </span>
                </div>
                
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm text-center">
                    <div>
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Pages</p>
                        <p className="font-medium text-lg">{domain.totalRecipeUrls || 0}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Keywords</p>
                        <p className="font-medium text-lg">{domain.totalKeywords || 0}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Views</p>
                        <p className="font-medium text-lg">{domain.monthlyViews || 0}</p>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => window.location.href = `/dashboard/domains/${domain.id}/sitemap`}
                            className="flex items-center justify-center gap-1 rounded bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                        >
                            Import Sitemap
                        </button>
                        <button 
                             onClick={() => window.location.href = `/dashboard/domains/${domain.id}/keywords`}
                             className="flex items-center justify-center gap-1 rounded bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100"
                        >
                            Import CSV
                        </button>
                    </div>
                    <button 
                        onClick={() => window.location.href = `/dashboard/domains/${domain.id}/slug-analysis`}
                        className="w-full text-left text-sm text-gray-500 hover:text-indigo-600 hover:underline"
                    >
                        View Slug Analysis &rarr;
                    </button>
                    <button 
                        onClick={() => window.location.href = `/dashboard/domains/${domain.id}/keyword-analysis`}
                        className="w-full text-left text-sm text-gray-500 hover:text-indigo-600 hover:underline"
                    >
                        View Keywords Analysis &rarr;
                    </button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t pt-4">
                  {domain.pinclicksAccountUrl && (
                      <a 
                        href={domain.pinclicksAccountUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                         Pinclicks <ExternalLink size={12}/>
                      </a>
                  )}
                  <button 
                    onClick={() => handleDelete(domain.id)}
                    className="ml-auto text-red-500 hover:text-red-700"
                    title="Delete Domain"
                  >
                    <Trash2 size={16} />
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Competitor"
      >
        <form onSubmit={handleAddDomain} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Domain Name</label>
            <input
              type="text"
              required
              placeholder="example.com"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              value={newDomain.domainName}
              onChange={(e) => setNewDomain({ ...newDomain, domainName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Pinclicks URL (Optional)</label>
            <input
              type="url"
              placeholder="https://app.pinclicks.com/accounts/..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              value={newDomain.pinclicksAccountUrl}
              onChange={(e) => setNewDomain({ ...newDomain, pinclicksAccountUrl: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Domain'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
