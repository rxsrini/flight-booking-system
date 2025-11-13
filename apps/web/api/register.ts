import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password, firstName, lastName, role, phoneNumber } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        message: 'Missing required fields',
        error: 'Bad Request',
      });
    }

    // Mock successful registration
    const user = {
      id: `user_${Date.now()}`,
      email,
      firstName,
      lastName,
      role,
      phoneNumber: phoneNumber || '',
      isActive: true,
      isEmailVerified: false,
      createdAt: new Date().toISOString(),
    };

    return res.status(201).json(user);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Registration failed',
      error: error.message,
    });
  }
}
