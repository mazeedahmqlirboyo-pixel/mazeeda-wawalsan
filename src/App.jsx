import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Lock, CheckCircle, XCircle, AlertTriangle, Download, MapPin, Calendar, Users, Home, BookOpen, Map, User, Heart, Eye, EyeOff, ChevronDown, Moon, Sun, BarChart2 , PieChart} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import appLogo from './assets/logo.png';
import Papa from 'papaparse';
import { supabase } from './supabaseClient';

const formatWhatsAppNumber = (phone) => {
  if (!phone) return '';
  let cleanNumber = String(phone).replace(/\D/g, '');
  if (cleanNumber.startsWith('0')) {
    cleanNumber = '62' + cleanNumber.substring(1);
  } else if (cleanNumber.startsWith('8')) {
    cleanNumber = '62' + cleanNumber;
  }
  return cleanNumber;
};

const toTitleCase = (str) => {
  if (!str) return '';
  return str.toString().toLowerCase().replace(/(^|[^\w])(\w)/g, (match, p1, p2, offset, string) => {
    if (p1 === "'" && offset > 0 && /\w/.test(string[offset - 1])) {
      return match;
    }
    return p1 + p2.toUpperCase();
  });
};

const calculateAge = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  let birthDate;
  const indonesianDateMatch = dateString.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (indonesianDateMatch) {
    birthDate = new Date(`${indonesianDateMatch[3]}-${indonesianDateMatch[2]}-${indonesianDateMatch[1]}`);
  } else {
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

const formatAgeDisplay = (siswi, isUnlocked) => {
  if (!siswi) return '-';
  const rawAge = calculateAge(siswi['TANGGAL LAHIR']);
  if (!rawAge) return '-';
  const displayAge = toTitleCase(rawAge);
  if (isUnlocked) return displayAge;
  return displayAge
    .replace(/\b\d+\b(?=\s*(bln|bulan|Bln|Bulan))/gi, '**')
    .replace(/\b\d+\b(?=\s*(hr|hari|Hr|Hari))/gi, '**');
};

const formatImageUrl = (url) => {
  if (!url) return '';
  let str = String(url).trim();
  const driveMatch = str.match(/\/(?:d|file\/d)\/([a-zA-Z0-9_-]+)/i) || str.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return str;
};

// ==========================================
// TEMPAT PASTE LINK CSV GOOGLE SHEETS
// ==========================================
const PENGAJAR_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRgpkxfJi3edqvTFLa8ZU_zYktFDoQmxWiL0qwrQBDyaAXyrUkQikIUbEDd4vmJiINWJRxkQmCh7jDk/pub?gid=271775001&single=true&output=csv";

const SHEET_URLS = [
  { url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgpkxfJi3edqvTFLa8ZU_zYktFDoQmxWiL0qwrQBDyaAXyrUkQikIUbEDd4vmJiINWJRxkQmCh7jDk/pub?gid=0&single=true&output=csv', status: 'Aktif' },
  { url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgpkxfJi3edqvTFLa8ZU_zYktFDoQmxWiL0qwrQBDyaAXyrUkQikIUbEDd4vmJiINWJRxkQmCh7jDk/pub?gid=1466832042&single=true&output=csv', status: 'Boyong' },
  { url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgpkxfJi3edqvTFLa8ZU_zYktFDoQmxWiL0qwrQBDyaAXyrUkQikIUbEDd4vmJiINWJRxkQmCh7jDk/pub?gid=1452670732&single=true&output=csv', status: 'Tidak Lanjut' }
];
// ==========================================

const StatistikDaerah = ({ data, onSelectStudent }) => {
  const [expandedDaerah, setExpandedDaerah] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const daerahMap = data.reduce((acc, curr) => {
    const isAktif = !curr.status_database || curr.status_database.toUpperCase() === 'AKTIF';
    if (showOnlyActive && !isAktif) return acc;
    const daerah = curr['DAERAH'] ? curr['DAERAH'].trim().toUpperCase() : 'TIDAK DIKETAHUI';
    if (daerah && daerah !== '-') {
      if (!acc[daerah]) acc[daerah] = [];
      acc[daerah].push(curr);
    }
    return acc;
  }, {});

  const sortedDaerah = Object.entries(daerahMap)
    .map(([daerah, students]) => ({ daerah, count: students.length, students }))
    .sort((a, b) => b.count - a.count);

  const filteredDaerah = sortedDaerah.filter(item => 
    item.daerah.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto w-full bg-white min-h-screen pb-32">
      <div className="px-6 py-4 sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="bg-gray-50 rounded-2xl flex flex-col border border-gray-100 overflow-hidden focus-within:border-blue-200 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
          <div className="flex items-center px-4 py-3 relative">
            <Search className="text-gray-400 w-5 h-5 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari daerah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-gray-700 bg-transparent placeholder-gray-400 min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      
        <div className="mt-3 flex items-center justify-end">
          <label className="flex items-center space-x-2 cursor-pointer" onClick={() => setShowOnlyActive(!showOnlyActive)}>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${showOnlyActive ? 'text-mazeeda-blue' : 'text-gray-400'}`}>
              Hanya Siswi Aktif
            </span>
            <div className="relative pointer-events-none">
              <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ${showOnlyActive ? 'bg-mazeeda-blue' : 'bg-gray-200'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${showOnlyActive ? 'transform translate-x-4' : ''}`}></div>
            </div>
          </label>
        </div>
</div>
      <div>
        {filteredDaerah.length === 0 && (
          <div className="text-center py-10 text-gray-500">Daerah tidak ditemukan.</div>
        )}
        {filteredDaerah.map((item, idx) => {
          const isExpanded = expandedDaerah === item.daerah;
          return (
            <div key={idx} className="border-b border-gray-100 flex flex-col">
              <div 
                onClick={() => setExpandedDaerah(isExpanded ? null : item.daerah)}
                className="flex items-center justify-between py-4 px-6 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <span className="w-6 text-left font-bold text-gray-400 text-sm">{idx + 1}</span>
                  <span className="font-semibold text-gray-800 text-base">{item.daerah}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white bg-mazeeda-blue px-3 py-1 rounded-full shadow-sm">{item.count}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {/* Accordion Content */}
              {isExpanded && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-3">
                    {item.students.map((student, i) => {
                      const isAktif = !student.status_database || student.status_database.toUpperCase() === 'AKTIF';
                      return (
                        <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                            {student['FOTO URL'] && student['FOTO URL'].trim() !== '' && student['FOTO URL'] !== '-' ? (
                              <>
                                <img 
                                  src={formatImageUrl(student['FOTO URL'])} 
                                  alt={student['NAMA LENGKAP']} 
                                  className="w-full h-full object-cover absolute z-10" 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 absolute z-0">
                                  <User className="w-5 h-5 text-gray-400" />
                                </div>
                              </>
                            ) : (
                              <User className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <p className={`font-bold text-sm leading-tight ${!isAktif ? 'text-red-600' : 'text-gray-800'}`}>
                              {student['NAMA LENGKAP']}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-2">
                              <span className="text-[11px] font-bold tracking-wide text-mazeeda-blue bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                                {student['BAGIAN'] || '-'}
                              </span>
                              {!isAktif && (
                                <span className="text-[11px] font-bold tracking-wide text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-100 uppercase">
                                  {student.status_database}
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); onSelectStudent(student); }} className="w-9 h-9 rounded-full bg-blue-50/50 flex items-center justify-center text-mazeeda-blue hover:bg-blue-100 transition-colors border border-blue-100 ml-auto flex-shrink-0 active:scale-95">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


const StatistikBagian = ({ data, onSelectStudent }) => {
  const getBagianSortWeight = (bagian) => {
    if (!bagian) return 0;
    const b = bagian.trim().toUpperCase();
    const parts = b.split(' ');
    if (parts.length < 2) return 0;
    
    const first = parts[0]; 
    const second = parts[1]; 
    
    if (first === "I" && second === "TSANAWIYAH") return 100;
    
    if (first === "VI") {
      if (second === "IBTIDAIYAH") return 110;
      if (second === "IBT") return 111;
    }
    if (first === "V") {
      if (second === "IBTIDAIYAH") return 120;
      if (second === "IBT") return 121;
    }
    if (first === "IV") {
      if (second === "IBTIDAIYAH") return 130;
      if (second === "IBT") return 131;
    }
    if (first === "III") {
      if (second === "IBTIDAIYAH") return 140;
      if (second === "IBT") return 141;
    }
    if (first === "II") {
      if (second === "IBTIDAIYAH") return 150;
      if (second === "IBT") return 151;
    }
    if (first === "I") {
      if (second === "IBTIDAIYAH") return 160;
      if (second === "IBT") return 161;
    }
    
    if (first === "II" && (second === "I'DADIYAH" || second === "I'DAD" || second === "IDADIYAH")) return 170;
    if (first === "I" && (second === "I'DADIYAH" || second === "I'DAD" || second === "IDADIYAH")) return 180;
    
    return 0; 
  };

  const [expandedBagian, setExpandedBagian] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const bagianMap = data.reduce((acc, curr) => {
    const isAktif = !curr.status_database || curr.status_database.toUpperCase() === 'AKTIF';
    if (showOnlyActive && !isAktif) return acc;
    const bagian = curr['BAGIAN'] ? curr['BAGIAN'].trim().toUpperCase() : 'TANPA BAGIAN';
    if (bagian && bagian !== '-') {
      if (!acc[bagian]) acc[bagian] = [];
      acc[bagian].push(curr);
    }
    return acc;
  }, {});

  const sortedBagian = Object.entries(bagianMap)
    .map(([bagian, students]) => ({ bagian, count: students.length, students }))
    .sort((a, b) => {
      const weightA = getBagianSortWeight(a.bagian);
      const weightB = getBagianSortWeight(b.bagian);
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      return a.bagian.localeCompare(b.bagian);
    });

  const filteredBagian = sortedBagian.filter(item => 
    item.bagian.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto w-full bg-white min-h-screen pb-32">
      <div className="px-6 py-4 sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="bg-gray-50 rounded-2xl flex flex-col border border-gray-100 overflow-hidden focus-within:border-blue-200 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
          <div className="flex items-center px-4 py-3 relative">
            <Search className="text-gray-400 w-5 h-5 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari bagian/kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-gray-700 bg-transparent placeholder-gray-400 min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      
        <div className="mt-3 flex items-center justify-end">
          <label className="flex items-center space-x-2 cursor-pointer" onClick={() => setShowOnlyActive(!showOnlyActive)}>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${showOnlyActive ? 'text-mazeeda-blue' : 'text-gray-400'}`}>
              Hanya Siswi Aktif
            </span>
            <div className="relative pointer-events-none">
              <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ${showOnlyActive ? 'bg-mazeeda-blue' : 'bg-gray-200'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${showOnlyActive ? 'transform translate-x-4' : ''}`}></div>
            </div>
          </label>
        </div>
</div>
      <div>
        {filteredBagian.length === 0 && (
          <div className="text-center py-10 text-gray-500">Bagian/Kelas tidak ditemukan.</div>
        )}
        {filteredBagian.map((item, idx) => {
          const isExpanded = expandedBagian === item.bagian;
          return (
            <div key={idx} className="border-b border-gray-100 flex flex-col">
              <div 
                onClick={() => setExpandedBagian(isExpanded ? null : item.bagian)}
                className="flex items-center justify-between py-4 px-6 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <span className="w-6 text-left font-bold text-gray-400 text-sm">{idx + 1}</span>
                  <span className="font-semibold text-gray-800 text-base">{item.bagian}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white bg-mazeeda-blue px-3 py-1 rounded-full shadow-sm">{item.count}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {/* Accordion Content */}
              {isExpanded && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-3">
                    {item.students.map((student, i) => {
                      const isAktif = !student.status_database || student.status_database.toUpperCase() === 'AKTIF';
                      return (
                        <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                            {student['FOTO URL'] && student['FOTO URL'].trim() !== '' && student['FOTO URL'] !== '-' ? (
                              <>
                                <img 
                                  src={formatImageUrl(student['FOTO URL'])} 
                                  alt={student['NAMA LENGKAP']} 
                                  className="w-full h-full object-cover absolute z-10" 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 absolute z-0">
                                  <User className="w-5 h-5 text-gray-400" />
                                </div>
                              </>
                            ) : (
                              <User className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex flex-col flex-1">
                            <p className={`font-bold text-sm leading-tight ${!isAktif ? 'text-red-600' : 'text-gray-800'}`}>
                              {student['NAMA LENGKAP']}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-2">
                              <span className="text-[11px] font-bold tracking-wide text-mazeeda-blue bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                                {student['DAERAH'] ? String(student['DAERAH']).trim().toUpperCase() : '-'}
                              </span>
                              {!isAktif && (
                                <span className="text-[11px] font-bold tracking-wide text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-100 uppercase">
                                  {student.status_database}
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); onSelectStudent(student); }} className="w-9 h-9 rounded-full bg-blue-50/50 flex items-center justify-center text-mazeeda-blue hover:bg-blue-100 transition-colors border border-blue-100 ml-auto flex-shrink-0 active:scale-95">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


const StatistikKategori = ({ data, onSelectStudent }) => {
  const [activeKategori, setActiveKategori] = useState('DOMISILI'); 
  const [expandedItem, setExpandedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  const groupedMap = data.reduce((acc, curr) => {
    const isAktif = !curr.status_database || curr.status_database.toUpperCase() === 'AKTIF';
    if (showOnlyActive && !isAktif) return acc;
    let key = 'TIDAK DIKETAHUI';
    if (activeKategori === 'UMUR') {
      const rawAge = calculateAge(curr['TANGGAL LAHIR']);
      if (rawAge) {
        const yearMatch = rawAge.match(/(\d+)\s*[Tt]hn/);
        if (yearMatch) {
          key = `${yearMatch[1]} TAHUN`;
        }
      }
    } else {
      key = curr[activeKategori] ? curr[activeKategori].trim().toUpperCase() : 'TIDAK DIKETAHUI';
      if (key === '' || key === '-') key = 'TIDAK DIKETAHUI';
    }
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {});

  const sortedItems = Object.entries(groupedMap)
    .map(([name, students]) => ({ 
      name, 
      count: students.length, 
      students: [...students].sort((a, b) => (a['NAMA LENGKAP'] || '').localeCompare(b['NAMA LENGKAP'] || ''))      }))
    .sort((a, b) => {
      if (activeKategori === 'UMUR') {
        const numA = parseInt(a.name) || 0;
        const numB = parseInt(b.name) || 0;
        if (numA !== numB) return numA - numB;
      }
      return b.count - a.count;
    });

  const filteredItems = sortedItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto w-full bg-white min-h-screen pb-32">
      <div className="px-6 pt-4 pb-4 sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm flex flex-col gap-4">
        {/* Toggle / Segmented Control */}
        <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => { setActiveKategori('DOMISILI'); setExpandedItem(null); setSearchQuery(''); }}
            className={`flex-1 whitespace-nowrap px-3 py-2 text-[13px] font-bold rounded-lg transition-all ${activeKategori === 'DOMISILI' ? 'bg-white text-mazeeda-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Domisili
          </button>
          <button 
            onClick={() => { setActiveKategori('KAMAR'); setExpandedItem(null); setSearchQuery(''); }}
            className={`flex-1 whitespace-nowrap px-3 py-2 text-[13px] font-bold rounded-lg transition-all ${activeKategori === 'KAMAR' ? 'bg-white text-mazeeda-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Kamar
          </button>
          <button 
            onClick={() => { setActiveKategori('STATUS TAHFIZ'); setExpandedItem(null); setSearchQuery(''); }}
            className={`flex-1 whitespace-nowrap px-3 py-2 text-[13px] font-bold rounded-lg transition-all ${activeKategori === 'STATUS TAHFIZ' ? 'bg-white text-mazeeda-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Status Tahfiz
          </button>
          <button 
            onClick={() => { setActiveKategori('UMUR'); setExpandedItem(null); setSearchQuery(''); }}
            className={`flex-1 whitespace-nowrap px-3 py-2 text-[13px] font-bold rounded-lg transition-all ${activeKategori === 'UMUR' ? 'bg-white text-mazeeda-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Umur
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-gray-50 rounded-2xl flex flex-col border border-gray-100 overflow-hidden focus-within:border-blue-200 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
          <div className="flex items-center px-4 py-3 relative">
            <Search className="text-gray-400 w-5 h-5 mr-3 flex-shrink-0" />
              <input
                type="text"
                placeholder={`Cari ${activeKategori === 'DOMISILI' ? 'domisili' : activeKategori === 'KAMAR' ? 'kamar' : activeKategori === 'UMUR' ? 'umur' : 'status tahfiz'}...`}
                value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-gray-700 bg-transparent placeholder-gray-400 min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      
        <div className="mt-3 flex items-center justify-end">
          <label className="flex items-center space-x-2 cursor-pointer" onClick={() => setShowOnlyActive(!showOnlyActive)}>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${showOnlyActive ? 'text-mazeeda-blue' : 'text-gray-400'}`}>
              Hanya Siswi Aktif
            </span>
            <div className="relative pointer-events-none">
              <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ${showOnlyActive ? 'bg-mazeeda-blue' : 'bg-gray-200'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${showOnlyActive ? 'transform translate-x-4' : ''}`}></div>
            </div>
          </label>
        </div>
</div>

      <div>
        {filteredItems.length === 0 && (
          <div className="text-center py-10 text-gray-500">Data tidak ditemukan.</div>
        )}
        {filteredItems.map((item, idx) => {
          const isExpanded = expandedItem === item.name;
          return (
            <div key={idx} className="border-b border-gray-100 flex flex-col">
              <div 
                onClick={() => setExpandedItem(isExpanded ? null : item.name)}
                className="flex items-center justify-between py-4 px-6 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <span className="w-6 text-left font-bold text-gray-400 text-sm">{idx + 1}</span>
                  <span className="font-semibold text-gray-800 text-base">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white bg-mazeeda-blue px-3 py-1 rounded-full shadow-sm">{item.count}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {/* Accordion Content */}
              {isExpanded && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-3">
                    {item.students.map((student, i) => {
                      const isAktif = !student.status_database || student.status_database.toUpperCase() === 'AKTIF';
                      return (
                        <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                            {student['FOTO URL'] && student['FOTO URL'].trim() !== '' && student['FOTO URL'] !== '-' ? (
                              <>
                                <img 
                                  src={formatImageUrl(student['FOTO URL'])} 
                                  alt={student['NAMA LENGKAP']} 
                                  className="w-full h-full object-cover absolute z-10" 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 absolute z-0">
                                  <User className="w-5 h-5 text-gray-400" />
                                </div>
                              </>
                            ) : (
                              <User className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex flex-col flex-1">
                            <p className={`font-bold text-sm leading-tight ${!isAktif ? 'text-red-600' : 'text-gray-800'}`}>
                              {student['NAMA LENGKAP']}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-2">
                              <span className="text-[11px] font-bold tracking-wide text-mazeeda-blue bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                                {activeKategori === 'DOMISILI' || activeKategori === 'KAMAR' || activeKategori === 'UMUR' ? 
                                  (student['STATUS TAHFIZ'] ? String(student['STATUS TAHFIZ']).trim().toUpperCase() : '-') 
                                  : (student['DOMISILI'] ? String(student['DOMISILI']).trim().toUpperCase() : '-')}
                              </span>
                              {!isAktif && (
                                <span className="text-[11px] font-bold tracking-wide text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-100 uppercase">
                                  {student.status_database}
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); onSelectStudent(student); }} className="w-9 h-9 rounded-full bg-blue-50/50 flex items-center justify-center text-mazeeda-blue hover:bg-blue-100 transition-colors border border-blue-100 ml-auto flex-shrink-0 active:scale-95">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


const DataPengajar = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = data.filter(p => {
    const nama = (p['NAMA LENGKAP'] || '').toLowerCase();
    const bagian = (p['BAGIAN'] || '').toLowerCase();
    const pelajaran = (p['PELAJARAN'] || '').toLowerCase();
    const status = (p['STATUS'] || '').toLowerCase();
    const daerah = (p['DAERAH'] || '').toLowerCase();
    const lokal = (p['LOKAL'] || '').toLowerCase();
    
    const term = searchQuery.toLowerCase();
    return nama.includes(term) || bagian.includes(term) || pelajaran.includes(term) || status.includes(term) || daerah.includes(term) || lokal.includes(term);
  });

  return (
    <div className="max-w-md mx-auto w-full bg-white min-h-screen pb-32">
      <div className="px-6 pt-4 pb-4 sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm flex flex-col gap-3">
        <div className="bg-gray-50 rounded-2xl flex flex-col border border-gray-100 overflow-hidden focus-within:border-blue-200 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
          <div className="flex items-center px-4 py-3 relative">
            <Search className="text-gray-400 w-5 h-5 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari nama, pelajaran, bagian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-gray-700 bg-transparent placeholder-gray-400 min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-500 font-medium">
            {data.length === 0 ? "Data Pengajar belum dimuat." : "Pengajar tidak ditemukan."}
          </div>
        ) : (
          filtered.map((pengajar, idx) => (
            <div key={idx} className="flex items-center gap-4 py-4 px-6 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                {pengajar['FOTO'] && pengajar['FOTO'].trim() !== '' && pengajar['FOTO'] !== '-' ? (
                  <>
                    <img 
                      src={formatImageUrl(pengajar['FOTO'])} 
                      alt={pengajar['NAMA LENGKAP']} 
                      className="w-full h-full object-cover absolute z-10" 
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 absolute z-0">
                      <User className="w-5 h-5 text-gray-300" />
                    </div>
                  </>
                ) : (
                  <User className="w-5 h-5 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-[14px] leading-tight truncate">{pengajar['NAMA LENGKAP']}</h3>
                <p className="text-[11px] font-bold text-mazeeda-blue mt-0.5 truncate uppercase tracking-wide">
                  {pengajar['STATUS']} {pengajar['PELAJARAN'] ? `• ${pengajar['PELAJARAN']}` : ''}
                </p>
                <p className="text-[11.5px] text-gray-500 mt-1 truncate font-medium">
                  {[
                    pengajar['BAGIAN'] ? `Bagian ${pengajar['BAGIAN']}` : '',
                    pengajar['LOKAL'] ? `Lokal ${pengajar['LOKAL']}` : '',
                    pengajar['DAERAH'] ? pengajar['DAERAH'] : ''
                  ].filter(Boolean).join(' • ')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};


function App() {
  const [query, setQuery] = useState('');
  const [allData, setAllData] = useState([]);
  const [pengajarData, setPengajarData] = useState([]);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('beranda');
  const [selectedStudent, setSelectedStudent] = useState(null);
  

  const [hasSearched, setHasSearched] = useState(false);

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

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [isSecretUnlocked, setIsSecretUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const [stats, setStats] = useState({ data: [], isLoading: true });

  const fetchAllSheets = async () => {
    setIsLoading(true);
    setStats({ data: [], isLoading: true });
    try {
      let combined = [];
        for (const sheet of SHEET_URLS) {
          if (!sheet.url || sheet.url.includes('PASTE_LINK_CSV')) continue;
          
          const response = await fetch(sheet.url);
          const csvText = await response.text();
        
        await new Promise((resolve) => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (res) => {
              const parsed = [];
              res.data.forEach((row, index) => {
                const cleanRow = {};
                for (let key in row) {
                  if (key) cleanRow[key.trim().toUpperCase()] = row[key];
                }
                
                // Jangan hitung baris jika NAMA LENGKAP kosong
                const nama = cleanRow['NAMA LENGKAP'];
                if (nama && String(nama).trim() !== '') {
                  parsed.push({
                    ...cleanRow,
                    id: `${sheet.status}-${index}`,
                    status_database: sheet.status
                  });
                }
              });
              combined = [...combined, ...parsed];
              resolve();
            }
          });
        });
      }
      setAllData(combined);
      
      // Calculate Stats
      const counts = { 'AKTIF': 0, 'BOYONG': 0, 'TIDAK LANJUT': 0 };
      combined.forEach(item => {
        const status = item.status_database.toUpperCase();
        if (counts[status] !== undefined) counts[status]++;
      });
      
      const statsArray = Object.keys(counts)
        .map(key => ({ status: key, count: counts[key] }))
        .sort((a,b) => b.count - a.count);
        
      setStats({ data: statsArray, isLoading: false });
      
            
    } catch (err) {
      console.error("Error fetching Google Sheets:", err);
      setStats({ data: [], isLoading: false });
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  };

    useEffect(() => {
      fetchAllSheets();

      if (PENGAJAR_CSV_URL && PENGAJAR_CSV_URL.startsWith("http")) {
        fetch(PENGAJAR_CSV_URL)
          .then(res => res.text())
          .then(csv => {
            Papa.parse(csv, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                setPengajarData(results.data);
              }
            });
          })
          .catch(err => console.error("Error fetching pengajar:", err));
      }
    }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsAdmin(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        setShowAdminPanel(false);
        setIsSecretUnlocked(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (!query.trim() && !hasSearched) {
        setResults([]);
        return;
      }
      if (!query.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);
      
      const searchTerm = query.trim().toLowerCase();
      const filtered = allData.filter(item => {
        const nama = (item['NAMA LENGKAP'] || '').toLowerCase();
        const daerah = (item['DAERAH'] || '').toLowerCase();
        const kamar = (item['KAMAR'] || '').toLowerCase();
        const domisili = (item['DOMISILI'] || '').toLowerCase();
        const nis = (item['NIS'] || '').toLowerCase();
        return nama.includes(searchTerm) || daerah.includes(searchTerm) || kamar.includes(searchTerm) || domisili.includes(searchTerm) || nis.includes(searchTerm);
      }).slice(0, 50);
      
      setResults(filtered);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, allData]);

  const showStudentsByStatus = (status) => {
    setQuery('');
    setIsLoading(true);
    setHasSearched(true);
    const filtered = allData.filter(item => item.status_database.toLowerCase() === status.toLowerCase()).slice(0, 100);
    setResults(filtered);
    setIsLoading(false);
  };

  const openWhatsApp = (phone) => {
    const waNumber = formatWhatsAppNumber(phone);
    if (waNumber) {
      window.open(`https://wa.me/${waNumber}`, '_blank');
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: 'admin@mazeeda.com',
      password: passwordInput,
    });
    if (error) {
      setLoginError('Password salah!');
    } else {
      setIsAdmin(true);
      setShowLoginModal(false);
      setShowAdminPanel(true);
      setPasswordInput('');
    }
  };

  const handleUnlockSecret = async (e) => {
    e.preventDefault();
    setUnlockError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: 'admin@mazeeda.com',
      password: unlockPasswordInput,
    });
    if (error) {
      setUnlockError('Password salah!');
    } else {
      setIsSecretUnlocked(true);
      setIsAdmin(true);
      setShowUnlockModal(false);
      setUnlockPasswordInput('');
    }
  };

  const toggleSecretVisibility = () => {
    if (isSecretUnlocked) {
      setIsSecretUnlocked(false);
    } else {
      if (isAdmin) {
        setIsSecretUnlocked(true);
      } else {
        setShowUnlockModal(true);
      }
    }
  };

  
  const StudentCardUI = ({ siswi }) => {
    const isBoyong = siswi.status_database !== 'Aktif';
    const cardClass = isBoyong 
      ? "bg-red-50 border border-red-200 p-5 rounded-3xl shadow-[0_8px_30px_rgb(255,0,0,0.06)] hover:shadow-[0_8px_30px_rgb(255,0,0,0.1)] transition-all duration-300"
      : "bg-white border border-gray-100 p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300";
    const badgeClass = isBoyong 
      ? "bg-red-100 text-red-700 border-red-200" 
      : "bg-blue-50 text-mazeeda-blue border-blue-100";

    return (
      <div className={cardClass}>
                    {/* Header Card */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-white shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center ring-2 ring-gray-50">
                        {siswi['FOTO URL'] && siswi['FOTO URL'].trim() !== '' && siswi['FOTO URL'] !== '-' ? (
                          <img
                            src={formatImageUrl(siswi['FOTO URL'])}
                            alt={`Foto ${siswi['NAMA LENGKAP']}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span className="text-2xl font-bold text-mazeeda-blue" style={{ display: (siswi['FOTO URL'] && siswi['FOTO URL'].trim() !== '' && siswi['FOTO URL'] !== '-') ? 'none' : 'flex' }}>
                          {siswi['NAMA LENGKAP'] ? siswi['NAMA LENGKAP'].charAt(0).toUpperCase() : '?'}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <div className="self-start flex gap-2 flex-wrap">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mb-1.5 border uppercase tracking-wider ${badgeClass}`}>
                            {siswi['BAGIAN'] ? toTitleCase(siswi['BAGIAN']) : 'Tanpa Bagian'}
                          </span>
                          {siswi['NIS'] && (
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mb-1.5 border uppercase tracking-wider ${badgeClass}`}>
                              NIS: {siswi['NIS']}
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 leading-tight">
                          {toTitleCase(siswi['NAMA LENGKAP'])}
                        </h2>
                        {isBoyong && (
                          <span className="text-xs font-bold text-red-600 mt-1 uppercase">
                            Status: {siswi.status_database}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-4 text-sm text-gray-700 mb-6 bg-gradient-to-br from-gray-50 to-white p-5 rounded-2xl border border-gray-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                      <div className="flex gap-2.5">
                        <div className="mt-0.5"><User className="w-4 h-4 text-blue-400" /></div>
                        <div>
                          <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Nama Ayah</span>
                          <span className="font-medium text-gray-800">{siswi['NAMA AYAH'] ? toTitleCase(siswi['NAMA AYAH']) : '-'}</span>
                          {siswi['STATUS AYAH'] && String(siswi['STATUS AYAH']).trim().toLowerCase() !== 'hidup' && String(siswi['STATUS AYAH']).trim() !== '-' && <span className="text-gray-400 text-xs ml-1 italic">(Alm.)</span>}
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="mt-0.5"><Heart className="w-4 h-4 text-pink-400" /></div>
                        <div>
                          <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Nama Ibu</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-800">
                              {isSecretUnlocked ? (siswi['NAMA IBU'] ? toTitleCase(siswi['NAMA IBU']) : '-') : '••••••'}
                            </span>
                            {siswi['STATUS IBU'] && String(siswi['STATUS IBU']).trim().toLowerCase() !== 'hidup' && String(siswi['STATUS IBU']).trim() !== '-' && isSecretUnlocked && (
                              <span className="text-gray-400 text-xs ml-0.5 italic">(Almh.)</span>
                            )}
                            <button
                              onClick={toggleSecretVisibility}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                              title={isSecretUnlocked ? "Sembunyikan" : "Tampilkan"}
                            >
                              {isSecretUnlocked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="mt-0.5"><Map className="w-4 h-4 text-emerald-400" /></div>
                        <div>
                          <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Daerah Santri</span>
                          <span className="font-medium text-gray-800">{siswi['DAERAH'] ? toTitleCase(siswi['DAERAH']) : '-'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="mt-0.5"><Calendar className="w-4 h-4 text-amber-400" /></div>
                        <div>
                          <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Tanggal Lahir</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-800">
                              {isSecretUnlocked ? (siswi['TANGGAL LAHIR'] ? toTitleCase(siswi['TANGGAL LAHIR']) : '-') : '••••••'}
                            </span>
                            <button
                              onClick={toggleSecretVisibility}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                              title={isSecretUnlocked ? "Sembunyikan" : "Tampilkan"}
                            >
                              {isSecretUnlocked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="mt-0.5"><User className="w-4 h-4 text-indigo-400" /></div>
                        <div>
                          <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Umur Siswi</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-800">
                              {formatAgeDisplay(siswi, isSecretUnlocked)}
                            </span>
                            <button
                              onClick={toggleSecretVisibility}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                              title={isSecretUnlocked ? "Sembunyikan" : "Tampilkan"}
                            >
                              {isSecretUnlocked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="mt-0.5"><Users className="w-4 h-4 text-orange-400" /></div>
                        <div>
                          <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Keluarga</span>
                          <span className="font-medium text-gray-800">Anak ke-{siswi['ANAK KE'] || '-'} dr {siswi['JUMLAH SAUDARA'] || '-'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="mt-0.5"><Home className="w-4 h-4 text-teal-400" /></div>
                        <div>
                          <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Kamar</span>
                          <span className="font-medium text-gray-800">{siswi['KAMAR'] ? toTitleCase(siswi['KAMAR']) : '-'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="mt-0.5"><BookOpen className="w-4 h-4 text-purple-400" /></div>
                        <div>
                          <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Status Tahfiz</span>
                          <span className="font-medium text-gray-800">{siswi['STATUS TAHFIZ'] ? toTitleCase(siswi['STATUS TAHFIZ']) : '-'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="mt-0.5"><MapPin className="w-4 h-4 text-red-400" /></div>
                        <div>
                          <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Domisili</span>
                          <span className="font-medium text-gray-800">{siswi['DOMISILI'] ? toTitleCase(siswi['DOMISILI']) : '-'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="mt-0.5"><CheckCircle className={`w-4 h-4 ${siswi.status_database === 'Aktif' ? 'text-green-500' : 'text-red-500'}`} /></div>
                        <div>
                          <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Status Siswi</span>
                          <span className={`font-medium ${siswi.status_database === 'Aktif' ? 'text-gray-800' : 'text-red-600 font-bold'}`}>{siswi.status_database ? toTitleCase(siswi.status_database) : '-'}</span>
                        </div>
                      </div>
                      <div className="col-span-2 flex gap-2.5 mt-1 pt-3 border-t border-gray-100">
                        <div className="mt-0.5"><MapPin className="w-4 h-4 text-gray-400" /></div>
                        <div>
                          <span className="font-bold block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Alamat Lengkap</span>
                          <span className="font-medium text-gray-800 leading-snug block uppercase">{siswi['ALAMAT LENGKAP'] ? siswi['ALAMAT LENGKAP'] : '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Buttons WA */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-2">
                      {siswi['NO WA AYAH'] && String(siswi['NO WA AYAH']).trim() !== '' && String(siswi['NO WA AYAH']).trim().toLowerCase() !== 'null' && String(siswi['NO WA AYAH']).trim() !== '-' ? (
                        <button
                          onClick={() => openWhatsApp(siswi['NO WA AYAH'])}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3.5 px-4 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 shadow-md shadow-green-200/50 hover:shadow-lg hover:shadow-green-300/50"
                        >
                          <FaWhatsapp className="w-5 h-5 mr-2" />
                          WA Ayah
                        </button>
                      ) : (
                        <button disabled className="flex-1 bg-gray-50 text-gray-400 py-3.5 px-4 rounded-xl flex items-center justify-center font-medium cursor-not-allowed border border-gray-200/60">
                          WA Ayah Kosong
                        </button>
                      )}

                      {siswi['NO WA IBU'] && String(siswi['NO WA IBU']).trim() !== '' && String(siswi['NO WA IBU']).trim().toLowerCase() !== 'null' && String(siswi['NO WA IBU']).trim() !== '-' ? (
                        <button
                          onClick={() => openWhatsApp(siswi['NO WA IBU'])}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3.5 px-4 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 shadow-md shadow-green-200/50 hover:shadow-lg hover:shadow-green-300/50"
                        >
                          <FaWhatsapp className="w-5 h-5 mr-2" />
                          WA Ibu
                        </button>
                      ) : (
                        <button disabled className="flex-1 bg-gray-50 text-gray-400 py-3.5 px-4 rounded-xl flex items-center justify-center font-medium cursor-not-allowed border border-gray-200/60">
                          WA Ibu Kosong
                        </button>
                      )}
                    </div>
                  </div>
    );
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-mazeeda-navy flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-28 h-28 bg-white rounded-3xl p-3 shadow-[0_10px_40px_rgba(0,0,0,0.3)] mb-8 relative">
          <div className="absolute inset-0 bg-white rounded-3xl animate-ping opacity-20"></div>
          <img src={appLogo} alt="Mazeeda Logo" className="w-full h-full object-contain relative z-10" />
        </div>
        <div className="flex flex-col items-center gap-5">
          <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin"></div>
          <div className="text-center">
            <h2 className="text-xl font-black tracking-widest mb-2">SINKRONISASI DATA</h2>
            
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center pb-safe font-sans">
      <div className="w-full max-w-md bg-white min-h-screen shadow-xl relative pb-32">

        {/* Header */}
        <div className={`bg-mazeeda-blue text-white pt-10 ${activeTab === 'beranda' ? 'pb-12' : 'pb-6'} px-6 rounded-b-[2.5rem] relative shadow-md`}>
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border-2 border-white/60 shadow-inner overflow-hidden">
              <img src={appLogo} alt="Logo MAZEEDA" className="w-full h-full object-cover bg-white" />
            </div>
            <h1 className="text-xl font-bold text-center leading-tight mt-2">
              INFORMASI MAZEEDA
            </h1>
            {activeTab === 'statistik' && (
              <h2 className="text-xl font-bold text-blue-100 text-center mt-1 tracking-wide">Statistik Daerah Siswi</h2>
            )}
            {activeTab === 'bagian' && (
              <h2 className="text-xl font-bold text-blue-100 text-center mt-1 tracking-wide">Data Bagian</h2>
            )}
            {activeTab === 'kategori' && (
              <h2 className="text-xl font-bold text-blue-100 text-center mt-1 tracking-wide">Data Kategori</h2>
            )}
            {activeTab === 'pengajar' && (
              <h2 className="text-xl font-bold text-blue-100 text-center mt-1 tracking-wide">Data Pengajar</h2>
            )}
          </div>
        </div>

        {activeTab === 'beranda' ? (
        <>
          {/* Search Bar */}
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

        {/* Admin Panel */}
        {isAdmin && showAdminPanel && (
          <div className="px-6 mt-6 mb-2">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 relative">
              <button
                onClick={() => setShowAdminPanel(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={async () => await supabase.auth.signOut()}
                className="absolute top-3 right-10 text-xs font-bold text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200 px-2 py-1 rounded-md transition-colors"
              >
                Logout
              </button>
              <h3 className="font-bold text-mazeeda-blue mb-2 flex items-center">
                <Lock className="w-4 h-4 mr-2" /> Panel Admin
              </h3>
              <p className="text-xs text-gray-600">Aplikasi saat ini otomatis terhubung dengan Google Sheets. Tidak perlu upload/hapus data dari sini.</p>
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
                    <div className="h-10 bg-green-100 rounded-xl w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-5">
              <div className="text-sm text-gray-500 mb-1 px-1 flex justify-between items-center">
                <span>Ditemukan {results.length} hasil</span>
              </div>
              {results.map((siswi) => {
                const isBoyong = siswi.status_database !== 'Aktif';
                const cardClass = isBoyong 
                  ? "bg-red-50 border border-red-200 p-5 rounded-3xl shadow-[0_8px_30px_rgb(255,0,0,0.06)] hover:shadow-[0_8px_30px_rgb(255,0,0,0.1)] transition-all duration-300"
                  : "bg-white border border-gray-100 p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300";
                const badgeClass = isBoyong 
                  ? "bg-red-100 text-red-700 border-red-200" 
                  : "bg-blue-50 text-mazeeda-blue border-blue-100";

                return (
                  <div key={siswi.id}><StudentCardUI siswi={siswi} /></div>
                );
              })}
            </div>
          ) : hasSearched && query.trim() !== '' ? (
            <div className="text-center py-16 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-medium text-gray-600">Tidak ada hasil ditemukan</p>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="mb-6 text-gray-500 font-medium">Ketik nama siswi pada kolom pencarian di atas untuk memulai.</p>

              {/* Stats Section */}
              <div className="w-full max-w-sm mx-auto px-4 mt-2 mb-8">
                {stats.isLoading ? (
                  <div className="flex justify-center w-full py-10">
                    <div className="w-10 h-10 rounded-full border-4 border-mazeeda-blue border-t-transparent animate-spin"></div>
                  </div>
                ) : stats.data.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <div className="bg-gradient-to-br from-mazeeda-blue to-blue-600 rounded-3xl p-6 shadow-lg shadow-blue-200/50 text-white relative overflow-hidden flex flex-col items-center justify-center text-center">
                      <div className="absolute -right-4 -top-4 opacity-10">
                        <Users className="w-32 h-32" />
                      </div>
                      <p className="text-blue-100 text-xs font-bold uppercase tracking-[0.2em] mb-2 z-10">Total Keseluruhan</p>
                      <div className="flex items-end justify-center gap-2 z-10">
                        <h2 className="text-6xl font-black leading-none tracking-tight">
                          {stats.data.reduce((sum, item) => sum + item.count, 0)}
                        </h2>
                        <span className="text-blue-100 font-medium mb-1.5">Siswi</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {stats.data.map((item, idx) => {
                        const isAktif = item.status.toLowerCase() === 'aktif';
                        let colorClass = isAktif
                          ? "bg-green-50/80 border-green-100 hover:bg-green-100"
                          : "bg-red-50/80 border-red-100 hover:bg-red-100";
                        let countColor = isAktif ? "text-green-700" : "text-red-600";

                        return (
                          <button
                            key={idx}
                            onClick={() => showStudentsByStatus(item.status)}
                            className={`${colorClass} p-4 rounded-2xl border flex flex-col justify-between shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer active:scale-95 text-left h-[100px]`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 text-gray-800 leading-tight">
                              {item.status}
                            </span>
                            <span className={`text-3xl font-black ${countColor} self-end`}>
                              {item.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-0 right-0 text-center">
          <button
            onClick={() => isAdmin ? setShowAdminPanel(true) : setShowLoginModal(true)}
            className="text-[10px] text-gray-300 hover:text-gray-500 transition-colors bg-transparent px-4 py-1"
          >
            Login Admin
          </button>
        </div>
        
        </>
        ) : activeTab === 'bagian' ? (
          <StatistikBagian data={allData} onSelectStudent={setSelectedStudent} />
        ) : activeTab === 'kategori' ? (
          <StatistikKategori data={allData} onSelectStudent={setSelectedStudent} />
        ) : activeTab === 'pengajar' ? (
          <DataPengajar data={pengajarData} />
        ) : (
        <StatistikDaerah data={allData} onSelectStudent={setSelectedStudent} />
      )}
      </div>

      
        {/* Modal Detail Siswi */}
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl relative no-scrollbar">
              <button 
                onClick={() => setSelectedStudent(null)}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full z-20 shadow-md transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
              <StudentCardUI siswi={selectedStudent} />
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
      {!selectedStudent && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-6 flex justify-center pointer-events-none pb-safe">
          <nav className="w-full max-w-[420px] bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-full pointer-events-auto overflow-hidden">
            <div className="h-[70px] flex items-center justify-around px-4">
            <button 
              onClick={() => setActiveTab('beranda')}
              className={`outline-none focus:outline-none flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${activeTab === 'beranda' ? 'text-mazeeda-blue translate-y-[-2px]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Home className={`w-6 h-6 transition-all duration-200 ${activeTab === 'beranda' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className={`text-[10px] mt-1 transition-all duration-200 ${activeTab === 'beranda' ? 'font-bold' : 'font-medium'}`}>Beranda</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('bagian')}
              className={`outline-none focus:outline-none flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${activeTab === 'bagian' ? 'text-mazeeda-blue translate-y-[-2px]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Users className={`w-6 h-6 transition-all duration-200 ${activeTab === 'bagian' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className={`text-[10px] mt-1 transition-all duration-200 ${activeTab === 'bagian' ? 'font-bold' : 'font-medium'}`}>Bagian</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('statistik')}
              className={`outline-none focus:outline-none flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${activeTab === 'statistik' ? 'text-mazeeda-blue translate-y-[-2px]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <BarChart2 className={`w-6 h-6 transition-all duration-200 ${activeTab === 'statistik' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className={`text-[10px] mt-1 transition-all duration-200 ${activeTab === 'statistik' ? 'font-bold' : 'font-medium'}`}>Statistik</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('kategori')}
              className={`outline-none focus:outline-none flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${activeTab === 'kategori' ? 'text-mazeeda-blue translate-y-[-2px]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <PieChart className={`w-6 h-6 transition-all duration-200 ${activeTab === 'kategori' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className={`text-[10px] mt-1 transition-all duration-200 ${activeTab === 'kategori' ? 'font-bold' : 'font-medium'}`}>Kategori</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('pengajar')}
              className={`outline-none focus:outline-none flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${activeTab === 'pengajar' ? 'text-mazeeda-blue translate-y-[-2px]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <BookOpen className={`w-6 h-6 transition-all duration-200 ${activeTab === 'pengajar' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className={`text-[10px] mt-1 transition-all duration-200 ${activeTab === 'pengajar' ? 'font-bold' : 'font-medium'}`}>Pengajar</span>
            </button>
          </div>
        </nav>
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><Lock className="w-5 h-5 mr-2 text-mazeeda-blue" />Login Admin</h2>
            <form onSubmit={handleAdminLogin}>
              <div className="mb-4">
                <input type="password" placeholder="Masukkan Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-mazeeda-blue focus:ring-1 focus:ring-mazeeda-blue transition-all" autoFocus />
                {loginError && <p className="text-red-500 text-xs mt-1 ml-1">{loginError}</p>}
              </div>
              <button type="submit" className="w-full bg-mazeeda-blue hover:bg-mazeeda-navy text-white font-semibold py-3 rounded-xl transition-colors">Masuk</button>
            </form>
          </div>
        </div>
      )}

      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => { setShowUnlockModal(false); setUnlockPasswordInput(''); setUnlockError(''); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><Lock className="w-5 h-5 mr-2 text-mazeeda-blue" />Verifikasi Password</h2>
            <form onSubmit={handleUnlockSecret}>
              <div className="mb-4">
                <input type="password" placeholder="Masukkan Password Admin" value={unlockPasswordInput} onChange={(e) => setUnlockPasswordInput(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-mazeeda-blue focus:ring-1 focus:ring-mazeeda-blue transition-all" autoFocus />
                {unlockError && <p className="text-red-500 text-xs mt-1 ml-1">{unlockError}</p>}
              </div>
              <button type="submit" className="w-full bg-mazeeda-blue hover:bg-mazeeda-navy text-white font-semibold py-3 rounded-xl transition-colors">Tampilkan Data</button>
            </form>
          </div>
        </div>
      )}
      
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
              <button onClick={() => setShowInstallPrompt(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X className="w-4 h-4" /></button>
              <button onClick={handleInstallClick} className="bg-mazeeda-blue hover:bg-mazeeda-navy text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-transform active:scale-95 shadow-sm whitespace-nowrap flex items-center"><Download className="w-3 h-3 mr-1.5" />Install</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
