'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/components/auth/AuthContext';
import { 
  exportProductsToCSV, 
  importProductsFromCSV, 
  validateCSVFile, 
  downloadCSVTemplate,
  previewCSVFile,
  type CSVImportResult 
} from '@/lib/csv-utils';

interface ProductImage {
 url: string;
 alt: string; // Alt text will be used as color name
}

interface ProductOptionImage extends ProductImage {
 title?: string;
 description?: string;
 price?: number;
}

interface TextOption {
 label: string;
 price?: number;
}

interface CustomOption {
 name: string;
 type: 'text' | 'image';
 images: ProductOptionImage[];
 textOptions?: TextOption[];
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
 // New fields for alternative color input methods
 capColorNames?: string; // Comma-separated color names for text input
 referenceProductId?: string; // ID of factory product to reference for colors
 splitColorOptions?: ProductImage[];
 triColorOptions?: ProductImage[];
 camoColorOption?: ProductImage[];
 // Custom product options
 customOptions?: CustomOption[];
 // Cap Style Setup fields
 billShape?: 'Slight Curved' | 'Curved' | 'Flat';
 profile?: 'High' | 'Mid' | 'Low';
 closureType?: 'Snapback' | 'Velcro' | 'Fitted' | 'Stretched';
 structure?: 'Structured' | 'Unstructured' | 'Foam';
 fabricSetup?: string;
 customFabricSetup?: string; // For "Other" option
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
 supplierPhoto?: ProductImage; // Profile photo that displays as Brand Image on Store Page
 categoryTags?: string[]; // Category/Tag for Store Page filters
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
 
 // CSV Import/Export state
 const [showCSVOptions, setShowCSVOptions] = useState(false);
 const [csvImporting, setCsvImporting] = useState(false);
 const [csvExporting, setCsvExporting] = useState(false);
 const [csvFile, setCsvFile] = useState<File | null>(null);
 const [csvPreview, setCsvPreview] = useState<{
   headers: string[];
   rows: string[][];
   totalRows: number;
 } | null>(null);
 const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
 const csvFileInputRef = useRef<HTMLInputElement>(null);

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
 const addCustomOption = (optionType: 'text' | 'image' = 'image') => {
  if (!customOptionInput.trim()) return;
  
  // Split by comma and trim each option
  const optionNames = customOptionInput.split(',').map(opt => opt.trim()).filter(opt => opt);
  
  // Add each option as a new custom option
  const newOptions = optionNames.map(name => ({
   name,
   type: optionType,
   images: [],
   textOptions: optionType === 'text' ? [] : undefined
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

 // Functions to manage text options
 const addTextOption = (optionIndex: number, label: string, price?: number) => {
  const updatedOptions = [...(formData.customOptions || [])];
  const textOptions = updatedOptions[optionIndex].textOptions || [];
  
  updatedOptions[optionIndex].textOptions = [
   ...textOptions, 
   { label, price: price && price > 0 ? price : undefined }
  ];
  
  setFormData({
   ...formData,
   customOptions: updatedOptions
  });
 };

 const removeTextOption = (optionIndex: number, textIndex: number) => {
  const updatedOptions = [...(formData.customOptions || [])];
  const textOptions = [...(updatedOptions[optionIndex].textOptions || [])];
  textOptions.splice(textIndex, 1);
  updatedOptions[optionIndex].textOptions = textOptions;
  
  setFormData({
   ...formData,
   customOptions: updatedOptions
  });
 };

 const updateTextOption = (optionIndex: number, textIndex: number, field: 'label' | 'price', value: string | number) => {
  const updatedOptions = [...(formData.customOptions || [])];
  const textOptions = [...(updatedOptions[optionIndex].textOptions || [])];
  textOptions[textIndex] = {
   ...textOptions[textIndex],
   [field]: field === 'price' ? (Number(value) > 0 ? Number(value) : undefined) : value
  };
  updatedOptions[optionIndex].textOptions = textOptions;
  
  setFormData({
   ...formData,
   customOptions: updatedOptions
  });
 };

 // Category tags input state (separate from formData for better UX)
 const [categoryTagsInput, setCategoryTagsInput] = useState<string>('');

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
  capColorNames: '',
  referenceProductId: '',
  splitColorOptions: [],
  triColorOptions: [],
  camoColorOption: [],
  customOptions: [],
  billShape: undefined,
  profile: undefined,
  closureType: undefined,
  structure: undefined,
  fabricSetup: undefined,
  customFabricSetup: '',
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
  supplierPhoto: { url: '', alt: '' },
  categoryTags: [],
 });
 
 // State for custom option input
 const [customOptionInput, setCustomOptionInput] = useState('');


 // Cap Style Setup options
 const FABRIC_OPTIONS = [
  'Chino Twill/Trucker Mesh',
  'Chino Twill',
  'Cotton Polyester Mix',
  'Acrylic',
  'Polyester',
  'Ripstop',
  'Denim',
  'Suede Cotton',
  'Genuine Leather',
  'PU Leather',
  'Camo',
  'Spandex',
  'Cotton Corduroy',
  'Ribbed Corduroy',
  'Polyester 97% Spandex 3%',
  '100% Polyester Jersey',
  'Canvas',
  'Cotton Polyester Mix/Trucker Mesh',
  'Chino Twill/Air Mesh',
  'Cotton Polyester Mix/Air Mesh',
  'Polyester/Laser Cut',
  'Cotton Polyester Mix/Laser Cut',
  'Other'
 ];

 // Premium fabrics from CSV that add cost (matching CSV data)
 const PREMIUM_FABRICS = [
  'Suede Cotton',
  'Acrylic', 
  'Air Mesh',
  'Camo',
  'Genuine Leather',
  'Laser Cut'
 ];

 // Check if a fabric is premium and add cost
 const isPremiumFabric = (fabricName: string) => {
  if (!fabricName) return false;
  return PREMIUM_FABRICS.some(premium => {
   // Check if the fabric name contains the premium fabric name
   return fabricName.toLowerCase().includes(premium.toLowerCase());
  });
 };
 
 // State for text option inputs (per option)
 const [textOptionInputs, setTextOptionInputs] = useState<{ [optionIndex: number]: { label: string; price: string } }>({});
 
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


 // Debug effect to track formData changes
 useEffect(() => {
  if (formData.name) { // Only log when we have actual form data
   console.log('📊 Form Data Changed:', {
    productName: formData.name,
    referenceProductId: formData.referenceProductId,
    hasCapColorImages: formData.capColorImage?.length > 0,
    capColorNames: formData.capColorNames
   });
  }
 }, [formData.referenceProductId, formData.capColorImage, formData.capColorNames, formData.name]);

 const fetchProducts = async () => {
  try {
   const response = await fetch('/api/sanity/products');
   if (response.ok) {
    const data = await response.json();
    setProducts(data.products || []);
    
    // Debug log to see what products were fetched and their referenceProductId values
    console.log('📥 Fetched Products Debug:', 
     data.products.map((p: any) => ({
      name: p.name,
      id: p._id || p.id,
      productType: p.productType,
      referenceProductId: p.referenceProductId
     }))
    );
   }
  } catch (error) {
   console.error('Error fetching products:', error);
   setError('Failed to fetch products');
  } finally {
   setIsLoading(false);
  }
 };

 // Upload image to Sanity and return the asset reference
 const uploadImageToSanity = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
   const response = await fetch('/api/sanity/upload', {
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

    console.error('Sanity upload failed:', response.status, errorData);

    let errorMessage = 'Upload failed';
    if (response.status === 401) {
     errorMessage = 'Authentication required. Please log in again.';
    } else if (response.status === 403) {
     errorMessage = 'Admin access required for product uploads.';
    } else if (response.status === 400) {
     errorMessage = errorData.error || 'Invalid file or request';
    } else if (response.status === 500) {
     errorMessage = errorData.error || errorData.details || 'Server error occurred';
    }

    throw new Error(errorMessage);
   }

   const data = await response.json();
   if (!data.asset) {
    throw new Error('Invalid response from server');
   }

   return data.asset; // Return the Sanity asset reference
  } catch (error) {
   console.error('Sanity upload error:', error);
   throw error;
  }
 };

 // Legacy function for backward compatibility - now uses Sanity
 const uploadImage = async (file: File): Promise<string> => {
  const asset = await uploadImageToSanity(file);
  return asset.url || ''; // Return URL for immediate display
 };

 const uploadMultipleImages = async (files: FileList, field: string): Promise<ProductImage[]> => {
  const uploadedImages: ProductImage[] = [];
  const totalFiles = files.length;
  
  setUploadingImages(true);
  setUploadProgress(0);

  for (let i = 0; i < totalFiles; i++) {
   const file = files[i];
   try {
    const asset = await uploadImageToSanity(file);
    // Extract filename without extension and clean special characters
    const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
    let cleanFileName = fileNameWithoutExtension.replace(/[-_,.()\[\]{}!@#$%^&*+=]/g, ' ').replace(/\s+/g, ' ').trim();

    // Remove unwanted text patterns
    cleanFileName = cleanFileName.replace(/\b(photoroom|FL|RS|LS|FS|BS|5pu|6p|6pf|back|front|left|right)\b/gi, '').replace(/\s+/g, ' ').trim();

    uploadedImages.push({
     ...asset,
     url: asset.url || '', // Keep URL for display
     alt: field === 'itemData' ? 'Item Data Image' : (cleanFileName || 'Product Image'), // Auto-fill based on field type
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
   const asset = await uploadImageToSanity(file);

   // Extract filename without extension and clean special characters
   const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
   let cleanFileName = fileNameWithoutExtension.replace(/[-_,.()\[\]{}!@#$%^&*+=]/g, ' ').replace(/\s+/g, ' ').trim();

   // Remove unwanted text patterns
   cleanFileName = cleanFileName.replace(/\b(photoroom|FL|RS|LS|FS|BS|5pu|6p|6pf|back|front|left|right)\b/gi, '').replace(/\s+/g, ' ').trim();

   // Store as Sanity asset reference, but keep URL for display
   setFormData({
    ...formData,
    mainImage: {
     ...asset,
     alt: cleanFileName || 'Main Image',
     url: asset.url || '', // Keep URL for immediate display
    },
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

  // Debug log to track form submission
  console.log('📤 Form Submission Debug:', {
   productName: formData.name,
   referenceProductId: formData.referenceProductId,
   capColorImage: formData.capColorImage?.length || 0,
   capColorNames: formData.capColorNames,
   isEdit: !!editingProduct,
   // Cap Style Setup fields
   billShape: formData.billShape,
   profile: formData.profile,
   closureType: formData.closureType,
   structure: formData.structure,
   fabricSetup: formData.fabricSetup,
   customFabricSetup: formData.customFabricSetup
  });

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
     headers['x-user-role'] = user.customerRole || '';
     headers['x-user-company'] = user.company || '';
    }
   }

   // Validate supplier information for resale products
   if (formData.productType === 'resale' && !user) {
    setError('User authentication required for resale products');
    setIsSaving(false);
    return;
   }

   // Debug log complete formData being sent
   console.log('🚀 Complete FormData being sent:', formData);

   const response = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(formData),
   });

   // Debug log API response
   const data = await response.json();
   console.log('🔄 API Response Debug:', {
    responseOk: response.ok,
    status: response.status,
    responseData: data
   });
   
   // Separate log for debug info to see it clearly
   if (data.debug) {
    console.log('🔍 API Debug Details:', {
     receivedReferenceProductId: data.debug.receivedReferenceProductId,
     updateDataReferenceProductId: data.debug.updateDataReferenceProductId,
     finalReferenceProductId: data.debug.finalReferenceProductId
    });
   }

   if (response.ok) {
    await fetchProducts();
    resetForm();
    setShowForm(false);
   } else {
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
   // Ensure referenceProductId is properly preserved
   referenceProductId: product.referenceProductId || '',
  };
  
  // Debug log to track referenceProductId preservation
  console.log('🔧 Edit Product Debug:', {
   productName: product.name,
   originalReferenceProductId: product.referenceProductId,
   cleanedReferenceProductId: productWithCleanText.referenceProductId,
   // Cap Style Setup fields from loaded product
   capStyleFields: {
    billShape: product.billShape,
    profile: product.profile,
    closureType: product.closureType,
    structure: product.structure,
    fabricSetup: product.fabricSetup,
    customFabricSetup: product.customFabricSetup
   },
   fullProductData: product
  });
  
  setFormData(productWithCleanText);
  
  // Debug log to confirm Cap Style values were set in formData
  console.log('✅ FormData after setFormData:', {
   billShape: productWithCleanText.billShape,
   profile: productWithCleanText.profile,
   closureType: productWithCleanText.closureType,
   structure: productWithCleanText.structure,
   fabricSetup: productWithCleanText.fabricSetup,
   customFabricSetup: productWithCleanText.customFabricSetup
  });
  
  // Initialize category tags input with existing tags
  setCategoryTagsInput((productWithCleanText.categoryTags || []).join(', '));
  
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

 // CSV Import/Export handlers
 const handleCSVExport = async (productType?: 'factory' | 'resale') => {
  try {
   setCsvExporting(true);
   await exportProductsToCSV({ productType });
   setError(null);
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Failed to export products');
  } finally {
   setCsvExporting(false);
  }
 };

 const handleCSVFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  const validation = validateCSVFile(file);
  if (!validation.valid) {
   setError(validation.error || 'Invalid CSV file');
   return;
  }
  
  try {
   setCsvFile(file);
   const preview = await previewCSVFile(file);
   setCsvPreview(preview);
   setError(null);
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Failed to preview CSV file');
  }
 };

 const handleCSVImport = async () => {
  if (!csvFile || !user) return;
  
  try {
   setCsvImporting(true);
   const userInfo = {
    userId: user.id,
    userName: user.name || user.email,
    userEmail: user.email,
    userRole: user.customerRole,
    userCompany: user.company
   };
   
   const result = await importProductsFromCSV(csvFile, userInfo);
   setImportResult(result);
   
   if (result.success && result.imported > 0) {
    // Refresh products list
    await fetchProducts();
    // Reset CSV state
    setCsvFile(null);
    setCsvPreview(null);
    setShowCSVOptions(false);
   }
   
   setError(null);
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Failed to import products');
  } finally {
   setCsvImporting(false);
  }
 };

 const handleDownloadTemplate = (productType: 'factory' | 'resale') => {
  downloadCSVTemplate(productType);
 };

 const resetCSVState = () => {
  setCsvFile(null);
  setCsvPreview(null);
  setImportResult(null);
  setShowCSVOptions(false);
  if (csvFileInputRef.current) {
   csvFileInputRef.current.value = '';
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
   capColorNames: '',
   referenceProductId: '',
   splitColorOptions: [],
   triColorOptions: [],
   camoColorOption: [],
   customOptions: [],
   billShape: undefined,
   profile: undefined,
   closureType: undefined,
   structure: undefined,
   fabricSetup: undefined,
   customFabricSetup: '',
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
   supplierPhoto: { url: '', alt: '' },
   categoryTags: [],
  });
  setUploadedImages({});
  setCustomOptionInput('');
  setCategoryTagsInput(''); // Reset category tags input
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
  <div>
      {/* Action Buttons Section */}
      <section className="px-6 md:px-10">
       <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
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

         {/* CSV Import/Export button */}
         <button
          onClick={() => setShowCSVOptions(!showCSVOptions)}
          className="inline-flex items-center px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500 rounded-lg hover:bg-orange-600 transition-all duration-200 shadow-[0_0_20px_rgba(234,88,12,0.15)]"
         >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          CSV Tools
         </button>
        </div>
        
        {/* Right side - Migration Tool and Back to Products buttons */}
        <div className="flex items-center space-x-3">
         {/* Migration Tool button */}
         <button
          onClick={() => setShowMigrationTool(!showMigrationTool)}
          className="inline-flex items-center px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500 rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
         >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {showMigrationTool ? 'Hide' : 'Show'} Migration Tool
         </button>
         
         <button
          onClick={() => {
           setShowForm(false);
           resetForm();
          }}
          className="inline-flex items-center px-4 py-2 bg-stone-800/50 backdrop-blur-sm border border-stone-600/50 text-white rounded-xl hover:bg-stone-700/60 hover:border-stone-500/60 transition-all duration-200 shadow-lg font-medium"
         >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Products
         </button>

         {/* Update/Create Product button */}
         {showForm && (
          <button
           onClick={(e) => {
            e.preventDefault();
            const form = document.querySelector('form');
            if (form) {
             form.dispatchEvent(new Event('submit', { bubbles: true }));
            }
           }}
           disabled={isSaving || uploadingImages}
           className="inline-flex items-center px-6 py-3 bg-lime-400 text-black font-semibold rounded-lg hover:bg-lime-300 transition-all duration-200 shadow-[0_0_30px_rgba(163,230,53,0.3)] hover:shadow-[0_0_40px_rgba(163,230,53,0.4)] disabled:opacity-50"
          >
           <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
           </svg>
           {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
          </button>
         )}
        </div>
       </div>
      </section>

      {/* Migration Tool */}
      {showMigrationTool && (
       <section className="px-6 md:px-10">
        <div className="border border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/5 shadow-lg rounded-lg p-6">
      <div className="flex items-center mb-6">
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
     
     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div>
       <label className="block text-sm font-medium text-slate-300 mb-2">User ID</label>
       <input
        type="text"
        value={migrationUser.id}
        onChange={(e) => setMigrationUser({ ...migrationUser, id: e.target.value })}
        className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
        placeholder="Enter user ID"
       />
      </div>
      <div>
       <label className="block text-sm font-medium text-slate-300 mb-2">User Name</label>
       <input
        type="text"
        value={migrationUser.name}
        onChange={(e) => setMigrationUser({ ...migrationUser, name: e.target.value })}
        className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
        placeholder="Enter user name"
       />
      </div>
      <div>
       <label className="block text-sm font-medium text-slate-300 mb-2">User Email</label>
       <input
        type="email"
        value={migrationUser.email}
        onChange={(e) => setMigrationUser({ ...migrationUser, email: e.target.value })}
        className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
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
       </section>
      )}

      {/* CSV Import/Export Tool */}
      {showCSVOptions && (
       <section className="px-6 md:px-10">
        <div className="border border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/5 shadow-lg rounded-lg p-6">
         <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center mr-3">
           <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
           </svg>
          </div>
          <div>
           <h3 className="text-lg font-medium text-orange-400">CSV Import/Export Tools</h3>
           <p className="text-sm text-orange-300">Import and export products using CSV files</p>
          </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Section */}
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
           <h4 className="text-md font-medium text-orange-400 mb-4">Export Products</h4>
           <div className="space-y-3">
            <button
             onClick={() => handleCSVExport()}
             disabled={csvExporting}
             className="w-full inline-flex items-center justify-center px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500 rounded-lg hover:bg-orange-600 transition-all duration-200 disabled:opacity-50"
            >
             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
             </svg>
             {csvExporting ? 'Exporting...' : 'Export All Products'}
            </button>
            
            <button
             onClick={() => handleCSVExport('factory')}
             disabled={csvExporting}
             className="w-full inline-flex items-center justify-center px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500 rounded-lg hover:bg-orange-600 transition-all duration-200 disabled:opacity-50"
            >
             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
             </svg>
             {csvExporting ? 'Exporting...' : 'Export Factory Products'}
            </button>
            
            <button
             onClick={() => handleCSVExport('resale')}
             disabled={csvExporting}
             className="w-full inline-flex items-center justify-center px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500 rounded-lg hover:bg-orange-600 transition-all duration-200 disabled:opacity-50"
            >
             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
             </svg>
             {csvExporting ? 'Exporting...' : 'Export Resale Products'}
            </button>
           </div>
          </div>

          {/* Import Section */}
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
           <h4 className="text-md font-medium text-orange-400 mb-4">Import Products</h4>
           <div className="space-y-3">
            {/* Template Downloads */}
            <div className="mb-4">
             <p className="text-sm text-orange-300 mb-2">Download templates:</p>
             <div className="flex space-x-2">
              <button
               onClick={() => handleDownloadTemplate('factory')}
               className="text-xs px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded hover:bg-orange-500/20 transition-all duration-200"
              >
               Factory Template
              </button>
              <button
               onClick={() => handleDownloadTemplate('resale')}
               className="text-xs px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded hover:bg-orange-500/20 transition-all duration-200"
              >
               Resale Template
              </button>
             </div>
            </div>

            {/* File Input */}
            <input
             type="file"
             ref={csvFileInputRef}
             accept=".csv"
             onChange={handleCSVFileSelect}
             className="hidden"
            />
            
            <button
             onClick={() => csvFileInputRef.current?.click()}
             className="w-full inline-flex items-center justify-center px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500 rounded-lg hover:bg-orange-600 transition-all duration-200"
            >
             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
             </svg>
             Select CSV File
            </button>

            {csvFile && (
             <div className="text-sm text-orange-300">
              <p>Selected: {csvFile.name}</p>
              <p>Size: {(csvFile.size / 1024).toFixed(1)} KB</p>
             </div>
            )}

            {csvPreview && (
             <div className="mt-4">
              <h5 className="text-sm font-medium text-orange-400 mb-2">Preview ({csvPreview.totalRows} rows):</h5>
              <div className="bg-black/20 border border-orange-500/20 rounded p-2 overflow-x-auto">
               <div className="text-xs text-orange-300">
                <div className="font-medium mb-1">Headers: {csvPreview.headers.join(', ')}</div>
                {csvPreview.rows.slice(0, 3).map((row, i) => (
                 <div key={i} className="truncate">Row {i + 1}: {row.slice(0, 3).join(', ')}...</div>
                ))}
               </div>
              </div>
             </div>
            )}

            {csvFile && (
             <button
              onClick={handleCSVImport}
              disabled={csvImporting}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-lime-500/20 text-lime-400 border border-lime-500 rounded-lg hover:bg-lime-600 transition-all duration-200 disabled:opacity-50"
             >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {csvImporting ? 'Importing...' : 'Import Products'}
             </button>
            )}
           </div>
          </div>
         </div>

         {/* Import Results */}
         {importResult && (
          <div className="mt-6 p-4 bg-lime-500/10 border border-lime-500/20 rounded-lg">
           <h5 className="text-sm font-medium text-lime-400 mb-2">Import Results</h5>
           <div className="text-sm text-lime-300">
            <p>{importResult.message}</p>
            <p>Imported: {importResult.imported} products</p>
            {importResult.errors > 0 && (
             <div className="mt-2">
              <p className="text-red-400">Errors: {importResult.errors}</p>
              <ul className="text-xs text-red-300 mt-1">
               {importResult.errorDetails.slice(0, 5).map((error, i) => (
                <li key={i}>• {error}</li>
               ))}
               {importResult.errorDetails.length > 5 && (
                <li>• ... and {importResult.errorDetails.length - 5} more</li>
               )}
              </ul>
             </div>
            )}
           </div>
           <button
            onClick={resetCSVState}
            className="mt-3 text-xs px-3 py-1 bg-lime-500/20 text-lime-400 border border-lime-500/30 rounded hover:bg-lime-500/30 transition-all duration-200"
           >
            Close Results
           </button>
          </div>
         )}

         <div className="mt-4">
          <p className="text-sm text-orange-300">
           <strong>Instructions:</strong> Download a template, fill it with your product data, then upload the CSV file to import products. The system supports both Factory and Resale product types.
          </p>
         </div>
        </div>
       </section>
      )}

      {/* Error Message */}
      {error && (
       <section className="px-6 md:px-10">
        <div className="border border-red-500 bg-red-500/10 ring-1 ring-red-500/5 shadow-lg rounded-lg p-4">
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
       </section>
      )}

      {/* Product Form */}
      {showForm && (
       <section className="px-3 xs:px-4 sm:px-6 md:px-10">
        <div className="bg-black/40 backdrop-blur-md border border-stone-700/50 hover:border-orange-500/30 transition-all duration-300 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 sm:p-8 animate-slide-up">
      <div className="flex items-center mb-6 sm:mb-8">
      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-stone-800/50 backdrop-blur-sm border border-lime-500/40 rounded-xl flex items-center justify-center mr-4 shadow-[0_0_20px_rgba(163,230,53,0.15)]">
       <svg className="w-6 h-6 sm:w-7 sm:h-7 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
       </svg>
      </div>
      <div>
       <h3 className="text-xl sm:text-2xl font-semibold text-white font-bricolage">
        {editingProduct ? 'Edit Product' : 'Create New Product'}
       </h3>
       <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
        {editingProduct ? 'Update product information and settings' : 'Add a new premium product to your catalog'}
       </p>
      </div>
     </div>
     
     <div className="mb-6 sm:mb-8 bg-stone-800/40 backdrop-blur-sm border border-stone-700/50 p-6 sm:p-8 rounded-2xl">
      <h4 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-white font-bricolage">Product Type</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
       <label className={`flex items-center p-4 sm:p-6 border rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${formData.productType === 'factory' ? 'border-lime-500/50 bg-lime-500/10 shadow-[0_0_20px_rgba(163,230,53,0.15)]' : 'border-stone-600/50 bg-stone-800/30 hover:bg-stone-700/40 hover:border-stone-500/60'}`}>
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
       
       <label className={`flex items-center p-4 sm:p-6 border rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${formData.productType === 'resale' ? 'border-lime-500/50 bg-lime-500/10 shadow-[0_0_20px_rgba(163,230,53,0.15)]' : 'border-stone-600/50 bg-stone-800/30 hover:bg-stone-700/40 hover:border-stone-500/60'}`}>
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
        <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
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
         className="w-full px-4 py-3 sm:py-4 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
        />
       </div>

       <div>
        <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
         Slug
        </label>
        <input
         type="text"
         value={typeof formData.slug === 'string' ? formData.slug : formData.slug?.current || ''}
         onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
         required
         className="w-full px-4 py-3 sm:py-4 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
        />
       </div>

       <div>
        <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
         Price Tier
        </label>
        <select
         value={formData.priceTier}
         onChange={(e) => setFormData({ ...formData, priceTier: e.target.value })}
         className="w-full px-4 py-3 sm:py-4 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
        >
         <option value="Tier 1" className="bg-stone-800 text-white">Tier 1</option>
         <option value="Tier 2" className="bg-stone-800 text-white">Tier 2</option>
         <option value="Tier 3" className="bg-stone-800 text-white">Tier 3</option>
        </select>
       </div>
       
       {formData.productType === 'resale' && (
        <>
         <div>
          <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
           Selling Price ($) *
          </label>
          <input
           type="number"
           value={formData.sellingPrice || ''}
           onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
           required={formData.productType === 'resale'}
           min="0"
           step="0.01"
           className="w-full px-4 py-3 sm:py-4 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
          />
         </div>
         
         <div>
          <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
           Shipping Source *
          </label>
          <select
           value={formData.shippingSource}
           onChange={(e) => setFormData({ ...formData, shippingSource: e.target.value as 'Factory' | 'Warehouse' })}
           required={formData.productType === 'resale'}
           className="w-full px-4 py-3 sm:py-4 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
          >
           <option value="Factory" className="bg-stone-800 text-white">Factory</option>
           <option value="Warehouse" className="bg-stone-800 text-white">Warehouse</option>
          </select>
         </div>
         
         <div>
          <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
           Type of Product *
          </label>
          <select
           value={formData.productCategory}
           onChange={(e) => setFormData({ ...formData, productCategory: e.target.value as 'Caps' | 'Shirts' | 'Beanies' | 'Other' })}
           required={formData.productType === 'resale'}
           className="w-full px-4 py-3 sm:py-4 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
          >
           <option value="Caps" className="bg-stone-800 text-white">Caps</option>
           <option value="Shirts" className="bg-stone-800 text-white">Shirts</option>
           <option value="Beanies" className="bg-stone-800 text-white">Beanies</option>
           <option value="Other" className="bg-stone-800 text-white">Other</option>
          </select>
         </div>
         
         {formData.productCategory === 'Other' && (
          <div>
           <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
            Custom Product Type *
           </label>
           <input
            type="text"
            value={formData.customProductCategory}
            onChange={(e) => setFormData({ ...formData, customProductCategory: e.target.value })}
            required={formData.productType === 'resale' && formData.productCategory === 'Other'}
            className="w-full px-4 py-3 sm:py-4 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
            placeholder="Enter product type"
           />
          </div>
         )}
         
         <div>
          <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
           QC Handler *
          </label>
          <select
           value={formData.qcHandler}
           onChange={(e) => setFormData({ ...formData, qcHandler: e.target.value as 'Factory' | '3rd Party' | 'Buyer' })}
           required={formData.productType === 'resale'}
           className="w-full px-4 py-3 sm:py-4 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
          >
           <option value="Factory" className="bg-stone-800 text-white">Factory</option>
           <option value="3rd Party" className="bg-stone-800 text-white">3rd Party</option>
           <option value="Buyer" className="bg-stone-800 text-white">Buyer</option>
          </select>
         </div>
         
         <div className="col-span-2">
          <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
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
             className="h-4 w-4 text-lime-400 focus:ring-lime-400 border-stone-500 rounded"
            />
            <span className="ml-2 text-sm text-white">Stock/Inventory</span>
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
             className="h-4 w-4 text-lime-400 focus:ring-lime-400 border-stone-500 rounded"
            />
            <span className="ml-2 text-sm text-white">Customizable</span>
           </label>
          </div>
          {formData.productReadiness?.length === 0 && (
           <p className="mt-1 text-sm text-red-500">Please select at least one option</p>
          )}
         </div>
         
         {/* Supplier Information Section */}
         <div className="col-span-2 border border-lime-400/30 bg-lime-400/5 p-4 rounded-lg">
          <h4 className="text-md font-medium mb-3 text-lime-400">Supplier Information</h4>
          
          {/* Profile Photo Section */}
          <div className="mb-4">
           <label className="block text-sm font-medium text-slate-300 mb-2">
            Profile Photo (Brand Image) *
           </label>
           <div className="flex items-start space-x-4">
            <input
             ref={(el) => {
              if (el) multipleImageRefs.current['supplierPhoto'] = el;
             }}
             type="file"
             accept="image/*"
             onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
               setUploadingImages(true);
               const url = await uploadImage(file);
               setFormData({
                ...formData,
                supplierPhoto: { url, alt: 'Supplier Profile Photo' },
               });
              } catch (error) {
               setError('Failed to upload profile photo');
              } finally {
               setUploadingImages(false);
              }
             }}
             className="hidden"
            />
            <button
             type="button"
             onClick={() => {
              const inputRef = multipleImageRefs.current['supplierPhoto'];
              if (inputRef && inputRef.click) {
               inputRef.click();
              }
             }}
             disabled={uploadingImages}
             className="px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors disabled:opacity-50"
            >
             <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
             </svg>
             Upload Profile Photo
            </button>
            
            {/* Profile Photo Preview */}
            {formData.supplierPhoto?.url && (
             <div className="border border-stone-600 bg-stone-700 rounded-lg p-2">
              <div className="aspect-square w-20 h-20">
               <img 
                src={formData.supplierPhoto.url} 
                alt="Supplier profile preview"
                className="w-full h-full object-cover rounded-lg"
               />
              </div>
              <p className="text-xs text-slate-400 text-center mt-1">Brand Image</p>
             </div>
            )}
           </div>
           <p className="text-xs text-slate-500 mt-1">This photo will be displayed as the brand image on the store page</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
             Supplier Name
            </label>
            <input
             type="text"
             value={user?.name || ''}
             disabled
             className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-slate-400 rounded-lg"
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
             className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-slate-400 rounded-lg"
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
             className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-slate-400 rounded-lg"
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
             value={user?.customerRole || ''}
             disabled
             className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-slate-400 rounded-lg"
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
          <div className="col-span-2 border border-orange-400 bg-orange-400/5 p-4 rounded-lg">
           <h4 className="text-md font-medium mb-3 text-orange-400">Inventory Information</h4>
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
              className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
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
              className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
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
              className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
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
              className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
              placeholder="Minimum stock level before reordering"
             />
            </div>
           </div>
          </div>
         )}
        </>
       )}

       <div>
        <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
         Status
        </label>
        <select
         value={formData.isActive ? 'active' : 'inactive'}
         onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
         className="w-full px-4 py-3 sm:py-4 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
        >
         <option value="active" className="bg-stone-800 text-white">Active</option>
         <option value="inactive" className="bg-stone-800 text-white">Inactive</option>
        </select>
       </div>
       
       {/* Category/Tags for Store Page filters */}
       <div className="col-span-2">
        <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
         Category/Tags for Store Filters
        </label>
        <div className="space-y-2">
         <input
          type="text"
          placeholder="Enter tags separated by commas (e.g., Baseball Equipment, Sports Caps, Casual Wear, Premium Quality)"
          value={categoryTagsInput}
          onChange={(e) => {
           const value = e.target.value;
           setCategoryTagsInput(value);
           
           // Process tags and update formData
           const tags = value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
           
           setFormData({ ...formData, categoryTags: tags });
          }}
          onBlur={() => {
           // On blur, ensure the input reflects the processed tags
           const processedTags = (formData.categoryTags || []).join(', ');
           setCategoryTagsInput(processedTags);
          }}
          className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
         />
         {/* Display current tags */}
         {formData.categoryTags && formData.categoryTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
           {formData.categoryTags.map((tag, index) => (
            <span
             key={index}
             className="inline-flex items-center px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500 rounded-full text-sm"
            >
             {tag}
             <button
              type="button"
              onClick={() => {
               const updatedTags = [...(formData.categoryTags || [])];
               updatedTags.splice(index, 1);
               setFormData({ ...formData, categoryTags: updatedTags });
              }}
              className="ml-2 text-blue-300 hover:text-blue-100"
             >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
             </button>
            </span>
           ))}
          </div>
         )}
         <p className="text-xs text-slate-500">These tags will be used as filters on the store page</p>
        </div>
       </div>
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
        className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
       />
      </div>

      {/* Cap Style Setup */}
      <div className="bg-stone-800/40 backdrop-blur-sm border border-stone-700/50 rounded-2xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
       <h4 className="text-lg sm:text-xl font-semibold mb-6 sm:mb-8 text-white flex items-center font-bricolage">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-stone-800/50 backdrop-blur-sm border border-lime-500/40 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-[0_0_20px_rgba(163,230,53,0.15)]">
         <svg className="w-4 h-4 sm:w-5 sm:h-5 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
         </svg>
        </div>
        Cap Style Setup
       </h4>
       
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Bill Shape */}
        <div>
         <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
          Bill Shape
         </label>
         <select
          value={formData.billShape || ''}
          onChange={(e) => setFormData({ ...formData, billShape: e.target.value as 'Slight Curved' | 'Curved' | 'Flat' || undefined })}
          className="w-full px-4 py-3 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
         >
          <option value="" className="bg-stone-800 text-white">Select Bill Shape</option>
          <option value="Slight Curved" className="bg-stone-800 text-white">Slight Curved</option>
          <option value="Curved" className="bg-stone-800 text-white">Curved</option>
          <option value="Flat" className="bg-stone-800 text-white">Flat</option>
         </select>
        </div>

        {/* Profile */}
        <div>
         <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
          Profile
         </label>
         <select
          value={formData.profile || ''}
          onChange={(e) => setFormData({ ...formData, profile: e.target.value as 'High' | 'Mid' | 'Low' || undefined })}
          className="w-full px-4 py-3 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
         >
          <option value="" className="bg-stone-800 text-white">Select Profile</option>
          <option value="High" className="bg-stone-800 text-white">High</option>
          <option value="Mid" className="bg-stone-800 text-white">Mid</option>
          <option value="Low" className="bg-stone-800 text-white">Low</option>
         </select>
        </div>

        {/* Closure Type */}
        <div>
         <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
          Closure Type
         </label>
         <select
          value={formData.closureType || ''}
          onChange={(e) => setFormData({ ...formData, closureType: e.target.value as 'Snapback' | 'Velcro' | 'Fitted' | 'Stretched' || undefined })}
          className="w-full px-4 py-3 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
         >
          <option value="" className="bg-stone-800 text-white">Select Closure Type</option>
          <option value="Snapback" className="bg-stone-800 text-white">Snapback</option>
          <option value="Velcro" className="bg-stone-800 text-white">Velcro</option>
          <option value="Fitted" className="bg-stone-800 text-white">Fitted</option>
          <option value="Stretched" className="bg-stone-800 text-white">Stretched</option>
         </select>
        </div>

        {/* Structure */}
        <div>
         <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
          Structure
         </label>
         <select
          value={formData.structure || ''}
          onChange={(e) => setFormData({ ...formData, structure: e.target.value as 'Structured' | 'Unstructured' | 'Foam' || undefined })}
          className="w-full px-4 py-3 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
         >
          <option value="" className="bg-stone-800 text-white">Select Structure</option>
          <option value="Structured" className="bg-stone-800 text-white">Structured</option>
          <option value="Unstructured" className="bg-stone-800 text-white">Unstructured</option>
          <option value="Foam" className="bg-stone-800 text-white">Foam</option>
         </select>
        </div>
       </div>

       {/* Fabric Setup */}
       <div>
        <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
         Fabric Setup
         <span className="text-xs text-stone-300 ml-2">(Premium fabrics add cost to customization)</span>
        </label>
        <select
         value={formData.fabricSetup || ''}
         onChange={(e) => {
          const value = e.target.value;
          setFormData({ 
           ...formData, 
           fabricSetup: value,
           customFabricSetup: value === 'Other' ? formData.customFabricSetup : ''
          });
         }}
         className="w-full px-4 py-3 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
        >
         <option value="" className="bg-stone-800 text-white">Select Fabric Setup</option>
         {FABRIC_OPTIONS.map((fabric) => (
          <option key={fabric} value={fabric} className="bg-stone-800 text-white">{fabric}</option>
         ))}
        </select>

        {/* Custom Fabric Input */}
        {formData.fabricSetup === 'Other' && (
         <div className="mt-4">
          <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
           Custom Fabric Setup
          </label>
          <input
           type="text"
           value={formData.customFabricSetup || ''}
           onChange={(e) => setFormData({ ...formData, customFabricSetup: e.target.value })}
           placeholder="Enter custom fabric setup"
           className="w-full px-4 py-3 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60"
          />
         </div>
        )}

        {/* Fabric Setup Display */}
        {formData.fabricSetup && (
         <div className={`mt-4 sm:mt-6 p-4 sm:p-6 rounded-xl border backdrop-blur-sm ${
          isPremiumFabric(formData.fabricSetup === 'Other' ? formData.customFabricSetup || '' : formData.fabricSetup)
           ? 'bg-orange-500/10 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
           : 'bg-lime-500/10 border-lime-500/40 shadow-[0_0_20px_rgba(163,230,53,0.15)]'
         }`}>
          <div className="flex items-center justify-between">
           <p className={`text-sm font-medium ${
            isPremiumFabric(formData.fabricSetup === 'Other' ? formData.customFabricSetup || '' : formData.fabricSetup)
             ? 'text-orange-400'
             : 'text-lime-400'
           }`}>
            Selected Fabric: {formData.fabricSetup === 'Other' ? formData.customFabricSetup : formData.fabricSetup}
           </p>
           {isPremiumFabric(formData.fabricSetup === 'Other' ? formData.customFabricSetup || '' : formData.fabricSetup) && (
            <span className="px-2 py-1 bg-orange-400/20 text-orange-400 text-xs font-medium rounded-full">
             Premium Fabric
            </span>
           )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
           {isPremiumFabric(formData.fabricSetup === 'Other' ? formData.customFabricSetup || '' : formData.fabricSetup)
            ? 'This premium fabric will add "Premium Fabric Cost" during customization'
            : 'This fabric will be considered for customization options'
           }
          </p>
         </div>
        )}
       </div>
      </div>

      {/* Main Image Upload */}
      <div>
       <label className="block text-sm font-medium text-white mb-2">
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
         <div className="border border-blue-500 bg-blue-500/20 text-blue-400 px-4 py-3 rounded-lg mb-4">
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
         {formData.mainImage?.url && (
          <div className="inline-block">
           <div className="border border-stone-600 bg-stone-700 rounded-lg p-4 w-fit">
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

      {/* Custom Product Options - Only show when Customizable is checked */}
      {formData.productReadiness?.includes('Customizable') && (
      <div className="border-t pt-6 mt-6">
       <h3 className="text-lg font-medium text-white mb-4">Custom Product Options</h3>
       <p className="text-sm text-slate-400 mb-4">
        Add custom product options with images, descriptions, and pricing. Maximum 10 options allowed.
       </p>
       
       {/* Input for adding new options */}
       <div className="space-y-4 mb-6">
        <div className="flex items-end space-x-4">
         <div className="flex-1">
          <label className="block text-sm font-medium text-white mb-2">
           Add Custom Option Categories
          </label>
          <input
           type="text"
           value={customOptionInput}
           onChange={(e) => setCustomOptionInput(e.target.value)}
           placeholder="Enter option names separated by commas (e.g., Size, Color, Material)"
           className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
           disabled={(formData.customOptions || []).length >= 10}
          />
         </div>
        </div>
        
        {/* Option Type Selection */}
        <div className="flex space-x-4">
         <button
          type="button"
          onClick={() => addCustomOption('text')}
          disabled={(formData.customOptions || []).length >= 10 || !customOptionInput.trim()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
         >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span>Add Text Option</span>
         </button>
         <button
          type="button"
          onClick={() => addCustomOption('image')}
          disabled={(formData.customOptions || []).length >= 10 || !customOptionInput.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
         >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Add Image Option</span>
         </button>
        </div>
       </div>
       
       {/* List of added custom options */}
       {(formData.customOptions || []).length > 0 && (
        <div className="space-y-6 mb-6">
         <h4 className="text-md font-medium text-white">Added Custom Options:</h4>
         <div className="space-y-8">
          {(formData.customOptions || []).map((option, optionIndex) => (
           <div key={`option-${optionIndex}`} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
             <div className="flex items-center space-x-3">
              <span className="font-medium text-gray-700">{option.name}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
               option.type === 'text' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-blue-100 text-blue-700'
              }`}>
               {option.type === 'text' ? 'Text Option' : 'Image Option'}
              </span>
             </div>
             <div className="flex items-center space-x-2">
              {option.type === 'text' && (
               <span className="text-xs text-slate-400">
                {(option.textOptions || []).length} text options
               </span>
              )}
              {option.type === 'image' && (
               <span className="text-xs text-slate-400">{option.images.length} images</span>
              )}
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
            
            {/* Option Content based on type */}
            <div className="p-4">
             {option.type === 'text' ? (
              /* Text Option Management */
              <div className="space-y-4">
               {/* Add Text Option Input */}
               <div className="flex items-end space-x-4">
                <div className="flex-1">
                 <label className="block text-sm font-medium text-white mb-2">
                  Add Text Option
                 </label>
                 <input
                  type="text"
                  value={textOptionInputs[optionIndex]?.label || ''}
                  onChange={(e) => setTextOptionInputs(prev => ({
                   ...prev,
                   [optionIndex]: { 
                    ...prev[optionIndex], 
                    label: e.target.value 
                   }
                  }))}
                  placeholder="e.g. Small, Medium, Large"
                  className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                 />
                </div>
                <div className="w-32">
                 <label className="block text-sm font-medium text-white mb-2">
                  Price ($)
                 </label>
                 <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={textOptionInputs[optionIndex]?.price || ''}
                  onChange={(e) => setTextOptionInputs(prev => ({
                   ...prev,
                   [optionIndex]: { 
                    ...prev[optionIndex], 
                    price: e.target.value 
                   }
                  }))}
                  className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                 />
                </div>
                <button
                 type="button"
                 onClick={() => {
                  const label = textOptionInputs[optionIndex]?.label?.trim();
                  const priceInput = textOptionInputs[optionIndex]?.price?.trim();
                  const price = priceInput ? parseFloat(priceInput) : undefined;
                  if (label) {
                   addTextOption(optionIndex, label, price);
                   setTextOptionInputs(prev => ({
                    ...prev,
                    [optionIndex]: { label: '', price: '' }
                   }));
                  }
                 }}
                 disabled={!textOptionInputs[optionIndex]?.label?.trim()}
                 className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                 Add
                </button>
               </div>

               {/* Display Text Options */}
               {option.textOptions && option.textOptions.length > 0 && (
                <div className="space-y-2">
                 <h5 className="text-sm font-medium text-white">Text Options:</h5>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {option.textOptions.map((textOpt, textIndex) => (
                   <div key={textIndex} className="flex items-center justify-between p-3 bg-stone-700 border border-stone-600 rounded-lg">
                    <div className="flex-1">
                     <input
                      type="text"
                      value={textOpt.label}
                      onChange={(e) => updateTextOption(optionIndex, textIndex, 'label', e.target.value)}
                      className="bg-transparent text-white font-medium text-sm border-none p-0 focus:ring-0"
                     />
                     <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-slate-400">$</span>
                      <input
                       type="number"
                       step="0.01"
                       min="0"
                       value={textOpt.price || 0}
                       onChange={(e) => updateTextOption(optionIndex, textIndex, 'price', parseFloat(e.target.value) || 0)}
                       className="bg-transparent text-lime-400 text-xs w-16 border-none p-0 focus:ring-0"
                      />
                     </div>
                    </div>
                    <button
                     type="button"
                     onClick={() => removeTextOption(optionIndex, textIndex)}
                     className="ml-3 p-1 text-red-500 hover:text-red-700"
                    >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                    </button>
                   </div>
                  ))}
                 </div>
                </div>
               )}
              </div>
             ) : (
              /* Image Option Management - Keep existing logic */
              <div>
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
              <div className="border border-blue-500 bg-blue-500/20 text-blue-400 px-4 py-3 rounded-lg mb-4">
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
                 className={`relative group border border-stone-600 bg-stone-700 rounded-lg p-3 transition-all duration-200 ${
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
                 <div className="absolute top-1 left-1 bg-black/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
                     Option Name
                    </label>
                    <input
                     type="text"
                     value={img.alt}
                     onChange={(e) => handleAltTextChange(`customOption-${optionIndex}`, imgIndex, e.target.value, optionIndex)}
                     placeholder="e.g., Red, Large, Cotton"
                     className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
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
                     className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
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
                     className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
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
             )}
            </div>
           </div>
          ))}
         </div>
        </div>
       )}
      </div>
      )}
      
      {/* Multiple Image Galleries */}
      {[
       { field: 'itemData', label: 'Item Data Images', showFor: ['factory', 'resale'] },
       { field: 'frontColorImages', label: 'Front Color Images', showFor: ['factory'] },
       { field: 'leftColorImages', label: 'Left Color Images', showFor: ['factory'] },
       { field: 'rightColorImages', label: 'Right Color Images', showFor: ['factory'] },
       { field: 'backColorImages', label: 'Back Color Images', showFor: ['factory'] },
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
         <div className="border border-blue-500 bg-blue-500/20 text-blue-400 px-4 py-3 rounded-lg mb-4">
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
             className={`relative group border border-stone-600 bg-stone-700 rounded-lg p-2 transition-all duration-200 ${
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
             <div className="absolute top-1 left-1 bg-black/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
                className="w-full text-xs px-2 py-1 border border-stone-600 bg-black/30 text-white rounded focus:ring-1 focus:ring-lime-400 focus:border-lime-400"
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

      {/* Custom Cap Color Images Section */}
      <div key="capColorImage">
       <label className="block text-sm font-medium text-white mb-2">
        Cap Color Images
       </label>
       
       {/* Color Input Method Selection */}
       <div className="mb-4">
        <div className="grid grid-cols-1 gap-4">
         {/* Method 1: Image Upload with Text Names */}
         <div className={`border border-stone-600 rounded-lg p-4 transition-all duration-200 ${
          formData.referenceProductId 
           ? 'bg-gray-800/50 opacity-60' 
           : 'bg-stone-700 hover:bg-stone-600'
         }`}>
          <h4 className={`text-md font-medium mb-3 ${
           formData.referenceProductId ? 'text-gray-400' : 'text-white'
          }`}>Method 1: Upload Images with Color Names</h4>
          
          {formData.referenceProductId && (
           <div className="mb-3 p-2 bg-yellow-500/20 border border-yellow-500 rounded text-yellow-200 text-sm flex items-center justify-between">
            <span><span className="font-medium">Method 2 is active:</span> Clear the factory product selection to use this method.</span>
            <button
             type="button"
             onClick={() => setFormData({ ...formData, referenceProductId: '' })}
             className="ml-2 px-2 py-1 bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-200 text-xs rounded transition-colors"
            >
             Clear
            </button>
           </div>
          )}
          
          {/* Image Upload Section */}
          <div className="flex items-center space-x-4 mb-4">
           <input
            ref={setMultipleImageRef('capColorImage')}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleMultipleImageUpload(e, 'capColorImage')}
            className="hidden"
           />
           <button
            type="button"
            onClick={() => {
             const inputRef = multipleImageRefs.current['capColorImage'];
             if (inputRef && inputRef.click) {
              inputRef.click();
             }
            }}
            disabled={uploadingImages || !!formData.referenceProductId}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
           >
            <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Images (Max 50)
           </button>
           <span className="text-sm text-slate-400">Upload multiple images for color variations</span>
          </div>

          {/* Text Input for Color Names */}
          <div className="mb-4">
           <label className="block text-sm font-medium text-slate-300 mb-2">
            Or add colors by text (comma-separated)
           </label>
           <input
            type="text"
            value={formData.capColorNames || ''}
            onChange={(e) => setFormData({ ...formData, capColorNames: e.target.value })}
            placeholder="e.g. Red, Blue, Green, Navy, Black"
            disabled={!!formData.referenceProductId}
            className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400 disabled:opacity-50 disabled:cursor-not-allowed"
           />
           <p className="text-xs text-slate-500 mt-1">You can upload images for these colors later</p>
          </div>

          {/* Upload Progress */}
          {uploadingImages && (
           <div className="border border-blue-500 bg-blue-500/20 text-blue-400 px-4 py-3 rounded-lg mb-4">
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
          {(formData.capColorImage)?.length > 0 && (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
            {(formData.capColorImage).map((img, index) => {
             const itemKey = `capColorImage-${index}`;
             const isDraggingDisabled = inputInteracting === itemKey;
             
             return (
             <div 
              key={`capColorImage-${index}-${img.url}`} 
              className={`relative group border border-stone-600 bg-stone-700 rounded-lg p-2 transition-all duration-200 ${
               isDraggingDisabled ? 'cursor-default' : 'cursor-move'
              } ${
               draggedIndex === index && draggedField === 'capColorImage' ? 'opacity-50 scale-95' : 'hover:scale-105'
              }`}
              draggable={!isDraggingDisabled}
              onDragStart={(e) => {
               if (isDraggingDisabled) {
                e.preventDefault();
                return;
               }
               handleDragStart(e, index, 'capColorImage');
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index, 'capColorImage')}
              onDragEnd={handleDragEnd}
             >
              {/* Drag handle indicator */}
              <div className="absolute top-1 left-1 bg-black/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
               </svg>
              </div>
              
              <div className="aspect-square w-full mb-2">
               <img 
                src={img.url} 
                alt={img.alt || `Cap Color ${index + 1}`}
                className="w-full h-full object-cover rounded-lg pointer-events-none"
               />
              </div>
              
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
                onChange={(e) => handleAltTextChange('capColorImage', index, e.target.value)}
                placeholder="Color name"
                className="w-full text-xs px-2 py-1 border border-stone-600 bg-black/30 text-white rounded focus:ring-1 focus:ring-lime-400 focus:border-lime-400"
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
              
              <button
               type="button"
               onClick={() => handleImageRemove('capColorImage', index)}
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

         {/* Method 2: Reference Factory Product */}
         <div className={`bg-stone-800/40 backdrop-blur-sm border border-stone-700/50 rounded-2xl p-4 sm:p-6 transition-all duration-200 ${
          (formData.capColorImage?.length > 0 || formData.capColorNames?.trim()) 
           ? 'opacity-60' 
           : 'hover:bg-stone-700/30 hover:border-stone-600/60'
         }`}>
          <h4 className={`text-lg sm:text-xl font-semibold mb-4 sm:mb-6 font-bricolage flex items-center ${
           (formData.capColorImage?.length > 0 || formData.capColorNames?.trim()) ? 'text-stone-400' : 'text-white'
          }`}>
           <div className="w-8 h-8 sm:w-10 sm:h-10 bg-stone-800/50 backdrop-blur-sm border border-purple-500/40 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
           </div>
           Method 2: Reference Existing Factory Product
          </h4>
          
          {(formData.capColorImage?.length > 0 || formData.capColorNames?.trim()) && (
           <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/50 rounded-xl text-yellow-200 text-sm flex items-center justify-between shadow-[0_0_20px_rgba(234,179,8,0.15)]">
            <span><span className="font-semibold">Method 1 is active:</span> Clear uploaded images or color names to use this method.</span>
            <button
             type="button"
             onClick={() => setFormData({ 
              ...formData, 
              capColorImage: [],
              capColorNames: ''
             })}
             className="ml-2 px-3 py-1.5 bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-200 text-xs rounded-lg transition-colors font-medium"
            >
             Clear
            </button>
           </div>
          )}
          <div>
           <label className="block text-sm sm:text-base font-semibold text-white mb-3 font-bricolage">
            Select Factory Product to use Front Color Images
           </label>
           <select
            value={formData.referenceProductId || ''}
            onChange={(e) => {
             console.log('🔄 Reference Product Selection:', {
              selectedValue: e.target.value,
              selectedProductName: products.find(p => (p._id || p.id) === e.target.value)?.name || 'Not found'
             });
             setFormData({ ...formData, referenceProductId: e.target.value });
            }}
            disabled={!!(formData.capColorImage?.length > 0 || formData.capColorNames?.trim())}
            className="w-full px-4 py-3 border border-stone-600/50 bg-stone-800/40 backdrop-blur-sm text-white rounded-xl focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400/60 transition-all duration-200 shadow-lg hover:bg-stone-700/50 hover:border-stone-500/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-stone-800/40"
           >
            <option value="" className="bg-stone-800 text-white">Select a factory product...</option>
            {(() => {
             const factoryProducts = products.filter(product => product.productType === 'factory' && product.frontColorImages?.length > 0);
             console.log('🏭 Available Factory Products:', factoryProducts.map(p => ({ name: p.name, id: p._id || p.id, frontColorCount: p.frontColorImages?.length })));
             return factoryProducts.map(product => (
              <option key={product._id || product.id} value={product._id || product.id} className="bg-stone-800 text-white">
               {product.name} ({product.frontColorImages?.length || 0} colors)
              </option>
             ));
            })()}
           </select>
           <p className="text-xs sm:text-sm text-stone-300 mt-2">This will use the Front Color Images from the selected factory product</p>
          </div>
         </div>
        </div>
       </div>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6 sm:pt-8 border-t border-stone-700/50">
       <button
        type="button"
        onClick={() => {
         setShowForm(false);
         resetForm();
        }}
        className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-stone-800/50 backdrop-blur-sm border border-stone-600/50 text-white rounded-xl hover:bg-stone-700/60 hover:border-stone-500/60 transition-all duration-200 shadow-lg text-sm sm:text-base font-medium"
       >
        Cancel
       </button>
       <button
        type="submit"
        disabled={isSaving || uploadingImages}
        className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-lime-600 to-green-600 text-white rounded-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] text-sm sm:text-base font-semibold"
       >
        {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
       </button>
      </div>
     </form>
        </div>
       </section>
      )}

      {/* Products List */}
      {!showForm && (
       <section className="px-3 xs:px-4 sm:px-6 md:px-10">
        <div className="bg-black/40 backdrop-blur-md border border-stone-700/50 hover:border-orange-500/50 transition-all duration-300 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden animate-slide-up">
     {isLoading ? (
      <div className="p-12 text-center">
       <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-lime-400 mx-auto"></div>
       <p className="mt-6 text-white text-lg font-bricolage font-semibold">Loading products...</p>
       <p className="text-stone-300 text-sm">Please wait while we fetch your product catalog</p>
      </div>
     ) : products.length > 0 ? (
      <div className="overflow-x-auto">
       <table className="min-w-full">
        <thead className="bg-stone-900/60 backdrop-blur-sm border-b border-stone-700/50">
         <tr>
          <th className="px-4 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider font-bricolage">
           Product
          </th>
          <th className="px-4 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider font-bricolage">
           Type
          </th>
          <th className="px-4 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider font-bricolage">
           Price Tier
          </th>
          <th className="px-4 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider font-bricolage">
           Status
          </th>
          <th className="px-4 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider font-bricolage">
           Colors
          </th>
          <th className="px-4 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider font-bricolage">
           Created By
          </th>
          <th className="px-4 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-semibold text-white uppercase tracking-wider font-bricolage">
           Created
          </th>
          <th className="relative px-4 sm:px-6 py-4 sm:py-5">
           <span className="sr-only">Actions</span>
          </th>
         </tr>
        </thead>
        <tbody className="divide-y divide-stone-700/30">
         {products.map((product, index) => (
          <tr key={product._id || product.id || `${product.name}-${product.slug}`} 
              className="bg-black/20 hover:bg-stone-800/30 transition-all duration-200 hover:scale-[1.01] animate-slide-up"
              style={{animationDelay: `${index * 0.1}s`}}>
           <td className="px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
            <div className="flex items-center">
             <div className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
              {product.mainImage?.url ? (
               <img
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl object-cover border-2 border-white/10 shadow-lg"
                src={product.mainImage.url}
                alt={product.name}
               />
              ) : (
               <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-stone-800/50 border border-stone-600/40 flex items-center justify-center">
                <svg className="h-6 w-6 sm:h-7 sm:w-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
               </div>
              )}
             </div>
             <div className="ml-4">
              <div className="text-sm sm:text-base font-semibold text-white font-bricolage">
               {product.name}
              </div>
              <div className="text-xs sm:text-sm text-stone-300">
               /{typeof product.slug === 'string' ? product.slug : product.slug?.current || ''}
              </div>
             </div>
            </div>
           </td>
           <td className="px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
            <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full border shadow-lg ${product.productType === 'factory' ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : 'bg-orange-500/20 text-orange-300 border-orange-500/50'}`}>
             {product.productType === 'factory' ? 'Factory' : 'Resale'}
            </span>
           </td>
           <td className="px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
            <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-lime-500/20 text-lime-300 border border-lime-500/50 shadow-lg">
             {product.priceTier}
             {product.productType === 'resale' && product.sellingPrice ? ` ($${product.sellingPrice})` : ''}
            </span>
           </td>
           <td className="px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
            <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full border shadow-lg ${
             product.isActive 
              ? 'bg-green-500/20 text-green-300 border-green-500/50' 
              : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
            }`}>
             {product.isActive ? 'Active' : 'Inactive'}
            </span>
           </td>
           <td className="px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
            <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded-full bg-gradient-to-r from-lime-500 to-orange-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5H9a2 2 0 00-2 2v12a4 4 0 004 4h8a2 2 0 002-2V7a2 2 0 00-2-2z" />
              </svg>
             </div>
             <span className="text-sm text-stone-300 font-medium">{product.frontColorImages?.length || 0}</span>
            </div>
           </td>
           <td className="px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap text-sm">
            {product.createdBy ? (
             <div className="bg-stone-800/40 backdrop-blur-sm p-2 rounded-lg border border-stone-600/30">
              <div className="font-semibold text-white text-xs sm:text-sm">{product.createdBy.name}</div>
              <div className="text-xs text-stone-400">{product.createdBy.email}</div>
              {product.createdBy.company && (
               <div className="text-xs text-blue-300 font-medium">{product.createdBy.company}</div>
              )}
              {product.createdBy.role && (
               <div className="text-xs text-purple-300 font-medium">{product.createdBy.role}</div>
              )}
             </div>
            ) : (
             <span className="px-2 py-1 text-xs bg-stone-800/60 text-stone-300 rounded-lg border border-stone-600/40">System</span>
            )}
           </td>
           <td className="px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap text-sm text-stone-300 font-medium">
            {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
           </td>
           <td className="px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap text-right text-sm font-medium">
            <div className="flex items-center justify-end gap-2">
             <button
              onClick={() => handleEdit(product)}
              className="bg-stone-800/50 backdrop-blur-sm px-3 py-1.5 text-lime-400 hover:text-lime-300 border border-lime-500/40 hover:border-lime-500/60 rounded-lg transition-all duration-200 hover:bg-stone-700/60 hover:shadow-[0_0_20px_rgba(163,230,53,0.15)] text-xs sm:text-sm"
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
               className="bg-stone-800/50 backdrop-blur-sm px-3 py-1.5 text-blue-400 hover:text-blue-300 border border-blue-500/40 hover:border-blue-500/60 rounded-lg transition-all duration-200 disabled:opacity-50 hover:bg-stone-700/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] text-xs sm:text-sm"
              >
               {migratingProduct === (product._id || product.id) ? 'Migrating...' : 'Migrate'}
              </button>
             )}
             <button
              onClick={() => {
               const productId = product._id || product.id;
               if (productId) handleDelete(productId);
              }}
              className="bg-stone-800/50 backdrop-blur-sm px-3 py-1.5 text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-500/60 rounded-lg transition-all duration-200 hover:bg-stone-700/60 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] text-xs sm:text-sm"
             >
              Delete
             </button>
            </div>
           </td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
     ) : (
      <div className="px-8 py-16 text-center animate-slide-up">
       <div className="w-20 h-20 bg-stone-800/40 backdrop-blur-sm border border-lime-500/40 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(163,230,53,0.15)]">
        <svg className="w-10 h-10 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L2 7l10 5 10-5-10-5z" />
         <path d="m2 17 10 5 10-5"></path>
         <path d="m2 12 10 5 10-5"></path>
        </svg>
       </div>
       <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2 font-bricolage">No products found</h3>
       <p className="text-stone-300 mb-6 text-sm sm:text-base max-w-md mx-auto leading-relaxed">Get started by creating your first premium custom cap product</p>
       <button
        onClick={() => {
         resetForm();
         setShowForm(true);
        }}
        className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-lime-600 to-green-600 text-white font-semibold rounded-full hover:scale-105 transition-all duration-200 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] hover:shadow-lg text-sm sm:text-base"
       >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create Your First Product
       </button>
      </div>
     )}
        </div>
       </section>
      )}
  </div>
 );
}
