import React, { useState, useEffect, useRef } from 'react';
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
  ArrowUp,
  ArrowDown,
  EyeOff,
  Plus,
} from 'lucide-react';
import { AdvertisementBanner } from '../../types';
import {
  uploadBannerImage,
  addAdvertisementBanner,
  updateAdvertisementBanner,
  updateBannersOrder,
  deleteAdvertisementBanner,
} from '../../firebase/services';

interface BannerManagementProps {
  banners: AdvertisementBanner[];
  onBannersUpdated: () => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const BannerManagement: React.FC<BannerManagementProps> = ({
  banners,
  onBannersUpdated,
  onShowToast,
}) => {
  const [localBanners, setLocalBanners] = useState<AdvertisementBanner[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [aspectWarning, setAspectWarning] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewBanner, setPreviewBanner] = useState<AdvertisementBanner | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<AdvertisementBanner | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep local ordered list synchronized with database
  useEffect(() => {
    const sorted = [...banners].sort((a, b) => a.displayOrder - b.displayOrder);
    setLocalBanners(sorted);
  }, [banners]);

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

    if (banners.length >= 10) {
      onShowToast('Maximum limit of 10 banners reached. Please delete a banner first.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const bannerUrl = await uploadBannerImage(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      // Use the length of currently uploaded banners as the next display order (so it appends to the end)
      const nextDisplayOrder = banners.length;
      await addAdvertisementBanner(bannerUrl, nextDisplayOrder, true);
      onShowToast('Advertisement banner uploaded successfully.', 'success');

      handleClearSelection();
      await onBannersUpdated();
    } catch (err: any) {
      console.error('Banner upload error:', err);
      onShowToast('Failed to upload advertisement banner. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = async (banner: AdvertisementBanner) => {
    try {
      await updateAdvertisementBanner(banner.id, { isActive: !banner.isActive });
      onShowToast(`Banner is now ${!banner.isActive ? 'Active' : 'Inactive'}.`, 'success');
      await onBannersUpdated();
    } catch (err) {
      onShowToast('Failed to toggle banner status.', 'error');
    }
  };

  // Delete Banner Handler
  const handleDeleteClick = (banner: AdvertisementBanner) => {
    setBannerToDelete(banner);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bannerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAdvertisementBanner(bannerToDelete.id);
      onShowToast('Advertisement banner deleted successfully.', 'info');
      setIsDeleteModalOpen(false);
      setBannerToDelete(null);
      await onBannersUpdated();
    } catch (err: any) {
      onShowToast('Failed to delete advertisement banner.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Move banner Up in order
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const reordered = [...localBanners];
    const temp = reordered[index];
    reordered[index] = reordered[index - 1];
    reordered[index - 1] = temp;

    const normalizedOrder = reordered.map((b, idx) => ({
      ...b,
      displayOrder: idx,
    }));

    setLocalBanners(normalizedOrder);

    try {
      await updateBannersOrder(normalizedOrder.map((b) => ({ id: b.id, displayOrder: b.displayOrder })));
      await onBannersUpdated();
    } catch (err) {
      onShowToast('Failed to save banner reordering.', 'error');
    }
  };

  // Move banner Down in order
  const handleMoveDown = async (index: number) => {
    if (index === localBanners.length - 1) return;
    const reordered = [...localBanners];
    const temp = reordered[index];
    reordered[index] = reordered[index + 1];
    reordered[index + 1] = temp;

    const normalizedOrder = reordered.map((b, idx) => ({
      ...b,
      displayOrder: idx,
    }));

    setLocalBanners(normalizedOrder);

    try {
      await updateBannersOrder(normalizedOrder.map((b) => ({ id: b.id, displayOrder: b.displayOrder })));
      await onBannersUpdated();
    } catch (err) {
      onShowToast('Failed to save banner reordering.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#050505] text-[#F5F5F5]">
      {/* Header Panel */}
      <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-1">
            <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
            <span>Marketing & Promotion</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-white">
            Carousel Banner Management
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Configure up to 10 promotional banners for the public catalogue homepage carousel slider.
          </p>
        </div>
        <div className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 shrink-0">
          <span className="text-xs text-zinc-400 font-medium">Banners:</span>
          <span className="text-sm font-bold text-[#D4AF37]">
            {banners.length} / 10
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-xl space-y-6">
            <h3 className="text-lg font-serif font-bold text-white flex items-center space-x-2">
              <Upload className="w-5 h-5 text-[#D4AF37]" />
              <span>Upload New Banner</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Recommended aspect ratio: <strong className="text-[#D4AF37]">16:9</strong> (e.g. 1920×1080). JPG, PNG, and WebP are accepted.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleFileChange}
              className="hidden"
              id="banner-file-input"
              disabled={banners.length >= 10 || isUploading}
            />

            {!previewUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={banners.length >= 10 || isUploading}
                className={`w-full border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center min-h-[200px] group ${
                  banners.length >= 10
                    ? 'border-zinc-800 bg-zinc-950/40 cursor-not-allowed text-zinc-600'
                    : 'border-[#D4AF37]/30 hover:border-[#D4AF37] bg-[#141414] hover:bg-[#1A1A1A] cursor-pointer'
                }`}
              >
                <div className={`w-12 h-12 rounded-full border flex items-center justify-center mb-3 transition-all ${
                  banners.length >= 10
                    ? 'border-zinc-800 bg-zinc-900 text-zinc-600'
                    : 'border-[#D4AF37]/40 bg-[#1A1A1A] group-hover:bg-[#D4AF37]/20 text-[#D4AF37]'
                }`}>
                  <ImageIcon className="w-6 h-6" />
                </div>
                {banners.length >= 10 ? (
                  <>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
                      Banner Limit Reached
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      Please delete an existing banner to upload a new one.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-white">
                      Click to Select Image
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Supports JPG, PNG, WebP up to 10MB
                    </p>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/50 bg-black aspect-[16/9] group">
                  <img
                    src={previewUrl}
                    alt="Selected Banner Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/80 text-white hover:text-rose-400 border border-zinc-700 transition-colors"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {imageDimensions && (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-[#141414] rounded-xl border border-zinc-800 text-xs text-zinc-300">
                    <span>Dimensions:</span>
                    <span className="font-mono font-bold text-[#D4AF37]">
                      {imageDimensions.width} × {imageDimensions.height} px
                    </span>
                  </div>
                )}

                {aspectWarning && (
                  <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-800 text-xs text-amber-300 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{aspectWarning}</span>
                  </div>
                )}

                {isUploading && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-[#D4AF37]">
                      <span>Uploading to Firebase...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                      <div
                        className="h-full bg-[#D4AF37] transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              {previewUrl && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  disabled={isUploading}
                  className="px-4 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={handleUploadBanner}
                disabled={!selectedFile || isUploading || banners.length >= 10}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
                  !selectedFile || isUploading || banners.length >= 10
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-[#D4AF37] hover:bg-[#C9A227] text-black shadow-lg'
                }`}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-black" />
                    <span>Upload Banner</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Banners List Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0D0D0D] rounded-3xl p-6 sm:p-8 border border-[#D4AF37]/30 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-white flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
                <span>Carousel Sequence</span>
              </h3>
              <span className="text-xs text-zinc-400 font-medium italic">
                Active banners slide on home screen
              </span>
            </div>

            {localBanners.length > 0 ? (
              <div className="space-y-4">
                {localBanners.map((banner, index) => {
                  const isFirst = index === 0;
                  const isLast = index === localBanners.length - 1;

                  return (
                    <div
                      key={banner.id}
                      className={`relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#141414] hover:bg-[#191919] rounded-2xl border border-zinc-800 transition-all gap-4 ${
                        !banner.isActive ? 'opacity-65 border-zinc-900 bg-[#0F0F0F]' : ''
                      }`}
                    >
                      {/* Left: Thumbnail & Positioning Info */}
                      <div className="flex items-center space-x-4">
                        <div className="relative aspect-[16/9] w-28 xs:w-36 rounded-xl overflow-hidden bg-black shrink-0 border border-zinc-800">
                          <img
                            src={banner.imageUrl}
                            alt="Banner thumbnail"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-lg bg-black/85 border border-[#D4AF37]/40 text-white font-mono text-[9px] font-bold">
                            #{index + 1}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-mono text-zinc-500 font-semibold uppercase tracking-wider">
                            ID: {banner.id.substring(12, 20)}...
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${banner.isActive ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                            <span className={`text-xs font-semibold ${banner.isActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
                              {banner.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500">
                            Uploaded: {new Date(banner.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Right: Operational Controls */}
                      <div className="flex items-center justify-end space-x-2 border-t sm:border-t-0 border-zinc-850 pt-3 sm:pt-0 shrink-0">
                        {/* Position Shifting Up/Down */}
                        <div className="flex items-center bg-[#0d0d0d] rounded-xl border border-zinc-800 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={isFirst}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isFirst
                                ? 'text-zinc-700 cursor-not-allowed'
                                : 'text-zinc-400 hover:text-[#D4AF37] hover:bg-zinc-900'
                            }`}
                            title="Move slide up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={isLast}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isLast
                                ? 'text-zinc-700 cursor-not-allowed'
                                : 'text-zinc-400 hover:text-[#D4AF37] hover:bg-zinc-900'
                            }`}
                            title="Move slide down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Expand View */}
                        <button
                          type="button"
                          onClick={() => setPreviewBanner(banner)}
                          className="p-2 rounded-xl bg-[#0D0D0D] border border-zinc-800 hover:border-[#D4AF37] text-zinc-400 hover:text-white transition-all"
                          title="View large image"
                        >
                          <Maximize2 className="w-4 h-4 text-[#D4AF37]" />
                        </button>

                        {/* Switch Enable/Disable */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(banner)}
                          className={`p-2 rounded-xl border transition-all ${
                            banner.isActive
                              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/40'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                          title={banner.isActive ? 'Deactivate banner' : 'Activate banner'}
                        >
                          {banner.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        {/* Delete Banner */}
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(banner)}
                          className="p-2 rounded-xl bg-rose-950/20 hover:bg-rose-950/60 border border-rose-900/60 text-rose-400 hover:text-rose-300 transition-all"
                          title="Delete banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-zinc-800 rounded-2xl p-10 text-center bg-[#121212] flex flex-col items-center justify-center min-h-[220px]">
                <ImageIcon className="w-10 h-10 text-zinc-600 mb-2.5" />
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  No Banners Configured
                </p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
                  Upload promotional banners on the left. You can configure up to 10 banners, reorder their display sequence, and toggle their visibility status.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Large Modal Image Preview */}
      {previewBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative max-w-5xl w-full bg-[#0D0D0D] border border-[#D4AF37]/50 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm sm:text-base font-serif font-bold text-white flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                <span>Banner Full Preview (Display #{localBanners.findIndex((b) => b.id === previewBanner.id) + 1})</span>
              </h3>
              <button
                onClick={() => setPreviewBanner(null)}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black border border-zinc-800 aspect-[16/9] w-full shadow-inner">
              <img
                src={previewBanner.imageUrl}
                alt="Banner Large Preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className={`text-xs ${previewBanner.isActive ? 'text-emerald-400' : 'text-zinc-500'} font-semibold`}>
                Status: {previewBanner.isActive ? 'Active & Live' : 'Deactivated'}
              </span>
              <button
                onClick={() => setPreviewBanner(null)}
                className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C9A227] text-black text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && bannerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-[#0D0D0D] border border-rose-800/80 rounded-3xl p-6 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 rounded-full bg-rose-950 border border-rose-800">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-serif font-bold text-white">Delete Banner</h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete this advertisement banner? This will remove the image immediately from the slider sequence.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setBannerToDelete(null);
                }}
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
                    <Trash2 className="w-4 h-4 text-white" />
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
