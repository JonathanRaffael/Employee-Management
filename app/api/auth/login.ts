import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metode tidak diizinkan' });
  }

  const { email, password } = req.body;

  try {
    // Cari pengguna berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Jika pengguna tidak ditemukan
    if (!user) {
      return res.status(401).json({ message: 'Email tidak ditemukan' });
    }

    // Validasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Password salah!' });
    }

    // Jika login berhasil
    res.status(200).json({ message: 'Login berhasil!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan, coba lagi nanti.' });
  }
}
