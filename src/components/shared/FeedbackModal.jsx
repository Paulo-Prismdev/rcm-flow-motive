import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Smile, Meh, Frown, Heart } from 'lucide-react';

const RATINGS = [
  { 
    value: 'love', 
    label: 'We love Artura', 
    icon: Heart, 
    color: 'text-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    hoverColor: 'hover:bg-pink-100 dark:hover:bg-pink-900/30',
    borderColor: 'border-pink-300 dark:border-pink-700'
  },
  { 
    value: 'good', 
    label: 'Good, no problems here', 
    icon: Smile, 
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    hoverColor: 'hover:bg-green-100 dark:hover:bg-green-900/30',
    borderColor: 'border-green-300 dark:border-green-700'
  },
  { 
    value: 'ok', 
    label: 'I mean, they are ok', 
    icon: Meh, 
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    hoverColor: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
    borderColor: 'border-yellow-300 dark:border-yellow-700'
  },
  { 
    value: 'hate', 
    label: 'We hate you, sort it out', 
    icon: Frown, 
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    hoverColor: 'hover:bg-red-100 dark:hover:bg-red-900/30',
    borderColor: 'border-red-300 dark:border-red-700'
  }
];

export default function FeedbackModal({ user, onClose }) {
  const [selectedRating, setSelectedRating] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedbackData) => {
      // Create feedback record
      await base44.entities.UserFeedback.create(feedbackData);
      
      // Update user to clear the prompt flag
      await base44.auth.updateMe({
        show_feedback_prompt: false
      });

      // Update the company's last prompted date (resets 20-day timer)
      const today = new Date().toISOString().split('T')[0];
      if (user.user_type === 'bodyshop' && user.linked_bodyshop_id) {
        await base44.entities.Bodyshop.update(user.linked_bodyshop_id, {
          last_feedback_prompted_date: today
        });
      } else if (user.user_type === 'referrer' && user.linked_referrer_id) {
        await base44.entities.Referrer.update(user.linked_referrer_id, {
          last_feedback_prompted_date: today
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      onClose();
    },
    onError: (error) => {
      console.error('Error submitting feedback:', error);
      setError('Failed to submit feedback. Please try again.');
    }
  });

  const handleSubmit = () => {
    setError('');

    if (!selectedRating) {
      setError('Please select how you feel about Artura');
      return;
    }

    if (selectedRating === 'hate' && !comment.trim()) {
      setError('Please tell us what we need to sort out');
      return;
    }

    const feedbackData = {
      user_id: user.id,
      user_email: user.email,
      user_type: user.user_type === 'bodyshop' ? 'bodyshop' : 'referrer',
      rating: selectedRating,
      comment: comment.trim() || null,
      prompt_date: new Date().toISOString(),
      submission_date: new Date().toISOString()
    };

    submitFeedbackMutation.mutate(feedbackData);
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="neomorph max-w-2xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            How are you feeling about Artura?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-center text-foreground-muted">
            We value your feedback! Please let us know how you feel about working with Artura.
          </p>

          {/* Rating Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RATINGS.map((rating) => {
              const Icon = rating.icon;
              const isSelected = selectedRating === rating.value;
              
              return (
                <button
                  key={rating.value}
                  onClick={() => setSelectedRating(rating.value)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? `${rating.bgColor} ${rating.borderColor} shadow-lg scale-105` 
                      : `border-border ${rating.hoverColor}`
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <Icon className={`w-12 h-12 ${rating.color}`} />
                    <span className="font-medium text-center">{rating.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Comment Field (Always visible, but mandatory only for "hate") */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {selectedRating === 'hate' ? 'Please tell us what we need to improve *' : 'Additional comments (optional)'}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={selectedRating === 'hate' ? 'Please explain what needs to be sorted out...' : 'Any additional thoughts?'}
              className="min-h-[100px] neomorph-inset"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700">
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitFeedbackMutation.isPending}
            className="w-full py-6 text-lg font-semibold bg-accent hover:bg-accent-hover text-accent-foreground"
          >
            {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}