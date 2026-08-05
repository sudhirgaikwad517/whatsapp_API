import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Plus, Trash2, Edit3, Image as ImageIcon, Zap, Check, X } from 'lucide-react';
import { apiClient } from '../services/api.client';

export const Catalog: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceInINR, setPriceInINR] = useState('');
  const [sku, setSku] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const res = await apiClient.get('/catalog');
      return res.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description,
        priceInINR: Number(priceInINR),
        sku,
        imageUrl,
      };

      if (editingProduct) {
        const res = await apiClient.put(`/catalog/${editingProduct.id}`, payload);
        return res.data.data;
      } else {
        const res = await apiClient.post('/catalog', payload);
        return res.data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-list'] });
      closeModal();
      alert('🎉 Product catalog item saved successfully!');
    },
    onError: (err: any) => {
      alert(`❌ Failed to save product: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/catalog/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-list'] });
      alert('✅ Product deleted from catalog.');
    },
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setTitle('');
    setDescription('');
    setPriceInINR('');
    setSku('');
    setImageUrl('');
    setUploadStats(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setTitle(p.title || '');
    setDescription(p.description || '');
    setPriceInINR(String(p.priceInINR || ''));
    setSku(p.sku || '');
    setImageUrl(p.imageUrl || '');
    setUploadStats(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStats(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { url, originalSize, compressedSize, compressionRatioPercent } = res.data.data;
      setImageUrl(url);
      setUploadStats(
        `⚡ Sharp.js WebP Saved: ${(originalSize / 1024).toFixed(0)} KB ➔ ${(compressedSize / 1024).toFixed(0)} KB (${compressionRatioPercent}% saved)`
      );
    } catch (err: any) {
      alert(`Image Upload Failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center">
            <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7 mr-3 text-emerald-400 shrink-0" />
            <span>WhatsApp Interactive Product Catalog</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage product items, prices, & high-res compressed photos for 1-click in-chat sharing.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-emerald-500/20 text-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 mr-2 stroke-[3]" />
          Add Catalog Product
        </button>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-slate-500 text-xs">Loading products...</div>
        ) : !products || products.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Products in Catalog Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Add products to your catalog to instantly send interactive product cards & payment links inside customer WhatsApp chats!
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Add First Product
            </button>
          </div>
        ) : (
          products.map((item: any) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <div className="h-44 bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-800">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-600">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-[10px]">No Product Image</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-mono font-bold text-emerald-400 border border-emerald-500/30">
                    ₹{Number(item.priceInINR).toFixed(2)}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base truncate">{item.title}</h3>
                    {item.sku && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        SKU: {item.sku}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-slate-800/80 flex items-center justify-end space-x-2 mt-3">
                <button
                  onClick={() => openEditModal(item)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-slate-700 transition-all flex items-center cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete product "${item.title}"?`)) {
                      deleteMutation.mutate(item.id);
                    }
                  }}
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                  title="Delete Product"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-lg">
                {editingProduct ? 'Edit Catalog Product' : 'Add New Catalog Product'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. A2 Desi Cow Milk 1L"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Price in INR (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="80.00"
                    value={priceInINR}
                    onChange={(e) => setPriceInINR(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    SKU Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="MILK-A2-1L"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Pure farm fresh A2 Desi Cow Milk delivered daily morning."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Product Image (Optional)
                  </label>
                  <label className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center">
                    <span>⚡ Upload & Compress (WebP)</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                <input
                  type="url"
                  placeholder="https://your-domain.com/product.jpg or click Upload above"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                {isUploading && (
                  <p className="text-[10px] text-purple-400 mt-1 animate-pulse">Compressing photo with Sharp.js...</p>
                )}
                {uploadStats && <p className="text-[10px] text-emerald-400 mt-1 font-mono">{uploadStats}</p>}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !title || !priceInINR}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
