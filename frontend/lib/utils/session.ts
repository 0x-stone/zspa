import { v4 as uuidv4 } from 'uuid';

const SESSION_ID_KEY = 'session_id';
const USER_INTERESTS_KEY = 'user_interests';
const REFUND_ADDRESS_KEY = 'refund_address';

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function getUserInterests(): string[] {
  if (typeof window === 'undefined') return [];
  
  const interests = localStorage.getItem(USER_INTERESTS_KEY);
  return interests ? JSON.parse(interests) : [];
}

export function setUserInterests(interests: string[]): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(USER_INTERESTS_KEY, JSON.stringify(interests));
}

export function getRefundAddress(): string | null {
  if (typeof window === 'undefined') return null;
  
  return localStorage.getItem(REFUND_ADDRESS_KEY);
}

export function setRefundAddress(address: string): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(REFUND_ADDRESS_KEY, address);
}

export function isOnboarded(): boolean {
  if (typeof window === 'undefined') return false;
  
  const interests = getUserInterests();
  const address = getRefundAddress();
  
  return interests.length > 0 && address !== null;
}

