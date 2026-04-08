import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { supabase } from './supabaseClient';

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
            .from('wawalsan')
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
            {/* Logo Placeholder */}
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 border-2 border-white/60 shadow-inner">
              <span className="text-white text-xs font-bold tracking-widest uppercase">Logo</span>
            </div>
            <h1 className="text-xl font-bold text-center leading-tight">
              Nomor WhatsApp<br />Wali Santri MAZEEDA
            </h1>
          </div>
        </div>

        {/* Search Bar - Floating */}
        <div className="px-6 -mt-6 sticky top-4 z-10">
          <div className="bg-white rounded-full shadow-lg flex items-center px-4 py-3 border border-gray-100">
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
                  <div className="w-24 h-6 bg-blue-100 rounded-full"></div>
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
                  <span className="inline-block bg-blue-50 text-mazeeda-blue text-xs font-semibold px-3 py-1 rounded-full mb-3 border border-blue-100">
                    {siswi.bagian || 'Tanpa Bagian'}
                  </span>
                  
                  {/* Name */}
                  <h2 className="text-lg font-bold text-gray-800 mb-4 leading-tight">
                    {siswi.nama_siswi}
                  </h2>
                  
                  {/* Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    <button 
                      onClick={() => openWhatsApp(siswi.wa_utama)}
                      className="flex-1 bg-mazeeda-blue hover:bg-mazeeda-navy text-white py-3 px-4 rounded-xl flex items-center justify-center font-medium transition-colors active:scale-95 shadow-sm shadow-blue-200"
                    >
                      <FaWhatsapp className="w-5 h-5 mr-2" />
                      WA Utama
                    </button>
                    
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
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
