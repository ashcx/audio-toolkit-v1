export async function setAppearance(page, value) {
  const label = value[0].toUpperCase() + value.slice(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('dialog').getByText(label, { exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
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
    await page.getByRole('button',{name:`More actions for ${label}`,exact:true}).click();
  }
  return action;
}
export async function saveAction(page, name, role='button') {
  const action=page.getByRole(role,{name,exact:true});
  if(!await action.isVisible())await page.getByRole('button',{name:'Save to device',exact:true}).click();
  return action;
}
