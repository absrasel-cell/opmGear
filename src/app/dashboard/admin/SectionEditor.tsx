'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SectionEditorProps {
  section: any;
  onSave: (sectionData: any) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function SectionEditor({ section, onSave, onCancel, isOpen }: SectionEditorProps) {
  const [sectionData, setSectionData] = useState<any>(section || {});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (section) {
      setSectionData(section);
    }
  }, [section]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(sectionData);
    } catch (error) {
      console.error('Error saving section:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSectionFields = () => {
    if (!sectionData._type) return null;

    switch (sectionData._type) {
      case 'heroSection':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Title
              </label>
              <input
                type="text"
                value={sectionData.title || ''}
                onChange={(e) => setSectionData({ ...sectionData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Headline
              </label>
              <input
                type="text"
                value={sectionData.headline || ''}
                onChange={(e) => setSectionData({ ...sectionData, headline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={sectionData.description || ''}
                onChange={(e) => setSectionData({ ...sectionData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background Color
              </label>
              <select
                value={sectionData.backgroundColor || 'white'}
                onChange={(e) => setSectionData({ ...sectionData, backgroundColor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="white">White</option>
                <option value="gray">Gray</option>
                <option value="light-gray">Light Gray</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isVisible"
                checked={sectionData.isVisible !== false}
                onChange={(e) => setSectionData({ ...sectionData, isVisible: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isVisible" className="text-sm text-gray-700">
                Visible
              </label>
            </div>
          </div>
        );

      case 'productSection':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Title
              </label>
              <input
                type="text"
                value={sectionData.title || ''}
                onChange={(e) => setSectionData({ ...sectionData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Headline
              </label>
              <input
                type="text"
                value={sectionData.headline || ''}
                onChange={(e) => setSectionData({ ...sectionData, headline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Layout
              </label>
              <select
                value={sectionData.layout || 'grid'}
                onChange={(e) => setSectionData({ ...sectionData, layout: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="carousel">Carousel</option>
                <option value="masonry">Masonry</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Columns
              </label>
              <select
                value={sectionData.columns || 3}
                onChange={(e) => setSectionData({ ...sectionData, columns: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value={1}>1 Column</option>
                <option value={2}>2 Columns</option>
                <option value={3}>3 Columns</option>
                <option value={4}>4 Columns</option>
              </select>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sectionData.showPrices !== false}
                  onChange={(e) => setSectionData({ ...sectionData, showPrices: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Show Prices</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sectionData.showDescriptions !== false}
                  onChange={(e) => setSectionData({ ...sectionData, showDescriptions: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Show Descriptions</span>
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isVisible"
                checked={sectionData.isVisible !== false}
                onChange={(e) => setSectionData({ ...sectionData, isVisible: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isVisible" className="text-sm text-gray-700">
                Visible
              </label>
            </div>
          </div>
        );

      case 'testimonialSection':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Title
              </label>
              <input
                type="text"
                value={sectionData.title || ''}
                onChange={(e) => setSectionData({ ...sectionData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Headline
              </label>
              <input
                type="text"
                value={sectionData.headline || ''}
                onChange={(e) => setSectionData({ ...sectionData, headline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Layout
              </label>
              <select
                value={sectionData.layout || 'grid'}
                onChange={(e) => setSectionData({ ...sectionData, layout: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="grid">Grid</option>
                <option value="carousel">Carousel</option>
                <option value="list">List</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isVisible"
                checked={sectionData.isVisible !== false}
                onChange={(e) => setSectionData({ ...sectionData, isVisible: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isVisible" className="text-sm text-gray-700">
                Visible
              </label>
            </div>
          </div>
        );

      case 'contactSection':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Title
              </label>
              <input
                type="text"
                value={sectionData.title || ''}
                onChange={(e) => setSectionData({ ...sectionData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Headline
              </label>
              <input
                type="text"
                value={sectionData.headline || ''}
                onChange={(e) => setSectionData({ ...sectionData, headline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Layout
              </label>
              <select
                value={sectionData.layout || 'side-by-side'}
                onChange={(e) => setSectionData({ ...sectionData, layout: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="side-by-side">Side by Side</option>
                <option value="stacked">Stacked</option>
                <option value="form-only">Form Only</option>
                <option value="info-only">Info Only</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={sectionData.showContactForm !== false}
                onChange={(e) => setSectionData({ ...sectionData, showContactForm: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show Contact Form</span>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isVisible"
                checked={sectionData.isVisible !== false}
                onChange={(e) => setSectionData({ ...sectionData, isVisible: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isVisible" className="text-sm text-gray-700">
                Visible
              </label>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-4">
            <p className="text-gray-500">Section type not supported for editing</p>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Edit {sectionData._type?.replace('Section', '')} Section
            <Badge variant="outline">{sectionData._type}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderSectionFields()}
        </CardContent>
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
