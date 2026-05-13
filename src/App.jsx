import React, { useState, useEffect, useRef } from 'react';
import { Search, Upload, Trash2, X, Lock, CheckCircle, XCircle, AlertTriangle, Download, MapPin, Calendar, Users, Home, BookOpen, Map, User, Heart } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { supabase } from './supabaseClient';
import appLogo from './assets/logo.png';
import Papa from 'papaparse';

const formatWhatsAppNumber = (phone) => {
  if (!phone) return '';
  // Remove all non-numeric characters
  let cleanNumber = String(phone).replace(/\D/g, '');
  
  // Format to standard 62
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '62' + cleanNumber.substring(1);
  } else if (cleanNumber.startsWith('8')) {
    cleanNumber = '62' + cleanNumber;
  }
  
  return cleanNumber;
};

const toTitleCase = (str) => {
  if (!str) return '';
  return str.toString().toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
};

const calculateAge = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  
  let birthDate;
  
  // Try to parse DD-MM-YYYY, DD/MM/YYYY, or DD.MM.YYYY
  const indonesianDateMatch = dateString.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (indonesianDateMatch) {
    // DD-MM-YYYY
    birthDate = new Date(`${indonesianDateMatch[3]}-${indonesianDateMatch[2]}-${indonesianDateMatch[1]}`);
  } else {
    // Fallback standard parse
    const monthMap = {
      'januari': 'Jan', 'februari': 'Feb', 'maret': 'Mar', 'april': 'Apr', 'mei': 'May', 'juni': 'Jun',
      'juli': 'Jul', 'agustus': 'Aug', 'september': 'Sep', 'oktober': 'Oct', 'november': 'Nov', 'desember': 'Dec'
    };
    let engDateStr = dateString.toLowerCase();
    Object.keys(monthMap).forEach(idMonth => {
      engDateStr = engDateStr.replace(idMonth, monthMap[idMonth]);
    });
    birthDate = new Date(engDateStr);
  }

  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }
  
  let ageString = '';
  if (years > 0) ageString += `${years} Thn `;
  if (months > 0) ageString += `${months} Bln `;
  if (days > 0) ageString += `${days} Hr`;
  
  return ageString.trim() || '0 Hr';
};


function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // PWA Install States
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // Admin States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef(null);

  // Custom Dialog States
  const [dialog, setDialog] = useState({ 
    isOpen: false, 
    type: '', // confirm_upload, confirm_delete, alert_success, alert_error
    title: '', 
    message: '', 
    onConfirm: null 
  });

  const [stats, setStats] = useState({ aktif: 0, boyong: 0, isLoading: true });

  const fetchStats = async () => {
    try {
      const [{ count: countAktif }, { count: countBoyong }] = await Promise.all([
        supabase.from('informasimazeeda').select('*', { count: 'exact', head: true }).ilike('status_siswi', '%aktif%'),
        supabase.from('informasimazeeda').select('*', { count: 'exact', head: true }).ilike('status_siswi', '%boyong%')
      ]);
      
      setStats({ aktif: countAktif || 0, boyong: countBoyong || 0, isLoading: false });
    } catch (err) {
      console.error("Gagal mengambil statistik", err);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      async function searchSiswi() {
        // Jika query kosong dan tidak ada filter aktif
        if (!query.trim() && !hasSearched) {
          setResults([]);
          return;
        }

        if (!query.trim()) {
           // Jika query kosong karena dihapus, reset hasil
           setResults([]);
           setHasSearched(false);
           return;
        }

        setIsLoading(true);
        setHasSearched(true);
        
        try {
          // Smart Search: Mencari di beberapa kolom sekaligus
          const searchTerm = `%${query.trim()}%`;
          const { data, error } = await supabase
            .from('informasimazeeda')
            .select('*')
            .or(`nama_siswi.ilike.${searchTerm},daerah_santri.ilike.${searchTerm},kamar_siswi.ilike.${searchTerm},domisili.ilike.${searchTerm}`)
            .limit(30);
            
          if (error) {
            console.error("Error fetching data:", error);
          } else {
            setResults(data || []);
          }
        } catch (error) {
           console.error("Unexpected error:", error);
        } finally {
          setIsLoading(false);
        }
      }
      
      searchSiswi();
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const showStudentsByStatus = async (status) => {
    setQuery(''); // Kosongkan query pencarian
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const { data, error } = await supabase
        .from('informasimazeeda')
        .select('*')
        .ilike('status_siswi', `%${status}%`)
        .limit(100); // Batasi 100 agar tidak berat
        
      if (error) {
        console.error("Error fetching data:", error);
      } else {
        setResults(data || []);
      }
    } catch (error) {
       console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openWhatsApp = (phone) => {
    const waNumber = formatWhatsAppNumber(phone);
    if (waNumber) {
      window.open(`https://wa.me/${waNumber}`, '_blank');
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'cinapuyeng') {
      setIsAdmin(true);
      setShowLoginModal(false);
      setShowAdminPanel(true);
      setPasswordInput('');
      setLoginError('');
    } else {
      setLoginError('Password salah!');
    }
  };

  const handleDeleteClick = () => {
    setDialog({
      isOpen: true,
      type: 'confirm_delete',
      title: 'Hapus Semua Data',
      message: 'Yakin ingin menghapus SEMUA data? Aksi ini tidak dapat dibatalkan dan semua data siswi akan hilang!',
      onConfirm: () => processDeleteAll()
    });
  };

  const processDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('informasimazeeda')
        .delete()
        .neq('id', 0); // Hack to delete all rows (id != 0)
        
      if (error) throw error;
      
      setDialog({
        isOpen: true,
        type: 'alert_success',
        title: 'Berhasil Dihapus',
        message: 'Seluruh data informasi siswi telah berhasil dihapus dari sistem.'
      });
      setResults([]);
      fetchStats();
    } catch (err) {
      console.error(err);
      setDialog({
        isOpen: true,
        type: 'alert_error',
        title: 'Gagal Menghapus',
        message: 'Terjadi kesalahan saat menghapus data: ' + err.message
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setDialog({
      isOpen: true,
      type: 'confirm_upload',
      title: 'Konfirmasi Upload',
      message: 'Tindakan ini akan MENGHAPUS semua data yang ada saat ini dan MENIMPA nya dengan data dari CSV. Apakah Anda yakin?',
      onConfirm: () => processFileUpload(file)
    });
  };

  const processFileUpload = (file) => {
    setIsUploading(true);
    setUploadMessage('Membaca file CSV...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data;
        if (data.length === 0) {
          setUploadMessage('File CSV kosong.');
          setIsUploading(false);
          return;
        }

        try {
          setUploadMessage('Menghapus data lama...');
          // Delete old data
          const { error: deleteError } = await supabase
            .from('informasimazeeda')
            .delete()
            .neq('id', 0);
            
          if (deleteError) throw deleteError;

          setUploadMessage(`Mengunggah ${data.length} baris data baru...`);
          
          const cleanData = data.map(row => {
            const cleanRow = {};
            for (let key in row) {
              if (key && key.trim() !== '') {
                cleanRow[key.trim()] = row[key];
              }
            }
            // hapus id jika ada di CSV agar supabase membuat auto increment baru
            delete cleanRow['id'];
            return cleanRow;
          });

          // Insert in chunks
          const chunkSize = 500;
          for (let i = 0; i < cleanData.length; i += chunkSize) {
            const chunk = cleanData.slice(i, i + chunkSize);
            const { error: insertError } = await supabase
              .from('informasimazeeda')
              .insert(chunk);
              
            if (insertError) throw insertError;
          }

          setUploadMessage('Upload selesai!');
          setDialog({
            isOpen: true,
            type: 'alert_success',
            title: 'Upload Berhasil',
            message: `Sebanyak ${data.length} baris data berhasil ditambahkan ke dalam sistem.`
          });
          setTimeout(() => setUploadMessage(''), 3000);
          fetchStats();
          
        } catch (err) {
          console.error(err);
          setUploadMessage('');
          setDialog({
            isOpen: true,
            type: 'alert_error',
            title: 'Upload Gagal',
            message: 'Gagal mengupload data: ' + err.message
          });
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error(error);
        setUploadMessage('');
        setDialog({
          isOpen: true,
          type: 'alert_error',
          title: 'Format CSV Salah',
          message: 'Gagal membaca isi file CSV. Pastikan format file sudah benar.'
        });
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center pb-safe font-sans">
      <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative pb-10">
        
        {/* Header */}
        <div className="bg-mazeeda-blue text-white pt-10 pb-12 px-6 rounded-b-[2.5rem] relative shadow-md">
          <div className="flex flex-col items-center">
            {/* Logo */}
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border-2 border-white/60 shadow-inner overflow-hidden">
              <img src={appLogo} alt="Logo MAZEEDA" className="w-full h-full object-cover bg-white" />
            </div>
            <h1 className="text-xl font-bold text-center leading-tight mt-2">
              INFORMASI MAZEEDA
            </h1>
          </div>
        </div>

        {/* Search Bar - Floating */}
        <div className="px-6 -mt-6 sticky top-4 z-10">
          <div className="bg-white rounded-2xl shadow-lg flex flex-col border border-gray-100 overflow-hidden">
            <div className="flex items-center px-4 py-3 relative">
              <Search className="text-gray-400 w-5 h-5 mr-3 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Cari nama, asal, domisili..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 outline-none text-gray-700 bg-transparent placeholder-gray-400 min-w-0"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors flex-shrink-0 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Admin Panel (if opened) */}
        {isAdmin && showAdminPanel && (
          <div className="px-6 mt-6 mb-2">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 relative">
              <button 
                onClick={() => setShowAdminPanel(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-mazeeda-blue mb-3 flex items-center">
                <Lock className="w-4 h-4 mr-2" /> Panel Admin
              </h3>
              
              <div className="flex flex-col gap-3">
                {/* Upload Section */}
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    disabled={isUploading || isDeleting}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className={`bg-white border-2 border-dashed border-blue-300 rounded-xl p-4 text-center flex flex-col items-center justify-center ${isUploading ? 'opacity-70' : 'hover:bg-blue-100'} transition-colors`}>
                    <Upload className="w-6 h-6 text-mazeeda-blue mb-2" />
                    <span className="text-sm font-medium text-gray-700">
                      {isUploading ? 'Memproses CSV...' : 'Upload CSV Baru'}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">Data lama akan ditimpa</span>
                  </div>
                </div>
                
                {/* Status Message */}
                {uploadMessage && (
                  <div className="text-xs text-center p-2 bg-blue-100 text-blue-800 rounded-lg font-medium">
                    {uploadMessage}
                  </div>
                )}
                
                {/* Delete Section */}
                <button 
                  onClick={handleDeleteClick}
                  disabled={isUploading || isDeleting}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 rounded-xl flex items-center justify-center font-medium transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? 'Menghapus...' : 'Hapus Semua Data'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="px-6 py-6">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
                  <div className="w-24 h-6 bg-blue-100 rounded-lg"></div>
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="flex gap-2 mt-2">
                    <div className="h-10 bg-green-100 rounded-xl w-full"></div>
                    <div className="h-10 bg-blue-100 rounded-xl w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-5">
              <div className="text-sm text-gray-500 mb-1 px-1 flex justify-between items-center">
                <span>Ditemukan {results.length} hasil</span>
              </div>
              {results.map((siswi) => (
                <div key={siswi.id} className="bg-white border border-gray-100 p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                  {/* Header Card: Avatar, Badge, & Name */}
                  <div className="flex items-center gap-4 mb-5">
                    {/* Foto / Avatar Initial */}
                    <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-white shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center ring-2 ring-gray-50">
                      {siswi.foto_url && siswi.foto_url.trim() !== '' && siswi.foto_url !== '-' ? (
                        <img 
                          src={siswi.foto_url} 
                          alt={`Foto ${siswi.nama_siswi}`} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.target.onerror = null; 
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span className="text-2xl font-bold text-mazeeda-blue" style={{ display: (siswi.foto_url && siswi.foto_url.trim() !== '' && siswi.foto_url !== '-') ? 'none' : 'flex' }}>
                        {siswi.nama_siswi ? siswi.nama_siswi.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                    
                    {/* Info Text */}
                    <div className="flex flex-col">
                      <div className="self-start">
                        <span className="inline-block bg-blue-50 text-mazeeda-blue text-[10px] font-bold px-2 py-0.5 rounded-md mb-1.5 border border-blue-100 uppercase tracking-wider">
                          {siswi.bagian ? toTitleCase(siswi.bagian) : 'Tanpa Bagian'}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-gray-800 leading-tight">
                        {toTitleCase(siswi.nama_siswi)}
                      </h2>
                    </div>
                  </div>
                  
                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-4 text-sm text-gray-700 mb-6 bg-gradient-to-br from-gray-50 to-white p-5 rounded-2xl border border-gray-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                    <div className="flex gap-2.5">
                      <div className="mt-0.5"><User className="w-4 h-4 text-blue-400" /></div>
                      <div>
                        <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Nama Ayah</span> 
                        <span className="font-medium text-gray-800">{siswi.nama_ayah ? toTitleCase(siswi.nama_ayah) : '-'}</span>
                        {siswi.status_ayah && String(siswi.status_ayah).trim().toLowerCase() !== 'hidup' && String(siswi.status_ayah).trim() !== '-' && <span className="text-gray-400 text-xs ml-1 italic">(Alm.)</span>}
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="mt-0.5"><Heart className="w-4 h-4 text-pink-400" /></div>
                      <div>
                        <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Nama Ibu</span> 
                        <span className="font-medium text-gray-800">{siswi.nama_ibu ? toTitleCase(siswi.nama_ibu) : '-'}</span>
                        {siswi.status_ibu && String(siswi.status_ibu).trim().toLowerCase() !== 'hidup' && String(siswi.status_ibu).trim() !== '-' && <span className="text-gray-400 text-xs ml-1 italic">(Almh.)</span>}
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="mt-0.5"><Map className="w-4 h-4 text-emerald-400" /></div>
                      <div>
                        <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Daerah Santri</span> 
                        <span className="font-medium text-gray-800">{siswi.daerah_santri ? toTitleCase(siswi.daerah_santri) : '-'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="mt-0.5"><Calendar className="w-4 h-4 text-amber-400" /></div>
                      <div>
                        <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Tanggal Lahir</span> 
                        <span className="font-medium text-gray-800">{siswi.tanggal_lahir ? toTitleCase(siswi.tanggal_lahir) : '-'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="mt-0.5"><User className="w-4 h-4 text-indigo-400" /></div>
                      <div>
                        <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Umur Siswi</span> 
                        <span className="font-medium text-gray-800">{calculateAge(siswi.tanggal_lahir) || (siswi.umur_siswi ? toTitleCase(siswi.umur_siswi) : '-')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="mt-0.5"><Users className="w-4 h-4 text-orange-400" /></div>
                      <div>
                        <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Keluarga</span> 
                        <span className="font-medium text-gray-800">Anak ke-{siswi.anak_ke || '-'} dr {siswi.jumlah_saudara || '-'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="mt-0.5"><Home className="w-4 h-4 text-teal-400" /></div>
                      <div>
                        <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Kamar</span> 
                        <span className="font-medium text-gray-800">{siswi.kamar_siswi ? toTitleCase(siswi.kamar_siswi) : '-'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="mt-0.5"><CheckCircle className="w-4 h-4 text-green-500" /></div>
                      <div>
                        <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Status Siswi</span> 
                        <span className="font-medium text-gray-800">{siswi.status_siswi ? toTitleCase(siswi.status_siswi) : '-'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="mt-0.5"><BookOpen className="w-4 h-4 text-purple-400" /></div>
                      <div>
                        <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Status Tahfiz</span> 
                        <span className="font-medium text-gray-800">{siswi.status_tahfiz ? toTitleCase(siswi.status_tahfiz) : '-'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="mt-0.5"><MapPin className="w-4 h-4 text-red-400" /></div>
                      <div>
                        <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Domisili</span> 
                        <span className="font-medium text-gray-800">{siswi.domisili ? toTitleCase(siswi.domisili) : '-'}</span>
                      </div>
                    </div>
                    <div className="col-span-2 flex gap-2.5 mt-1 pt-3 border-t border-gray-100">
                      <div className="mt-0.5"><MapPin className="w-4 h-4 text-gray-400" /></div>
                      <div>
                        <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Alamat Lengkap</span> 
                        <span className="font-medium text-gray-800 leading-snug block uppercase">{siswi.alamat_lengkap ? siswi.alamat_lengkap : '-'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    {siswi.wa_utama && String(siswi.wa_utama).trim() !== '' && String(siswi.wa_utama).trim().toLowerCase() !== 'null' && String(siswi.wa_utama).trim() !== '-' ? (
                      <button 
                        onClick={() => openWhatsApp(siswi.wa_utama)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3.5 px-4 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 shadow-md shadow-green-200/50 hover:shadow-lg hover:shadow-green-300/50"
                      >
                        <FaWhatsapp className="w-5 h-5 mr-2" />
                        WA Ayah
                      </button>
                    ) : (
                      <button 
                        disabled
                        className="flex-1 bg-gray-50 text-gray-400 py-3.5 px-4 rounded-xl flex items-center justify-center font-medium cursor-not-allowed border border-gray-200/60"
                      >
                        <span className="w-5 h-5 mr-2 flex items-center justify-center">
                          <div className="w-3 h-0.5 bg-gray-300 rounded-lg"></div>
                        </span>
                        WA Ayah Kosong
                      </button>
                    )}
                    
                    {siswi.wa_tambahan && String(siswi.wa_tambahan).trim() !== '' && String(siswi.wa_tambahan).trim().toLowerCase() !== 'null' && String(siswi.wa_tambahan).trim() !== '-' ? (
                      <button 
                        onClick={() => openWhatsApp(siswi.wa_tambahan)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3.5 px-4 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 shadow-md shadow-green-200/50 hover:shadow-lg hover:shadow-green-300/50"
                      >
                        <FaWhatsapp className="w-5 h-5 mr-2" />
                        WA Ibu
                      </button>
                    ) : (
                      <button 
                        disabled
                        className="flex-1 bg-gray-50 text-gray-400 py-3.5 px-4 rounded-xl flex items-center justify-center font-medium cursor-not-allowed border border-gray-200/60"
                      >
                        <span className="w-5 h-5 mr-2 flex items-center justify-center">
                          <div className="w-3 h-0.5 bg-gray-300 rounded-full"></div>
                        </span>
                        WA Ibu Kosong
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : hasSearched && query.trim() !== '' ? (
            <div className="text-center py-16 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-medium text-gray-600">Tidak ada hasil ditemukan</p>
              <p className="text-sm mt-1">Coba gunakan nama yang berbeda.</p>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="mb-10 text-gray-500 font-medium">Ketik nama siswi pada kolom pencarian di atas untuk memulai.</p>
              
              {/* Stats Section */}
              <div className="flex justify-center gap-6 mt-4">
                <button 
                  onClick={() => showStudentsByStatus('aktif')}
                  className="bg-green-50 text-green-700 px-6 py-4 rounded-2xl border border-green-100 flex flex-col items-center shadow-sm w-36 transition-all hover:scale-105 hover:bg-green-100 hover:shadow-md cursor-pointer active:scale-95"
                >
                  <span className="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">Santri Aktif</span>
                  {stats.isLoading ? (
                    <div className="w-8 h-8 rounded-full border-2 border-green-200 border-t-green-600 animate-spin mt-1 mb-1"></div>
                  ) : (
                    <span className="text-4xl font-extrabold">{stats.aktif}</span>
                  )}
                </button>
                <button 
                  onClick={() => showStudentsByStatus('boyong')}
                  className="bg-red-50 text-red-700 px-6 py-4 rounded-2xl border border-red-100 flex flex-col items-center shadow-sm w-36 transition-all hover:scale-105 hover:bg-red-100 hover:shadow-md cursor-pointer active:scale-95"
                >
                  <span className="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">Boyong</span>
                  {stats.isLoading ? (
                    <div className="w-8 h-8 rounded-full border-2 border-red-200 border-t-red-600 animate-spin mt-1 mb-1"></div>
                  ) : (
                    <span className="text-4xl font-extrabold">{stats.boyong}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Admin Login Trigger - Tiny text at bottom */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <button 
            onClick={() => isAdmin ? setShowAdminPanel(true) : setShowLoginModal(true)}
            className="text-[10px] text-gray-300 hover:text-gray-500 transition-colors bg-transparent px-4 py-1"
          >
            Login Admin
          </button>
        </div>

      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-mazeeda-blue" />
              Login Admin
            </h2>
            <form onSubmit={handleAdminLogin}>
              <div className="mb-4">
                <input 
                  type="password" 
                  placeholder="Masukkan Password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-mazeeda-blue focus:ring-1 focus:ring-mazeeda-blue transition-all"
                  autoFocus
                />
                {loginError && <p className="text-red-500 text-xs mt-1 ml-1">{loginError}</p>}
              </div>
              <button 
                type="submit"
                className="w-full bg-mazeeda-blue hover:bg-mazeeda-navy text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Masuk
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Alert/Confirm Dialog */}
      {dialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in duration-200">
            
            {/* Icon based on type */}
            <div className="flex justify-center mb-5">
               {dialog.type === 'confirm_delete' && <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 border-4 border-white shadow-inner"><AlertTriangle size={36} strokeWidth={2.5} /></div>}
               {dialog.type === 'confirm_upload' && <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-mazeeda-blue border-4 border-white shadow-inner"><Upload size={36} strokeWidth={2.5} /></div>}
               {dialog.type === 'alert_success' && <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 border-4 border-white shadow-inner"><CheckCircle size={36} strokeWidth={2.5} /></div>}
               {dialog.type === 'alert_error' && <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 border-4 border-white shadow-inner"><XCircle size={36} strokeWidth={2.5} /></div>}
            </div>
            
            <h2 className="text-xl font-bold text-center text-gray-800 mb-3">
              {dialog.title}
            </h2>
            <p className="text-center text-gray-600 mb-8 text-sm leading-relaxed">
              {dialog.message}
            </p>
            
            {dialog.type.startsWith('confirm_') ? (
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setDialog({ ...dialog, isOpen: false });
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    setDialog({ ...dialog, isOpen: false });
                    if (dialog.onConfirm) dialog.onConfirm();
                  }}
                  className={`flex-1 font-bold py-3.5 rounded-xl transition-colors text-white ${dialog.type === 'confirm_delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-mazeeda-blue hover:bg-mazeeda-navy'}`}
                >
                  Lanjutkan
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setDialog({ ...dialog, isOpen: false })}
                className="w-full bg-mazeeda-blue hover:bg-mazeeda-navy text-white font-bold py-3.5 rounded-xl transition-colors"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      )}

      {/* Install App Banner */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="max-w-md mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-blue-100 p-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white rounded-xl shadow-inner border border-gray-100 flex items-center justify-center mr-3 overflow-hidden p-1">
                 <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm leading-tight">Install Mazeeda</h4>
                <p className="text-xs text-gray-500 mt-0.5">Akses lebih cepat & mudah</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
               <button 
                 onClick={() => setShowInstallPrompt(false)}
                 className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
               >
                 <X className="w-4 h-4" />
               </button>
               <button 
                 onClick={handleInstallClick}
                 className="bg-mazeeda-blue hover:bg-mazeeda-navy text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-transform active:scale-95 shadow-sm whitespace-nowrap flex items-center"
               >
                 <Download className="w-3 h-3 mr-1.5" />
                 Install
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;

