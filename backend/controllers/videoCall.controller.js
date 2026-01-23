const { supabase } = require('../config/supabase');
const videoCallService = require('../services/videoCall.service');
const jitsiTokenService = require('../services/jitsiToken.service');

/**
 * Generate token for video call
 */
const generateVideoCallToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, channelName } = req.body;

    if (!conversationId && !channelName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either conversationId or channelName is required'
      });
    }

    // If conversationId provided, verify user has access
    if (conversationId) {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('id, candidate_id, recruiter_id')
        .eq('id', conversationId)
        .single();

      if (error || !conversation) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Conversation not found'
        });
      }

      // Verify user is part of this conversation
      if (conversation.candidate_id !== userId && conversation.recruiter_id !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this conversation'
        });
      }
    }

    // Generate channel name if not provided
    const channel = channelName || `interview-${conversationId}`;

    // Generate token (valid for 1 hour)
    const tokenData = videoCallService.generateToken(channel, 0, 'publisher', 3600);

    res.json({
      success: true,
      data: tokenData
    });

  } catch (error) {
    console.error('Generate video call token error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to generate video call token'
    });
  }
};

/**
 * Start a video call and update conversation
 */
const startVideoCall = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'conversationId is required'
      });
    }

    // Verify conversation exists and user has access
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, candidate_id, recruiter_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found'
      });
    }

    // Verify user is part of this conversation
    if (conversation.candidate_id !== userId && conversation.recruiter_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this conversation'
      });
    }

    const channelName = `interview-${conversationId}`;

    // Generate token
    const tokenData = videoCallService.generateToken(channelName, 0, 'publisher', 3600);

    // Create video call record
    const { data: videoCall, error: callError } = await supabase
      .from('video_calls')
      .insert({
        conversation_id: conversationId,
        channel_name: channelName,
        initiated_by: userId,
        status: 'ongoing',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (callError) {
      console.error('Error creating video call record:', callError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create video call record'
      });
    }

    res.json({
      success: true,
      data: {
        videoCall,
        token: tokenData
      }
    });

  } catch (error) {
    console.error('Start video call error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to start video call'
    });
  }
};

/**
 * End a video call
 */
const endVideoCall = async (req, res) => {
  try {
    const userId = req.user.id;
    const { callId } = req.params;

    // Get video call
    const { data: videoCall, error: callError } = await supabase
      .from('video_calls')
      .select('*, conversation:conversations(candidate_id, recruiter_id)')
      .eq('id', callId)
      .single();

    if (callError || !videoCall) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Video call not found'
      });
    }

    // Verify user is part of this call
    if (videoCall.conversation.candidate_id !== userId &&
      videoCall.conversation.recruiter_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this video call'
      });
    }

    // Update video call status
    const { error: updateError } = await supabase
      .from('video_calls')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', callId);

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      message: 'Video call ended successfully'
    });

  } catch (error) {
    console.error('End video call error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to end video call'
    });
  }
};

/**
 * Get video call history for a conversation
 */
const getVideoCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Verify conversation exists and user has access
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, candidate_id, recruiter_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found'
      });
    }

    if (conversation.candidate_id !== userId && conversation.recruiter_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this conversation'
      });
    }

    // Get video call history
    const { data: calls, error: callsError } = await supabase
      .from('video_calls')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('started_at', { ascending: false });

    if (callsError) {
      throw callsError;
    }

    res.json({
      success: true,
      data: calls || []
    });

  } catch (error) {
    console.error('Get video call history error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to get video call history'
    });
  }
};

/**
 * Schedule an interview (for recruiters)
 */
const scheduleInterview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, scheduledAt, title, description } = req.body;

    if (!conversationId || !scheduledAt) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'conversationId and scheduledAt are required'
      });
    }

    // Verify conversation exists and user is the recruiter
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, candidate_id, recruiter_id, job:jobs(id, job_title)')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found'
      });
    }

    // Only recruiters can schedule interviews
    if (conversation.recruiter_id !== userId) {
      console.log(`Forbidden Schedule: Conversation Recruiter ${conversation.recruiter_id} vs User ${userId}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only recruiters can schedule interviews'
      });
    }

    const channelName = `int-${conversation.id.substring(0, 8)}-${Date.now()}`;

    // Create scheduled interview record
    const { data: interview, error: interviewError } = await supabase
      .from('video_calls')
      .insert({
        conversation_id: conversationId,
        channel_name: channelName,
        initiated_by: userId,
        scheduled_by: userId,
        scheduled_at: scheduledAt,
        interview_title: title || `Interview for ${conversation.job?.job_title || 'Position'}`,
        interview_description: description,
        status: 'scheduled'
      })
      .select()
      .single();

    if (interviewError) {
      console.error('Error creating scheduled interview:', interviewError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to schedule interview'
      });
    }

    res.json({
      success: true,
      data: interview,
      message: 'Interview scheduled successfully'
    });

  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to schedule interview'
    });
  }
};

/**
 * Get scheduled interviews for a user
 */
const getScheduledInterviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { supabaseAdmin } = require('../config/supabase');

    // Get all scheduled interviews for user's conversations
    // Using supabaseAdmin to bypass RLS issues
    const { data: interviews, error } = await supabaseAdmin
      .from('video_calls')
      .select(`
        *,
        conversation:conversations (
          id,
          candidate_id,
          recruiter_id
        )
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Supabase getScheduledInterviews Error:', error);
      throw error;
    }

    console.log(`Found ${interviews?.length} scheduled interviews`);

    // Filter in memory to ensure security
    const userInterviews = interviews?.filter(i =>
      i.conversation && (
        i.conversation.candidate_id === userId ||
        i.conversation.recruiter_id === userId
      )
    ) || [];

    console.log(`Filtered to ${userInterviews.length} interviews for user ${userId}`);

    // Return in the structure frontend expects
    res.json({
      success: true,
      data: {
        interviews: userInterviews
      }
    });

  } catch (error) {
    console.error('Get scheduled interviews error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to get scheduled interviews'
    });
  }
};

/**
 * Cancel a scheduled interview
 */
const cancelScheduledInterview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { interviewId } = req.params;

    // Get interview
    const { data: interview, error: getError } = await supabase
      .from('video_calls')
      .select('*, conversation:conversations(candidate_id, recruiter_id)')
      .eq('id', interviewId)
      .single();

    if (getError || !interview) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Interview not found'
      });
    }

    // Only the recruiter who scheduled it or participant can cancel
    if (interview.conversation.candidate_id !== userId &&
      interview.conversation.recruiter_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to cancel this interview'
      });
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('video_calls')
      .update({ status: 'cancelled' })
      .eq('id', interviewId);

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      message: 'Interview cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel interview error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to cancel interview'
    });
  }
};

/**
 * Generate Jitsi token (JWT) for recruiter or candidate
 */
const generateJitsiToken = async (req, res) => {
  try {
    const { roomName, displayName, email, isModerator = false, ttlSeconds = 3600 } = req.body;

    if (!roomName || !displayName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'roomName and displayName are required'
      });
    }

    const tokenData = jitsiTokenService.generateJitsiToken({
      roomName,
      userName: displayName,
      userEmail: email,
      isModerator,
      ttlSeconds
    });

    res.json({
      success: true,
      data: tokenData
    });
  } catch (error) {
    console.error('Generate Jitsi token error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to generate Jitsi token'
    });
  }
};

module.exports = {
  generateVideoCallToken,
  startVideoCall,
  endVideoCall,
  getVideoCallHistory,
  scheduleInterview,
  getScheduledInterviews,
  cancelScheduledInterview,
  generateJitsiToken
};
