import { useEffect, useState } from 'react';
import { Network, Loader2, Info } from 'lucide-react';
import { api } from '../lib/api';
import type { DsaProblem, Resource, Note, PlacementNote } from '../types';
import { toast } from 'sonner';

// Conditionally import ForceGraph2D to prevent SSR issues if any, or render client side
export function GraphPage() {
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ForceGraph2D, setForceGraph2D] = useState<any>(null);

  // Dynamically load the component on mount
  useEffect(() => {
    import('react-force-graph').then((m) => {
      // ForceGraph2D is a named export or default export depending on the version
      setForceGraph2D(() => m.ForceGraph2D);
    }).catch(err => {
      console.error("Failed to load force graph package", err);
    });
  }, []);

  const fetchGraphData = async () => {
    try {
      const [problemsRes, resourcesRes, notesRes, placementRes] = await Promise.all([
        api.get('/dsa').catch(() => ({ data: { data: [] } })),
        api.get('/resources').catch(() => ({ data: { data: { resources: [] } } })),
        api.get('/notes').catch(() => ({ data: { data: { notes: [] } } })),
        api.get('/placement').catch(() => ({ data: { data: { notes: [] } } }))
      ]);

      const problems = (problemsRes.data.data || []) as DsaProblem[];
      const resources = (resourcesRes.data.data.resources || []) as Resource[];
      const notes = (notesRes.data.data.notes || []) as Note[];
      const placement = (placementRes.data.data.notes || []) as PlacementNote[];

      // Build Graph
      const nodes: any[] = [];
      const links: any[] = [];

      // Helper to add nodes safely without duplicates
      const addNode = (id: string, name: string, color: string, val: number, group: number) => {
        if (!nodes.some(n => n.id === id)) {
          nodes.push({ id, name, color, val, group });
        }
      };

      // 1. Root structural nodes
      addNode('dsa_root', 'DSA Topics', '#10b981', 12, 1);
      addNode('notes_root', 'Knowledge Vault', '#8b5cf6', 12, 2);
      addNode('resources_root', 'Resource Vault', '#3b82f6', 12, 3);
      addNode('placement_root', 'Placement subjects', '#f43f5e', 12, 4);

      // 2. Add DSA Topics & problems
      const topicsSet = new Set<string>();
      problems.forEach(p => {
        p.topics?.forEach(t => {
          const topicId = `topic_${t}`;
          topicsSet.add(t);
          addNode(topicId, t.replace('_', ' '), '#34d399', 8, 1);
          links.push({ source: 'dsa_root', target: topicId });

          // Connect problem to topic
          const problemNodeId = `problem_${p.id}`;
          addNode(problemNodeId, p.name, '#6ee7b7', 4, 1);
          links.push({ source: topicId, target: problemNodeId });
        });
      });

      // 3. Add Notes categories
      notes.forEach(note => {
        const noteNodeId = `note_${note.id}`;
        addNode(noteNodeId, note.title || 'Untitled Note', '#a78bfa', 4, 2);
        
        if (note.category) {
          const catId = `note_cat_${note.category}`;
          addNode(catId, note.category, '#c084fc', 7, 2);
          links.push({ source: 'notes_root', target: catId });
          links.push({ source: catId, target: noteNodeId });
        } else {
          links.push({ source: 'notes_root', target: noteNodeId });
        }
      });

      // 4. Add Resource Bookmarks
      resources.forEach(res => {
        const resNodeId = `res_${res.id}`;
        addNode(resNodeId, res.title, '#60a5fa', 4, 3);
        
        if (res.folderId) {
          const folderNodeId = `folder_${res.folderId}`;
          addNode(folderNodeId, res.folder?.name || 'Folder', '#93c5fd', 7, 3);
          links.push({ source: 'resources_root', target: folderNodeId });
          links.push({ source: folderNodeId, target: resNodeId });
        } else {
          links.push({ source: 'resources_root', target: resNodeId });
        }
      });

      // 5. Add Placement Prep subjects & cards
      placement.forEach(pn => {
        const pnNodeId = `prep_${pn.id}`;
        addNode(pnNodeId, pn.title, '#f472b6', 4, 4);

        const secId = `prep_sec_${pn.section}`;
        addNode(secId, pn.section.replace('_', ' '), '#fb7185', 7, 4);
        links.push({ source: 'placement_root', target: secId });
        links.push({ source: secId, target: pnNodeId });
      });

      // Seed a few dummy structural nodes if database is empty to show a beautiful initial graph
      if (problems.length === 0 && resources.length === 0 && notes.length === 0 && placement.length === 0) {
        addNode('dummy_dp', 'Dynamic Programming', '#34d399', 8, 1);
        addNode('dummy_graphs', 'Graphs', '#34d399', 8, 1);
        links.push({ source: 'dsa_root', target: 'dummy_dp' });
        links.push({ source: 'dsa_root', target: 'dummy_graphs' });

        addNode('dummy_dbms', 'DBMS Notes', '#fb7185', 7, 4);
        addNode('dummy_os', 'OS Questions', '#fb7185', 7, 4);
        links.push({ source: 'placement_root', target: 'dummy_dbms' });
        links.push({ source: 'placement_root', target: 'dummy_os' });
      }

      setGraphData({ nodes, links });
    } catch (err) {
      toast.error('Failed to parse knowledge graph elements');
    }
  };

  useEffect(() => {
    fetchGraphData().finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 h-[calc(100vh-80px)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" /> Knowledge Graph
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Explore connections between DSA problems, resources, notes, and prep subjects</p>
        </div>
        <div className="bg-secondary/40 border border-border px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-primary" /> Drag nodes to inspect links. Scroll to zoom.
        </div>
      </div>

      {/* Force Graph Container */}
      <div className="flex-1 border border-border rounded-xl overflow-hidden bg-[#0a0c10] relative">
        {loading || !ForceGraph2D ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Parsing nodes and links...</p>
          </div>
        ) : (
          <ForceGraph2D
            graphData={graphData}
            nodeLabel="name"
            nodeColor={(node: any) => node.color}
            nodeVal={(node: any) => node.val}
            linkColor={() => '#2e323e'}
            linkWidth={1.5}
            backgroundColor="#0a0c10"
            width={window.innerWidth > 768 ? window.innerWidth - 300 : window.innerWidth - 48}
            height={window.innerHeight - 200}
            cooldownTicks={100}
            nodeCanvasObject={(node: any, ctx: any, globalScale: any) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Inter, sans-serif`;
              
              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, Math.sqrt(node.val) * 2, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color;
              ctx.fill();

              // Draw label text
              if (globalScale > 1.5) {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#f5f5f5';
                ctx.fillText(label, node.x, node.y + Math.sqrt(node.val) * 2 + fontSize);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
export default GraphPage;
