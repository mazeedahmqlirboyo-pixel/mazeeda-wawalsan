import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { supabase } from './supabaseClient';
import appLogo from './assets/logo.jpg';

const formatWhatsAppNumber = (phone) => {
  if (!phone) return '';
  // Remove all non-numeric characters
  let cleanNumber = phone.replace(/\D/g, '');
  
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
    // Fallback standard parse, and check for things like "12 Agustus 2005"
    // For simplicity, handle standard string parse or if it's already in english format.
    // If it is non-standard Indonesian month, JS Date might return NaN, but we can try our best.
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

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      async function searchSiswi() {
        if (!query.trim()) {
          setResults([]);
          setHasSearched(false);
          return;
        }

        setIsLoading(true);
        setHasSearched(true);
        
        try {
          const { data, error } = await supabase
            .from('informasimazeeda')
            .select('*')
            .ilike('nama_siswi', `%${query.trim()}%`)
            .limit(20);
            
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

  const openWhatsApp = (phone) => {
    const waNumber = formatWhatsAppNumber(phone);
    if (waNumber) {
      window.open(`https://wa.me/${waNumber}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center pb-safe font-sans">
      <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative">
        
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
          <div className="bg-white rounded-2xl shadow-lg flex items-center px-4 py-3 border border-gray-100">
            <Search className="text-gray-400 w-5 h-5 mr-3" />
            <input 
              type="text" 
              placeholder="Cari nama siswi..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 outline-none text-gray-700 bg-transparent placeholder-gray-400"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-8">
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
              <div className="text-sm text-gray-500 mb-2 px-1">
                Ditemukan {results.length} hasil
              </div>
              {results.map((siswi) => (
                <div key={siswi.id} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  {/* Badge */}
                  <span className="inline-block bg-blue-50 text-mazeeda-blue text-xs font-semibold px-3 py-1 rounded-lg mb-3 border border-blue-100">
                    {siswi.bagian ? toTitleCase(siswi.bagian) : 'Tanpa Bagian'}
                  </span>
                  
                  {/* Name */}
                  <h2 className="text-lg font-bold text-gray-800 mb-4 leading-tight">
                    {toTitleCase(siswi.nama_siswi)}
                  </h2>
                  
                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-sm text-gray-700 mb-5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div><span className="font-semibold block text-xs text-gray-500 uppercase tracking-wider mb-0.5">Nama Ayah</span> {siswi.nama_ayah ? toTitleCase(siswi.nama_ayah) : '-'}</div>
                    <div><span className="font-semibold block text-xs text-gray-500 uppercase tracking-wider mb-0.5">Nama Ibu</span> {siswi.nama_ibu ? toTitleCase(siswi.nama_ibu) : '-'}</div>
                    <div><span className="font-semibold block text-xs text-gray-500 uppercase tracking-wider mb-0.5">Daerah Santri</span> {siswi.daerah_santri ? toTitleCase(siswi.daerah_santri) : '-'}</div>
                    <div><span className="font-semibold block text-xs text-gray-500 uppercase tracking-wider mb-0.5">Tanggal Lahir</span> {siswi.tanggal_lahir ? toTitleCase(siswi.tanggal_lahir) : '-'}</div>
                    <div><span className="font-semibold block text-xs text-gray-500 uppercase tracking-wider mb-0.5">Umur Siswi</span> {calculateAge(siswi.tanggal_lahir) || (siswi.umur_siswi ? toTitleCase(siswi.umur_siswi) : '-')}</div>
                    <div><span className="font-semibold block text-xs text-gray-500 uppercase tracking-wider mb-0.5">Status</span> Anak ke-{siswi.anak_ke || '-'} dr {siswi.jumlah_saudara || '-'}</div>
                    <div><span className="font-semibold block text-xs text-gray-500 uppercase tracking-wider mb-0.5">Status Tahfiz</span> {siswi.status_tahfiz ? toTitleCase(siswi.status_tahfiz) : '-'}</div>
                    <div><span className="font-semibold block text-xs text-gray-500 uppercase tracking-wider mb-0.5">Domisili</span> {siswi.domisili ? toTitleCase(siswi.domisili) : '-'}</div>
                  </div>
                  
                  {/* Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    {siswi.wa_utama && String(siswi.wa_utama).trim() !== '' && String(siswi.wa_utama).trim().toLowerCase() !== 'null' && String(siswi.wa_utama).trim() !== '-' ? (
                      <button 
                        onClick={() => openWhatsApp(siswi.wa_utama)}
                        className="flex-1 bg-mazeeda-blue hover:bg-mazeeda-navy text-white py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-colors active:scale-95 shadow-sm shadow-blue-200"
                      >
                        <FaWhatsapp className="w-5 h-5 mr-2" />
                        WA Utama
                      </button>
                    ) : (
                      <button 
                        disabled
                        className="flex-1 bg-gray-100 text-gray-400 py-3 px-4 rounded-xl flex items-center justify-center font-medium cursor-not-allowed border border-gray-200"
                      >
                        <span className="w-5 h-5 mr-2 flex items-center justify-center">
                          <div className="w-3 h-0.5 bg-gray-400 rounded-lg"></div>
                        </span>
                        Utama Kosong
                      </button>
                    )}
                    
                    {siswi.wa_tambahan && String(siswi.wa_tambahan).trim() !== '' && String(siswi.wa_tambahan).trim().toLowerCase() !== 'null' && String(siswi.wa_tambahan).trim() !== '-' ? (
                      <button 
                        onClick={() => openWhatsApp(siswi.wa_tambahan)}
                        className="flex-1 bg-mazeeda-blue hover:bg-mazeeda-navy text-white py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-colors active:scale-95 shadow-sm shadow-blue-200"
                      >
                        <FaWhatsapp className="w-5 h-5 mr-2" />
                        WA Tambahan
                      </button>
                    ) : (
                      <button 
                        disabled
                        className="flex-1 bg-gray-100 text-gray-400 py-3 px-4 rounded-xl flex items-center justify-center font-medium cursor-not-allowed border border-gray-200"
                      >
                        <span className="w-5 h-5 mr-2 flex items-center justify-center">
                          <div className="w-3 h-0.5 bg-gray-400 rounded-full"></div>
                        </span>
                        Kosong
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
            <div className="text-center py-16 text-gray-400">
              <p>Ketik nama siswi pada kolom pencarian di atas untuk memulai.</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}

export default App;
