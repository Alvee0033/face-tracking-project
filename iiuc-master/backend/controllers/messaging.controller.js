const { supabase, supabaseAdmin } = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

/**
 * Send a message in a conversation
 */
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { content, message_type = 'text' } = req.body;

    console.log('📨 Send message request:', { userId, conversationId, contentLength: content?.length });

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Message content is required'
      });
    }

    // Get the user's JWT token
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token is required'
      });
    }

    // Create a Supabase client with the user's JWT token
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get conversation and verify user has access
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('conversations')
      .select(`
        id,
        recruiter_id,
        candidate_id,
        is_initiated,
        recruiter:recruiter_profiles!conversations_recruiter_id_fkey(
          id,
          user_id
        ),
        candidate:candidate_profiles!conversations_candidate_id_fkey(
          id,
          user_id
        )
      `)
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      console.error('❌ Conversation fetch error:', conversationError);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found'
      });
    }

    console.log('✅ Conversation found:', {
      id: conversation.id,
      isInitiated: conversation.is_initiated,
      hasRecruiter: !!conversation.recruiter,
      hasCandidate: !!conversation.candidate
    });

    // Validate that recruiter and candidate profiles exist
    if (!conversation.recruiter || !conversation.candidate) {
      console.error('❌ Missing profile data in sendMessage:', {
        hasRecruiter: !!conversation.recruiter,
        hasCandidate: !!conversation.candidate
      });
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Conversation data is incomplete'
      });
    }

    // Determine sender type and verify access
    let senderType;
    let senderId;

    if (conversation.recruiter.user_id === userId) {
      senderType = 'recruiter';
      senderId = conversation.recruiter_id;
      console.log('👤 Sender is recruiter');
    } else if (conversation.candidate.user_id === userId) {
      senderType = 'candidate';
      senderId = conversation.candidate_id;
      console.log('👤 Sender is candidate');

      // Candidates can only send if conversation is initiated
      if (!conversation.is_initiated) {
        console.warn('⚠️ Candidate trying to send before conversation is initiated');
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Cannot send message. Recruiter must initiate the conversation first.'
        });
      }
    } else {
      console.error('❌ User not part of conversation');
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to send messages in this conversation'
      });
    }

    // Create message using user's JWT token for RLS
    const messageData = {
      conversation_id: conversationId,
      sender_type: senderType,
      sender_id: senderId,
      message_type,
      content: content.trim(),
      is_read: false
    };

    console.log('💾 Creating message:', messageData);

    const { data: message, error: messageError } = await userSupabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (messageError) {
      console.error('❌ Send message error:', messageError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to send message',
        details: messageError.message
      });
    }

    console.log('✅ Message created:', message.id);

    // Update conversation metadata
    const conversationUpdate = {
      last_message_at: new Date().toISOString(),
      last_message_content: content.trim().substring(0, 100) // Limit to 100 chars
    };

    // If this is the recruiter's first message, mark conversation as initiated
    if (senderType === 'recruiter' && !conversation.is_initiated) {
      conversationUpdate.is_initiated = true;
      conversationUpdate.initiated_by_recruiter = true;
      console.log('🚀 Initiating conversation (recruiter first message)');
    }

    const { error: updateError } = await userSupabase
      .from('conversations')
      .update(conversationUpdate)
      .eq('id', conversationId);

    if (updateError) {
      console.error('⚠️ Error updating conversation metadata:', updateError);
      // Don't fail the request, message was already sent successfully
    } else {
      console.log('✅ Conversation metadata updated');
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send message',
      details: error.message
    });
  }
};


/**
 * Get all messages in a conversation
 */
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    console.log('📬 Get messages request:', { userId, conversationId, limit, offset });

    // Get conversation and verify user has access
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('conversations')
      .select(`
        id,
        recruiter:recruiter_profiles!conversations_recruiter_id_fkey(
          id,
          user_id
        ),
        candidate:candidate_profiles!conversations_candidate_id_fkey(
          id,
          user_id
        )
      `)
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      // Silent fail for polling - conversation might not exist yet
      if (conversationError?.code === 'PGRST116') {
        console.log('ℹ️ Conversation not found (polling):', conversationId);
        return res.status(404).json({
          error: 'Not Found',
          message: 'Conversation not found'
        });
      }
      console.error('❌ Conversation fetch error in getMessages:', conversationError);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found'
      });
    }

    // Validate that recruiter and candidate profiles exist
    if (!conversation.recruiter || !conversation.candidate) {
      console.error('❌ Missing profile data in getMessages:', {
        hasRecruiter: !!conversation.recruiter,
        hasCandidate: !!conversation.candidate
      });
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Conversation data is incomplete'
      });
    }

    // Verify user has access to this conversation
    const hasAccess =
      conversation.recruiter.user_id === userId ||
      conversation.candidate.user_id === userId;

    if (!hasAccess) {
      console.error('❌ Access denied in getMessages');
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this conversation'
      });
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (messagesError) {
      console.error('❌ Get messages error:', messagesError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch messages'
      });
    }

    // Get total count
    const { count, error: countError } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    console.log('✅ Messages fetched:', { count: messages?.length || 0, total: count || 0 });

    res.status(200).json({
      success: true,
      messages: messages || [],
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch messages',
      details: error.message
    });
  }
};


/**
 * Mark messages as read
 */
const markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { messageIds } = req.body;

    console.log('👁️ Mark messages as read:', { userId, conversationId, messageCount: messageIds?.length || 0 });

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'Bad Request', message: 'messageIds must be an array' });
    }

    const validMessageIds = messageIds.filter(id => id);
    if (validMessageIds.length === 0) {
      console.log('ℹ️ No valid messages to mark as read');
      return res.status(200).json({ success: true, message: 'No messages to mark as read', count: 0 });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication token is required' });
    }

    const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('conversations')
      .select(`
        id, recruiter_id, candidate_id,
        recruiter:recruiter_profiles!conversations_recruiter_id_fkey(id, user_id),
        candidate:candidate_profiles!conversations_candidate_id_fkey(id, user_id)
      `)
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      console.error('❌ Conversation fetch error in markMessagesAsRead:', conversationError);
      return res.status(404).json({ error: 'Not Found', message: 'Conversation not found' });
    }

    if (!conversation.recruiter || !conversation.candidate) {
      console.error('❌ Missing profile data in markMessagesAsRead:', {
        hasRecruiter: !!conversation.recruiter,
        hasCandidate: !!conversation.candidate,
        conversationId
      });
      return res.status(500).json({ error: 'Internal Server Error', message: 'Conversation data is incomplete' });
    }

    let userType;
    if (conversation.recruiter.user_id === userId) {
      userType = 'recruiter';
    } else if (conversation.candidate.user_id === userId) {
      userType = 'candidate';
    } else {
      console.error('❌ Access denied in markMessagesAsRead');
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to access this conversation' });
    }

    const otherSenderType = userType === 'recruiter' ? 'candidate' : 'recruiter';
    console.log('💾 Marking messages as read:', { userType, otherSenderType, count: validMessageIds.length });

    const { data: updatedMessages, error: updateError } = await userSupabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('sender_type', otherSenderType)
      .eq('is_read', false)
      .in('id', validMessageIds)
      .select('id');

    if (updateError) {
      console.error('❌ Mark messages as read error:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to mark messages as read',
        details: updateError.message
      });
    }

    const count = updatedMessages?.length || 0;
    console.log('✅ Messages marked as read:', count);

    res.status(200).json({ success: true, message: 'Messages marked as read', count });
  } catch (error) {
    console.error('❌ Mark messages as read CATCH error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark messages as read',
      details: error.message
    });
  }
};


/**
 * Get conversation details
 */
const getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    console.log('💬 Get conversation request:', { userId, conversationId });

    // Get conversation with full details
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('conversations')
      .select(`
        *,
        recruiter:recruiter_profiles!conversations_recruiter_id_fkey(
          id,
          user_id,
          company_name,
          company_logo_url,
          profile:profiles!recruiter_profiles_user_id_fkey(
            full_name,
            email,
            profile_picture_url
          )
        ),
        candidate:candidate_profiles!conversations_candidate_id_fkey(
          id,
          user_id,
          headline,
          current_job_title,
          current_company,
          profile:profiles!candidate_profiles_user_id_fkey(
            full_name,
            email,
            profile_picture_url
          )
        ),
        job:jobs(
          id,
          job_title,
          department,
          company_name
        ),
        application:job_applications(
          id,
          status
        )
      `)
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      console.error('❌ Conversation fetch error in getConversation:', conversationError);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found'
      });
    }

    // Validate that recruiter and candidate profiles exist
    if (!conversation.recruiter || !conversation.candidate) {
      console.error('❌ Missing profile data in getConversation:', {
        hasRecruiter: !!conversation.recruiter,
        hasCandidate: !!conversation.candidate
      });
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Conversation data is incomplete'
      });
    }

    // Verify user has access to this conversation
    const hasAccess =
      conversation.recruiter.user_id === userId ||
      conversation.candidate.user_id === userId;

    if (!hasAccess) {
      console.error('❌ Access denied in getConversation');
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this conversation'
      });
    }

    console.log('✅ Conversation details fetched');

    res.status(200).json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('❌ Get conversation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch conversation',
      details: error.message
    });
  }
};

/**
 * Initiate a call (recruiter only)
 */
const initiateCall = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Get the user's JWT token
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    // Create a Supabase client with the user's JWT token
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get recruiter profile
    const { data: recruiterProfile, error: recruiterError } = await supabase
      .from('recruiter_profiles')
      .select('id, user_id')
      .eq('user_id', userId)
      .single();

    if (recruiterError || !recruiterProfile) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only recruiters can initiate calls'
      });
    }

    // Verify conversation exists and belongs to recruiter
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, recruiter_id')
      .eq('id', conversationId)
      .eq('recruiter_id', recruiterProfile.id)
      .single();

    if (conversationError || !conversation) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found'
      });
    }

    // Create call record using user's JWT token for RLS
    const callData = {
      conversation_id: conversationId,
      caller_type: 'recruiter',
      caller_id: recruiterProfile.id,
      status: 'initiated'
    };

    const { data: call, error: callError } = await userSupabase
      .from('calls')
      .insert(callData)
      .select()
      .single();

    if (callError) {
      console.error('Initiate call error:', callError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to initiate call'
      });
    }

    res.status(201).json({
      message: 'Call initiated successfully',
      call
    });
  } catch (error) {
    console.error('Initiate call error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to initiate call'
    });
  }
};

/**
 * Update call status
 */
const updateCallStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { callId } = req.params;
    const { status, notes } = req.body;

    // Get the user's JWT token
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    // Create a Supabase client with the user's JWT token
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get call with conversation details
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select(`
        *,
        conversation:conversations(
          recruiter:recruiter_profiles!conversations_recruiter_id_fkey(
            user_id
          ),
          candidate:candidate_profiles!conversations_candidate_id_fkey(
            user_id
          )
        )
      `)
      .eq('id', callId)
      .single();

    if (callError || !call) {
      console.error('Call fetch error in updateCallStatus:', callError);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Call not found'
      });
    }

    // Validate that conversation and profiles exist
    if (!call.conversation || !call.conversation.recruiter || !call.conversation.candidate) {
      console.error('Missing data in updateCallStatus:', {
        hasConversation: !!call.conversation,
        hasRecruiter: !!call.conversation?.recruiter,
        hasCandidate: !!call.conversation?.candidate
      });
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Call data is incomplete'
      });
    }

    // Verify user has access
    const hasAccess =
      call.conversation.recruiter.user_id === userId ||
      call.conversation.candidate.user_id === userId;

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this call'
      });
    }

    // Prepare update data
    const updateData = { status };

    if (status === 'ongoing' && !call.answered_at) {
      updateData.answered_at = new Date().toISOString();
    }

    if (['completed', 'missed', 'declined'].includes(status) && !call.ended_at) {
      updateData.ended_at = new Date().toISOString();

      // Calculate duration if call was answered
      if (call.answered_at) {
        const startTime = new Date(call.answered_at).getTime();
        const endTime = new Date().getTime();
        updateData.duration_seconds = Math.floor((endTime - startTime) / 1000);
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update call using user's JWT token for RLS
    const { data: updatedCall, error: updateError } = await userSupabase
      .from('calls')
      .update(updateData)
      .eq('id', callId)
      .select()
      .single();

    if (updateError) {
      console.error('Update call error:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update call'
      });
    }

    res.status(200).json({
      message: 'Call updated successfully',
      call: updatedCall
    });
  } catch (error) {
    console.error('Update call error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update call'
    });
  }
};

/**
 * Get call history for a conversation
 */
const getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Get conversation and verify user has access
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        id,
        recruiter:recruiter_profiles!conversations_recruiter_id_fkey(
          user_id
        ),
        candidate:candidate_profiles!conversations_candidate_id_fkey(
          user_id
        )
      `)
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      console.error('Conversation fetch error in getCallHistory:', conversationError);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Conversation not found'
      });
    }

    // Validate that recruiter and candidate profiles exist
    if (!conversation.recruiter || !conversation.candidate) {
      console.error('Missing profile data in getCallHistory:', {
        hasRecruiter: !!conversation.recruiter,
        hasCandidate: !!conversation.candidate
      });
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Conversation data is incomplete'
      });
    }

    // Verify user has access
    const hasAccess =
      conversation.recruiter.user_id === userId ||
      conversation.candidate.user_id === userId;

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this conversation'
      });
    }

    // Get call history
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('started_at', { ascending: false });

    if (callsError) {
      console.error('Get call history error:', callsError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch call history'
      });
    }

    res.status(200).json({
      calls: calls || [],
      total: calls?.length || 0
    });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch call history'
    });
  }
};


/**
 * Get all conversations for a candidate
 */
const getCandidateConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('📋 Get candidate conversations request:', { userId });

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      console.error('❌ Candidate profile not found:', candidateError);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Get all conversations for this candidate with recruiter and job details
    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from('conversations')
      .select(`
        id,
        is_initiated,
        last_message_at,
        last_message_content,
        candidate_unread_count,
        created_at,
        recruiter:recruiter_profiles!conversations_recruiter_id_fkey(
          id,
          user_id,
          company_name,
          profile:profiles!recruiter_profiles_user_id_fkey(
            full_name,
            email,
            profile_picture_url
          )
        ),
        job:jobs(
          id,
          job_title,
          department,
          country,
          city
        ),
        application:job_applications!conversations_application_id_fkey(
          id,
          status,
          applied_at
        )
      `)
      .eq('candidate_id', candidateProfile.id)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (conversationsError) {
      console.error('❌ Get candidate conversations error:', conversationsError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch conversations',
        details: conversationsError.message
      });
    }

    console.log('✅ Candidate conversations fetched:', conversations?.length || 0);

    res.status(200).json({
      success: true,
      conversations: conversations || []
    });
  } catch (error) {
    console.error('❌ Get candidate conversations error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch conversations',
      details: error.message
    });
  }
};

/**
 * Get all conversations for a recruiter (OPTIMIZED)
 */
const getRecruiterConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    console.log('📋 Get recruiter conversations request:', { userId, limit, offset });

    // Get recruiter profile
    const { data: recruiterProfile, error: recruiterError } = await supabaseAdmin
      .from('recruiter_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (recruiterError || !recruiterProfile) {
      console.error('❌ Recruiter profile not found:', recruiterError);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recruiter profile not found'
      });
    }

    // OPTIMIZED: Fetch only essential fields with limited pagination
    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from('conversations')
      .select(`
        id,
        is_initiated,
        initiated_by_recruiter,
        last_message_at,
        last_message_content,
        recruiter_unread_count,
        created_at,
        candidate:candidate_profiles!conversations_candidate_id_fkey(
          id,
          profile:profiles!candidate_profiles_user_id_fkey(
            full_name,
            profile_picture_url
          )
        ),
        job:jobs(
          id,
          job_title
        ),
        application:job_applications!conversations_application_id_fkey(
          id,
          status
        )
      `)
      .eq('recruiter_id', recruiterProfile.id)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (conversationsError) {
      console.error('❌ Get recruiter conversations error:', conversationsError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch conversations',
        details: conversationsError.message
      });
    }

    console.log('✅ Recruiter conversations fetched:', conversations?.length || 0);

    res.status(200).json({
      success: true,
      conversations: conversations || [],
      total: conversations?.length || 0,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    console.error('❌ Get recruiter conversations error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch conversations',
      details: error.message
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  getConversation,
  initiateCall,
  updateCallStatus,
  getCallHistory,
  getCandidateConversations,
  getRecruiterConversations
};
