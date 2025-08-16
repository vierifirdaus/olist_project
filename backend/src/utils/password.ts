import bcrypt from 'bcryptjs';

export const hashPassword = async (raw: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(raw, salt);
};

export const verifyPassword = (raw: string, hash: string) =>
  bcrypt.compare(raw, hash);