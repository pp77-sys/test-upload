"use client";
import React, { useState, useRef } from 'react';
import { Camera, Upload, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

const PatientUpload = () => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Xử lý khi người dùng chọn file hoặc chụp ảnh
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedImages.length > 4) {
      alert("Bạn chỉ được upload tối đa 4 hình ảnh.");
      return;
    }

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setSelectedImages(prev => [...prev, ...newImages]);
  };

  const handleUpload = async () => {
    setUploading(true);
    // Logic gửi dữ liệu lên Backend (Supabase/S3) sẽ nằm ở đây
    setTimeout(() => {
      setUploading(false);
      alert("Đã gửi thông tin thành công!");
      setSelectedImages([]);
    }, 2000);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-xl mt-10">
      <h1 className="text-2xl font-bold text-blue-700 mb-2">Gửi hồ sơ bệnh nhân</h1>
      <p className="text-gray-500 mb-6 text-sm">Vui lòng cung cấp khoảng 4 hình ảnh rõ nét.</p>

      {/* Khu vực chọn hình thức */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button 
          onClick={() => fileInputRef.current.click()}
          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Camera className="w-8 h-8 text-blue-600 mb-2" />
          <span className="text-sm font-medium">Chụp hình</span>
        </button>

        <button 
          onClick={() => fileInputRef.current.click()}
          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Upload className="w-8 h-8 text-gray-600 mb-2" />
          <span className="text-sm font-medium">Chọn từ máy</span>
        </button>
      </div>

      {/* Input ẩn để kích hoạt camera/gallery */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment" // Quan trọng: dòng này kích hoạt camera sau trên điện thoại
        multiple
        className="hidden"
      />

      {/* Preview hình ảnh đã chọn */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {selectedImages.map((img, index) => (
          <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-gray-100">
            <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      <button 
        disabled={selectedImages.length === 0 || uploading}
        onClick={handleUpload}
        className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
          selectedImages.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300'
        }`}
      >
        {uploading ? "Đang gửi..." : "Hoàn tất và gửi"}
      </button>
    </div>
  );
};

export default PatientUpload;