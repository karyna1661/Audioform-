'use client';

import { useState } from 'react';

interface Document {
  id: string;
  title: string;
  lines: number;
  status: 'complete' | 'in-progress' | 'planned';
  category: 'product' | 'technical' | 'civic' | 'executive';
  description: string;
  path: string;
}

const documents: Document[] = [
  {
    id: 'roadmap',
    title: '📄 Comprehensive Roadmap',
    lines: 1382,
    status: 'complete',
    category: 'product',
    description: 'Phase 1-5 product strategy with AI integration',
    path: 'AUDIOFORM_COMPREHENSIVE_ROADMAP.md'
  },
  {
    id: 'vop-launch',
    title: '🚀 VOP v1 48H Launch Plan',
    lines: 1006,
    status: 'complete',
    category: 'civic',
    description: 'Hour-by-hour execution guide for first campaign',
    path: 'VOP_V1_48HOUR_LAUNCH_PLAN.md'
  },
  {
    id: 'master-index',
    title: '🌍 Ecosystem Master Index',
    lines: 649,
    status: 'complete',
    category: 'executive',
    description: 'Navigation hub for all Voxera documentation',
    path: 'VOXERA_ECOSYSTEM_MASTER_INDEX.md'
  },
  {
    id: 'exec-summary',
    title: '🎯 Executive Synthesis',
    lines: 530,
    status: 'complete',
    category: 'executive',
    description: 'One-page strategic overview',
    path: 'EXECUTIVE_SYNTHESIS_SUMMARY.md'
  },
  {
    id: 'scalability',
    title: '🏗️ Scalability Blueprint',
    lines: 458,
    status: 'complete',
    category: 'technical',
    description: '10 critical gaps with implementation plan',
    path: 'audioform-production-scalability-blueprint.md'
  },
  {
    id: 'api-patterns',
    title: '📝 API Patterns',
    lines: 1061,
    status: 'complete',
    category: 'technical',
    description: '8 production-ready code templates',
    path: 'audioform-scalable-api-patterns.md'
  },
  {
    id: 'load-testing',
    title: '🧪 Load Testing Strategy',
    lines: 703,
    status: 'complete',
    category: 'technical',
    description: '5 test scenarios with k6 scripts',
    path: 'audioform-load-testing-strategy.md'
  },
  {
    id: 'checklist',
    title: '✅ Implementation Checklist',
    lines: 380,
    status: 'complete',
    category: 'technical',
    description: 'Daily progress tracking template',
    path: 'SCALABILITY_CHECKLIST.md'
  }
];

export default function VisualCommandCenter() {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [activeView, setActiveView] = useState<'mindmap' | 'timeline' | 'ecosystem'>('mindmap');
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    'docs-complete': true
  });

  const toggleTask = (id: string) => {
    setCompletedTasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalLines = documents.reduce((sum, doc) => sum + doc.lines, 0);
  const completedDocs = documents.filter(d => d.status === 'complete').length;
  const progressPercentage = Math.round((completedDocs / documents.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 animate-fade-in">
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-teal-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          🎯 Voxera Ecosystem Command Center
        </h1>
        <p className="text-slate-400 text-lg">Interactive Strategy Map & Progress Dashboard</p>
        
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 hover:bg-white/15 transition-all cursor-default">
            <div className="text-3xl font-bold text-teal-400">{documents.length}</div>
            <div className="text-sm text-slate-400">Documents Created</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 hover:bg-white/15 transition-all cursor-default">
            <div className="text-3xl font-bold text-purple-400">{totalLines.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Total Lines of Strategy</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 hover:bg-white/15 transition-all cursor-default">
            <div className="text-3xl font-bold text-pink-400">{progressPercentage}%</div>
            <div className="text-sm text-slate-400">Documentation Complete</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 hover:bg-white/15 transition-all cursor-default">
            <div className="text-3xl font-bold text-orange-400">{Object.keys(completedTasks).length}</div>
            <div className="text-sm text-slate-400">Tasks Tracked</div>
          </div>
        </div>
      </div>

      {/* View Switcher */}
      <div className="max-w-7xl mx-auto mb-8 flex gap-2">
        <button
          onClick={() => setActiveView('mindmap')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeView === 'mindmap'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
              : 'bg-white/10 text-slate-300 hover:bg-white/20'
          }`}
        >
          🧠 Mind Map
        </button>
        <button
          onClick={() => setActiveView('timeline')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeView === 'timeline'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
              : 'bg-white/10 text-slate-300 hover:bg-white/20'
          }`}
        >
          📅 Timeline
        </button>
        <button
          onClick={() => setActiveView('ecosystem')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeView === 'ecosystem'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
              : 'bg-white/10 text-slate-300 hover:bg-white/20'
          }`}
        >
          🌐 Ecosystem Layers
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {activeView === 'mindmap' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-in-left">
            {/* Documents Grid */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-purple-400">📚 Documentation Universe</h2>
              {documents.map((doc, index) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                  className={`cursor-pointer rounded-xl p-6 transition-all border-2 ${
                    selectedDoc?.id === doc.id
                      ? 'bg-purple-600/30 border-purple-500 shadow-lg shadow-purple-500/30'
                      : 'bg-white/5 border-white/10 hover:border-purple-500/50 hover:bg-white/10'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{doc.title.split(' ')[0]}</span>
                        <h3 className="text-xl font-semibold">{doc.title.slice(2)}</h3>
                      </div>
                      <p className="text-slate-400 mb-3">{doc.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-teal-400">{doc.lines.toLocaleString()} lines</span>
                        <span className={`px-2 py-1 rounded ${
                          doc.status === 'complete' ? 'bg-green-500/20 text-green-400' :
                          doc.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {doc.status.replace('-', ' ').toUpperCase()}
                        </span>
                        <span className="text-purple-400 capitalize">{doc.category}</span>
                      </div>
                    </div>
                    <div 
                      className={`text-2xl transition-transform ${selectedDoc?.id === doc.id ? 'rotate-180' : ''}`}
                    >
                      ▼
                    </div>
                  </div>
                  
                  {selectedDoc?.id === doc.id && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-sm text-slate-400 mb-2">File: <code className="text-teal-400">{doc.path}</code></p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`file:///${doc.path}`, '_blank');
                        }}
                        className="mt-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        📖 Open Document
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Actions & Next Steps */}
            <div className="space-y-6 animate-slide-in-right">
              {/* Immediate Actions */}
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl p-6 border-2 border-red-500/50">
                <h2 className="text-2xl font-bold text-red-400 mb-4">🔥 IMMEDIATE ACTIONS (This Week)</h2>
                <div className="space-y-3">
                  {[
                    { id: 'vop-decision', text: 'Make go/no-go decision on VOP v1' },
                    { id: 'survey-setup', text: 'Set up VOP v1 survey in Audioform' },
                    { id: 'distribution-assets', text: 'Create distribution assets (social posts, DMs)' },
                    { id: 'launch-push', text: 'Launch distribution push to networks' },
                    { id: 'beta-readiness', text: 'Complete scalability Phase 1 items' }
                  ].map((task) => (
                    <label key={task.id} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={!!completedTasks[task.id]}
                        onChange={() => toggleTask(task.id)}
                        className="mt-1 w-5 h-5 rounded border-2 border-red-400 bg-white/10 checked:bg-red-600 focus:ring-red-500"
                      />
                      <span className={`transition-colors ${
                        completedTasks[task.id] ? 'text-slate-400 line-through' : 'text-white group-hover:text-red-300'
                      }`}>
                        {task.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Core Moat */}
              <div className="bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-xl p-6 border-2 border-teal-500/50">
                <h2 className="text-2xl font-bold text-teal-400 mb-4">🎯 CORE MOAT</h2>
                <div className="text-center space-y-4">
                  <div className="text-lg text-slate-300">Better Questions → Better Voice → Better Insight</div>
                  <div className="text-4xl">⚡</div>
                  <div className="text-sm text-slate-400">Not AI. Not blockchain. Question intelligence.</div>
                </div>
              </div>

              {/* North Star Metric */}
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 border-2 border-purple-500/50">
                <h2 className="text-2xl font-bold text-purple-400 mb-4">⭐ NORTH STAR METRIC</h2>
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-400 mb-2">Weekly Active Surveys</div>
                  <div className="text-sm text-slate-400 mb-4">Surveys collecting ≥5 responses/week</div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-xs text-slate-400">Month 1</div>
                      <div className="text-lg font-bold text-teal-400">10</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Month 3</div>
                      <div className="text-lg font-bold text-yellow-400">50</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Month 6</div>
                      <div className="text-lg font-bold text-orange-400">200</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Month 12</div>
                      <div className="text-lg font-bold text-red-400">1,000</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'timeline' && (
          <div className="space-y-6 animate-slide-in-up">
            <h2 className="text-3xl font-bold text-purple-400">📅 Product Development Timeline</h2>
            
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 via-orange-500 via-yellow-500 via-green-500 via-blue-500 rounded-full"></div>
              
              {[
                {
                  id: 'phase1',
                  name: 'Foundation (No AI)',
                  timeline: 'Weeks 1-4',
                  color: '#ef4444',
                  items: ['Voice survey builder', 'Mobile recorder', 'Manual extraction', '100 responses in 48h']
                },
                {
                  id: 'phase2',
                  name: 'AI Extractor',
                  timeline: 'Months 2-3',
                  color: '#f97316',
                  items: ['Whisper transcription', 'Claude insights', 'Theme clustering', '$29/mo first customer']
                },
                {
                  id: 'phase3',
                  name: 'Insight Mining Rig',
                  timeline: 'Months 4-6',
                  color: '#eab308',
                  items: ['Cross-survey trends', 'Auto-categorization', 'Real-time analytics', '$2k MRR']
                },
                {
                  id: 'phase4',
                  name: 'Best Insight Clips ⭐',
                  timeline: 'Months 6-9',
                  color: '#22c55e',
                  items: ['AI clip extraction', 'Emotional scoring', 'Shareable player', '20% share rate']
                },
                {
                  id: 'phase5',
                  name: 'Voice Insight Engine',
                  timeline: 'Months 9-12',
                  color: '#3b82f6',
                  items: ['Predictive ML', 'Recommendations', 'Longitudinal studies', '$15k MRR']
                }
              ].map((phase, index) => (
                <div
                  key={phase.id}
                  className="relative pl-20 pb-12"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  {/* Timeline Dot */}
                  <div 
                    className="absolute left-6 w-5 h-5 rounded-full border-4 border-white shadow-lg"
                    style={{ backgroundColor: phase.color }}
                  ></div>
                  
                  <div 
                    className="rounded-xl p-6 border-2 transition-all hover:shadow-xl"
                    style={{ borderColor: phase.color, backgroundColor: `${phase.color}20` }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold" style={{ color: phase.color }}>
                        {phase.name}
                      </h3>
                      <span className="px-4 py-2 rounded-lg bg-white/10 text-sm font-medium">
                        {phase.timeline}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {phase.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!completedTasks[`phase-${phase.id}-item-${i}`]}
                            onChange={() => toggleTask(`phase-${phase.id}-item-${i}`)}
                            className="w-5 h-5 rounded border-2 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900"
                            style={{ borderColor: phase.color }}
                          />
                          <span className="text-slate-200">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'ecosystem' && (
          <div className="space-y-8 animate-zoom-in">
            <h2 className="text-3xl font-bold text-purple-400">🌐 Three-Layer Ecosystem Architecture</h2>
            
            {/* Ecosystem Layers */}
            <div className="space-y-8">
              {[
                {
                  name: 'Voxera Protocol',
                  timeline: 'Years 2-5',
                  description: 'Voice as Economic Signal',
                  color: '#8b5cf6',
                  features: ['Decentralized marketplace', 'Oral signal trading', 'Community governance']
                },
                {
                  name: 'Voxera Civic Lab',
                  timeline: 'Months 6-24',
                  description: 'Voice Infrastructure for Society',
                  color: '#ec4899',
                  features: ['VOP campaigns', 'Signal Mapping', 'Grant funding', 'NGO partnerships']
                },
                {
                  name: 'Audioform',
                  timeline: 'Months 0-12',
                  description: 'Voice Feedback for Builders',
                  color: '#14b8a6',
                  features: ['Survey builder', 'AI insights', 'Revenue generator', 'START NOW']
                }
              ].map((layer, index) => (
                <div
                  key={layer.name}
                  className="rounded-2xl p-8 border-4 backdrop-blur-sm"
                  style={{ 
                    borderColor: layer.color,
                    backgroundColor: `${layer.color}15`
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-3xl font-bold mb-2" style={{ color: layer.color }}>
                        {layer.name}
                      </h3>
                      <p className="text-xl text-slate-300">{layer.description}</p>
                    </div>
                    <span className="px-4 py-2 rounded-lg bg-white/10 text-sm font-medium">
                      {layer.timeline}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {layer.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg p-4">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: layer.color }}></div>
                        <span className="text-slate-200">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {index < 2 && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <div className="text-center text-slate-400 text-sm">
                        ↓ Funds & enables the layer below ↓
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Strategic Flywheel */}
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-8 border-2 border-purple-500/50">
              <h3 className="text-2xl font-bold text-purple-400 mb-6">🔄 The Strategic Flywheel</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="space-y-2">
                  <div className="text-4xl">💰</div>
                  <div className="font-semibold text-teal-400">Audioform Revenue</div>
                  <div className="text-sm text-slate-400">Funds Civic Lab programs</div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl">🎯</div>
                  <div className="font-semibold text-pink-400">Civic Impact</div>
                  <div className="text-sm text-slate-400">Attracts more users & grants</div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl">🚀</div>
                  <div className="font-semibold text-purple-400">Build Protocol</div>
                  <div className="text-sm text-slate-400">Transform decision-making</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 text-center text-slate-400">
        <p className="text-lg mb-2">🎯 Ready to Execute</p>
        <p className="text-sm">Start here: <code className="text-teal-400">future-work/VOP_V1_48HOUR_LAUNCH_PLAN.md</code></p>
        <p className="text-xs mt-4 text-slate-500">Built with ❤️ for Voxera Ecosystem • March 18, 2026</p>
      </footer>

      {/* Custom CSS Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-up {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.6s ease-out;
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.6s ease-out;
        }
        .animate-slide-in-up {
          animation: slide-in-up 0.6s ease-out;
        }
        .animate-zoom-in {
          animation: zoom-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
