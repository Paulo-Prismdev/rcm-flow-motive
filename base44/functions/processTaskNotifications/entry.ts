import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all pending/in-progress tasks
    const tasks = await base44.asServiceRole.entities.Task.filter({
      status: { $in: ['Pending', 'In Progress'] }
    });
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let remindersCreated = 0;
    let overdueNotificationsCreated = 0;
    
    for (const task of tasks) {
      if (!task.due_date || !task.assigned_to) continue;
      
      const dueDate = task.due_date;
      
      // Check if task is overdue
      if (dueDate < today && !task.overdue_notification_sent) {
        // Create overdue notification
        await base44.asServiceRole.entities.Notification.create({
          user_email: task.assigned_to,
          title: 'Task Overdue',
          message: `Task "${task.title}" for claim ${task.claim_job_number || task.claim_reg || 'Unknown'} is overdue!`,
          type: 'assignment',
          related_item_type: 'Claim',
          related_item_id: task.claim_id,
          link: `/claims?id=${task.claim_id}`,
          is_read: false
        });
        
        // Mark notification as sent
        await base44.asServiceRole.entities.Task.update(task.id, {
          overdue_notification_sent: true
        });
        
        overdueNotificationsCreated++;
      }
      // Check if task is due today or tomorrow and reminder not sent
      else if ((dueDate === today || dueDate === tomorrow) && !task.reminder_sent) {
        const dueText = dueDate === today ? 'today' : 'tomorrow';
        
        await base44.asServiceRole.entities.Notification.create({
          user_email: task.assigned_to,
          title: 'Task Due Soon',
          message: `Task "${task.title}" for claim ${task.claim_job_number || task.claim_reg || 'Unknown'} is due ${dueText}.`,
          type: 'assignment',
          related_item_type: 'Claim',
          related_item_id: task.claim_id,
          link: `/claims?id=${task.claim_id}`,
          is_read: false
        });
        
        // Mark reminder as sent
        await base44.asServiceRole.entities.Task.update(task.id, {
          reminder_sent: true
        });
        
        remindersCreated++;
      }
    }
    
    return Response.json({
      success: true,
      tasksProcessed: tasks.length,
      remindersCreated,
      overdueNotificationsCreated
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});