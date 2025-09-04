'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/dashboard';

interface Page {
 _id: string;
 title: string;
 slug: { current: string };
 description?: string;
 isHomePage: boolean;
 isPublished: boolean;
 sections: any[];
 createdAt: string;
 updatedAt: string;
}

interface Section {
 _id: string;
 _type: string;
 title: string;
 headline?: string;
 isVisible: boolean;
}

export default function PageBuilder() {
 const { user } = useAuth();
 const [pages, setPages] = useState<Page[]>([]);
 const [sections, setSections] = useState<Section[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedPage, setSelectedPage] = useState<Page | null>(null);
 const [isCreatingPage, setIsCreatingPage] = useState(false);
 const [isEditingPage, setIsEditingPage] = useState(false);
 const [previewMode, setPreviewMode] = useState(false);

 useEffect(() => {
  fetchPages();
  fetchSections();
 }, []);

 const fetchPages = async () => {
  try {
   const response = await fetch('/api/sanity/pages');
   if (response.ok) {
    const data = await response.json();
    setPages(data.pages || []);
   }
  } catch (error) {
   console.error('Error fetching pages:', error);
  } finally {
   setLoading(false);
  }
 };

 const fetchSections = async () => {
  try {
   const response = await fetch('/api/sanity/sections');
   if (response.ok) {
    const data = await response.json();
    setSections(data.sections || []);
   }
  } catch (error) {
   console.error('Error fetching sections:', error);
  }
 };

 const createNewPage = async () => {
  try {
   const response = await fetch('/api/sanity/pages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     title: 'New Page',
     slug: 'new-page',
     description: 'A new page created with the page builder',
     isHomePage: false,
     isPublished: false,
     sections: [],
    }),
   });

   if (response.ok) {
    const newPage = await response.json();
    setPages(prev => [...prev, newPage]);
    setSelectedPage(newPage);
    setIsCreatingPage(false);
   }
  } catch (error) {
   console.error('Error creating page:', error);
  }
 };

 const updatePage = async (pageId: string, updates: Partial<Page>) => {
  try {
   const response = await fetch(`/api/sanity/pages/${pageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
   });

   if (response.ok) {
    const updatedPage = await response.json();
    setPages(prev => prev.map(page => 
     page._id === pageId ? updatedPage : page
    ));
    setSelectedPage(updatedPage);
    setIsEditingPage(false);
   }
  } catch (error) {
   console.error('Error updating page:', error);
  }
 };

 const deletePage = async (pageId: string) => {
  if (!confirm('Are you sure you want to delete this page?')) return;

  try {
   const response = await fetch(`/api/sanity/pages/${pageId}`, {
    method: 'DELETE',
   });

   if (response.ok) {
    setPages(prev => prev.filter(page => page._id !== pageId));
    if (selectedPage?._id === pageId) {
     setSelectedPage(null);
    }
   }
  } catch (error) {
   console.error('Error deleting page:', error);
  }
 };

 const addSectionToPage = async (pageId: string, sectionType: string) => {
  try {
   const response = await fetch(`/api/sanity/pages/${pageId}/sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sectionType }),
   });

   if (response.ok) {
    const updatedPage = await response.json();
    setPages(prev => prev.map(page => 
     page._id === pageId ? updatedPage : page
    ));
    setSelectedPage(updatedPage);
   }
  } catch (error) {
   console.error('Error adding section:', error);
  }
 };

 const removeSectionFromPage = async (pageId: string, sectionIndex: number) => {
  try {
   const response = await fetch(`/api/sanity/pages/${pageId}/sections/${sectionIndex}`, {
    method: 'DELETE',
   });

   if (response.ok) {
    const updatedPage = await response.json();
    setPages(prev => prev.map(page => 
     page._id === pageId ? updatedPage : page
    ));
    setSelectedPage(updatedPage);
   }
  } catch (error) {
   console.error('Error removing section:', error);
  }
 };

 const reorderSections = async (pageId: string, fromIndex: number, toIndex: number) => {
  try {
   const response = await fetch(`/api/sanity/pages/${pageId}/sections/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromIndex, toIndex }),
   });

   if (response.ok) {
    const updatedPage = await response.json();
    setPages(prev => prev.map(page => 
     page._id === pageId ? updatedPage : page
    ));
    setSelectedPage(updatedPage);
   }
  } catch (error) {
   console.error('Error reordering sections:', error);
  }
 };

 const getSectionIcon = (sectionType: string) => {
  switch (sectionType) {
   case 'heroSection':
    return '🎯';
   case 'productSection':
    return '🛍️';
   case 'testimonialSection':
    return '💬';
   case 'contactSection':
    return '📞';
   default:
    return '📄';
  }
 };

 const getSectionName = (sectionType: string) => {
  switch (sectionType) {
   case 'heroSection':
    return 'Hero Section';
   case 'productSection':
    return 'Product Section';
   case 'testimonialSection':
    return 'Testimonial Section';
   case 'contactSection':
    return 'Contact Section';
   default:
    return 'Section';
  }
 };

 if (loading) {
  return (
   <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
   </div>
  );
 }

 return (
  <div className="space-y-6">
   {/* Header */}
   <div className="flex items-center justify-between">
    <div>
     <h2 className="text-2xl font-bold text-white">Page Builder</h2>
     <p className="text-slate-400">Create and manage your website pages visually</p>
    </div>
    <div className="flex space-x-3">
     <Button
      onClick={() => setIsCreatingPage(true)}
      className="bg-lime-400 text-black hover:bg-lime-300 shadow-[0_0_20px_rgba(163,230,53,0.25)]"
     >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Create New Page
     </Button>
     {selectedPage && (
      <Button
       onClick={() => setPreviewMode(!previewMode)}
       variant={previewMode ? "default" : "outline"}
       className={previewMode ? "bg-lime-400 text-black hover:bg-lime-300" : "border-stone-600 bg-stone-700 text-white hover:bg-stone-600"}
      >
       <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
       </svg>
       {previewMode ? 'Edit Mode' : 'Preview Mode'}
      </Button>
     )}
    </div>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Pages List */}
    <div className="lg:col-span-1">
     <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-4">
       <h3 className="text-lg font-semibold text-white">Pages ({pages.length})</h3>
       <Button
        onClick={() => window.open('/studio', '_blank')}
        variant="outline"
        size="sm"
        className="border-stone-600 bg-stone-700 text-white hover:bg-stone-600"
       >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Sanity Studio
       </Button>
      </div>
      <div className="space-y-2">
       {pages.map((page) => (
        <div
         key={page._id}
         className={`p-3 rounded-lg border cursor-pointer transition-all ${
          selectedPage?._id === page._id
           ? 'border-lime-400 bg-lime-400/10'
           : 'border-stone-600 bg-stone-700 hover:border-stone-500 hover:bg-stone-600'
         }`}
         onClick={() => setSelectedPage(page)}
        >
         <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
           <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-white truncate">
             {page.title}
            </h3>
            {page.isHomePage && (
             <Badge className="text-xs bg-blue-500/20 text-blue-300 border-blue-500">🏠 Home</Badge>
            )}
            {page.isPublished && (
             <Badge className="text-xs bg-green-500/20 text-green-300 border-green-500">✅ Published</Badge>
            )}
           </div>
           <p className="text-xs text-slate-400 mt-1">
            /{page.slug.current} • {page.sections?.length || 0} sections
           </p>
          </div>
          <div className="flex space-x-1">
           <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
             e.stopPropagation();
             setSelectedPage(page);
             setIsEditingPage(true);
            }}
            className="text-white hover:bg-stone-600"
           >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
           </Button>
           <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
             e.stopPropagation();
             deletePage(page._id);
            }}
            className="text-red-400 hover:bg-red-400/10"
           >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
           </Button>
          </div>
         </div>
        </div>
       ))}
      </div>
     </GlassCard>
    </div>

    {/* Page Editor */}
    <div className="lg:col-span-2">
     {selectedPage ? (
      <div className="space-y-6">
       {/* Page Header */}
       <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-4">
         <h3 className="text-lg font-semibold text-white">
          {isEditingPage ? 'Edit Page' : selectedPage.title}
         </h3>
         <div className="flex space-x-2">
          {isEditingPage ? (
           <>
            <Button
             onClick={() => setIsEditingPage(false)}
             variant="outline"
             size="sm"
             className="border-stone-600 bg-stone-700 text-white hover:bg-stone-600"
            >
             Cancel
            </Button>
            <Button
             onClick={() => {
              // Save changes logic here
              setIsEditingPage(false);
             }}
             size="sm"
             className="bg-lime-400 text-black hover:bg-lime-300"
            >
             Save Changes
            </Button>
           </>
          ) : (
           <Button
            onClick={() => setIsEditingPage(true)}
            variant="outline"
            size="sm"
            className="border-stone-600 bg-stone-700 text-white hover:bg-stone-600"
           >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Page
           </Button>
          )}
         </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
           Page Title
          </label>
          <input
           type="text"
           value={selectedPage.title}
           onChange={(e) => setSelectedPage({ ...selectedPage, title: e.target.value })}
           disabled={!isEditingPage}
           className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400 disabled:bg-stone-700"
          />
         </div>
         <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
           URL Slug
          </label>
          <input
           type="text"
           value={selectedPage.slug.current}
           onChange={(e) => setSelectedPage({ 
            ...selectedPage, 
            slug: { current: e.target.value } 
           })}
           disabled={!isEditingPage}
           className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400 disabled:bg-stone-700"
          />
         </div>
         <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-1">
           Description
          </label>
          <textarea
           value={selectedPage.description || ''}
           onChange={(e) => setSelectedPage({ ...selectedPage, description: e.target.value })}
           disabled={!isEditingPage}
           rows={3}
           className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400 disabled:bg-stone-700"
          />
         </div>
         <div className="flex items-center space-x-4">
          <label className="flex items-center">
           <input
            type="checkbox"
            checked={selectedPage.isHomePage}
            onChange={(e) => setSelectedPage({ ...selectedPage, isHomePage: e.target.checked })}
            disabled={!isEditingPage}
            className="mr-2 text-lime-400 focus:ring-lime-400"
           />
           <span className="text-sm text-slate-300">Home Page</span>
          </label>
          <label className="flex items-center">
           <input
            type="checkbox"
            checked={selectedPage.isPublished}
            onChange={(e) => setSelectedPage({ ...selectedPage, isPublished: e.target.checked })}
            disabled={!isEditingPage}
            className="mr-2 text-lime-400 focus:ring-lime-400"
           />
           <span className="text-sm text-slate-300">Published</span>
          </label>
         </div>
        </div>
       </GlassCard>

       {/* Sections */}
       <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-4">
         <h3 className="text-lg font-semibold text-white">
          Page Sections ({selectedPage.sections?.length || 0})
         </h3>
         {isEditingPage && (
          <div className="flex space-x-2">
           <Button
            onClick={() => {
             // Add section logic
            }}
            size="sm"
            variant="outline"
            className="border-stone-600 bg-stone-700 text-white hover:bg-stone-600"
           >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Section
           </Button>
          </div>
         )}
        </div>
        {selectedPage.sections && selectedPage.sections.length > 0 ? (
         <div className="space-y-3">
          {selectedPage.sections.map((section, index) => (
           <div
            key={index}
            className="flex items-center justify-between p-3 border border-stone-600 bg-stone-700 rounded-lg"
           >
            <div className="flex items-center space-x-3">
             <span className="text-2xl">{getSectionIcon(section._type)}</span>
             <div>
              <h4 className="font-medium text-white">
               {section.title || getSectionName(section._type)}
              </h4>
              <p className="text-sm text-slate-400">
               {section.headline || 'No headline'}
              </p>
             </div>
            </div>
            <div className="flex items-center space-x-2">
             {isEditingPage && (
              <>
               <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                 // Edit section logic
                }}
                className="text-white hover:bg-stone-600"
               >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
               </Button>
               <Button
                size="sm"
                variant="ghost"
                onClick={() => removeSectionFromPage(selectedPage._id, index)}
                className="text-red-400 hover:bg-red-400/10"
               >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
               </Button>
              </>
             )}
             <Badge className={section.isVisible ? "bg-green-500/20 text-green-300 border-green-500" : "bg-slate-500/20 text-slate-300 border-slate-500/30"}>
              {section.isVisible ? 'Visible' : 'Hidden'}
             </Badge>
            </div>
           </div>
          ))}
         </div>
        ) : (
         <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-white">No sections</h3>
          <p className="mt-1 text-sm text-slate-400">
           Get started by adding your first section.
          </p>
          {isEditingPage && (
           <div className="mt-6">
            <Button
             onClick={() => {
              // Add section logic
             }}
             variant="outline"
             className="border-stone-600 bg-stone-700 text-white hover:bg-stone-600"
            >
             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
             </svg>
             Add Section
            </Button>
           </div>
          )}
         </div>
        )}
       </GlassCard>

       {/* Preview */}
       {previewMode && (
        <GlassCard className="p-4">
         <h3 className="text-lg font-semibold text-white mb-4">Page Preview</h3>
         <div className="border border-stone-600 rounded-lg p-4 bg-stone-700">
          <div className="text-center py-8">
           <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
           </svg>
           <h3 className="mt-2 text-sm font-medium text-white">Preview Mode</h3>
           <p className="mt-1 text-sm text-slate-400">
            Live preview will be available here when sections are added.
           </p>
          </div>
         </div>
        </GlassCard>
       )}
      </div>
     ) : (
      <GlassCard className="p-4">
       <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-white">No page selected</h3>
        <p className="mt-1 text-sm text-slate-400">
         Select a page from the list to start editing.
        </p>
       </div>
      </GlassCard>
     )}
    </div>
   </div>

   {/* Create Page Modal */}
   {isCreatingPage && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
     <div className="bg-black/80 border border-stone-600 rounded-lg p-6 w-full max-w-md">
      <h3 className="text-lg font-medium text-white mb-4">Create New Page</h3>
      <div className="space-y-4">
       <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
         Page Title
        </label>
        <input
         type="text"
         placeholder="Enter page title"
         className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
        />
       </div>
       <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
         URL Slug
        </label>
        <input
         type="text"
         placeholder="page-url-slug"
         className="w-full px-3 py-2 border border-stone-600 bg-black/30 text-white rounded-lg focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
        />
       </div>
       <div className="flex items-center space-x-4">
        <label className="flex items-center">
         <input type="checkbox" className="mr-2 text-lime-400 focus:ring-lime-400" />
         <span className="text-sm text-slate-300">Set as Home Page</span>
        </label>
       </div>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
       <Button
        onClick={() => setIsCreatingPage(false)}
        variant="outline"
        className="border-stone-600 bg-stone-700 text-white hover:bg-stone-600"
       >
        Cancel
       </Button>
       <Button
        onClick={createNewPage}
        className="bg-lime-400 text-black hover:bg-lime-300 shadow-[0_0_20px_rgba(163,230,53,0.25)]"
       >
        Create Page
       </Button>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}
