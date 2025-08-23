'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/components/auth/AuthContext';

interface ProductImage {
  url: string;
  alt: string; // Alt text will be used as color name
}

interface ProductOptionImage extends ProductImage {
  title?: string;
  description?: string;
  price?: number;
}

interface CustomOption {
  name: string;
  images: ProductOptionImage[];
}

interface SanityProduct {
  _id?: string;
  id?: string; // Keep for backward compatibility
  name: string;
  slug: string | { current: string };
  description: string;
  priceTier: string;
  styleInfo: string;
  mainImage: ProductImage;
  itemData: ProductImage[];
  frontColorImages: ProductImage[];
  leftColorImages: ProductImage[];
  rightColorImages: ProductImage[];
  backColorImages: ProductImage[];
  capColorImage: ProductImage[];
  splitColorOptions?: ProductImage[];
  triColorOptions?: ProductImage[];
  camoColorOption?: ProductImage[];
  // Custom product options
  customOptions?: CustomOption[];
  isActive: boolean;
  productType: 'factory' | 'resale';
  sellingPrice?: number;
  // Resale product specific fields
  shippingSource?: 'Factory' | 'Warehouse';
  productCategory?: 'Caps' | 'Shirts' | 'Beanies' | 'Other';
  customProductCategory?: string;
  qcHandler?: 'Factory' | '3rd Party' | 'Buyer';
  productReadiness?: string[]; // Can be 'Stock/Inventory', 'Customizable'
  sku?: string;
  stockQuantity?: number;
  inventoryLocation?: string;
  reorderPoint?: number;
  createdBy?: {
    userId: string;
    name: string;
    email: string;
    role?: string;
    company?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface UploadedImage {
  file: File;
  preview: string;
  alt: string;
}

export function ProductManagement() {
  const { user } = useAuth();
  const [products, setProducts] = useState<SanityProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SanityProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMigrationTool, setShowMigrationTool] = useState(false);
  const [migrationUser, setMigrationUser] = useState({ id: '', name: '', email: '' });
  const [migratingProduct, setMigratingProduct] = useState<string | null>(null);

  // File input refs
  const mainImageRef = useRef<HTMLInputElement>(null);
  const multipleImageRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // Helper function to safely set ref
  const setMultipleImageRef = useCallback((field: string) => (el: HTMLInputElement | null) => {
    if (el) {
      multipleImageRefs.current[field] = el;
    }
  }, []);
  
  // Function to add a new custom option
  const addCustomOption = () => {
    if (!customOptionInput.trim()) return;
    
    // Split by comma and trim each option
    const optionNames = customOptionInput.split(',').map(opt => opt.trim()).filter(opt => opt);
    
    // Add each option as a new custom option
    const newOptions = optionNames.map(name => ({
      name,
      images: []
    }));
    
    // Add to form data
    setFormData(prev => ({
      ...prev,
      customOptions: [...(prev.customOptions || []), ...newOptions]
    }));
    
    // Clear the input
    setCustomOptionInput('');
  };
  
  // Function to remove a custom option
  const removeCustomOption = (index: number) => {
    const updatedOptions = [...(formData.customOptions || [])];
    updatedOptions.splice(index, 1);
    setFormData({
      ...formData,
      customOptions: updatedOptions
    });
  };

  // Form state
  const [formData, setFormData] = useState<SanityProduct>({
    name: '',
    slug: '',
    description: '',
    priceTier: 'Tier 1',
    styleInfo: '',
    mainImage: { url: '', alt: '' },
    itemData: [],
    frontColorImages: [],
    leftColorImages: [],
    rightColorImages: [],
    backColorImages: [],
    capColorImage: [],
    splitColorOptions: [],
    triColorOptions: [],
    camoColorOption: [],
    customOptions: [],
    isActive: true,
    productType: 'factory',
    sellingPrice: 0,
    shippingSource: 'Factory',
    productCategory: 'Caps',
    customProductCategory: '',
    qcHandler: 'Factory',
    productReadiness: ['Customizable'],
    sku: '',
    stockQuantity: 0,
    inventoryLocation: '',
    reorderPoint: 0,
  });
  
  // State for custom option input
  const [customOptionInput, setCustomOptionInput] = useState('');
  
  // State for drag and drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  
  // State for input interaction (to disable dragging when editing text)
  const [inputInteracting, setInputInteracting] = useState<string | null>(null);

  // Upload state
  const [uploadedImages, setUploadedImages] = useState<{ [key: string]: UploadedImage[] }>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/sanity/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        
        console.error('Upload failed:', response.status, errorData);
        
        // Provide more specific error messages based on status code
        let errorMessage = 'Upload failed';
        if (response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (response.status === 400) {
          errorMessage = errorData.error || 'Invalid file or request';
        } else if (response.status === 500) {
          errorMessage = errorData.error || errorData.details || 'Server error occurred';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data.file || !data.file.url) {
        throw new Error('Invalid response from server');
      }
      
      return data.file.url;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const uploadMultipleImages = async (files: FileList, field: string): Promise<ProductImage[]> => {
    const uploadedImages: ProductImage[] = [];
    const totalFiles = files.length;
    
    setUploadingImages(true);
    setUploadProgress(0);

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      try {
        const url = await uploadImage(file);
        // Extract filename without extension and clean special characters
        const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
        let cleanFileName = fileNameWithoutExtension.replace(/[-_,.()\[\]{}!@#$%^&*+=]/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Remove unwanted text patterns
        cleanFileName = cleanFileName.replace(/\b(photoroom|FL|RS|LS|FS|BS|5pu|6p|6pf|back|front|left|right)\b/gi, '').replace(/\s+/g, ' ').trim();
        
        uploadedImages.push({
          url,
          alt: field === 'itemData' ? 'Item Data Image' : cleanFileName, // Auto-fill based on field type
        });
        setUploadProgress(((i + 1) / totalFiles) * 100);
      } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error(`Failed to upload ${file.name}`);
      }
    }

    setUploadingImages(false);
    setUploadProgress(0);
    return uploadedImages;
  };

  const handleMainImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImages(true);
      const url = await uploadImage(file);
      // Extract filename without extension and clean special characters
      const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
      let cleanFileName = fileNameWithoutExtension.replace(/[-_,.()\[\]{}!@#$%^&*+=]/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Remove unwanted text patterns
      cleanFileName = cleanFileName.replace(/\b(photoroom|FL|RS|LS|FS|BS|5pu|6p|6pf|back|front|left|right)\b/gi, '').replace(/\s+/g, ' ').trim();
      setFormData({
        ...formData,
        mainImage: { url, alt: 'Main Image' },
      });
    } catch (error) {
      setError('Failed to upload main image');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleMultipleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: string, optionIndex?: number) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 50) {
      setError('Maximum 50 images allowed per upload');
      return;
    }

    try {
      const uploadedImages = await uploadMultipleImages(files, field);
      console.log(`✅ Uploaded ${uploadedImages.length} images for ${field}:`, uploadedImages);
      
      // Handle custom option images
      if (optionIndex !== undefined && formData.customOptions) {
        const updatedOptions = [...formData.customOptions];
        const currentImages = updatedOptions[optionIndex].images || [];
        
        // Convert ProductImage to ProductOptionImage with empty fields
        const optionImages: ProductOptionImage[] = uploadedImages.map(img => ({
          ...img,
          title: '',
          description: '',
          price: 0
        }));
        
        updatedOptions[optionIndex].images = [...currentImages, ...optionImages];
        
        setFormData({
          ...formData,
          customOptions: updatedOptions
        });
      } else {
        // Regular image field handling
        const currentImages = formData[field as keyof SanityProduct] as ProductImage[] || [];
        const updatedImages = [...currentImages, ...uploadedImages];
        
        setFormData({
          ...formData,
          [field]: updatedImages,
        });
      }

      // Clear the input
      const inputRef = multipleImageRefs.current[field];
      if (inputRef && inputRef.value !== undefined) {
        inputRef.value = '';
      }
    } catch (error) {
      console.error('❌ Error in handleMultipleImageUpload:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload images');
    }
  };

  const handleAltTextChange = (field: string, index: number, alt: string, optionIndex?: number) => {
    if (optionIndex !== undefined && formData.customOptions) {
      // Handle custom option image alt text
      const updatedOptions = [...formData.customOptions];
      const currentImages = [...updatedOptions[optionIndex].images];
      currentImages[index] = { ...currentImages[index], alt };
      updatedOptions[optionIndex].images = currentImages;
      
      setFormData({
        ...formData,
        customOptions: updatedOptions
      });
    } else {
      // Regular image alt text handling
      const currentImages = formData[field as keyof SanityProduct] as ProductImage[] || [];
      const updatedImages = [...currentImages];
      updatedImages[index] = { ...updatedImages[index], alt };
      
      setFormData({
        ...formData,
        [field]: updatedImages,
      });
    }
  };
  
  // Functions to handle custom option image details
  const handleOptionImageTitleChange = (optionIndex: number, imageIndex: number, title: string) => {
    const updatedOptions = [...(formData.customOptions || [])];
    const currentImages = [...updatedOptions[optionIndex].images];
    currentImages[imageIndex] = { ...currentImages[imageIndex], title };
    updatedOptions[optionIndex].images = currentImages;
    
    setFormData({
      ...formData,
      customOptions: updatedOptions
    });
  };
  
  const handleOptionImageDescriptionChange = (optionIndex: number, imageIndex: number, description: string) => {
    const updatedOptions = [...(formData.customOptions || [])];
    const currentImages = [...updatedOptions[optionIndex].images];
    currentImages[imageIndex] = { ...currentImages[imageIndex], description };
    updatedOptions[optionIndex].images = currentImages;
    
    setFormData({
      ...formData,
      customOptions: updatedOptions
    });
  };
  
  const handleOptionImagePriceChange = (optionIndex: number, imageIndex: number, price: number) => {
    const updatedOptions = [...(formData.customOptions || [])];
    const currentImages = [...updatedOptions[optionIndex].images];
    currentImages[imageIndex] = { ...currentImages[imageIndex], price };
    updatedOptions[optionIndex].images = currentImages;
    
    setFormData({
      ...formData,
      customOptions: updatedOptions
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct 
        ? `/api/sanity/products/${editingProduct._id || editingProduct.id}`
        : '/api/sanity/products';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      // Enhanced user information handling for resale products
      if (user) {
        headers['x-user-id'] = user.id || '';
        headers['x-user-name'] = user.name || '';
        headers['x-user-email'] = user.email || '';
        
        // Add additional supplier information for resale products
        if (formData.productType === 'resale') {
          headers['x-user-role'] = user.role || '';
          headers['x-user-company'] = user.company || '';
        }
      }

      // Validate supplier information for resale products
      if (formData.productType === 'resale' && !user) {
        setError('User authentication required for resale products');
        setIsSaving(false);
        return;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchProducts();
        resetForm();
        setShowForm(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save product');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const convertHTMLToCleanText = (html: string): string => {
    if (!html) return '';
    return html
      .replace(/<p>/g, '')
      .replace(/<\/p>/g, '\n')
      .replace(/<br\s*\/?>/g, '\n')
      .trim();
  };

  const handleEdit = (product: SanityProduct) => {
    setEditingProduct(product);
    // Convert HTML styleInfo back to clean text for editing and fix slug format
    const productWithCleanText = {
      ...product,
      styleInfo: convertHTMLToCleanText(product.styleInfo),
      slug: typeof product.slug === 'string' ? product.slug : product.slug?.current || '',
    };
    setFormData(productWithCleanText);
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/sanity/products/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchProducts();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete product');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleMigrateProduct = async (productId: string) => {
    if (!migrationUser.id || !migrationUser.name || !migrationUser.email) {
      setError('Please fill in all user information');
      return;
    }

    setMigratingProduct(productId);
    try {
      const response = await fetch('/api/sanity/migrate-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          userId: migrationUser.id,
          userName: migrationUser.name,
          userEmail: migrationUser.email
        }),
      });

      if (response.ok) {
        await fetchProducts();
        setError(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to migrate product');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setMigratingProduct(null);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      priceTier: 'Tier 1',
      styleInfo: '',
      mainImage: { url: '', alt: '' },
      itemData: [],
      frontColorImages: [],
      leftColorImages: [],
      rightColorImages: [],
      backColorImages: [],
      capColorImage: [],
      splitColorOptions: [],
      triColorOptions: [],
      camoColorOption: [],
      customOptions: [],
      isActive: true,
      productType: 'factory',
      sellingPrice: 0,
      shippingSource: 'Factory',
      productCategory: 'Caps',
      customProductCategory: '',
      qcHandler: 'Factory',
      productReadiness: ['Customizable'],
      sku: '',
      stockQuantity: 0,
      inventoryLocation: '',
      reorderPoint: 0,
    });
    setUploadedImages({});
    setCustomOptionInput('');
  };

  const handleImageRemove = (field: keyof SanityProduct | string, index: number, optionIndex?: number) => {
    if (optionIndex !== undefined && formData.customOptions) {
      // Handle custom option image removal
      const updatedOptions = [...formData.customOptions];
      const currentImages = [...updatedOptions[optionIndex].images];
      currentImages.splice(index, 1);
      updatedOptions[optionIndex].images = currentImages;
      
      setFormData({
        ...formData,
        customOptions: updatedOptions
      });
    } else if (Array.isArray(formData[field as keyof SanityProduct])) {
      // Regular image removal
      const newImages = [...(formData[field as keyof SanityProduct] as ProductImage[])];
      newImages.splice(index, 1);
      setFormData({
        ...formData,
        [field]: newImages,
      });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Drag and drop handlers for image reordering
  const handleDragStart = (e: React.DragEvent, index: number, field: string) => {
    setDraggedIndex(index);
    setDraggedField(field);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number, field: string) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedField !== field || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDraggedField(null);
      return;
    }

    const currentImages = [...(formData[field as keyof SanityProduct] as ProductImage[])];
    const draggedImage = currentImages[draggedIndex];
    
    // Remove the dragged image from its original position
    currentImages.splice(draggedIndex, 1);
    
    // Insert the dragged image at the drop position
    currentImages.splice(dropIndex, 0, draggedImage);
    
    setFormData({
      ...formData,
      [field]: currentImages,
    });
    
    setDraggedIndex(null);
    setDraggedField(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedField(null);
  };

  // Drag and drop handlers for custom option images
  const handleCustomOptionDragStart = (e: React.DragEvent, imageIndex: number, optionIndex: number) => {
    setDraggedIndex(imageIndex);
    setDraggedField(`customOption-${optionIndex}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCustomOptionDrop = (e: React.DragEvent, dropIndex: number, optionIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedField !== `customOption-${optionIndex}` || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDraggedField(null);
      return;
    }

    const updatedOptions = [...(formData.customOptions || [])];
    const currentImages = [...updatedOptions[optionIndex].images];
    const draggedImage = currentImages[draggedIndex];
    
    // Remove the dragged image from its original position
    currentImages.splice(draggedIndex, 1);
    
    // Insert the dragged image at the drop position
    currentImages.splice(dropIndex, 0, draggedImage);
    
    updatedOptions[optionIndex].images = currentImages;
    
    setFormData({
      ...formData,
      customOptions: updatedOptions,
    });
    
    setDraggedIndex(null);
    setDraggedField(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-black to-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
                {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Migration Tool button */}
          <button
            onClick={() => setShowMigrationTool(!showMigrationTool)}
            className="inline-flex items-center px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all duration-200 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {showMigrationTool ? 'Hide' : 'Show'} Migration Tool
          </button>
          
          {/* Back to Products button - only show when editing */}
          {editingProduct && (
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="inline-flex items-center px-4 py-2 bg-gray-600/20 text-gray-400 border border-gray-500/30 rounded-lg hover:bg-gray-600/30 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Products
            </button>
          )}
          
          {/* Create New Product button */}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center px-6 py-3 bg-lime-400 text-black font-semibold rounded-lg hover:bg-lime-300 transition-all duration-200 shadow-[0_0_30px_rgba(163,230,53,0.3)] hover:shadow-[0_0_40px_rgba(163,230,53,0.4)]"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Product
          </button>
        </div>
      </div>

      {/* Migration Tool */}
      {showMigrationTool && (
        <div className="border border-blue-500/30 bg-blue-500/10 backdrop-blur-xl ring-1 ring-blue-500/5 shadow-lg rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Migrate Products with User Information</h3>
              <p className="text-slate-400 text-sm">Assign user information to existing products that show "System" as creator.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">User ID</label>
              <input
                type="text"
                value={migrationUser.id}
                onChange={(e) => setMigrationUser({ ...migrationUser, id: e.target.value })}
                className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                placeholder="Enter user ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">User Name</label>
              <input
                type="text"
                value={migrationUser.name}
                onChange={(e) => setMigrationUser({ ...migrationUser, name: e.target.value })}
                className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                placeholder="Enter user name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">User Email</label>
              <input
                type="email"
                value={migrationUser.email}
                onChange={(e) => setMigrationUser({ ...migrationUser, email: e.target.value })}
                className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                placeholder="Enter user email"
              />
            </div>
          </div>
          
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-400">
              <strong>Instructions:</strong> Fill in the user information above, then click "Migrate" on any product that shows "System" as the creator.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="border border-red-500/30 bg-red-500/10 backdrop-blur-xl ring-1 ring-red-500/5 shadow-lg rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-400">Error</h4>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}


      {/* Product Form */}
      {showForm && (
        <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg p-6">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-lime-500/20 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </h3>
              <p className="text-slate-400 text-sm">
                {editingProduct ? 'Update product information and settings' : 'Add a new product to your catalog'}
              </p>
            </div>
          </div>
          
          <div className="mb-6 border border-white/10 bg-white/5 p-6 rounded-lg">
            <h4 className="text-lg font-medium mb-4 text-white">Product Type</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ${formData.productType === 'factory' ? 'border-lime-400/50 bg-lime-400/10 shadow-[0_0_20px_rgba(163,230,53,0.15)]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <input
                  type="radio"
                  name="productType"
                  value="factory"
                  checked={formData.productType === 'factory'}
                  onChange={() => setFormData({ ...formData, productType: 'factory' })}
                  className="mr-3 text-lime-400 focus:ring-lime-400"
                />
                <div>
                  <span className="font-medium text-white">Factory Products</span>
                  <p className="text-sm text-slate-400 mt-1">Complete customizable products with all color options</p>
                </div>
              </label>
              
              <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ${formData.productType === 'resale' ? 'border-lime-400/50 bg-lime-400/10 shadow-[0_0_20px_rgba(163,230,53,0.15)]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <input
                  type="radio"
                  name="productType"
                  value="resale"
                  checked={formData.productType === 'resale'}
                  onChange={() => setFormData({ ...formData, productType: 'resale' })}
                  className="mr-3 text-lime-400 focus:ring-lime-400"
                />
                <div>
                  <span className="font-medium text-white">Resale Products</span>
                  <p className="text-sm text-slate-400 mt-1">Simplified product listing with fewer fields</p>
                </div>
              </label>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  required
                  className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={typeof formData.slug === 'string' ? formData.slug : formData.slug?.current || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Price Tier
                </label>
                <select
                  value={formData.priceTier}
                  onChange={(e) => setFormData({ ...formData, priceTier: e.target.value })}
                  className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                >
                  <option value="Tier 1">Tier 1</option>
                  <option value="Tier 2">Tier 2</option>
                  <option value="Tier 3">Tier 3</option>
                </select>
              </div>
              
              {formData.productType === 'resale' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Selling Price ($) *
                    </label>
                    <input
                      type="number"
                      value={formData.sellingPrice || ''}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                      required={formData.productType === 'resale'}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Shipping Source *
                    </label>
                    <select
                      value={formData.shippingSource}
                      onChange={(e) => setFormData({ ...formData, shippingSource: e.target.value as 'Factory' | 'Warehouse' })}
                      required={formData.productType === 'resale'}
                      className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                    >
                      <option value="Factory">Factory</option>
                      <option value="Warehouse">Warehouse</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Type of Product *
                    </label>
                    <select
                      value={formData.productCategory}
                      onChange={(e) => setFormData({ ...formData, productCategory: e.target.value as 'Caps' | 'Shirts' | 'Beanies' | 'Other' })}
                      required={formData.productType === 'resale'}
                      className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                    >
                      <option value="Caps">Caps</option>
                      <option value="Shirts">Shirts</option>
                      <option value="Beanies">Beanies</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  {formData.productCategory === 'Other' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Custom Product Type *
                      </label>
                      <input
                        type="text"
                        value={formData.customProductCategory}
                        onChange={(e) => setFormData({ ...formData, customProductCategory: e.target.value })}
                        required={formData.productType === 'resale' && formData.productCategory === 'Other'}
                        className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                        placeholder="Enter product type"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      QC Handler *
                    </label>
                    <select
                      value={formData.qcHandler}
                      onChange={(e) => setFormData({ ...formData, qcHandler: e.target.value as 'Factory' | '3rd Party' | 'Buyer' })}
                      required={formData.productType === 'resale'}
                      className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                    >
                      <option value="Factory">Factory</option>
                      <option value="3rd Party">3rd Party</option>
                      <option value="Buyer">Buyer</option>
                    </select>
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Product Readiness *
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.productReadiness?.includes('Stock/Inventory')}
                          onChange={(e) => {
                            const currentReadiness = [...(formData.productReadiness || [])];
                            if (e.target.checked) {
                              if (!currentReadiness.includes('Stock/Inventory')) {
                                currentReadiness.push('Stock/Inventory');
                              }
                            } else {
                              const index = currentReadiness.indexOf('Stock/Inventory');
                              if (index !== -1) {
                                currentReadiness.splice(index, 1);
                              }
                            }
                            setFormData({ ...formData, productReadiness: currentReadiness });
                          }}
                          className="h-4 w-4 text-lime-400 focus:ring-lime-400 border-white/20 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Stock/Inventory</span>
                      </label>
                      
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.productReadiness?.includes('Customizable')}
                          onChange={(e) => {
                            const currentReadiness = [...(formData.productReadiness || [])];
                            if (e.target.checked) {
                              if (!currentReadiness.includes('Customizable')) {
                                currentReadiness.push('Customizable');
                              }
                            } else {
                              const index = currentReadiness.indexOf('Customizable');
                              if (index !== -1) {
                                currentReadiness.splice(index, 1);
                              }
                            }
                            setFormData({ ...formData, productReadiness: currentReadiness });
                          }}
                          className="h-4 w-4 text-lime-400 focus:ring-lime-400 border-white/20 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Customizable</span>
                      </label>
                    </div>
                    {formData.productReadiness?.length === 0 && (
                      <p className="mt-1 text-sm text-red-500">Please select at least one option</p>
                    )}
                  </div>
                  
                  {/* Supplier Information Section */}
                  <div className="col-span-2 border border-lime-400/30 bg-lime-400/5 p-4 rounded-lg">
                    <h4 className="text-md font-medium mb-3 text-lime-400">Supplier Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Supplier Name
                        </label>
                        <input
                          type="text"
                          value={user?.name || ''}
                          disabled
                          className="w-full px-3 py-2 border border-white/10 bg-black/30 text-slate-400 rounded-lg"
                          placeholder="Current user name"
                        />
                        <p className="text-xs text-slate-500 mt-1">Automatically set to current user</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Supplier Email
                        </label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full px-3 py-2 border border-white/10 bg-black/30 text-slate-400 rounded-lg"
                          placeholder="Current user email"
                        />
                        <p className="text-xs text-slate-500 mt-1">Automatically set to current user</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Supplier Company
                        </label>
                        <input
                          type="text"
                          value={user?.company || ''}
                          disabled
                          className="w-full px-3 py-2 border border-white/10 bg-black/30 text-slate-400 rounded-lg"
                          placeholder="Company name"
                        />
                        <p className="text-xs text-slate-500 mt-1">From user profile</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Supplier Role
                        </label>
                        <input
                          type="text"
                          value={user?.role || ''}
                          disabled
                          className="w-full px-3 py-2 border border-white/10 bg-black/30 text-slate-400 rounded-lg"
                          placeholder="User role"
                        />
                        <p className="text-xs text-slate-500 mt-1">From user profile</p>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-sm text-blue-400">
                        <strong>Note:</strong> This product will be associated with your account as the supplier. 
                        All supplier information is automatically captured from your profile.
                      </p>
                    </div>
                  </div>
                  
                  {/* Inventory fields shown only when Stock/Inventory is selected */}
                  {formData.productReadiness?.includes('Stock/Inventory') && (
                    <div className="col-span-2 p-4 border border-gray-200 rounded-lg bg-gray-50 mt-4">
                      <h4 className="font-medium text-gray-700 mb-4">Inventory Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            SKU *
                          </label>
                          <input
                            type="text"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            required={formData.productReadiness?.includes('Stock/Inventory')}
                            className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                            placeholder="Enter SKU"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Stock Quantity *
                          </label>
                          <input
                            type="number"
                            value={formData.stockQuantity || ''}
                            onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                            required={formData.productReadiness?.includes('Stock/Inventory')}
                            min="0"
                            className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Inventory Location
                          </label>
                          <input
                            type="text"
                            value={formData.inventoryLocation}
                            onChange={(e) => setFormData({ ...formData, inventoryLocation: e.target.value })}
                            className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                            placeholder="Warehouse location, shelf, etc."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Reorder Point
                          </label>
                          <input
                            type="number"
                            value={formData.reorderPoint || ''}
                            onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                            placeholder="Minimum stock level before reordering"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                  className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

                         {/* Style Info (Clean Text) */}
             <div>
               <label className="block text-sm font-medium text-white mb-2">
                 Style Information
               </label>
               <textarea
                 value={formData.styleInfo}
                 onChange={(e) => setFormData({ ...formData, styleInfo: e.target.value })}
                 rows={4}
                 placeholder={`Shape: Flat
Profile: Mid
Closure: Snapback
Structure: Structured`}
                 className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
               />
               <p className="mt-1 text-sm text-slate-400">
                 Enter style details in a simple format. Each line will be converted to a paragraph automatically.
               </p>
             </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description (HTML)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
              />
            </div>

            {/* Main Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Image *
              </label>
              <div className="space-y-4">
                {/* Upload Button */}
                <div className="flex items-center space-x-4">
                  <input
                    ref={mainImageRef}
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageUpload}
                    className="hidden"
                  />
                                                                           <button
                      type="button"
                      onClick={() => {
                        if (mainImageRef.current && mainImageRef.current.click) {
                          mainImageRef.current.click();
                        }
                      }}
                      disabled={uploadingImages}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Main Image
                  </button>
                  <span className="text-sm text-slate-400">Upload a single image for the main product photo</span>
                </div>

                {/* Upload Progress for Main Image */}
                {uploadingImages && (
                  <div className="border border-blue-500/30 bg-blue-500/20 text-blue-400 px-4 py-3 rounded-lg mb-4">
                    <div className="flex items-center justify-between">
                      <span>Uploading image... {Math.round(uploadProgress)}%</span>
                      <div className="w-32 bg-blue-200/20 border border-blue-400/30 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                                 {/* Image Preview */}
                 {formData.mainImage.url && (
                   <div className="inline-block">
                     <div className="border border-white/10 bg-white/5 rounded-lg p-4 w-fit">
                       <div className="aspect-square w-32 h-32">
                         <img 
                           src={formData.mainImage.url} 
                           alt="Main image preview"
                           className="w-full h-full object-cover rounded-lg"
                         />
                       </div>
                       <p className="text-xs text-slate-400 text-center mt-2">Main Product Image</p>
                     </div>
                   </div>
                 )}
              </div>
            </div>

            {/* Custom Product Options */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-medium text-white mb-4">Custom Product Options</h3>
              <p className="text-sm text-slate-400 mb-4">
                Add custom product options with images, descriptions, and pricing. Maximum 10 options allowed.
              </p>
              
              {/* Input for adding new options */}
              <div className="flex items-end space-x-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-white mb-2">
                    Add Custom Option Categories
                  </label>
                  <input
                    type="text"
                    value={customOptionInput}
                    onChange={(e) => setCustomOptionInput(e.target.value)}
                    placeholder="Enter option names separated by commas (e.g., Size, Color, Material)"
                    className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                    disabled={(formData.customOptions || []).length >= 10}
                  />
                </div>
                <button
                  type="button"
                  onClick={addCustomOption}
                  disabled={(formData.customOptions || []).length >= 10 || !customOptionInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Add Option
                </button>
              </div>
              
              {/* List of added custom options */}
              {(formData.customOptions || []).length > 0 && (
                <div className="space-y-6 mb-6">
                  <h4 className="text-md font-medium text-white">Added Custom Options:</h4>
                  <div className="space-y-8">
                    {(formData.customOptions || []).map((option, optionIndex) => (
                      <div key={`option-${optionIndex}`} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                          <span className="font-medium text-gray-700">{option.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-400">{option.images.length} images</span>
                            <button
                              type="button"
                              onClick={() => removeCustomOption(optionIndex)}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* Image Uploader for this option */}
                        <div className="p-4">
                          <div className="flex items-center space-x-4 mb-4">
                            <input
                              ref={setMultipleImageRef(`customOption-${optionIndex}`)}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleMultipleImageUpload(e, `customOption-${optionIndex}`, optionIndex)}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const inputRef = multipleImageRefs.current[`customOption-${optionIndex}`];
                                if (inputRef && inputRef.click) {
                                  inputRef.click();
                                }
                              }}
                              disabled={uploadingImages}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              Upload Images for {option.name}
                            </button>
                            <span className="text-sm text-slate-400">Upload images for this option (Max 50)</span>
                          </div>
                          
                          {/* Upload Progress for Custom Options */}
                          {uploadingImages && (
                            <div className="border border-blue-500/30 bg-blue-500/20 text-blue-400 px-4 py-3 rounded-lg mb-4">
                              <div className="flex items-center justify-between">
                                <span>Uploading images... {Math.round(uploadProgress)}%</span>
                                <div className="w-32 bg-blue-200/20 border border-blue-400/30 rounded-full h-2">
                                  <div 
                                    className="bg-blue-400 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${uploadProgress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Display uploaded images for this option */}
                          {option.images.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {option.images.map((img, imgIndex) => {
                                const itemKey = `customOption-${optionIndex}-${imgIndex}`;
                                const isDraggingDisabled = inputInteracting === itemKey;
                                
                                return (
                                <div 
                                  key={`${option.name}-img-${imgIndex}`} 
                                  className={`relative group border border-white/10 bg-white/5 rounded-lg p-3 transition-all duration-200 ${
                                    isDraggingDisabled ? 'cursor-default' : 'cursor-move'
                                  } ${
                                    draggedIndex === imgIndex && draggedField === `customOption-${optionIndex}` ? 'opacity-50 scale-95' : 'hover:scale-105'
                                  }`}
                                  draggable={!isDraggingDisabled}
                                  onDragStart={(e) => {
                                    if (isDraggingDisabled) {
                                      e.preventDefault();
                                      return;
                                    }
                                    handleCustomOptionDragStart(e, imgIndex, optionIndex);
                                  }}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleCustomOptionDrop(e, imgIndex, optionIndex)}
                                  onDragEnd={handleDragEnd}
                                >
                                  {/* Drag handle indicator */}
                                  <div className="absolute top-1 left-1 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                  </div>
                                  
                                  <div className="flex items-start space-x-4">
                                    <div className="aspect-square w-24 h-24 flex-shrink-0">
                                      <img 
                                        src={img.url} 
                                        alt={img.alt || `${option.name} option ${imgIndex + 1}`}
                                        className="w-full h-full object-cover rounded-lg pointer-events-none"
                                      />
                                    </div>
                                    <div className="flex-1 space-y-3">
                                      <div
                                        onMouseEnter={(e) => {
                                          e.stopPropagation();
                                          setInputInteracting(itemKey);
                                        }}
                                        onMouseLeave={(e) => {
                                          e.stopPropagation();
                                          setInputInteracting(null);
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          setInputInteracting(itemKey);
                                        }}
                                        onDragStart={(e) => e.preventDefault()}
                                        draggable={false}
                                        className="relative z-20"
                                      >
                                        <label className="block text-sm font-medium text-white mb-1">
                                          Option Name/Color
                                        </label>
                                        <input
                                          type="text"
                                          value={img.alt}
                                          onChange={(e) => handleAltTextChange(`customOption-${optionIndex}`, imgIndex, e.target.value, optionIndex)}
                                          placeholder="e.g., Red, Large, Cotton"
                                          className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                                          onFocus={(e) => {
                                            e.stopPropagation();
                                            setInputInteracting(itemKey);
                                          }}
                                          onBlur={(e) => {
                                            e.stopPropagation();
                                            setInputInteracting(null);
                                          }}
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setInputInteracting(itemKey);
                                          }}
                                          onDragStart={(e) => e.preventDefault()}
                                          draggable={false}
                                        />
                                      </div>
                                      
                                      <div
                                        onMouseEnter={(e) => {
                                          e.stopPropagation();
                                          setInputInteracting(itemKey);
                                        }}
                                        onMouseLeave={(e) => {
                                          e.stopPropagation();
                                          setInputInteracting(null);
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          setInputInteracting(itemKey);
                                        }}
                                        onDragStart={(e) => e.preventDefault()}
                                        draggable={false}
                                        className="relative z-20"
                                      >
                                        <label className="block text-sm font-medium text-white mb-1">
                                          Option Title
                                        </label>
                                        <input
                                          type="text"
                                          value={img.title || ''}
                                          onChange={(e) => handleOptionImageTitleChange(optionIndex, imgIndex, e.target.value)}
                                          placeholder="e.g., Premium Red Color"
                                          className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                                          onFocus={(e) => {
                                            e.stopPropagation();
                                            setInputInteracting(itemKey);
                                          }}
                                          onBlur={(e) => {
                                            e.stopPropagation();
                                            setInputInteracting(null);
                                          }}
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setInputInteracting(itemKey);
                                          }}
                                          onDragStart={(e) => e.preventDefault()}
                                          draggable={false}
                                        />
                                      </div>
                                      
                                      <div
                                        onMouseEnter={(e) => {
                                          e.stopPropagation();
                                          setInputInteracting(itemKey);
                                        }}
                                        onMouseLeave={(e) => {
                                          e.stopPropagation();
                                          setInputInteracting(null);
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          setInputInteracting(itemKey);
                                        }}
                                        onDragStart={(e) => e.preventDefault()}
                                        draggable={false}
                                        className="relative z-20"
                                      >
                                        <label className="block text-sm font-medium text-white mb-1">
                                          Option Description
                                        </label>
                                        <input
                                          type="text"
                                          value={img.description || ''}
                                          onChange={(e) => handleOptionImageDescriptionChange(optionIndex, imgIndex, e.target.value)}
                                          placeholder="e.g., Vibrant red color with matte finish"
                                          className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                                          onFocus={(e) => {
                                            e.stopPropagation();
                                            setInputInteracting(itemKey);
                                          }}
                                          onBlur={(e) => {
                                            e.stopPropagation();
                                            setInputInteracting(null);
                                          }}
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setInputInteracting(itemKey);
                                          }}
                                          onDragStart={(e) => e.preventDefault()}
                                          draggable={false}
                                        />
                                      </div>
                                      
                                      <div
                                        onMouseEnter={(e) => {
                                          e.stopPropagation();
                                          setInputInteracting(itemKey);
                                        }}
                                        onMouseLeave={(e) => {
                                          e.stopPropagation();
                                          setInputInteracting(null);
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          setInputInteracting(itemKey);
                                        }}
                                        onDragStart={(e) => e.preventDefault()}
                                        draggable={false}
                                        className="relative z-20"
                                      >
                                        <label className="block text-sm font-medium text-white mb-1">
                                          Additional Price ($)
                                        </label>
                                        <input
                                          type="number"
                                          value={img.price || 0}
                                          onChange={(e) => handleOptionImagePriceChange(optionIndex, imgIndex, parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                          step="0.01"
                                          min="0"
                                          className="w-full px-3 py-2 border border-white/10 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                                          onFocus={(e) => {
                                            e.stopPropagation();
                                            setInputInteracting(itemKey);
                                          }}
                                          onBlur={(e) => {
                                            e.stopPropagation();
                                            setInputInteracting(null);
                                          }}
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setInputInteracting(itemKey);
                                          }}
                                          onDragStart={(e) => e.preventDefault()}
                                          draggable={false}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleImageRemove(`customOption-${optionIndex}`, imgIndex, optionIndex)}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-70 hover:opacity-100 transition-opacity z-10"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Multiple Image Galleries */}
            {[
              { field: 'itemData', label: 'Item Data Images', showFor: ['factory', 'resale'] },
              { field: 'frontColorImages', label: 'Front Color Images', showFor: ['factory'] },
              { field: 'leftColorImages', label: 'Left Color Images', showFor: ['factory'] },
              { field: 'rightColorImages', label: 'Right Color Images', showFor: ['factory'] },
              { field: 'backColorImages', label: 'Back Color Images', showFor: ['factory'] },
              { field: 'capColorImage', label: 'Cap Color Images', showFor: ['factory', 'resale'] },
              { field: 'splitColorOptions', label: 'Split Color Options', showFor: ['factory'] },
              { field: 'triColorOptions', label: 'Tri Color Options', showFor: ['factory'] },
              { field: 'camoColorOption', label: 'Camo Color Options', showFor: ['factory'] },
            ]
            .filter(({ showFor }) => showFor.includes(formData.productType))
            .map(({ field, label }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-white mb-2">
                  {label}
                </label>
                
                {/* Upload Button */}
                <div className="flex items-center space-x-4 mb-4">
                  <input
                    ref={setMultipleImageRef(field)}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleMultipleImageUpload(e, field)}
                    className="hidden"
                  />
                                     <button
                     type="button"
                     onClick={() => {
                       const inputRef = multipleImageRefs.current[field];
                       if (inputRef && inputRef.click) {
                         inputRef.click();
                       }
                     }}
                     disabled={uploadingImages}
                     className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                   >
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Images (Max 50)
                  </button>
                  <span className="text-sm text-slate-400">Upload multiple images for color variations</span>
                </div>
                
                {/* Upload Progress - Moved above uploader */}
                {uploadingImages && (
                  <div className="border border-blue-500/30 bg-blue-500/20 text-blue-400 px-4 py-3 rounded-lg mb-4">
                    <div className="flex items-center justify-between">
                      <span>Uploading images... {Math.round(uploadProgress)}%</span>
                      <div className="w-32 bg-blue-200/20 border border-blue-400/30 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                
                                 {/* Existing Images */}
                 {(formData[field as keyof SanityProduct] as ProductImage[])?.length > 0 && (
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                     {(formData[field as keyof SanityProduct] as ProductImage[]).map((img, index) => {
                       const itemKey = `${field}-${index}`;
                       const isDraggingDisabled = inputInteracting === itemKey;
                       
                       return (
                       <div 
                         key={`${field}-${index}-${img.url}`} 
                         className={`relative group border border-white/10 bg-white/5 rounded-lg p-2 transition-all duration-200 ${
                           isDraggingDisabled ? 'cursor-default' : 'cursor-move'
                         } ${
                           draggedIndex === index && draggedField === field ? 'opacity-50 scale-95' : 'hover:scale-105'
                         }`}
                         draggable={!isDraggingDisabled}
                         onDragStart={(e) => {
                           if (isDraggingDisabled) {
                             e.preventDefault();
                             return;
                           }
                           handleDragStart(e, index, field);
                         }}
                         onDragOver={handleDragOver}
                         onDrop={(e) => handleDrop(e, index, field)}
                         onDragEnd={handleDragEnd}
                       >
                         {/* Drag handle indicator */}
                         <div className="absolute top-1 left-1 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                           </svg>
                         </div>
                         
                         <div className="aspect-square w-full mb-2">
                           <img 
                             src={img.url} 
                             alt={img.alt || `${label} ${index + 1}`}
                             className="w-full h-full object-cover rounded-lg pointer-events-none"
                           />
                         </div>
                         {/* Show Alt Text input only for non-itemData fields */}
                         {field !== 'itemData' && (
                           <div 
                             className="relative z-20"
                             onMouseEnter={(e) => {
                               e.stopPropagation();
                               setInputInteracting(itemKey);
                             }}
                             onMouseLeave={(e) => {
                               e.stopPropagation();
                               setInputInteracting(null);
                             }}
                             onMouseDown={(e) => {
                               e.stopPropagation();
                               setInputInteracting(itemKey);
                             }}
                             onDragStart={(e) => e.preventDefault()}
                             draggable={false}
                           >
                             <input
                               type="text"
                               value={img.alt}
                               onChange={(e) => handleAltTextChange(field, index, e.target.value)}
                               placeholder="Color name"
                               className="w-full text-xs px-2 py-1 border border-white/10 bg-black/30 text-white rounded focus:ring-1 focus:ring-lime-400 focus:border-lime-400"
                               onFocus={(e) => {
                                 e.stopPropagation();
                                 setInputInteracting(itemKey);
                               }}
                               onBlur={(e) => {
                                 e.stopPropagation();
                                 setInputInteracting(null);
                               }}
                               onMouseDown={(e) => {
                                 e.stopPropagation();
                                 setInputInteracting(itemKey);
                               }}
                               onDragStart={(e) => e.preventDefault()}
                               draggable={false}
                             />
                           </div>
                         )}
                         <button
                           type="button"
                           onClick={() => handleImageRemove(field as keyof SanityProduct, index)}
                           className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                         >
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                           </svg>
                         </button>
                       </div>
                       );
                     })}
                   </div>
                 )}
              </div>
            ))}

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-white/10 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || uploadingImages}
                className="px-6 py-2 bg-lime-400 text-black rounded-lg hover:bg-lime-300 transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(163,230,53,0.25)]"
              >
                {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      {!showForm && (
        <div className="border border-white/10 bg-white/5 backdrop-blur-xl ring-1 ring-white/5 shadow-lg rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-lime-400 mx-auto"></div>
              <p className="mt-6 text-slate-300 text-lg">Loading products...</p>
              <p className="text-slate-500 text-sm">Please wait while we fetch your product catalog</p>
            </div>
          ) : products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="border border-white/10 bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Price Tier
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Colors
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="relative px-6 py-4">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {products.map((product) => (
                    <tr key={product._id || product.id || `${product.name}-${product.slug}`} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            {product.mainImage?.url ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={product.mainImage.url}
                                alt={product.name}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">
                              {product.name}
                            </div>
                            <div className="text-sm text-slate-400">
                              /{typeof product.slug === 'string' ? product.slug : product.slug?.current || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${product.productType === 'factory' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'}`}>
                          {product.productType === 'factory' ? 'Factory' : 'Resale'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {product.priceTier}
                          {product.productType === 'resale' && product.sellingPrice ? ` ($${product.sellingPrice})` : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                          product.isActive 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                            : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {product.frontColorImages?.length || 0} colors
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {product.createdBy ? (
                          <div>
                            <div className="font-medium text-white">{product.createdBy.name}</div>
                            <div className="text-xs text-slate-500">{product.createdBy.email}</div>
                            {product.createdBy.company && (
                              <div className="text-xs text-blue-400">{product.createdBy.company}</div>
                            )}
                            {product.createdBy.role && (
                              <div className="text-xs text-purple-400">{product.createdBy.role}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">System</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-lime-400 hover:text-lime-300 mr-4"
                        >
                          Edit
                        </button>
                        {!product.createdBy && showMigrationTool && (
                          <button
                            onClick={() => {
                              const productId = product._id || product.id;
                              if (productId) handleMigrateProduct(productId);
                            }}
                            disabled={migratingProduct === (product._id || product.id)}
                            className="text-blue-400 hover:text-blue-300 mr-4 disabled:opacity-50"
                          >
                            {migratingProduct === (product._id || product.id) ? 'Migrating...' : 'Migrate'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const productId = product._id || product.id;
                            if (productId) handleDelete(productId);
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-8 py-16 text-center">
              <div className="w-20 h-20 bg-slate-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No products found</h3>
              <p className="text-slate-400 mb-6">Get started by creating your first product</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="inline-flex items-center px-6 py-3 bg-lime-400 text-black font-semibold rounded-lg hover:bg-lime-300 transition-all duration-200 shadow-[0_0_30px_rgba(163,230,53,0.3)]"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your First Product
              </button>
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
