-- SQL Editor Supabase untuk Tabel 'wawalsan' MAZEEDA

-- 1. Buat tabel
CREATE TABLE IF NOT EXISTS public.wawalsan (
    id SERIAL PRIMARY KEY,
    nama_siswi VARCHAR(255) NOT NULL,
    bagian VARCHAR(100),
    wa_utama VARCHAR(20) NOT NULL,
    wa_tambahan VARCHAR(20)
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.wawalsan ENABLE ROW LEVEL SECURITY;

-- 3. Buat kebijakan (policy) agar bisa dibaca oleh publik (anon)
CREATE POLICY "Allow public read access"
ON public.wawalsan
FOR SELECT
TO anon
USING (true);

-- 4. Opsional: Data dummy untuk testing (hapus jika sudah tidak perlu)
INSERT INTO public.wawalsan (nama_siswi, bagian, wa_utama, wa_tambahan)
VALUES 
    ('Siti Aisyah', 'Kelas 1A', '081234567890', '085712345678'),
    ('Fatimah Az Zahra', 'Kelas 2B', '+628111222333', NULL),
    ('Khadijah', 'Kelas 3C', '0812-9999-8888', ' 0819 7777 6666 '),
    ('Amina', 'Kelas 1A', '81244445555', '');
