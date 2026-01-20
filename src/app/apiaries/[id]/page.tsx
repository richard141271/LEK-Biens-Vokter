'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Archive, Truck, Trash2, X, Check, MoreVertical, ClipboardList, Edit, QrCode, Calendar, Printer, List, CreditCard, Activity, FileText } from 'lucide-react';
import Link from 'next/link';
import { Warehouse, Store, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export default function ApiaryDetailsPage({ params }: { params: { id: string } }) {
  const [apiary, setApiary] = useState<any>(null);
  const [hives, setHives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rental, setRental] = useState<any>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Selection State
  const [selectedHiveIds, setSelectedHiveIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modals
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetApiaryId, setTargetApiaryId] = useState('');
  const [availableApiaries, setAvailableApiaries] = useState<any[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  // Scan Modal State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scannedHives, setScannedHives] = useState<{ number: string, status: 'created' | 'moved' | 'error', msg: string }[]>([]);
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  // RSVP State
  const [rsvpInspectionId, setRsvpInspectionId] = useState<string | null>(null);
  const [rsvpCount, setRsvpCount] = useState(1);
  const [rsvpSizes, setRsvpSizes] = useState('');

  // Print State
  const [printLayout, setPrintLayout] = useState<'cards' | 'list' | 'qr' | null>(null);
  const [printData, setPrintData] = useState<{ [key: string]: { inspections: any[], logs: any[] } }>({});
  const [loadingPrintData, setLoadingPrintData] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Print Options Modal
  const [isPrintOptionsOpen, setIsPrintOptionsOpen] = useState(false);
  const [printOptions, setPrintOptions] = useState({
      includeHistory: true,
      includeLogs: true,
      includeImages: true,
      includeNotes: true,
      inspectionLimit: 'last5',
      dateRange: { start: '', end: '' }
  });

  // Mass Action State
  const [isMassActionModalOpen, setIsMassActionModalOpen] = useState(false);
  const [massActionType, setMassActionType] = useState<'inspeksjon' | 'logg' | null>(null);
  const [isSubmittingMassAction, setIsSubmittingMassAction] = useState(false);
  
  // Mass Inspection Form
  const [massInspectionData, setMassInspectionData] = useState({
    queen_seen: false,
    eggs_seen: false,
    honey_stores: 'middels',
    temperament: 'rolig',
    notes: ''
  });

  // Mass Log Form
  const [massLogData, setMassLogData] = useState({
    action: 'BEHANDLING',
    details: ''
  });

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [params.id]);

  useEffect(() => {
    if (isMoveModalOpen) {
      fetchAvailableApiaries();
    }
  }, [isMoveModalOpen]);

  const fetchData = async () => {
    // 0. Fetch User
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // 1. Fetch Apiary
    const { data: apiaryData, error: apiaryError } = await supabase
      .from('apiaries')
      .select('*')
      .eq('id', params.id)
      .single();

    if (apiaryError) {
      console.error('Error fetching apiary:', apiaryError);
      router.push('/dashboard');
      return;
    }
    setApiary(apiaryData);

    // 1.1 Fetch Rental Info (if rental type)
    if (apiaryData.type === 'rental') {
        const { data: rentalData } = await supabase
            .from('rentals')
            .select('*')
            .eq('apiary_id', params.id)
            .maybeSingle();
        if (rentalData) setRental(rentalData);

        // 1.2 Fetch Inspections
        const { data: inspectionsData } = await supabase
            .from('inspections')
            .select('*, beekeeper:profiles(full_name)')
            .eq('apiary_id', params.id)
            .order('planned_date', { ascending: true });
        if (inspectionsData) setInspections(inspectionsData);
    }

    // 2. Fetch Hives
    const { data: hivesData } = await supabase
      .from('hives')
      .select('*')
      .eq('apiary_id', params.id)
      .eq('active', true)
      .order('hive_number', { ascending: true });

    if (hivesData) setHives(hivesData);
    setLoading(false);
  };

  const fetchAvailableApiaries = async () => {
    const { data } = await supabase
      .from('apiaries')
      .select('id, name, type, apiary_number')
      .neq('id', params.id)
      .order('name');
    
    if (data) setAvailableApiaries(data);
  };

  // --- SELECTION LOGIC ---
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedHiveIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedHiveIds(newSet);
  };

  const selectAll = () => {
    if (selectedHiveIds.size === hives.length) {
      setSelectedHiveIds(new Set());
    } else {
      setSelectedHiveIds(new Set(hives.map(h => h.id)));
    }
  };

  // --- MOVE HIVES LOGIC ---
  const handleMoveSubmit = async () => {
    if (!targetApiaryId || selectedHiveIds.size === 0) return;
    setIsMoving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetApiary = availableApiaries.find(a => a.id === targetApiaryId);
      const idsToMove = Array.from(selectedHiveIds);

      // 1. Update hives
      const { error: updateError } = await supabase
        .from('hives')
        .update({ apiary_id: targetApiaryId })
        .in('id', idsToMove);

      if (updateError) throw updateError;

      // 2. Log movements
      const logs = idsToMove.map(id => ({
        hive_id: id,
        user_id: user?.id,
        action: 'FLYTTET',
        details: `Flyttet fra ${apiary.name} til ${targetApiary?.name} (Masseflytting)`
      }));

      const { error: logError } = await supabase
        .from('hive_logs')
        .insert(logs);

      if (logError) throw logError;

      await fetchData();
      setIsMoveModalOpen(false);
      setTargetApiaryId('');
      setSelectedHiveIds(new Set());
      setIsSelectionMode(false);
      alert(`${idsToMove.length} kuber ble flyttet!`);

    } catch (error: any) {
      alert('Feil ved flytting: ' + error.message);
    } finally {
      setIsMoving(false);
    }
  };

  // --- SCAN / MASS REGISTRATION LOGIC ---
  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanInput.trim() || isProcessingScan) return;

    setIsProcessingScan(true);
    const input = scanInput.trim(); 
    let hiveNumber = input;
    if (/^\d+$/.test(input)) {
        hiveNumber = `KUBE-${input.padStart(3, '0')}`;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Check if hive exists
        const { data: existingHive } = await supabase
            .from('hives')
            .select('*')
            .or(`hive_number.eq.${hiveNumber},id.eq.${input}`)
            .single();

        if (existingHive) {
            // Move to this apiary if not already here
            if (existingHive.apiary_id !== params.id) {
                await supabase
                    .from('hives')
                    .update({ apiary_id: params.id })
                    .eq('id', existingHive.id);
                
                await supabase.from('hive_logs').insert({
                    hive_id: existingHive.id,
                    user_id: user?.id,
                    action: 'FLYTTET',
                    details: `Flyttet til ${apiary.name} (via skanning)`
                });

                setScannedHives(prev => [{ number: existingHive.hive_number, status: 'moved', msg: 'Flyttet hit' }, ...prev]);
            } else {
                setScannedHives(prev => [{ number: existingHive.hive_number, status: 'moved', msg: 'Allerede her' }, ...prev]);
            }
        } else {
            // Create new hive
            const { data: newHive, error: createError } = await supabase
                .from('hives')
                .insert({
                    hive_number: hiveNumber,
                    apiary_id: params.id,
                    user_id: user?.id,
                    name: hiveNumber,
                    status: 'AKTIV',
                    type: 'PRODUKSJON'
                })
                .select()
                .single();

            if (createError) throw createError;

            await supabase.from('hive_logs').insert({
                hive_id: newHive.id,
                user_id: user?.id,
                action: 'OPPRETTET',
                details: `Opprettet via skanning i ${apiary.name}`
            });

            setScannedHives(prev => [{ number: hiveNumber, status: 'created', msg: 'Opprettet ny' }, ...prev]);
        }
        
        setScanInput('');
        fetchData();

    } catch (error: any) {
        setScannedHives(prev => [{ number: hiveNumber, status: 'error', msg: 'Feil: ' + error.message }, ...prev]);
    } finally {
        setIsProcessingScan(false);
        const inputEl = document.getElementById('scan-input');
        if (inputEl) inputEl.focus();
    }
  };

  // --- PRINT LOGIC ---
  const generateHiveCardsPDF = async (hivesToPrint: any[], data: any) => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      for (let i = 0; i < hivesToPrint.length; i++) {
        const hive = hivesToPrint[i];
        if (i > 0) doc.addPage();
        
        const hiveData = data[hive.id] || { inspections: [], logs: [] };
        
        // 1. Header
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.line(10, 35, 200, 35);

        // Hive Number
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(40);
        doc.text(hive.hive_number, 10, 25);

        // Hive Name
        doc.setFontSize(16);
        doc.text(hive.name, 10, 32);

        // Right side header
        doc.setFontSize(14);
        doc.text((hive.type || 'PRODUKSJON').toUpperCase(), 200, 20, { align: 'right' });
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(apiary.name, 200, 30, { align: 'right' });
        doc.setTextColor(0, 0, 0);

        // 2. Status & Last Inspection Boxes
        // Status Box
        doc.setFillColor(249, 250, 251); // gray-50
        doc.setDrawColor(229, 231, 235); // gray-200
        doc.roundedRect(10, 45, 90, 30, 3, 3, 'FD');
        
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128); // gray-500
        doc.text('STATUS', 15, 53);
        
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.text(getStatusText(hive), 15, 65);

        // Last Inspection Box
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(110, 45, 90, 30, 3, 3, 'FD');
        
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text('SISTE INSPEKSJON', 115, 53);
        
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.text(hive.last_inspection_date || 'Aldri', 115, 65);

        // 3. Inspection History
        if (printOptions.includeHistory && hiveData.inspections.length > 0) {
            doc.setFontSize(14);
            doc.text('INSPEKSJONSHISTORIKK', 10, 90);
            doc.line(10, 92, 200, 92);

            // Table Header
            let y = 100;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Dato', 10, y);
            doc.text('Status', 40, y);
            doc.text('Notater', 70, y);
            doc.text('Detaljer', 160, y);
            
            y += 2;
            doc.line(10, y, 200, y);
            y += 5;

            doc.setFont('helvetica', 'normal');
            
            const limit = printOptions.inspectionLimit === 'last5' ? 10 : 20;
            const inspections = hiveData.inspections.slice(0, limit);

            for (const insp of inspections) {
                if (y > 250) break; 
                
                doc.text(new Date(insp.inspection_date).toLocaleDateString(), 10, y);
                doc.text(insp.status || 'Ukjent', 40, y);
                
                // Notes (truncated)
                const notes = doc.splitTextToSize(insp.notes || '-', 80);
                doc.text(notes[0], 70, y);

                // Details
                let detailsX = 160;
                if (insp.queen_seen) {
                    doc.setFillColor(220, 252, 231); // green-100
                    doc.rect(detailsX, y-3, 15, 4, 'F');
                    doc.setFontSize(8);
                    doc.setTextColor(21, 128, 61); // green-700
                    doc.text('Dronning', detailsX+1, y);
                    detailsX += 18;
                }
                if (insp.eggs_seen) {
                    doc.setFillColor(220, 252, 231);
                    doc.rect(detailsX, y-3, 10, 4, 'F');
                    doc.setFontSize(8);
                    doc.setTextColor(21, 128, 61);
                    doc.text('Egg', detailsX+1, y);
                }
                
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);

                y += 8;
                doc.setDrawColor(229, 231, 235);
                doc.line(10, y-4, 200, y-4);
            }
        }

        // 4. Footer & QR
        const footerY = 270;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.line(10, footerY, 200, footerY);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Utskrift fra LEK-Biens Vokter™', 10, footerY + 10);

        // QR Code
        try {
            const qrUrl = `${window.location.origin}/hives/${hive.id}`;
            const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 100 });
            doc.addImage(qrDataUrl, 'PNG', 170, footerY - 5, 30, 30);
        } catch (err) {
            console.error('QR Gen Error', err);
        }
      }
      
      doc.save('bikube-kort.pdf');
    } catch (err) {
        console.error('PDF Error', err);
        alert('Kunne ikke generere PDF');
    } finally {
        setIsGeneratingPDF(false);
    }
  };

  const generateQRCodesPDF = async (hivesToPrint: any[]) => {
    setIsGeneratingPDF(true);
    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        // 3 cols x 8 rows = 24 per page
        // Cell size: 70mm x 37mm
        const cols = 3;
        const rows = 8;
        const cellW = 70;
        const cellH = 37;
        
        let col = 0;
        let row = 0;

        for (let i = 0; i < hivesToPrint.length; i++) {
            const hive = hivesToPrint[i];
            
            // New page if needed
            if (i > 0 && i % (cols * rows) === 0) {
                doc.addPage();
                col = 0;
                row = 0;
            }

            const x = col * cellW;
            const y = row * cellH;

            // Draw border (optional, good for cutting)
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.1);
            doc.rect(x, y, cellW, cellH);

            // Content
            // QR Code on right
            try {
                const qrUrl = `${window.location.origin}/hives/${hive.id}`;
                const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 0, width: 100 });
                doc.addImage(qrDataUrl, 'PNG', x + 40, y + 3, 25, 25);
            } catch (err) {
                console.error(err);
            }

            // Text on left
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text(hive.hive_number, x + 5, y + 10);
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(doc.splitTextToSize(hive.name, 35), x + 5, y + 18);
            
            doc.setFontSize(6);
            doc.setTextColor(100, 100, 100);
            doc.text('LEK-Biens Vokter™', x + 5, y + 32);

            // Advance
            col++;
            if (col >= cols) {
                col = 0;
                row++;
            }
        }
        
        doc.save('bikube-qr-koder.pdf');
    } catch (err) {
        console.error('QR PDF Error', err);
        alert('Kunne ikke generere QR-koder');
    } finally {
        setIsGeneratingPDF(false);
    }
  };

  const handlePrint = async (layout: 'cards' | 'list' | 'qr', skipOptions = false) => {
    // If cards and options not skipped, open modal first
    if (layout === 'cards' && !skipOptions) {
        setIsPrintOptionsOpen(true);
        return;
    }

    setLoadingPrintData(true);
    
    // Determine which hives to print
    const hivesToPrint = hives
        .filter(h => selectedHiveIds.size === 0 || selectedHiveIds.has(h.id));

    const hiveIds = hivesToPrint.map(h => h.id);
    let fetchedData: any = {};

    if (hiveIds.length > 0 && layout !== 'qr') {
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
        setPrintData(fetchedData);
    }

    setLoadingPrintData(false);

    if (layout === 'cards') {
        await generateHiveCardsPDF(hivesToPrint, fetchedData);
    } else if (layout === 'qr') {
        await generateQRCodesPDF(hivesToPrint);
    } else {
        // List View - use browser print
        setPrintLayout(layout);
        setTimeout(() => {
            window.print();
        }, 500);
    }
  };

  // --- MASS ACTION LOGIC ---
  const handleMassActionSubmit = async () => {
    if (selectedHiveIds.size === 0 || !massActionType) return;
    setIsSubmittingMassAction(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const ids = Array.from(selectedHiveIds);

        if (massActionType === 'inspeksjon') {
            const inspections = ids.map(id => ({
                hive_id: id,
                user_id: user.id,
                inspection_date: new Date().toISOString().split('T')[0],
                ...massInspectionData
            }));

            const { error } = await supabase.from('inspections').insert(inspections);
            if (error) throw error;
        } else {
            const logs = ids.map(id => ({
                hive_id: id,
                user_id: user.id,
                action: massLogData.action,
                details: massLogData.details
            }));

            const { error } = await supabase.from('hive_logs').insert(logs);
            if (error) throw error;
        }

        alert(`${massActionType === 'inspeksjon' ? 'Inspeksjoner' : 'Logger'} registrert på ${ids.length} kuber!`);
        setIsMassActionModalOpen(false);
        setMassActionType(null);
        // Reset forms
        setMassInspectionData({
            queen_seen: false,
            eggs_seen: false,
            honey_stores: 'middels',
            temperament: 'rolig',
            notes: ''
        });
        setMassLogData({
            action: 'BEHANDLING',
            details: ''
        });
        
        // Refresh data
        fetchData();

    } catch (error: any) {
        alert('Feil ved masseregistrering: ' + error.message);
    } finally {
        setIsSubmittingMassAction(false);
    }
  };

  // --- RENTAL MANAGEMENT LOGIC ---
  const handleUpdateDeliveryDate = async (date: string) => {
    if (!rental) return;
    
    const { error } = await supabase
        .from('rentals')
        .update({ estimated_delivery_date: date })
        .eq('id', rental.id);

    if (error) {
        alert('Kunne ikke oppdatere leveringsdato: ' + error.message);
    } else {
        fetchData();
    }
  };

  const handleCreateInspection = async (date: string) => {
    if (!date) return;
    
    const { error } = await supabase
        .from('inspections')
        .insert({
            apiary_id: params.id,
            rental_id: rental?.id,
            beekeeper_id: currentUser?.id,
            planned_date: date,
            status: 'planned'
        });

    if (error) {
        alert('Kunne ikke opprette inspeksjon: ' + error.message);
    } else {
        fetchData();
    }
  };

  const handleRSVP = async (inspectionId: string, status: string, count: number = 0, sizes: string[] = []) => {
    const { error } = await supabase
        .from('inspections')
        .update({
            tenant_rsvp_status: status,
            attendees_count: count,
            suit_sizes: sizes
        })
        .eq('id', inspectionId);

    if (error) {
        alert('Kunne ikke oppdatere RSVP: ' + error.message);
    } else {
        fetchData();
    }
  };

  // --- DELETE APIARY LOGIC ---
  const handleDeleteApiary = async () => {
    if (hives.length > 0) {
      alert('Du kan ikke slette en bigård som inneholder bikuber. Vennligst flytt bikubene først.');
      if (confirm('Vil du åpne flytte-menyen for å flytte alle kuber nå?')) {
        setSelectedHiveIds(new Set(hives.map(h => h.id)));
        setIsSelectionMode(true);
        setIsMoveModalOpen(true);
      }
      return;
    }

    if (!confirm('Er du sikker på at du vil slette denne lokasjonen?')) return;

    const { error } = await supabase
      .from('apiaries')
      .delete()
      .eq('id', params.id);

    if (error) {
      alert('Kunne ikke slette: ' + error.message);
    } else {
      router.push('/dashboard');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lager': return Warehouse;
      case 'butikk': return Store;
      case 'bil': return Truck;
      default: return MapPin;
    }
  };

  const getStatusColor = (hive: any) => {
    if (hive.active === false) return 'bg-gray-100 text-gray-500 border-gray-200';
    switch (hive.status) {
      case 'DØD': return 'bg-red-100 text-red-800 border-red-200';
      case 'SVAK': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'AKTIV': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusText = (hive: any) => {
    if (hive.active === false) return 'INAKTIV';
    return hive.status || 'AKTIV';
  };

  if (loading) return <div className="p-8 text-center">Laster...</div>;
  if (!apiary) return <div className="p-8 text-center">Fant ikke bigård</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 print:bg-white print:pb-0">
      {/* Page Title & Actions */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 print:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{apiary.name}</h1>
              <p className="text-sm text-gray-500">{apiary.apiary_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/apiaries/${params.id}/edit`}
              className="p-2 hover:bg-gray-100 text-gray-600 rounded-full"
              title="Rediger lokasjon"
            >
              <Edit className="w-5 h-5" />
            </Link>
            <button 
              onClick={handleDeleteApiary}
              className="p-2 hover:bg-red-50 text-red-500 rounded-full"
              title="Slett lokasjon"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <main className="p-4 space-y-4 print:hidden">
        {/* Actions Bar */}
        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
           <div className="flex items-center gap-2">
             <span className="font-semibold text-gray-900 whitespace-nowrap">{hives.length} Kuber</span>
           </div>
           
           <div className="flex gap-2 items-center">
             <button 
                onClick={() => {
                    setIsScanModalOpen(true);
                    setTimeout(() => document.getElementById('scan-input')?.focus(), 100);
                }}
                className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-800 whitespace-nowrap"
             >
                <QrCode className="w-4 h-4" />
                Skann / Ny
             </button>

             {isSelectionMode && selectedHiveIds.size > 0 && (
                <>
                  <div className="h-6 w-px bg-gray-300 mx-1 hidden md:block"></div>
                  
                  {/* Mass Actions */}
                  <button 
                    onClick={() => {
                        setMassActionType('inspeksjon');
                        setIsMassActionModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-honey-100 text-honey-800 hover:bg-honey-200 whitespace-nowrap flex items-center gap-2"
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span className="hidden md:inline">Registrer Hendelse</span>
                    <span className="md:hidden">Hendelse</span>
                  </button>

                  <div className="h-6 w-px bg-gray-300 mx-1 hidden md:block"></div>

                  {/* Print Buttons */}
                  <div className="flex gap-1">
                      <button 
                        onClick={() => handlePrint('list')}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                        title="Skriv ut liste"
                      >
                        <List className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handlePrint('cards')}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                        title="Skriv ut kort"
                      >
                        <CreditCard className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handlePrint('qr')}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                        title="Skriv ut QR-koder"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                  </div>
                </>
             )}

             {hives.length > 0 && (
               <>
                 {isSelectionMode && (
                   <button 
                     onClick={selectAll}
                     className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap"
                   >
                     {selectedHiveIds.size === hives.length ? 'Velg ingen' : 'Velg alle'}
                   </button>
                 )}
                 <button 
                   onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedHiveIds(new Set());
                   }}
                   className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                     isSelectionMode 
                       ? 'bg-red-50 text-red-600 border border-red-100' 
                       : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                   }`}
                 >
                   {isSelectionMode ? 'Avbryt' : 'Velg'}
                 </button>
               </>
             )}
           </div>
        </div>

        {/* Rental Management Section */}
        {(apiary.type === 'rental' && (apiary.managed_by === currentUser?.id || apiary.user_id === currentUser?.id)) && (
          <div className="bg-white rounded-xl border border-honey-200 shadow-sm overflow-hidden">
            <div className="bg-honey-50 px-4 py-3 border-b border-honey-100 flex justify-between items-center">
               <h2 className="font-bold text-honey-900 flex items-center gap-2">
                 <Truck className="w-5 h-5" />
                 Leieavtale & Levering
               </h2>
               <span className="text-xs font-bold uppercase bg-white px-2 py-1 rounded text-honey-800 border border-honey-200">
                 {rental?.status || 'PENDING'}
               </span>
            </div>
            
            <div className="p-4 space-y-4">
               {/* Delivery Date */}
               <div className="flex justify-between items-center">
                 <div>
                   <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Planlagt Levering</label>
                   {apiary.managed_by === currentUser?.id ? (
                      <input 
                        type="date" 
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        value={rental?.estimated_delivery_date ? new Date(rental.estimated_delivery_date).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleUpdateDeliveryDate(e.target.value)}
                      />
                   ) : (
                      <div className="font-medium text-gray-900">
                        {rental?.estimated_delivery_date 
                           ? new Date(rental.estimated_delivery_date).toLocaleDateString() 
                           : 'Ikke satt enda'}
                      </div>
                   )}
                 </div>
                 
                 {apiary.managed_by === currentUser?.id && (
                    <button className="text-sm bg-honey-500 text-white px-3 py-1.5 rounded hover:bg-honey-600">
                       Oppdater Status
                    </button>
                 )}
               </div>

               {/* Inspections List */}
               <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between items-center mb-3">
                     <h3 className="font-bold text-gray-900 text-sm">Inspeksjoner</h3>
                     {apiary.managed_by === currentUser?.id && (
                        <button 
                            onClick={() => {
                                const date = prompt('Dato for inspeksjon (YYYY-MM-DD):');
                                if (date) handleCreateInspection(date);
                            }}
                            className="text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-800"
                        >
                            + Ny Inspeksjon
                        </button>
                     )}
                  </div>
                  
                  {inspections.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Ingen planlagte inspeksjoner.</p>
                  ) : (
                      <div className="space-y-2">
                         {inspections.map(insp => (
                            <div key={insp.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-start">
                               <div>
                                  <div className="font-bold text-gray-900">
                                     {new Date(insp.planned_date).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                     Ansvarlig: {insp.beekeeper?.full_name || 'Birøkter'}
                                  </div>
                                  {insp.tenant_rsvp_status !== 'pending' && (
                                     <div className="mt-1 text-xs">
                                        <span className={`font-bold ${insp.tenant_rsvp_status === 'attending' ? 'text-green-600' : 'text-red-500'}`}>
                                           {insp.tenant_rsvp_status === 'attending' ? `Kommer (${insp.attendees_count} pers)` : 'Kan ikke'}
                                        </span>
                                        {insp.suit_sizes && (
                                            <div className="text-gray-500">Str: {Array.isArray(insp.suit_sizes) ? insp.suit_sizes.join(', ') : JSON.stringify(insp.suit_sizes)}</div>
                                        )}
                                     </div>
                                  )}
                               </div>
                               
                               {/* RSVP Action for Tenant */}
                               {apiary.user_id === currentUser?.id && insp.status === 'planned' && (
                                   <div className="flex flex-col gap-1">
                                      {rsvpInspectionId === insp.id ? (
                                         <div className="bg-white p-2 rounded shadow-sm border border-gray-200 text-right">
                                             <div className="mb-2 text-left bg-blue-50 p-2 rounded text-[10px] text-blue-800">
                                                <p className="font-bold">Betaling:</p>
                                                <p>Inspeksjon/Leie av drakt betales via Vipps.</p>
                                             </div>
                                             <input 
                                                 type="number" min="1" 
                                                 className="border p-1 w-16 text-sm mb-1" 
                                                 placeholder="Antall"
                                                 value={rsvpCount}
                                                 onChange={e => setRsvpCount(parseInt(e.target.value))}
                                             />
                                             <input 
                                                 type="text" 
                                                 className="border p-1 w-24 text-sm mb-1" 
                                                 placeholder="Str (S,M,L)"
                                                 value={rsvpSizes}
                                                 onChange={e => setRsvpSizes(e.target.value)}
                                             />
                                             <div className="flex gap-1 justify-end mt-1">
                                                <button onClick={() => setRsvpInspectionId(null)} className="text-xs text-gray-500">Avbryt</button>
                                                <button 
                                                    onClick={() => {
                                                        const sizes = rsvpSizes.split(',').map(s => s.trim());
                                                        if (confirm(`Betal ${rsvpCount * 150} kr med Vipps og bekreft?`)) {
                                                            handleRSVP(insp.id, 'attending', rsvpCount, sizes);
                                                            setRsvpInspectionId(null);
                                                        }
                                                    }}
                                                    className="text-xs bg-[#ff5b24] text-white px-2 py-1 rounded font-bold flex items-center gap-1"
                                                >
                                                    <span>Vipps & Bekreft</span>
                                                </button>
                                             </div>
                                          </div>
                                      ) : (
                                        <>
                                          <button 
                                            onClick={() => setRsvpInspectionId(insp.id)}
                                            className="text-xs bg-honey-100 text-honey-800 px-2 py-1 rounded font-medium hover:bg-honey-200"
                                          >
                                            Bli med 👋
                                          </button>
                                          <button 
                                            onClick={() => handleRSVP(insp.id, 'not_attending')}
                                            className="text-xs text-gray-400 hover:text-gray-600 underline"
                                          >
                                            Kan ikke
                                          </button>
                                        </>
                                      )}
                                   </div>
                               )}
                            </div>
                         ))}
                      </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {isSelectionMode && (
          <div className="fixed bottom-20 left-4 right-4 bg-gray-900 text-white p-4 rounded-xl shadow-xl flex justify-between items-center z-20 animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-3">
              <button onClick={selectAll} className="text-sm font-medium hover:text-honey-400">
                {selectedHiveIds.size === hives.length ? 'Velg ingen' : 'Velg alle'}
              </button>
              <span className="text-gray-500">|</span>
              <span className="font-bold">{selectedHiveIds.size} valgt</span>
            </div>
            
            <button
              onClick={() => setIsMoveModalOpen(true)}
              disabled={selectedHiveIds.size === 0}
              className="bg-honey-500 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Flytt valgte
            </button>
          </div>
        )}

        {/* Hives List */}
        {hives.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <Archive className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="mb-4">Ingen bikuber her enda. Opprett fra oversikten.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hives.map((hive) => (
              <div 
                key={hive.id} 
                className={`bg-white p-4 rounded-xl border shadow-sm transition-all hover:border-honey-300 ${
                  selectedHiveIds.has(hive.id) 
                    ? 'border-honey-500 ring-1 ring-honey-500 bg-honey-50' 
                    : 'border-gray-200'
                }`}
                onClick={() => {
                  if (isSelectionMode) toggleSelection(hive.id);
                  else router.push(`/hives/${hive.id}`);
                }}
              >
                <div className="flex items-start gap-3">
                    {/* Selection Checkbox */}
                    {isSelectionMode && (
                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        selectedHiveIds.has(hive.id) ? 'bg-honey-500 border-honey-500' : 'border-gray-300 bg-white'
                    }`}>
                        {selectedHiveIds.has(hive.id) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    )}
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-honey-600 font-black text-lg tracking-tight">
                                    {hive.hive_number}
                                </span>
                                <h3 className="font-bold text-gray-900 truncate">
                                    {hive.name !== hive.hive_number ? hive.name : ''}
                                </h3>
                                
                                {/* Type Badge */}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                    hive.type === 'AVLEGGER' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-purple-100 text-purple-700'
                                }`}>
                                    {hive.type === 'AVLEGGER' ? 'Avlegger' : 'Prod'}
                                </span>
                            </div>

                            {/* Status Badge */}
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                (hive.active === false ? 'inaktiv' : (hive.status || 'aktiv')).toLowerCase() === 'aktiv' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                {hive.active === false ? 'INAKTIV' : (hive.status || 'AKTIV')}
                            </div>
                        </div>

                        {/* Secondary Info */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                    Sist inspisert: {hive.last_inspection_date 
                                        ? new Date(hive.last_inspection_date).toLocaleDateString() 
                                        : 'Aldri'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Action Button (only when not selecting) */}
                    {!isSelectionMode && (
                        <Link 
                            href={`/hives/${hive.id}/new-inspection`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-honey-600 hover:bg-honey-50 rounded-full transition-colors"
                            title="Ny inspeksjon"
                        >
                            <ClipboardList className="w-5 h-5" />
                        </Link>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MOVE MODAL */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-honey-50">
              <h3 className="font-bold text-lg text-gray-900">Flytt {selectedHiveIds.size} kuber</h3>
              <button onClick={() => setIsMoveModalOpen(false)}><X className="w-6 h-6 text-gray-500" /></button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">Velg destinasjon:</p>
              
              <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-4">
                {availableApiaries.map((a) => {
                  const Icon = getIcon(a.type);
                  const isSelected = targetApiaryId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setTargetApiaryId(a.id)}
                      className={`w-full p-3 rounded-lg border flex items-center gap-3 transition-all ${
                        isSelected 
                          ? 'border-honey-500 bg-honey-50 ring-1 ring-honey-500' 
                          : 'border-gray-200 hover:border-honey-300'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${isSelected ? 'bg-honey-100 text-honey-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-medium text-gray-900">{a.name}</div>
                        <div className="text-xs text-gray-500">{a.apiary_number}</div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-honey-600" />}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleMoveSubmit}
                disabled={!targetApiaryId || isMoving}
                className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isMoving ? 'Flytter...' : 'Bekreft flytting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MASS ACTION MODAL */}
      {isMassActionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
              <h3 className="font-bold text-lg">
                {massActionType === 'inspeksjon' ? 'Masse-inspeksjon' : 'Masse-logg'}
              </h3>
              <button onClick={() => setIsMassActionModalOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-white" /></button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Du registrerer nå på <span className="font-bold">{selectedHiveIds.size}</span> valgte kuber.
              </p>

              {massActionType === 'inspeksjon' ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 border p-3 rounded-lg w-full cursor-pointer hover:bg-gray-50">
                      <input 
                        type="checkbox" 
                        checked={massInspectionData.queen_seen}
                        onChange={e => setMassInspectionData({...massInspectionData, queen_seen: e.target.checked})}
                        className="w-5 h-5 text-honey-600 rounded"
                      />
                      <span className="font-medium">Dronning sett</span>
                    </label>
                    <label className="flex items-center gap-2 border p-3 rounded-lg w-full cursor-pointer hover:bg-gray-50">
                      <input 
                        type="checkbox" 
                        checked={massInspectionData.eggs_seen}
                        onChange={e => setMassInspectionData({...massInspectionData, eggs_seen: e.target.checked})}
                        className="w-5 h-5 text-honey-600 rounded"
                      />
                      <span className="font-medium">Egg sett</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Lynne</label>
                    <select 
                      value={massInspectionData.temperament}
                      onChange={e => setMassInspectionData({...massInspectionData, temperament: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2.5"
                    >
                      <option value="rolig">Rolig</option>
                      <option value="middels">Middels</option>
                      <option value="aggressiv">Aggressiv</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Notat</label>
                    <textarea 
                      value={massInspectionData.notes}
                      onChange={e => setMassInspectionData({...massInspectionData, notes: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2.5 h-24"
                      placeholder="Notat som gjelder alle kubene..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                   {/* Logg form fields here if needed later */}
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setIsMassActionModalOpen(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button 
                  onClick={handleMassActionSubmit}
                  disabled={isSubmittingMassAction}
                  className="flex-1 py-3 bg-honey-500 text-white rounded-lg font-bold hover:bg-honey-600 disabled:opacity-50"
                >
                  {isSubmittingMassAction ? 'Lagrer...' : 'Lagre registrering'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT OPTIONS MODAL */}
      {isPrintOptionsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
                    <h3 className="font-bold text-lg">Utskriftsvalg</h3>
                    <button onClick={() => setIsPrintOptionsOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-white" /></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={printOptions.includeHistory}
                            onChange={(e) => setPrintOptions({...printOptions, includeHistory: e.target.checked})}
                            className="w-5 h-5 text-honey-600"
                        />
                        <span className="font-medium">Inkluder inspeksjonshistorikk</span>
                    </label>

                    {printOptions.includeHistory && (
                        <div className="pl-8 space-y-2">
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input 
                                    type="radio"
                                    name="limit"
                                    checked={printOptions.inspectionLimit === 'last5'}
                                    onChange={() => setPrintOptions({...printOptions, inspectionLimit: 'last5'})}
                                    className="text-honey-600"
                                />
                                Siste 5 inspeksjoner
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input 
                                    type="radio"
                                    name="limit"
                                    checked={printOptions.inspectionLimit === 'all'}
                                    onChange={() => setPrintOptions({...printOptions, inspectionLimit: 'all'})}
                                    className="text-honey-600"
                                />
                                Alle inspeksjoner
                            </label>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setIsPrintOptionsOpen(false);
                            handlePrint('cards', true);
                        }}
                        className="w-full bg-honey-500 text-white font-bold py-3 rounded-lg hover:bg-honey-600 mt-4"
                    >
                        Skriv ut
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* SCAN MODAL */}
      {isScanModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-900 text-white">
              <div className="flex items-center gap-2">
                <QrCode className="w-6 h-6" />
                <h3 className="font-bold text-lg">Hurtig-registrering</h3>
              </div>
              <button onClick={() => setIsScanModalOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-white" /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-6">
                Skann QR-koden på kuben eller skriv inn nummeret manuelt og trykk enter. 
                Hvis kuben ikke finnes, blir den opprettet her. Hvis den finnes, flyttes den hit.
              </p>

              <form onSubmit={handleScanSubmit} className="mb-8">
                <div className="relative">
                    <input
                        id="scan-input"
                        type="text"
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        placeholder="KUBE-XXX"
                        className="w-full text-3xl font-mono font-bold p-4 border-2 border-gray-300 rounded-xl focus:border-honey-500 focus:ring-4 focus:ring-honey-100 outline-none text-center uppercase placeholder-gray-200"
                        autoComplete="off"
                    />
                    {isProcessingScan && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-honey-500"></div>
                        </div>
                    )}
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">Trykk Enter for å registrere</p>
              </form>

              {/* Recent Scans */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">Nylig skannet</h4>
                {scannedHives.length === 0 ? (
                    <div className="text-center py-8 text-gray-300 italic">Ingen kuber skannet enda</div>
                ) : (
                    scannedHives.map((item, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                            item.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                        } animate-in slide-in-from-top-2 fade-in duration-300`}>
                            <div className="flex items-center gap-3">
                                <div className={`font-mono font-bold ${item.status === 'error' ? 'text-red-700' : 'text-green-700'}`}>
                                    {item.number}
                                </div>
                                <div className="text-sm text-gray-600">{item.msg}</div>
                            </div>
                            {item.status !== 'error' && <Check className="w-5 h-5 text-green-600" />}
                        </div>
                    ))
                )}
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50">
                <button 
                    onClick={() => setIsScanModalOpen(false)}
                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800"
                >
                    Ferdig
                </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT CONTENT (Hidden on screen) */}
      {printLayout === 'list' && (
        <div className="hidden print:block p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2">Bikubeoversikt - {apiary.name}</h1>
                <p className="text-sm text-gray-500">Utskriftsdato: {new Date().toLocaleDateString()}</p>
            </div>

            <table className="w-full text-left border-collapse text-xs">
                <thead>
                    <tr className="border-b-2 border-black">
                        <th className="py-2 font-bold w-16">Kube #</th>
                        <th className="py-2 font-bold w-32">Navn</th>
                        <th className="py-2 font-bold w-16">Status</th>
                        <th className="py-2 font-bold w-64">Siste Inspeksjon</th>
                        <th className="py-2 font-bold">Siste Logg</th>
                    </tr>
                </thead>
                <tbody>
                    {hives
                        .filter(h => selectedHiveIds.size === 0 || selectedHiveIds.has(h.id))
                        .map(hive => {
                            const lastInsp = printData[hive.id]?.inspections?.[0];
                            const lastLog = printData[hive.id]?.logs?.[0];
                            return (
                                <tr key={hive.id} className="border-b border-gray-300 break-inside-avoid">
                                    <td className="py-2 align-top font-mono font-bold">{hive.hive_number}</td>
                                    <td className="py-2 align-top">
                                        <div className="font-bold">{hive.name}</div>
                                        <div className="text-gray-500 uppercase text-[10px]">{hive.type || 'PRODUKSJON'}</div>
                                    </td>
                                    <td className="py-2 align-top">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getStatusColor(hive)}`}>
                                            {getStatusText(hive)}
                                        </span>
                                    </td>
                                    <td className="py-2 align-top">
                                        {lastInsp ? (
                                            <div>
                                                <div className="font-bold">{new Date(lastInsp.inspection_date).toLocaleDateString()}</div>
                                                <div className="flex gap-1 flex-wrap mt-0.5">
                                                    {lastInsp.queen_seen && <span className="text-[10px] bg-green-50 text-green-700 px-1 rounded">Dronning</span>}
                                                    {lastInsp.eggs_seen && <span className="text-[10px] bg-green-50 text-green-700 px-1 rounded">Egg</span>}
                                                </div>
                                                {lastInsp.notes && <div className="text-gray-600 italic mt-1 line-clamp-3">{lastInsp.notes}</div>}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="py-2 align-top">
                                        {lastLog ? (
                                            <div>
                                                <div className="font-bold">{new Date(lastLog.created_at).toLocaleDateString()}</div>
                                                <div className="text-[10px] uppercase font-bold text-gray-500">{lastLog.action}</div>
                                                <div className="text-gray-600 line-clamp-2">{lastLog.details}</div>
                                            </div>
                                        ) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
}
