'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Mail, 
  Folder, 
  PenTool, 
  Settings, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Save,
  Loader2,
  Inbox,
  Send,
  FileText,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  Paperclip
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { 
  getAdminUserInbox, 
  getUserFolders, 
  createUserFolder, 
  deleteUserFolder, 
  getUserSignature, 
  updateUserSignature,
  getAdminUserProfile,
  adminSendMessage,
  adminDeleteMessage
} from '@/app/actions/mail';
import { MailFolder, MailMessage, MailAttachment } from '@/services/mail/types';
import { MessageDetail } from '@/components/mail/MessageDetail';

type Tab = 'inbox' | 'folders' | 'signature' | 'connection';

export default function AdminUserEmailPage() {
  const params = useParams();
  const userId = params.userId as string;
  
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Data states
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [signature, setSignature] = useState('');
  
  // Action states
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [messageState, setMessageState] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);

  // Compose states
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<MailAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch user profile using server action to bypass RLS if needed
      const { data: profile, error: profileError } = await getAdminUserProfile(userId);
      
      if (profileError || !profile) throw new Error('Kunne ikke hente brukerprofil: ' + (profileError || 'Fant ikke bruker'));
      setUserProfile(profile);

      // Fetch initial data based on tab (or all)
      await Promise.all([
        fetchInbox(),
        fetchFolders(),
        fetchSignature()
      ]);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      setMessageState({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchInbox = async () => {
    const result = await getAdminUserInbox(userId);
    if (result.data) setMessages(result.data);
  };

  const fetchFolders = async () => {
    const result = await getUserFolders(userId);
    if (result.data) setFolders(result.data);
  };

  const fetchSignature = async () => {
    const result = await getUserSignature(userId);
    if (result.data) setSignature(result.data);
  };

  const handleOpenMessage = async (message: MailMessage) => {
    // Mark as read logic if needed, but for now just open
    setSelectedMessage(message);
    // Optionally mark as read
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne meldingen?')) return;
    
    try {
        const result = await adminDeleteMessage(userId, messageId);
        if (result.error) throw new Error(result.error);
        
        setMessages(messages.filter(m => m.id !== messageId));
        if (selectedMessage?.id === messageId) {
            setSelectedMessage(null);
        }
        setMessageState({ text: 'Melding slettet', type: 'success' });
    } catch (error: any) {
        setMessageState({ text: error.message, type: 'error' });
    }
  };

  const handleSendMessage = async () => {
    if (!to || !subject || !body) {
        setMessageState({ text: 'Vennligst fyll ut alle felt', type: 'error' });
        return;
    }

    setSending(true);
    try {
        // Send using admin action on behalf of user
        const result = await adminSendMessage(userId, to, subject, body, attachments);
        if (result.error) throw new Error(result.error);

        setIsComposing(false);
        setTo('');
        setSubject('');
        setBody('');
        setAttachments([]);
        setMessageState({ text: 'E-post sendt', type: 'success' });
        
        // Refresh inbox to show sent message if we were showing sent folder (not implemented yet)
        await fetchInbox();
    } catch (error: any) {
        setMessageState({ text: error.message, type: 'error' });
    } finally {
        setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: MailAttachment[] = [];

    // Simple mock upload for now or base64 conversion if needed
    // In a real app, you'd upload to Supabase Storage and get a URL
    // For now, let's just pretend or use a simple implementation if MailService supports it
    // The current MailService expects { name, size, type, url }
    
    // Since we don't have a full upload endpoint ready here, we'll skip implementation details 
    // or just alert that it's not fully supported in this view yet if complex.
    // But let's try to support it if we can.
    
    // For now, just a placeholder as I don't want to overcomplicate the admin view 
    // without a proper upload mechanism in place for admin context.
    // We'll skip file upload logic for now or just log it.
    console.log('File upload not fully implemented in admin view yet');
    setIsUploading(false);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const result = await createUserFolder(userId, newFolderName);
      if (result.error) throw new Error(result.error);
      
      setNewFolderName('');
      await fetchFolders();
      setMessageState({ text: 'Mappe opprettet', type: 'success' });
    } catch (error: any) {
      setMessageState({ text: error.message, type: 'error' });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne mappen?')) return;

    try {
      const result = await deleteUserFolder(userId, folderId);
      if (result.error) throw new Error(result.error);
      
      await fetchFolders();
      setMessageState({ text: 'Mappe slettet', type: 'success' });
    } catch (error: any) {
      setMessageState({ text: error.message, type: 'error' });
    }
  };

  const handleSaveSignature = async () => {
    setIsSavingSignature(true);
    try {
      const result = await updateUserSignature(userId, signature);
      if (result.error) throw new Error(result.error);
      
      setMessageState({ text: 'Signatur lagret', type: 'success' });
    } catch (error: any) {
      setMessageState({ text: error.message, type: 'error' });
    } finally {
      setIsSavingSignature(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900">Bruker ikke funnet</h2>
        {messageState?.type === 'error' && (
          <p className="text-red-600 mt-2">{messageState.text}</p>
        )}
        <Link href="/dashboard/admin/email" className="text-purple-600 hover:underline mt-4 block">
          Tilbake til oversikt
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/admin/email" className="text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-600" />
                  {userProfile.full_name}
                </h1>
                <p className="text-xs text-gray-500">{userProfile.email_alias || 'Ingen e-post alias'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => {
                  setIsComposing(true);
                  setTo('');
                  setSubject('');
                  setBody('');
                  setAttachments([]);
                }}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
                <PenTool className="w-4 h-4" />
                Ny melding
            </button>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              userProfile.email_enabled 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
            }`}>
              {userProfile.email_enabled ? 'Aktiv' : 'Deaktivert'}
            </span>
          </div>
        </div>
        
        {/* Tabs */}
          <div className="flex space-x-8 -mb-px overflow-x-auto">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'inbox'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Innboks
            </button>
            <button
              onClick={() => setActiveTab('folders')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'folders'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Folder className="w-4 h-4" />
              Mapper
            </button>
            <button
              onClick={() => setActiveTab('signature')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'signature'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <PenTool className="w-4 h-4" />
              Signatur
            </button>
            <button
              onClick={() => setActiveTab('connection')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'connection'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              Tilkobling
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {messageState && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${messageState.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {messageState.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {messageState.text}
          </div>
        )}

        {/* Inbox View */}
        {activeTab === 'inbox' && (
          selectedMessage ? (
             <div className="h-[calc(100vh-16rem)]">
                <MessageDetail 
                    message={selectedMessage}
                    onBack={() => setSelectedMessage(null)}
                    onDelete={handleDeleteMessage}
                    onReply={(msg) => {
                        setIsComposing(true);
                        setTo(msg.from_alias);
                        setSubject(`SV: ${msg.subject}`);
                        setBody(`\n\n> ${msg.body}`);
                        setAttachments([]);
                    }}
                    onForward={(msg) => {
                        setIsComposing(true);
                        setSubject(`VS: ${msg.subject}`);
                        setBody(`\n\n---------- Videresendt melding ----------\nFra: ${msg.from_alias}\nDato: ${msg.created_at}\nEmne: ${msg.subject}\n\n${msg.body}`);
                        setAttachments([]);
                    }}
                />
             </div>
          ) : (
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-medium text-gray-900">Innboks for {userProfile.email_alias}</h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => fetchInbox()} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-500">{messages.length} meldinger</span>
                </div>
            </div>
            <div className="divide-y divide-gray-200">
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    onClick={() => handleOpenMessage(msg)}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!msg.read ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm font-medium ${!msg.read ? 'text-blue-900' : 'text-gray-900'}`}>
                        {msg.from_alias}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className={`text-sm mb-1 ${!msg.read ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                      {msg.subject}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {msg.body}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <Inbox className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>Innboksen er tom</p>
                </div>
              )}
            </div>
          </div>
          )
        )}

        {/* Folders View */}
        {activeTab === 'folders' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Folder className="w-5 h-5 text-purple-600" />
                Mine Mapper
              </h3>
              <div className="space-y-2">
                {folders.map((folder) => (
                  <div key={folder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                    <div className="flex items-center gap-3">
                      {folder.type === 'system' ? (
                        <Folder className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Folder className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-sm font-medium text-gray-700">{folder.name}</span>
                      {folder.type === 'system' && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">System</span>
                      )}
                    </div>
                    {folder.type === 'custom' && (
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Slett mappe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 h-fit">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                Opprett ny mappe
              </h3>
              <form onSubmit={handleCreateFolder}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mappenavn</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    placeholder="F.eks. Fakturaer"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {isCreatingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Opprett mappe
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Signature View */}
        {activeTab === 'signature' && (
          <div className="max-w-2xl mx-auto bg-white shadow-sm rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-purple-600" />
              E-postsignatur
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Denne signaturen vil automatisk bli lagt til i bunnen av alle utgående e-poster fra denne brukeren.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Signaturtekst</label>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                placeholder="Med vennlig hilsen..."
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSignature}
                disabled={isSavingSignature}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {isSavingSignature ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lagre signatur
              </button>
            </div>
          </div>
        )}

        {/* Connection View */}
        {activeTab === 'connection' && (
          <div className="max-w-3xl mx-auto">
             <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-purple-600" />
                  Koble til ekstern e-postklient
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  For å lese og sende e-post fra eksterne programmer som Outlook, Gmail, eller Apple Mail, bruk følgende innstillinger.
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">Innkommende server (IMAP)</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-gray-500">Server:</span>
                      <span className="col-span-2 font-mono text-gray-900">imap.kias.no</span>
                      
                      <span className="text-gray-500">Port:</span>
                      <span className="col-span-2 font-mono text-gray-900">993 (SSL/TLS)</span>
                      
                      <span className="text-gray-500">Brukernavn:</span>
                      <span className="col-span-2 font-mono text-gray-900">{userProfile.email_alias}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 border-b pb-2">Utgående server (SMTP)</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-gray-500">Server:</span>
                      <span className="col-span-2 font-mono text-gray-900">smtp.kias.no</span>
                      
                      <span className="text-gray-500">Port:</span>
                      <span className="col-span-2 font-mono text-gray-900">465 (SSL/TLS) eller 587 (STARTTLS)</span>
                      
                      <span className="text-gray-500">Autentisering:</span>
                      <span className="col-span-2 font-mono text-gray-900">Ja (samme som innkommende)</span>
                    </div>
                  </div>
                </div>
             </div>

             <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-900 mb-1">Gmail Integrasjon</h4>
                    <p className="text-sm text-blue-800 mb-4">
                      Du kan legge til denne kontoen i Gmail ved å gå til Innstillinger &gt; Kontoer og import &gt; Legg til en e-postkonto.
                    </p>
                    <a 
                      href="https://mail.google.com/mail/u/0/#settings/accounts" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Åpne Gmail Innstillinger
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Compose Modal */}
      {isComposing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900">Ny melding (som {userProfile.email_alias})</h3>
                    <button onClick={() => setIsComposing(false)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Til:</label>
                        <input 
                            type="email" 
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-full px-3 py-2 border-b border-gray-200 focus:border-purple-500 outline-none transition-colors"
                            placeholder="mottaker@kias.no"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Emne:</label>
                        <input 
                            type="text" 
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-3 py-2 border-b border-gray-200 focus:border-purple-500 outline-none transition-colors"
                            placeholder="Emne"
                        />
                    </div>
                    <div>
                        <textarea 
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
                            placeholder="Skriv din melding her..."
                        />
                    </div>
                    
                    {/* Attachments Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer text-sm font-medium text-gray-700 transition-colors">
                                <Paperclip className="w-4 h-4" />
                                Legg til vedlegg
                                <input type="file" className="hidden" multiple onChange={handleFileUpload} />
                            </label>
                            {isUploading && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
                        </div>
                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {attachments.map((file, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full text-xs">
                                        <span className="truncate max-w-[150px]">{file.name}</span>
                                        <button 
                                            onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                                            className="text-gray-400 hover:text-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button 
                        onClick={() => setIsComposing(false)}
                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Avbryt
                    </button>
                    <button 
                        onClick={handleSendMessage}
                        disabled={sending || !to || !subject || !body}
                        className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send melding
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
