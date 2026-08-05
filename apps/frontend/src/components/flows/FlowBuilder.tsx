import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, Zap, MessageSquare, List, GitBranch, UserCheck, Plus, CheckCircle2, Trash2 } from 'lucide-react';
import { apiClient } from '../../services/api.client';

interface FlowBuilderProps {
  flowId: string | null;
  onClose: () => void;
}

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: '⚡ Trigger: Customer sends "hi" or "hello"' },
    position: { x: 250, y: 50 },
    style: { background: '#064e3b', color: '#34d399', border: '1px solid #059669', borderRadius: '12px', padding: '12px', fontWeight: 'bold', fontSize: '12px' },
  },
  {
    id: '2',
    data: { label: '💬 Send Message: "Welcome to Shrishti Dairy Farm! How can we help you today?"' },
    position: { x: 250, y: 180 },
    style: { background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '12px', padding: '12px', fontSize: '12px' },
  },
];

const initialEdges: Edge[] = [{ id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10b981' } }];

export const FlowBuilder: React.FC<FlowBuilderProps> = ({ flowId, onClose }) => {
  const [name, setName] = useState('Welcome Chatbot Flow');
  const [triggerKeyword, setTriggerKeyword] = useState('hi');
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeText, setNodeText] = useState('');

  // Fetch flow if flowId exists
  const { data: flowData } = useQuery({
    queryKey: ['flow-details', flowId],
    queryFn: async () => {
      if (!flowId) return null;
      const res = await apiClient.get(`/flows/${flowId}`);
      return res.data.data;
    },
    enabled: Boolean(flowId),
  });

  useEffect(() => {
    if (flowData) {
      setName(flowData.name || '');
      setTriggerKeyword(flowData.triggerKeyword || '');
      if (flowData.definition?.nodes?.length) {
        setNodes(flowData.definition.nodes);
      }
      if (flowData.definition?.edges?.length) {
        setEdges(flowData.definition.edges);
      }
    }
  }, [flowData]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#10b981' } }, eds)),
    [setEdges]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        triggerKeyword,
        definition: { nodes, edges },
      };

      if (flowId) {
        const res = await apiClient.put(`/flows/${flowId}`, payload);
        return res.data.data;
      } else {
        const res = await apiClient.post('/flows', payload);
        return res.data.data;
      }
    },
    onSuccess: () => {
      alert('🎉 Success! Chatbot Flow saved successfully.');
      onClose();
    },
    onError: (err: any) => {
      alert(`❌ Failed to save flow: ${err.message}`);
    },
  });

  const handleAddNode = (type: string, label: string, colorClass: string) => {
    const newNodeId = String(Date.now());
    const newNode: Node = {
      id: newNodeId,
      data: { label },
      position: { x: Math.random() * 200 + 200, y: Math.random() * 200 + 200 },
      style: { background: '#0f172a', color: '#f8fafc', border: `1px solid ${colorClass}`, borderRadius: '12px', padding: '12px', fontSize: '12px' },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleNodeClick = (_: any, node: Node) => {
    setSelectedNode(node);
    setNodeText((node.data?.label as string) || '');
  };

  const updateNodeLabel = () => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          node.data = { ...node.data, label: nodeText };
        }
        return node;
      })
    );
    alert('✅ Node content updated!');
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNode(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden flex-1">
      {/* Top Action Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Flow Name..."
              className="bg-transparent font-bold text-white text-base focus:outline-none border-b border-transparent focus:border-emerald-500"
            />
            <div className="flex items-center space-x-2 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-slate-400 font-mono">Trigger Keyword:</span>
              <input
                type="text"
                value={triggerKeyword}
                onChange={(e) => setTriggerKeyword(e.target.value)}
                placeholder="hi, order, price..."
                className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-xs flex items-center transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving Flow...' : 'Save Chatbot Flow'}
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Nodes Palette Panel */}
        <div className="w-64 bg-slate-900/90 border-r border-slate-800 p-4 space-y-4 shrink-0 z-10 backdrop-blur-md overflow-y-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Add Flow Nodes
          </span>

          <div className="space-y-2">
            <button
              onClick={() => handleAddNode('message', '💬 Send Message: "Thank you for contacting us!"', '#3b82f6')}
              className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-all text-xs flex items-center text-slate-200 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 mr-2 text-blue-400" />
              Send Text Message
            </button>

            <button
              onClick={() => handleAddNode('buttons', '🔘 Interactive Buttons: [1. Pricing, 2. Address]', '#10b981')}
              className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-all text-xs flex items-center text-slate-200 cursor-pointer"
            >
              <List className="w-4 h-4 mr-2 text-emerald-400" />
              Interactive Reply Buttons
            </button>

            <button
              onClick={() => handleAddNode('condition', '🔀 Condition: IF reply contains "price"', '#f59e0b')}
              className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-all text-xs flex items-center text-slate-200 cursor-pointer"
            >
              <GitBranch className="w-4 h-4 mr-2 text-amber-400" />
              Conditional Logic Branch
            </button>

            <button
              onClick={() => handleAddNode('agent', '👤 Assign Agent: Transfer to Live Support Agent', '#a855f7')}
              className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-all text-xs flex items-center text-slate-200 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 mr-2 text-purple-400" />
              Assign Support Agent
            </button>
          </div>
        </div>

        {/* ReactFlow Canvas */}
        <div className="flex-1 h-full bg-slate-950">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              fitView
            >
              <Controls className="bg-slate-900 text-white border-slate-800" />
              <MiniMap style={{ background: '#020617', border: '1px solid #1e293b' }} nodeColor="#10b981" />
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {/* Right Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="w-72 bg-slate-900/95 border-l border-slate-800 p-5 space-y-4 shrink-0 z-10 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Edit Selected Node
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Node Text / Content
                </label>
                <textarea
                  rows={4}
                  value={nodeText}
                  onChange={(e) => setNodeText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <button
                onClick={updateNodeLabel}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                Update Node Content
              </button>

              <button
                onClick={deleteSelectedNode}
                className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Selected Node
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
