export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
  return 'Copied';
}

export async function saveJson(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return 'Downloaded';
}
