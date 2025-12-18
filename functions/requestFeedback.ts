import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user authentication and admin privileges
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'admin' && currentUser.user_type !== 'internal') {
      return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    // Update the user to show the feedback prompt
    await base44.asServiceRole.entities.User.update(userId, {
      show_feedback_prompt: true,
      last_feedback_prompted_date: new Date().toISOString().split('T')[0]
    });

    return Response.json({ 
      success: true,
      message: 'Feedback prompt has been triggered for the user'
    });

  } catch (error) {
    console.error('Error requesting feedback:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
});