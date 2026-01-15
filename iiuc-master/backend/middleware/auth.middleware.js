const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Verify JWT token from request headers
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Check if user has specific role
 */
const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
      }

      // Get user profile with role
      let { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      // If profile doesn't exist, create it automatically
      if (error || !profile) {
        console.log(`Profile not found for user ${req.user.id}, creating automatically...`);

        // Determine role from user metadata or default to candidate
        const userRole = req.user.user_metadata?.role || req.user.app_metadata?.role || 'candidate';

        // Create the profile
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: req.user.id,
            email: req.user.email,
            full_name: req.user.user_metadata?.full_name || req.user.email?.split('@')[0],
            role: userRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('role')
          .single();

        if (createError) {
          console.error('Failed to create profile:', createError);
          return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create user profile'
          });
        }

        profile = newProfile;
        console.log(`✅ Profile created for user ${req.user.id} with role: ${userRole}`);
      }

      if (!roles.includes(profile.role)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Access denied. Required role: ${roles.join(' or ')}`
        });
      }

      req.userRole = profile.role;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authorization failed'
      });
    }
  };
};

/**
 * Optional authentication - attaches user if token is valid, but doesn't error if missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (user && !error) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Just ignore error and proceed as guest
    next();
  }
};

module.exports = { authenticate, authorize, optionalAuth };

