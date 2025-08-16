import dotenv from 'dotenv';
dotenv.config();

export const env = (key: string, fallback?: string) => {
  const v = process.env[key];
  if (v === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing env: ${key}`);
  }
  return v;
};
