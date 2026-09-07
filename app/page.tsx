'use client';

import { CSSProperties, ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { capabilities, createQuote, products, Product, Surface } from '@/lib/catalog';

type ViewMode = 'list' | 'grid';
type VisualizerApiResponse = {
  quote: { total: number };
  roomvo: { surfaces: unknown[] };
};
type AssistantApiResponse = {
  reply: string;
};

const menuItems = [
  'Tiles & Slab',
  'Bathroom',
  'Kitchen',
  'Brands',
  'E-Catalogues',
  'Design Services',
  'Partner Program',
  'Contact us',
  'Visualizer',
];

const featureActions = [
  'Compare',
  'Zoom',
  'Share',
  'Download',
  'Change Room',
  'View Cart',
  'Go to product page',
];

const filterChips = [
  'Wall Tiles',
  'Floor Tiles',
  'Porcelain',
  'Ceramic',
  'Concrete',
  'Mosaics',
  'Matt',
  'Glossy',
  'Polished',
  '60X60CM',
  '60X120CM',
  '120X120CM',
  'Indoor',
  'Outdoor',
];

function productTexture(product: Product, scale = 76): CSSProperties {
  const tile = `${scale}px`;
  const half = `${Math.max(28, scale / 2)}px`;

  if (product.pattern === 'linear') {
    return {
      backgroundColor: product.color,
      backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.32) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,.12) 1px, transparent 1px), linear-gradient(90deg, transparent 0 40%, ${product.accent}66 41% 46%, transparent 47%)`,
      backgroundSize: `${half} ${tile}, ${tile} ${tile}, ${tile} ${tile}`,
    };
  }

  if (product.pattern === 'marble') {
    return {
      backgroundColor: product.color,
      backgroundImage: `linear-gradient(115deg, transparent 0 34%, ${product.accent}7a 35%, transparent 39% 100%), linear-gradient(25deg, transparent 0 59%, ${product.accent}60 60%, transparent 63% 100%), linear-gradient(90deg, rgba(0,0,0,.10) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,.08) 1px, transparent 1px)`,
      backgroundSize: `${scale * 2}px ${scale * 2}px, ${scale * 1.6}px ${scale * 1.6}px, ${tile} ${tile}, ${tile} ${tile}`,
    };
  }

  if (product.pattern === 'wood') {
    return {
      backgroundColor: product.color,
      backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.18) 1px, transparent 1px), linear-gradient(15deg, transparent 0 38%, ${product.accent}60 39%, transparent 43% 100%), linear-gradient(0deg, rgba(255,255,255,.18), rgba(0,0,0,.18))`,
      backgroundSize: `${Math.max(34, scale * 0.42)}px ${scale * 1.65}px, ${scale * 1.8}px ${scale * 1.8}px, 100% 100%`,
    };
  }

  if (product.pattern === 'mosaic') {
    return {
      backgroundColor: product.color,
      backgroundImage: `linear-gradient(${product.accent}80 1px, transparent 1px), linear-gradient(90deg, ${product.accent}80 1px, transparent 1px), radial-gradient(circle at 25% 25%, rgba(255,255,255,.3), transparent 24%)`,
      backgroundSize: `${half} ${half}, ${half} ${half}, ${tile} ${tile}`,
    };
  }

  return {
    backgroundColor: product.color,
    backgroundImage: `radial-gradient(circle at 25% 18%, rgba(255,255,255,.28), transparent 22%), radial-gradient(circle at 75% 68%, ${product.accent}66, transparent 24%), linear-gradient(90deg, rgba(0,0,0,.10) 1px, transparent 1px), linear-gradient(0deg, rgba(0,0,0,.08) 1px, transparent 1px)`,
    backgroundSize: `${tile} ${tile}, ${scale * 1.4}px ${scale * 1.4}px, ${tile} ${tile}, ${tile} ${tile}`,
  };
}

export default function Home() {
  const [selectedSurface, setSelectedSurface] = useState<Surface>('walls');
  const [selectedProductId, setSelectedProductId] = useState('bruae543');
  const [floorProductId, setFloorProductId] = useState('betr670');
  const [wallProductId, setWallProductId] = useState('bruae543');
  const [compareProductId, setCompareProductId] = useState('mar280');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [agentMode, setAgentMode] = useState('concept');
  const [compareMode, setCompareMode] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [split, setSplit] = useState(50);
  const [tileScale, setTileScale] = useState(76);
  const [wallOpacity, setWallOpacity] = useState(88);
  const [floorOpacity, setFloorOpacity] = useState(84);
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [area, setArea] = useState(1200);
  const [wastage, setWastage] = useState(8);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Ask me for quantity, finish recommendation, stock check, or a quotation for the selected room design.',
    },
  ]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) || products[0];
  const floorProduct = products.find((product) => product.id === floorProductId) || products[4];
  const wallProduct = products.find((product) => product.id === wallProductId) || products[1];
  const compareProduct = products.find((product) => product.id === compareProductId) || products[0];

  const visibleProducts = products.filter((product) => product.surface === selectedSurface);

  const quote = useMemo(() => {
    return createQuote({ area, wastage, floorProductId, wallProductId });
  }, [area, floorProductId, wallProductId, wastage]);

  function selectProduct(product: Product) {
    setSelectedProductId(product.id);
    setSelectedSurface(product.surface);
    if (product.surface === 'floors') {
      setFloorProductId(product.id);
    } else {
      setWallProductId(product.id);
    }
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRoomImage(URL.createObjectURL(file));
  }

  function handleCommand(action: string) {
    if (action === 'Compare') setCompareMode((value) => !value);
    if (action === 'Zoom') setZoom((value) => (value === 100 ? 118 : 100));
    if (action === 'Change Room') document.getElementById('room-upload')?.click();
    if (action === 'View Cart') setQuoteOpen(true);
    if (action === 'Go to product page') setQuoteOpen(true);
    if (action === 'Download') window.print();
    if (action === 'Share') {
      setAssistantOpen(true);
      setChatInput('Share this selected design with quotation');
    }
  }

  function addToCart() {
    setQuoteOpen(true);
    setMessages((current) => [
      ...current,
      {
        role: 'assistant',
        text: `${selectedProduct.code} added to quote cart. Current estimate is QAR ${quote.total.toLocaleString()}.`,
      },
    ]);
  }

  async function refreshVisualizer() {
    const response = await fetch('/api/visualizer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area,
        wastage,
        floorProductId,
        wallProductId,
        selectedProductId,
        compareProductId,
      }),
    });
    const result = (await response.json()) as VisualizerApiResponse;
    setMessages((current) => [
      ...current,
      {
        role: 'assistant',
        text: `Visualizer payload prepared for ${result.roomvo.surfaces.length} surfaces. BOQ total is QAR ${result.quote.total.toLocaleString()}.`,
      },
    ]);
  }

  async function handleChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    setMessages((current) => [
      ...current,
      { role: 'user', text },
    ]);
    setChatInput('');

    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area,
        wastage,
        floorProductId,
        wallProductId,
        selectedProductId,
        compareProductId,
        prompt: text,
      }),
    });
    const result = (await response.json()) as AssistantApiResponse;
    setMessages((current) => [...current, { role: 'assistant', text: result.reply }]);
  }

  const visualizerStyle = {
    '--zoom': zoom / 100,
    '--tile-scale': `${tileScale}px`,
    '--wall-opacity': wallOpacity / 100,
    '--floor-opacity': floorOpacity / 100,
  } as CSSProperties;

  return (
    <main className="enterprise-shell">
      <aside className="product-rail">
        <div className="brand-block">
          <div className="mark">RS</div>
          <div>
            <strong>ROOMSTYLE</strong>
            <span>VISUALIZER</span>
          </div>
          <button aria-label="Favorite showroom" type="button">♡</button>
        </div>

        <div className="rail-menu">
          {menuItems.map((item) => (
            <button key={item} className={item === 'Visualizer' ? 'active' : ''} type="button">
              {item}
            </button>
          ))}
        </div>

        <div className="product-search">
          <button aria-label="Search" type="button">⌕</button>
          <button type="button" onClick={() => setFiltersOpen((value) => !value)}>Filters</button>
          <button
            className={viewMode === 'list' ? 'active' : ''}
            aria-label="List view"
            type="button"
            onClick={() => setViewMode('list')}
          >
            ☰
          </button>
          <button
            className={viewMode === 'grid' ? 'active' : ''}
            aria-label="Grid view"
            type="button"
            onClick={() => setViewMode('grid')}
          >
            ▦
          </button>
        </div>

        {filtersOpen && (
          <div className="filter-panel">
            {filterChips.map((chip) => (
              <button key={chip} type="button">{chip}</button>
            ))}
          </div>
        )}

        <div className="surface-tabs">
          <button
            className={selectedSurface === 'walls' ? 'active' : ''}
            type="button"
            onClick={() => setSelectedSurface('walls')}
          >
            Walls
          </button>
          <button
            className={selectedSurface === 'floors' ? 'active' : ''}
            type="button"
            onClick={() => setSelectedSurface('floors')}
          >
            Floors
          </button>
        </div>

        <div className={`product-list ${viewMode}`}>
          {visibleProducts.map((product) => (
            <button
              className={selectedProduct.id === product.id ? 'product-card active' : 'product-card'}
              key={product.id}
              type="button"
              onClick={() => selectProduct(product)}
            >
              <span className="product-swatch" style={productTexture(product, 58)} />
              <span className="product-meta">
                <small>{product.brand}</small>
                <strong>{product.code}</strong>
                <em>QAR {product.price.toFixed(2)} / m²</em>
                <span>Size: {product.size}</span>
                <span>{product.material} · {product.finish}</span>
              </span>
              <span className="heart">♥</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="visualizer-app">
        <header className="command-bar">
          <button type="button" className="exit-button">× Exit</button>
          <div className="command-actions">
            {featureActions.map((action) => (
              <button key={action} type="button" onClick={() => handleCommand(action)}>
                {action}
              </button>
            ))}
            <button className="cart-button" type="button" onClick={addToCart}>Add to Cart</button>
            <button type="button" onClick={() => setAssistantOpen((value) => !value)}>Menu ⋮</button>
          </div>
        </header>

        <div className="visualizer-canvas">
          <div className="room-viewport" style={visualizerStyle}>
            <div className="room-image" style={roomImage ? { backgroundImage: `url(${roomImage})` } : undefined}>
              {!roomImage && <EnterpriseRoom />}
              <div className="wall-application" style={productTexture(wallProduct, tileScale)} />
              <div className="floor-application" style={productTexture(floorProduct, tileScale)} />
              {compareMode && (
                <div
                  className={compareProduct.surface === 'walls' ? 'wall-application compare-application' : 'floor-application compare-application'}
                  style={{
                    ...productTexture(compareProduct, tileScale),
                    clipPath:
                      compareProduct.surface === 'walls'
                        ? `polygon(${split}% 0, 100% 0, 100% 63%, ${split}% 63%)`
                        : `polygon(${split}% 60%, 100% 45%, 100% 100%, ${split}% 100%)`,
                  }}
                />
              )}
              {!roomImage && <EnterpriseObjects />}
              {compareMode && <div className="compare-divider" style={{ left: `${split}%` }} />}
              <button className="surface-pill walls" type="button" onClick={() => setSelectedSurface('walls')}>
                Walls ✓
              </button>
              <button className="surface-pill floors" type="button" onClick={() => setSelectedSurface('floors')}>
                Floors
              </button>
            </div>
          </div>

          <div className="roomvo-badge">Powered by <strong>roomvo-style</strong></div>

          <div className="bottom-tray">
            <div className="tray-product">
              <span className="product-swatch small" style={productTexture(selectedProduct, 44)} />
              <div>
                <small>{selectedProduct.brand}</small>
                <strong>{selectedProduct.code}</strong>
              </div>
              <b>QAR {selectedProduct.price.toFixed(2)} / m²</b>
            </div>

            <label>
              Area
              <input value={area} min={50} type="number" onChange={(event) => setArea(Number(event.target.value) || 0)} />
            </label>
            <label>
              Wastage
              <input value={wastage} min={0} max={20} type="number" onChange={(event) => setWastage(Number(event.target.value) || 0)} />
            </label>
            <button type="button" onClick={() => setQuoteOpen((value) => !value)}>Quotation</button>
            <button type="button" onClick={refreshVisualizer}>Sync Roomvo</button>
            <button type="button" onClick={() => setAssistantOpen((value) => !value)}>Assistant</button>
          </div>

          <div className="calibration-strip">
            <label>Zoom <input type="range" min={85} max={130} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
            <label>Tile scale <input type="range" min={36} max={122} value={tileScale} onChange={(event) => setTileScale(Number(event.target.value))} /></label>
            <label>Wall finish <input type="range" min={50} max={100} value={wallOpacity} onChange={(event) => setWallOpacity(Number(event.target.value))} /></label>
            <label>Floor finish <input type="range" min={50} max={100} value={floorOpacity} onChange={(event) => setFloorOpacity(Number(event.target.value))} /></label>
            <label>Compare split <input type="range" min={25} max={75} value={split} onChange={(event) => setSplit(Number(event.target.value))} /></label>
            <label>
              Compare product
              <select value={compareProductId} onChange={(event) => setCompareProductId(event.target.value)}>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="upload-inline" htmlFor="room-upload">Upload room</label>
            <input id="room-upload" type="file" accept="image/*" onChange={handleUpload} />
          </div>
        </div>
      </section>

      {quoteOpen && (
        <aside className="quote-drawer">
          <div className="drawer-head">
            <div>
              <small>Enterprise quote</small>
              <strong>Selected design estimate</strong>
            </div>
            <button type="button" onClick={() => setQuoteOpen(false)}>×</button>
          </div>
          <dl>
            <div><dt>Floor product</dt><dd>{floorProduct.code}</dd></div>
            <div><dt>Wall product</dt><dd>{wallProduct.code}</dd></div>
            <div><dt>Area</dt><dd>{area.toLocaleString()} sq ft</dd></div>
            <div><dt>Floor material</dt><dd>QAR {quote.floorCost.toLocaleString()}</dd></div>
            <div><dt>Wall material</dt><dd>QAR {quote.wallCost.toLocaleString()}</dd></div>
            <div><dt>Adhesive / grout</dt><dd>QAR {quote.adhesive.toLocaleString()}</dd></div>
            <div><dt>Cartons</dt><dd>{quote.cartons.floors} floor / {quote.cartons.walls} wall</dd></div>
            <div><dt>Installation</dt><dd>QAR {quote.installation.toLocaleString()}</dd></div>
          </dl>
          <div className="quote-total">
            <span>Total estimate</span>
            <strong>QAR {quote.total.toLocaleString()}</strong>
          </div>
          <button className="primary-action" type="button" onClick={() => setAssistantOpen(true)}>
            Generate client quote
          </button>
        </aside>
      )}

      {assistantOpen && (
        <aside className="assistant-drawer">
          <div className="drawer-head">
            <div>
              <small>AI sales assistant</small>
              <strong>Design + quote support</strong>
            </div>
            <button type="button" onClick={() => setAssistantOpen(false)}>×</button>
          </div>
          <div className="quick-prompts">
            {['Check stock', 'Recommend finish', 'Smart BOQ', 'Compare options', 'Share on WhatsApp'].map((prompt) => (
              <button key={prompt} type="button" onClick={() => setChatInput(prompt)}>{prompt}</button>
            ))}
          </div>
          <div className="capability-grid">
            {capabilities.map((capability, index) => (
              <button
                className={agentMode === capability.id ? 'active' : ''}
                key={capability.id}
                type="button"
                onClick={() => {
                  setAgentMode(capability.id);
                  setChatInput(capability.title);
                }}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{capability.title}</strong>
                <small>{capability.signal}</small>
              </button>
            ))}
          </div>
          <div className="chat-feed">
            {messages.map((message, index) => (
              <div className={message.role} key={`${message.role}-${index}`}>{message.text}</div>
            ))}
          </div>
          <form onSubmit={handleChat} className="assistant-form">
            <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about this room design..." />
            <button type="submit">Send</button>
          </form>
        </aside>
      )}
    </main>
  );
}

function EnterpriseRoom() {
  return (
    <div className="enterprise-room">
      <div className="ceiling" />
      <div className="left-wall" />
      <div className="right-wall" />
      <div className="back-wall" />
      <div className="base-floor" />
    </div>
  );
}

function EnterpriseObjects() {
  return (
    <div className="enterprise-objects">
      <div className="door" />
      <div className="window one" />
      <div className="window two" />
      <div className="window three" />
      <div className="sofa" />
      <div className="coffee-table" />
      <div className="chair left" />
      <div className="chair right" />
      <div className="plant" />
      <div className="fireplace" />
      <div className="rug" />
    </div>
  );
}
