'use client'
import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Camera, Upload, Loader2 } from 'lucide-react';

// Khởi tạo Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PatientUpload() {
  const [name, setName] = useState("");
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: any) => {
    const files = Array.from(e.target.files || []);
    const newImgs = files.map(file => ({ file, preview: URL.createObjectURL(file as File) }));
    setSelectedImages([...selectedImages, ...newImgs]);
  };

  const handleUpload = async () => {
    if (!name || selectedImages.length === 0) return alert("Vui lòng nhập tên và chọn ảnh");
    setLoading(true);

    try {
      // 1. Tạo bản ghi bệnh nhân
      const { data: patient, error: pError } = await supabase
        .from('patients')
        .insert([{ full_name: name }])
        .select()
        .single();

      if (pError) throw pError;

      // 2. Upload từng ảnh lên Storage và lưu link vào DB
      for (const img of selectedImages) {
        const fileName = `${patient.id}/${Date.now()}-${img.file.name}`;
        const { data: uploadData, error: uError } = await supabase.storage
          .from('patient-photos')
          .upload(fileName, img.file);

        if (uError) throw uError;

        const { data: { publicUrl } } = supabase.storage.from('patient-photos').getPublicUrl(fileName);

        await supabase.from('patient_images').insert([
          { patient_id: patient.id, image_url: publicUrl }
        ]);
      }

      alert("Gửi hồ sơ thành công!");
      setName(""); setSelectedImages([]);
    } catch (error) {
      if (error instanceof Error) {
		alert("Lỗi cụ thể: " + error.message);
	  } else {
		alert("Đã xảy ra lỗi không xác định");
	  }
  console.log("Full error details:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold text-center">Hệ thống thu thập dữ liệu</h1>
      
      <input 
        className="w-full p-2 border rounded" 
        placeholder="Họ tên bệnh nhân"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => fileInputRef.current?.click()} className="p-4 border-2 border-dashed flex flex-col items-center">
          <Camera /> <span>Chụp/Chọn ảnh</span>
        </button>
      </div>

      <input type="file" ref={fileInputRef} hidden onChange={handleFile} multiple accept="image/*" capture="environment" />

      <div className="grid grid-cols-2 gap-2">
        {selectedImages.map((img, i) => (
          <img key={i} src={img.preview} className="h-24 w-full object-cover rounded" />
        ))}
      </div>

      <button 
        onClick={handleUpload} 
        disabled={loading}
        className="w-full bg-blue-600 text-white p-3 rounded font-bold flex justify-center"
      >
        {loading ? <Loader2 className="animate-spin" /> : "GỬI HỒ SƠ"}
      </button>
    </div>
  );
}