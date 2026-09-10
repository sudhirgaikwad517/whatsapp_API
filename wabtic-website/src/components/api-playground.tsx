import React, { useState } from 'react';
import { ApiEndpoint } from '@/types';
import { API_DOCS_DATA } from '@/lib/initial-data';
import { Play, Copy, Check, CheckCircle, AlertCircle, RefreshCw, Terminal } from 'lucide-react';

export function ApiPlayground({ selectedApi }: { selectedApi?: ApiEndpoint }) {
  const [activeEndpoint, setActiveEndpoint] = useState<ApiEndpoint>(selectedApi || API_DOCS_DATA[1]);
  const [activeTab, setActiveTab] = useState<'curl' | 'node' | 'python' | 'php'>('curl');
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(activeEndpoint.samplePayload, null, 2)
  );
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(activeEndpoint.sampleResponses[0]);
  const [copied, setCopied] = useState(false);

  const handleEndpointSelect = (endpoint: ApiEndpoint) => {
    setActiveEndpoint(endpoint);
    setPayloadText(JSON.stringify(endpoint.samplePayload, null, 2));
    setResponse(endpoint.sampleResponses[0]);
  };

  const handleRunRequest = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResponse({
        status: 200,
        title: '200 OK (Live Simulator)',
        timestamp: new Date().toISOString(),
        body: {
          success: true,
          execution_time_ms: Math.floor(Math.random() * 40) + 12,
          endpoint: activeEndpoint.endpoint,
          request_id: 'req_' + Math.random().toString(36).substr(2, 9),
          result: activeEndpoint.sampleResponses[0]?.body || { status: 'success' }
        }
      });
    }, 600);
  };

  const handleCopyCode = () => {
    const code = activeEndpoint.codeSamples[activeTab];
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Top Header bar */}
      <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              Interactive REST API Console
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Live Sandbox</span>
            </h3>
            <p className="text-xs text-slate-400">Test WhatsApp API endpoints in real-time with sample payloads</p>
          </div>
        </div>

        {/* Endpoint Selector Dropdown */}
        <select
          value={activeEndpoint.id}
          onChange={(e) => {
            const found = API_DOCS_DATA.find(item => item.id === e.target.value);
            if (found) handleEndpointSelect(found);
          }}
          className="bg-slate-800 text-white text-sm px-4 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          {API_DOCS_DATA.map(api => (
            <option key={api.id} value={api.id}>
              {api.method} {api.endpoint} ({api.title})
            </option>
          ))}
        </select>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        
        {/* Left Column */}
        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                activeEndpoint.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                activeEndpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                {activeEndpoint.method}
              </span>
              <span className="font-mono text-sm font-semibold text-white">
                https://api.wabtic.com{activeEndpoint.endpoint}
              </span>
            </div>
            <p className="text-xs text-slate-400">{activeEndpoint.description}</p>
          </div>

          {/* Request Headers */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Request Headers</h4>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
              {Object.entries(activeEndpoint.headers).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-emerald-400">{key}:</span>
                  <span className="text-slate-300 truncate max-w-xs">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body Payload Editor */}
          {activeEndpoint.samplePayload && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">JSON Payload Editor</h4>
                <button
                  onClick={() => setPayloadText(JSON.stringify(activeEndpoint.samplePayload, null, 2))}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Reset Sample
                </button>
              </div>
              <textarea
                rows={6}
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                className="w-full bg-slate-950 text-emerald-300 font-mono text-xs p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>
          )}

          {/* Code Snippets Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['curl', 'node', 'python', 'php'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-colors cursor-pointer ${
                      activeTab === tab ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Code'}
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
              <code>{activeEndpoint.codeSamples[activeTab]}</code>
            </pre>
          </div>

          {/* Execute Request CTA */}
          <button
            onClick={handleRunRequest}
            disabled={loading}
            className="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sending API Request...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Send Test API Request
              </>
            )}
          </button>
        </div>

        {/* Right Column */}
        <div className="p-6 space-y-4 bg-slate-950/40">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              Response Preview
            </h4>
            {response && (
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                response.status === 200 || response.status === 201
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {response.status === 200 || response.status === 201 ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {response.title || `${response.status} Response`}
              </span>
            )}
          </div>

          {/* Formatted JSON Output */}
          <div className="relative">
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto min-h-[380px] max-h-[500px] leading-relaxed">
              <code>{JSON.stringify(response?.body || response, null, 2)}</code>
            </pre>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 leading-normal">
            💡 <strong className="text-slate-200">Developer Note:</strong> Production responses are returned within 20-50ms with full standard Meta Cloud API payload structures.
          </div>
        </div>

      </div>
    </div>
  );
}
