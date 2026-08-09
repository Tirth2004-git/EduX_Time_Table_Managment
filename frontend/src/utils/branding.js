export const UNIVERSITY_BRANDING = {
  logoUrl:
    'https://images.seeklogo.com/logo-png/43/1/parul-university-logo-png_seeklogo-432665.png',
  universityName: 'Parul University',
  facultyName: 'Faculty of Engineering & Technology',
};

export async function fetchImageAsDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load image: ${url}`);

  const blob = await res.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Failed to read image: ${url}`));
    reader.readAsDataURL(blob);
  });
}
