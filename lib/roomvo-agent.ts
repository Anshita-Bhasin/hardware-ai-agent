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
    const alternative = products.find((product) => product.surface === selectedProduct.surface && product.id !== selectedProduct.id && product.stock > selectedProduct.stock);
    return `${selectedProduct.title} (${selectedProduct.code}) is available now with ${selectedProduct.stock} units shown in stock. ${alternative ? `For a faster or larger order, ${alternative.title} (${alternative.code}) is the closest high-stock alternative.` : 'I can include it in your quote now.'}`;
  }

  if (prompt.includes('finish') || prompt.includes('slip') || prompt.includes('wet')) {
    return `${selectedProduct.title} has a ${selectedProduct.finish.toLowerCase()} finish. For this living area it will control glare and stay easy to maintain. For wet zones, I would keep the floor matt or anti-slip and use polished finishes only on walls.`;
  }

  if (prompt.includes('quantity') || prompt.includes('boq') || prompt.includes('wastage')) {
    return `For ${state.area} m², allow ${quote.cartons.floors} floor cartons of ${floorProduct.code} and ${quote.cartons.walls} wall cartons of ${wallProduct.code}. That includes ${state.wastage}% wastage, adhesive, grout, trims and estimated installation. Your current total is QAR ${quote.total.toLocaleString()}.`;
  }

  if (prompt.includes('compare') || prompt.includes('side')) {
    const compareProduct = findProduct(state.compareProductId);
    const saving = Math.abs(selectedProduct.price - compareProduct.price) * state.area;
    const valueWinner = selectedProduct.price <= compareProduct.price ? selectedProduct : compareProduct;
    return `${selectedProduct.title} feels ${selectedProduct.finish.toLowerCase()} and costs QAR ${selectedProduct.price.toFixed(2)}/m²; ${compareProduct.title} is ${compareProduct.finish.toLowerCase()} at QAR ${compareProduct.price.toFixed(2)}/m². ${valueWinner.title} is the value choice, with an estimated material difference of QAR ${Math.round(saving).toLocaleString()} for this room.`;
  }

  if (prompt.includes('whatsapp') || prompt.includes('share') || prompt.includes('pdf')) {
    return `Your design is ready to share: ${floorProduct.title} floors, ${wallProduct.title} walls, ${state.area.toLocaleString()} m², ${state.wastage}% wastage, estimated total QAR ${quote.total.toLocaleString()}. Use “Get my quote” and I’ll package the selection for WhatsApp follow-up.`;
  }

  if (prompt.includes('concept') || prompt.includes('mood') || prompt.includes('sku') || prompt.includes('recommend')) {
    return `For a warm minimal look, I recommend ${floorProduct.title} on the floor with ${wallProduct.title} on the main wall. The tones stay coordinated without looking flat, both finishes are practical for daily use, and both products are available. Your estimated installed total is QAR ${quote.total.toLocaleString()}.`;
  }

  if (prompt.includes('budget') || prompt.includes('cheaper') || prompt.includes('value')) {
    const valueFloor = products.filter((product) => product.surface === 'floors').sort((a, b) => a.price - b.price)[0];
    const valueWall = products.filter((product) => product.surface === 'walls').sort((a, b) => a.price - b.price)[0];
    const valueQuote = createQuote({ ...state, floorProductId: valueFloor.id, wallProductId: valueWall.id });
    return `The strongest value pairing is ${valueFloor.title} with ${valueWall.title}. It keeps the warm neutral direction and brings the estimated total to QAR ${valueQuote.total.toLocaleString()}, about QAR ${Math.max(0, quote.total - valueQuote.total).toLocaleString()} below the current design.`;
  }

  return `Your current combination is ${floorProduct.title} with ${wallProduct.title}. It is coordinated, practical and available, with an estimated total of QAR ${quote.total.toLocaleString()}. Tell me whether you want warmer, lighter, more dramatic, or lower-cost options and I’ll narrow it down.`;
}
