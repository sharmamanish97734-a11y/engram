// --- TINY STORE HOOK (replaces Zustand) ---
const useStore = (store, selector) => {
  return React.useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState())
  );
};

// --- GLOBAL DESTRUCTURING ---
const { useState, useEffect, useMemo, useCallback, useSyncExternalStore, useRef } = React;

// --- INTERSECTION OBSERVER LAZY REVEAL HOOK ---
const useLazyReveal = (threshold = 0.12) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

// --- SIMPLE HASH ROUTER (no external dependency) ---
const routerStore = window.createStore((set) => ({
  path: window.location.hash.slice(1) || '/',
}));

const useNavigate = () => {
  return (path) => {
    window.location.hash = path;
    routerStore.setState({ path });
  };
};

const useParams = () => {
  const path = useStore(routerStore, s => s.path);
  // Simple param extraction from path like /learn/123 -> {id: '123'}
  const match = path.match(/^\/(\w+)\/(.+)$/);
  if (!match) return {};
  
  // Strip query parameters from the ID (e.g. 123?all=true -> 123)
  const id = match[2].split('?')[0];
  return { id };
};

const useRouterPath = () => useStore(routerStore, s => s.path);

// Simple icon fallback system
const iconMap = {
  'home': '🏠', 'book-open': '📖', 'play': '▶️', 'trophy': '🏆', 'log-out': '🚪',
  'flame': '🔥', 'zap': '⚡', 'book': '📚', 'check-circle': '✅', 'clock': '⏱️',
  'clock-3': '🕐', 'arrow-down-left': '↙️', 'arrow-up-right': '↗️', 'x-circle': '❌',
  'arrow-left': '⬅️', 'x': '❌', 'rotate-cw': '🔄', 'brain': '🧠', 'wand': '🪄', 'sparkles': '✨', 'lightbulb': '💡',
  'history': '🕒', 'refresh-cw': '🔄', 'trash-2': '🗑️', 'target': '🎯', 'plus': '➕', 'loader': '⌛'
};

const Icon = ({ name, className = "inline-block w-5 h-5", style }) => {
  return <span className={className} style={style}>{iconMap[name] || '•'}</span>;
}

const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const isLocal = window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1' || 
                 window.location.hostname === '0.0.0.0' ||
                 window.location.hostname.startsWith('192.168.');

const API_BASE = isLocal
  ? `http://${window.location.hostname}:8080`
  : "https://engram-backend-hckw.onrender.com";


// --- API CLIENT ---
const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- AUTH STORE ---
const authStore = window.createStore((set, get) => ({
  user: null,
  setUser: (user) => set({ user })
}));

// Convenience hooks
const useAuthStore = (selector) => useStore(authStore, selector || (s => s));

const syncCurrentUser = () =>
  api.get('/auth/me').then(res => {
    authStore.getState().setUser(res.data);
    return res.data;
  }).catch(err => {
    console.error("Failed to sync user:", err);
  });

// --- SIMPLE DATA FETCHING HOOK (replaces React Query) ---
const useQuery = ({ queryKey, queryFn, enabled = true }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchCount, setRefetchCount] = useState(0);

  const keyStr = JSON.stringify(queryKey);

  useEffect(() => {
    if (!enabled) { setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true);
    queryFn()
      .then(result => { if (!cancelled) { setData(result); setIsLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err); setIsLoading(false); } });
    return () => { cancelled = true; };
  }, [keyStr, refetchCount, enabled]);

  const refetch = useCallback(() => setRefetchCount(c => c + 1), []);

  return { data, isLoading, error, refetch };
};

// --- COMPONENTS ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-surface border border-gray-800 rounded-2xl p-6 shadow-xl ${className}`}>
    {children}
  </div>
);

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-800 rounded-lg ${className}`}></div>
);

// Lazy reveal wrapper — fades+slides in when it enters the viewport
const LazyCard = ({ children, delay = 0, className = "" }) => {
  const [ref, visible] = useLazyReveal();
  return (
    <div
      ref={ref}
      className={`${className} ${visible ? 'lazy-visible' : 'lazy-hidden'}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0F]/90 backdrop-blur-sm">
      <Card className="w-full max-w-sm border-primary/20 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="sparkles" className="text-primary w-5 h-5" /> {title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><Icon name="x" /></button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </Card>
    </div>
  );
};


const Button = ({ children, onClick, variant = 'primary', className = "", type = "button", disabled = false }) => {
  const base = "w-full py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100";
  const variants = {
    primary: "bg-gradient-to-r from-primary to-primaryFocus text-white shadow-lg shadow-primary/25",
    secondary: "bg-gray-800 text-white hover:bg-gray-700",
    danger: "bg-danger text-white shadow-lg shadow-danger/25",
    success: "bg-success text-white shadow-lg shadow-success/25"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
};

// --- PAGES ---

// 1. Splash Page
// 3. Layout / Nav wrapper
const Layout = ({ children }) => {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  // Fetch user data directly
  useEffect(() => {
    syncCurrentUser();
  }, []);

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative overflow-hidden bg-[#0A0A0F]">
      {/* Header */}
      <header className="flex justify-between items-center p-6 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-primaryFocus flex items-center justify-center text-xs font-bold text-white">FF</div>
          <span className="font-bold text-lg tracking-tight">Engram</span>
        </div>
        <div className="flex bg-surface rounded-full px-4 py-1.5 border border-gray-800 items-center shadow-lg cursor-pointer" onClick={() => navigate('/wallet')}>
          <span className="text-green-400 font-bold mr-1">₹</span>
          <span className="font-bold text-white">{user?.wallet_balance?.toFixed(0) || 0}</span>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto mt-4 px-6 pb-24 scroll-smooth">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="absolute bottom-0 w-full bg-surface/80 backdrop-blur-xl border-t border-gray-800 p-4 flex justify-around">
        <button className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors" onClick={() => navigate('/home')}>
          <Icon name="home" /><span className="text-[10px] mt-1">Home</span>
        </button>
        <button className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors" onClick={() => navigate('/topics')}>
          <Icon name="book-open" /><span className="text-[10px] mt-1">Topics</span>
        </button>
        <button className="flex flex-col items-center text-gray-400 border border-gray-700 bg-[#0A0A0F] rounded-full p-2 -mt-6 shadow-xl hover:text-primary transition-colors" onClick={() => navigate('/quiz/random')}>
          <Icon name="play" /><span className="text-[10px] mt-1">Quiz</span>
        </button>
        <button className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors" onClick={() => navigate('/wallet')}>
          <Icon name="zap" /><span className="text-[10px] mt-1">Wallet</span>
        </button>
      </nav>
    </div>
  );
}

// 4. Home Page
const Home = () => {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const { data: topics } = useQuery({ 
    queryKey: ['topics'], 
    queryFn: () => api.get('/topics').then(r => r.data),
    refetchInterval: 30000 
  });
  
  // Aggregate stats
  const totalMastery = useMemo(() => {
    if (!topics?.length) return 0;
    const sum = topics.reduce((acc, t) => acc + (t.mastery_percent || 0), 0);
    return Math.round(sum / topics.length);
  }, [topics]);

  const totalDue = useMemo(() => topics?.reduce((acc, t) => acc + (t.due_count || 0), 0) || 0, [topics]);
  const totalLearned = useMemo(() => topics?.reduce((acc, t) => acc + (t.learned_count || 0), 0) || 0, [topics]);
  const totalItems = useMemo(() => topics?.reduce((acc, t) => acc + (t.card_count + t.mcq_count || 0), 0) || 0, [topics]);
  const learnedPercent = totalItems > 0 ? Math.round((totalLearned / totalItems) * 100) : 0;

  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const runAnalysis = async () => {
    if (!user) return;
    setIsAnalyzing(true);
    setShowModal(true);
    setAnalysis(null);
    try {
      const res = await api.post('/ai/analyze', { user_id: user.id });
      setAnalysis(res.data);
    } catch (err) {
      setAnalysis({ error: "AI assistant is currently offline. Please try again later." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mt-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Hi, {user?.username || 'Learner'}!</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Ready to level up your brain today?</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-2xl border border-orange-500/20">
            <Icon name="flame" className="w-4 h-4" />
            <span className="font-black text-sm">{user?.current_streak || 0}</span>
          </div>
        </div>
      </div>

      {/* Progress Dashboard */}
      <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="col-span-2 bg-gradient-to-br from-primary/20 to-surface border border-primary/20 rounded-[2.5rem] p-6 flex items-center justify-between overflow-hidden relative group">
              <div className="relative z-10">
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Overall Mastery</div>
                  <div className="text-4xl font-black text-white">{totalMastery}%</div>
                  <div className="mt-4 flex items-center gap-2">
                      <div className="h-1.5 w-32 bg-gray-900 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${totalMastery}%` }}></div>
                      </div>
                  </div>
              </div>
              <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-900" />
                      <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                          strokeDasharray={251.2} 
                          strokeDashoffset={251.2 * (1 - totalMastery / 100)} 
                          className="text-primary transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <Icon name="brain" className="text-primary w-8 h-8 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </div>

          <div className="bg-surface border border-gray-800 rounded-3xl p-5">
              <div className="text-orange-500 mb-2 bg-orange-500/10 w-8 h-8 rounded-xl flex items-center justify-center">
                  <Icon name="clock-3" className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-white">{totalDue}</div>
              <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">Due for Review</div>
          </div>

          <div className="bg-surface border border-gray-800 rounded-3xl p-5">
              <div className="text-emerald-400 mb-2 bg-emerald-400/10 w-8 h-8 rounded-xl flex items-center justify-center">
                  <Icon name="check-circle" className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-white">{learnedPercent}%</div>
              <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">Items Learned</div>
          </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white px-1">Quick Start</h2>
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => navigate('/topics')}
            className="flex items-center gap-4 bg-[#1A1A24] p-5 rounded-3xl border border-gray-800 hover:border-primary/50 transition-all group"
          >
            <div className="bg-primary/10 p-4 rounded-2xl group-hover:bg-primary/20 transition-all">
              <Icon name="book-open" className="text-primary w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="font-bold text-white">Continue Path</div>
              <div className="text-xs text-gray-500">Pick up where you left off</div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/quiz/random')}
            className="flex items-center gap-4 bg-[#1A1A24] p-5 rounded-3xl border border-gray-800 hover:border-white/20 transition-all group"
          >
            <div className="bg-white/5 p-4 rounded-2xl group-hover:bg-white/10 transition-all">
              <Icon name="zap" className="text-white w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="font-bold text-white">Quick Practice</div>
              <div className="text-xs text-gray-500">Mixed random quiz session</div>
            </div>
          </button>
        </div>
      </div>

      {/* AI Analysis Trigger */}
      <div onClick={runAnalysis} className="mt-8 bg-surface border border-primary/20 rounded-2xl p-5 hover:border-primary transition-all cursor-pointer flex items-center gap-4 group mb-24">
         <div className="bg-primary/20 text-primary w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-primary/10">
            <Icon name="brain" className="w-6 h-6" />
         </div>
         <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white leading-none">AI Insight Analysis</h3>
              <span className="text-[8px] bg-primary text-white px-1.5 py-0.5 rounded-full font-black uppercase">Beta</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Personalized strategy based on your history</p>
         </div>
         <Icon name="sparkles" className="text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
      </div>

         <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Study Analysis">
           {isAnalyzing ? (
             <div className="space-y-6 p-2 py-4">
               <div>
                 <Skeleton className="h-3 w-20 mb-3" />
                 <div className="flex gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-20" /></div>
               </div>
               <div>
                 <Skeleton className="h-3 w-32 mb-3" />
                 <Skeleton className="h-24 w-full" />
               </div>
               <div>
                 <Skeleton className="h-3 w-24 mb-3" />
                 <Skeleton className="h-20 w-full" />
               </div>
             </div>
           ) : analysis?.error ? (
             <div className="text-rose-400 p-8 text-center text-sm font-medium flex flex-col items-center gap-3">
                <Icon name="x-circle" className="w-10 h-10 opacity-40" />
                {analysis.error}
             </div>
           ) : (
             <div className="space-y-6 text-sm leading-relaxed p-1 py-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
               <section>
                 <h4 className="text-primary font-black uppercase tracking-wider text-[10px] mb-3 flex items-center gap-2">
                    <Icon name="lightbulb" className="w-3.5 h-3.5" /> Weak Topics
                 </h4>
                 <div className="flex flex-wrap gap-2">
                   {analysis?.weak_topics?.map(t => (
                     <span key={t} className="bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-lg border border-rose-500/20 text-[11px] font-bold">{t}</span>
                   )) || <span className="text-gray-500 italic">No patterns detected yet</span>}
                 </div>
               </section>
               <section>
                 <h4 className="text-primary font-black uppercase tracking-wider text-[10px] mb-3 flex items-center gap-2">
                    <Icon name="brain" className="w-3.5 h-3.5" /> Concept Breakdown
                 </h4>
                 <p className="text-gray-300 bg-[#0A0A0F]/50 p-4 rounded-2xl border border-gray-800 text-[13px] leading-[1.6]">
                   {analysis?.suggested_focus}
                 </p>
               </section>
               <section>
                 <h4 className="text-primary font-black uppercase tracking-wider text-[10px] mb-3 flex items-center gap-2">
                    <Icon name="wand" className="w-3.5 h-3.5" /> Action Plan
                 </h4>
                 <ul className="space-y-3">
                   {analysis?.recommended_next_steps?.map((s, i) => (
                     <li key={i} className="flex gap-3 text-gray-400 text-[13px]">
                        <span className="text-primary font-bold">0{i+1}.</span> {s}
                     </li>
                   ))}
                 </ul>
               </section>
               <Button onClick={() => setShowModal(false)} variant="secondary" className="mt-4 !py-2.5 !text-sm">Close Analysis</Button>
              </div>
            )}
          </Modal>
        </div>
     </Layout>
  )
}

// 5. Topics Page
const Topics = () => {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery({ queryKey: ['topics'], queryFn: () => api.get('/topics').then(r => r.data) });
  
  // Drill-down State
  const [activeSyllabusId, setActiveSyllabusId] = useState(null);
  const activeSyllabus = useMemo(() => Array.isArray(data) ? data.find(t => t.id === activeSyllabusId) : null, [data, activeSyllabusId]);

  // Suggestions State
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isExtending, setIsExtending] = useState(null);

  // AISyllabus Generation State
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [subject, setSubject] = useState("");
  const [counts, setCounts] = useState({ subtopics: 5, cards: 8, mcqs: 5 });
  
  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Load suggestions when syllabus opens
  useEffect(() => {
    if (activeSyllabus) {
      const existing = data?.filter(t => t.parent_id === activeSyllabus.id).map(t => t.name) || [];
      loadSuggestions(activeSyllabus.name, existing);
    }
  }, [activeSyllabusId]);

  const loadSuggestions = async (subj, existing) => {
    setIsSuggesting(true);
    try {
      const res = await api.post('/syllabus/suggest', { subject: subj, existing_topics: existing });
      setSuggestions(res.data.suggestions);
    } catch (err) {
      console.error("Failed to load suggestions");
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleExtend = async (topicName) => {
    setIsExtending(topicName);
    try {
      await api.post('/syllabus/extend', {
        parent_id: activeSyllabusId,
        subject: activeSyllabus.name,
        topics: [topicName],
        cards_per_topic: 8,
        mcqs_per_topic: 5
      });
      refetch();
      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.name !== topicName));
    } catch (err) {
      alert("Failed to add topic");
    } finally {
      setIsExtending(null);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} items? This will remove all associated cards and progress.`)) {
      try {
        await api.post('/topics/delete-bulk', { topic_ids: selectedIds });
        setSelectedIds([]);
        setIsSelectionMode(false);
        setActiveSyllabusId(null);
        refetch();
      } catch (err) {
        alert("Failed to delete topics.");
      }
    }
  };

  const handleGenerate = async () => {
    if (!subject) return;
    setIsGenerating(true);
    try {
      await api.post('/syllabus/generate', { 
        subject,
        num_subtopics: counts.subtopics,
        cards_per_topic: counts.cards,
        mcqs_per_topic: counts.mcqs
      });
      setShowModal(false);
      setSubject("");
      refetch();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message;
      alert(`AI Generation failed: ${errorMsg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = async (e, topic) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to reset all progress for "${topic.name}"?`)) {
      try {
        await api.post(`/topics/${topic.topic_id}/reset`);
        refetch();
      } catch (err) {
        alert("Failed to reset progress.");
      }
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {activeSyllabusId && (
            <button onClick={() => setActiveSyllabusId(null)} className="p-2 bg-surface border border-gray-800 rounded-xl hover:text-primary transition-colors">
              <Icon name="arrow-left" />
            </button>
          )}
          <h2 className="text-2xl font-bold">{activeSyllabusId ? activeSyllabus?.name : "Your Syllabus"}</h2>
        </div>
        <div className="flex items-center gap-3">
          {data?.length > 0 && (
            <button 
              onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${isSelectionMode ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-gray-800 text-gray-400 hover:text-white'}`}
            >
              {isSelectionMode ? 'Cancel' : 'Manage'}
            </button>
          )}
        </div>
      </div>

      {!activeSyllabusId && (
        <button 
          onClick={() => { setSubject(""); setShowModal(true); }}
          className="w-full mb-8 bg-gradient-to-r from-primary/20 to-primaryFocus/20 border border-primary/30 rounded-2xl p-4 flex items-center justify-center gap-3 group hover:border-primary transition-all shadow-lg"
        >
          <div className="bg-primary/20 text-primary p-2 rounded-xl group-hover:scale-110 transition-transform">
            <Icon name="wand" className="w-5 h-5" />
          </div>
          <span className="font-bold text-primary">Generate New Syllabus with AI</span>
          <Icon name="sparkles" className="text-primary/50" />
        </button>
      )}
      
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {!activeSyllabusId ? (
            // SYLLABUS LIST VIEW
            <div className="grid grid-cols-1 gap-4">
              {Array.isArray(data) && data?.filter(t => !t.parent_id).map((syllabus, idx) => {
                const subtopics = data?.filter(t => t.parent_id === syllabus.id) || [];
                const isSelected = selectedIds.includes(syllabus.topic_id);
                return (
                  <LazyCard key={syllabus.id} delay={idx * 60}>
                    <div
                      onClick={() => isSelectionMode ? toggleSelect(syllabus.topic_id) : setActiveSyllabusId(syllabus.id)}
                      className={`group bg-surface border rounded-3xl p-6 transition-all relative cursor-pointer overflow-hidden ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-800 hover:border-primary/50 hover:bg-[#1A1A24]'}`}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl transition-opacity group-hover:opacity-100 opacity-50"></div>
                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                             <Icon name="book" className="text-primary w-5 h-5" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">Course</span>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-1">{syllabus.name}</h3>
                          <p className="text-sm text-gray-500 line-clamp-1">{syllabus.description || 'AI Generated Syllabus'}</p>
                        </div>
                        <div className="text-right">
                           <div className="text-2xl font-black text-white/20 group-hover:text-primary/40 transition-colors">{subtopics.length}</div>
                           <div className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter">Topics</div>
                        </div>
                      </div>
                    </div>
                  </LazyCard>
                );
              })}
            </div>
          ) : (
            // SUBTOPICS VIEW
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
               {/* Due Today Banner */}
               {(() => {
                  const subtopics = data?.filter(t => t.parent_id === activeSyllabusId) || [];
                  const totalDue = subtopics.reduce((acc, t) => acc + (t.due_count || 0), 0);
                  if (totalDue === 0) return null;
                  
                  // Find the subtopic with most due cards
                  const focusTopic = [...subtopics].sort((a, b) => (b.due_count || 0) - (a.due_count || 0))[0];

                  return (
                    <div className="mb-6 p-5 bg-orange-500 border border-orange-400/30 rounded-3xl shadow-lg shadow-orange-500/20 flex items-center justify-between text-white overflow-hidden relative group">
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Icon name="flame" className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/80">Action Required</div>
                                <div className="font-bold text-sm">You have {totalDue} items due</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate(`/learn/${focusTopic.topic_id}`)}
                            className="relative z-10 bg-white text-orange-500 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-orange-50 transition-all shadow-sm"
                        >
                            Start Review
                        </button>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                    </div>
                  );
               })()}

               <div className="mb-6 p-4 bg-primary/5 rounded-2xl border border-primary/20 flex flex-col gap-1">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Exploring Syllabus</span>
                  <div className="text-sm text-gray-400 leading-relaxed italic line-clamp-2">
                    {activeSyllabus?.description || "Select a subtopic below to start learning."}
                  </div>
               </div>

               <div className="space-y-4">
                  {Array.isArray(data) && data?.filter(t => t.parent_id === activeSyllabusId).map((topic, idx) => {
                     const totalCards = topic.card_count + topic.mcq_count;
                     const learnedPercent = totalCards > 0 ? (topic.learned_count / totalCards) * 100 : 0;
                     const masteryColor = topic.mastery_percent > 80 ? 'text-emerald-400' : topic.mastery_percent > 40 ? 'text-blue-400' : 'text-gray-400';
                     
                     // Badge logic
                     let badge = { text: "Not Started", color: "bg-gray-800 text-gray-400 border-gray-700" };
                     if (topic.mastery_percent > 80) badge = { text: "Mastered", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
                     else if (topic.learned_count > 0) badge = { text: "In Progress", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };

                     return (
                       <LazyCard key={topic.id} delay={idx * 60}>
                         <div className="bg-surface border border-gray-800 rounded-2xl p-5 relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className={`inline-flex px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest mb-2 ${badge.color}`}>
                                    {badge.text}
                                </div>
                                <h3 className="font-bold text-lg text-white leading-tight group-hover:text-primary transition-colors">{topic.name}</h3>
                                {topic.last_studied && (
                                    <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                        <Icon name="clock" className="w-2.5 h-2.5" />
                                        Studied {formatTimeAgo(topic.last_studied)}
                                    </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end">
                                  <div className={`text-xl font-black ${masteryColor}`}>{topic.mastery_percent}%</div>
                                  <div className="text-[8px] uppercase font-bold text-gray-500 tracking-tighter">Mastery</div>
                              </div>
                            </div>

                            {topic.due_count > 0 && (
                                <div className="absolute top-4 right-16 animate-pulse">
                                    <div className="bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                                        {topic.due_count} Due
                                    </div>
                                </div>
                            )}

                            <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800/50 mb-5">
                               <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{width: `${learnedPercent}%`}}></div>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => navigate(`/learn/${topic.topic_id}`)} className="flex-1 text-xs font-bold text-white bg-primary py-2.5 rounded-xl hover:bg-primaryFocus transition-all">Study</button>
                               <button onClick={() => navigate(`/quiz/${topic.topic_id}`)} className="flex-1 text-xs font-bold text-black bg-white py-2.5 rounded-xl hover:bg-gray-200 transition-all">Quiz</button>
                               <button onClick={(e) => handleReset(e, topic)} className="p-2.5 text-gray-500 hover:text-rose-500 bg-gray-900 rounded-xl transition-colors"><Icon name="trash-2" className="w-4 h-4" /></button>
                            </div>
                         </div>
                       </LazyCard>
                     )
                  })}

                  <div className="mt-12 bg-[#0F0F15] rounded-3xl p-6 border border-gray-800/50">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                        <Icon name="sparkles" className="w-3 h-3" /> Recommended for your Path
                     </h4>
                     {isSuggesting ? (
                        <div className="space-y-3">
                           {[1,2].map(x => <Skeleton key={x} className="h-20 w-full rounded-2xl" />)}
                        </div>
                     ) : (
                        <div className="space-y-3">
                           {suggestions?.map((s, i) => (
                              <div key={i} className="bg-surface border border-gray-800 p-4 rounded-2xl flex justify-between items-center transition-all hover:border-primary/40">
                                 <div>
                                    <div className="font-bold text-gray-200 text-sm">{s.name}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">{s.description}</div>
                                 </div>
                                 <button 
                                    onClick={() => handleExtend(s.name)}
                                    disabled={!!isExtending}
                                    className="bg-primary/10 text-primary w-10 h-10 rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-30"
                                 >
                                    {isExtending === s.name ? <Icon name="loader" className="animate-spin" /> : <Icon name="plus" />}
                                 </button>
                              </div>
                           ))}
                           <button onClick={() => setShowModal(true)} className="w-full py-4 border border-dashed border-gray-800 rounded-2xl text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white hover:border-gray-700">Add custom subtopic</button>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {isSelectionMode && selectedIds.length > 0 && (
         <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#1A1A24] border border-rose-500/30 rounded-2xl p-4 shadow-2xl flex items-center justify-between min-w-[280px] z-50">
            <span className="text-white font-bold">{selectedIds.length} Selected</span>
            <button onClick={handleBulkDelete} className="bg-rose-500 text-white px-5 py-2 rounded-xl font-bold">Delete</button>
         </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add to Syllabus">
        {isGenerating ? (
          <div className="p-12 text-center space-y-4">
            <Icon name="loader" className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div className="font-bold text-white">AI is crafting modules...</div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
             <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Topic name..." className="w-full bg-[#0A0A0F] border border-gray-800 rounded-xl px-4 py-3 text-white" />
             <Button onClick={handleGenerate}>Generate</Button>
          </div>
        )}
      </Modal>
    </Layout>
  )
}


// 6. Learn Mode (Flashcards)
const Learn = ({ id }) => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [hint, setHint] = useState(null);
    const [isHinting, setIsHinting] = useState(false);

    // Swipe & Drag State
    const [translateX, setTranslateX] = useState(0);
    const [translateY, setTranslateY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [swipeStatus, setSwipeStatus] = useState(null); 
    
    // Deep Dive Drawer State
    const [deepDive, setDeepDive] = useState(null);
    const [isDeepDiving, setIsDeepDiving] = useState(false);
    const [showDeepDiveDrawer, setShowDeepDiveDrawer] = useState(false);

    // Persistent drag tracking object without triggering renders on every micro-move calculation
    const dragState = useRef({ isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0, startFlipped: false });

    const { data: cards, isLoading } = useQuery({ 
        queryKey: ['cards', id, window.location.hash.includes('all=true')], 
        queryFn: () => {
            const isAll = window.location.hash.includes('all=true');
            return api.get(`/topics/${id}/cards${isAll ? '?all=true' : ''}`).then(r => r.data);
        }
    });

    const resetPosition = () => {
        setTranslateX(0);
        setTranslateY(0);
        setSwipeStatus(null);
        setIsDragging(false);
        dragState.current.isDragging = false;
    };

    const getHint = async (e) => {
        e.stopPropagation();
        if (hint) return;
        setIsHinting(true);
        try {
            const card = cards[currentIndex];
            const res = await api.post('/ai/hint', { question: card.title, options: [] });
            setHint(res.data.hint);
        } catch (err) {
            setHint("AI hint is currently unavailable.");
        } finally {
            setIsHinting(false);
        }
    };

    const triggerDeepDive = async () => {
        setShowDeepDiveDrawer(true);
        if (deepDive) return;
        setIsDeepDiving(true);
        try {
            const card = cards[currentIndex];
            const res = await api.post('/ai/deep-dive', { title: card.title, content: card.content });
            setDeepDive(res.data.explanation);
        } catch (err) {
            setDeepDive("Failed to dive deeper. Please try again.");
        } finally {
            setIsDeepDiving(false);
        }
    };

    const goNext = () => {
        // Silently record card as seen (rating 2 = Good) for spaced repetition
        const card_id = cards[currentIndex].card_id;
        api.post('/card/rate', { card_id, rating: 2 }).catch(() => {});

        resetPosition();
        setFlipped(false);
        setHint(null);
        setDeepDive(null);
        setShowDeepDiveDrawer(false);
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(i => i + 1);
        } else {
            navigate('/topics');
        }
    };

    const goPrev = () => {
        resetPosition();
        setFlipped(false);
        setHint(null);
        setDeepDive(null);
        setShowDeepDiveDrawer(false);
        if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
        }
    };

    // --- Gesture Event Handlers ---
    const handlePointerDown = (e) => {
        if (showDeepDiveDrawer) return; // Disable swipe if reading details
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragState.current = { 
            isDragging: true, 
            startX: clientX, 
            startY: clientY, 
            currentX: clientX, 
            currentY: clientY,
            startFlipped: flipped
        };
        setIsDragging(true);
    };

    const handlePointerMove = (e) => {
        if (!dragState.current.isDragging) return;
        
        // Prevent default scrolling on mobile while swiping cards
        if (e.cancelable) e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const deltaX = clientX - dragState.current.startX;
        const deltaY = clientY - dragState.current.startY;
        
        dragState.current.currentX = clientX;
        dragState.current.currentY = clientY;
        
        setTranslateX(deltaX);
        setTranslateY(deltaY);

        // Visual intent thresholds
        const swipeThreshold = 80;
        if (deltaX > swipeThreshold) setSwipeStatus('next');
        else if (deltaX < -swipeThreshold) setSwipeStatus('prev');
        else if (deltaY < -swipeThreshold && Math.abs(deltaY) > Math.abs(deltaX)) setSwipeStatus('deep-dive');
        else setSwipeStatus(null);
    };

    const handlePointerUp = () => {
        if (!dragState.current.isDragging) return;
        dragState.current.isDragging = false;
        setIsDragging(false);

        const deltaX = translateX;
        const deltaY = translateY;
        const swipeThreshold = 100;

        // Action thresholds
        if (deltaX > swipeThreshold) {
            // Swipe right → next card
            setTranslateX(window.innerWidth * 1.5);
            setTimeout(() => goNext(), 250);
        } else if (deltaX < -swipeThreshold) {
            // Swipe left → previous card
            setTranslateX(-window.innerWidth * 1.5);
            setTimeout(() => goPrev(), 250);
        } else if (deltaY < -swipeThreshold && Math.abs(deltaY) > Math.abs(deltaX)) {
            // Swipe up → Deep Dive
            triggerDeepDive();
            resetPosition();
        } else {
            // Tap check (if barely moved)
            if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                setFlipped(!dragState.current.startFlipped);
            }
            resetPosition(); // snap back
        }
    };

    if (isLoading) return <Layout><div className="flex flex-col items-center justify-center p-12 text-gray-400">Loading cards...</div></Layout>;
    if (!cards || cards.length === 0) return <Layout><div className="p-12 text-center text-gray-400">No cards in this topic.</div></Layout>;

    const card = cards[currentIndex];
    
    // Dynamic Rotation: Rotate up to 15 degrees based on drag distance
    const rotate = (translateX / window.innerWidth) * 20; 

    return (
        <Layout>
            <div className="flex items-center justify-between mt-4 mb-6 relative z-10">
                <button onClick={() => navigate('/topics')} className="text-gray-400 hover:text-white bg-surface p-2 rounded-lg border border-gray-800"><Icon name="arrow-left" /></button>
                <div className="text-sm font-bold text-gray-400">{currentIndex + 1} / {cards.length}</div>
            </div>

            {/* Deep Dive Drawer */}
            {showDeepDiveDrawer && (
                <div className="absolute inset-0 z-50 bg-gradient-to-b from-[#0A0A0F] to-[#0F0F1A] backdrop-blur-md flex flex-col pt-12 animate-in slide-in-from-bottom-full duration-500">
                     <div className="p-6 flex-1 flex flex-col h-full overflow-hidden">
                        <button onClick={() => setShowDeepDiveDrawer(false)} className="text-gray-400 hover:text-white mb-6 px-4 py-2 rounded-xl border border-gray-800 bg-surface flex items-center gap-2 self-start text-sm font-semibold transition-all hover:border-gray-600">
                             <Icon name="arrow-down-left" /> Back to Card
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-primary/15 p-3 rounded-2xl">
                                <Icon name="brain" className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-0.5">✨ Deep Dive</div>
                                <h2 className="text-xl font-bold text-white leading-tight">{card.title}</h2>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 pb-12 space-y-4">
                            {isDeepDiving ? (
                                <div className="flex flex-col gap-4">
                                    <div className="h-5 w-full bg-gray-800 rounded-xl animate-pulse" />
                                    <div className="h-5 w-11/12 bg-gray-800 rounded-xl animate-pulse" />
                                    <div className="h-5 w-4/5 bg-gray-800 rounded-xl animate-pulse" />
                                    <div className="h-5 w-full bg-gray-800 rounded-xl animate-pulse mt-2" />
                                    <div className="h-5 w-10/12 bg-gray-800 rounded-xl animate-pulse" />
                                    <div className="h-5 w-3/4 bg-gray-800 rounded-xl animate-pulse" />
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {deepDive?.split('\n').map((para, i) => para.trim() ? (
                                        <div key={i} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-[15px] text-gray-200 leading-relaxed" style={{ animationDelay: `${i * 80}ms` }}>
                                            {para}
                                        </div>
                                    ) : null)}
                                </div>
                            )}
                        </div>
                     </div>
                </div>
            )}

            {/* Swipeable Card Area */}
            <div className="relative w-full h-[26rem] sm:h-[28rem] flex items-center justify-center touch-none select-none">
                
                {/* Visual Stack Background Card */}
                {currentIndex < cards.length - 1 && (
                    <div className="absolute w-full h-full bg-surface border border-gray-800 rounded-3xl opacity-40 scale-[0.92] -z-10 translate-y-6"></div>
                )}
                {currentIndex < cards.length - 2 && (
                    <div className="absolute w-full h-full bg-surface border border-gray-800 rounded-3xl opacity-20 scale-[0.85] -z-20 translate-y-12"></div>
                )}

                {/* The Active Card Container with 3D Perspective */}
                <div 
                    className="absolute w-full h-full" 
                    style={{ 
                        perspective: '1200px',
                        transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        zIndex: 20,
                        willChange: 'transform',
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    {/* Inner wrapper for Flipping */}
                    <div className="relative w-full h-full transition-transform duration-700 animate-in zoom-in-90 duration-500" 
                         style={{ 
                            transformStyle: 'preserve-3d',
                            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                         }}>
                        
                        {/* Visual Stamp Overlays (Always on top) */}
                        <div className="absolute inset-0 z-50 pointer-events-none" style={{ transform: 'translateZ(50px)' }}>
                           {swipeStatus === 'next' && <div className="absolute top-8 right-8 border-4 border-emerald-400 text-emerald-400 font-black text-3xl px-4 py-1 rounded-xl uppercase rotate-12 bg-[#1A1A24]/90 backdrop-blur shadow-2xl">NEXT →</div>}
                           {swipeStatus === 'prev' && <div className="absolute top-8 left-8 border-4 border-rose-400 text-rose-400 font-black text-3xl px-4 py-1 rounded-xl uppercase -rotate-12 bg-[#1A1A24]/90 backdrop-blur shadow-2xl">← PREV</div>}
                           {swipeStatus === 'deep-dive' && <div className="absolute bottom-16 left-1/2 -translate-x-1/2 border-4 border-primary text-primary font-black text-2xl px-6 py-2 rounded-xl uppercase bg-[#1A1A24]/90 backdrop-blur min-w-max shadow-2xl">✨ Deep Dive</div>}
                        </div>

                        {/* FRONT FACE */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-surface to-[#1A1A24] border border-primary/30 rounded-3xl p-6 flex flex-col justify-center text-center shadow-2xl"
                             style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                             <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-xs font-bold tracking-widest text-primary">
                                <span className="uppercase">{card.type}</span>
                                <Icon name="lightbulb" className="text-gray-600 w-4 h-4" />
                             </div>

                             <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug my-12">{card.title}</h2>
                             
                             {/* AI Hint Section */}
                             <div className="min-h-[40px] flex items-center justify-center z-40 relative">
                                {!hint && !isHinting ? (
                                    <button 
                                        onPointerDown={(e) => e.stopPropagation()} 
                                        onClick={getHint} 
                                        className="text-[10px] font-bold text-primary/60 hover:text-primary transition-all flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10 hover:border-primary/30"
                                    >
                                        <Icon name="lightbulb" className="w-3 h-3" /> Get Hint
                                    </button>
                                ) : isHinting ? (
                                    <Skeleton className="h-4 w-24 mx-auto" />
                                ) : (
                                    <div className="text-[12px] sm:text-sm text-gray-400 italic bg-[#0A0A0F]/80 p-3 px-5 rounded-2xl border border-gray-800 animate-in fade-in slide-in-from-bottom-2 duration-300 mx-4">
                                        {hint}
                                    </div>
                                )}
                             </div>
                             
                             <div className="mt-auto text-gray-600 text-[10px] uppercase font-bold tracking-widest">Tap to reveal answer</div>
                        </div>

                        {/* BACK FACE */}
                        <div className="absolute inset-0 w-full h-full bg-[#1A1A24] border border-success/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl"
                             style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                             <div className="absolute top-6 left-6 text-xs font-black tracking-widest text-success border border-success/20 bg-success/5 px-2 py-0.5 rounded-full uppercase">Explanation</div>
                             
                              <div className="flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar w-full py-6">
                                <p className="text-xl sm:text-2xl text-gray-200 leading-relaxed font-medium animate-in zoom-in-95 duration-500">
                                    {card.content}
                                </p>
                              </div>

                              <div className="mt-4 w-full pt-6 border-t border-gray-800 flex flex-col gap-3">
                                <div className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Swipe to navigate</div>
                                <div className="flex justify-between w-full px-4 font-bold text-[10px]">
                                   <div className="flex items-center gap-1 text-rose-400"><Icon name="arrow-left" className="w-3 h-3" /> PREV</div>
                                   <div className="flex items-center gap-1 text-primary hover:text-primaryFocus transition-colors cursor-pointer" onClick={() => triggerDeepDive()}><Icon name="arrow-up-right" className="w-3 h-3" /> DEEP DIVE</div>
                                   <div className="flex items-center gap-1 text-emerald-400">NEXT <Icon name="arrow-left" className="w-3 h-3 transform rotate-180" /></div>
                                </div>
                              </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation hint dots */}
            <div className="flex items-center justify-center gap-3 mt-8 relative z-10">
                <button 
                    onClick={goPrev} 
                    disabled={currentIndex === 0}
                    className="w-12 h-12 rounded-full bg-surface border border-gray-800 flex items-center justify-center text-gray-400 hover:text-rose-400 hover:border-rose-400/40 disabled:opacity-20 transition-all"
                >
                    <Icon name="arrow-left" className="w-5 h-5" />
                </button>
                <div className="flex gap-1.5">
                    {cards.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-gray-700'}`} />
                    ))}
                </div>
                <button 
                    onClick={goNext}
                    className="w-12 h-12 rounded-full bg-surface border border-gray-800 flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:border-emerald-400/40 transition-all"
                >
                    <Icon name="arrow-left" className="w-5 h-5 transform rotate-180" />
                </button>
            </div>
        </Layout>
    );
};

// 7. Quiz Mode (MCQ)
const Quiz = ({ id }) => {
   const navigate = useNavigate();
   
   const endpoint = id && id !== 'random' ? `/topics/${id}/mcqs` : `/mcq/random`;
   const { data: mcqs, isLoading, refetch } = useQuery({ queryKey: ['mcqs', id], queryFn: () => api.get(endpoint).then(r => r.data) });
   
   const [currentIndex, setCurrentIndex] = useState(0);
   const [selectedOption, setSelectedOption] = useState(null);
   const [result, setResult] = useState(null);
   const [aiExplanation, setAiExplanation] = useState(null);
   const [isExplaining, setIsExplaining] = useState(false);
   const [showSolution, setShowSolution] = useState(false);
   const [transitioning, setTransitioning] = useState(false); // smooth Q transition
   const prefetchRef = useRef(null); // holds prefetched MCQ batch

   // Prefetch next batch in background when near end
   useEffect(() => {
       if (!Array.isArray(mcqs) || mcqs.length === 0) return;
       if (currentIndex >= mcqs.length - 3 && !prefetchRef.current) {
           prefetchRef.current = 'loading';
           api.get(id && id !== 'random' ? `/topics/${id}/mcqs` : '/mcq/random')
               .then(r => { prefetchRef.current = r.data; })
               .catch(() => { prefetchRef.current = null; });
       }
   }, [currentIndex, mcqs]);

   // Swipe state
   const [translateX, setTranslateX] = useState(0);
   const [isDragging, setIsDragging] = useState(false);
   const [swipeStatus, setSwipeStatus] = useState(null);
   const dragState = useRef({ isDragging: false, startX: 0, startY: 0 });

   const resetDrag = () => {
       setTranslateX(0);
       setIsDragging(false);
       setSwipeStatus(null);
       dragState.current.isDragging = false;
   };

   const handleQuizPointerDown = (e) => {
       const clientX = e.touches ? e.touches[0].clientX : e.clientX;
       const clientY = e.touches ? e.touches[0].clientY : e.clientY;
       dragState.current = { isDragging: true, startX: clientX, startY: clientY };
       setIsDragging(true);
   };

   const handleQuizPointerMove = (e) => {
       if (!dragState.current.isDragging) return;
       if (e.cancelable) e.preventDefault();
       const clientX = e.touches ? e.touches[0].clientX : e.clientX;
       const deltaX = clientX - dragState.current.startX;
       // Only allow leftward drag (negative deltaX)
       if (deltaX < 0) {
           setTranslateX(deltaX);
           if (deltaX < -80) setSwipeStatus('next');
           else setSwipeStatus(null);
       }
   };

   const handleQuizPointerUp = () => {
       if (!dragState.current.isDragging) return;
       dragState.current.isDragging = false;
       setIsDragging(false);
       if (translateX < -100 && result !== null) {
           // Toss card off screen then advance
           setTranslateX(-window.innerWidth * 1.5);
           setTimeout(() => { resetDrag(); nextQuestion(); }, 280);
       } else {
           resetDrag();
       }
   };

   const submitAnswer = async (index) => {
       if (selectedOption !== null) return;
       setSelectedOption(index);
       const mcq = mcqs[currentIndex];
       try {
           const res = await api.post('/answer', { mcq_id: mcq.mcq_id, selected_index: index });
           setResult(res.data);
           syncCurrentUser();

           // Trigger AI explanation
           setIsExplaining(true);
           setAiExplanation(null);
           const options = JSON.parse(mcq.options);
           api.post('/ai/explain', {
               question: mcq.question,
               correct_option: options[res.data.correct_index],
               user_choice: options[index],
               topic: id || "General"
           }).then(aiRes => {
               setAiExplanation(aiRes.data.explanation);
           }).catch(() => {
               setAiExplanation("AI tutor is currently unavailable for this question.");
           }).finally(() => {
               setIsExplaining(false);
           });
       } catch (err) {
           console.error(err);
       }
   };

   const nextQuestion = () => {
       // Animate out first
       setTransitioning(true);
       setTimeout(() => {
           setSelectedOption(null);
           setResult(null);
           setAiExplanation(null);
           setShowSolution(false);
           if (currentIndex < mcqs.length - 1) {
               setCurrentIndex(i => i + 1);
           } else if (prefetchRef.current && Array.isArray(prefetchRef.current)) {
               // Swap in prefetched batch seamlessly
               refetch();
               setCurrentIndex(0);
               prefetchRef.current = null;
           } else {
               refetch();
               setCurrentIndex(0);
           }
           setTransitioning(false);
       }, 180);
   };

   if (isLoading) return <Layout><div className="flex flex-col items-center justify-center p-12 text-gray-400">Loading quiz...</div></Layout>;
   if (!Array.isArray(mcqs) || mcqs.length === 0) return <Layout><div className="p-12 text-center text-gray-400">No questions found.</div></Layout>;

   const mcq = mcqs[currentIndex];
   let options = [];
   try { options = JSON.parse(mcq.options); } catch(e) {}

   const rotate = (translateX / window.innerWidth) * 12;

   return (
       <Layout>
           {/* Swipe hint overlay */}
           {swipeStatus === 'next' && (
               <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                   <div className="border-4 border-emerald-400 text-emerald-400 font-black text-3xl px-6 py-2 rounded-xl uppercase -rotate-12 bg-[#0A0A0F]/90 backdrop-blur shadow-2xl">NEXT →</div>
               </div>
           )}

           {/* Draggable card wrapper */}
           <div
               style={{
                   transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
                   transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                   opacity: transitioning ? 0 : 1,
                   transform: transitioning ? `translateX(${translateX}px) rotate(${rotate}deg) scale(0.96)` : `translateX(${translateX}px) rotate(${rotate}deg) scale(1)`,
                   transition: isDragging ? 'none' : (transitioning ? 'opacity 0.18s ease, transform 0.18s ease' : 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.18s ease'),
                   willChange: 'transform, opacity',
               }}
               onPointerDown={handleQuizPointerDown}
               onPointerMove={handleQuizPointerMove}
               onPointerUp={handleQuizPointerUp}
               onPointerLeave={handleQuizPointerUp}
               onPointerCancel={handleQuizPointerUp}
               className="touch-none"
           >
            <div className="flex items-center justify-between mt-4 mb-6">
                <button onClick={() => navigate('/home')} className="text-gray-400 hover:text-white bg-surface p-2 rounded-lg border border-gray-800"><Icon name="x" /></button>
                <div className={`px-4 py-1 rounded-full text-sm font-bold border ${mcq.difficulty === 'hard' ? 'border-orange-500 text-orange-500 bg-orange-500/10' : mcq.difficulty === 'easy' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-blue-500 text-blue-500 bg-blue-500/10'}`}>
                    {mcq.difficulty.toUpperCase()}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-bold leading-relaxed">{mcq.question}</h2>
            </div>
            
            <div className="space-y-3">
                {options.map((opt, i) => {
                    let className = "w-full text-left p-5 rounded-2xl border transition-all duration-200 text-lg font-medium ";
                    if (selectedOption === null) {
                        className += "border-gray-800 bg-surface hover:bg-gray-800 hover:border-gray-600";
                    } else if (result) {
                        if (i === result.correct_index) className += "border-emerald-500 bg-emerald-500/20 text-emerald-400";
                        else if (i === selectedOption) className += "border-rose-500 bg-rose-500/20 text-rose-400";
                        else className += "border-gray-800 bg-surface opacity-50";
                    }
                    return (
                        <button 
                            key={`${currentIndex}-${i}`}
                            onClick={() => submitAnswer(i)}
                            className={className}
                            disabled={selectedOption !== null}
                            style={{
                                animationDelay: `${i * 60}ms`,
                                animation: !transitioning ? `fadeSlideUp 0.35s ease both` : 'none',
                            }}
                        >
                            {opt}
                        </button>
                    )
                })}
            </div>

            {result && (
                <div className={`mt-8 p-6 rounded-2xl border ${result.correct ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-rose-900/20 border-rose-500/30'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className={`text-xl font-bold flex items-center gap-2 ${result.correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {result.correct ? <Icon name="check-circle" /> : <Icon name="x-circle" />}
                            {result.correct ? "Correct!" : "Incorrect"}
                        </div>
                        <div className={`text-xl font-black ${result.wallet_delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {result.wallet_delta > 0 ? '+' : ''}₹{result.wallet_delta.toFixed(0)}
                        </div>
                    </div>
                    {!showSolution ? (
                        <button 
                            onClick={() => setShowSolution(true)}
                            className="w-full mb-6 py-5 bg-gradient-to-br from-primary/10 to-primaryFocus/5 border border-primary/30 rounded-2xl flex flex-col items-center justify-center gap-3 group hover:border-primary/60 hover:from-primary/15 transition-all"
                        >
                            <div className="bg-primary/20 text-primary p-3.5 rounded-full group-hover:scale-110 group-hover:bg-primary/30 transition-all">
                                <Icon name="brain" className="w-7 h-7" />
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-black text-primary">View AI Solution</div>
                                <div className="text-[10px] text-primary/50 mt-0.5">Tap karo — samjhata hoon 😊</div>
                            </div>
                        </button>
                    ) : (
                        <>
                            {/* Explanation block */}
                            <div className="mb-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Why this answer?</div>
                                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-[15px] text-gray-200 leading-relaxed">
                                    {result.explanation}
                                </div>
                            </div>

                            {/* AI Deep Dive Section */}
                            <div className="mb-5 border-t border-gray-800/50 pt-4 animate-in fade-in slide-in-from-bottom-3 duration-600">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="bg-primary/15 p-1.5 rounded-lg">
                                        <Icon name="brain" className="text-primary w-4 h-4" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-primary">✨ AI Deep Dive</span>
                                </div>
                                {isExplaining ? (
                                    <div className="space-y-3">
                                        <div className="h-4 w-full bg-gray-800 rounded-xl animate-pulse" />
                                        <div className="h-4 w-[90%] bg-gray-800 rounded-xl animate-pulse" />
                                        <div className="h-4 w-[70%] bg-gray-800 rounded-xl animate-pulse" />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {aiExplanation?.split('\n').map((para, i) => para.trim() ? (
                                            <div key={i} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-[14px] text-gray-300 leading-relaxed animate-in fade-in duration-500">
                                                {para}
                                            </div>
                                        ) : null)}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <Button onClick={nextQuestion} variant={result.correct ? 'success' : 'danger'}>Next Question</Button>
                </div>
            )}

            {/* Swipe hint at bottom when answered */}
            {result && (
               <div className="mt-4 flex items-center justify-center gap-2 text-gray-600 text-[10px] uppercase font-bold tracking-widest animate-in fade-in duration-500">
                   <Icon name="arrow-left" className="w-3 h-3" /> swipe left for next
               </div>
            )}
           </div>{/* end draggable wrapper */}
       </Layout>
   );
};

// 8. Wallet
const Wallet = () => {
  const { data, isLoading } = useQuery({ queryKey: ['wallet'], queryFn: () => api.get('/wallet').then(r => r.data) });

  return (
    <Layout>
       <div className="bg-gradient-to-br from-green-900/40 to-green-900/10 border border-green-500/20 rounded-3xl p-8 mb-8 text-center mt-4">
          <div className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wide">Available Balance</div>
          <div className="text-6xl font-black text-white flex items-center justify-center tracking-tighter">
             <span className="text-green-500 mr-2">₹</span>{data?.balance?.toFixed(0) || 0}
          </div>
       </div>

       <h3 className="font-bold text-xl mb-4">Transactions</h3>
       {isLoading ? <p>Loading...</p> : (
         <div className="space-y-3">
             {data?.transactions?.map(tx => (
                <div key={tx.id} className="flex items-center justify-between bg-surface border border-gray-800 p-4 rounded-xl">
                   <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/20 text-green-500' : 'bg-rose-500/20 text-rose-500'}`}>
                         {tx.amount > 0 ? <Icon name="arrow-down-left" /> : <Icon name="arrow-up-right" />}
                      </div>
                      <div className="text-sm font-medium text-gray-200">{tx.reason}</div>
                   </div>
                   <div className={`font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-rose-500'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(0)}
                   </div>
                </div>
             ))}
         </div>
       )}
    </Layout>
  )
}

// APP ROUTER
const App = () => {
  const token = useAuthStore(s => s.token);
  const path = useRouterPath();
  
  // Watch hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const newPath = window.location.hash.slice(1) || '/';
      routerStore.setState({ path: newPath });
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    syncCurrentUser().catch(() => {});
  }, []);
  
  // Route matching
  const renderPage = () => {
    // Protected routes
    if (path === '/' || path === '' || path === '/home') return <Home />;
    if (path === '/topics') return <Topics />;
    if (path.startsWith('/learn/')) {
      const id = path.split('/')[2];
      return <Learn id={id} />;
    }
    if (path.startsWith('/quiz/')) {
      const id = path.split('/')[2];
      return <Quiz id={id} />;
    }
    if (path === '/wallet') return <Wallet />;
    
    return <Home />; // default
  };
  
  return renderPage();
};

// Initialize app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
