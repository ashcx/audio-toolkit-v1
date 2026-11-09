import { loadCopy } from './lib/harness.mjs';

const copy = await loadCopy();

export async function setAppearance(page, value) {
  await page.getByRole('button', { name: copy.settings.open, exact: true }).click();
  await page.getByRole('dialog').getByText(copy.settings.themes[value], { exact: true }).click();
  await page.getByRole('button', { name: copy.settings.close, exact: true }).click();
}
export async function setSlider(page, label, value) {
  const slider=page.getByRole('slider',{name:label,exact:true});
  const min=Number(await slider.getAttribute('min')),max=Number(await slider.getAttribute('max')),step=Number(await slider.getAttribute('step'));
  if(value<min||value>max||!step)throw Error(`Unsupported slider value ${value}`);
  await slider.press('Home');
  for(let n=0;n<Math.round((value-min)/step);n++)await slider.press('ArrowRight');
  if(Math.abs(Number(await slider.inputValue())-value)>step/2)throw Error('Slider did not reach requested value');
}
export async function recipeAction(page, name) {
  const action=page.getByRole('button',{name,exact:true});
  if(!await action.isVisible()){
    const label=name.startsWith('Remove ')?name.slice(7):name.replace(/^Move /,'').replace(/ (up|down)$/,'');
    await page.getByRole('button',{name:copy.steps.moreActions(label),exact:true}).click();
  }
  return action;
}
/** Opens the Save menu only when it is closed, so asking for a second action never closes it again. */
export async function saveAction(page, name, role='button') {
  const action=page.getByRole(role,{name,exact:true});
  const menu=page.locator('.delivery-menu');
  if(await menu.count()&&!await menu.evaluate(element=>element.open))
    await page.getByRole('button',{name:copy.delivery.saveToDevice,exact:true}).click();
  return action;
}
