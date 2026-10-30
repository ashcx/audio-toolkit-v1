import test from 'node:test';
import assert from 'node:assert/strict';
import {presetRecipe,PRESETS} from '../src/presets.ts';
import {newRecipe,newStep,recipeSchema} from '../src/recipe.ts';
test('editable presets match names and preserve conversion trim identity',()=>{
 const trim={...newStep('trim'),range:{start:.25,end:.75}},current={...newRecipe(),steps:[trim,newStep('gain')]};
 for(const preset of Object.keys(PRESETS)){const recipe=recipeSchema.parse(presetRecipe(preset,current));assert.equal(recipe.export.format,preset==='original'?'original':'mp3');if(preset==='original')assert.equal(recipe.steps.length,0);else assert.equal(recipe.steps[0].id,trim.id);if(preset==='speech'){assert.equal(recipe.export.bitrateKbps,128);assert.equal(recipe.steps.find(step=>step.kind==='channels').channels,'mono');}else if(preset!=='original')assert.equal(recipe.export.bitrateKbps,192);if(preset==='speech'||preset==='voice')assert.equal(recipe.steps.find(step=>step.kind==='normalize').targetDbfs,-1);if(preset==='voice'||preset==='karaoke')assert.equal(recipe.steps.find(step=>step.kind==='isolation').keep,preset==='voice'?'voice':'music');}
});
