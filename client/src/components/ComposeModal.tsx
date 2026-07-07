import React, { useState, useRef, useEffect } from 'react';
import { trpc } from '../lib/trpc';
import ContactAutocomplete from '../components/ContactAutocomplete';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'new' | 'reply' | 'replyAll' | 'forward';
  email?: any;
  onSent: () => void;
}

function ComposeModal({
  isOpen,
  onClose,
  mode,
  email,
  onSent,
}: ComposeModalProps) {
  const [from, setFrom] = useState('ml@bl2020.com');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Array<{
    id: string;
    filename: string;
    originalname: string;
    path: string;
    size: number;
    mimetype: string;
  }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [height, setHeight] = useState(750);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const sendEmailMutation = trpc.emailClient.sendEmail.useMutation();

  // Initialize fields based on mode
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'reply' && email) {
      setTo(typeof email.from === 'object' ? email.from?.email || '': email.from || '');
      setSubject(`Re: ${email.subject || ''}`);
      setBody(
        `\n\n\n\n<hr/>\n<p><em>Am ${email.date || ''} schrieb ${typeof email.from === 'object' ? (email.from?.name || email.from?.email || '') : (email.from || '')}:</em></p>\n${email.html || email.body || ''}`
      );
    } else if (mode === 'replyAll' && email) {
      setTo(typeof email.from === 'object' ? email.from?.email || '': email.from || '');
      setCc(typeof email.cc === 'object' ? email.cc?.email || '': email.cc || '');
      setShowCc(!!email.cc);
      setSubject(`Re: ${email.subject || ''}`);
      setBody(
        `\n\n\n\n<hr/>\n<p><em>Am ${email.date || ''} schrieb ${typeof email.from === 'object' ? (email.from?.name || email.from?.email || '') : (email.from || '')}:</em></p>\n${email.html || email.body || ''}`
      );
    } else if (mode === 'forward' && email) {
      setTo('');
      setSubject(`Fwd: ${email.subject || ''}`);
      setBody(
        `\n\n<hr/>\n<p><strong>Weitergeleitete Nachricht:</strong></p>\n<p><strong>Von:</strong> ${typeof email.from === 'object' ? (email.from?.name || email.from?.email || '') : (email.from || '')}<br/>\n<strong>Betreff:</strong> ${email.subject || ''}<br/>\n<strong>Datum:</strong> ${email.date || ''}</p>\n${email.html || email.body || ''}`
      );
      // Preserve attachments from original email
      if (email.attachments && email.attachments.length > 0) {
        setUploadedAttachments(email.attachments.map((att: any) => ({
          id: att.partID || att.filename,
          filename: att.filename,
          size: att.size,
          link: att.link,
        })));
      } else {
        setUploadedAttachments([]);
      }
    } else {
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
      setUploadedAttachments([]);
    }

    setAttachments([]);
    setIsMinimized(false);
  }, [isOpen, mode, email]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizeRef.current) {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight >= 200 && newHeight <= window.innerHeight - 100) {
          setHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    if (resizeRef.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Handle file upload
  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setAttachments((prev) => [...prev, ...newFiles]);
    
    setIsUploading(true);
    for (const file of newFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/email-attachment/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const data = await response.json();
        if (data.success && data.file) {
          setUploadedAttachments((prev) => [...prev, data.file]);
        }
      } catch (error) {
        console.error('File upload error:', error);
        alert(`Fehler beim Hochladen von ${file.name}`);
      }
    }
    setIsUploading(false);
  };

  // Remove attachment
  const removeAttachment = async (index: number) => {
    const uploadedAttachment = uploadedAttachments[index];
    
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setUploadedAttachments((prev) => prev.filter((_, i) => i !== index));
    
    if (uploadedAttachment) {
      try {
        await fetch(`/api/email-attachment/${uploadedAttachment.filename}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to delete attachment:', error);
      }
    }
  };

  // Handle send
  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) {
      alert('Bitte füllen Sie mindestens die Felder "An" und "Betreff" aus.');
      return;
    }

    setIsSending(true);
    
    try {
      await sendEmailMutation.mutateAsync({
        to,
        subject,
        body,
        attachments: uploadedAttachments,
      });
      
      alert('E-Mail erfolgreich gesendet!');
      onSent();
      onClose();
    } catch (error: any) {
      console.error('Send error:', error);
      alert(`Fehler beim Senden: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const modalTitle =
    mode === 'new'
      ? 'Neue E-Mail'
      : mode === 'reply'
      ? 'Antworten'
      : mode === 'replyAll'
      ? 'Allen antworten'
      : 'Weiterleiten';

  // Minimized view
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-0 right-4 bg-gray-800 text-white rounded-t-lg shadow-lg cursor-pointer hover:bg-gray-700 transition-colors"
        style={{ width: '250px', zIndex: 1000 }}
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex-1 truncate text-sm">
            {subject || modalTitle}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-white hover:text-gray-300 ml-2"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div 
      className="fixed bottom-0 right-4 bg-white rounded-t-lg shadow-2xl border border-gray-300 flex flex-col"
      style={{ width: '825px', boxShadow: "0 -2px 8px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.15)", height: `${height}px`, zIndex: 1000 }}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-orange-500 transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          resizeRef.current = e.currentTarget as any;
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b rounded-t-lg">
        <h2 className="text-sm font-semibold text-gray-800">{modalTitle}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-600 hover:text-gray-800 px-2 text-lg"
            disabled={isSending}
            title="Minimieren"
          >
            −
          </button>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 px-2 text-lg"
            disabled={isSending}
            title="Schließen"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {/* From */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 w-12">Von:</label>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border-b border-gray-300 focus:outline-none focus:border-orange-500"
            disabled={isSending}
          >
            <option value="ml@bl2020.com">ml@bl2020.com</option>
          </select>
          <div className="flex gap-1">
            <button
              onClick={() => setShowCc(!showCc)}
              className="text-xs text-gray-600 hover:text-orange-600 px-1"
              disabled={isSending}
            >
              Cc
            </button>
            <button
              onClick={() => setShowBcc(!showBcc)}
              className="text-xs text-gray-600 hover:text-orange-600 px-1"
              disabled={isSending}
            >
              Bcc
            </button>
          </div>
        </div>

        {/* To */}
        <div className="flex items-center gap-2">
          <ContactAutocomplete
            value={to}
            onChange={setTo}
            placeholder="Name oder E-Mail eingeben..."
            disabled={isSending}
            className="flex-1 px-2 py-1 text-xs border-b border-gray-300 focus:outline-none focus:border-orange-500"
            label="An:"
          />
        </div>

        {/* Cc */}
        {showCc && (
          <div className="flex items-center gap-2">
            <ContactAutocomplete
              value={cc}
              onChange={setCc}
              placeholder="Name oder E-Mail eingeben..."
              disabled={isSending}
              className="flex-1 px-2 py-1 text-xs border-b border-gray-300 focus:outline-none focus:border-orange-500"
              label="Cc:"
            />
          </div>
        )}

        {/* Bcc */}
        {showBcc && (
          <div className="flex items-center gap-2">
            <ContactAutocomplete
              value={bcc}
              onChange={setBcc}
              placeholder="Name oder E-Mail eingeben..."
              disabled={isSending}
              className="flex-1 px-2 py-1 text-xs border-b border-gray-300 focus:outline-none focus:border-orange-500"
              label="Bcc:"
            />
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 w-12">Betreff:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border-b border-gray-300 focus:outline-none focus:border-orange-500"
            placeholder="Betreff"
            disabled={isSending}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 py-1 border-b">
          <button
            onClick={() => document.execCommand('bold')}
            className="px-1.5 py-0.5 text-xs font-bold rounded hover:bg-gray-100"
            disabled={isSending}
          >
            B
          </button>
          <button
            onClick={() => document.execCommand('italic')}
            className="px-1.5 py-0.5 text-xs italic rounded hover:bg-gray-100"
            disabled={isSending}
          >
            I
          </button>
          <button
            onClick={() => document.execCommand('underline')}
            className="px-1.5 py-0.5 text-xs underline rounded hover:bg-gray-100"
            disabled={isSending}
          >
            U
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-100"
            disabled={isSending || isUploading}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          contentEditable
          onInput={(e) => setBody(e.currentTarget.innerHTML)}
          className="min-h-[100px] max-h-[400px] overflow-y-auto px-2 py-1 text-xs focus:outline-none"
          dangerouslySetInnerHTML={{ __html: body }}
        />

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1 border-t">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs"
              >
                <span>📎 {file.name}</span>
                <span className="text-gray-500">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
                {uploadedAttachments[index] && (
                  <span className="text-[#E48F00]">✓</span>
                )}
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-600 hover:text-red-800"
                  disabled={isSending}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50">
        <button
          onClick={handleSend}
          className="px-4 py-1 text-xs text-white bg-bl2020-orange rounded hover:bg-bl2020-orange-dark disabled:bg-gray-400"
          disabled={isSending || isUploading}
        >
          {isSending ? 'Wird gesendet...' : 'Senden'}
        </button>
        <button
          onClick={onClose}
          className="text-xs text-gray-600 hover:text-gray-800"
          disabled={isSending}
        >
          Verwerfen
        </button>
      </div>
    </div>
  );
}

export default ComposeModal;
