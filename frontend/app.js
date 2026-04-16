// --- TINY STORE HOOK (replaces Zustand) ---
const useStore = (store, selector) => {
  return React.useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState())
  );
};

// --- GLOBAL DESTRUCTURING ---
const { useState, useEffect, useMemo, useCallback, useSyncExternalStore } = React;

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
  return match ? { id: match[2] } : {};
};

const useRouterPath = () => useStore(routerStore, s => s.path);

// Simple icon fallback system
const iconMap = {
  'home': '🏠', 'book-open': '📖', 'play': '▶️', 'trophy': '🏆', 'log-out': '🚪',
  'flame': '🔥', 'zap': '⚡', 'book': '📚', 'check-circle': '✅', 'clock': '⏱️',
  'clock-3': '🕐', 'arrow-down-left': '↙️', 'arrow-up-right': '↗️', 'x-circle': '❌',
  'arrow-left': '⬅️', 'x': '❌', 'rotate-cw': '🔄'
};

const Icon = ({ name, className = "inline-block w-5 h-5", style }) => {
  return <span className={className} style={style}>{iconMap[name] || '•'}</span>;
}

const API_BASE = "http://localhost:8000";

// --- API CLIENT ---
const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- AUTH STORE (replaces Zustand) ---
const authStore = window.createStore((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  login: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
  setUser: (user) => set({ user })
}));

// Convenience hooks
const useAuthStore = (selector) => useStore(authStore, selector || (s => s));

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

const Button = ({ children, onClick, variant = 'primary', className = "", type = "button" }) => {
  const base = "w-full py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]";
  const variants = {
    primary: "bg-gradient-to-r from-primary to-primaryFocus text-white shadow-lg shadow-primary/25",
    secondary: "bg-gray-800 text-white hover:bg-gray-700",
    danger: "bg-danger text-white shadow-lg shadow-danger/25",
    success: "bg-success text-white shadow-lg shadow-success/25"
  };
  return <button type={type} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
};

// --- PAGES ---

// 1. Splash Page
const Splash = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#0A0A0F] to-[#13111C]">
      <div className="w-24 h-24 bg-gradient-to-tr from-primary to-primaryFocus rounded-3xl rotate-12 mb-8 flex items-center justify-center shadow-2xl shadow-primary/30">
        <span className="text-4xl text-white font-bold -rotate-12">FF</span>
      </div>
      <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Engram</h1>
      <p className="text-gray-400 text-center mb-12 max-w-sm text-lg">Master difficult concepts. Get rewarded for learning.</p>
      
      <div className="w-full max-w-sm space-y-4">
        <Button onClick={() => navigate('/login')}>Login & Start Learning</Button>
      </div>
    </div>
  );
};

// 2. Login Page
const Login = () => {
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        const res = await api.post('/auth/register', { email, password, username });
        login(res.data.user, res.data.access_token);
      } else {
        const res = await api.post('/auth/login', { email, password });
        login(res.data.user, res.data.access_token);
      }
      navigate('/home');
    } catch (err) {
      alert(err.response?.data?.detail || "An error occurred");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center">{isRegister ? "Create Account" : "Welcome Back"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
             <input type="text" placeholder="Username" required value={username} onChange={e => setUsername(e.target.value)} 
               className="w-full bg-[#0A0A0F] border border-gray-700 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
          )}
          <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#0A0A0F] border border-gray-700 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
          <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-[#0A0A0F] border border-gray-700 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
          <Button type="submit">{isRegister ? "Sign Up" : "Login"}</Button>
        </form>
        <p className="text-center text-gray-400 mt-6 cursor-pointer hover:text-white transition-colors" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? "Already have an account? Login" : "Need an account? Sign Up"}
        </p>
      </Card>
    </div>
  );
};

// 3. Layout / Nav wrapper
const Layout = ({ children }) => {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  // Fetch user data directly
  useEffect(() => {
    api.get('/auth/me').then(res => authStore.getState().setUser(res.data)).catch(() => { logout(); navigate('/'); });
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
        <button className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors" onClick={() => navigate('/leaderboard')}>
          <Icon name="trophy" /><span className="text-[10px] mt-1">Leaders</span>
        </button>
        <button className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors" onClick={() => { logout(); navigate('/'); }}>
          <Icon name="log-out" /><span className="text-[10px] mt-1">Logout</span>
        </button>
      </nav>
    </div>
  );
}

// 4. Home Page
const Home = () => {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  return (
    <Layout>
       <div className="mt-4">
         <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Hello, {user?.username}</h1>
         <p className="text-gray-400 mb-8">What do you want to learn today?</p>

         {/* Streak Widget */}
         <div className="bg-gradient-to-r from-orange-500/10 to-rose-500/10 border border-orange-500/20 rounded-2xl p-5 flex items-center justify-between mb-6">
            <div>
              <div className="text-orange-400 font-bold mb-1 flex items-center gap-1"><Icon name="flame" /> {user?.current_streak || 0} Day Streak</div>
              <div className="text-sm text-gray-400">Keep it up! 7 days = ₹5 bonus</div>
            </div>
            <div className="h-12 w-12 rounded-full border-2 border-orange-500 flex items-center justify-center text-orange-400">
               <Icon name="zap" />
            </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div onClick={() => navigate('/topics')} className="bg-gradient-to-br from-surface to-[#1A1A24] border border-gray-800 rounded-2xl p-5 hover:border-primary transition-all cursor-pointer group shadow-lg">
               <div className="bg-primary/20 text-primary w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Icon name="book" /></div>
               <h3 className="font-bold mb-1 text-white">Learn</h3>
               <p className="text-xs text-gray-400">Study flashcards</p>
            </div>
            
            <div onClick={() => navigate('/quiz/random')} className="bg-gradient-to-br from-surface to-[#1A1A24] border border-gray-800 rounded-2xl p-5 hover:border-success transition-all cursor-pointer group shadow-lg">
               <div className="bg-success/20 text-success w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Icon name="check-circle" /></div>
               <h3 className="font-bold mb-1 text-white">Quiz</h3>
               <p className="text-xs text-gray-400">Earn ₹ Wallet</p>
            </div>
         </div>
       </div>
    </Layout>
  )
}

// 5. Topics Page
const Topics = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['topics'], queryFn: () => api.get('/topics').then(r => r.data) });
  
  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-6">Syllabus</h2>
      {isLoading ? <p className="text-gray-400 animate-pulse">Loading topics...</p> : (
        <div className="space-y-4">
          {data?.map((topic, i) => (
             <div key={topic.id} className="bg-surface border border-gray-800 rounded-2xl p-5 transition-all" style={{animationDelay: `${i*100}ms`}}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase font-bold tracking-wider text-primary">{topic.category}</span>
                    {topic.due_count > 0 && (
                      <span className="text-[10px] font-bold text-orange-500 flex items-center gap-0.5 mt-1">
                        <Icon name="clock-3" className="w-3 h-3" /> {topic.due_count} DUE
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Icon name="clock" /> {topic.estimated_minutes} min</span>
                </div>
                <h3 className="font-bold text-lg text-white mb-2 leading-tight">{topic.name}</h3>
                <div className="flex gap-4 mt-6">
                   <button onClick={() => navigate(`/learn/${topic.topic_id}`)} className="text-sm font-semibold text-white bg-white/5 hover:bg-white/10 w-full py-2 rounded-lg transition-colors">Study Cards</button>
                   <button onClick={() => navigate(`/quiz/${topic.topic_id}`)} className="text-sm font-semibold text-black bg-white hover:bg-gray-200 w-full py-2 rounded-lg transition-colors">Take Quiz</button>
                </div>
             </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

// 6. Learn Mode (Flashcards)
const Learn = ({ id }) => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const { data: cards, isLoading } = useQuery({ queryKey: ['cards', id], queryFn: () => api.get(`/topics/${id}/cards`).then(r => r.data) });

    const rateCard = async (rating) => {
        const card_id = cards[currentIndex].card_id;
        try {
            await api.post('/card/rate', { card_id, rating });
            api.get('/auth/me').then(res => authStore.getState().setUser(res.data));
            if (currentIndex < cards.length - 1) {
                setFlipped(false);
                setCurrentIndex(i => i + 1);
            } else {
                navigate('/topics');
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (isLoading) return <Layout><div className="flex flex-col items-center justify-center p-12 text-gray-400">Loading cards...</div></Layout>;
    if (!cards || cards.length === 0) return <Layout><div className="p-12 text-center text-gray-400">No cards in this topic.</div></Layout>;

    const card = cards[currentIndex];

    return (
        <Layout>
            <div className="flex items-center justify-between mt-4 mb-6">
                <button onClick={() => navigate('/topics')} className="text-gray-400 hover:text-white bg-surface p-2 rounded-lg border border-gray-800"><Icon name="arrow-left" /></button>
                <div className="text-sm font-bold text-gray-400">{currentIndex + 1} / {cards.length}</div>
            </div>

            <div className="w-full h-80 cursor-pointer group" onClick={() => setFlipped(!flipped)}>
                {!flipped ? (
                    <div className="w-full h-full bg-gradient-to-br from-surface to-[#1A1A24] border border-primary/30 rounded-3xl p-6 flex flex-col justify-center text-center shadow-xl">
                         <div className="uppercase text-xs font-bold tracking-widest text-primary mb-4">{card.type}</div>
                         <h2 className="text-2xl font-bold text-white leading-snug">{card.title}</h2>
                         <div className="mt-8 text-sm text-gray-500 flex items-center justify-center gap-1"><Icon name="rotate-cw" /> Tap to flip</div>
                    </div>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 to-surface border border-primary/50 text-white rounded-3xl p-6 flex flex-col shadow-xl overflow-y-auto justify-center text-center">
                        <p className="text-lg leading-relaxed">{card.content}</p>
                    </div>
                )}
            </div>

            {flipped && (
                <div className="flex justify-between gap-3 mt-8">
                     <button onClick={(e) => { e.stopPropagation(); rateCard(0); }} className="flex-1 bg-surface border border-gray-800 py-3 rounded-xl text-rose-500 font-bold active:bg-rose-500 active:text-white transition-colors">Skip</button>
                     <button onClick={(e) => { e.stopPropagation(); rateCard(1); }} className="flex-1 bg-surface border border-gray-800 py-3 rounded-xl text-orange-500 font-bold active:bg-orange-500 active:text-white transition-colors">Hard</button>
                     <button onClick={(e) => { e.stopPropagation(); rateCard(2); }} className="flex-1 bg-surface border border-gray-800 py-3 rounded-xl text-blue-500 font-bold active:bg-blue-500 active:text-white transition-colors">Good</button>
                     <button onClick={(e) => { e.stopPropagation(); rateCard(3); }} className="flex-1 bg-surface border border-gray-800 py-3 rounded-xl text-emerald-500 font-bold active:bg-emerald-500 active:text-white transition-colors">Easy</button>
                </div>
            )}
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

   const submitAnswer = async (index) => {
       if (selectedOption !== null) return;
       setSelectedOption(index);
       const mcq = mcqs[currentIndex];
       try {
           const res = await api.post('/answer', { mcq_id: mcq.mcq_id, selected_index: index });
           setResult(res.data);
           api.get('/auth/me').then(info => authStore.getState().setUser(info.data));
       } catch (err) {
           console.error(err);
       }
   };

   const nextQuestion = () => {
       setSelectedOption(null);
       setResult(null);
       if (currentIndex < mcqs.length - 1) {
           setCurrentIndex(i => i + 1);
       } else {
           refetch();
           setCurrentIndex(0);
       }
   };

   if (isLoading) return <Layout><div className="flex flex-col items-center justify-center p-12 text-gray-400">Loading quiz...</div></Layout>;
   if (!mcqs || mcqs.length === 0) return <Layout><div className="p-12 text-center text-gray-400">No questions found.</div></Layout>;

   const mcq = mcqs[currentIndex];
   let options = [];
   try { options = JSON.parse(mcq.options); } catch(e) {}

   return (
       <Layout>
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
                        className += "border-gray-800 bg-surface hover:bg-gray-800";
                    } else if (result) {
                        if (i === result.correct_index) className += "border-emerald-500 bg-emerald-500/20 text-emerald-400";
                        else if (i === selectedOption) className += "border-rose-500 bg-rose-500/20 text-rose-400";
                        else className += "border-gray-800 bg-surface opacity-50";
                    }
                    return (
                        <button key={i} onClick={() => submitAnswer(i)} className={className} disabled={selectedOption !== null}>
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
                    <div className="text-gray-300 text-sm mb-6 leading-relaxed bg-[#0A0A0F]/50 p-4 rounded-xl border border-gray-800">
                        {result.explanation}
                    </div>
                    <Button onClick={nextQuestion} variant={result.correct ? 'success' : 'danger'}>Next Question</Button>
                </div>
            )}
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

// 9. Leaderboard
const Leaderboard = () => {
  const { data, isLoading } = useQuery({ queryKey: ['leaders'], queryFn: () => api.get('/leaderboard').then(r => r.data) });
  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-6 mt-4">Top Global Learners</h2>
      <div className="space-y-3">
         {data?.map((u, i) => (
           <div key={i} className="flex items-center justify-between p-4 bg-surface border border-gray-800 rounded-2xl">
             <div className="flex items-center gap-4">
               <div className="font-bold text-xl text-gray-500 w-6 text-center">{i + 1}</div>
               <div>
                 <div className="font-bold text-white">{u.username}</div>
                 <div className="text-xs text-gray-500">{u.current_streak} day streak</div>
               </div>
             </div>
             <div className="font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-lg">₹{u.wallet_balance.toFixed(0)}</div>
           </div>
         ))}
      </div>
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
  
  // Route matching
  const renderPage = () => {
    if (path === '/' || path === '') {
      return token ? <Home /> : <Splash />;
    }
    if (path === '/login') return <Login />;
    if (!token && !['/'].includes(path)) return <Login />;
    
    // Protected routes
    if (path === '/home') return <Home />;
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
    if (path === '/leaderboard') return <Leaderboard />;
    
    return <Splash />; // default
  };
  
  return renderPage();
};

// Initialize app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
