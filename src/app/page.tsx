'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { 
  Camera, Upload, Loader2, CheckCircle2, 
  Trash2, LogOut, User, Phone, Calendar, ArrowRight, Image as ImageIcon
} from 'lucide-react';

// --- CẤU HÌNH CLIENTS ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.NEXT_PUBLIC_PT_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_PT_ACCESS_KEY!,
    secretAccessKey: process.env.NEXT_PUBLIC_PT_SECRET_KEY!,
  },
});

export default function PatientApp() {
  // Trạng thái xác thực
  const [isVerified, setIsVerified] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [authInfo, setAuthInfo] = useState({ phone: "", birthYear: "" });
  const [authLoading, setAuthLoading] = useState(true);

  // Trạng thái Form & Ảnh
  const [selectedImage, setSelectedImage] = useState<{file: File, preview: string} | null>(null);
  const [isFromCamera, setIsFromCamera] = useState(false);
  const [survey, setSurvey] = useState({
    circumstance: "Sau khi cào gãi/Mặc đồ chật",
    otherCircumstance: "",
    capturedAt: "", // Định dạng: YYYY-MM-DDTHH:mm
    medicationTaken: false,
    medName: "",
    medDosage: "",
    medTime: "",
    itchScore: 0,
    painScore: 0,
    burningScore: 0
  });

  const [uploadStatus, setUploadStatus] = useState({ loading: false, message: "" });
  
  // Refs cho input file
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Tự động đăng nhập
  useEffect(() => {
    const checkSession = async () => {
      const p = localStorage.getItem('p_phone');
      const b = localStorage.getItem('p_birth');
      if (p && b) {
        const { data } = await supabase.from('patients').select('*').eq('phone_number', p).eq('birth_year', b).single();
        if (data) { setPatientData(data); setIsVerified(true); }
      }
      setAuthLoading(false);
    };
    checkSession();
  }, []);

  // Xử lý chọn hình
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>, fromCamera: boolean) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsFromCamera(fromCamera);
      
      setSelectedImage({ 
        file, 
        preview: URL.createObjectURL(file) 
      });

      // Nếu chụp từ Camera -> Tự điền giờ hiện tại. Nếu từ Gallery -> Để trống.
      const now = new Date().toLocaleString('sv-SE').slice(0, 16); // Định dạng YYYY-MM-DDTHH:mm
      setSurvey(prev => ({ 
        ...prev, 
        capturedAt: fromCamera ? now : "" 
      }));
    }
  };

  const handleUpload = async () => {
    // Ràng buộc quan trọng: Kiểm tra thời gian nếu chọn từ thư viện
    if (!survey.capturedAt) {
      alert("Vui lòng nhập thời gian chụp ảnh trước khi gửi!");
      return;
    }

    setUploadStatus({ loading: true, message: "Đang tải dữ liệu..." });

    try {
      const fileExt = selectedImage!.file.name.split('.').pop();
      const storageKey = `patients/${patientData.id}/${Date.now()}.${fileExt}`;
      
      const buffer = await selectedImage!.file.arrayBuffer();
      await r2Client.send(new PutObjectCommand({
        Bucket: "md-photos",
        Key: storageKey,
        Body: new Uint8Array(buffer),
        ContentType: selectedImage!.file.type,
      }));

      const finalCircumstance = survey.circumstance === "Khác" ? survey.otherCircumstance : survey.circumstance;
      
      const { error } = await supabase.from('patient_images').insert([{
        patient_id: patientData.id,
        storage_key: storageKey,
        circumstance: finalCircumstance,
        captured_at: new Date(survey.capturedAt).toISOString(),
        medication_taken: survey.medicationTaken,
        medication_name: survey.medName,
        medication_dosage: survey.medDosage,
        medication_time: survey.medTime,
        itch_score: survey.itchScore,
        pain_score: survey.painScore,
        burning_score: survey.burningScore
      }]);

      if (error) throw error;

      alert("Gửi thành công!");
      setSelectedImage(null);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setUploadStatus({ loading: false, message: "" });
    }
  };

  if (authLoading) return <div className="flex justify-center items-center min-h-screen bg-slate-50"><Loader2 className="animate-spin text-blue-600" /></div>;

  // --- UI ĐĂNG NHẬP ---
  if (!isVerified) {
    return (
      <div className="max-w-md mx-auto p-6 min-h-screen flex flex-col justify-center bg-slate-50 text-slate-800">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
           <h1 className="text-xl font-black text-center mb-6 uppercase tracking-tight">Xác minh Bệnh nhân</h1>
           <div className="space-y-4">
              <input placeholder="Số điện thoại" className="w-full p-4 bg-slate-100 rounded-2xl outline-none" onChange={e => setAuthInfo({...authInfo, phone: e.target.value})} />
              <input type="number" placeholder="Năm sinh" className="w-full p-4 bg-slate-100 rounded-2xl outline-none" onChange={e => setAuthInfo({...authInfo, birthYear: e.target.value})} />
              <button onClick={async () => {
                const { data } = await supabase.from('patients').select('*').eq('phone_number', authInfo.phone).eq('birth_year', authInfo.birthYear).single();
                if(data) { 
                  localStorage.setItem('p_phone', authInfo.phone); 
                  localStorage.setItem('p_birth', authInfo.birthYear);
                  setPatientData(data); setIsVerified(true); 
                } else alert("Sai thông tin");
              }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 active:scale-95 transition-transform">VÀO HỆ THỐNG</button>
           </div>
        </div>
      </div>
    );
  }

  // --- UI CHÍNH ---
  return (
    <div className="max-w-md mx-auto p-4 pb-12 bg-slate-50 min-h-screen text-slate-800">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-50 p-2 rounded-full"><User className="text-blue-600" size={20}/></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Bệnh nhân</p>
            <p className="font-bold text-slate-800 leading-none">{patientData.full_name}</p>
          </div>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="p-2 bg-red-50 text-red-500 rounded-xl"><LogOut size={18}/></button>
      </div>

      {!selectedImage ? (
        <div className="space-y-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="text-blue-600" size={32} />
            </div>
            <h2 className="font-black text-slate-800 mb-2">Gửi hình ảnh mới</h2>
            <p className="text-sm text-slate-400 mb-8">Vui lòng chọn phương thức tải ảnh</p>
            
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center space-x-2"
              >
                <Camera size={20} />
                <span>CHỤP ẢNH TRỰC TIẾP</span>
              </button>
              
              <button 
                onClick={() => galleryInputRef.current?.click()}
                className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold flex items-center justify-center space-x-2"
              >
                <ImageIcon size={20} />
                <span>CHỌN TỪ THƯ VIỆN</span>
              </button>
            </div>

            {/* Inputs ẩn */}
            <input type="file" ref={cameraInputRef} hidden accept="image/*" capture="environment" onChange={(e) => handleFileSelection(e, true)} />
            <input type="file" ref={galleryInputRef} hidden accept="image/*" onChange={(e) => handleFileSelection(e, false)} />
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Preview & Thời gian */}
          <div className="bg-white p-4 rounded-3xl shadow-md border border-slate-100 relative">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 p-2 bg-red-500 text-white rounded-full shadow-lg z-10 hover:bg-red-600 transition-colors"
            >
              <Trash2 size={18} />
            </button>
            
            <img src={selectedImage.preview} className="w-full h-56 object-cover rounded-2xl mb-5 shadow-inner" alt="preview" />
            
            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">
              Thời gian chụp ảnh {!isFromCamera && <span className="text-red-500 text-xs">(Bắt buộc)</span>}
            </label>
            <div className="relative">
              <input 
                type="datetime-local" 
                value={survey.capturedAt} 
                className={`w-full p-4 rounded-xl outline-none border-2 transition-all ${
                  !survey.capturedAt ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-slate-50'
                }`}
                onChange={e => setSurvey({...survey, capturedAt: e.target.value})}
              />
            </div>
            {!isFromCamera && !survey.capturedAt && (
              <p className="text-[10px] text-red-500 mt-2 font-bold italic">* Bạn hãy chọn thời gian lúc bắt đầu nổi mẩn/chụp tấm hình này.</p>
            )}
          </div>

          {/* Hoàn cảnh */}
          <div className="bg-white p-5 rounded-3xl shadow-md border border-slate-100">
            <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">Hoàn cảnh trước khi nổi mẩn</label>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-3 outline-none font-medium"
              value={survey.circumstance}
              onChange={e => setSurvey({...survey, circumstance: e.target.value})}
            >
              <option>Sau khi cào gãi/Mặc đồ chật</option>
              <option>Gặp thời tiết lạnh/Tắm nước lạnh</option>
              <option>Tập thể dục/Ra mồ hôi/Tắm nước nóng</option>
              <option>Đang căng thẳng/Mất ngủ</option>
              <option>Có ăn hải sản/Uống rượu bia</option>
              <option>Có dùng thuốc giảm đau/kháng viêm</option>
              <option>Khác</option>
            </select>
            {survey.circumstance === "Khác" && (
              <input 
                placeholder="Nhập hoàn cảnh cụ thể..." 
                className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none animate-in zoom-in-95 duration-200"
                onChange={e => setSurvey({...survey, otherCircumstance: e.target.value})}
              />
            )}
          </div>

          {/* Thuốc */}
          <div className="bg-white p-5 rounded-3xl shadow-md border border-slate-100">
            <label className="block text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest text-center">Đã uống thuốc chưa?</label>
            <div className="flex space-x-3 mb-4">
              {[false, true].map(val => (
                <button 
                  key={String(val)}
                  onClick={() => setSurvey({...survey, medicationTaken: val})}
                  className={`flex-1 py-4 rounded-2xl font-black transition-all ${
                    survey.medicationTaken === val ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}
                >{val ? 'ĐÃ UỐNG' : 'CHƯA'}</button>
              ))}
            </div>
            {survey.medicationTaken && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <input placeholder="Tên thuốc..." className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none" onChange={e => setSurvey({...survey, medName: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Liều lượng..." className="p-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none" onChange={e => setSurvey({...survey, medDosage: e.target.value})} />
                  <input placeholder="Giờ uống..." className="p-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none" onChange={e => setSurvey({...survey, medTime: e.target.value})} />
                </div>
              </div>
            )}
          </div>

          {/* Chỉ số điểm */}
          <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100 space-y-8">
            {[
              { label: 'Mức độ NGỨA', key: 'itchScore', color: 'text-orange-500' },
              { label: 'Mức độ ĐAU', key: 'painScore', color: 'text-red-500' },
              { label: 'Mức độ RÁT', key: 'burningScore', color: 'text-amber-500' }
            ].map(item => (
              <div key={item.key}>
                <div className="flex justify-between items-end mb-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</label>
                  <span className={`text-2xl font-black ${item.color}`}>{(survey as any)[item.key]}</span>
                </div>
                <input 
                  type="range" min="0" max="10" 
                  value={(survey as any)[item.key]} 
                  className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  onChange={e => setSurvey({...survey, [item.key]: parseInt(e.target.value)})}
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-300 mt-2">
                  <span>KHÔNG</span><span>RẤT NHIỀU</span>
                </div>
              </div>
            ))}
          </div>

          {/* Nút gửi cuối cùng */}
          <button 
            onClick={handleUpload}
            disabled={uploadStatus.loading}
            className={`w-full py-5 rounded-2xl font-black text-white shadow-xl flex justify-center items-center space-x-3 transition-all active:scale-95 ${
              uploadStatus.loading ? 'bg-slate-300' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
            }`}
          >
            {uploadStatus.loading ? <Loader2 className="animate-spin" /> : (
              <><CheckCircle2 size={24}/><span>GỬI HỒ SƠ LÂM SÀNG</span></>
            )}
          </button>
          
          <button 
            onClick={() => setSelectedImage(null)}
            className="w-full py-3 text-slate-400 font-bold text-sm uppercase tracking-widest"
          >Hủy bỏ</button>
        </div>
      )}
    </div>
  );
}