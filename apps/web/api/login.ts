import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock JWT token generation
function generateToken(userId: string, email: string, role: string) {
  return Buffer.from(JSON.stringify({ sub: userId, email, role, exp: Date.now() + 3600000 })).toString('base64');
}

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
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
        error: 'Bad Request',
      });
    }

    // Mock authentication - accept any email/password
    const userId = `user_${Date.now()}`;
    const role = email.includes('admin') ? 'ADMIN' : 'CUSTOMER';

    const accessToken = generateToken(userId, email, role);
    const refreshToken = generateToken(userId, email, role);

    return res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
        firstName: 'Demo',
        lastName: 'User',
        role,
        phoneNumber: '+1234567890',
        isActive: true,
        isEmailVerified: true,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Login failed',
      error: error.message,
    });
  }
}
