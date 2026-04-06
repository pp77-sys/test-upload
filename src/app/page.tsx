'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { 
  Camera, Upload, Loader2, CheckCircle2, 
  X, LogOut, User, Phone, Calendar, ArrowRight, Clock, Activity
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
  // Xác thực
  const [isVerified, setIsVerified] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [authInfo, setAuthInfo] = useState({ phone: "", birthYear: "" });
  const [authLoading, setAuthLoading] = useState(true);

  // Dữ liệu ảnh và khảo sát
  const [selectedImage, setSelectedImage] = useState<{file: File, preview: string} | null>(null);
  const [isFromCamera, setIsFromCamera] = useState(false);
  
  const [survey, setSurvey] = useState({
    circumstance: "Sau khi cào gãi/Mặc đồ chật",
    otherCircumstance: "",
    capturedAt: "", // YYYY-MM-DDTHH:mm
    medicationTaken: false,
    medName: "",
    medDosage: "",
    medTime: "",
    itchScore: 0,
    painScore: 0,
    burningScore: 0
  });

  const [uploadStatus, setUploadStatus] = useState({ loading: false, message: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tự động đăng nhập
  useEffect(() => {
    const autoLogin = async () => {
      const p = localStorage.getItem('p_phone');
      const b = localStorage.getItem('p_birth');

      if (p && b) {
        try {
          const { data } = await supabase
            .from('patients')
            .select('*')
            .eq('phone_number', p)
            .eq('birth_year', b)
            .single();

          if (data) {
            setPatientData(data);
            setIsVerified(true);
          }
        } catch (err) {
          console.error("Lỗi tự động đăng nhập:", err);
        }
      }
      
      // Tương đương với .finally() - Luôn chạy dù thành công hay thất bại
      setAuthLoading(false);
    };

    autoLogin();
  }, []);

  // Xử lý chọn hình
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const now = new Date().toISOString().slice(0, 16);
      
      setSelectedImage({ file, preview: URL.createObjectURL(file) });
      
      // Nếu là chụp trực tiếp, capture sẽ kích hoạt. 
      // Ở đây ta giả định nếu dùng input file thường thì bệnh nhân phải chọn giờ.
      setSurvey(prev => ({ ...prev, capturedAt: now }));
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) return;
    setUploadStatus({ loading: true, message: "Đang lưu dữ liệu..." });

    try {
      const fileExt = selectedImage.file.name.split('.').pop();
      const storageKey = `patients/${patientData.id}/${Date.now()}.${fileExt}`;
      
      // 1. Upload R2
      const buffer = await selectedImage.file.arrayBuffer();
      await r2Client.send(new PutObjectCommand({
        Bucket: "md-photos",
        Key: storageKey,
        Body: new Uint8Array(buffer),
        ContentType: selectedImage.file.type,
      }));

      // 2. Lưu Database
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

      alert("Đã gửi hình và thông tin thành công!");
      setSelectedImage(null); // Reset để gửi hình tiếp theo
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setUploadStatus( { loading: false, message: "" });
    }
  };

  if (authLoading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin" /></div>;

  // --- UI ĐĂNG NHẬP (Giữ nguyên logic cũ nhưng làm gọn) ---
  if (!isVerified) {
    return (
      <div className="max-w-md mx-auto p-6 min-h-screen flex flex-col justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
           <h1 className="text-xl font-black text-center mb-6">XÁC MINH BỆNH NHÂN</h1>
           <div className="space-y-4">
              <input placeholder="Số điện thoại" className="w-full p-4 bg-slate-100 rounded-2xl outline-none" onChange={e => setAuthInfo({...authInfo, phone: e.target.value})} />
              <input type="number" placeholder="Năm sinh" className="w-full p-4 bg-slate-100 rounded-2xl outline-none" onChange={e => setAuthInfo({...authInfo, birthYear: e.target.value})} />
              <button onClick={() => {
                supabase.from('patients').select('*').eq('phone_number', authInfo.phone).eq('birth_year', authInfo.birthYear).single()
                .then(({data}) => {
                  if(data) { 
                    localStorage.setItem('p_phone', authInfo.phone);
                    localStorage.setItem('p_birth', authInfo.birthYear);
                    setPatientData(data); setIsVerified(true); 
                  } else alert("Sai thông tin");
                })
              }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">VÀO HỆ THỐNG</button>
           </div>
        </div>
      </div>
    );
  }

  // --- UI CHÍNH (GỬI HÌNH KÈM KHẢO SÁT) ---
  return (
    <div className="max-w-md mx-auto p-4 pb-20 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm">
        <div>
          <p className="text-xs font-bold text-slate-400">BỆNH NHÂN</p>
          <p className="font-bold text-blue-600">{patientData.full_name}</p>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="p-2 text-red-500"><LogOut size={20}/></button>
      </div>

      {!selectedImage ? (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-dashed border-blue-300 text-center">
          <Camera className="mx-auto w-12 h-12 text-blue-500 mb-4" />
          <h2 className="font-bold mb-2">Bắt đầu gửi hình</h2>
          <p className="text-sm text-slate-500 mb-6">Mỗi lần gửi 1 hình kèm thông tin chi tiết</p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200"
          >
            CHỌN HOẶC CHỤP ẢNH
          </button>
          <input type="file" ref={fileInputRef} hidden accept="image/*" capture="environment" onChange={handleFileChange} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Preview & Thời gian */}
          <div className="bg-white p-4 rounded-3xl shadow-md border">
            <img src={selectedImage.preview} className="w-full h-48 object-cover rounded-2xl mb-4" alt="preview" />
            <label className="block text-xs font-bold text-slate-400 mb-2">THỜI GIAN CHỤP ẢNH</label>
            <input 
              type="datetime-local" 
              value={survey.capturedAt} 
              className="w-full p-3 bg-slate-100 rounded-xl outline-none"
              onChange={e => setSurvey({...survey, capturedAt: e.target.value})}
            />
          </div>

          {/* Hoàn cảnh */}
          <div className="bg-white p-4 rounded-3xl shadow-md border">
            <label className="block text-xs font-bold text-slate-400 mb-2">HOÀN CẢNH TRƯỚC KHI NỔI MẨN</label>
            <select 
              className="w-full p-3 bg-slate-100 rounded-xl mb-3"
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
                placeholder="Nhập hoàn cảnh khác..." 
                className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl outline-none"
                onChange={e => setSurvey({...survey, otherCircumstance: e.target.value})}
              />
            )}
          </div>

          {/* Thuốc */}
          <div className="bg-white p-4 rounded-3xl shadow-md border">
            <label className="block text-xs font-bold text-slate-400 mb-3">ĐÃ UỐNG THUỐC CHƯA?</label>
            <div className="flex space-x-4 mb-4">
              {['Không', 'Có'].map(opt => (
                <button 
                  key={opt}
                  onClick={() => setSurvey({...survey, medicationTaken: opt === 'Có'})}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    (survey.medicationTaken === (opt === 'Có')) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >{opt}</button>
              ))}
            </div>
            {survey.medicationTaken && (
              <div className="space-y-3">
                <input placeholder="Tên thuốc..." className="w-full p-3 bg-blue-50 rounded-xl" onChange={e => setSurvey({...survey, medName: e.target.value})} />
                <input placeholder="Liều lượng..." className="w-full p-3 bg-blue-50 rounded-xl" onChange={e => setSurvey({...survey, medDosage: e.target.value})} />
                <input placeholder="Thời gian uống..." className="w-full p-3 bg-blue-50 rounded-xl" onChange={e => setSurvey({...survey, medTime: e.target.value})} />
              </div>
            )}
          </div>

          {/* Điểm số (0-10) */}
          <div className="bg-white p-4 rounded-3xl shadow-md border space-y-6">
            {[
              { label: 'MỨC ĐỘ ĐIỂM NGỨA', key: 'itchScore' },
              { label: 'MỨC ĐỘ ĐIỂM ĐAU', key: 'painScore' },
              { label: 'MỨC ĐỘ ĐIỂM RÁT', key: 'burningScore' }
            ].map(item => (
              <div key={item.key}>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-slate-400">{item.label}</label>
                  <span className="text-blue-600 font-black">{(survey as any)[item.key]}</span>
                </div>
                <input 
                  type="range" min="0" max="10" 
                  value={(survey as any)[item.key]} 
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  onChange={e => setSurvey({...survey, [item.key]: parseInt(e.target.value)})}
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0 (Không)</span><span>10 (Rất nhiều)</span>
                </div>
              </div>
            ))}
          </div>

          {/* Nút gửi */}
          <div className="flex space-x-3">
            <button 
              onClick={() => setSelectedImage(null)}
              className="flex-1 py-4 bg-slate-200 text-slate-600 rounded-2xl font-bold"
            >HỦY</button>
            <button 
              onClick={handleUpload}
              disabled={uploadStatus.loading}
              className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black shadow-lg flex justify-center items-center"
            >
              {uploadStatus.loading ? <Loader2 className="animate-spin" /> : "GỬI THÔNG TIN"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}