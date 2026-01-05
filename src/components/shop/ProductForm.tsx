'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Product, ProductInput } from '@/types/shop';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';

interface ProductFormProps {
  initialData?: Product;
  isEdit?: boolean;
}

const CATEGORIES = ['Honning', 'Såpe', 'Bivoks', 'Tavlehonning', 'Gavepakker', 'Annet'];

export default function ProductForm({ initialData, isEdit = false }: ProductFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState<ProductInput>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    category: initialData?.category || 'Honning',
    stock: initialData?.stock || 0,
    image_url: initialData?.image_url || '',
    is_active: initialData?.is_active ?? true,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('Du må velge et bilde å laste opp.');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
    } catch (error) {
      alert('Feil ved opplasting av bilde!');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit && initialData) {
        const { error } = await supabase
          .from('products')
          .update(formData)
          .eq('id', initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([formData]);
        if (error) throw error;
      }

      router.push('/dashboard/admin/shop');
      router.refresh();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Kunne ikke lagre produktet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-3xl mx-auto">
      
      {/* Image Upload Section */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="w-full h-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative overflow-hidden group hover:border-green-500 transition-colors">
          {formData.image_url ? (
            <>
              <img 
                src={formData.image_url} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                  className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center p-6">
              {uploading ? (
                <Loader2 className="w-10 h-10 text-green-600 animate-spin mx-auto mb-2" />
              ) : (
                <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              )}
              <p className="text-sm text-gray-500 font-medium mb-1">Last opp produktbilde</p>
              <p className="text-xs text-gray-400">PNG, JPG opp til 5MB</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Produktnavn</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            placeholder="F.eks. Sommerhonning"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Kategori</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-white"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Pris (NOK)</label>
          <input
            type="number"
            required
            min="0"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Lagerbeholdning</label>
          <input
            type="number"
            required
            min="0"
            value={formData.stock}
            onChange={(e) => setFormData(prev => ({ ...prev, stock: Number(e.target.value) }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="col-span-full space-y-2">
          <label className="text-sm font-medium text-gray-700">Beskrivelse</label>
          <textarea
            required
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none"
            placeholder="Beskriv produktet..."
          />
        </div>

        <div className="col-span-full flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
            className="w-5 h-5 text-green-600 rounded focus:ring-green-500 border-gray-300"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
            Produktet er aktivt og synlig i butikken
          </label>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Lagrer...
            </>
          ) : (
            isEdit ? 'Oppdater produkt' : 'Opprett produkt'
          )}
        </button>
      </div>
    </form>
  );
}
