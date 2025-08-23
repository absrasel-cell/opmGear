'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ordersAPI } from '@/lib/api/orders';
import { MessageSquare, Save, Check } from 'lucide-react';

interface AdditionalInstructionInputProps {
  orderId?: string;
  initialValue?: string;
  onUpdate: (instruction: string) => void;
  onError: (error: string) => void;
}

const MAX_LENGTH = 500;

export default function AdditionalInstructionInput({
  orderId,
  initialValue = '',
  onUpdate,
  onError
}: AdditionalInstructionInputProps) {
  const [instruction, setInstruction] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setInstruction(initialValue);
    setHasChanges(false);
    setIsSaved(false);
  }, [initialValue]);

  const handleChange = (value: string) => {
    if (value.length <= MAX_LENGTH) {
      setInstruction(value);
      setHasChanges(value !== initialValue);
      setIsSaved(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;

    if (!orderId) {
      onError('Please save your configuration first before adding instructions');
      return;
    }

    setIsSaving(true);
    try {
      await ordersAPI.updateInstruction(orderId, { 
        additionalInstruction: instruction.trim() || undefined 
      });
      
      setIsSaved(true);
      setHasChanges(false);
      onUpdate(instruction);
      
      // Clear saved indicator after 2 seconds
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error('Error saving instruction:', error);
      onError(error instanceof Error ? error.message : 'Failed to save instruction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const remainingChars = MAX_LENGTH - instruction.length;

  return (
    <Card className="p-6 bg-black/20 backdrop-blur-md border border-white/10">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-lime-400" />
          <h3 className="text-lg font-semibold text-white">Additional Instructions</h3>
        </div>

        <div className="space-y-2">
          <Textarea
            value={instruction}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Provide any special instructions for your logo placement, colors, or other requirements..."
            className="min-h-[120px] bg-black/40 border-white/20 text-white placeholder:text-white/50 resize-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
            disabled={isSaving}
          />

          <div className="flex items-center justify-between">
            <span className={`text-sm ${
              remainingChars < 50 ? 'text-orange-400' : 'text-white/50'
            }`}>
              {remainingChars} characters remaining
            </span>

            {hasChanges && (
              <Button
                onClick={handleSave}
                disabled={!orderId || isSaving}
                size="sm"
                className="bg-lime-600 hover:bg-lime-500 text-black font-semibold disabled:opacity-50"
              >
                {!orderId ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save config first
                  </>
                ) : isSaving ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isSaved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="text-sm text-white/60 bg-black/20 rounded-lg p-3">
          <p className="font-medium mb-1">Tips for better results:</p>
          <ul className="space-y-1 text-xs">
            <li>• Specify exact logo placement preferences (center, left, right)</li>
            <li>• Mention desired logo size or scaling</li>
            <li>• Include color preferences or restrictions</li>
            <li>• Note any text that should accompany the logo</li>
            <li>• Describe any special finishes or effects needed</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}