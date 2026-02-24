import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Image, File, X, Loader2, CheckCircle } from "lucide-react";

interface FileUploadActivityProps {
  contactId?: string;
  companyId?: string;
  corporationId?: string;
  onUploadSuccess?: () => void;
}

const ALLOWED_EXTENSIONS = [
  // Office
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // PDF
  '.pdf',
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  // Text
  '.txt', '.csv'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export default function FileUploadActivity({ 
  contactId, 
  companyId, 
  corporationId,
  onUploadSuccess 
}: FileUploadActivityProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="h-8 w-8 text-green-500" />;
    }
    if (['doc', 'docx', 'pdf', 'txt'].includes(ext || '')) {
      return <FileText className="h-8 w-8 text-orange-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.toLowerCase().split('.').pop();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Dateityp ${ext} nicht erlaubt. Erlaubt: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Datei zu groß (max. 25 MB)`;
    }
    return null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);
    setUploadSuccess(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setUploadError(error);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(false);
    
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setUploadError(error);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (contactId) formData.append('contactId', contactId);
      if (companyId) formData.append('companyId', companyId);
      if (corporationId) formData.append('corporationId', corporationId);

      const response = await fetch('/api/upload/activity-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload fehlgeschlagen');
      }

      const result = await response.json();
      console.log('Upload erfolgreich:', result);
      
      setUploadSuccess(true);
      setSelectedFile(null);
      
      // Callback für Parent-Komponente
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Reset nach 3 Sekunden
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Upload fehlgeschlagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Datei archivieren
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging 
              ? 'border-orange-500 bg-gray-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <>
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                Datei hierher ziehen oder{' '}
                <button
                  type="button"
                  className="text-orange-600 hover:underline font-medium"
                  onClick={() => fileInputRef.current?.click()}
                >
                  auswählen
                </button>
              </p>
              <p className="text-xs text-gray-400">
                Office, PDF, Bilder (max. 25 MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={handleFileSelect}
              />
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedFile.name)}
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Hochladen...
                    </>
                  ) : (
                    'Hochladen'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {uploadError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{uploadError}</p>
          </div>
        )}

        {/* Success Message */}
        {uploadSuccess && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-600">Datei erfolgreich archiviert!</p>
          </div>
        )}

        {/* Info Text */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">
            <strong>Tipp:</strong> Sie können auch E-Mails archivieren, indem Sie diese an{' '}
            <span className="font-mono text-orange-600">FRIDAYarchiv@BL2020.com</span>{' '}
            weiterleiten. Die E-Mail wird automatisch diesem Kontakt zugeordnet.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
