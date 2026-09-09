import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  NodeProps,
  Handle,
  Position,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Zap,
  MessageSquare,
  List,
  GitBranch,
  UserCheck,
  Plus,
  Minus,
  CheckCircle2,
  Trash2,
  X,
  Layers,
  FormInput,
  Database,
  FlagOff,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';

interface FlowBuilderProps {
  flowId: string | null;
  onClose: () => void;
}

type NodeType = 'trigger' | 'message' | 'buttons' | 'list' | 'condition' | 'collectInput' | 'saveData' | 'assignAgent' | 'end';

interface ButtonOption {
  id: string;
  title: string;
}
interface ListRow {
  id: string;
  title: string;
  description?: string;
}
interface SaveField {
  variableName: string;
  attributeKey: string;
}

const NODE_META: Record<NodeType, { label: string; color: string; icon: React.ReactNode }> = {
  trigger: { label: 'Trigger', color: '#059669', icon: <Zap className="w-3.5 h-3.5" /> },
  message: { label: 'Send Message', color: '#3b82f6', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  buttons: { label: 'Interactive Buttons', color: '#10b981', icon: <List className="w-3.5 h-3.5" /> },
  list: { label: 'List Menu', color: '#06b6d4', icon: <List className="w-3.5 h-3.5" /> },
  condition: { label: 'Condition', color: '#f59e0b', icon: <GitBranch className="w-3.5 h-3.5" /> },
  collectInput: { label: 'Collect Input', color: '#ec4899', icon: <FormInput className="w-3.5 h-3.5" /> },
  saveData: { label: 'Save Data', color: '#22c55e', icon: <Database className="w-3.5 h-3.5" /> },
  assignAgent: { label: 'Assign Agent', color: '#a855f7', icon: <UserCheck className="w-3.5 h-3.5" /> },
  end: { label: 'End Flow', color: '#64748b', icon: <FlagOff className="w-3.5 h-3.5" /> },
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Renders every non-trigger node. Buttons/List/Condition nodes get one
// named source Handle per branch (button id, row id, or "true"/"false") so
// the canvas lets the agent draw a DIFFERENT outgoing connection per option
// — that per-handle wiring is exactly what the backend flow engine reads to
// decide which branch a customer's reply should follow.
const FlowNodeCard: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeType: NodeType = data?.nodeType || 'message';
  const meta = NODE_META[nodeType] || NODE_META.message;

  const branches: { id: string; label: string }[] = useMemo(() => {
    if (nodeType === 'buttons') {
      return (data?.buttons || []).map((b: ButtonOption) => ({ id: b.id, label: b.title || 'Untitled' }));
    }
    if (nodeType === 'list') {
      return (data?.listRows || []).map((r: ListRow) => ({ id: r.id, label: r.title || 'Untitled' }));
    }
    if (nodeType === 'condition') {
      return [
        { id: 'true', label: 'Yes' },
        { id: 'false', label: 'No' },
      ];
    }
    return [];
  }, [nodeType, data]);

  const summary =
    nodeType === 'message'
      ? data?.text || 'No message set'
      : nodeType === 'buttons'
      ? data?.bodyText || 'No prompt set'
      : nodeType === 'list'
      ? data?.bodyText || 'No prompt set'
      : nodeType === 'condition'
      ? `IF ${data?.variable ? `[${data.variable}]` : 'last reply'} ${data?.operator || 'contains'} "${data?.value || ''}"`
      : nodeType === 'collectInput'
      ? `Ask: ${data?.promptText || '...'} → save as {${data?.variableName || 'variable'}}`
      : nodeType === 'saveData'
      ? `Save ${(data?.fields || []).length} field(s) to contact`
      : nodeType === 'assignAgent'
      ? 'Hands this conversation to a human agent'
      : nodeType === 'end'
      ? data?.text || 'Ends the flow'
      : '';

  return (
    <div
      className="rounded-xl border text-white text-xs shadow-lg min-w-[200px] max-w-[260px]"
      style={{ background: '#0f172a', borderColor: selected ? meta.color : '#334155', borderWidth: selected ? 2 : 1 }}
    >
      <Handle type="target" position={Position.Top} style={{ background: meta.color }} />
      <div className="flex items-center space-x-1.5 px-3 py-2 border-b border-slate-800 font-bold" style={{ color: meta.color }}>
        {meta.icon}
        <span>{meta.label}</span>
      </div>
      <div className="px-3 py-2 text-slate-300 whitespace-pre-line break-words line-clamp-4">{summary}</div>
      {branches.length > 0 ? (
        <div className="border-t border-slate-800 divide-y divide-slate-800/70">
          {branches.map((b) => (
            <div key={b.id} className="relative px-3 py-1.5 text-[11px] text-slate-300 flex items-center justify-between">
              <span className="truncate">{b.label}</span>
              <Handle type="source" position={Position.Right} id={b.id} style={{ background: meta.color, right: -6 }} />
            </div>
          ))}
        </div>
      ) : nodeType !== 'assignAgent' && nodeType !== 'end' ? (
        <Handle type="source" position={Position.Bottom} style={{ background: meta.color }} />
      ) : null}
    </div>
  );
};

const nodeTypes = { flowNode: FlowNodeCard };

function makeDefaultNodeData(nodeType: NodeType): any {
  switch (nodeType) {
    case 'message':
      return { nodeType, text: 'Thank you for contacting us!' };
    case 'buttons':
      return {
        nodeType,
        bodyText: 'How can we help you today?',
        buttons: [
          { id: newId('btn'), title: 'Option 1' },
          { id: newId('btn'), title: 'Option 2' },
        ],
      };
    case 'list':
      return {
        nodeType,
        bodyText: 'Please choose an option:',
        listButtonLabel: 'View Options',
        listRows: [{ id: newId('row'), title: 'Option 1', description: '' }],
      };
    case 'condition':
      return { nodeType, variable: '', operator: 'contains', value: '' };
    case 'collectInput':
      return { nodeType, promptText: 'What is your name?', variableName: 'customerName' };
    case 'saveData':
      return { nodeType, fields: [] as SaveField[] };
    case 'assignAgent':
      return { nodeType };
    case 'end':
      return { nodeType, text: 'Thanks! We\'ll be in touch shortly.' };
    default:
      return { nodeType };
  }
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
    type: 'flowNode',
    data: makeDefaultNodeData('message'),
    position: { x: 250, y: 180 },
  },
];

const initialEdges: Edge[] = [{ id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10b981' } }];

export const FlowBuilder: React.FC<FlowBuilderProps> = ({ flowId, onClose }) => {
  const [name, setName] = useState('Welcome Chatbot Flow');
  const [triggerKeyword, setTriggerKeyword] = useState('hi');
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);

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
        // Legacy nodes (saved before structured node data existed) get
        // upgraded to the custom card renderer so they're editable through
        // the new inspector — their content is preserved via the same
        // label-string field the backend already falls back to reading.
        const upgraded = flowData.definition.nodes.map((n: Node) => {
          if (n.id === '1') return n;
          // width/height are dropped on every load — they're a snapshot of
          // whatever size the node happened to render at on a PREVIOUS
          // save, and our custom card's actual size depends on its content
          // (a Buttons node with 3 options is taller than one with 1).
          // Trusting a stale cached size instead of letting ReactFlow
          // measure the node fresh is what made a button's own connection
          // dot visually drift to the wrong row after reopening a flow —
          // the underlying sourceHandle wiring itself was always correct,
          // only its on-screen position was off.
          const { width, height, ...rest } = n as any;
          if (n.type === 'flowNode' && n.data?.nodeType) return rest;
          const legacyLabel = String(n.data?.label || '');
          let inferredType: NodeType = 'message';
          if (/^🔘/.test(legacyLabel)) inferredType = 'buttons';
          else if (/^🔀/.test(legacyLabel)) inferredType = 'condition';
          else if (/^👤/.test(legacyLabel)) inferredType = 'assignAgent';
          const cleaned = legacyLabel.replace(/^(💬 Send Message:|🔘 Interactive Buttons:|🔀 Condition:|👤 Assign Agent:)\s*/i, '').trim();
          const base = makeDefaultNodeData(inferredType);
          if (inferredType === 'message') base.text = cleaned || base.text;
          return { ...rest, type: 'flowNode', data: { ...base, label: legacyLabel } };
        });
        setNodes(upgraded);
      }
      if (flowData.definition?.edges?.length) {
        setEdges(flowData.definition.edges);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowData]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#10b981' } }, eds)),
    [setEdges]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Never persist width/height for custom nodes — see the load-time
      // comment above for why trusting a cached size instead of a fresh
      // measurement is what caused a button's connection dot to visually
      // drift after reopening a flow.
      const cleanedNodes = nodes.map((n) => {
        if (n.type !== 'flowNode') return n;
        const { width, height, ...rest } = n as any;
        return rest;
      });
      const payload = {
        name,
        triggerKeyword,
        definition: { nodes: cleanedNodes, edges },
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
      toast.success('Chatbot flow saved successfully!');
      onClose();
    },
    onError: (err: any) => {
      toast.error('Failed to save flow', { description: err.response?.data?.error?.message || err.message });
    },
  });

  const handleAddNode = (nodeType: NodeType) => {
    const newNode: Node = {
      id: newId('node'),
      type: 'flowNode',
      data: makeDefaultNodeData(nodeType),
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 150 },
    };
    setNodes((nds) => nds.concat(newNode));
    setIsMobilePaletteOpen(false);
  };

  // Trigger node's on-canvas label mirrors the header's Trigger field live,
  // so what's drawn always matches what's actually configured.
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => (n.id === '1' ? { ...n, data: { ...n.data, label: `⚡ Trigger: Customer sends "${triggerKeyword || '...'}"` } } : n))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKeyword]);

  const handleNodeClick = (_: any, node: Node) => {
    setSelectedEdge(null);
    setSelectedNode(node);
  };

  const handleEdgeClick = (_: any, edge: Edge) => {
    setSelectedNode(null);
    setSelectedEdge(edge);
  };

  const updateSelectedNodeData = (patch: Record<string, any>) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedNode.id) return n;
        const updated = { ...n, data: { ...n.data, ...patch } };
        setSelectedNode(updated);
        return updated;
      })
    );
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdge) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
    setSelectedEdge(null);
  };

  const paletteButtons: { type: NodeType; label: string; icon: React.ReactNode }[] = [
    { type: 'message', label: 'Send Text Message', icon: <MessageSquare className="w-4 h-4 mr-2 text-blue-400 shrink-0" /> },
    { type: 'buttons', label: 'Interactive Buttons', icon: <List className="w-4 h-4 mr-2 text-emerald-400 shrink-0" /> },
    { type: 'list', label: 'List Menu (up to 10)', icon: <List className="w-4 h-4 mr-2 text-cyan-400 shrink-0" /> },
    { type: 'condition', label: 'Conditional Branch', icon: <GitBranch className="w-4 h-4 mr-2 text-amber-400 shrink-0" /> },
    { type: 'collectInput', label: 'Collect Input', icon: <FormInput className="w-4 h-4 mr-2 text-pink-400 shrink-0" /> },
    { type: 'saveData', label: 'Save Data to Contact', icon: <Database className="w-4 h-4 mr-2 text-green-400 shrink-0" /> },
    { type: 'assignAgent', label: 'Assign Support Agent', icon: <UserCheck className="w-4 h-4 mr-2 text-purple-400 shrink-0" /> },
    { type: 'end', label: 'End Flow', icon: <FlagOff className="w-4 h-4 mr-2 text-slate-400 shrink-0" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden flex-1 w-full min-w-0">
      {/* Top Action Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 z-20 shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Flow Name..."
              className="bg-transparent font-bold text-white text-sm sm:text-base focus:outline-none border-b border-transparent focus:border-emerald-500 w-full truncate"
            />
            <div className="flex items-center space-x-2 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">Trigger:</span>
              <input
                type="text"
                value={triggerKeyword}
                onChange={(e) => setTriggerKeyword(e.target.value)}
                placeholder="hi, order..."
                className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500 w-24 sm:w-32"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            onClick={() => setIsMobilePaletteOpen(!isMobilePaletteOpen)}
            className="md:hidden bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center transition-all border border-slate-700 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1 text-purple-400" />
            <span>Add Nodes</span>
          </button>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 sm:px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-xs flex items-center transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saveMutation.isPending ? 'Saving...' : 'Save Flow'}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex overflow-hidden relative w-full">
        {/* Desktop Left Nodes Palette Panel */}
        <div className="hidden md:block w-64 bg-slate-900/90 border-r border-slate-800 p-4 space-y-4 shrink-0 z-10 backdrop-blur-md overflow-y-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Add Flow Nodes
          </span>

          <div className="space-y-2">
            {paletteButtons.map((btn) => (
              <button
                key={btn.type}
                onClick={() => handleAddNode(btn.type)}
                className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-all text-xs flex items-center text-slate-200 cursor-pointer"
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed pt-2 border-t border-slate-800">
            Drag a connection from a Buttons/List option's own dot (each row has one) or a Condition's Yes/No row to
            wire a different next step per branch. A node with no outgoing connection ends the flow there.
          </p>
        </div>

        {/* Mobile Nodes Palette Modal / Sheet */}
        {isMobilePaletteOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center">
                  <Layers className="w-4 h-4 mr-1.5" />
                  Add Flow Nodes
                </span>
                <button onClick={() => setIsMobilePaletteOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs">
                {paletteButtons.map((btn) => (
                  <button
                    key={btn.type}
                    onClick={() => handleAddNode(btn.type)}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center text-slate-200"
                  >
                    {btn.icon}
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ReactFlow Canvas */}
        <div className="flex-1 h-full bg-slate-950 relative">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              // A default edge's actual clickable hitbox is only a few
              // pixels wide, easy to miss and land on a nearby node instead
              // — widened here so clicking anywhere near the wire (not just
              // exactly on its visible line) selects it.
              defaultEdgeOptions={{ interactionWidth: 30 }}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onPaneClick={() => {
                setSelectedNode(null);
                setSelectedEdge(null);
              }}
              deleteKeyCode={['Backspace', 'Delete']}
              fitView
            >
              <Controls className="bg-slate-900 text-white border-slate-800" />
              <MiniMap style={{ background: '#020617', border: '1px solid #1e293b' }} nodeColor="#10b981" className="hidden sm:block" />
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && selectedNode.id === '1' ? (
          <div className="fixed md:relative bottom-0 left-0 right-0 md:right-auto md:left-auto w-full md:w-80 bg-slate-900/95 border-t md:border-t-0 md:border-l border-slate-800 p-5 space-y-4 shrink-0 z-30 backdrop-blur-md rounded-t-2xl md:rounded-none shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Trigger</span>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white p-1 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Trigger Keyword — starts this flow when a customer's message matches
              </label>
              <input
                type="text"
                value={triggerKeyword}
                onChange={(e) => setTriggerKeyword(e.target.value)}
                placeholder="hi, order status, book appointment..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-2">
                Common greeting spellings ("hey", "hii", "hello"...) are automatically tolerated when this is set to a
                greeting word. This node is the flow's single starting point — every other node connects out from it.
              </p>
            </div>
          </div>
        ) : selectedNode ? (
          <div className="fixed md:relative bottom-0 left-0 right-0 md:right-auto md:left-auto w-full md:w-80 bg-slate-900/95 border-t md:border-t-0 md:border-l border-slate-800 p-5 space-y-4 shrink-0 z-30 backdrop-blur-md rounded-t-2xl md:rounded-none shadow-2xl max-h-[70vh] md:max-h-none overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: NODE_META[(selectedNode.data?.nodeType as NodeType) || 'message'].color }}>
                {NODE_META[(selectedNode.data?.nodeType as NodeType) || 'message'].label}
              </span>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white p-1 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>

            <NodeInspector node={selectedNode} onChange={updateSelectedNodeData} />

            <button
              onClick={deleteSelectedNode}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete Node
            </button>
          </div>
        ) : selectedEdge ? (
          <div className="fixed md:relative bottom-0 left-0 right-0 md:right-auto md:left-auto w-full md:w-80 bg-slate-900/95 border-t md:border-t-0 md:border-l border-slate-800 p-5 space-y-4 shrink-0 z-30 backdrop-blur-md rounded-t-2xl md:rounded-none shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Connection</span>
              <button onClick={() => setSelectedEdge(null)} className="text-slate-400 hover:text-white p-1 rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              This wire connects two steps. Delete it to disconnect them — you can then drag a new connection from
              either node's dot to reconnect it elsewhere. (Tip: selecting a wire on the canvas and pressing
              Backspace/Delete does the same thing.)
            </p>
            <button
              onClick={deleteSelectedEdge}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete Connection
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ── Per-node-type inspector form ──────────────────────────────────────────
const NodeInspector: React.FC<{ node: Node; onChange: (patch: Record<string, any>) => void }> = ({ node, onChange }) => {
  const nodeType: NodeType = node.data?.nodeType || 'message';

  if (nodeType === 'message' || nodeType === 'end') {
    return (
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Message Text</label>
        <textarea
          rows={4}
          value={node.data?.text || ''}
          onChange={(e) => onChange({ text: e.target.value })}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
        />
      </div>
    );
  }

  if (nodeType === 'buttons') {
    const buttons: ButtonOption[] = node.data?.buttons || [];
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Message Text</label>
          <textarea
            rows={3}
            value={node.data?.bodyText || ''}
            onChange={(e) => onChange({ bodyText: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
            Buttons (max 3 — WhatsApp limit)
          </label>
          <div className="space-y-2">
            {buttons.map((b, idx) => (
              <div key={b.id} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={b.title}
                  maxLength={20}
                  onChange={(e) => {
                    const next = buttons.map((btn, i) => (i === idx ? { ...btn, title: e.target.value } : btn));
                    onChange({ buttons: next });
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder={`Button ${idx + 1}`}
                />
                <button
                  onClick={() => onChange({ buttons: buttons.filter((_, i) => i !== idx) })}
                  className="text-rose-400 hover:text-rose-300 p-1"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {buttons.length < 3 && (
              <button
                onClick={() => onChange({ buttons: [...buttons, { id: newId('btn'), title: `Option ${buttons.length + 1}` }] })}
                className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Button
              </button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-500">Drag a connection from each button's own dot on the canvas to wire its next step.</p>
      </div>
    );
  }

  if (nodeType === 'list') {
    const rows: ListRow[] = node.data?.listRows || [];
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Message Text</label>
          <textarea
            rows={2}
            value={node.data?.bodyText || ''}
            onChange={(e) => onChange({ bodyText: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">"View Options" Button Label</label>
          <input
            type="text"
            maxLength={20}
            value={node.data?.listButtonLabel || ''}
            onChange={(e) => onChange({ listButtonLabel: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Rows (max 10)</label>
          <div className="space-y-2">
            {rows.map((r, idx) => (
              <div key={r.id} className="p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={r.title}
                    maxLength={24}
                    onChange={(e) => {
                      const next = rows.map((row, i) => (i === idx ? { ...row, title: e.target.value } : row));
                      onChange({ listRows: next });
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`Row ${idx + 1} title`}
                  />
                  <button onClick={() => onChange({ listRows: rows.filter((_, i) => i !== idx) })} className="text-rose-400 hover:text-rose-300 p-1">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {rows.length < 10 && (
              <button
                onClick={() => onChange({ listRows: [...rows, { id: newId('row'), title: `Option ${rows.length + 1}` }] })}
                className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (nodeType === 'condition') {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
            Variable (leave blank to check the customer's raw reply)
          </label>
          <input
            type="text"
            value={node.data?.variable || ''}
            onChange={(e) => onChange({ variable: e.target.value })}
            placeholder="e.g. customerName (from a Collect Input node)"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Condition</label>
          <select
            value={node.data?.operator || 'contains'}
            onChange={(e) => onChange({ operator: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="contains">Contains</option>
            <option value="equals">Equals exactly</option>
            <option value="notEquals">Does not equal</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Value to compare</label>
          <input
            type="text"
            value={node.data?.value || ''}
            onChange={(e) => onChange({ value: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <p className="text-[10px] text-slate-500">Connect the "Yes" row for a match, "No" for everything else.</p>
      </div>
    );
  }

  if (nodeType === 'collectInput') {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Question to Ask</label>
          <textarea
            rows={2}
            value={node.data?.promptText || ''}
            onChange={(e) => onChange({ promptText: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Save Answer As (variable name)</label>
          <input
            type="text"
            value={node.data?.variableName || ''}
            onChange={(e) => onChange({ variableName: e.target.value.replace(/\s+/g, '_') })}
            placeholder="e.g. appointmentDate"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>
      </div>
    );
  }

  if (nodeType === 'saveData') {
    const fields: SaveField[] = node.data?.fields || [];
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-slate-400">
          Writes collected variables (from Collect Input nodes earlier in this flow) permanently onto the contact's
          record, and logs this as a completed flow submission.
        </p>
        <div className="space-y-2">
          {fields.map((f, idx) => (
            <div key={idx} className="p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
              <input
                type="text"
                value={f.variableName}
                onChange={(e) => {
                  const next = fields.map((fl, i) => (i === idx ? { ...fl, variableName: e.target.value.replace(/\s+/g, '_') } : fl));
                  onChange({ fields: next });
                }}
                placeholder="Variable name (e.g. appointmentDate)"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={f.attributeKey}
                  onChange={(e) => {
                    const next = fields.map((fl, i) => (i === idx ? { ...fl, attributeKey: e.target.value.replace(/\s+/g, '_') } : fl));
                    onChange({ fields: next });
                  }}
                  placeholder="Save to contact field (e.g. appointment_date)"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <button onClick={() => onChange({ fields: fields.filter((_, i) => i !== idx) })} className="text-rose-400 hover:text-rose-300 p-1">
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => onChange({ fields: [...fields, { variableName: '', attributeKey: '' }] })}
            className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
          </button>
        </div>
      </div>
    );
  }

  if (nodeType === 'assignAgent') {
    return (
      <p className="text-[11px] text-slate-400">
        When reached, this hands the conversation to a human agent (round-robin across your team) and stops the flow
        there — the same assignment logic used everywhere else in Live Inbox.
      </p>
    );
  }

  return null;
};
