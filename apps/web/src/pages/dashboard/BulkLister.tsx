import React, { useState, useEffect, useMemo } from 'react';
import { 
  Pencil, Bell, ChevronDown, CheckCircle2, Loader2, Clock, XCircle, 
  ExternalLink, UploadCloud, FileText, Play, Pause, Square, RefreshCw, Check, AlertCircle
} from 'lucide-react';
import { Card } from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@repo/ui/components/ui/dialog';

// MOCK DATA mapped to your specific URLs
const MOCK_PRODUCTS: Record<string, { title: string; img: string }> = {
  'B0D5LYXLV5': { title: '220 Pack White Price Tags with String Attached Writable Display Labels White Price Gift Tags for Gift Wrapping', img: 'https://m.media-amazon.com/images/I/417qs0mzYWL._AC_.jpg' },
  'B0BMV8FRBT': { title: 'White Lace Marking Tags, 200Pcs Blank Merchandise Tags, Display Labels for Holiday Arts Crafts', img: 'https://m.media-amazon.com/images/I/31yeLoJ4XfL._AC_.jpg' },
  'B09YRK94V6': { title: 'OFFO Shower Head Holder for Handheld Shower Head, Adjustable Shower Arm Mount', img: 'https://m.media-amazon.com/images/I/41+Jtc0uyiL._AC_.jpg' },
  'B0B3QH349N': { title: 'WarmSpray High Pressure Shower Head 5 Settings Fixed Showerhead 4 Inch High Flow', img: 'https://m.media-amazon.com/images/I/51gv2VqxnJL._AC_.jpg' },
  'B0D9YKLVRT': { title: 'Toothbrush Holders for Bathrooms, Electric Tooth Brush Holder with Bamboo Dividers', img: 'https://m.media-amazon.com/images/I/31WxB8ZxKWL._AC_.jpg' },
  'B07W8TH4W8': { title: 'NearMoon Rain Shower Head, Ultra-Thin Design-Pressure Boosting, Awesome Some Experience', img: 'https://m.media-amazon.com/images/I/51rlLuRr8HL._AC_.jpg' },
  'B0CGZGXQFY': { title: 'kickic Laundry Bag, 2 Pack Extra Large Travel Laundry Bags for Dirty Clothes', img: 'https://m.media-amazon.com/images/I/41Rl52h7fML._AC_.jpg' },
  '168029943': { title: 'Pen+Gear All-Purpose Jumbo School Glue Sticks, Washable', img: 'https://placehold.co/400x400/png?text=Walmart+Glue+Sticks' },
  'B0B5QZCV2D': { title: 'EDISHINE Motion Sensor, 180-Degree Replacement Motion Detector for Security Floodlights', img: 'https://m.media-amazon.com/images/I/21tflRqcWzL._AC_.jpg' }
};

type QueueItem = {
  id: string;
  url: string;
  status: 'queued' | 'processing' | 'success' | 'failed';
  asin: string;
  title: string;
  img: string;
};

type Activity = {
  id: string;
  time: string;
  type: 'info' | 'success' | 'processing' | 'queued' | 'failed';
  text: string;
  subtext: string;
  icon: React.ReactNode;
};

export default function BulkJobDashboard() {
  const [isRunning, setIsRunning] = useState(false);
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const [intervalInput, setIntervalInput] = useState('50');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState('paste');
  const [pasteInput, setPasteInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0); // 0 to 4

  // Derived Stats
  const stats = useMemo(() => {
    const total = queue.length;
    let completed = 0, processing = 0, queued = 0, failed = 0;
    queue.forEach(q => {
      if (q.status === 'success') completed++;
      else if (q.status === 'processing') processing++;
      else if (q.status === 'queued') queued++;
      else if (q.status === 'failed') failed++;
    });
    return { total, completed, processing, queued, failed };
  }, [queue]);

  const activeItem = queue.find(q => q.status === 'processing');
  const failedItems = queue.filter(q => q.status === 'failed');

  // URL Parsing
  const handleAddLinks = () => {
    if (!pasteInput.trim()) return;
    const lines = pasteInput.split(/[\n,]/).filter(l => l.trim());
    
    const newItems: QueueItem[] = lines.map(url => {
      let asin = "UNKNOWN";
      const amzMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
      if (amzMatch) asin = amzMatch[1];
      else {
        const walMatch = url.match(/\/ip\/[^\/]+\/(\d+)/i);
        if (walMatch) asin = walMatch[1];
      }

      const mockData = MOCK_PRODUCTS[asin] || {
        title: `Unknown Product (${asin})`,
        img: `https://placehold.co/400x400/png?text=${asin}`
      };

      return {
        id: crypto.randomUUID(),
        url: url.trim(),
        status: 'queued',
        asin,
        title: mockData.title,
        img: mockData.img
      };
    });

    setQueue(prev => [...prev, ...newItems]);
    setActivities(prev => {
      const newAct: Activity = {
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type: 'queued',
        text: `Added ${newItems.length} items to queue`,
        subtext: 'Ready to process',
        icon: <Clock className="w-3 h-3 text-amber-600" />
      };
      return [newAct, ...prev].slice(0, 50);
    });
    setPasteInput('');
  };

  // Extension Bridge Communication
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'SELLERSUIT_EXTENSION_READY' || data.type === 'SELLERSUIT_EXTENSION_PONG') {
        setIsExtensionConnected(true);
      }

      if (data.type === 'BULK_JOB_PROGRESS_UPDATE') {
        console.log('[BulkLister] Received PROGRESS_UPDATE:', data.payload);
        const payload = data.payload;
        if (payload.index !== undefined) {
          setQueue(prev => {
            const next = [...prev];
            if (next[payload.index]) {
              if (payload.isCompleted) next[payload.index].status = 'success';
              else if (payload.isError) next[payload.index].status = 'failed';
              else next[payload.index].status = 'processing';
              console.log(`[BulkLister] Updated queue item ${payload.index} to ${next[payload.index].status}`);
            } else {
              console.warn(`[BulkLister] Item ${payload.index} not found in queue of length ${next.length}!`);
            }
            return next;
          });

          // Look up title safely without causing dependency loops
          setQueue(currentQueue => {
            const title = currentQueue[payload.index]?.title || `Item ${payload.index}`;
            setActivities(prev => {
              const newAct: Activity = {
                id: crypto.randomUUID(),
                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                type: payload.isCompleted ? 'success' : payload.isError ? 'failed' : 'processing',
                text: payload.status,
                subtext: title,
                icon: payload.isCompleted ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : 
                      payload.isError ? <XCircle className="w-3 h-3 text-red-600" /> : 
                      <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
              };
              return [newAct, ...prev].slice(0, 50);
            });
            return currentQueue;
          });
        }
      }

      if (data.type === 'BULK_JOB_ERROR') {
        alert("Bulk Job Error: " + data.error);
        setIsRunning(false);
      }

      if (data.type === 'BULK_JOB_DEBUG') {
        console.log('DEBUG:', data.message);
        setActivities(prev => {
          const newAct: Activity = {
            id: crypto.randomUUID(),
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            type: 'info',
            text: 'DEBUG',
            subtext: data.message,
            icon: <Clock className="w-3 h-3 text-purple-600" />
          };
          return [newAct, ...prev].slice(0, 50);
        });
      }

      if (data.type === 'BULK_JOB_FINISHED') {
        setIsRunning(false);
        setActivities(prev => {
          const newAct: Activity = {
            id: crypto.randomUUID(),
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            type: 'success',
            text: 'Job Finished',
            subtext: 'All items processed',
            icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          };
          return [newAct, ...prev].slice(0, 50);
        });
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Also listen to the custom event from auth_sync
    const handleCustomEvent = () => setIsExtensionConnected(true);
    window.addEventListener('sellersuit-extension-ready', handleCustomEvent);
    
    // Immediate check of global variable
    if ((window as any).__SELLERSUIT_EXTENSION_INSTALLED__) {
      setIsExtensionConnected(true);
    }
    
    // Heartbeat ping using both custom ping and auth_sync ping
    const pingInterval = setInterval(() => {
      if ((window as any).__SELLERSUIT_EXTENSION_INSTALLED__) {
        setIsExtensionConnected(true);
      }
      window.postMessage({ type: 'PING_EXTENSION' }, '*');
      window.postMessage({ type: 'SELLERSUIT_EXTENSION_PING' }, '*');
    }, 2000);
    
    window.postMessage({ type: 'PING_EXTENSION' }, '*');
    window.postMessage({ type: 'SELLERSUIT_EXTENSION_PING' }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('sellersuit-extension-ready', handleCustomEvent);
      clearInterval(pingInterval);
    };
  }, []); // Run once on mount

  const startJob = () => {
    if (!isExtensionConnected) {
      alert("Extension not connected! Please refresh the page and ensure the SellerSuit extension is enabled.");
      return;
    }

    let currentQueue = [...queue];
    
    // Auto-add any text in pasteInput that the user forgot to add
    if (pasteInput.trim()) {
      const lines = pasteInput.split(/[\n,]/).filter(l => l.trim());
      const newItems: QueueItem[] = lines.map(url => {
        let asin = "UNKNOWN";
        const amzMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
        if (amzMatch) asin = amzMatch[1];
        else {
          const walMatch = url.match(/\/ip\/[^\/]+\/(\d+)/i);
          if (walMatch) asin = walMatch[1];
        }
        const mockData = MOCK_PRODUCTS[asin] || {
          title: `Unknown Product (${asin})`,
          img: `https://placehold.co/400x400/png?text=${asin}`
        };
        return {
          id: crypto.randomUUID(),
          url: url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`,
          status: 'queued',
          asin,
          title: mockData.title,
          img: mockData.img
        };
      });
      currentQueue = [...currentQueue, ...newItems];
      setQueue(currentQueue);
      setPasteInput('');
      setActivities(prev => {
        const newAct: Activity = {
          id: crypto.randomUUID(),
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: 'queued',
          text: `Added ${newItems.length} items to queue`,
          subtext: 'Ready to process',
          icon: <Clock className="w-3 h-3 text-amber-600" />
        };
        return [newAct, ...prev].slice(0, 50);
      });
    }
    
    if (currentQueue.length === 0) {
        alert("Please paste some Amazon links first!");
        return;
    }

    setIsRunning(true);
    
    alert(`[DIAGNOSTIC] Sending START_BULK_JOB to bridge with ${currentQueue.length} items`);
    // Send to extension
    window.postMessage({
      type: 'START_BULK_JOB',
      payload: {
        urls: currentQueue.map(q => q.url),
        currentIndex: Math.max(0, currentQueue.findIndex(q => q.status === 'queued' || q.status === 'failed')),
        interval: parseInt(intervalInput) || 60
      }
    }, '*');
  };

  const pauseJob = () => {
    setIsRunning(false);
    window.postMessage({ type: 'PAUSE_BULK_JOB' }, '*');
  };

  const stopJob = () => {
    setIsRunning(false);
    setQueue([]);
    setActivities([]);
    window.postMessage({ type: 'STOP_BULK_JOB' }, '*');
  };

  const progressPercent = stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="w-full pb-8 space-y-4 px-2 sm:px-4 md:px-6">
      
      {/* 1. TOP HEADER BAR */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
        <div>
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Amazon Bulk Lister</h1>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${isRunning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              {isRunning ? 'Running' : 'Paused'}
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-2 font-medium">
            <span>Started: Today</span>
            <span className="w-1 h-1 rounded-full bg-border hidden sm:block"></span>
            <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded border border-border/50">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span>Interval:</span>
              <input 
                type="number" 
                min="50"
                value={intervalInput}
                onChange={(e) => setIntervalInput(e.target.value)}
                onBlur={(e) => {
                  let val = parseInt(e.target.value);
                  if (isNaN(val) || val < 50) setIntervalInput('50');
                }}
                className="w-10 bg-transparent text-foreground border-b border-dashed border-muted-foreground/50 focus:border-blue-500 focus:outline-none text-center font-mono p-0"
              />
              <span>sec</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 mr-auto sm:mr-4">
            {isRunning ? (
              <Button size="sm" variant="outline" onClick={pauseJob} className="h-8 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 flex-1 sm:flex-none">
                <Pause className="w-3.5 h-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">Pause</span>
              </Button>
            ) : (
              <Button size="sm" onClick={startJob} disabled={stats.queued === 0 && !pasteInput.trim()} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none">
                <Play className="w-3.5 h-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">Resume</span>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={stopJob} className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 flex-1 sm:flex-none">
              <Square className="w-3.5 h-3.5 sm:mr-1.5" fill="currentColor" /> <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. STATS ROW */}
      <Card className="p-4 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center justify-center sm:justify-start gap-5 w-full xl:w-auto">
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={radius} className="stroke-muted/30" strokeWidth="5" fill="none" />
              <circle 
                cx="32" cy="32" r={radius} 
                className="stroke-emerald-500 transition-all duration-1000 ease-in-out" 
                strokeWidth="5" fill="none" strokeLinecap="round"
                style={{ strokeDasharray: circumference, strokeDashoffset: isNaN(strokeDashoffset) ? circumference : strokeDashoffset }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-foreground">{progressPercent}%</span>
            </div>
          </div>
          
          <div className="space-y-1 w-full max-w-[200px]">
            <div className="flex justify-between text-[11px] font-medium">
              <span className="text-foreground">{stats.completed} / {stats.total} <span className="text-muted-foreground hidden sm:inline">Products</span></span>
            </div>
            <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        <div className="hidden xl:block w-px h-12 bg-border"></div>

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><CheckCircle2 className="w-4 h-4" /></div>
            <div><div className="text-lg font-bold leading-none text-foreground">{stats.completed}</div><div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Completed</div></div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><RefreshCw className="w-4 h-4 animate-spin" /></div>
            <div><div className="text-lg font-bold leading-none text-foreground">{stats.processing}</div><div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Processing</div></div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0"><Clock className="w-4 h-4" /></div>
            <div><div className="text-lg font-bold leading-none text-foreground">{stats.queued}</div><div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Queued</div></div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0"><XCircle className="w-4 h-4" /></div>
            <div><div className="text-lg font-bold leading-none text-foreground">{stats.failed}</div><div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Failed</div></div>
          </div>
        </div>
      </Card>

      {/* 3. MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">
          
          {/* Currently Processing Card */}
          <Card className="p-4 shadow-sm min-h-[220px] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1.5 h-1.5 rounded-full ${activeItem ? 'bg-blue-600 animate-pulse' : 'bg-muted-foreground'}`}></div>
              <h2 className="text-sm font-bold text-foreground">Currently Processing</h2>
            </div>
            
            {activeItem ? (
              <>
                <div className="flex flex-col sm:flex-row gap-4 mb-4 bg-muted/20 p-3 rounded-lg border border-border/50">
                  <div className="w-full sm:w-20 h-32 sm:h-20 bg-white border border-border rounded-md p-1 shrink-0 flex items-center justify-center">
                    <img src={activeItem.img} alt="Product" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-sm leading-tight text-foreground line-clamp-2">{activeItem.title}</h3>
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 -mt-1"><ExternalLink className="w-3 h-3" /></Button>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-mono bg-background text-muted-foreground px-1.5 py-0.5 rounded border">ID: {activeItem.asin}</span>
                    </div>
                    <p className="text-xs text-blue-600 font-semibold mt-2">
                      Step: {['Extracting Data', 'Creating Draft', 'Uploading Images', 'Publishing', 'Verifying'][currentStep]} ({currentStep+1}/5)
                    </p>
                  </div>
                </div>

                {/* Stepper */}
                <div className="relative flex justify-between items-center px-0 sm:px-4 py-2 overflow-x-auto min-w-[280px]">
                  <div className="absolute top-4 left-4 sm:left-8 right-4 sm:right-8 h-px bg-border -z-10"></div>
                  <div className="absolute top-4 left-4 sm:left-8 h-px bg-emerald-500 -z-10 transition-all" style={{ width: `${(currentStep / 4) * 100}%` }}></div>
                  
                  {['Extract', 'Draft', 'Images', 'Publish', 'Verify'].map((label, idx) => {
                    const isDone = currentStep > idx;
                    const isCurrent = currentStep === idx;
                    return (
                      <div key={label} className="flex flex-col items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isDone ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                          isCurrent ? 'bg-blue-50 text-blue-600 border-blue-200 ring-2 ring-blue-100 ring-offset-1' :
                          'bg-background text-muted-foreground border-border'
                        }`}>
                          {isDone ? <CheckCircle2 className="w-3 h-3" /> : isCurrent ? <UploadCloud className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        </div>
                        <span className={`text-[9px] ${isDone ? 'font-medium text-emerald-700' : isCurrent ? 'font-bold text-blue-700' : 'font-medium text-muted-foreground'}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                <Clock className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">Waiting for job</p>
                <p className="text-xs">Add links and click Resume to start processing.</p>
              </div>
            )}
          </Card>

          {/* Live Activity Feed */}
          <Card className="p-4 shadow-sm flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h2 className="text-sm font-bold text-foreground">Live Activity</h2>
              {isRunning && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Live
                </span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
              {activities.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No activity yet.</div>
              ) : (
                activities.map(act => (
                  <div key={act.id} className="flex gap-3 items-start">
                    <div className="text-[10px] text-muted-foreground font-mono w-14 shrink-0 pt-0.5">{act.time}</div>
                    <div className="shrink-0 mt-0.5">{act.icon}</div>
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold ${act.type === 'success' ? 'text-emerald-700' : act.type === 'processing' ? 'text-blue-700' : 'text-foreground'}`}>{act.text}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{act.subtext}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4">
          
          {/* Queue Progress Card */}
          <Card className="p-4 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">Queue Progress</h2>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs text-blue-600">View All ({stats.total})</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>All Queued Items ({stats.total})</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                    {queue.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">Queue is empty.</div>
                    ) : (
                      queue.map((item, i) => (
                        <div key={item.id} className="flex items-center gap-4 bg-muted/20 p-2 rounded-lg border">
                          <span className="text-xs font-mono text-muted-foreground w-6 text-center">{i+1}.</span>
                          <div className="w-10 h-10 bg-white rounded border flex items-center justify-center shrink-0 p-0.5">
                            <img src={item.img} alt="" className="max-w-full max-h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{item.title}</p>
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{item.asin}</p>
                          </div>
                          <div className="shrink-0">
                            {item.status === 'queued' && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded border">Queued</span>}
                            {item.status === 'processing' && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded">Processing</span>}
                            {item.status === 'success' && <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded">Success</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>

            </div>

            {/* Extension Connection Warning */}
            {!isExtensionConnected && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold">Extension Not Connected</h3>
                  <p className="text-sm mt-1">
                    The Bulk Lister requires the SellerSuit Chrome Extension to be active. If you just reloaded the extension, please <strong>refresh this page</strong> to reconnect.
                  </p>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="mb-4 rounded-md border overflow-hidden bg-muted/10">
              <div className="flex border-b bg-muted/30">
                <button onClick={() => setActiveTab('csv')} className={`flex-1 py-1.5 text-xs font-semibold ${activeTab === 'csv' ? 'bg-background text-foreground border-b-2 border-blue-600' : 'text-muted-foreground hover:text-foreground'}`}>Upload CSV</button>
                <button onClick={() => setActiveTab('paste')} className={`flex-1 py-1.5 text-xs font-semibold ${activeTab === 'paste' ? 'bg-background text-foreground border-b-2 border-blue-600' : 'text-muted-foreground hover:text-foreground'}`}>Paste Links</button>
              </div>
              <div className="p-3 bg-background">
                {activeTab === 'csv' ? (
                  <div className="border border-dashed rounded-md p-4 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-all cursor-pointer">
                    <FileText className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">Drop CSV or click to browse</span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <textarea 
                      value={pasteInput}
                      onChange={e => setPasteInput(e.target.value)}
                      placeholder="Paste Amazon URLs (one per line)..." 
                      className="flex-1 h-20 sm:h-16 bg-background border rounded-md p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                    ></textarea>
                    <Button onClick={handleAddLinks} disabled={!pasteInput.trim()} className="h-auto sm:h-16 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-[repeat(10,minmax(0,1fr))] md:grid-cols-[repeat(20,minmax(0,1fr))] gap-0.5 mb-4">
              {queue.length > 0 ? queue.slice(0, 100).map((item, idx) => {
                let bg = "bg-muted border border-border/50";
                let icon = null;
                if (item.status === 'success') {
                  bg = "bg-emerald-500 border border-emerald-600";
                  icon = <Check className="w-2 h-2 text-white" strokeWidth={3} />;
                } else if (item.status === 'processing') {
                  bg = "bg-blue-500 border border-blue-600";
                  icon = <RefreshCw className="w-2 h-2 text-white animate-spin" strokeWidth={3} />;
                } else if (item.status === 'failed') {
                  bg = "bg-red-500 border border-red-600";
                  icon = <XCircle className="w-2 h-2 text-white" strokeWidth={3} />;
                }
                return (
                  <div key={item.id} className={`aspect-square rounded-[2px] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${bg}`} title={`Item #${item.id} - ${item.status}`}>
                    {icon}
                  </div>
                );
              }) : (
                <div className="col-span-10 md:col-span-20 text-center text-xs text-muted-foreground py-4">
                  Add links to see queue grid
                </div>
              )}
            </div>

          </Card>

          {/* Failed Items Card */}
          <Card className="p-4 shadow-sm flex-1 flex flex-col">
            <div className="flex flex-wrap items-center justify-between mb-3 border-b pb-2 gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">Failed Items</h2>
                <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-red-200">{stats.failed}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-2">
              {failedItems.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No failed items.</div>
              ) : (
                failedItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-background border rounded-md p-2 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-white border rounded shrink-0 flex items-center justify-center">
                        <img src={item.img} alt="" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-xs text-foreground truncate">{item.title}</div>
                        <div className="flex gap-2 mt-0.5">
                          <span className="text-[9px] text-muted-foreground font-mono">{item.asin}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
