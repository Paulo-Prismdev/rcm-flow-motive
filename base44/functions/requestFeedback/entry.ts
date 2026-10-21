import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { requireInternalUser } from '../../shared/internalAccess.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Internal-only: prompting portal users for feedback.
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;

    const { userId, companyId, companyType } = await req.json();

    // Option 1: Send to specific user
    if (userId) {
      await base44.asServiceRole.entities.User.update(userId, {
        show_feedback_prompt: true,
        last_feedback_prompted_date: new Date().toISOString().split('T')[0]
      });

      return Response.json({ 
        success: true,
        message: 'Feedback prompt has been triggered for the user'
      });
    }

    // Option 2: Send to all users in a company
    if (companyId && companyType) {
      const today = new Date().toISOString().split('T')[0];
      
      // Get all users linked to this company
      const allUsers = await base44.asServiceRole.entities.User.list();
      const linkedField = companyType === 'bodyshop' ? 'linked_bodyshop_id' : 'linked_referrer_id';
      const companyUsers = allUsers.filter(u => u[linkedField] === companyId);

      // Update all users to show feedback prompt
      await Promise.all(
        companyUsers.map(user =>
          base44.asServiceRole.entities.User.update(user.id, {
            show_feedback_prompt: true,
            last_feedback_prompted_date: today
          })
        )
      );

      // Update the company's last prompted date
      const entityName = companyType === 'bodyshop' ? 'Bodyshop' : 'Referrer';
      await base44.asServiceRole.entities[entityName].update(companyId, {
        last_feedback_prompted_date: today
      });

      return Response.json({ 
        success: true,
        message: `Feedback prompt has been triggered for ${companyUsers.length} user(s) in the company`
      });
    }

    return Response.json({ error: 'Either userId or (companyId + companyType) is required' }, { status: 400 });

  } catch (error) {
    console.error('Error requesting feedback:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
});