import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MiniMap,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import { generateHistoricalEvents, generateImmersiveImage, generateExpansionEvents, generateDynamicScenePrompt } from './services/geminiService';
import CustomNode from './components/CustomNode';
import ImagePreviewModal from './components/ImagePreviewModal';
import ApiKeyModal from './components/ApiKeyModal';
import { HistoricalEvent, NodeData } from './types';
import { fileToBase64 } from './utils/file';

const initialNodes: Node<NodeData>[] = [
  {
    id: 'root',
    type: 'custom',
    position: { x: 0, y: 0 },
    data: {
      type: 'root',
      image: null,
      title: 'Start Your Journey',
      text: 'Upload a clear, front-facing photo to begin.',
      isLoading: false,
    },
  },
];

const API_KEY_STORAGE_KEY = 'gemini-api-key';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<Node<NodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [userImage, setUserImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(true);
  const [apiKeyError, setApiKeyError] = useState('');

  const userImageRef = useRef(userImage);
  userImageRef.current = userImage;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setIsApiKeyModalOpen(false);
    }
  }, []);

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
    setIsApiKeyModalOpen(false);
    setApiKeyError('');
  };

  const handleApiError = (error: any) => {
    console.error('API Error:', error);
    // Heuristic to check for auth-related errors
    if (error instanceof Error && (error.message.includes('400') || error.message.includes('API key not valid'))) {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      setApiKey(null);
      setApiKeyError('Your API Key is invalid or expired. Please enter a new one.');
      setIsApiKeyModalOpen(true);
      return true;
    }
    return false;
  }

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const handleImagePreview = useCallback((imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
  }, []);

  const handleGenerateImage = useCallback(async (nodeId: string, eventPrompt: string) => {
    const currentUserImage = userImageRef.current;
    if (!currentUserImage) {
      console.error("Attempted to generate image, but no user image is available.");
      return;
    }
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, isLoading: true, text: 'Crafting a unique prompt...' } } : node
      )
    );

    try {
      const dynamicPrompt = await generateDynamicScenePrompt(apiKey, eventPrompt);

      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, text: 'Entering the time portal...' } } : node
        )
      );

      const generatedImage = await generateImmersiveImage(apiKey, currentUserImage, dynamicPrompt);
      
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  image: generatedImage,
                  isLoading: false,
                  text: '',
                },
              }
            : node
        )
      );
    } catch (error) {
      if (!handleApiError(error)) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, text: 'Generation failed. Try again.', isLoading: false } }
              : node
          )
        );
      }
    }
  }, [apiKey]);
  
  const handleNodeExpansion = useCallback(async (nodeId: string, baseEvent: HistoricalEvent) => {
    const parentNode = nodesRef.current.find(n => n.id === nodeId);
    if (!parentNode) return;
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, isLoading: true } } : node
      )
    );

    try {
      const newEvents = await generateExpansionEvents(apiKey, baseEvent);
      
      const newNodes: Node<NodeData>[] = [];
      const newEdges: Edge[] = [];
      const radius = 350;
      const angleStep = (Math.PI) / (newEvents.length -1 || 1); 

      newEvents.forEach((event, index) => {
        const angle = -Math.PI / 2 + (index * angleStep);
        const x = parentNode.position.x + radius * Math.cos(angle);
        const y = parentNode.position.y + radius * Math.sin(angle) + 200;
        
        const newNodeId = `${nodeId}-expansion-${index}`;
        newNodes.push({
          id: newNodeId,
          type: 'custom',
          position: { x, y },
          data: {
            type: 'event',
            image: null,
            title: event.title,
            text: 'Click to generate your scene in this era.',
            eventPrompt: event.prompt,
            onGenerateImage: handleGenerateImage,
            onImagePreview: handleImagePreview,
            onExpandNode: handleNodeExpansion,
            isLoading: false,
          },
        });
  
        newEdges.push({
          id: `e-${nodeId}-${newNodeId}`,
          source: nodeId,
          target: newNodeId,
          animated: true,
          style: { stroke: '#00ffcc', strokeWidth: 2 },
        });
      });

      setNodes((nds) => [...nds, ...newNodes]);
      setEdges((eds) => [...eds, ...newEdges]);

    } catch (error) {
      handleApiError(error)
    } finally {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, isLoading: false } } : node
        )
      );
    }
  }, [apiKey, handleGenerateImage, handleImagePreview]);


  const createEventNodes = useCallback((events: HistoricalEvent[]) => {
    const newNodes: Node<NodeData>[] = [];
    const newEdges: Edge[] = [];
    const radius = 500;
    const angleStep = (2 * Math.PI) / events.length;

    events.forEach((event, index) => {
      const angle = index * angleStep;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      const nodeId = `event-${index}`;
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x, y },
        data: {
          type: 'event',
          image: null,
          title: event.title,
          text: 'Click to generate your scene in this era.',
          eventPrompt: event.prompt,
          onGenerateImage: handleGenerateImage,
          onImagePreview: handleImagePreview,
          onExpandNode: handleNodeExpansion,
          isLoading: false,
        },
      });

      newEdges.push({
        id: `e-root-${nodeId}`,
        source: 'root',
        target: nodeId,
        animated: true,
        style: { stroke: '#00ffcc', strokeWidth: 2 },
      });
    });

    setNodes((nds) => [...nds.filter(n => n.id === 'root'), ...newNodes]);
    setEdges(newEdges);
  }, [handleGenerateImage, handleImagePreview, handleNodeExpansion]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const imageUrl = `data:${mimeType};base64,${base64}`;
      setUserImage({ base64, mimeType });

      setNodes((nds) =>
        nds.map((node) =>
          node.id === 'root'
            ? {
                ...node,
                data: {
                  ...node.data,
                  image: imageUrl,
                  title: 'Ready to Travel',
                  text: 'The timeline is being generated...',
                  isLoading: true,
                },
              }
            : node
        )
      );
      
      const events = await generateHistoricalEvents(apiKey);
      
      setNodes((nds) =>
        nds.map((node) =>
          node.id === 'root'
            ? {
                ...node,
                data: { ...node.data, text: 'Click on a portal to generate a scene.', isLoading: false },
              }
            : node
        )
      );
      
      createEventNodes(events);

    } catch (error) {
      if(!handleApiError(error)) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === 'root'
              ? {
                  ...node,
                  data: { ...node.data, title: 'Upload Failed', text: 'Please try another image.', isLoading: false },
                }
              : node
          )
        );
      }
    }
  }, [apiKey, createEventNodes]);
  
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === 'root' ? { ...n, data: { ...n.data, onImageUpload: handleImageUpload, onImagePreview: handleImagePreview } } : n
      )
    );
  }, [handleImageUpload, handleImagePreview]);


  return (
    <div style={{ height: '100vh', width: '100vw' }} className="bg-gray-900">
       {isApiKeyModalOpen && <ApiKeyModal onSubmit={handleApiKeySubmit} error={apiKeyError} />}
       <div className="absolute top-4 left-4 z-10 text-white p-4 bg-black bg-opacity-50 rounded-lg">
          <h1 className="text-2xl font-bold text-cyan-300">Gemini Time Traveler</h1>
          <p className="text-sm text-gray-300">Create your personal journey through history.</p>
        </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-900"
      >
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
        <Background color="#4f4f4f" gap={24} />
      </ReactFlow>
      {previewImageUrl && (
        <ImagePreviewModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
      )}
    </div>
  );
};

export default App;