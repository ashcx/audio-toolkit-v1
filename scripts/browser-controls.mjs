export async function setAppearance(page, value) {
  const label = value[0].toUpperCase() + value.slice(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('dialog').getByText(label, { exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
}
