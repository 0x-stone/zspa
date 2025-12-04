export function validateZcashAddress(address: string): boolean {
  if (!address) return false;
  
  // Zcash shielded addresses start with 'z' and are at least 78 characters
  return address.startsWith('z') && address.length >= 78;
}

export function validateUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

