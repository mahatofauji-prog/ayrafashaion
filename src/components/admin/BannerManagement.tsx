import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  Maximize2,
} from 'lucide-react';
import { AdvertisementBanner } from '../../types';
import { uploadBannerImage, saveAdvertisementBanner, deleteAdvertisementBanner } from '../../firebase/services';

interface BannerManagementProps {
  currentBanner: AdvertisementBanner | null;
  onBannerUpdated: () => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const BannerManagement: React.FC<BannerManagementProps> = ({
  currentBanner,
  onBannerUpdated,
  onShowToast,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [aspectWarning, setAspectWarning] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      onShowToast('Please select a JPG, PNG, or WebP image.', 'error');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Read image dimensions & calculate aspect ratio
    const img = new Image();
    img.src = objectUrl;
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      setImageDimensions({ width, height });

      const ratio = width / height;
      // Ideal 16:9 is 1.777. Warn if ratio is less than 1.55 or greater than 1.95
      if (ratio < 1.55 || ratio > 1.95) {
        setAspectWarning('Recommended banner ratio is 16:9.');
      } else {
        setAspectWarning(null);
      }
    };
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageDimensions(null);
    setAspectWarning(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload Banner Handler
  const handleUploadBanner = async () => {
    if (!selectedFile) {
      onShowToast('Please choose a 16:9 banner image first.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const bannerUrl = await uploadBannerImage(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      await saveAdvertisementBanner(bannerUrl);
      onShowToast('Advertisement banner uploaded successfully.', 'success');

      handleClearSelection();
      await onBannerUpdated();
    } catch (err: any) {
      console.error('Banner upload error:', err);
      onShowToast('Failed to upload advertisement banner. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Delete Banner Handler
  const handleDeleteConfirm = async () => {
    if (!currentBanner) return;
    setIsDeleting(true);
    try {
      await deleteAdvertisementBanner(currentBanner.id);
      onShowToast('Advertisement banner deleted.', 'info');
      setIsDeleteModalOpen(false);
      await onBannerUpdated();
    } catch (err: any) {
      onShowToast('Failed to delete advertisement banner.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#050505] text-[#F5F5F5]">
      {/* Header Banner */}
      <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-1">
            <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
            <span>Marketing & Promotion</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-white">
            Advertisement Banner Management
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Upload and display a promotional 16:9 banner artwork on your public catalogue hero section.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload New Banner Card */}
        <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-xl space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-serif font-bold text-white flex items-center space-x-2 mb-2">
              <Upload className="w-5 h-5 text-[#D4AF37]" />
              <span>Upload New Banner</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Recommended aspect ratio: <strong className="text-[#D4AF37]">16:9</strong> (e.g., 1920×1080, 1600×900, 1280×720). Accepts JPG, PNG, and WebP.
            </p>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleFileChange}
              className="hidden"
              id="banner-file-input"
            />

            {/* Selection Dropzone / Preview */}
            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 border-2 border-dashed border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-2xl p-8 text-center cursor-pointer bg-[#141414] hover:bg-[#1A1A1A] transition-all flex flex-col items-center justify-center min-h-[220px] group"
              >
                <div className="w-14 h-14 rounded-full bg-[#1A1A1A] group-hover:bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] mb-3 transition-all">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Click to select banner image
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Supports JPG, PNG, WebP up to 10MB
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* Image Preview Container (16:9 Aspect ratio preview) */}
                <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/50 bg-black aspect-[16/9] group">
                  <img
                    src={previewUrl}
                    alt="Selected Banner Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/80 text-white hover:text-rose-400 border border-zinc-700 transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Dimensions info & warning */}
                <div className="flex flex-col space-y-2 text-xs">
                  {imageDimensions && (
                    <div className="flex items-center justify-between px-3 py-2 bg-[#141414] rounded-xl border border-zinc-800 text-zinc-300">
                      <span>Image Dimensions:</span>
                      <span className="font-mono font-bold text-[#D4AF37]">
                        {imageDimensions.width} × {imageDimensions.height} px
                      </span>
                    </div>
                  )}

                  {aspectWarning && (
                    <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-300 flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{aspectWarning}</span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {isUploading && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-[#D4AF37]">
                      <span>Uploading to Firebase...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                      <div
                        className="h-full bg-[#D4AF37] transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3">
            {previewUrl && (
              <button
                type="button"
                onClick={handleClearSelection}
                disabled={isUploading}
                className="px-4 py-3 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              id="upload-banner-submit-btn"
              type="button"
              onClick={handleUploadBanner}
              disabled={!selectedFile || isUploading}
              className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
                !selectedFile || isUploading
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-[#D4AF37] hover:bg-[#C9A227] text-black shadow-lg'
              }`}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Uploading Banner...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-black" />
                  <span>Upload Banner</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Current Active Banner Management Card */}
        <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif font-bold text-white flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Currently Active Banner</span>
              </h3>

              {currentBanner && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  Live on Catalogue
                </span>
              )}
            </div>

            {currentBanner ? (
              <div className="space-y-4">
                {/* Live Banner Display Container (16:9 Aspect ratio) */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#D4AF37]/50 shadow-2xl bg-black aspect-[16/9] group">
                  <img
                    src={currentBanner.imageUrl}
                    alt="Active Advertisement Banner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                    <span className="text-xs text-[#D4AF37] font-semibold">Active Artwork</span>
                    <button
                      type="button"
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-bold border border-zinc-700 flex items-center space-x-1.5 hover:border-[#D4AF37]"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Expand</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#141414] border border-zinc-800 text-xs text-zinc-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Banner ID:</span>
                    <span className="font-mono text-zinc-200">{currentBanner.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uploaded Date:</span>
                    <span className="text-zinc-200">
                      {new Date(currentBanner.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-zinc-800 rounded-2xl p-8 text-center bg-[#121212] flex flex-col items-center justify-center min-h-[220px]">
                <ImageIcon className="w-10 h-10 text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  No Active Advertisement Banner
                </p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                  Upload an image on the left to show a prominent promotional artwork on your public catalogue.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {currentBanner && (
            <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] border border-zinc-800 text-zinc-200 hover:text-[#D4AF37] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-2"
              >
                <Eye className="w-4 h-4 text-[#D4AF37]" />
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 px-4 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] border border-zinc-800 text-zinc-200 hover:text-[#D4AF37] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
                <span>Replace Banner</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="py-3 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900 text-rose-300 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full Preview Modal */}
      {isPreviewModalOpen && currentBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative max-w-5xl w-full bg-[#0D0D0D] border border-[#D4AF37]/50 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-serif font-bold text-white flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                <span>Advertisement Banner Full Preview</span>
              </h3>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black border border-zinc-800 aspect-[16/9] w-full shadow-inner">
              <img
                src={currentBanner.imageUrl}
                alt="Banner Large Preview"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C9A227] text-black text-xs font-bold uppercase tracking-wider"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-[#0D0D0D] border border-rose-800/80 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 rounded-full bg-rose-950 border border-rose-800">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-serif font-bold text-white">Delete Banner</h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete this advertisement banner? It will be removed immediately from the public catalogue hero section.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] border border-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold uppercase tracking-wider shadow-md transition-colors flex items-center space-x-1.5"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
