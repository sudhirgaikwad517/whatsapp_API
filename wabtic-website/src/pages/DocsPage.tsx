import React, { useState } from 'react';
import { API_DOCS_DATA } from '@/lib/initial-data';
import { ApiEndpoint } from '@/types';
import { ApiPlayground } from '@/components/api-playground';
import { Search, Terminal } from 'lucide-react';

export function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApi, setSelectedApi] = useState<ApiEndpoint>(API_DOCS_DATA[1]);

  const filteredApis = API_DOCS_DATA.filter(api =>
    api.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pt-12 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      
      {/* Header & Search */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
          <Terminal className="w-4 h-4" /> Developer Portal & Interactive Console
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          WhatsApp API <span className="text-[#25D366]">Documentation</span>
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300">
          Explore endpoints, authentication parameters, webhooks, and live code examples for Node.js, Python, PHP, and cURL.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto pt-2">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search API endpoints (e.g. 'Send Message', '/v1/messages', 'webhooks')..."
            className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white pl-12 pr-4 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>
      </div>

      {/* Main Docs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar Menu */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 sticky top-24 shadow-xl">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 flex justify-between">
              <span>API Reference Endpoints</span>
              <span>{filteredApis.length} Methods</span>
            </div>

            <div className="space-y-1.5">
              {filteredApis.map((api) => {
                const isSelected = selectedApi.id === api.id;
                return (
                  <button
                    key={api.id}
                    onClick={() => setSelectedApi(api)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#25D366] text-slate-950 shadow-md font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isSelected
                        ? 'bg-slate-950 text-emerald-400'
                        : api.method === 'POST'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {api.method}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{api.title}</div>
                      <div className={`text-[11px] truncate font-mono ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                        {api.endpoint}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Active Endpoint Info Card */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 font-bold rounded-lg text-xs">
                {selectedApi.method}
              </span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedApi.title}</h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedApi.description}
            </p>

            {/* Parameters Table */}
            {selectedApi.bodyParams && selectedApi.bodyParams.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Request Body Parameters</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-400 font-bold">
                      <tr>
                        <th className="p-3">Field</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Required</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {selectedApi.bodyParams.map((param, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-mono font-bold text-emerald-500">{param.name}</td>
                          <td className="p-3 font-mono text-slate-400">{param.type}</td>
                          <td className="p-3">
                            {param.required ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">Required</span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-400">Optional</span>
                            )}
                          </td>
                          <td className="p-3">{param.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Playground Embed */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-500" />
              Live Interactive Console
            </h3>
            <ApiPlayground selectedApi={selectedApi} />
          </div>

        </div>

      </div>

    </div>
  );
}
