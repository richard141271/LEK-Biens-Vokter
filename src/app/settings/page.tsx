'use client';

import { createClient } from '@/utils/supabase/client';
import { ensureMemberNumber } from '@/app/actions/profile';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { LogOut, User, ShieldCheck, AlertCircle, Database, ArrowRight, Users, Wallet, ChevronRight, Archive, Briefcase, Printer, Link as LinkIcon, X, CreditCard, List, QrCode, FileText, ClipboardCheck, ChevronDown, Mic } from 'lucide-react';
import WordTraining from '@/components/WordTraining';
import { getAutoCorrectEnabled, setAutoCorrectEnabled, getShareEnabled, setShareEnabled } from '@/utils/voice-diagnostics';

const RENTAL_CONTRACT_TEXT = ``;

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Print State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [loadingPrintData, setLoadingPrintData] = useState(false);
  const [printLayout, setPrintLayout] = useState<'cards' | 'list' | 'qr' | null>(null);
  const [printData, setPrintData] = useState<any>({});
  const [allHives, setAllHives] = useState<any[]>([]);

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  // Form State - Matches RegisterPage structure
  const [formData, setFormData] = useState<any>({
    full_name: '',
    address: '',
    postal_code: '',
    city: '',
    region: '', // Added region
    phone_number: '',
    email: '',
    is_norges_birokterlag_member: false,
    member_number: '',
    local_association: '',
    is_lek_honning_member: false,
    interests: [] as string[],
    beekeeping_type: 'hobby',
    company_name: '',
    org_number: '',
    company_bank_account: '',
    company_address: '',
    company_email: '',
    company_phone: '',
    private_bank_account: '',
    wants_to_be_beekeeper: false,
    role: 'beekeeper' // Default
  });
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  // Auto-fetch City based on Postal Code (Bring API)
  useEffect(() => {
    const fetchCity = async () => {
      if (isEditing && formData.postal_code && formData.postal_code.length === 4) {
        try {
          const response = await fetch(`https://api.bring.com/shippingguide/api/postalCode.json?clientUrl=lek-biensvokter&pnr=${formData.postal_code}`);
          if (response.ok) {
            const data = await response.json();
            if (data.valid) {
              setFormData((prev: any) => ({ ...prev, city: data.result }));
            }
          }
        } catch (err) {
          console.error('Failed to fetch city', err);
        }
      }
    };

    const timeoutId = setTimeout(fetchCity, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [formData.postal_code, isEditing]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    await ensureMemberNumber();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
      setFormData({
        ...data,
        email: user.email, // Add email from auth user
        interests: data.interests || [], // Ensure array
        beekeeping_type: data.beekeeping_type || 'hobby',
        // Auto-fill company contact info if empty
        company_email: data.company_email || user.email || '',
        company_phone: data.company_phone || data.phone_number || ''
      });

    } else {
      // Fallback to auth metadata if profile doesn't exist yet
      setFormData({ 
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        // Initialize other fields as empty/default
        interests: [],
        beekeeping_type: 'hobby',
        company_email: user.email || '',
        company_phone: ''
      });
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: checked }));
  };

  const handleInterestChange = (interest: string) => {
    setFormData((prev: any) => {
      const currentInterests = prev.interests || [];
      const newInterests = currentInterests.includes(interest)
        ? currentInterests.filter((i: string) => i !== interest)
        : [...currentInterests, interest];
      return { ...prev, interests: newInterests };
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const [showLabelModal, setShowLabelModal] = useState(false);
  const [childLabelData, setChildLabelData] = useState({ name: '', age: '' });
  const [showWordTraining, setShowWordTraining] = useState(false);
  const [autoCorrect, setAutoCorrect] = useState(false);
  const [shareVoice, setShareVoice] = useState(false);

  useEffect(() => {
    setAutoCorrect(getAutoCorrectEnabled());
    setShareVoice(getShareEnabled());
  }, []);

  const generateLabelPDF = (type: 'standard' | 'child') => {
    const doc = new jsPDF();
    const cols = 3;
    const rows = 8;
    const labelWidth = 70;
    const labelHeight = 37;
    const startX = 0;
    const startY = 0;
    const year = new Date().getFullYear();
    const beekeeperName = profile?.full_name || formData.full_name || 'Ukjent birøkter';
    const memberNumber = profile?.member_number || formData.member_number || '';
    const isLekMember = profile?.is_lek_honning_member || formData.is_lek_honning_member;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * labelWidth;
        const y = startY + r * labelHeight;
        const cx = x + labelWidth / 2;

        doc.setDrawColor(210, 180, 140);
        doc.setLineWidth(0.2);
        doc.rect(x + 1.5, y + 1.5, labelWidth - 3, labelHeight - 3);
        doc.setDrawColor(180, 140, 60);
        doc.line(x + 4, y + 9, x + labelWidth - 4, y + 9);
        doc.line(x + 4, y + labelHeight - 3, x + labelWidth - 4, y + labelHeight - 3);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(184, 134, 11);
        doc.text("LEK-HONNING", cx, y + 6, { align: "center" });

        doc.setTextColor(0);

        if (type === "standard") {
          doc.setFont("times", "italic");
          doc.setFontSize(11);
          doc.text("Norsk Honning", cx, y + 16, { align: "center" });

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.text(`Birøkter: ${beekeeperName}`, cx, y + 22, { align: "center" });

          doc.text(`Sommer ${year}`, cx, y + 26, { align: "center" });

          if (isLekMember && memberNumber) {
            doc.setFontSize(6);
            doc.text(
              `LEK-sertifisert birøkter  •  Medlem #${memberNumber}`,
              cx,
              y + 30,
              { align: "center" }
            );
          }

          doc.setFontSize(5.5);
          doc.text(
            "100 % ekte honning  •  Norsk naturprodukt",
            cx,
            y + 33,
            { align: "center" }
          );
        } else {
          const childName = childLabelData.name || beekeeperName;
          const ageText = childLabelData.age ? `${childLabelData.age} år` : "";

          doc.setFont("times", "italic");
          doc.setFontSize(9.5);
          doc.text("Honning fra min egen hage", cx, y + 16, { align: "center" });

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(
            ageText ? `Birøkter: ${childName} (${ageText})` : `Birøkter: ${childName}`,
            cx,
            y + 22,
            { align: "center" }
          );

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.text(`Sommer ${year}`, cx, y + 26, { align: "center" });

          doc.setFontSize(5.5);
          doc.text(
            "LEK-Honning  •  100 % ekte honning",
            cx,
            y + 30,
            { align: "center" }
          );
        }
      }
    }

    doc.save(`etiketter_${type}.pdf`);
    setShowLabelModal(false);
  };

  const generateHiveLabelsPDF = async (hives: any[]) => {
    const doc = new jsPDF();
    const cols = 3;
    const rows = 8;
    const labelWidth = 70;
    const labelHeight = 37;
    const startX = 0;
    const startY = 0;

    for (let i = 0; i < hives.length; i++) {
        const hive = hives[i];
        const indexOnPage = i % (cols * rows);
        
        if (i > 0 && indexOnPage === 0) {
            doc.addPage();
        }

        const col = indexOnPage % cols;
        const row = Math.floor(indexOnPage / cols);
        
        const x = startX + col * labelWidth;
        const y = startY + row * labelHeight;
        
        // Border (same as honey label)
        doc.setDrawColor(210, 180, 140);
        doc.setLineWidth(0.2);
        doc.rect(x + 1.5, y + 1.5, labelWidth - 3, labelHeight - 3);
        
        // QR Code generation
        const qrUrl = `${window.location.origin}/hives/${hive.id}`;
        const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 0, width: 200, errorCorrectionLevel: 'H' });
        
        // Add QR Image (Right side)
        doc.addImage(qrDataUrl, 'PNG', x + labelWidth - 30, y + 4.5, 28, 28);
        
        // Text (Left side)
        const textX = x + 4;
        
        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text("LEK-BIENS VOKTER", textX, y + 8);
        
        // Hive Number
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(hive.hive_number, textX, y + 16);
        
        // Hive Name
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(hive.name || '', textX, y + 20);

        // Apiary Name (Red)
        const apiaryName = hive.apiaries?.name || 'Ukjent Bigård';
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(220, 38, 38); // Red
        doc.text(apiaryName, textX, y + 28);
    }
    
    doc.save(`bikube_etiketter_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = async (layout: 'cards' | 'list' | 'qr') => {
    setLoadingPrintData(true);
    setIsPrintModalOpen(false);
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch all active hives
        const { data: hives, error } = await supabase
            .from('hives')
            .select('*, apiaries(name)')
            .eq('user_id', user.id)
            .eq('active', true)
            .order('hive_number');
        
        if (error) throw error;
        setAllHives(hives || []);

        // If QR layout, generate PDF directly and return
        if (layout === 'qr') {
          await generateHiveLabelsPDF(hives || []);
          setLoadingPrintData(false);
          return;
        }

        const hiveIds = hives?.map(h => h.id) || [];
        let fetchedData: any = {};

        if (hiveIds.length > 0 && layout === 'cards') {
            const { data: inspections } = await supabase
                .from('inspections')
                .select('*')
                .in('hive_id', hiveIds)
                .order('inspection_date', { ascending: false });

            const { data: logs } = await supabase
                .from('hive_logs')
                .select('*')
                .in('hive_id', hiveIds)
                .order('created_at', { ascending: false });
            
            hiveIds.forEach(id => {
                fetchedData[id] = {
                    inspections: inspections?.filter(i => i.hive_id === id) || [],
                    logs: logs?.filter(l => l.hive_id === id) || []
                };
            });
        }

        // Generate QR codes
        if (layout === 'cards') {
            await Promise.all((hives || []).map(async (h) => {
                try {
                    const qrUrl = `${window.location.origin}/hives/${h.id}`;
                    const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 0, width: 200 });
                    if (!fetchedData[h.id]) fetchedData[h.id] = { inspections: [], logs: [] };
                    fetchedData[h.id].qrDataUrl = qrDataUrl;
                } catch (e) { console.error(e); }
            }));
        }

        setPrintData(fetchedData);
        setPrintLayout(layout);

        setTimeout(() => {
            window.print();
            setLoadingPrintData(false);
            // Don't reset layout immediately so print preview works, 
            // but we can reset it after a delay or on next interaction
        }, 1000);

    } catch (error) {
        console.error('Print error:', error);
        alert('Feil ved forberedelse av utskrift');
        setLoadingPrintData(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update Password if provided
      if (passwordData.newPassword) {
        if (passwordData.newPassword.length < 6) {
            throw new Error('Nytt passord må være minst 6 tegn');
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            throw new Error('Passordene er ikke like');
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({ 
            password: passwordData.newPassword 
        });

        if (passwordError) throw passwordError;
      }

      // Remove email and region from update payload as they are not in profiles table
      const { email, region, ...updateData } = formData;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ingen bruker funnet');

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          ...updateData 
        });

      if (error) throw error;
      
      setProfile({ ...updateData, id: user.id });
      setPasswordData({ newPassword: '', confirmPassword: '' }); // Reset password fields
      setIsEditing(false);
      alert('Profil oppdatert!');
    } catch (error: any) {
      alert('Feil ved lagring: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="p-8 text-center">Laster innstillinger...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Header with Archive Link */}
      <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Innstillinger</h1>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* VIEW MODE */}
        {!isEditing ? (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Min Profil</h2>
              <h3 className="text-xl font-bold text-gray-900">{profile?.full_name}</h3>
              <p className="text-gray-500 mb-2">
                {profile?.address}, {profile?.postal_code} {profile?.city} {profile?.region && `(${profile.region})`}
              </p>
              <p className="text-gray-500 text-sm mb-6">
                {profile?.phone_number} • {formData.email}
              </p>

              {profile?.is_norges_birokterlag_member && (
                <div className="bg-honey-50 border border-honey-100 rounded-xl p-4 mb-4 text-left">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-xs text-honey-600 font-bold uppercase tracking-wider block">Medlemsnummer</span>
                        <div className="text-lg font-bold text-gray-900">{profile?.member_number || 'Ikke registrert'}</div>
                    </div>
                    <div>
                        <span className="text-xs text-honey-600 font-bold uppercase tracking-wider block">Lokallag</span>
                        <div className="text-lg font-bold text-gray-900">{profile?.local_association || '-'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Økonomi info visning */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">Økonomi & Drift</h4>
                  
                  <div>
                      <span className="text-xs text-gray-500 font-bold uppercase block">Privat kontonummer (Utbetaling)</span>
                      <div className="font-mono text-gray-700">{profile?.private_bank_account || '-'}</div>
                  </div>

                  {profile?.beekeeping_type === 'business' && (
                      <>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                                <span className="text-xs text-gray-500 font-bold uppercase block">Firmanavn</span>
                                <div className="text-gray-900">{profile?.company_name || '-'}</div>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 font-bold uppercase block">Org.nummer</span>
                                <div className="font-mono text-gray-700">{profile?.org_number || '-'}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-gray-500 font-bold uppercase block">Firma Konto</span>
                                <div className="font-mono text-gray-700">{profile?.company_bank_account || '-'}</div>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 font-bold uppercase block">Firmaadresse</span>
                                <div className="text-gray-900">{profile?.company_address || '-'}</div>
                            </div>
                        </div>
                      </>
                  )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-2 mb-6">
                <div className="flex items-center gap-2">
                  {profile?.is_lek_honning_member && <ShieldCheck className="w-4 h-4 text-green-600" />}
                  <span>LEK-Honning™ medlem</span>
                </div>
                <div className="flex items-center gap-2">
                  {profile?.is_norges_birokterlag_member && <ShieldCheck className="w-4 h-4 text-green-600" />}
                  <span>Medlem av Norges Birøkterlag</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="capitalize">{profile?.beekeeping_type === 'business' ? 'Næringsbirøkter' : 'Hobbybirøkter'}</span>
                </div>
                {profile?.wants_to_be_beekeeper && (
                    <div className="flex items-center gap-2 text-honey-700 bg-honey-50 p-2 rounded-lg border border-honey-100">
                        <Briefcase className="w-4 h-4" />
                        <span className="font-bold">Ønsker driftsoppdrag (LEK)</span>
                    </div>
                )}
                {profile?.interests && profile.interests.length > 0 && (
                   <div className="mt-2 pt-2 border-t border-gray-200">
                     <p className="text-xs text-gray-500 font-bold uppercase mb-1">Interesser</p>
                     <div className="flex flex-wrap gap-1">
                       {profile.interests.map((i: string) => (
                         <span key={i} className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-xs">{i}</span>
                       ))}
                     </div>
                   </div>
                )}
              </div>

              {/* ETIKETTER & UTSKRIFT */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 text-left shadow-sm">
                  <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                      <Printer className="w-5 h-5 text-honey-600" />
                      <h4 className="font-bold text-gray-900">Etiketter & Utskrift</h4>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    Last ned og skriv ut profesjonelle etiketter til din honning. 
                    Designet passer til standard etikettark (70x37mm, 24 per ark).
                  </p>
                  
                  <a 
                    href="https://www.google.com/search?q=etiketter+70x37mm+a4" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-600 hover:underline mb-6"
                  >
                    <LinkIcon className="w-3 h-3" />
                    Finn etikettpapir (Google Søk)
                  </a>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Standard Etikett */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col justify-between">
                          <div>
                            <h5 className="font-bold text-gray-800 text-sm mb-1">Standard LEK-Etikett</h5>
                            <p className="text-xs text-gray-500 mb-3">Med ditt navn og medlemsinfo.</p>
                          </div>
                          <button 
                            onClick={() => generateLabelPDF('standard')}
                            className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                          >
                            Last ned PDF
                          </button>
                      </div>

                      {/* Barne Etikett */}
                      <div className="bg-honey-50 p-4 rounded-lg border border-honey-100 flex flex-col justify-between">
                          <div>
                              <h5 className="font-bold text-honey-800 text-sm mb-1">Barnas Etikett</h5>
                            <p className="text-xs text-honey-600 mb-3">&quot;Honning fra min egen hage&quot;</p>
                          </div>
                          <button 
                            onClick={() => setShowLabelModal(true)}
                            className="w-full bg-honey-500 text-white font-bold py-2 rounded-lg text-sm hover:bg-honey-600 transition-colors"
                          >
                            Tilpass & Skriv ut
                          </button>
                      </div>
                  </div>

                  {/* Driftsmateriell Links */}
                  <div className="mt-6 border-t border-gray-100 pt-4">
                      <h5 className="font-bold text-gray-900 text-sm mb-3">Driftsmateriell</h5>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                             <div className="bg-white p-2 rounded-full border border-gray-200">
                               <Printer className="w-4 h-4 text-gray-600" />
                             </div>
                             <div>
                                <span className="font-bold text-gray-800 text-sm block">Bigårdsskilt</span>
                                <span className="text-xs text-gray-500">Skriv ut varselskilt for dine bigårder</span>
                             </div>
                          </div>
                          <button 
                            onClick={() => router.push('/apiaries')} 
                            className="text-xs bg-white border border-gray-300 px-3 py-2 rounded-lg font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                          >
                            Gå til utskrift <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                             <div className="bg-white p-2 rounded-full border border-gray-200">
                               <Printer className="w-4 h-4 text-gray-600" />
                             </div>
                             <div>
                                <span className="font-bold text-gray-800 text-sm block">Bikubekort & QR</span>
                                <span className="text-xs text-gray-500">Stamkort og merking (for alle kuber)</span>
                             </div>
                          </div>
                          <button 
                            onClick={() => setIsPrintModalOpen(true)}
                            className="text-xs bg-white border border-gray-300 px-3 py-2 rounded-lg font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                          >
                            Åpne meny <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                  </div>
              </div>

              {/* ORDTRENING */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 text-left shadow-sm">
                  <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                      <Mic className="w-5 h-5 text-honey-600" />
                      <h4 className="font-bold text-gray-900">Stemme • ORDTRENING</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Tren stemmegjenkjenningen med ord og setninger fra inspeksjonen.
                  </p>
                  <button
                    onClick={() => setShowWordTraining(true)}
                    className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    Start ORDTRENING
                  </button>
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-gray-900">Forbedre tale (beta)</div>
                      <div className="text-xs text-gray-500">
                        Sammenligner i bakgrunnen og korrigerer forsiktig under ekte inspeksjoner.
                      </div>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={autoCorrect}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setAutoCorrect(v);
                          setAutoCorrectEnabled(v);
                        }}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:h-5 after:w-5 after:left-[2px] after:top-[2px] after:bg-white after:rounded-full after:transition-all peer-checked:bg-honey-500 relative"></div>
                    </label>
                  </div>

              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-gray-900">Del anonym feil til fellesbank</div>
                  <div className="text-xs text-gray-500">
                    Lagrer misgjenkjenninger i en felles database for forbedring. Kun innloggede brukere.
                  </div>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={shareVoice}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setShareVoice(v);
                      setShareEnabled(v);
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:h-5 after:w-5 after:left-[2px] after:top-[2px] after:bg-white after:rounded-full after:transition-all peer-checked:bg-honey-500 relative"></div>
                </label>
              </div>
              </div>

              <button 
                onClick={() => setIsEditing(true)}
                className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Endre/oppdatere profil
              </button>
              
              {/* Mine Dokumenter */}
              <div className="mt-6 border-t border-gray-100 pt-4">
                  <h5 className="font-bold text-gray-900 text-sm mb-3">Mine Dokumenter & Oppdrag</h5>
                  
                  <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => router.push('/referater')}
                        className="w-full bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-between px-4"
                      >
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-500" />
                            <span>Referater</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>

                      <button 
                        onClick={() => router.push('/archive')}
                        className="w-full bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-between px-4"
                      >
                        <div className="flex items-center gap-3">
                            <Archive className="w-5 h-5 text-gray-500" />
                            <span>Arkiv</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>

                      {profile?.role === 'beekeeper' && (
                          <button 
                            onClick={() => router.push('/dashboard/beekeeper/rentals')}
                            className="w-full bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-between px-4"
                          >
                            <div className="flex items-center gap-3">
                                <ClipboardCheck className="w-5 h-5 text-gray-500" />
                                <span>Mine Oppdrag</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                      )}
                  </div>
              </div>
            </div>

            {/* Child Label Modal */}
            {showLabelModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-honey-600 mb-2">Barnas Etikett</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Lag en personlig etikett for den lille birøkteren.
                  </p>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Barnets Navn</label>
                      <input 
                        type="text" 
                        value={childLabelData.name}
                        onChange={(e) => setChildLabelData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="F.eks. Lyng-Anton"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alder</label>
                      <input 
                        type="number" 
                        value={childLabelData.age}
                        onChange={(e) => setChildLabelData(prev => ({ ...prev, age: e.target.value }))}
                        placeholder="F.eks. 6"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowLabelModal(false)}
                      className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Avbryt
                    </button>
                    <button 
                      onClick={() => generateLabelPDF('child')}
                      disabled={!childLabelData.name}
                      className="flex-1 py-3 text-white font-bold bg-honey-500 rounded-lg hover:bg-honey-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Last ned
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Word Training Modal */}
            {showWordTraining && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <WordTraining onClose={() => setShowWordTraining(false)} />
              </div>
            )}

            <button 
                onClick={handleSignOut}
                className="w-full mt-8 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2"
            >
                <LogOut className="w-4 h-4" />
                Logg ut
            </button>
          </>
        ) : (
          /* EDIT MODE */
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-xl font-bold text-center mb-6">Rediger profil</h2>

            <div className="space-y-4">
              {/* Personal Info */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fullt navn</label>
                <input
                  name="full_name"
                  value={formData.full_name || ''}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-post</label>
                <input
                  name="email"
                  value={formData.email || ''}
                  readOnly
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Adresse</label>
                <input
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Postnummer</label>
                  <input
                    name="postal_code"
                    value={formData.postal_code || ''}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Poststed</label>
                  <input
                    name="city"
                    value={formData.city || ''}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Region / Fylke</label>
                <input
                  name="region"
                  value={formData.region || ''}
                  onChange={handleChange}
                  placeholder="F.eks. Viken, Innlandet"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefon</label>
                <input
                  name="phone_number"
                  value={formData.phone_number || ''}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kontonummer (Utbetaling)</label>
                <input
                  name="private_bank_account"
                  value={formData.private_bank_account || ''}
                  onChange={handleChange}
                  placeholder="Frivillig, men kreves for utbetaling av provisjon/bonus"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">Fylles ut hvis du ønsker utbetaling av opptjente midler.</p>
              </div>

              {/* Memberships */}
              <div className="pt-4 border-t space-y-4">
                 <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <input
                        type="checkbox"
                        name="is_norges_birokterlag_member"
                        checked={formData.is_norges_birokterlag_member || false}
                        onChange={handleCheckboxChange}
                        className="w-5 h-5 text-honey-600 rounded"
                        />
                        <label className="font-medium text-gray-900">Medlem av Norges Birøkterlag</label>
                    </div>
                    
                    {formData.is_norges_birokterlag_member && (
                    <div className="pl-8 space-y-3 animate-in fade-in">
                        <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Medlemsnummer NBL</label>
                        <input
                            name="member_number"
                            value={formData.member_number || ''}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                        />
                        </div>
                        <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lokallag</label>
                        <input
                            name="local_association"
                            value={formData.local_association || ''}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                        />
                        </div>
                    </div>
                    )}

                    <div className="flex items-center gap-3">
                        <input
                        type="checkbox"
                        name="is_lek_honning_member"
                        checked={formData.is_lek_honning_member || false}
                        onChange={handleCheckboxChange}
                        className="w-5 h-5 text-honey-600 rounded"
                        />
                        <label className="font-medium text-gray-900">Medlem av LEK-Honning™</label>
                    </div>

                    {profile?.role !== 'tenant' && (
                    <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg border border-green-100">
                        <input
                        type="checkbox"
                        name="wants_to_be_beekeeper"
                        checked={formData.wants_to_be_beekeeper || false}
                        onChange={handleCheckboxChange}
                        className="w-5 h-5 text-honey-600 rounded"
                        />
                        <div>
                          <label className="font-bold text-gray-900 block">Ønsker å drifte utleiekuber</label>
                          <p className="text-xs text-gray-600">Motta oppdrag om drift av utleiekuber i ditt nærområde mot betaling.</p>
                        </div>
                    </div>
                    )}
                 </div>
              </div>

              {/* Interests */}
              <div className="pt-4 border-t">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mine Interesser</label>
                <div className="flex flex-wrap gap-2">
                  {['Salg', 'Rekruttering', 'Kurs', 'Samarbeid'].map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => handleInterestChange(interest)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        (formData.interests || []).includes(interest)
                          ? 'bg-honey-100 border-honey-500 text-honey-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {interest} {(formData.interests || []).includes(interest) && '✓'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Economy Type */}
              <div className="pt-4 border-t">
                <div className="flex gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="beekeeping_type"
                      value="hobby"
                      checked={formData.beekeeping_type === 'hobby'}
                      onChange={handleChange}
                      className="w-5 h-5 text-honey-600 focus:ring-honey-500 border-gray-300"
                    />
                    <span className="font-medium text-gray-900">Hobbybirøkt</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="beekeeping_type"
                      value="business"
                      checked={formData.beekeeping_type === 'business'}
                      onChange={handleChange}
                      className="w-5 h-5 text-honey-600 focus:ring-honey-500 border-gray-300"
                    />
                    <span className="font-medium text-gray-900">Næringsbirøkt</span>
                  </label>
                </div>

                {formData.beekeeping_type === 'business' && (
                  <div className="bg-honey-50 p-4 rounded-xl space-y-3 mb-4 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Firmanavn</label>
                      <input
                        name="company_name"
                        value={formData.company_name || ''}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-honey-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Organisasjonsnummer</label>
                      <input
                        name="org_number"
                        value={formData.org_number || ''}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-honey-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kontonummer (Firma)</label>
                      <input
                        name="company_bank_account"
                        value={formData.company_bank_account || ''}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-honey-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Firmaadresse</label>
                      <input
                        name="company_address"
                        value={formData.company_address || ''}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-honey-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Firma E-post</label>
                      <input
                        name="company_email"
                        value={formData.company_email || ''}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-honey-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Firma Telefon</label>
                      <input
                        name="company_phone"
                        value={formData.company_phone || ''}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-honey-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Password Change Section */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Endre Passord (Valgfritt)</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nytt Passord</label>
                        <input
                        type="password"
                        name="newPassword"
                        autoComplete="new-password"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="La stå tomt for å beholde dagens"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                        />
                    </div>
                    {passwordData.newPassword && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bekreft Nytt Passord</label>
                            <input
                            type="password"
                            name="confirmPassword"
                            autoComplete="new-password"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                            />
                        </div>
                    )}
                </div>
              </div>

            </div>

            <div className="flex gap-3 pt-6 pb-32">
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? 'Lagrer...' : 'Lagre Endringer'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Print Options Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">Velg Utskrift</h3>
              <button onClick={() => setIsPrintModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-500 mb-2">Dette vil generere utskrift for alle dine aktive bikuber.</p>
              
              <button 
                onClick={() => handlePrint('list')}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-honey-500 hover:bg-honey-50 transition-all text-left group"
              >
                <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200">
                    <List className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                    <span className="font-bold text-gray-900 block">Oversiktsliste</span>
                    <span className="text-xs text-gray-500">Liste over alle kuber fordelt på bigård</span>
                </div>
              </button>

              <button 
                onClick={() => handlePrint('cards')}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-honey-500 hover:bg-honey-50 transition-all text-left group"
              >
                <div className="bg-orange-100 p-2 rounded-lg group-hover:bg-orange-200">
                    <CreditCard className="w-6 h-6 text-orange-700" />
                </div>
                <div>
                    <span className="font-bold text-gray-900 block">Bikubekort</span>
                    <span className="text-xs text-gray-500">Kort med historikk for hver kube</span>
                </div>
              </button>

              <button 
                onClick={() => handlePrint('qr')}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-honey-500 hover:bg-honey-50 transition-all text-left group"
              >
                <div className="bg-gray-100 p-2 rounded-lg group-hover:bg-gray-200">
                    <QrCode className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                    <span className="font-bold text-gray-900 block">QR-Koder</span>
                    <span className="text-xs text-gray-500">Kun QR-koder for merking (70x37mm)</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loadingPrintData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-honey-500 mb-4"></div>
                <p className="font-bold text-lg">Klargjør utskrift...</p>
                <p className="text-sm text-gray-500">Henter data for {allHives.length} kuber...</p>
            </div>
        </div>
      )}

      {/* Hidden Print Output */}
      <div className="hidden print:block fixed inset-0 bg-white z-[200]">
          {/* LIST VIEW */}
          {printLayout === 'list' && (
              <div className="p-8 max-w-4xl mx-auto">
                  <h1 className="text-2xl font-bold mb-6 text-center">Bikubeoversikt - {new Date().toLocaleDateString()}</h1>
                  
                  {Object.entries(
                        allHives.reduce((acc, hive) => {
                            const apiaryName = hive.apiaries?.name || 'Ingen Bigård';
                            if (!acc[apiaryName]) acc[apiaryName] = [];
                            acc[apiaryName].push(hive);
                            return acc;
                        }, {} as {[key: string]: any[]})
                  ).map(([apiaryName, hives]) => (
                      <div key={apiaryName} className="mb-8 break-inside-avoid">
                          <h2 className="text-xl font-bold border-b-2 border-black mb-4">{apiaryName} ({(hives as any[]).length})</h2>
                          <table className="w-full text-sm">
                              <thead>
                                  <tr className="border-b border-gray-400">
                                      <th className="text-left py-2">Kube</th>
                                      <th className="text-left py-2">Type</th>
                                      <th className="text-left py-2">Status</th>
                                      <th className="text-left py-2">Sist inspisert</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {(hives as any[]).map(hive => (
                                      <tr key={hive.id} className="border-b border-gray-200">
                                          <td className="py-2 font-bold">{hive.hive_number} <span className="font-normal text-gray-600">{hive.name}</span></td>
                                          <td className="py-2">{hive.type || 'PRODUKSJON'}</td>
                                          <td className="py-2">{hive.status || 'OK'}</td>
                                          <td className="py-2">-</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  ))}
              </div>
          )}

          {/* CARDS VIEW */}
          {printLayout === 'cards' && (
              <div className="p-0">
                {Object.entries(
                        allHives.reduce((acc, hive) => {
                            const apiaryName = hive.apiaries?.name || 'Ingen Bigård';
                            if (!acc[apiaryName]) acc[apiaryName] = [];
                            acc[apiaryName].push(hive);
                            return acc;
                        }, {} as {[key: string]: any[]})
                ).map(([apiaryName, hives]) => (
                    <div key={apiaryName}>
                        <div className="p-8 pb-4 break-before-page">
                            <h1 className="text-3xl font-bold uppercase border-b-4 border-black mb-8">{apiaryName}</h1>
                        </div>
                        <div className="p-8 pt-0 grid grid-cols-1 gap-8">
                            {(hives as any[]).map(hive => {
                                const hiveInspections = printData[hive.id]?.inspections || [];
                                const hiveLogs = printData[hive.id]?.logs || [];
                                const lastInsp = hiveInspections[0];

                                return (
                                    <div key={hive.id} className="break-inside-avoid border-2 border-black rounded-xl p-6 page-break-auto relative overflow-hidden bg-white">
                                        <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-4">
                                            <div>
                                                <h2 className="text-3xl font-bold mb-1">{hive.hive_number}</h2>
                                                <p className="text-xl">{hive.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold uppercase">{hive.type || 'PRODUKSJON'}</div>
                                                <div className="text-gray-600">{apiaryName}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-6">
                                            <div className="flex-1">
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                                        <span className="block text-xs font-bold uppercase text-gray-500">Dronning</span>
                                                        <span className="font-bold text-lg">{lastInsp?.queen_seen ? 'Ja' : 'Nei'}</span>
                                                    </div>
                                                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                                        <span className="block text-xs font-bold uppercase text-gray-500">Egg</span>
                                                        <span className="font-bold text-lg">{lastInsp?.eggs_seen ? 'Ja' : 'Nei'}</span>
                                                    </div>
                                                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                                        <span className="block text-xs font-bold uppercase text-gray-500">Temperament</span>
                                                        <span className="font-bold text-lg capitalize">{lastInsp?.temperament || '-'}</span>
                                                    </div>
                                                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                                        <span className="block text-xs font-bold uppercase text-gray-500">Honning</span>
                                                        <span className="font-bold text-lg capitalize">{lastInsp?.honey_stores || '-'}</span>
                                                    </div>
                                                </div>
                                                
                                                {lastInsp?.notes && (
                                                    <div className="mb-4">
                                                        <span className="block text-xs font-bold uppercase text-gray-500 mb-1">Siste Notat ({new Date(lastInsp.inspection_date).toLocaleDateString()})</span>
                                                        <p className="text-sm bg-yellow-50 p-3 rounded border border-yellow-100 italic">&quot;{lastInsp.notes}&quot;</p>
                                                    </div>
                                                )}
                                            </div>

                                            {printData[hive.id]?.qrDataUrl && (
                                                <div className="w-32 flex flex-col items-center justify-start">
                                                    <img src={printData[hive.id].qrDataUrl} alt="QR" className="w-32 h-32" />
                                                    <span className="text-[10px] text-gray-500 mt-1">{hive.id.substring(0,8)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* History Table (Last 5 events) */}
                                        <div className="mt-4 pt-4 border-t-2 border-black">
                                            <h3 className="font-bold uppercase text-sm mb-2">Historikk (Siste 5)</h3>
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-left text-gray-500 border-b border-gray-200">
                                                        <th className="pb-1">Dato</th>
                                                        <th className="pb-1">Hendelse</th>
                                                        <th className="pb-1">Detaljer</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[...hiveInspections, ...hiveLogs]
                                                        .sort((a, b) => new Date(b.created_at || b.inspection_date).getTime() - new Date(a.created_at || a.inspection_date).getTime())
                                                        .slice(0, 5)
                                                        .map((event: any, i) => (
                                                            <tr key={i} className="border-b border-gray-100">
                                                                <td className="py-1 font-mono">{new Date(event.inspection_date || event.created_at).toLocaleDateString()}</td>
                                                                <td className="py-1 font-bold">{event.action || 'INSPEKSJON'}</td>
                                                                <td className="py-1 text-gray-600 truncate max-w-[200px]">{event.details || event.notes || '-'}</td>
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
              </div>
          )}

          {/* QR ONLY VIEW */}
          {printLayout === 'qr' && (
             <div className="hidden print:grid grid-cols-3 gap-0 content-start">
                {allHives.map(hive => (
                      <div key={hive.id} className="w-[70mm] h-[37mm] border border-gray-100 p-2 flex items-center justify-between overflow-hidden break-inside-avoid relative bg-white">
                         <div className="flex flex-col justify-center h-full pl-1 z-10">
                            <span className="text-[8px] uppercase text-gray-500 font-bold leading-none mb-0.5">LEK-Biens Vokter</span>
                            <span className="text-xl font-black leading-none">{hive.hive_number}</span>
                            <span className="text-[10px] font-bold truncate max-w-[35mm] leading-tight mt-1">{hive.name}</span>
                         </div>
                         {printData[hive.id]?.qrDataUrl && (
                            <img src={printData[hive.id]?.qrDataUrl} className="w-[28mm] h-[28mm] object-contain z-10" />
                         )}
                      </div>
                   ))}
             </div>
          )}
      </div>
    </div>
  );
}
