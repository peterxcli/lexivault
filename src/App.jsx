import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Book,
  Save,
  Github,
  Settings,
  Volume2,
  Loader2,
  BookOpen,
  Trash2,
  ExternalLink,
  RefreshCw,
  X,
  LogOut,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Layers,
  RotateCcw,
  ChevronRight,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

/**
 * LEXIVAULT
 * A modern dictionary that persists lookup history to GitHub Issues.
 * Features: Search, GitHub Sync, Spaced Repetition Review.
 */

// --- UI Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
    ghost: "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50",
    danger: "text-red-600 bg-red-50 hover:bg-red-100 border border-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text", onKeyDown }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-800 placeholder:text-slate-400"
  />
);

const Badge = ({ children, color = 'indigo' }) => {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${colors[color] || colors.indigo}`}>
      {children}
    </span>
  );
};

const Modal = ({ title, children, onClose, footer }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X size={20} />
        </button>
      </div>
      <div className="p-6 overflow-y-auto">
        {children}
      </div>
      {footer && (
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          {footer}
        </div>
      )}
    </div>
  </div>
);

// --- Toast Notification System ---

const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
    {toasts.map(toast => (
      <div
        key={toast.id}
        className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border animate-in slide-in-from-right-full duration-300 ${
          toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
          'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {toast.type === 'error' ? <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" /> :
         toast.type === 'success' ? <CheckCircle size={20} className="text-emerald-500 shrink-0 mt-0.5" /> :
         <AlertTriangle size={20} className="text-slate-500 shrink-0 mt-0.5" />}
        <div className="flex-1 text-sm font-medium">{toast.message}</div>
        <button onClick={() => removeToast(toast.id)} className="opacity-50 hover:opacity-100">
          <X size={16} />
        </button>
      </div>
    ))}
  </div>
);

// --- Flashcard Component ---

const FlashcardSession = ({ words, onClose, onUpdateProgress, onDelete, playAudio }) => {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const audioCache = useRef({});

  // Initialize Session with Weighted Shuffle
  useEffect(() => {
    if (words.length === 0) return;

    // Algorithm:
    // Prioritize OLDER words and words with LOWER remembered counts.
    // Score = (Age / (RememberedCount + 1)) * Jitter
    const now = Date.now();
    const weightedWords = words.map(word => {
      const age = now - new Date(word.created_at).getTime();
      const count = word.remembered || 0;

      // Random factor to prevent identical order
      const jitter = 0.8 + (Math.random() * 0.4);

      // Main formula
      const score = (age / (count + 1)) * jitter;

      return { ...word, score };
    });

    // Sort descending (Higher score = Higher Priority)
    weightedWords.sort((a, b) => b.score - a.score);

    setQueue(weightedWords);
  }, [words]);

  const handleResult = async (remembered) => {
    setProcessing(true);
    const currentCard = queue[currentIndex];

    try {
      await onUpdateProgress(currentCard, remembered);

      // Animation delay
      setTimeout(() => {
        if (currentIndex < queue.length - 1) {
          setIsFlipped(false);
          setCurrentIndex(prev => prev + 1);
        } else {
          setSessionComplete(true);
        }
        setProcessing(false);
      }, 300);
    } catch (e) {
      console.error(e);
      setProcessing(false);
    }
  };

  const handleRestart = () => {
    setIsFlipped(false);
    setCurrentIndex(0);
    setSessionComplete(false);
    // Triggering a re-shuffle effectively happens if parent re-renders,
    // but for now we just restart the current queue or close/reopen.
    // Ideally, we close to force a re-fetch of updated stats.
    onClose();
  };

  const currentCard = queue[currentIndex] || null;

  useEffect(() => {
    if (!currentCard?.word) return;

    const normalizedWord = currentCard.word.toLowerCase();
    if (audioCache.current[normalizedWord] !== undefined) {
      setAudioLoading(false);
      setCurrentAudio(audioCache.current[normalizedWord]);
      setAudioError(audioCache.current[normalizedWord] ? null : 'Audio unavailable');
      return;
    }

    let isMounted = true;
    setAudioLoading(true);
    setAudioError(null);

    const fetchAudio = async () => {
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${normalizedWord}`);
        if (!res.ok) throw new Error('No audio');
        const data = await res.json();
        const audioUrl = data[0]?.phonetics?.find(p => p.audio)?.audio || null;
        if (!isMounted) return;
        audioCache.current[normalizedWord] = audioUrl;
        setCurrentAudio(audioUrl);
        setAudioError(audioUrl ? null : 'Audio unavailable');
      } catch (err) {
        if (!isMounted) return;
        audioCache.current[normalizedWord] = null;
        setCurrentAudio(null);
        setAudioError('Audio unavailable');
      } finally {
        if (isMounted) setAudioLoading(false);
      }
    };

    fetchAudio();

    return () => {
      isMounted = false;
    };
  }, [currentCard]);

  if (queue.length === 0) return <div className="p-8 text-center">Loading cards...</div>;

  if (sessionComplete) {
    return (
      <div className="text-center py-12 animate-in zoom-in-95">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Session Complete!</h3>
        <p className="text-slate-500 mb-8">Great job reviewing your vocabulary.</p>
        <div className="flex justify-center gap-4">
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[450px]">
      {/* Progress Bar */}
      <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">
         <span>Card {currentIndex + 1} / {queue.length}</span>
         <span>Mastery: {currentCard.remembered || 0}/5</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((currentIndex) / queue.length) * 100}%` }}
        />
      </div>

      {/* Card Area */}
      <div
        className="w-full flex-1 perspective-1000 cursor-pointer group relative mb-8"
        onClick={() => !processing && setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-72 transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
             style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>

          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-white border-2 border-indigo-100 rounded-3xl shadow-xl shadow-indigo-100 flex flex-col items-center justify-center p-8 text-center hover:border-indigo-300 transition-colors">
             <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-4">Word</span>
             <h2 className="text-4xl font-bold text-slate-800 mb-4">{currentCard.word}</h2>
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 if (currentAudio && playAudio) playAudio(currentAudio);
               }}
               disabled={!currentAudio || !playAudio}
               className="flex items-center gap-2 text-sm font-medium text-indigo-600 disabled:text-slate-300 mb-6"
             >
               <Volume2 size={16} />
              {audioLoading ? 'Loading audio...' : audioError && !currentAudio ? 'Audio unavailable' : 'Play audio'}
             </button>

             {/* Mastery Dots */}
             <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < (currentCard.remembered || 0) ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                ))}
             </div>

             <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
               <RotateCcw size={14} /> Tap to reveal
             </p>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-200 flex flex-col items-center justify-center p-8 text-center transform rotate-y-180"
               style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
             <span className="text-xs font-bold tracking-widest text-indigo-200 uppercase mb-4">Definition</span>
             <div className="overflow-y-auto max-h-full custom-scrollbar w-full">
               <p className="text-lg leading-relaxed font-medium">
                 {currentCard.summary.replace(/\*\*/g, '').replace('Definition:', '').split('<!--')[0]}
               </p>
             </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 w-full px-2">
        {!isFlipped ? (
            <Button onClick={() => setIsFlipped(true)} variant="secondary" className="w-full py-4">
                Show Answer
            </Button>
        ) : (
            <>
                <Button
                    onClick={(e) => { e.stopPropagation(); handleResult(false); }}
                    variant="warning"
                    className="flex-1 py-4"
                    disabled={processing}
                    icon={ThumbsDown}
                >
                    Forgot
                </Button>
                <Button
                    onClick={(e) => { e.stopPropagation(); handleResult(true); }}
                    variant="success"
                    className="flex-1 py-4"
                    disabled={processing}
                    icon={ThumbsUp}
                >
                    Remember
                </Button>
            </>
        )}
      </div>
    </div>
  );
};

// --- Main Application ---

export default function LexiVault() {
  // -- State --
  const [query, setQuery] = useState('');
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // GitHub Config State
  const [showSettings, setShowSettings] = useState(false);
  const [ghConfig, setGhConfig] = useState({
    token: '',
    owner: '',
    repo: ''
  });
  const [savedWords, setSavedWords] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Modal States
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  // Toast State
  const [toasts, setToasts] = useState([]);

  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Audio Ref
  const audioRef = useRef(null);
  const [searchAudioUrl, setSearchAudioUrl] = useState(null);
  const [searchAudioLoading, setSearchAudioLoading] = useState(false);
  const [searchAudioError, setSearchAudioError] = useState(null);
  const searchAudioCache = useRef({});

  // -- Effects --

  // Splash screen effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // Show for 2 seconds
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const savedConfig = localStorage.getItem('lexivault_config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setGhConfig(parsed);
      if (parsed.token && parsed.owner && parsed.repo) {
        setIsConfigured(true);
        fetchSavedWords(parsed);
      } else {
        setShowSettings(true);
      }
    } else {
      setShowSettings(true);
    }
  }, []);

  useEffect(() => {
    if (!wordData?.word) {
      setSearchAudioUrl(null);
      setSearchAudioError(null);
      setSearchAudioLoading(false);
      return;
    }

    const normalizedWord = wordData.word.toLowerCase();
    const inlineAudio = wordData.phonetics?.find(p => p.audio)?.audio || null;

    if (inlineAudio) {
      searchAudioCache.current[normalizedWord] = inlineAudio;
      setSearchAudioUrl(inlineAudio);
      setSearchAudioError(null);
      setSearchAudioLoading(false);
      return;
    }

    if (searchAudioCache.current[normalizedWord] !== undefined) {
      const cached = searchAudioCache.current[normalizedWord];
      setSearchAudioUrl(cached);
      setSearchAudioError(cached ? null : 'Audio unavailable');
      setSearchAudioLoading(false);
      return;
    }

    let isMounted = true;
    setSearchAudioLoading(true);
    setSearchAudioError(null);

    const fetchAudio = async () => {
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${normalizedWord}`);
        if (!res.ok) throw new Error('Audio unavailable');
        const data = await res.json();
        const fetchedAudio = data[0]?.phonetics?.find(p => p.audio)?.audio || null;
        if (!isMounted) return;
        searchAudioCache.current[normalizedWord] = fetchedAudio;
        setSearchAudioUrl(fetchedAudio);
        setSearchAudioError(fetchedAudio ? null : 'Audio unavailable');
      } catch (err) {
        if (!isMounted) return;
        searchAudioCache.current[normalizedWord] = null;
        setSearchAudioUrl(null);
        setSearchAudioError('Audio unavailable');
      } finally {
        if (isMounted) setSearchAudioLoading(false);
      }
    };

    fetchAudio();

    return () => {
      isMounted = false;
    };
  }, [wordData]);

  // -- Helper Functions --

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const normalizeWord = (word) => (word || '').trim().toLowerCase();

  // -- Dictionary Logic --

  const searchWord = async (wordToSearch) => {
    if (!wordToSearch) return;
    setLoading(true);
    setError(null);
    setWordData(null);

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordToSearch}`);
      if (!response.ok) throw new Error('Word not found');
      const data = await response.json();
      setWordData(data[0]);
    } catch (err) {
      setError("Sorry, we couldn't find that word in the dictionary.");
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (audioUrl) => {
    if (!audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
    } else {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
    }
  };

  // -- GitHub Logic --

  const parseIssueRemembered = (body = '') => {
    const match = body.match(/<!-- lexivault: ({.*}) -->/);
    if (match && match[1]) {
      try {
        const meta = JSON.parse(match[1]);
        return meta.remembered || 0;
      } catch (e) {
        return 0;
      }
    }
    return 0;
  };

  const mapIssueToWord = (issue) => ({
    id: issue.number,
    word: issue.title,
    summary: issue.body,
    created_at: issue.created_at,
    url: issue.html_url,
    remembered: parseIssueRemembered(issue.body)
  });

  const fetchIssuesFromGithub = async (config = ghConfig) => {
    if (!config.token) return [];

    const perPage = 100;
    let page = 1;
    let allIssues = [];

    while (true) {
      const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/issues?labels=lexivault&state=open&per_page=${perPage}&page=${page}`, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (res.status === 404) throw new Error("Repo not found");
      if (res.status === 401) throw new Error("Invalid Token");
      if (!res.ok) throw new Error("Failed to reach GitHub");

      const issues = await res.json();
      if (!Array.isArray(issues) || issues.length === 0) break;

      allIssues = allIssues.concat(issues);

      if (issues.length < perPage) break;
      page += 1;
    }

    return allIssues.map(mapIssueToWord);
  };

  const saveConfig = () => {
    localStorage.setItem('lexivault_config', JSON.stringify(ghConfig));
    if (ghConfig.token && ghConfig.owner && ghConfig.repo) {
      setIsConfigured(true);
      setShowSettings(false);
      fetchSavedWords(ghConfig);
      addToast('Configuration saved!', 'success');
    } else {
      addToast('Please fill in all fields', 'error');
    }
  };

  const disconnectVault = () => {
    localStorage.removeItem('lexivault_config');
    setGhConfig({ token: '', owner: '', repo: '' });
    setSavedWords([]);
    setIsConfigured(false);
    setShowDisconnectConfirm(false);
    setShowSettings(true);
    addToast('Vault disconnected.', 'info');
  };

  const fetchSavedWords = async (config = ghConfig) => {
    if (!config.token) return;
    setLoadingSaved(true);
    try {
      const latestIssues = await fetchIssuesFromGithub(config);
      setSavedWords(latestIssues);
      return latestIssues;
    } catch (e) {
      console.error("GitHub Fetch Error:", e);
      addToast('Failed to load vault. Check your config.', 'error');
      return null;
    } finally {
      setLoadingSaved(false);
    }
  };

  const updateWordProgress = async (wordObj, remembered) => {
    let newCount = remembered ? (wordObj.remembered + 1) : 0;

    // If mastered (count > 5), delete/close issue
    if (newCount > 5) {
        await deleteWord(wordObj.id, true); // true = silent mode/auto
        return;
    }

    // Otherwise update body
    // Strip existing meta comment if any
    const cleanBody = wordObj.summary.replace(/<!-- lexivault: .* -->/g, '').trim();
    const newBody = `${cleanBody}\n\n<!-- lexivault: {"remembered": ${newCount}} -->`;

    try {
        const res = await fetch(`https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/issues/${wordObj.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `token ${ghConfig.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ body: newBody })
        });

        if (res.ok) {
            // Optimistic local update
            setSavedWords(prev => prev.map(w =>
                w.id === wordObj.id ? { ...w, remembered: newCount, summary: newBody } : w
            ));
        }
    } catch (e) {
        console.error("Failed to update progress", e);
        addToast("Failed to save progress", 'error');
    }
  };

  const deleteWord = async (issueId, isAutoMastered = false) => {
    // Optimistic update
    const originalWords = [...savedWords];
    setSavedWords(prev => prev.filter(w => w.id !== issueId));
    if (!isAutoMastered) setItemToDelete(null);

    try {
      const res = await fetch(`https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${ghConfig.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: 'closed' })
      });

      if (!res.ok) throw new Error("Failed to delete on server");

      if (isAutoMastered) {
          addToast("Mastered! Word removed from review.", 'success');
      } else {
          addToast("Word removed from vault.", 'success');
      }

    } catch (err) {
      console.error(err);
      setSavedWords(originalWords); // Revert on error
      addToast("Could not sync deletion with GitHub.", 'error');
    }
  };

  const saveToVault = async () => {
    if (!wordData || !isConfigured) return;

    const normalizedWord = normalizeWord(wordData.word);

    if (savedWords.some(w => normalizeWord(w.word) === normalizedWord)) {
      addToast("Word is already in your Vault!", 'info');
      return;
    }

    // Pull the latest open issues from GitHub to avoid duplicates created elsewhere
    let latestWords = savedWords;
    try {
      const remoteWords = await fetchIssuesFromGithub();
      if (remoteWords) {
        setSavedWords(remoteWords);
        latestWords = remoteWords;
      }
    } catch (err) {
      console.error("Remote duplicate check failed:", err);
      addToast("Could not verify duplicates on GitHub. Please try again.", 'error');
      return;
    }

    if (latestWords.some(w => normalizeWord(w.word) === normalizedWord)) {
      addToast(`"${wordData.word}" is already an open issue in your vault.`, 'info');
      return;
    }

    const definitionSummary = wordData.meanings[0]?.definitions[0]?.definition || "No definition";

    try {
      const res = await fetch(`https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${ghConfig.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: wordData.word,
          // Initialize with count 0
          body: `**Definition:** ${definitionSummary}\n\n*Added via LexiVault*\n\n<!-- lexivault: {"remembered": 0} -->`,
          labels: ['lexivault']
        })
      });

      if (res.ok) {
        fetchSavedWords();
        addToast(`Saved "${wordData.word}" to vault!`, 'success');
      } else {
        addToast("Failed to save. Check permissions.", 'error');
      }
    } catch (e) {
      console.error(e);
      addToast("Network error saving to GitHub.", 'error');
    }
  };

  // -- Render Helpers --

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') searchWord(query);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">

      {/* Splash Screen */}
      {showSplash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 animate-in fade-in">
          <div className="text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/20">
              <BookOpen size={40} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">LexiVault</h1>
            <p className="text-xl text-indigo-100 font-medium">Your words. Your vault. Your mastery.</p>
            <div className="mt-8 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse delay-75" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse delay-150" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <BookOpen size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">LexiVault</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="hidden sm:flex"
              onClick={() => window.open('https://github.com/peterxcli/lexivault', '_blank')}
            >
              <Github size={18} />
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowSettings(true)}
              className={!isConfigured ? "ring-2 ring-indigo-500 ring-offset-2" : ""}
            >
              <Settings size={18} />
              <span className="hidden sm:inline">Config</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Search & Definition */}
        <div className="lg:col-span-8 space-y-6">

          {/* Search Box */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Search size={20} />
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search for a word..."
              className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
            />
            <button
              onClick={() => searchWord(query)}
              className="absolute right-3 top-3 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition-colors"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
            </button>
          </div>

          {/* Welcome State */}
          {!wordData && !error && !loading && (
            <div className="text-center py-20 opacity-50">
              <BookOpen size={64} className="mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">Type a word to begin your exploration.</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 text-center">
              <p>{error}</p>
            </div>
          )}

          {/* Definition Card */}
          {wordData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="overflow-hidden">
                {/* Card Header */}
                <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-gradient-to-r from-white to-slate-50">
                  <div>
                    <div className="flex items-baseline gap-4 flex-wrap">
                      <h2 className="text-4xl font-bold text-slate-900">{wordData.word}</h2>
                      <span className="text-xl text-indigo-500 font-serif italic">{wordData.phonetic}</span>
                    </div>
                    {/* Audio Button */}
                    <button
                      onClick={() => searchAudioUrl && playAudio(searchAudioUrl)}
                      disabled={!searchAudioUrl}
                      className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors disabled:text-slate-300 disabled:hover:text-slate-300"
                    >
                      <div className="p-1.5 rounded-full bg-slate-100 text-slate-600">
                        <Volume2 size={16} />
                      </div>
                      {searchAudioLoading ? 'Loading audio...' : searchAudioError && !searchAudioUrl ? 'Audio unavailable' : 'Listen'}
                    </button>
                  </div>

                  <Button
                    onClick={saveToVault}
                    variant={savedWords.some(w => w.word.toLowerCase() === wordData.word.toLowerCase()) ? "secondary" : "primary"}
                    disabled={!isConfigured || savedWords.some(w => w.word.toLowerCase() === wordData.word.toLowerCase())}
                  >
                    {savedWords.some(w => w.word.toLowerCase() === wordData.word.toLowerCase()) ? "Saved" : "Save to Vault"}
                    <Save size={18} />
                  </Button>
                </div>

                {/* Meanings */}
                <div className="p-6 sm:p-8 space-y-8">
                  {wordData.meanings.map((meaning, idx) => (
                    <div key={idx}>
                      <div className="flex items-center gap-3 mb-4">
                        <Badge>{meaning.partOfSpeech}</Badge>
                        <div className="h-px flex-1 bg-slate-100"></div>
                      </div>
                      <ul className="space-y-4">
                        {meaning.definitions.slice(0, 4).map((def, dIdx) => (
                          <li key={dIdx} className="text-slate-700 leading-relaxed pl-4 border-l-2 border-indigo-100 hover:border-indigo-300 transition-colors">
                            <span className="font-medium text-slate-900 block mb-1">
                              {def.definition}
                            </span>
                            {def.example && (
                              <p className="text-slate-500 text-sm italic">
                                "{def.example}"
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column: The Vault */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Book size={20} className="text-indigo-600" />
                Your Vault
              </h3>
              <div className="flex gap-1">
                {isConfigured && (
                   <button
                    onClick={() => setIsReviewing(true)}
                    className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    title="Start Flashcard Review"
                  >
                    <Layers size={14} /> Review
                  </button>
                )}
                {isConfigured && (
                  <button onClick={() => fetchSavedWords()} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors">
                    <RefreshCw size={16} className={loadingSaved ? "animate-spin" : ""} />
                  </button>
                )}
              </div>
            </div>

            {!isConfigured ? (
              <Card className="p-6 text-center bg-indigo-50 border-indigo-100">
                <Github className="mx-auto text-indigo-400 mb-3" size={32} />
                <h4 className="font-bold text-indigo-900 mb-1">Connect GitHub</h4>
                <p className="text-indigo-700/80 text-sm mb-4">
                  Connect a repository to save words and review them later.
                </p>
                <Button variant="primary" className="w-full" onClick={() => setShowSettings(true)}>
                  Configure
                </Button>
              </Card>
            ) : (
              <Card className="max-h-[calc(100vh-150px)] overflow-y-auto custom-scrollbar">
                {savedWords.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <p className="text-sm">No words saved yet.</p>
                    <p className="text-xs mt-1 opacity-70">Search and click 'Save' to build your vocabulary.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {savedWords.map((item) => (
                      <div
                        key={item.id}
                        className="group p-4 hover:bg-slate-50 transition-colors cursor-pointer relative"
                        onClick={() => {
                          setQuery(item.word);
                          searchWord(item.word);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <div className="flex justify-between items-start pr-6">
                          <h4 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{item.word}</h4>
                          {item.remembered > 0 && (
                             <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">
                               {item.remembered}/5
                             </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-300 hover:text-slate-600 p-1"
                            title="View on GitHub"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete(item);
                            }}
                            className="text-slate-300 hover:text-red-500 p-1"
                            title="Remove from Vault"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Extract just the first line of body if possible for preview */}
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 pr-4">
                          {item.summary.replace(/\*\*/g, '').replace('Definition:', '').split('<!--')[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <Modal
          title="Configuration"
          onClose={() => setShowSettings(false)}
          footer={
            <div className="w-full flex justify-between items-center">
              {isConfigured ? (
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="text-red-500 text-sm font-medium hover:text-red-600 flex items-center gap-1"
                >
                  <LogOut size={16} /> Disconnect
                </button>
              ) : <div></div>}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowSettings(false)}>Cancel</Button>
                <Button variant="primary" onClick={saveConfig}>Save & Connect</Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
              <p className="font-semibold mb-1">How this works:</p>
              <p>LexiVault uses GitHub Issues to store your words. You need a <strong>Personal Access Token</strong> with <code>repo</code> scope.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">GitHub Token</label>
                <Input
                  type="password"
                  placeholder="ghp_..."
                  value={ghConfig.token}
                  onChange={(e) => setGhConfig({...ghConfig, token: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <Input
                    placeholder="octocat"
                    value={ghConfig.owner}
                    onChange={(e) => setGhConfig({...ghConfig, owner: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Repo Name</label>
                  <Input
                    placeholder="my-vocab"
                    value={ghConfig.repo}
                    onChange={(e) => setGhConfig({...ghConfig, repo: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <Modal
          title="Delete Word"
          onClose={() => setItemToDelete(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setItemToDelete(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => deleteWord(itemToDelete.id)}>Remove</Button>
            </>
          }
        >
          <div className="text-center py-2">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Remove "{itemToDelete.word}"?</h4>
            <p className="text-slate-500">
              This will remove the word from your local list and close the issue on GitHub.
            </p>
          </div>
        </Modal>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <Modal
          title="Disconnect Vault"
          onClose={() => setShowDisconnectConfirm(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowDisconnectConfirm(false)}>Cancel</Button>
              <Button variant="danger" onClick={disconnectVault}>Disconnect</Button>
            </>
          }
        >
          <div className="text-center py-2">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Disconnect from GitHub?</h4>
            <p className="text-slate-500">
              This will clear your access token from this browser. Your data on GitHub will remain safe.
            </p>
          </div>
        </Modal>
      )}

      {/* Review Modal */}
      {isReviewing && (
        <Modal
          title="Flashcard Review"
          onClose={() => setIsReviewing(false)}
        >
          <FlashcardSession
            words={savedWords}
            onClose={() => setIsReviewing(false)}
            onUpdateProgress={updateWordProgress}
            onDelete={deleteWord}
            playAudio={playAudio}
          />
        </Modal>
      )}

    </div>
  );
}
