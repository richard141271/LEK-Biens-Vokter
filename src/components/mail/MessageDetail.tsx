import { 
  ArrowLeft, 
  Trash2, 
  Reply, 
  Forward, 
  MoreVertical, 
  Paperclip, 
  Download,
  Star,
  Printer,
  Archive,
  FileText
} from 'lucide-react';
import { MailMessage } from '@/services/mail/types';
import { useState } from 'react';

interface MessageDetailProps {
  message: MailMessage;
  onBack: () => void;
  onDelete: (id: string) => void;
  onReply: (message: MailMessage) => void;
  onForward?: (message: MailMessage) => void;
}

export function MessageDetail({ message, onBack, onDelete, onReply, onForward }: MessageDetailProps) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
            title="Tilbake til innboks"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-gray-200 mx-1" />
          <button 
            onClick={() => onDelete(message.id)}
            className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-full transition-colors"
            title="Slett"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 text-gray-500 rounded-full transition-colors" title="Arkiver">
            <Archive className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 text-gray-500 rounded-full transition-colors" title="Merk som viktig">
            <Star className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 hidden sm:block">
            {new Date(message.created_at).toLocaleString('no-NO', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          <div className="relative">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Skriv ut
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Last ned original
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header Info */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{message.subject}</h1>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-lg">
                {message.from_alias?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {message.from_alias} <span className="text-gray-500 font-normal">&lt;{message.from_alias}&gt;</span>
                </div>
                <div className="text-sm text-gray-500">
                  Til: meg
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message Body */}
        <div className="prose max-w-none text-gray-800 mb-8 whitespace-pre-wrap">
          {message.body}
        </div>

        {/* Attachments */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Vedlegg ({message.attachments?.length || 0})
          </h4>
          {message.attachments && message.attachments.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {message.attachments.map((att, i) => (
                <a 
                  key={i} 
                  href={att.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-white transition-colors">
                     <FileText className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{att.name}</p>
                    <p className="text-xs text-gray-500">{(att.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </a>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500">Ingen vedlegg i denne e-posten</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
        <button 
          onClick={() => onReply(message)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
        >
          <Reply className="w-4 h-4" />
          Svar
        </button>
        <button 
          onClick={() => onForward && onForward(message)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
        >
          <Forward className="w-4 h-4" />
          Videresend
        </button>
      </div>
    </div>
  );
}
