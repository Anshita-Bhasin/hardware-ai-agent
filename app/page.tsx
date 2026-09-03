'use client';

import { CSSProperties, ChangeEvent, FormEvent, useMemo, useState } from 'react';

type Tile = {
  id: string;
  name: string;
  area: 'Floor' | 'Wall';
  body: string;
  colorGroup: string;
  finish: string;
  material: string;
  size: string;
  price: number;
  color: string;
  accent: string;
  pattern: 'marble' | 'stone' | 'chevron' | 'vertical' | 'grid' | 'terrazzo';
};

type Scene = 'living' | 'bathroom' | 'kitchen';
type SurfaceMode = 'both' | 'floor' | 'wall';
type CompareSurface = 'floor' | 'wall';

const floorTiles: Tile[] = [
  {
    id: 'calacatta',
    name: 'Calacatta Pearl',
    area: 'Floor',
    body: 'Wall and Floor Tiles',
    colorGroup: 'White',
    finish: 'Polished',
    material: 'Porcelain',
    size: '120X120CM',
    price: 82,
    color: '#f7f2e8',
    accent: '#9f9382',
    pattern: 'marble',
  },
  {
    id: 'graphite',
    name: 'Graphite Stone',
    area: 'Floor',
    body: 'Floor Tiles',
    colorGroup: 'Grey',
    finish: 'Matt',
    material: 'Concrete',
    size: '60X120CM',
    price: 64,
    color: '#5b6368',
    accent: '#c7d0cd',
    pattern: 'stone',
  },
  {
    id: 'walnut',
    name: 'Walnut Chevron',
    area: 'Floor',
    body: 'Floor Tiles',
    colorGroup: 'Brown',
    finish: 'Matt',
    material: 'Ceramic',
    size: '20X120CM',
    price: 58,
    color: '#8b5a37',
    accent: '#f4c47a',
    pattern: 'chevron',
  },
  {
    id: 'quartz-speckle',
    name: 'Quartz Speckle',
    area: 'Floor',
    body: 'Wall and Floor Tiles',
    colorGroup: 'Ivory',
    finish: 'Lappato',
    material: 'Quartz',
    size: '60X60CM',
    price: 69,
    color: '#d9d2c1',
    accent: '#5d6e72',
    pattern: 'terrazzo',
  },
];

const wallTiles: Tile[] = [
  {
    id: 'sage',
    name: 'Sage Kitkat',
    area: 'Wall',
    body: 'Wall Tiles',
    colorGroup: 'Green',
    finish: 'Glossy',
    material: 'Ceramic',
    size: '30X90CM',
    price: 46,
    color: '#789b86',
    accent: '#eef5ed',
    pattern: 'vertical',
  },
  {
    id: 'ivory',
    name: 'Ivory Travertine',
    area: 'Wall',
    body: 'Wall and Floor Tiles',
    colorGroup: 'Ivory',
    finish: 'Silk',
    material: 'Porcelain',
    size: '60X120CM',
    price: 72,
    color: '#d8c7a4',
    accent: '#7c6f55',
    pattern: 'stone',
  },
  {
    id: 'terracotta',
    name: 'Terracotta Zellige',
    area: 'Wall',
    body: 'Wall Tiles',
    colorGroup: 'Brown',
    finish: 'Glossy',
    material: 'Ceramic',
    size: '10X10CM',
    price: 53,
    color: '#b9563e',
    accent: '#ffe3b7',
    pattern: 'grid',
  },
  {
    id: 'blue-mosaic',
    name: 'Blue Mosaic',
    area: 'Wall',
    body: 'Wall Tiles',
    colorGroup: 'Grey',
    finish: 'Glossy',
    material: 'Mosaics',
    size: '30X30CM',
    price: 61,
    color: '#446e8d',
    accent: '#d7edf1',
    pattern: 'grid',
  },
];

const filterGroups = [
  ['Wall Tiles', 'Floor Tiles', 'Wall and Floor Tiles'],
  ['Porcelain', 'Ceramic', 'Concrete', 'Mosaics', 'Quartz'],
  ['Matt', 'Glossy', 'Polished', 'Lappato', 'Silk'],
  ['Indoor', 'Outdoor'],
];

const questions = [
  'Give quote for this selected design',
  'Can I compare floor and wall options?',
  'How much wastage should be included?',
];

function tileStyle(tile: Tile, tileScale = 74): CSSProperties {
  const base = tile.color;
  const accent = tile.accent;
  const scale = `${tileScale}px`;

  if (tile.pattern === 'chevron') {
    return {
      backgroundColor: base,
      backgroundImage: `linear-gradient(135deg, transparent 43%, ${accent}80 44%, ${accent}80 53%, transparent 54%), linear-gradient(45deg, transparent 43%, rgba(255,255,255,.22) 44%, rgba(255,255,255,.22) 53%, transparent 54%)`,
      backgroundSize: `${tileScale}px ${tileScale}px`,
    };
  }

  if (tile.pattern === 'vertical') {
    return {
      backgroundColor: base,
      backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.38) 1px, transparent 1px), linear-gradient(90deg, transparent 0 42px, ${accent}68 43px 48px, transparent 49px)`,
      backgroundSize: '14px 100%, 48px 100%',
    };
  }

  if (tile.pattern === 'grid') {
    return {
      backgroundColor: base,
      backgroundImage: `linear-gradient(${accent}70 1px, transparent 1px), linear-gradient(90deg, ${accent}70 1px, transparent 1px), radial-gradient(circle at 30% 20%, rgba(255,255,255,.3), transparent 22%)`,
      backgroundSize: `${Math.max(24, tileScale * 0.55)}px ${Math.max(24, tileScale * 0.55)}px, ${Math.max(24, tileScale * 0.55)}px ${Math.max(24, tileScale * 0.55)}px, ${scale} ${scale}`,
    };
  }

  if (tile.pattern === 'marble') {
    return {
      backgroundColor: base,
      backgroundImage: `linear-gradient(118deg, transparent 0 35%, ${accent}82 36%, transparent 39% 100%), linear-gradient(28deg, transparent 0 57%, ${accent}55 58%, transparent 61% 100%), radial-gradient(circle at 18% 24%, rgba(255,255,255,.76), transparent 28%)`,
      backgroundSize: `${tileScale * 2.2}px ${tileScale * 2.2}px, ${tileScale * 1.8}px ${tileScale * 1.8}px, 100% 100%`,
    };
  }

  if (tile.pattern === 'terrazzo') {
    return {
      backgroundColor: base,
      backgroundImage: `radial-gradient(circle at 18% 24%, ${accent} 0 2px, transparent 3px), radial-gradient(circle at 78% 38%, #fff 0 3px, transparent 4px), radial-gradient(circle at 45% 72%, rgba(0,0,0,.25) 0 2px, transparent 3px)`,
      backgroundSize: `${tileScale * 0.75}px ${tileScale * 0.75}px`,
    };
  }

  return {
    backgroundColor: base,
    backgroundImage: `radial-gradient(circle at 24% 18%, rgba(255,255,255,.25), transparent 20%), radial-gradient(circle at 72% 66%, ${accent}55, transparent 22%), linear-gradient(120deg, rgba(0,0,0,.12), transparent 38%, rgba(255,255,255,.2))`,
    backgroundSize: `${scale} ${scale}, ${tileScale * 1.35}px ${tileScale * 1.35}px, 100% 100%`,
  };
}

export default function Home() {
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [scene, setScene] = useState<Scene>('living');
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('both');
  const [floorTile, setFloorTile] = useState(floorTiles[0]);
  const [wallTile, setWallTile] = useState(wallTiles[1]);
  const [compareMode, setCompareMode] = useState(true);
  const [compareSurface, setCompareSurface] = useState<CompareSurface>('floor');
  const [compareTile, setCompareTile] = useState(floorTiles[1]);
  const [split, setSplit] = useState(50);
  const [floorLeft, setFloorLeft] = useState(58);
  const [floorRight, setFloorRight] = useState(43);
  const [wallEnd, setWallEnd] = useState(52);
  const [tileScale, setTileScale] = useState(74);
  const [surfaceOpacity, setSurfaceOpacity] = useState(76);
  const [area, setArea] = useState(1200);
  const [includeWall, setIncludeWall] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    {
      from: 'assistant',
      text: 'I can help the customer compare tiles, estimate quantity, explain finish/body type, and send a quote request.',
    },
  ]);

  const quote = useMemo(() => {
    const wastage = 1.08;
    const floorCost = area * floorTile.price * wastage;
    const wallCost = includeWall ? area * 0.35 * wallTile.price * wastage : 0;
    const install = area * 14;
    return Math.round(floorCost + wallCost + install);
  }, [area, floorTile.price, includeWall, wallTile.price]);

  const stageStyle = {
    '--floor-left': `${floorLeft}%`,
    '--floor-right': `${floorRight}%`,
    '--wall-end': `${wallEnd}%`,
    '--surface-opacity': surfaceOpacity / 100,
  } as CSSProperties;

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRoomImage(URL.createObjectURL(file));
    setFloorLeft(61);
    setFloorRight(45);
    setWallEnd(54);
    setSurfaceOpacity(72);
  }

  function chooseScene(nextScene: Scene) {
    setScene(nextScene);
    setRoomImage(null);
    if (nextScene === 'bathroom') {
      setFloorLeft(62);
      setFloorRight(48);
      setWallEnd(68);
    } else if (nextScene === 'kitchen') {
      setFloorLeft(60);
      setFloorRight(42);
      setWallEnd(50);
    } else {
      setFloorLeft(58);
      setFloorRight(43);
      setWallEnd(52);
    }
    setSurfaceOpacity(78);
  }

  function handleChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    let reply = `For ${area.toLocaleString()} sq ft, ${floorTile.name} plus ${includeWall ? wallTile.name : 'no wall tile'} comes to approx QAR ${quote.toLocaleString()}. This can be turned into a lead form or WhatsApp quote.`;

    if (lower.includes('compare') || lower.includes('side')) {
      reply = 'Turn on Compare and choose Floor or Wall. The split slider shows two products in the same uploaded room, like a before-after product decision view.';
    } else if (lower.includes('wastage') || lower.includes('extra')) {
      reply = 'The demo includes 8% wastage. In production, wastage can change by tile size, diagonal layout, room shape, and installer rule.';
    } else if (lower.includes('finish') || lower.includes('slip')) {
      reply = `${floorTile.name} is ${floorTile.finish}. For wet/outdoor areas, I would recommend matt or anti-slip products and show only eligible SKUs.`;
    }

    setMessages((current) => [
      ...current,
      { from: 'user', text: trimmed },
      { from: 'assistant', text: reply },
    ]);
    setChatInput('');
  }

  const comparisonChoices = compareSurface === 'floor' ? floorTiles : wallTiles;
  const selectedCompareTile =
    comparisonChoices.find((tile) => tile.id === compareTile.id) || comparisonChoices[0];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Nabina-style AI tile visualizer</p>
          <h1>RoomStyle Studio</h1>
        </div>
        <nav aria-label="Demo sections">
          <a href="#products">Products</a>
          <a href="#visualizer">Visualizer</a>
          <a href="#quote">Quote</a>
          <a href="#assistant">Assistant</a>
        </nav>
      </header>

      <section className="workspace">
        <aside className="panel catalog-panel" id="products" aria-label="Tile catalog">
          <div className="section-title">
            <span>1</span>
            <div>
              <h2>Select a product</h2>
              <p>Mirrors Nabina filters: body, material, finish, size, and color.</p>
            </div>
          </div>

          <div className="filter-stack" aria-label="Catalog filters">
            {filterGroups.map((group) => (
              <div className="filter-row" key={group.join('-')}>
                {group.map((filter) => (
                  <button type="button" key={filter}>
                    {filter}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <ProductPicker title="Floor tiles" tiles={floorTiles} selected={floorTile} onSelect={setFloorTile} />
          <ProductPicker title="Wall tiles" tiles={wallTiles} selected={wallTile} onSelect={setWallTile} />
        </aside>

        <section className="visualizer-stage" id="visualizer" aria-label="Room visualizer">
          <div className="stage-toolbar">
            <div>
              <p className="eyebrow">Launch tile visualizer</p>
              <h2>Apply floor and wall tiles in the customer room</h2>
            </div>
            <div className="status-pill">Working demo</div>
          </div>

          <div className="visualizer-controls">
            <div className="upload-box compact">
              <input id="room-upload" type="file" accept="image/*" onChange={handleUpload} />
              <label htmlFor="room-upload">
                <strong>{roomImage ? 'Change uploaded photo' : 'Take / upload photo'}</strong>
                <span>Customer room image</span>
              </label>
            </div>

            <div className="segmented" aria-label="Example rooms">
              {(['living', 'bathroom', 'kitchen'] as Scene[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={!roomImage && scene === item ? 'active' : ''}
                  onClick={() => chooseScene(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="segmented" aria-label="Surface mode">
              {(['both', 'floor', 'wall'] as SurfaceMode[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={surfaceMode === item ? 'active' : ''}
                  onClick={() => setSurfaceMode(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="room-frame">
            <div
              className={`room-photo ${roomImage ? 'uploaded' : scene}`}
              style={{
                ...stageStyle,
                ...(roomImage ? { backgroundImage: `url(${roomImage})` } : {}),
              }}
            >
              {!roomImage && <DemoScene scene={scene} />}

              {(surfaceMode === 'both' || surfaceMode === 'wall') && (
                <div className="wall-zone" style={tileStyle(wallTile, tileScale)} />
              )}
              {(surfaceMode === 'both' || surfaceMode === 'floor') && (
                <div className="floor-zone" style={tileStyle(floorTile, tileScale)} />
              )}

              {compareMode && compareSurface === 'floor' && (
                <div
                  className="floor-zone compare-zone"
                  style={{
                    ...tileStyle(selectedCompareTile, tileScale),
                    clipPath: `polygon(${split}% var(--floor-left), 100% var(--floor-right), 100% 100%, ${split}% 100%)`,
                  }}
                />
              )}
              {compareMode && compareSurface === 'wall' && (
                <div
                  className="wall-zone compare-zone"
                  style={{
                    ...tileStyle(selectedCompareTile, tileScale),
                    clipPath: `polygon(${split}% 0, 100% 0, 100% var(--wall-end), ${split}% var(--wall-end))`,
                  }}
                />
              )}

              {compareMode && <div className="split-line" style={{ left: `${split}%` }} />}

              <div className="surface-tags">
                <span>Floor: {floorTile.name}</span>
                <span>Wall: {wallTile.name}</span>
                {compareMode && <span>Compare: {selectedCompareTile.name}</span>}
              </div>
            </div>
          </div>

          <div className="control-drawer">
            <div className="comparison-control">
              <div>
                <h3>Compare products</h3>
                <p>Half room can show another floor or wall tile.</p>
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

            <div className="calibration-grid">
              <label>
                Compare surface
                <select
                  value={compareSurface}
                  onChange={(event) => {
                    const nextSurface = event.target.value as CompareSurface;
                    setCompareSurface(nextSurface);
                    setCompareTile(nextSurface === 'floor' ? floorTiles[1] : wallTiles[2]);
                  }}
                >
                  <option value="floor">Floor</option>
                  <option value="wall">Wall</option>
                </select>
              </label>
              <label>
                Compare tile
                <select
                  value={selectedCompareTile.id}
                  onChange={(event) =>
                    setCompareTile(comparisonChoices.find((tile) => tile.id === event.target.value) || comparisonChoices[0])
                  }
                >
                  {comparisonChoices.map((tile) => (
                    <option key={tile.id} value={tile.id}>
                      {tile.name}
                    </option>
                  ))}
                </select>
              </label>
              <Range label={`Split ${split}%`} value={split} min={25} max={75} onChange={setSplit} />
              <Range label={`Tile size ${tileScale}px`} value={tileScale} min={42} max={118} onChange={setTileScale} />
              <Range label={`Floor left ${floorLeft}%`} value={floorLeft} min={44} max={74} onChange={setFloorLeft} />
              <Range label={`Floor right ${floorRight}%`} value={floorRight} min={32} max={64} onChange={setFloorRight} />
              <Range label={`Wall height ${wallEnd}%`} value={wallEnd} min={38} max={75} onChange={setWallEnd} />
              <Range label={`Opacity ${surfaceOpacity}%`} value={surfaceOpacity} min={45} max={92} onChange={setSurfaceOpacity} />
            </div>
          </div>
        </section>

        <aside className="panel action-panel">
          <section id="quote" className="quote-card">
            <div className="section-title">
              <span>2</span>
              <div>
                <h2>Get quotation</h2>
                <p>Demo formula now; client pricing logic can plug in later.</p>
              </div>
            </div>

            <div className="selected-summary">
              <span className="swatch mini" style={tileStyle(floorTile, 44)} />
              <div>
                <strong>{floorTile.name}</strong>
                <small>{floorTile.material} - {floorTile.finish} - {floorTile.size}</small>
              </div>
            </div>
            <div className="selected-summary">
              <span className="swatch mini" style={tileStyle(wallTile, 44)} />
              <div>
                <strong>{wallTile.name}</strong>
                <small>{wallTile.material} - {wallTile.finish} - {wallTile.size}</small>
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
              Include selected wall tile
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
            <button className="primary-button" type="button">Send quote request</button>
          </section>

          <section id="assistant" className="assistant-card">
            <div className="section-title">
              <span>3</span>
              <div>
                <h2>Chat assistant</h2>
                <p>Clarifies design, stock, installation, and estimate.</p>
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
                placeholder="Ask about quote, tile, stock..."
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

function DemoScene({ scene }: { scene: Scene }) {
  return (
    <div className={`demo-room ${scene}`}>
      <div className="back-wall" />
      <div className="window" />
      <div className="art" />
      <div className="vanity" />
      <div className="counter" />
      <div className="sofa" />
      <div className="table" />
      <div className="curtain left" />
      <div className="curtain right" />
      <div className="plant" />
    </div>
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
              <small>{tile.body} - {tile.colorGroup}</small>
              <small>{tile.material} - {tile.finish} - {tile.size}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
