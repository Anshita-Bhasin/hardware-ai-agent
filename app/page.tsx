'use client';

import { ChangeEvent, CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight, Bot, Calculator, Check, ChevronDown, Download, Grid2X2, Heart,
  Layers3, List, Menu, MessageCircleMore, PackageCheck, RotateCcw, Search, Send,
  Share2, ShoppingBag, SlidersHorizontal, Sparkles, Upload, WandSparkles, X, ZoomIn,
} from 'lucide-react';
import { createQuote, products, Product, Surface } from '@/lib/catalog';

type ViewMode = 'list' | 'grid';
type Message = { role: 'assistant' | 'user'; text: string };
type AssistantApiResponse = { reply: string };
type LeadApiResponse = { leadId: string; whatsappHref: string };

const quickPrompts = [
  { label: 'Recommend for me', prompt: 'Recommend the best coordinated tiles for a warm, minimal living room.' },
  { label: 'Compare my options', prompt: 'Compare these options for looks, maintenance and value.' },
  { label: 'Calculate quantity', prompt: 'Calculate the smart BOQ including wastage and cartons.' },
  { label: 'Check availability', prompt: 'Check stock and suggest the closest available alternative.' },
];

function productTexture(product: Product, scale = 72): CSSProperties {
  const tile = `${scale}px`;
  const half = `${Math.max(24, scale / 2)}px`;

  if (product.pattern === 'linear') {
    return {
      backgroundColor: product.color,
      backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.28) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,.12) 1px, transparent 1px), linear-gradient(90deg, transparent 0 42%, ${product.accent}66 43% 47%, transparent 48%)`,
      backgroundSize: `${half} ${tile}, ${tile} ${tile}, ${tile} ${tile}`,
    };
  }
  if (product.pattern === 'marble') {
    return {
      backgroundColor: product.color,
      backgroundImage: `linear-gradient(115deg, transparent 0 35%, ${product.accent}70 36%, transparent 40%), linear-gradient(25deg, transparent 0 60%, ${product.accent}55 61%, transparent 65%), linear-gradient(90deg, rgba(0,0,0,.09) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,.08) 1px, transparent 1px)`,
      backgroundSize: `${scale * 2}px ${scale * 2}px, ${scale * 1.7}px ${scale * 1.7}px, ${tile} ${tile}, ${tile} ${tile}`,
    };
  }
  if (product.pattern === 'wood') {
    return {
      backgroundColor: product.color,
      backgroundImage: `linear-gradient(90deg, rgba(40,20,8,.25) 1px, transparent 1px), linear-gradient(12deg, transparent 0 38%, ${product.accent}55 39%, transparent 43%), linear-gradient(0deg, rgba(255,255,255,.15), rgba(0,0,0,.14))`,
      backgroundSize: `${Math.max(32, scale * 0.42)}px ${scale * 1.8}px, ${scale * 1.8}px ${scale * 1.8}px, 100% 100%`,
    };
  }
  return {
    backgroundColor: product.color,
    backgroundImage: `radial-gradient(circle at 25% 18%, rgba(255,255,255,.30), transparent 23%), radial-gradient(circle at 75% 68%, ${product.accent}55, transparent 26%), linear-gradient(90deg, rgba(0,0,0,.09) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,.08) 1px, transparent 1px)`,
    backgroundSize: `${tile} ${tile}, ${scale * 1.4}px ${scale * 1.4}px, ${tile} ${tile}, ${tile} ${tile}`,
  };
}

export default function Home() {
  const [selectedSurface, setSelectedSurface] = useState<Surface>('floors');
  const [selectedProductId, setSelectedProductId] = useState('betr670');
  const [floorProductId, setFloorProductId] = useState('betr670');
  const [wallProductId, setWallProductId] = useState('bruae543');
  const compareProductId = 'wood924';
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [split, setSplit] = useState(50);
  const [roomImage, setRoomImage] = useState('/room-luxury.png');
  const [area, setArea] = useState(42);
  const [wastage, setWastage] = useState(8);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: 'I matched this room with a warm stone floor and soft ivory wall tile. Both are matt, easy to maintain, and currently available. Want me to optimise for budget, durability, or a more premium look?' }]);
  const [lead, setLead] = useState({ name: '', phone: '', email: '', timeline: 'Within 1 month' });
  const [leadResult, setLeadResult] = useState<LeadApiResponse | null>(null);

  useEffect(() => {
    if (!window.matchMedia('(max-width: 640px)').matches) return;
    const frame = window.requestAnimationFrame(() => setAssistantOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const selectedProduct = products.find((product) => product.id === selectedProductId) || products[4];
  const floorProduct = products.find((product) => product.id === floorProductId) || products[4];
  const wallProduct = products.find((product) => product.id === wallProductId) || products[1];
  const compareProduct = products.find((product) => product.id === compareProductId && product.surface === selectedSurface)
    || products.find((product) => product.surface === selectedSurface && product.id !== selectedProduct.id)
    || products[5];
  const quote = useMemo(() => createQuote({ area, wastage, floorProductId, wallProductId }), [area, floorProductId, wallProductId, wastage]);
  const visibleProducts = products.filter((product) => {
    const haystack = `${product.brand} ${product.code} ${product.title} ${product.finish}`.toLowerCase();
    return product.surface === selectedSurface && haystack.includes(searchQuery.toLowerCase());
  });

  function selectProduct(product: Product) {
    setSelectedProductId(product.id);
    if (product.surface === 'floors') setFloorProductId(product.id);
    else setWallProductId(product.id);
  }

  function toggleFavorite(productId: string) {
    setFavorites((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setRoomImage(URL.createObjectURL(file));
  }

  async function askAgent(rawPrompt: string) {
    const prompt = rawPrompt.trim();
    if (!prompt || isThinking) return;
    setMessages((current) => [...current, { role: 'user', text: prompt }]);
    setChatInput('');
    setIsThinking(true);
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area, wastage, floorProductId, wallProductId, selectedProductId, compareProductId, prompt }),
      });
      const result = (await response.json()) as AssistantApiResponse;
      setMessages((current) => [...current, { role: 'assistant', text: result.reply }]);
    } catch {
      setMessages((current) => [...current, { role: 'assistant', text: 'I could not complete that just now. Your room and selections are still saved here.' }]);
    } finally { setIsThinking(false); }
  }

  async function handleChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await askAgent(chatInput);
  }

  async function shareDesign() {
    const text = `My RoomStyle design: ${floorProduct.code} floor + ${wallProduct.code} walls. Estimate QAR ${quote.total.toLocaleString()}.`;
    if (navigator.share) await navigator.share({ title: 'My room design', text });
    else setLeadOpen(true);
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lead, floorProductId, wallProductId, area, wastage, total: quote.total }),
    });
    setLeadResult((await response.json()) as LeadApiResponse);
  }

  function resetDesign() {
    setFloorProductId('betr670'); setWallProductId('bruae543'); setSelectedProductId('betr670'); setCompareMode(false); setZoom(100);
  }

  const roomStyle = { '--room-zoom': zoom / 100, '--compare-split': `${split}%` } as CSSProperties;

  return (
    <main className={`visualizer-shell ${assistantOpen ? 'assistant-active' : ''}`}>
      <aside className={`catalog-panel ${catalogOpen ? 'mobile-open' : ''}`}>
        <div className="catalog-brand">
          <div className="brand-mark"><Layers3 size={21} strokeWidth={2.2} /></div>
          <div><strong>ROOMSTYLE</strong><span>AI VISUALIZER</span></div>
          <button className="icon-button mobile-only" type="button" aria-label="Close catalog" onClick={() => setCatalogOpen(false)}><X size={19} /></button>
        </div>
        <div className="catalog-context"><span>Explore surfaces</span><button type="button">All rooms <ChevronDown size={14} /></button></div>
        <div className="catalog-tools">
          <label className="search-field"><Search size={17} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products" /></label>
          <button className="icon-button" type="button" aria-label="Filters" title="Filters"><SlidersHorizontal size={18} /></button>
          <div className="view-switch" aria-label="View mode">
            <button className={viewMode === 'list' ? 'active' : ''} type="button" aria-label="List view" onClick={() => setViewMode('list')}><List size={17} /></button>
            <button className={viewMode === 'grid' ? 'active' : ''} type="button" aria-label="Grid view" onClick={() => setViewMode('grid')}><Grid2X2 size={16} /></button>
          </div>
        </div>
        <div className="surface-switch"><button className={selectedSurface === 'floors' ? 'active' : ''} type="button" onClick={() => setSelectedSurface('floors')}>Floors</button><button className={selectedSurface === 'walls' ? 'active' : ''} type="button" onClick={() => setSelectedSurface('walls')}>Walls</button></div>
        <div className={`catalog-list ${viewMode}`}>
          {visibleProducts.map((product) => (
            <article className={selectedProduct.id === product.id ? 'product-card selected' : 'product-card'} key={product.id}>
              <button className="product-select" type="button" onClick={() => selectProduct(product)}>
                <span className="product-swatch" style={productTexture(product, 52)} />
                <span className="product-copy"><small>{product.brand}</small><strong>{product.title}</strong><span className="product-code">{product.code} · {product.size}</span><b>QAR {product.price.toFixed(2)} <em>/ m²</em></b><span className="stock"><i /> {product.stock > 50 ? 'In stock' : 'Low stock'} · {product.finish}</span></span>
              </button>
              <button className={favorites.includes(product.id) ? 'favorite active' : 'favorite'} type="button" aria-label="Add to favorites" onClick={() => toggleFavorite(product.id)}><Heart size={16} fill={favorites.includes(product.id) ? 'currentColor' : 'none'} /></button>
              {selectedProduct.id === product.id && <span className="selected-check"><Check size={13} /></span>}
            </article>
          ))}
        </div>
        <label className="upload-room" htmlFor="room-upload"><Upload size={18} /><span><strong>Upload your room</strong><small>JPG or PNG · best results in daylight</small></span></label>
        <input id="room-upload" className="hidden-file" type="file" accept="image/*" onChange={handleUpload} />
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-only" type="button" aria-label="Open catalog" onClick={() => setCatalogOpen(true)}><Menu size={20} /></button>
          <button className="back-button" type="button"><span>×</span> Exit</button>
          <nav className="topbar-actions" aria-label="Visualizer controls">
            <button type="button" aria-label="Reset" onClick={resetDesign}><RotateCcw size={17} /><span>Reset</span></button>
            <button className={compareMode ? 'active' : ''} type="button" aria-label="Compare" onClick={() => setCompareMode((value) => !value)}><ArrowLeftRight size={17} /><span>Compare</span></button>
            <button type="button" aria-label="Zoom" onClick={() => setZoom((value) => (value >= 115 ? 90 : value + 10))}><ZoomIn size={17} /><span>Zoom</span></button>
            <button type="button" aria-label="Share" onClick={shareDesign}><Share2 size={17} /><span>Share</span></button>
            <button type="button" aria-label="Download" onClick={() => window.print()}><Download size={17} /><span>Download</span></button>
            <label className="toolbar-upload" htmlFor="room-upload"><Upload size={17} /><span>Change room</span></label>
          </nav>
          <button className="quote-button" type="button" onClick={() => setQuoteOpen(true)}><ShoppingBag size={18} /> Get quote</button>
          <button className={assistantOpen ? 'assistant-toggle active' : 'assistant-toggle'} type="button" aria-label="AI assistant" onClick={() => setAssistantOpen((value) => !value)}><Bot size={18} /><span>AI assistant</span></button>
        </header>

        <div className="viewer">
          <div className="room-stage" style={roomStyle}>
            <div className="room-photo" style={{ backgroundImage: `url(${roomImage})` }} />
            <div className="wall-surface" style={productTexture(wallProduct, 86)} />
            <div className="floor-surface" style={productTexture(floorProduct, 112)} />
            {compareMode && <div className={`compare-surface ${selectedSurface}`} style={productTexture(compareProduct, selectedSurface === 'floors' ? 112 : 86)} />}
            {compareMode && <div className="compare-divider" style={{ left: `${split}%` }}><ArrowLeftRight size={15} /></div>}
            {compareMode && <input className="compare-slider" aria-label="Comparison split" type="range" min={25} max={75} value={split} onChange={(event) => setSplit(Number(event.target.value))} />}
            <div className="scene-status"><span><WandSparkles size={15} /> AI surfaces mapped</span><strong>Living + dining room</strong></div>
            <button className="surface-pin wall-pin" type="button" onClick={() => setSelectedSurface('walls')}><span style={productTexture(wallProduct, 20)} />Walls <Check size={13} /></button>
            <button className="surface-pin floor-pin" type="button" onClick={() => setSelectedSurface('floors')}><span style={productTexture(floorProduct, 20)} />Floors <Check size={13} /></button>
            <div className="stage-controls"><button className="icon-button" type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(85, value - 5))}>−</button><span>{zoom}%</span><button className="icon-button" type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(125, value + 5))}>+</button></div>
          </div>
        </div>

        <footer className="selection-dock">
          <div className="selected-materials"><span className="dock-swatch" style={productTexture(selectedProduct, 36)} /><div><small>Selected {selectedProduct.surface.slice(0, -1)}</small><strong>{selectedProduct.title}</strong><span>{selectedProduct.code} · QAR {selectedProduct.price.toFixed(2)}/m²</span></div></div>
          <label><span>Room area</span><div><input type="number" min={5} value={area} onChange={(event) => setArea(Number(event.target.value) || 0)} /><b>m²</b></div></label>
          <label><span>Wastage</span><div><input type="number" min={0} max={20} value={wastage} onChange={(event) => setWastage(Number(event.target.value) || 0)} /><b>%</b></div></label>
          <div className="live-total"><small>Live estimate</small><strong>QAR {quote.total.toLocaleString()}</strong><span>Materials + installation</span></div>
          <button className="dock-cta" type="button" onClick={() => setQuoteOpen(true)}><Calculator size={18} /> View quotation</button>
        </footer>
      </section>

      {assistantOpen && (
        <aside className="assistant-panel">
          <div className="assistant-head"><div className="assistant-avatar"><Sparkles size={20} /></div><div><strong>RoomStyle AI</strong><span><i /> Online · Design & sales advisor</span></div><button className="icon-button" type="button" aria-label="Close assistant" onClick={() => setAssistantOpen(false)}><X size={18} /></button></div>
          <div className="journey-steps"><span className="done"><Check size={12} /> Style</span><i /><span className="done"><Check size={12} /> Products</span><i /><span>Quote</span></div>
          <div className="recommendation-card">
            <div className="recommendation-kicker"><Sparkles size={15} /> Best match for this room <b>94%</b></div>
            <div className="recommendation-title"><div className="swatch-pair"><span style={productTexture(floorProduct, 28)} /><span style={productTexture(wallProduct, 28)} /></div><div><strong>Warm modern palette</strong><span>{floorProduct.code} + {wallProduct.code}</span></div></div>
            <p>Balanced warmth, low-glare matt finish, and both selections fit your current budget range.</p>
            <div className="reason-chips"><span>Easy care</span><span>In stock</span><span>Coordinated</span></div>
          </div>
          <div className="chat-feed">{messages.map((message, index) => <div className={message.role} key={`${message.role}-${index}`}>{message.text}</div>)}{isThinking && <div className="assistant thinking"><span /><span /><span /></div>}</div>
          <div className="quick-actions">
            {quickPrompts.map((item, index) => { const Icon = [Sparkles, ArrowLeftRight, Calculator, PackageCheck][index]; return <button type="button" key={item.label} onClick={() => askAgent(item.prompt)}><Icon size={17} /><span>{item.label}</span></button>; })}
          </div>
          <form className="assistant-form" onSubmit={handleChat}><MessageCircleMore size={18} /><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about style, price or products..." /><button type="submit" aria-label="Send message"><Send size={17} /></button></form>
          <div className="assistant-conversion"><div><strong>Ready to see the exact price?</strong><span>Keep this design and send it to a specialist.</span></div><button type="button" onClick={() => setLeadOpen(true)}>Get my quote <span>→</span></button></div>
        </aside>
      )}

      {quoteOpen && (
        <div className="modal-layer" role="presentation" onMouseDown={() => setQuoteOpen(false)}>
          <section className="quote-modal" role="dialog" aria-modal="true" aria-label="Quotation" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><small>Instant quotation</small><h2>Your room, priced</h2></div><button className="icon-button" type="button" aria-label="Close quote" onClick={() => setQuoteOpen(false)}><X size={20} /></button></div>
            <div className="quote-products">{[floorProduct, wallProduct].map((product) => <div key={product.id}><span style={productTexture(product, 34)} /><p><small>{product.surface.slice(0, -1)}</small><strong>{product.title}</strong><em>{product.code}</em></p><b>QAR {product.price.toFixed(2)}/m²</b></div>)}</div>
            <dl className="quote-lines"><div><dt>Floor material · {quote.cartons.floors} cartons</dt><dd>QAR {quote.floorCost.toLocaleString()}</dd></div><div><dt>Wall material · {quote.cartons.walls} cartons</dt><dd>QAR {quote.wallCost.toLocaleString()}</dd></div><div><dt>Adhesive, grout and trims</dt><dd>QAR {(quote.adhesive + quote.grout + quote.trims).toLocaleString()}</dd></div><div><dt>Estimated installation</dt><dd>QAR {quote.installation.toLocaleString()}</dd></div></dl>
            <div className="quote-summary"><span><small>Total estimate</small><strong>QAR {quote.total.toLocaleString()}</strong></span><em>Includes {wastage}% wastage · {area} m² room</em></div>
            <button className="primary-cta" type="button" onClick={() => { setQuoteOpen(false); setLeadOpen(true); }}>Send me this quote <Send size={17} /></button>
          </section>
        </div>
      )}

      {leadOpen && (
        <div className="modal-layer" role="presentation" onMouseDown={() => setLeadOpen(false)}>
          <section className="lead-modal" role="dialog" aria-modal="true" aria-label="Get your quote" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><small>Your design is saved</small><h2>Get the exact quote</h2></div><button className="icon-button" type="button" aria-label="Close form" onClick={() => setLeadOpen(false)}><X size={20} /></button></div>
            {leadResult ? <div className="lead-success"><span><Check size={28} /></span><h3>We have your design</h3><p>Your reference is <strong>{leadResult.leadId}</strong>. Continue on WhatsApp with the room, products and estimate already included.</p><a className="primary-cta" href={leadResult.whatsappHref} target="_blank" rel="noreferrer">Continue on WhatsApp <Send size={17} /></a></div> :
              <form className="lead-form" onSubmit={submitLead}><p>A tile specialist will review availability, final measurements and project pricing.</p><label><span>Name</span><input required value={lead.name} onChange={(event) => setLead({ ...lead, name: event.target.value })} placeholder="Your name" /></label><label><span>Mobile number</span><input required type="tel" value={lead.phone} onChange={(event) => setLead({ ...lead, phone: event.target.value })} placeholder="+974" /></label><label><span>Email <em>optional</em></span><input type="email" value={lead.email} onChange={(event) => setLead({ ...lead, email: event.target.value })} placeholder="you@example.com" /></label><label><span>Project timeline</span><select value={lead.timeline} onChange={(event) => setLead({ ...lead, timeline: event.target.value })}><option>Within 1 month</option><option>1-3 months</option><option>3-6 months</option><option>Just exploring</option></select></label><button className="primary-cta" type="submit">Get my design + quote <Send size={17} /></button><small className="privacy-note">Your details are used only to follow up on this design request.</small></form>}
          </section>
        </div>
      )}
    </main>
  );
}
