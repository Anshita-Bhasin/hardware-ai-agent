'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';

type Tile = {
  id: string;
  name: string;
  area: 'Floor' | 'Wall';
  finish: string;
  size: string;
  price: number;
  color: string;
  accent: string;
  pattern: string;
};

const floorTiles: Tile[] = [
  {
    id: 'calacatta',
    name: 'Calacatta Pearl',
    area: 'Floor',
    finish: 'Polished porcelain',
    size: '120 x 120 cm',
    price: 82,
    color: '#f7f2e8',
    accent: '#b9a88f',
    pattern: 'marble',
  },
  {
    id: 'graphite',
    name: 'Graphite Stone',
    area: 'Floor',
    finish: 'Matt anti-slip',
    size: '60 x 120 cm',
    price: 64,
    color: '#5b6368',
    accent: '#c7d0cd',
    pattern: 'stone',
  },
  {
    id: 'walnut',
    name: 'Walnut Chevron',
    area: 'Floor',
    finish: 'Wood look ceramic',
    size: '20 x 120 cm',
    price: 58,
    color: '#8b5a37',
    accent: '#f4c47a',
    pattern: 'chevron',
  },
];

const wallTiles: Tile[] = [
  {
    id: 'sage',
    name: 'Sage Kitkat',
    area: 'Wall',
    finish: 'Gloss ceramic',
    size: '30 x 90 cm',
    price: 46,
    color: '#789b86',
    accent: '#eef5ed',
    pattern: 'vertical',
  },
  {
    id: 'ivory',
    name: 'Ivory Travertine',
    area: 'Wall',
    finish: 'Silk porcelain',
    size: '60 x 120 cm',
    price: 72,
    color: '#d8c7a4',
    accent: '#7c6f55',
    pattern: 'stone',
  },
  {
    id: 'terracotta',
    name: 'Terracotta Zellige',
    area: 'Wall',
    finish: 'Handmade glossy',
    size: '10 x 10 cm',
    price: 53,
    color: '#b9563e',
    accent: '#ffe3b7',
    pattern: 'grid',
  },
];

const questions = [
  'Is this tile suitable for high traffic areas?',
  'Can I compare two floors side by side?',
  'How much extra should I add for wastage?',
];

function tileStyle(tile: Tile) {
  const base = tile.color;
  const accent = tile.accent;

  if (tile.pattern === 'chevron') {
    return {
      backgroundColor: base,
      backgroundImage: `linear-gradient(135deg, transparent 45%, ${accent}55 46%, ${accent}55 54%, transparent 55%), linear-gradient(45deg, transparent 45%, rgba(255,255,255,.2) 46%, rgba(255,255,255,.2) 54%, transparent 55%)`,
      backgroundSize: '64px 64px',
    };
  }

  if (tile.pattern === 'vertical') {
    return {
      backgroundColor: base,
      backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.36) 1px, transparent 1px), linear-gradient(90deg, transparent 0 44px, ${accent}55 45px 48px, transparent 49px)`,
      backgroundSize: '16px 100%, 48px 100%',
    };
  }

  if (tile.pattern === 'grid') {
    return {
      backgroundColor: base,
      backgroundImage: `linear-gradient(${accent}66 1px, transparent 1px), linear-gradient(90deg, ${accent}66 1px, transparent 1px), radial-gradient(circle at 30% 20%, rgba(255,255,255,.25), transparent 22%)`,
      backgroundSize: '34px 34px, 34px 34px, 70px 70px',
    };
  }

  if (tile.pattern === 'marble') {
    return {
      backgroundColor: base,
      backgroundImage: `linear-gradient(118deg, transparent 0 36%, ${accent}80 37%, transparent 39% 100%), linear-gradient(28deg, transparent 0 57%, ${accent}55 58%, transparent 61% 100%), radial-gradient(circle at 18% 24%, rgba(255,255,255,.75), transparent 28%)`,
      backgroundSize: '180px 180px, 150px 150px, 100% 100%',
    };
  }

  return {
    backgroundColor: base,
    backgroundImage: `radial-gradient(circle at 24% 18%, rgba(255,255,255,.25), transparent 20%), radial-gradient(circle at 72% 66%, ${accent}55, transparent 22%), linear-gradient(120deg, rgba(0,0,0,.12), transparent 38%, rgba(255,255,255,.2))`,
    backgroundSize: '90px 90px, 120px 120px, 100% 100%',
  };
}

export default function Home() {
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [floorTile, setFloorTile] = useState(floorTiles[0]);
  const [wallTile, setWallTile] = useState(wallTiles[0]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareTile, setCompareTile] = useState(floorTiles[1]);
  const [split, setSplit] = useState(50);
  const [area, setArea] = useState(1200);
  const [includeWall, setIncludeWall] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    {
      from: 'assistant',
      text: 'Upload your room photo, select floor and wall tiles, then share your area to get an instant estimate.',
    },
  ]);

  const quote = useMemo(() => {
    const wastage = 1.08;
    const floorCost = area * floorTile.price * wastage;
    const wallCost = includeWall ? area * 0.35 * wallTile.price * wastage : 0;
    const install = area * 14;
    return Math.round(floorCost + wallCost + install);
  }, [area, floorTile.price, includeWall, wallTile.price]);

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRoomImage(URL.createObjectURL(file));
  }

  function handleChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    let reply = `For ${area.toLocaleString()} sq ft with ${floorTile.name}, the demo estimate is QAR ${quote.toLocaleString()}. I can also capture your name, phone, and preferred showroom visit slot.`;

    if (lower.includes('compare') || lower.includes('side')) {
      reply = 'Use Compare mode to split the room preview. Left side keeps your selected floor, right side shows the alternate tile.';
    } else if (lower.includes('wastage') || lower.includes('extra')) {
      reply = 'This demo adds 8% wastage automatically. Your client can later set different rules by tile size, layout, and room type.';
    } else if (lower.includes('wall') || lower.includes('floor')) {
      reply = `${floorTile.name} is applied to the floor zone and ${wallTile.name} to the wall zone. In a production visualizer, AI segmentation would detect those areas from the uploaded photo.`;
    }

    setMessages((current) => [
      ...current,
      { from: 'user', text: trimmed },
      { from: 'assistant', text: reply },
    ]);
    setChatInput('');
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Hardware AI visualizer demo</p>
          <h1>RoomStyle Studio</h1>
        </div>
        <nav aria-label="Demo sections">
          <a href="#visualizer">Visualizer</a>
          <a href="#quote">Quote</a>
          <a href="#assistant">Assistant</a>
        </nav>
      </header>

      <section className="workspace" id="visualizer">
        <aside className="panel catalog-panel" aria-label="Tile catalog">
          <div className="section-title">
            <span>1</span>
            <div>
              <h2>Select products</h2>
              <p>Floor and wall tile catalog synced with website SKUs.</p>
            </div>
          </div>

          <div className="upload-box">
            <input id="room-upload" type="file" accept="image/*" onChange={handleUpload} />
            <label htmlFor="room-upload">
              <strong>{roomImage ? 'Change room photo' : 'Upload customer room'}</strong>
              <span>Phone or desktop image</span>
            </label>
          </div>

          <ProductPicker
            title="Floor tile"
            tiles={floorTiles}
            selected={floorTile}
            onSelect={setFloorTile}
          />
          <ProductPicker
            title="Wall tile"
            tiles={wallTiles}
            selected={wallTile}
            onSelect={setWallTile}
          />

          <div className="comparison-control">
            <div>
              <h3>Compare mode</h3>
              <p>Split the room into two tile choices.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(event) => setCompareMode(event.target.checked)}
              />
              <span />
            </label>
          </div>

          {compareMode && (
            <div className="compare-options">
              <select
                aria-label="Comparison floor tile"
                value={compareTile.id}
                onChange={(event) =>
                  setCompareTile(floorTiles.find((tile) => tile.id === event.target.value) || floorTiles[1])
                }
              >
                {floorTiles.map((tile) => (
                  <option key={tile.id} value={tile.id}>
                    Compare with {tile.name}
                  </option>
                ))}
              </select>
              <label>
                Split {split}%
                <input
                  type="range"
                  min="25"
                  max="75"
                  value={split}
                  onChange={(event) => setSplit(Number(event.target.value))}
                />
              </label>
            </div>
          )}
        </aside>

        <section className="visualizer-stage" aria-label="Room visualizer">
          <div className="stage-toolbar">
            <div>
              <p className="eyebrow">Live preview</p>
              <h2>Your room with selected tiles</h2>
            </div>
            <div className="status-pill">AI zone preview</div>
          </div>

          <div className="room-frame">
            <div className="room-photo" style={roomImage ? { backgroundImage: `url(${roomImage})` } : undefined}>
              {!roomImage && (
                <div className="demo-room">
                  <div className="window" />
                  <div className="art" />
                  <div className="sofa" />
                  <div className="table" />
                  <div className="curtain left" />
                  <div className="curtain right" />
                </div>
              )}
              <div className="wall-zone" style={tileStyle(wallTile)} />
              <div className="floor-zone" style={tileStyle(floorTile)} />
              {compareMode && (
                <div
                  className="floor-zone compare-zone"
                  style={{ ...tileStyle(compareTile), clipPath: `polygon(${split}% 48%, 100% 34%, 100% 100%, ${split}% 100%)` }}
                />
              )}
              {compareMode && <div className="split-line" style={{ left: `${split}%` }} />}
              <div className="preview-label floor">
                Floor: {floorTile.name}
                {compareMode ? ` / ${compareTile.name}` : ''}
              </div>
              <div className="preview-label wall">Wall: {wallTile.name}</div>
            </div>
          </div>

          <div className="feature-strip">
            <div>
              <strong>Upload</strong>
              <span>Customer room photo</span>
            </div>
            <div>
              <strong>Visualize</strong>
              <span>Floor and wall surfaces</span>
            </div>
            <div>
              <strong>Compare</strong>
              <span>Two tile designs side by side</span>
            </div>
            <div>
              <strong>Convert</strong>
              <span>Quote and lead capture</span>
            </div>
          </div>
        </section>

        <aside className="panel action-panel">
          <section id="quote" className="quote-card">
            <div className="section-title">
              <span>2</span>
              <div>
                <h2>Instant quotation</h2>
                <p>Demo formula, editable once client confirms rules.</p>
              </div>
            </div>

            <label className="field">
              Area size
              <div className="number-input">
                <input
                  type="number"
                  min="50"
                  value={area}
                  onChange={(event) => setArea(Number(event.target.value) || 0)}
                />
                <span>sq ft</span>
              </div>
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                checked={includeWall}
                onChange={(event) => setIncludeWall(event.target.checked)}
              />
              Include feature wall tile
            </label>

            <dl className="quote-lines">
              <div>
                <dt>Floor material</dt>
                <dd>QAR {Math.round(area * floorTile.price * 1.08).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Wall material</dt>
                <dd>{includeWall ? `QAR ${Math.round(area * 0.35 * wallTile.price * 1.08).toLocaleString()}` : 'Not included'}</dd>
              </div>
              <div>
                <dt>Installation</dt>
                <dd>QAR {(area * 14).toLocaleString()}</dd>
              </div>
            </dl>

            <div className="total">
              <span>Estimated total</span>
              <strong>QAR {quote.toLocaleString()}</strong>
            </div>
            <button className="primary-button" type="button">Send quotation to WhatsApp</button>
          </section>

          <section id="assistant" className="assistant-card">
            <div className="section-title">
              <span>3</span>
              <div>
                <h2>Sales assistant</h2>
                <p>Answers questions and captures quote intent.</p>
              </div>
            </div>
            <div className="quick-questions">
              {questions.map((question) => (
                <button key={question} type="button" onClick={() => setChatInput(question)}>
                  {question}
                </button>
              ))}
            </div>
            <div className="chat-log" aria-live="polite">
              {messages.map((message, index) => (
                <div key={`${message.from}-${index}`} className={`message ${message.from}`}>
                  {message.text}
                </div>
              ))}
            </div>
            <form className="chat-form" onSubmit={handleChat}>
              <input
                aria-label="Ask the assistant"
                placeholder="Ask about tile, quote, stock..."
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
              />
              <button type="submit">Send</button>
            </form>
          </section>
        </aside>
      </section>
    </main>
  );
}

function ProductPicker({
  title,
  tiles,
  selected,
  onSelect,
}: {
  title: string;
  tiles: Tile[];
  selected: Tile;
  onSelect: (tile: Tile) => void;
}) {
  return (
    <div className="product-picker">
      <h3>{title}</h3>
      <div className="tile-list">
        {tiles.map((tile) => (
          <button
            type="button"
            key={tile.id}
            className={selected.id === tile.id ? 'tile-card active' : 'tile-card'}
            onClick={() => onSelect(tile)}
          >
            <span className="swatch" style={tileStyle(tile)} />
            <span>
              <strong>{tile.name}</strong>
              <small>{tile.finish}</small>
              <small>{tile.size} · QAR {tile.price}/sq ft</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
