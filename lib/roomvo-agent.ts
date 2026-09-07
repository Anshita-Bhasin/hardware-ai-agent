import { createQuote, findProduct, products, QuoteInput } from './catalog';

export type VisualizerState = QuoteInput & {
  selectedProductId: string;
  compareProductId: string;
  prompt?: string;
};

export function createRoomvoPayload(state: VisualizerState) {
  const floorProduct = findProduct(state.floorProductId, 'floors');
  const wallProduct = findProduct(state.wallProductId, 'walls');
  const selectedProduct = findProduct(state.selectedProductId);
  const compareProduct = findProduct(state.compareProductId);

  return {
    provider: 'roomvo',
    mode: 'multi_surface_visualizer',
    surfaces: [
      { surface: 'floor', productCode: floorProduct.code, roomvoAssetId: floorProduct.roomvoAssetId },
      { surface: 'wall', productCode: wallProduct.code, roomvoAssetId: wallProduct.roomvoAssetId },
    ],
    selected: { productCode: selectedProduct.code, url: selectedProduct.roomvoProductUrl },
    compare: { productCode: compareProduct.code, roomvoAssetId: compareProduct.roomvoAssetId },
    capabilities: ['room_upload', 'sample_rooms', 'surface_masking', 'compare_mode', 'catalog_sync'],
  };
}

export function answerFromAgent(state: VisualizerState) {
  const quote = createQuote(state);
  const selectedProduct = findProduct(state.selectedProductId);
  const floorProduct = findProduct(state.floorProductId, 'floors');
  const wallProduct = findProduct(state.wallProductId, 'walls');
  const prompt = state.prompt?.toLowerCase() || '';

  if (prompt.includes('stock')) {
    return `${selectedProduct.code} has ${selectedProduct.stock} demo units available. Production should read inventory from ERP/POS, while Roomvo supplies the visual asset and product metadata mapping.`;
  }

  if (prompt.includes('finish') || prompt.includes('slip') || prompt.includes('wet')) {
    return `${selectedProduct.code} is ${selectedProduct.finish}. For bathrooms and wet floors, keep matt or anti-slip finishes in the agent rules and prevent polished floor recommendations unless the sales team overrides.`;
  }

  if (prompt.includes('quantity') || prompt.includes('boq') || prompt.includes('wastage')) {
    return `Smart BOQ: ${quote.cartons.floors} floor cartons for ${floorProduct.code}, ${quote.cartons.walls} wall cartons for ${wallProduct.code}, plus adhesive, grout, trims, installation, and ${state.wastage}% wastage. Total estimate: QAR ${quote.total.toLocaleString()}.`;
  }

  if (prompt.includes('compare') || prompt.includes('side')) {
    return `Side-by-side mode should pin ${floorProduct.code} / ${wallProduct.code} against the compare SKU, preserve the split position, and save the visualizer link with both Roomvo asset IDs for client review.`;
  }

  if (prompt.includes('whatsapp') || prompt.includes('share') || prompt.includes('pdf')) {
    return `Ready-to-send summary: ${floorProduct.code} floors, ${wallProduct.code} walls, ${state.area.toLocaleString()} sq ft, ${state.wastage}% wastage, total QAR ${quote.total.toLocaleString()}. Attach the Roomvo render, PDF quote, and product page links.`;
  }

  if (prompt.includes('concept') || prompt.includes('mood') || prompt.includes('sku')) {
    const coordinated = products
      .filter((product) => product.id !== selectedProduct.id)
      .slice(0, 3)
      .map((product) => product.code)
      .join(', ');
    return `Concept-to-SKU result: start with ${selectedProduct.code} and offer coordinated alternatives ${coordinated}. The agent should rank by color, finish, room type, stock, price, and Roomvo visual match.`;
  }

  return `Current design uses ${floorProduct.code} on floors and ${wallProduct.code} on walls. The Roomvo-style payload is ready, and the AI layer can now quote, compare, explain finishes, and produce a sales-ready next step. Estimate: QAR ${quote.total.toLocaleString()}.`;
}
