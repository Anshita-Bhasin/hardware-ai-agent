export type Surface = 'floors' | 'walls';

export type Product = {
  id: string;
  brand: string;
  code: string;
  title: string;
  surface: Surface;
  price: number;
  size: string;
  material: string;
  finish: string;
  color: string;
  accent: string;
  pattern: 'linear' | 'marble' | 'stone' | 'wood' | 'mosaic';
  stock: number;
  roomvoAssetId: string;
  roomvoProductUrl: string;
};

export type QuoteInput = {
  area: number;
  wastage: number;
  floorProductId: string;
  wallProductId: string;
};

export type Quote = {
  floorCost: number;
  wallCost: number;
  adhesive: number;
  grout: number;
  trims: number;
  installation: number;
  total: number;
  cartons: {
    floors: number;
    walls: number;
  };
};

export const products: Product[] = [
  {
    id: 'mar280',
    brand: 'Marazzi',
    code: 'MAR280',
    title: 'Sage Relief Decor',
    surface: 'walls',
    price: 164.98,
    size: '30X90CM',
    material: 'Ceramic',
    finish: 'Glossy',
    color: '#557979',
    accent: '#d9ebe7',
    pattern: 'linear',
    stock: 46,
    roomvoAssetId: 'rv_tile_wall_marazzi_sage_relief_30x90',
    roomvoProductUrl: '/products/marazzi/sage-relief-decor',
  },
  {
    id: 'bruae543',
    brand: 'Rak Tiles',
    code: 'BRUAE543',
    title: 'Soft Ivory Stone',
    surface: 'walls',
    price: 50.01,
    size: '60X60CM',
    material: 'Porcelain',
    finish: 'Matt',
    color: '#d8d1c4',
    accent: '#8d8578',
    pattern: 'stone',
    stock: 120,
    roomvoAssetId: 'rv_tile_wall_rak_soft_ivory_60x60',
    roomvoProductUrl: '/products/rak/soft-ivory-stone',
  },
  {
    id: 'rocf1q0b54011',
    brand: 'Roca Tiles',
    code: 'ROCF1Q0B54011',
    title: 'Warm Concrete',
    surface: 'walls',
    price: 166,
    size: '60X120CM',
    material: 'Concrete',
    finish: 'Silk',
    color: '#cfcac0',
    accent: '#77736d',
    pattern: 'stone',
    stock: 75,
    roomvoAssetId: 'rv_tile_wall_roca_warm_concrete_60x120',
    roomvoProductUrl: '/products/roca/warm-concrete',
  },
  {
    id: 'bcwl710',
    brand: 'Saloni',
    code: 'BCWL710',
    title: 'Fluted Marble Beige',
    surface: 'walls',
    price: 251,
    size: '30X90CM',
    material: 'Porcelain',
    finish: 'Lappato',
    color: '#dfd5c3',
    accent: '#af9a78',
    pattern: 'linear',
    stock: 38,
    roomvoAssetId: 'rv_tile_wall_saloni_fluted_marble_30x90',
    roomvoProductUrl: '/products/saloni/fluted-marble-beige',
  },
  {
    id: 'betr670',
    brand: 'Saloni',
    code: 'BETR670',
    title: 'Travertine Vein Cut',
    surface: 'floors',
    price: 106,
    size: '60X120CM',
    material: 'Porcelain',
    finish: 'Matt',
    color: '#b8ae9e',
    accent: '#746b61',
    pattern: 'stone',
    stock: 90,
    roomvoAssetId: 'rv_tile_floor_saloni_travertine_60x120',
    roomvoProductUrl: '/products/saloni/travertine-vein-cut',
  },
  {
    id: 'wood924',
    brand: 'Marca Corona',
    code: 'WOOD924',
    title: 'Natural Oak Plank',
    surface: 'floors',
    price: 118,
    size: '20X120CM',
    material: 'Porcelain',
    finish: 'Matt',
    color: '#a37248',
    accent: '#f1cc8e',
    pattern: 'wood',
    stock: 64,
    roomvoAssetId: 'rv_tile_floor_marca_corona_oak_20x120',
    roomvoProductUrl: '/products/marca-corona/natural-oak-plank',
  },
  {
    id: 'cal120',
    brand: 'Roca Tiles',
    code: 'CAL120',
    title: 'Calacatta Super White',
    surface: 'floors',
    price: 142,
    size: '120X120CM',
    material: 'Porcelain',
    finish: 'Polished',
    color: '#f3efe7',
    accent: '#a89f92',
    pattern: 'marble',
    stock: 52,
    roomvoAssetId: 'rv_tile_floor_roca_calacatta_120x120',
    roomvoProductUrl: '/products/roca/calacatta-super-white',
  },
];

export const capabilities = [
  { id: 'concept', title: 'Concept-to-SKU', signal: 'Mood -> matched products' },
  { id: 'photo', title: 'Photo-to-Quote', signal: 'Room photo -> options + price' },
  { id: 'boq', title: 'Smart BOQ', signal: 'Dimensions -> complete quote' },
  { id: 'compare', title: 'Side-by-Side', signal: 'Finalists -> faster decision' },
  { id: 'trade', title: 'Partner Desk', signal: 'Trade price + reorder' },
  { id: 'care', title: 'Post-Sale Care', signal: 'Batch match + support' },
];

export function findProduct(id: string, fallbackSurface?: Surface) {
  return (
    products.find((product) => product.id === id) ||
    products.find((product) => product.surface === fallbackSurface) ||
    products[0]
  );
}

export function createQuote(input: QuoteInput): Quote {
  const area = Math.max(0, input.area || 0);
  const wastage = Math.min(25, Math.max(0, input.wastage || 0));
  const factor = 1 + wastage / 100;
  const floorProduct = findProduct(input.floorProductId, 'floors');
  const wallProduct = findProduct(input.wallProductId, 'walls');
  const floorArea = area;
  const wallArea = area * 0.42;
  const floorCost = floorArea * floorProduct.price * factor;
  const wallCost = wallArea * wallProduct.price * factor;
  const adhesive = area * 4.8;
  const grout = area * 1.2;
  const trims = Math.max(220, area * 0.75);
  const installation = area * 14;

  return {
    floorCost: Math.round(floorCost),
    wallCost: Math.round(wallCost),
    adhesive: Math.round(adhesive),
    grout: Math.round(grout),
    trims: Math.round(trims),
    installation: Math.round(installation),
    total: Math.round(floorCost + wallCost + adhesive + grout + trims + installation),
    cartons: {
      floors: Math.ceil((floorArea * factor) / 1.44),
      walls: Math.ceil((wallArea * factor) / 1.08),
    },
  };
}
