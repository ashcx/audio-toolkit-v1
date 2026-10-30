import type { SpeechModel, SpeechProcessor } from './speech';
import gtcrnWasm from '@sapphi-red/gtcrn-wasm/gtcrn.wasm?url';
import deepFilterWasm from '@lofcz/deepfilternet-web/df_bg.wasm?url';

export async function createSpeechProcessor(model: SpeechModel): Promise<SpeechProcessor> {
  if (model === 'standard') {
    const { GtcrnProcessor, loadGtcrnModule } = await import('@sapphi-red/gtcrn-wasm');
    const response = await fetch(gtcrnWasm);
    if (!response.ok) throw new Error('The Standard voice model could not be loaded. Retry when the app assets are available.');
    return new GtcrnProcessor(await loadGtcrnModule({ wasmBinary: await response.arrayBuffer() }));
  }
  const { DeepFilter } = await import('@lofcz/deepfilternet-web');
  return DeepFilter.create({ wasmUrl: deepFilterWasm });
}
