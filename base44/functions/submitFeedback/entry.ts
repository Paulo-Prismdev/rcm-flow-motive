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
    
    // Update user to clear the prompt flag (user-scoped, no elevation needed)
    await base44.auth.updateMe({ show_feedback_prompt: false });

    // Update the company's last prompted date (resets 20-day timer)
    // These still require service role as the user may not have write access to company records
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

    // Notify all internal users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const internalUsers = allUsers.filter(u => 
      u.user_type === 'internal' || u.role === 'admin'
    );

    const ratingLabels = {
      love: 'Love Artura',
      good: 'Good',
      ok: 'Ok',
      hate: 'Hate'
    };

    const userTypeLabel = currentUser.user_type === 'bodyshop' ? 'Repairer' : 'Referrer';

    for (const internalUser of internalUsers) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: internalUser.email,
        title: `New Feedback: ${ratingLabels[rating]}`,
        message: `${userTypeLabel} ${currentUser.email} submitted ${ratingLabels[rating]} feedback${comment ? ' with a comment' : ''}.`,
        type: 'general',
        link: '/FeedbackHub',
        is_read: false
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