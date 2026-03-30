'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, Calendar, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Định nghĩa kiểu dữ liệu cho Patient và Images
interface PatientImage {
  image_url: string;
}

interface Patient {
  id: number;
  full_name: string;
  created_at: string;
  patient_images: PatientImage[];
}

export default function AdminDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      // Truy vấn lấy bệnh nhân và kèm theo các ảnh của họ (Relation)
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id,
          full_name,
          created_at,
          patient_images (
            image_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      alert("Lỗi tải dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Danh sách Bệnh nhân</h1>
            <p className="text-gray-500">Bác sĩ có thể xem và quản lý hồ sơ tại đây</p>
          </div>
          <button 
            onClick={fetchPatients}
            className="p-2 bg-white border rounded-full hover:bg-gray-100 transition-shadow shadow-sm"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {patients.length === 0 && (
              <div className="text-center py-10 bg-white rounded-lg border">Chưa có dữ liệu bệnh nhân nào.</div>
            )}
            
            {patients.map((patient) => (
              <div key={patient.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-800">{patient.full_name}</h2>
                      <div className="flex items-center text-xs text-gray-400">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(patient.created_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded">
                    {patient.patient_images?.length || 0} ảnh
                  </span>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {patient.patient_images?.map((img, idx) => (
                      <a 
                        key={idx} 
                        href={img.image_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="relative aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                      >
                        <img 
                          src={img.image_url} 
                          alt="hồ sơ bệnh nhân" 
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}