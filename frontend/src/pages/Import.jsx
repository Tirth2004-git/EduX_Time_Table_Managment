import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, FileType, CheckCircle, XCircle, AlertTriangle, Loader2, Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import timetableApi from '@/services/api/timetableApi';
import * as xlsx from 'xlsx';

export default function Import({ isTab = false }) {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    setResult(null);
    setPreviewData([]);

    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx')) {
      setError('Invalid file type. Please upload an Excel (.xlsx) file.');
      setFile(null);
      return;
    }

    setFile(selectedFile);

    // Read for preview
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);
        setPreviewData(data.slice(0, 5)); // Preview up to 5 rows
      } catch (err) {
        console.error('Preview error:', err);
        setError('Failed to preview Excel file. Make sure it is a valid .xlsx format.');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    setPreviewData([]);
    setError(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const ws_data = [
      ['TeacherName', 'Department', 'TeachingHours', 'SubjectName', 'SubjectCode', 'Program', 'ClassName', 'Semester', 'Division', 'RequiredPeriods'],
      ['John Doe', 'IT', '6', 'Database Systems', 'CS301', 'Information Technology', 'SY', '3', 'A', '6'],
      ['Jane Smith', 'Computer Science', '5', 'Operating Systems', 'CS302', 'Computer Engineering', 'TY', '5', 'B', '5']
    ];
    const ws = xlsx.utils.aoa_to_sheet(ws_data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Template");
    xlsx.writeFile(wb, "Timetable_Setup_Template.xlsx");
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await timetableApi.importExcel(formData);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={isTab ? "text-slate-900 font-sans animate-fadeIn" : "min-h-screen bg-[#F8FAFC] text-slate-900 p-6 md:p-8 font-sans"}>
      <div className={isTab ? "space-y-6" : "max-w-4xl mx-auto space-y-6"}>
        {!isTab && (
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')} className="rounded-xl border-slate-200">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-950 to-slate-700">Bulk Import Setup</h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Upload a single Excel file to configure departments, teachers, subjects, and divisions.</p>
            </div>
          </div>
        )}

        <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Upload Configuration Data</CardTitle>
                <CardDescription className="text-xs text-slate-400">Select an .xlsx file conforming to the required structure.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 text-indigo-600 border-slate-200 hover:bg-slate-50 hover:text-indigo-700 hover:border-slate-300 rounded-xl font-bold text-xs">
                <Download className="w-4 h-4" /> Download Template
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!file ? (
              <div 
                className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center bg-slate-50/20 hover:bg-slate-50/60 hover:border-slate-300 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-indigo-50 border border-indigo-100/20 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-slate-800">Click to upload Excel file</p>
                <p className="text-xs text-slate-400 mt-1">Only .xlsx files are supported</p>
              </div>
            ) : (
              <div className="border border-slate-100 rounded-2xl p-5 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
                      <FileType className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-850 text-sm">{file.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  {!uploading && !result && (
                    <Button variant="ghost" size="sm" onClick={clearFile} className="text-slate-400 hover:text-red-500 rounded-xl text-xs font-bold">
                      Remove
                    </Button>
                  )}
                </div>
                
                {previewData.length > 0 && !result && !error && (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <h4 className="text-xs font-bold text-slate-700 mb-3 border-l-2 border-indigo-600 pl-2">Data Preview (First 5 rows)</h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-900 text-white border-0">
                          <tr>
                            {Object.keys(previewData[0]).map(key => (
                              <th key={key} className="px-3 py-2.5 font-semibold uppercase tracking-wider">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {previewData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              {Object.values(row).map((val, vIdx) => (
                                <td key={vIdx} className="px-3 py-2.5 truncate max-w-[120px] font-medium">{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".xlsx" 
              className="hidden" 
              onChange={handleFileChange}
            />

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-800">Upload Failed</h4>
                  <p className="text-xs text-red-650 font-semibold mt-1">{error}</p>
                </div>
              </div>
            )}

            {result && result.success && (
              <div className="mt-4 p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl">
                 <div className="flex items-center gap-2 mb-3 border-b border-emerald-100/30 pb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-bold text-emerald-800 text-xs uppercase tracking-wider">Import Successful</h4>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
                      <p className="text-2xl font-extrabold text-slate-800">{result.totalRows}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Rows Processed</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
                      <p className="text-2xl font-extrabold text-slate-800">{result.teachersCreated}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Teachers Created</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
                      <p className="text-2xl font-extrabold text-slate-800">{result.subjectsCreated}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Subjects Linked</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
                      <p className="text-2xl font-extrabold text-slate-800">{result.classroomsCreated || 0}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Divisions Added</p>
                    </div>
                 </div>

                 {result.errors && result.errors.length > 0 && (
                   <div className="mt-4">
                     <p className="text-xs font-bold text-amber-600 mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Processing Warnings ({result.errors.length})</p>
                     <ul className="text-xs text-amber-700 bg-amber-50/50 border border-amber-100 rounded-xl p-3 list-disc list-inside max-h-32 overflow-y-auto space-y-1">
                       {result.errors.map((err, i) => (
                         <li key={i} className="font-semibold">{err}</li>
                       ))}
                     </ul>
                   </div>
                 )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleUpload} 
                disabled={!file || uploading || (result && result.success)}
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-[#6366F1] hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-xs shadow-sm rounded-xl py-2.5 px-5 transition-all gap-2 cursor-pointer border-0"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><UploadCloud className="w-4 h-4" /> Import Excel Data</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
