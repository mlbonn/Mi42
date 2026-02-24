// client/src/components/ReplyModal.tsx
import React, { useState } from 'react';
import { trpc } from '../lib/trpc';
import ContactAutocomplete from './ContactAutocomplete';

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalMessage: {
    from: string;
    subject: string;
    body: string;
    messageId?: string;
    references?: string;
  };
  mode: 'reply' | 'replyAll' | 'forward';
  onSuccess?: () => void;
}

export default function ReplyModal({
  isOpen,
  onClose,
  originalMessage,
  mode,
  onSuccess
}: ReplyModalProps) {
  const [to, setTo] = useState<string>(mode === 'forward' ? '' : originalMessage.from);
  const [cc, setCc] = useState<string>('');
  const [subject, setSubject] = useState<string>(
    mode === 'forward' 
      ? `Fwd: ${originalMessage.subject}` 
      : `Re: ${originalMessage.subject}`
  );
  const [body, setBody] = useState<string>('');
  const [aiContext, setAiContext] = useState<string>('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [tone, setTone] = useState<'professional' | 'friendly' | 'formal'>('professional');
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const sendMessageMutation = trpc.emailClient.sendMessage.useMutation();
  const generateAIReplyMutation = trpc.emailClient.generateAIReply.useMutation();
  const { data: templates } = trpc.emailClient.getEmailTemplates.useQuery();

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const result = await generateAIReplyMutation.mutateAsync({
        originalMessage: {
          from: originalMessage.from,
          subject: originalMessage.subject,
          body: originalMessage.body,
        },
        context: aiContext,
        tone: tone,
      });
      
      if (result.success) {
        setBody(result.reply);
        setShowAiPanel(false);
      }
    } catch (error) {
      console.error('AI generation error:', error);
      alert('Fehler bei der AI-Generierung');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!to.trim()) {
      alert('Bitte geben Sie mindestens einen Empfänger an');
      return;
    }

    setIsSending(true);
    try {
      const toEmails = to.split(',').map(e => e.trim()).filter(e => e);
      const ccEmails = cc ? cc.split(',').map(e => e.trim()).filter(e => e) : [];

      await sendMessageMutation.mutateAsync({
        to: toEmails,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        subject: subject,
        body: body,
        inReplyTo: mode !== 'forward' ? originalMessage.messageId : undefined,
        references: mode !== 'forward' ? originalMessage.references : undefined,
      });

      alert('Email erfolgreich gesendet!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Send error:', error);
      alert('Fehler beim Senden der Email');
    } finally {
      setIsSending(false);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setSubject(template.subject);
    setBody(template.body);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {mode === 'reply' && 'Antworten'}
            {mode === 'replyAll' && 'Allen antworten'}
            {mode === 'forward' && 'Weiterleiten'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Original Message Preview */}
        <div className="mb-4 p-3 bg-gray-50 rounded border-l-4 border-orange-500">
          <div className="text-xs text-gray-600 mb-1">Original von: {originalMessage.from}</div>
          <div className="text-sm text-gray-800 line-clamp-2">{originalMessage.body}</div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">An:</label>
            <ContactAutocomplete
              value={to}
              onChange={setTo}
              placeholder="Name oder E-Mail eingeben..."
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">CC:</label>
            <ContactAutocomplete
              value={cc}
              onChange={setCc}
              placeholder="Optional - Name oder E-Mail eingeben..."
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Betreff:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Templates Dropdown */}
          {templates && templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Vorlage:</label>
              <select
                onChange={(e) => {
                  const template = templates.find((t: any) => t.id === parseInt(e.target.value));
                  if (template) handleTemplateSelect(template);
                }}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">-- Vorlage auswählen --</option>
                {templates.map((template: any) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* AI Panel Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>AI-Antwort generieren</span>
            </button>
          </div>

          {/* AI Generation Panel */}
          {showAiPanel && (
            <div className="p-4 bg-purple-50 rounded border border-purple-200">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Kontext (optional):</label>
                  <textarea
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={2}
                    placeholder="z.B. 'Termin bestätigen für nächste Woche'"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ton:</label>
                  <div className="flex space-x-2">
                    {(['professional', 'friendly', 'formal'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={`px-4 py-2 rounded ${
                          tone === t
                            ? 'bg-purple-600 text-white'
                            : 'bg-white border border-purple-300 text-purple-600 hover:bg-purple-100'
                        }`}
                      >
                        {t === 'professional' && 'Professionell'}
                        {t === 'friendly' && 'Freundlich'}
                        {t === 'formal' && 'Formal'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {isGenerating ? 'Generiere...' : 'Antwort generieren'}
                </button>
              </div>
            </div>
          )}

          {/* Message Body */}
          <div>
            <label className="block text-sm font-medium mb-1">Nachricht:</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={12}
              placeholder="Ihre Nachricht..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !to.trim() || !body.trim()}
            className="px-4 py-2 bg-bl2020-orange text-white rounded hover:bg-bl2020-orange-dark disabled:opacity-50"
          >
            {isSending ? 'Sende...' : 'Senden'}
          </button>
        </div>
      </div>
    </div>
  );
}
