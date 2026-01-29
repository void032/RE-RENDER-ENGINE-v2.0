
import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { StyleFidelity, ImageState, RefMetadata, AspectRatio } from './types';
import * as geminiService from './services/geminiService';

const App: React.FC = () => {
  const [refImage, setRefImage] = useState<ImageState>({ url: null, base64: null, mimeType: null });
  const [userImage, setUserImage] = useState<ImageState>({ url: null, base64: null, mimeType: null });
  const [resultImage, setResultImage] = useState<ImageState>({ url: null, base64: null, mimeType: null });
  
  const [fidelity, setFidelity] = useState<StyleFidelity>(StyleFidelity.REALISTIC);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('AUTO');
  const [isDecoding, setIsDecoding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [metadata, setMetadata] = useState<RefMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Auto-detect aspect ratio if set to AUTO
  useEffect(() => {
    if (aspectRatio === 'AUTO' && refImage.url) {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        if (ratio > 1.2) setAspectRatio('16:9');
        else if (ratio < 0.8) setAspectRatio('9:16');
        else setAspectRatio('1:1');
      };
      img.src = refImage.url;
    }
  }, [refImage.url, aspectRatio]);

  useEffect(() => {
    if (refImage.base64) {
      const decode = async () => {
        setIsDecoding(true);
        setError(null);
        try {
          const data = await geminiService.decodeReferenceImage(refImage.base64!);
          setMetadata(data);
        } catch (err: any) {
          setError("Engine: Decoding failed. Check connection.");
        } finally {
          setIsDecoding(false);
        }
      };
      decode();
    } else {
      setMetadata(null);
    }
  }, [refImage.base64]);

  const handleMimic = async () => {
    if (!refImage.base64 || !userImage.base64) {
      setError("Input Error: Missing image data.");
      return;
    }

    if (!metadata) {
      setError("Engine: Waiting for prompt reconstruction...");
      return;
    }

    setError(null);
    setIsGenerating(true);
    try {
      const generatedUrl = await geminiService.mimicStyle(
        refImage.base64,
        userImage.base64,
        metadata,
        fidelity,
        aspectRatio
      );
      setResultImage({
        url: generatedUrl,
        base64: generatedUrl.split(',')[1],
        mimeType: 'image/png'
      });
    } catch (err: any) {
      setError(err.message || "Render Error: Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = async () => {
    if (!resultImage.base64 || !editPrompt) return;
    setIsEditing(true);
    setError(null);
    try {
      const editedUrl = await geminiService.editGeneratedImage(resultImage.base64, editPrompt);
      setResultImage({
        url: editedUrl,
        base64: editedUrl.split(',')[1],
        mimeType: 'image/png'
      });
      setEditPrompt("");
    } catch (err: any) {
      setError(err.message || "Edit failed.");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] pb-12 text-zinc-300">
      {/* Header */}
      <nav className="sticky top-0 z-50 px-6 py-4 glass border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <i className="fa-solid fa-bolt-lightning text-white text-lg animate-pulse"></i>
          </div>
          <div>
            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500 tracking-tighter">
              RE-RENDER <span className="text-indigo-500">ENGINE v2.0</span>
            </h1>
            <p className="text-[8px] font-mono tracking-[0.2em] text-zinc-600">REVERSE-ENGINEERING ACTIVE</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="hidden md:flex gap-4 px-4 py-2 bg-black/40 border border-white/5 rounded-full">
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></div>
              API STABLE
            </div>
          </div>
          <button 
            onClick={() => {
              setRefImage({ url: null, base64: null, mimeType: null });
              setUserImage({ url: null, base64: null, mimeType: null });
              setResultImage({ url: null, base64: null, mimeType: null });
              setMetadata(null);
              setError(null);
            }}
            className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full text-zinc-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-white/5"
          >
            Reset
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Data & Dashboard */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="glass rounded-3xl p-6 flex flex-col gap-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
              <i className="fa-solid fa-microchip text-indigo-400"></i>
              Input Matrix
            </h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <ImageUploader 
                label="Reference Style" 
                icon="fa-solid fa-camera-retro"
                image={refImage.url}
                onImageSelect={(b64, mime) => setRefImage({ url: `data:${mime};base64,${b64}`, base64: b64, mimeType: mime })}
              />
              <ImageUploader 
                label="User Subject" 
                icon="fa-solid fa-user-astronaut"
                image={userImage.url}
                onImageSelect={(b64, mime) => setUserImage({ url: `data:${mime};base64,${b64}`, base64: b64, mimeType: mime })}
              />
            </div>
          </section>

          {/* Prompt Decoder Dashboard */}
          <section className={`glass rounded-3xl p-6 transition-all duration-500 ${!refImage.url && 'opacity-30'}`}>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center justify-between mb-6">
              <span className="flex items-center gap-2">
                <i className="fa-solid fa-code-merge text-emerald-400"></i>
                Visual DNA Extraction
              </span>
              {isDecoding && <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>}
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Medium', val: metadata?.artStyle, icon: 'fa-paintbrush' },
                { label: 'Pose/Gesture', val: metadata?.poseAndGestures, icon: 'fa-hand-sparkles' },
                { label: 'Occlusions', val: metadata?.composition, icon: 'fa-layer-group', span: true },
                { label: 'Environment', val: metadata?.backgroundElements, icon: 'fa-mountain-sun', span: true }
              ].map((item, idx) => (
                <div key={idx} className={`bg-black/60 rounded-xl p-3 border border-white/5 ${item.span ? 'col-span-2' : ''}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <i className={`fa-solid ${item.icon} text-[8px] text-zinc-700`}></i>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">{item.label}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-tight italic line-clamp-2">
                    {isDecoding ? <div className="h-2 w-full bg-zinc-800 animate-pulse rounded mt-1"></div> : item.val || 'Initializing...'}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Engine Controls */}
          <section className="glass rounded-3xl p-6 flex flex-col gap-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
              <i className="fa-solid fa-sliders text-purple-400"></i>
              Engine Params
            </h2>
            
            <div className="space-y-4">
              {/* Aspect Ratio */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-zinc-600 uppercase">Output Dimensions</label>
                <select 
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                >
                  <option value="AUTO">AUTO (Matches Source)</option>
                  <option value="1:1">Square (1:1)</option>
                  <option value="9:16">Portrait (9:16)</option>
                  <option value="3:4">Standard Poster (3:4)</option>
                  <option value="16:9">Widescreen (16:9)</option>
                </select>
              </div>

              {/* Fidelity Selector */}
              <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                {Object.values(StyleFidelity).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFidelity(f)}
                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all
                      ${fidelity === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}
                    `}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleMimic}
              disabled={isGenerating || isDecoding || !refImage.base64 || !userImage.base64}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all group
                ${isGenerating 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                  : 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 hover:scale-[1.02] text-white shadow-xl shadow-indigo-500/10 active:scale-95'}
              `}
            >
              {isGenerating ? (
                <>
                  <i className="fa-solid fa-atom fa-spin"></i>
                  Rendering...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles group-hover:rotate-12 transition-transform"></i>
                  Run Re-Render Engine
                </>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-900/40 rounded-xl text-red-500 text-[10px] font-bold text-center flex items-center gap-2 justify-center italic">
                <i className="fa-solid fa-triangle-exclamation"></i> {error}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Master Output */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <section className="glass rounded-[3rem] p-10 min-h-[650px] flex flex-col gap-8 relative overflow-hidden shadow-2xl">
            {/* Visual Flair */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] -ml-32 -mb-32"></div>

            <div className="flex justify-between items-end relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[8px] font-black rounded border border-indigo-500/20 uppercase">Stage: Final Render</div>
                  {isGenerating && <div className="text-[8px] font-mono text-indigo-500/60 animate-pulse uppercase tracking-widest">Synthesizing occlusion masks...</div>}
                </div>
                <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">MASTER_FRAME_01</h2>
              </div>
              {resultImage.url && (
                <div className="flex gap-2">
                  <a 
                    href={resultImage.url} 
                    download="mimic-render-v2.png"
                    className="text-[10px] font-black uppercase tracking-widest bg-zinc-800/80 hover:bg-zinc-700 px-6 py-3 rounded-full flex items-center gap-2 transition-all border border-white/5"
                  >
                    <i className="fa-solid fa-download"></i> Save Frame
                  </a>
                </div>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center relative z-10">
              {!resultImage.url && !isGenerating ? (
                <div className="text-center space-y-6 opacity-40">
                  <div className="relative inline-block">
                    <i className="fa-solid fa-compass-drafting text-9xl text-zinc-800"></i>
                    <i className="fa-solid fa-sparkles absolute top-0 right-0 text-3xl animate-pulse text-indigo-500/40"></i>
                  </div>
                  <div>
                    <p className="text-xl font-black text-zinc-600 uppercase tracking-widest italic">Engine Idle</p>
                    <p className="text-[10px] text-zinc-700 max-w-xs mx-auto leading-relaxed">System ready. Awaiting visual DNA from reference source for reverse-prompt engineering.</p>
                  </div>
                </div>
              ) : isGenerating ? (
                <div className="w-full h-full max-w-lg aspect-square rounded-[2rem] overflow-hidden shimmer flex items-center justify-center relative border border-white/5 shadow-2xl bg-zinc-900/50">
                  <div className="flex flex-col items-center gap-6 text-indigo-500 z-10">
                    <div className="relative">
                       <i className="fa-solid fa-atom fa-spin text-7xl opacity-50"></i>
                       <i className="fa-solid fa-brain absolute inset-0 flex items-center justify-center text-2xl animate-pulse text-white"></i>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Reconstructing Occlusions</p>
                      <p className="text-[9px] text-zinc-500 italic font-mono uppercase tracking-widest">Mapping: {metadata?.composition.substring(0, 30)}...</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative group max-w-xl w-full">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2.2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                  <img 
                    src={resultImage.url!} 
                    alt="Result" 
                    className="w-full h-auto rounded-[2rem] shadow-2xl border border-white/10 relative z-10" 
                  />
                  <div className="absolute top-6 left-6 z-20 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Render Optimized</span>
                  </div>
                  <div className="absolute bottom-6 right-6 z-20 text-[10px] font-mono text-white/30 bg-black/40 backdrop-blur-md px-3 py-1 rounded border border-white/5">
                    FIDELITY: {fidelity.toUpperCase()} | RATIO: {aspectRatio}
                  </div>
                </div>
              )}
            </div>

            {/* AI Refiner */}
            {resultImage.url && (
              <div className="bg-black/60 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 flex flex-col gap-4 relative z-10">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                  <i className="fa-solid fa-wand-magic text-indigo-500"></i>
                  Post-Process Refinement
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="E.g., 'Change background to cyberpunk city' or 'Add cinematic lens flare'..."
                    className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-indigo-500/40 transition-all text-white placeholder:text-zinc-700"
                  />
                  <button
                    onClick={handleEdit}
                    disabled={isEditing || !editPrompt}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    {isEditing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                    Apply
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Metadata Comparison Bar */}
          <section className="grid grid-cols-3 gap-6 h-40">
             {[
               { img: refImage.url, label: 'STYLE_SEED', icon: 'fa-cube' },
               { img: userImage.url, label: 'SUBJECT_ID', icon: 'fa-id-card' },
               { img: resultImage.url, label: 'GENERATED_FRAME', icon: 'fa-award', highlight: true }
             ].map((slot, i) => (
               <div key={i} className={`glass rounded-[1.5rem] overflow-hidden relative group transition-all hover:-translate-y-1 duration-500 ${slot.highlight && 'border border-indigo-500/30 shadow-xl'}`}>
                 {slot.img ? (
                   <img src={slot.img} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                 ) : (
                   <div className="w-full h-full bg-zinc-900/30 flex items-center justify-center text-zinc-800/40 border border-white/5"><i className={`fa-solid ${slot.icon} text-2xl`}></i></div>
                 )}
                 <div className={`absolute bottom-0 inset-x-0 py-2 text-[9px] text-center font-black tracking-[0.2em] ${slot.highlight ? 'bg-indigo-600 text-white' : 'bg-black/80 text-zinc-500'}`}>
                   {slot.label}
                 </div>
               </div>
             ))}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center py-8 opacity-20 hover:opacity-100 transition-opacity">
        <p className="text-zinc-600 text-[9px] uppercase font-black tracking-[0.5em]">
          RE-RENDER ENGINE v2.0 &bull; NEURAL RECONSTRUCTION MODULE ACTIVE &bull; GEMINI INFRASTRUCTURE
        </p>
      </footer>
    </div>
  );
};

export default App;
