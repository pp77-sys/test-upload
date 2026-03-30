'use client'

import React, { useState, useRef, ChangeEvent } from 'react';
import { Camera, Upload, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

// Định nghĩa kiểu dữ liệu cho hình ảnh
interface ImageFile {
  file: File;
  preview: string;
}

const PatientUpload = () => {
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sửa lỗi ở đây: Thêm kiểu dữ liệu ChangeEvent cho tham số 'e'
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      if (files.length + selectedImages.length > 4) {
        alert("Bạn chỉ được upload tối đa 4 hình ảnh.");
        return;
      }

      const newImages: ImageFile[] = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));

      setSelectedImages(prev => [...prev, ...newImages]);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    // Giả lập gửi dữ liệu
    setTimeout(() => {
      setUploading(false);
      alert("Đã gửi thông tin thành công!");
      setSelectedImages([]);
    }, 2000);
  };

  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    URL.revokeObjectURL(newImages[index].preview); // Xóa bộ nhớ đệm preview
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-xl mt-10 font-sans">
      <h1 className="text-2xl font-bold text-blue-700 mb-2">Gửi hồ sơ bệnh nhân</h1>
      <p className="text-gray-500 mb-6 text-sm">Vui lòng cung cấp khoảng 4 hình ảnh rõ nét.</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Camera className="w-8 h-8 text-blue-600 mb-2" />
          <span className="text-sm font-medium">Chụp hình</span>
        </button>

        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Upload className="w-8 h-8 text-gray-600 mb-2" />
          <span className="text-sm font-medium">Chọn từ máy</span>
        </button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
      />

      <div className="grid grid-cols-2 gap-2 mb-6">
        {selectedImages.map((img, index) => (
          <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-gray-100 group">
            <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
            <button 
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button 
        disabled={selectedImages.length === 0 || uploading}
        onClick={handleUpload}
        className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
          selectedImages.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        {uploading ? "Đang gửi..." : "Hoàn tất và gửi"}
      </button>
    </div>
  );
};

export default PatientUpload;