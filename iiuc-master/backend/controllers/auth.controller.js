const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Sign up new user
 */
const signup = async (req, res) => {
  try {
    const { email, password, fullName, role } = req.validatedData;

    // Create auth user with auto-confirm enabled via metadata if supported,
    // or just rely on Supabase project settings. 
    // To "bypass" email verification in code, we usually need to disable "Confirm Email" in Supabase Dashboard.
    // However, if we want to allow immediate login, we can try to sign them in right after.

    // Use Admin API to create user with email_confirm: true
    // This bypasses the need for email verification, which is often problematic in dev
    // or when email service is not configured.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: fullName,
        role: role
      }
    });

    if (authError) {
      console.error('Signup error:', authError);
      return res.status(400).json({
        error: 'Signup Failed',
        message: authError.message
      });
    }

    // Since we auto-confirmed, we can just return success.
    // However, admin.createUser does NOT return a session.
    // We need to sign in manually or just let the frontend redirect to login.
    // For seamless experience, we can try to sign in the user immediately.

    // Attempt fast login to get session tokens
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // If login works, we have a session. If not, authData still has user info.
    const session = signInData?.session || null;
    const user = authData.user;

    // Create profile using admin client to bypass RLS
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        role: role,
        full_name: fullName,
        email: email
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail the whole request if profile fails, but log it.
      // Ideally we should rollback auth user here.
    }

    // Create role-specific profile with REQUIRED default fields
    // We use empty strings to satisfy NOT NULL constraints without showing dummy text to the user
    if (role === 'recruiter') {
      await supabaseAdmin.from('recruiter_profiles').insert({
        user_id: user.id,
        company_name: '',
        country: '',
        city: ''
      });
    } else if (role === 'candidate') {
      await supabaseAdmin.from('candidate_profiles').insert({
        user_id: user.id,
        country: '',
        city: ''
      });
    }

    // Return success with or without session
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        role: role,
        fullName: fullName
      },
      session: session // Will be present thanks to our auto-login attempt
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create user'
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.validatedData;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        error: 'Login Failed',
        message: error.message
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    res.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role || data.user.user_metadata?.role,
        fullName: profile?.full_name || data.user.user_metadata?.full_name
      },
      session: data.session
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await supabase.auth.signOut(token);
    }

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to logout'
    });
  }
};

/**
 * Get current user
 */
const getCurrentUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(404).json({
        error: 'Profile Not Found',
        message: 'User profile does not exist'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: profile.role,
        fullName: profile.full_name,
        phoneNumber: profile.phone_number,
        profilePictureUrl: profile.profile_picture_url
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user'
    });
  }
};

/**
 * Verify email with token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Missing Token',
        message: 'Verification token is required'
      });
    }

    // Verify the email with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'signup'
    });

    if (error) {
      return res.status(400).json({
        error: 'Verification Failed',
        message: error.message
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    res.json({
      message: 'Email verified successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role,
        fullName: profile?.full_name
      },
      session: data.session
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify email'
    });
  }
};

module.exports = {
  signup,
  login,
  logout,
  getCurrentUser,
  verifyEmail
};

