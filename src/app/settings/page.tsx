'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import { LogOut, User, ShieldCheck, AlertCircle, Database, ArrowRight, Users, Wallet, ChevronRight, Archive, Briefcase, Printer, Link as LinkIcon } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const generateLabelPDF = (type: 'standard' | 'child') => {
    const doc = new jsPDF();
    const cols = 3;
    const rows = 8;
    const labelWidth = 70;
    const labelHeight = 37;
    const startX = 0; // A4 width 210mm / 3 = 70mm exactly.
    const startY = 0; // Top margin roughly

    // We can add a small margin if needed, but 70x37*8 = 296mm (A4 is 297mm). So it fits almost perfectly vertically.
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = startX + (c * labelWidth);
            const y = startY + (r * labelHeight); 
            
            // Optional: Draw faint outline for cutting if using plain paper
            doc.setDrawColor(240);
            doc.rect(x, y, labelWidth, labelHeight); 
            
            // Content Center X
            const cx = x + (labelWidth / 2);
            
            // Brand
            doc.setFontSize(10);
            doc.setTextColor(255, 165, 0); // Honey Orange
            doc.setFont("helvetica", "bold");
            doc.text("LEK-HONNING", cx, y + 8, { align: "center" });
            
            doc.setTextColor(0);
            
            if (type === 'standard') {
                doc.setFontSize(7);
                doc.setFont("helvetica", "normal");
                doc.text("Produsert av LEK-Sertifisert birøkter:", cx, y + 14, { align: "center" });
                
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(profile?.full_name || formData.full_name || 'Ukjent Birøkter', cx, y + 19, { align: "center" });
                
                if (profile?.is_lek_honning_member || formData.is_lek_honning_member) {
                     doc.setFontSize(7);
                     doc.setFont("helvetica", "normal");
                     doc.text(`Medlem #${profile?.member_number || formData.member_number || '000'}`, cx, y + 23, { align: "center" });
                }
                
                doc.setFontSize(6);
                doc.text("100% Ekte Honning • Norsk Naturprodukt", cx, y + 32, { align: "center" });
                
            } else {
                // Child
                doc.setFontSize(9);
                doc.setFont("helvetica", "italic");
                doc.text("Honning fra min egen hage", cx, y + 15, { align: "center" });
                
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                const name = childLabelData.name || profile?.full_name || 'Ukjent';
                const age = childLabelData.age ? `${childLabelData.age} År` : '';
                doc.text(`Birøkter ${name} ${age}`, cx, y + 22, { align: "center" });
                
                doc.setFontSize(7);
                doc.setFont("helvetica", "normal");
                doc.text(`Sommer ${new Date().getFullYear()}`, cx, y + 32, { align: "center" });
            }
        }
    }
    
    doc.save(`etiketter_${type}.pdf`);
    setShowLabelModal(false);
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
                            <p className="text-xs text-honey-600 mb-3">"Honning fra min egen hage"</p>
                          </div>
                          <button 
                            onClick={() => setShowLabelModal(true)}
                            className="w-full bg-honey-500 text-white font-bold py-2 rounded-lg text-sm hover:bg-honey-600 transition-colors"
                          >
                            Tilpass & Last ned
                          </button>
                      </div>
                  </div>
              </div>

              <button 
                onClick={() => setIsEditing(true)}
                className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Endre/oppdatere profil
              </button>
              
              <button 
                onClick={() => router.push('/archive')}
                className="w-full mt-4 bg-white text-gray-700 font-bold py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Archive className="w-5 h-5" />
                Arkiv
              </button>
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
    </div>
  );
}
