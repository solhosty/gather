import { Share } from 'react-native';

// No clipboard module is in the development build, so the native share sheet
// (which includes Copy) is used for both actions.
export async function copyText(text: string) {
  const result = await Share.share({ message: text });
  return result.action === Share.sharedAction ? 'Shared' : 'Not shared';
}

export async function saveJson(filename: string, data: unknown) {
  const result = await Share.share({ title: filename, message: JSON.stringify(data, null, 2) });
  return result.action === Share.sharedAction ? 'Shared' : 'Not shared';
}
