import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user authentication
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rating, comment } = await req.json();

    if (!rating) {
      return Response.json({ error: 'Rating is required' }, { status: 400 });
    }

    // Create feedback record
    const feedbackData = {
      user_id: currentUser.id,
      user_email: currentUser.email,
      user_type: currentUser.user_type === 'bodyshop' ? 'bodyshop' : 'referrer',
      rating,
      comment: comment || null,
      prompt_date: new Date().toISOString(),
      submission_date: new Date().toISOString()
    };

    await base44.entities.UserFeedback.create(feedbackData);
    
    // Update user to clear the prompt flag (use service role)
    await base44.asServiceRole.entities.User.update(currentUser.id, {
      show_feedback_prompt: false
    });

    // Update the company's last prompted date (resets 20-day timer)
    const today = new Date().toISOString().split('T')[0];
    if (currentUser.user_type === 'bodyshop' && currentUser.linked_bodyshop_id) {
      await base44.asServiceRole.entities.Bodyshop.update(currentUser.linked_bodyshop_id, {
        last_feedback_prompted_date: today
      });
    } else if (currentUser.user_type === 'referrer' && currentUser.linked_referrer_id) {
      await base44.asServiceRole.entities.Referrer.update(currentUser.linked_referrer_id, {
        last_feedback_prompted_date: today
      });
    }

    return Response.json({ 
      success: true,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
});