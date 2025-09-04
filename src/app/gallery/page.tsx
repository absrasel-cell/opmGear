"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryImage {
  filename: string;
  src: string;
  alt: string;
}

interface QuoteFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  projectDescription: string;
  timeline: string;
  referenceImage: string;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState<QuoteFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerCompany: '',
    projectDescription: '',
    timeline: '',
    referenceImage: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Generate gallery images array from the directory listing
  useEffect(() => {
    const galleryImages: GalleryImage[] = [
      // 2018 Images
      { filename: '20181011_201412-- .webp', src: '/uploads/gallery/20181011_201412-- .webp', alt: 'Custom Baseball Cap Design' },
      { filename: '20181011_202107-- .webp', src: '/uploads/gallery/20181011_202107-- .webp', alt: 'Professional Cap Embroidery' },
      { filename: '20181021_094657-- .webp', src: '/uploads/gallery/20181021_094657-- .webp', alt: 'Corporate Team Caps' },
      { filename: '20181030_181443-- .webp', src: '/uploads/gallery/20181030_181443-- .webp', alt: 'Custom Logo Application' },
      { filename: '20181030_181522-- .webp', src: '/uploads/gallery/20181030_181522-- .webp', alt: 'Premium Cap Manufacturing' },
      { filename: '20181030_181627-- .webp', src: '/uploads/gallery/20181030_181627-- .webp', alt: 'High-Quality Embroidery Work' },
      { filename: '20181101_173241-- .webp', src: '/uploads/gallery/20181101_173241-- .webp', alt: 'Custom Brand Merchandise' },
      { filename: '20181206_161153-- .webp', src: '/uploads/gallery/20181206_161153-- .webp', alt: 'Team Spirit Caps' },
      { filename: '20181211_143402-- .webp', src: '/uploads/gallery/20181211_143402-- .webp', alt: 'Professional Logo Design' },
      { filename: '20181211_173048-- .webp', src: '/uploads/gallery/20181211_173048-- .webp', alt: 'Quality Cap Construction' },
      
      // 2019 Images
      { filename: '20190304_154749-- .webp', src: '/uploads/gallery/20190304_154749-- .webp', alt: 'Spring Collection Caps' },
      { filename: '20190304_155151-- .webp', src: '/uploads/gallery/20190304_155151-- .webp', alt: 'Custom Color Combinations' },
      { filename: '20190304_155256-- .webp', src: '/uploads/gallery/20190304_155256-- .webp', alt: 'Detailed Embroidery Work' },
      { filename: '20190304_163955-- .webp', src: '/uploads/gallery/20190304_163955-- .webp', alt: 'Premium Material Caps' },
      { filename: '20190324_165012- .webp', src: '/uploads/gallery/20190324_165012- .webp', alt: 'Sports Team Branding' },
      { filename: '20190324_165012-- .webp', src: '/uploads/gallery/20190324_165012-- .webp', alt: 'Athletic Cap Designs' },
      { filename: '20190409_185429-- .webp', src: '/uploads/gallery/20190409_185429-- .webp', alt: 'Corporate Identity Caps' },
      { filename: '20190429_182735-- .webp', src: '/uploads/gallery/20190429_182735-- .webp', alt: 'Custom Business Merchandise' },
      { filename: '20190530_172822-- .webp', src: '/uploads/gallery/20190530_172822-- .webp', alt: 'Summer Collection Designs' },
      { filename: '20190618_171155-- .webp', src: '/uploads/gallery/20190618_171155-- .webp', alt: 'Professional Cap Finishing' },
      { filename: '20190618_171403-- .webp', src: '/uploads/gallery/20190618_171403-- .webp', alt: 'Quality Control Standards' },
      { filename: '20190625_183009-- .webp', src: '/uploads/gallery/20190625_183009-- .webp', alt: 'Custom Logo Placement' },
      { filename: '20190625_183243-- .webp', src: '/uploads/gallery/20190625_183243-- .webp', alt: 'Brand Recognition Caps' },
      { filename: '20190625_183418-- .webp', src: '/uploads/gallery/20190625_183418-- .webp', alt: 'Team Unity Designs' },
      { filename: '20190701_192718-- .webp', src: '/uploads/gallery/20190701_192718-- .webp', alt: 'Patriotic Cap Designs' },
      { filename: '20190702_205320-- .webp', src: '/uploads/gallery/20190702_205320-- .webp', alt: 'Independence Day Collection' },
      { filename: '20190702_205437-- .webp', src: '/uploads/gallery/20190702_205437-- .webp', alt: 'Red White Blue Caps' },
      { filename: '20190702_205525-- .webp', src: '/uploads/gallery/20190702_205525-- .webp', alt: 'American Flag Embroidery' },
      { filename: '20190804_153808-- .webp', src: '/uploads/gallery/20190804_153808-- .webp', alt: 'Summer Event Caps' },
      { filename: '20190804_153907-- .webp', src: '/uploads/gallery/20190804_153907-- .webp', alt: 'Outdoor Activity Gear' },
      { filename: '20190912_121251-- .webp', src: '/uploads/gallery/20190912_121251-- .webp', alt: 'Fall Season Collection' },
      { filename: '20191012_135241-- .webp', src: '/uploads/gallery/20191012_135241-- .webp', alt: 'Autumn Color Schemes' },
      { filename: '20191012_135802-- .webp', src: '/uploads/gallery/20191012_135802-- .webp', alt: 'Seasonal Merchandise' },
      { filename: '20191020_145153-- .webp', src: '/uploads/gallery/20191020_145153-- .webp', alt: 'Halloween Theme Caps' },
      { filename: '20191020_145349-- .webp', src: '/uploads/gallery/20191020_145349-- .webp', alt: 'Festive Cap Designs' },
      { filename: '20191020_145458-- .webp', src: '/uploads/gallery/20191020_145458-- .webp', alt: 'Special Event Merchandise' },
      
      // 2020 Images
      { filename: '20200729_193247-- .webp', src: '/uploads/gallery/20200729_193247-- .webp', alt: 'Summer 2020 Collection' },
      { filename: '20200824_182431-- .webp', src: '/uploads/gallery/20200824_182431-- .webp', alt: 'Late Summer Designs' },
      { filename: '20200903_170913-- .webp', src: '/uploads/gallery/20200903_170913-- .webp', alt: 'Back to School Caps' },
      { filename: '20200904_090942-- .webp', src: '/uploads/gallery/20200904_090942-- .webp', alt: 'Educational Institution Branding' },
      { filename: '20200929_125559-- .webp', src: '/uploads/gallery/20200929_125559-- .webp', alt: 'Fall Marketing Campaign' },
      { filename: '20201022_134948-- .webp', src: '/uploads/gallery/20201022_134948-- .webp', alt: 'October Promotional Caps' },
      { filename: '20201108_130047-- .webp', src: '/uploads/gallery/20201108_130047-- .webp', alt: 'Election Campaign Merchandise' },
      
      // 2021 Images
      { filename: '20210417_190126-- .webp', src: '/uploads/gallery/20210417_190126-- .webp', alt: 'Spring 2021 Revival' },
      { filename: '20210811_195810-- .webp', src: '/uploads/gallery/20210811_195810-- .webp', alt: 'Summer Comeback Collection' },
      { filename: '20210811_195906-- .webp', src: '/uploads/gallery/20210811_195906-- .webp', alt: 'Premium Quality Assurance' },
      { filename: '20210811_195926-- .webp', src: '/uploads/gallery/20210811_195926-- .webp', alt: 'Professional Manufacturing' },
      { filename: '20210811_200005-- .webp', src: '/uploads/gallery/20210811_200005-- .webp', alt: 'Quality Control Testing' },
      { filename: '20210811_200026-- .webp', src: '/uploads/gallery/20210811_200026-- .webp', alt: 'Final Product Inspection' },
      { filename: '20210811_200127-- .webp', src: '/uploads/gallery/20210811_200127-- .webp', alt: 'Ready for Delivery' },
      { filename: '20210917_133414-- .webp', src: '/uploads/gallery/20210917_133414-- .webp', alt: 'September Collection Launch' },
      { filename: '20210917_134750-- .webp', src: '/uploads/gallery/20210917_134750-- .webp', alt: 'New Design Innovations' },
      
      // WhatsApp and IMG Series
      { filename: 'IMG_20181202_222142-- .webp', src: '/uploads/gallery/IMG_20181202_222142-- .webp', alt: 'Mobile Photography Showcase' },
      { filename: 'IMG_20190503_182611-- .webp', src: '/uploads/gallery/IMG_20190503_182611-- .webp', alt: 'Customer Satisfaction Photos' },
      { filename: 'IMG-20180820-WA0008-- .webp', src: '/uploads/gallery/IMG-20180820-WA0008-- .webp', alt: 'WhatsApp Customer Sharing' },
      { filename: 'IMG-20180903-WA0000-- .webp', src: '/uploads/gallery/IMG-20180903-WA0000-- .webp', alt: 'Social Media Engagement' },
      { filename: 'IMG-20180904-WA0013-- .webp', src: '/uploads/gallery/IMG-20180904-WA0013-- .webp', alt: 'Customer Review Images' },
      { filename: 'IMG-20180904-WA0014-- .webp', src: '/uploads/gallery/IMG-20180904-WA0014-- .webp', alt: 'User Generated Content' },
      { filename: 'IMG-20180904-WA0015-- .webp', src: '/uploads/gallery/IMG-20180904-WA0015-- .webp', alt: 'Community Feedback Photos' },
      { filename: 'IMG-20180904-WA0017-- .webp', src: '/uploads/gallery/IMG-20180904-WA0017-- .webp', alt: 'Real World Applications' },
      { filename: 'IMG-20180904-WA0018-- .webp', src: '/uploads/gallery/IMG-20180904-WA0018-- .webp', alt: 'In-Use Demonstrations' },
      { filename: 'IMG-20180904-WA0020-- .webp', src: '/uploads/gallery/IMG-20180904-WA0020-- .webp', alt: 'Practical Usage Scenarios' },
      { filename: 'IMG-20180904-WA0022-- .webp', src: '/uploads/gallery/IMG-20180904-WA0022-- .webp', alt: 'Field Testing Results' },
      { filename: 'IMG-20180904-WA0024-- .webp', src: '/uploads/gallery/IMG-20180904-WA0024-- .webp', alt: 'Performance Validation' },
      { filename: 'IMG-20180904-WA0025-- .webp', src: '/uploads/gallery/IMG-20180904-WA0025-- .webp', alt: 'Quality Assessment Photos' },
      { filename: 'IMG-20180904-WA0026-- .webp', src: '/uploads/gallery/IMG-20180904-WA0026-- .webp', alt: 'Final Approval Images' },
      
      // Additional IMG series from various dates
      { filename: 'IMG-20180924-WA0013-- .webp', src: '/uploads/gallery/IMG-20180924-WA0013-- .webp', alt: 'September Batch Quality' },
      { filename: 'IMG-20180926-WA0002-- .webp', src: '/uploads/gallery/IMG-20180926-WA0002-- .webp', alt: 'Late September Production' },
      { filename: 'IMG-20180926-WA0003-- .webp', src: '/uploads/gallery/IMG-20180926-WA0003-- .webp', alt: 'Multi-Design Collection' },
      { filename: 'IMG-20180926-WA0005-- .webp', src: '/uploads/gallery/IMG-20180926-WA0005-- .webp', alt: 'Variety Pack Options' },
      { filename: 'IMG-20181002-WA0014-- .webp', src: '/uploads/gallery/IMG-20181002-WA0014-- .webp', alt: 'October Production Run' },
      { filename: 'IMG-20181004-WA0001-- .webp', src: '/uploads/gallery/IMG-20181004-WA0001-- .webp', alt: 'Weekly Quality Check' },
      { filename: 'IMG-20181011-WA0017-- .webp', src: '/uploads/gallery/IMG-20181011-WA0017-- .webp', alt: 'Mid-Month Delivery' },
      { filename: 'IMG-20181030-WA0005-- .webp', src: '/uploads/gallery/IMG-20181030-WA0005-- .webp', alt: 'Halloween Special Edition' },
      { filename: 'IMG-20181030-WA0011-- .webp', src: '/uploads/gallery/IMG-20181030-WA0011-- .webp', alt: 'Seasonal Color Variants' },
      { filename: 'IMG-20181101-WA0013-- .webp', src: '/uploads/gallery/IMG-20181101-WA0013-- .webp', alt: 'November Collection Launch' },
      { filename: 'IMG-20181125-WA0001-- .webp', src: '/uploads/gallery/IMG-20181125-WA0001-- .webp', alt: 'Thanksgiving Themed Caps' },
      { filename: 'IMG-20181202-WA0001-- .webp', src: '/uploads/gallery/IMG-20181202-WA0001-- .webp', alt: 'December Holiday Collection' },
      { filename: 'IMG-20181206-WA0006-- .webp', src: '/uploads/gallery/IMG-20181206-WA0006-- .webp', alt: 'Winter Holiday Designs' },
      { filename: 'IMG-20181206-WA0008-- .webp', src: '/uploads/gallery/IMG-20181206-WA0008-- .webp', alt: 'Festive Season Merchandise' },
      
      // 2019 IMG Series
      { filename: 'IMG-20190302-WA0047-- .webp', src: '/uploads/gallery/IMG-20190302-WA0047-- .webp', alt: 'Early Spring Designs 2019' },
      { filename: 'IMG-20190304-WA0007-- .webp', src: '/uploads/gallery/IMG-20190304-WA0007-- .webp', alt: 'March Production Quality' },
      { filename: 'IMG-20190504-WA0015-- .webp', src: '/uploads/gallery/IMG-20190504-WA0015-- .webp', alt: 'May Collection Samples' },
      { filename: 'IMG-20190524-WA0007-- .webp', src: '/uploads/gallery/IMG-20190524-WA0007-- .webp', alt: 'Late Spring Production' },
      { filename: 'IMG-20190524-WA0017-- .webp', src: '/uploads/gallery/IMG-20190524-WA0017-- .webp', alt: 'Memorial Day Special' },
      { filename: 'IMG-20190618-WA0000-- .webp', src: '/uploads/gallery/IMG-20190618-WA0000-- .webp', alt: 'Father\'s Day Collection' },
      { filename: 'IMG-20190618-WA0002-- .webp', src: '/uploads/gallery/IMG-20190618-WA0002-- .webp', alt: 'Gift Set Options' },
      { filename: 'IMG-20190625-WA0004-- .webp', src: '/uploads/gallery/IMG-20190625-WA0004-- .webp', alt: 'End of June Batch' },
      { filename: 'IMG-20190625-WA0020-- .webp', src: '/uploads/gallery/IMG-20190625-WA0020-- .webp', alt: 'Summer Solstice Designs' },
      { filename: 'IMG-20190625-WA0021-- .webp', src: '/uploads/gallery/IMG-20190625-WA0021-- .webp', alt: 'Seasonal Transition Caps' },
      { filename: 'IMG-20190625-WA0026-- .webp', src: '/uploads/gallery/IMG-20190625-WA0026-- .webp', alt: 'Mid-Year Collection Review' },
      { filename: 'IMG-20190625-WA0031-- .webp', src: '/uploads/gallery/IMG-20190625-WA0031-- .webp', alt: 'Quality Milestone Achievement' },
      { filename: 'IMG-20190625-WA0049-- .webp', src: '/uploads/gallery/IMG-20190625-WA0049-- .webp', alt: 'Customer Satisfaction Peak' },
      { filename: 'IMG-20190702-WA0025-- .webp', src: '/uploads/gallery/IMG-20190702-WA0025-- .webp', alt: 'July 4th Patriotic Series' },
      { filename: 'IMG-20190819-WA0013-- .webp', src: '/uploads/gallery/IMG-20190819-WA0013-- .webp', alt: 'Late Summer Excellence' },
      { filename: 'IMG-20190824-WA0001-- .webp', src: '/uploads/gallery/IMG-20190824-WA0001-- .webp', alt: 'End of Summer Showcase' },
      { filename: 'IMG-20190926-WA0011-- .webp', src: '/uploads/gallery/IMG-20190926-WA0011-- .webp', alt: 'Fall Equinox Collection' },
      { filename: 'IMG-20191020-WA0000-- .webp', src: '/uploads/gallery/IMG-20191020-WA0000-- .webp', alt: 'October Harvest Themes' },
      { filename: 'IMG-20191020-WA0004-- .webp', src: '/uploads/gallery/IMG-20191020-WA0004-- .webp', alt: 'Autumn Color Palette' },
      { filename: 'IMG-20191020-WA0007-- .webp', src: '/uploads/gallery/IMG-20191020-WA0007-- .webp', alt: 'Fall Fashion Forward' },
      { filename: 'IMG-20191026-WA0003-- .webp', src: '/uploads/gallery/IMG-20191026-WA0003-- .webp', alt: 'Pre-Halloween Collection' },
      { filename: 'IMG-20191110-WA0009-- .webp', src: '/uploads/gallery/IMG-20191110-WA0009-- .webp', alt: 'Veterans Day Honor Caps' },
      
      // 2020 IMG Series
      { filename: 'IMG-20200111-WA0003-- .webp', src: '/uploads/gallery/IMG-20200111-WA0003-- .webp', alt: 'New Year New Designs 2020' },
      { filename: 'IMG-20200111-WA0013-- .webp', src: '/uploads/gallery/IMG-20200111-WA0013-- .webp', alt: 'January Fresh Start' },
      { filename: 'IMG-20200129-WA0008-- .webp', src: '/uploads/gallery/IMG-20200129-WA0008-- .webp', alt: 'End of January Quality' },
      { filename: 'IMG-20200129-WA0017-- .webp', src: '/uploads/gallery/IMG-20200129-WA0017-- .webp', alt: 'Winter Production Peak' },
      { filename: 'IMG-20200129-WA0024-- .webp', src: '/uploads/gallery/IMG-20200129-WA0024-- .webp', alt: 'Cold Weather Durability' },
      { filename: 'IMG-20200129-WA0039-- .webp', src: '/uploads/gallery/IMG-20200129-WA0039-- .webp', alt: 'Thermal Performance Testing' },
      { filename: 'IMG-20200129-WA0054-- .webp', src: '/uploads/gallery/IMG-20200129-WA0054-- .webp', alt: 'Quality Assurance Standards' },
      { filename: 'IMG-20200129-WA0056-- .webp', src: '/uploads/gallery/IMG-20200129-WA0056-- .webp', alt: 'Manufacturing Excellence' },
      { filename: 'IMG-20200226-WA0005-- .webp', src: '/uploads/gallery/IMG-20200226-WA0005-- .webp', alt: 'February Production Milestone' },
      { filename: 'IMG-20201214-WA0000- .webp', src: '/uploads/gallery/IMG-20201214-WA0000- .webp', alt: 'December Holiday Rush' },
      
      // 2024 Latest Collection
      { filename: 'IMG-20240811-WA0004- .webp', src: '/uploads/gallery/IMG-20240811-WA0004- .webp', alt: 'August 2024 Innovation' },
      { filename: 'IMG-20240811-WA0005- .webp', src: '/uploads/gallery/IMG-20240811-WA0005- .webp', alt: 'Latest Technology Integration' },
      { filename: 'IMG-20240811-WA0009- .webp', src: '/uploads/gallery/IMG-20240811-WA0009- .webp', alt: 'Advanced Manufacturing Process' },
      { filename: 'IMG-20240813-WA0007- .webp', src: '/uploads/gallery/IMG-20240813-WA0007- .webp', alt: 'Mid-August Production' },
      { filename: 'IMG-20240813-WA0010- .webp', src: '/uploads/gallery/IMG-20240813-WA0010- .webp', alt: 'Summer 2024 Excellence' },
      { filename: 'IMG-20240813-WA0011- .webp', src: '/uploads/gallery/IMG-20240813-WA0011- .webp', alt: 'Peak Season Quality' },
      { filename: 'IMG-20240814-WA0007- .webp', src: '/uploads/gallery/IMG-20240814-WA0007- .webp', alt: 'Daily Quality Control' },
      { filename: 'IMG-20240814-WA0010- .webp', src: '/uploads/gallery/IMG-20240814-WA0010- .webp', alt: 'Continuous Improvement' },
      { filename: 'IMG-20240827-WA0041- .webp', src: '/uploads/gallery/IMG-20240827-WA0041- .webp', alt: 'Late August Perfection' },
      { filename: 'IMG-20240827-WA0051- .webp', src: '/uploads/gallery/IMG-20240827-WA0051- .webp', alt: 'End of Summer Collection' },
      { filename: 'IMG-20240901-WA0020- .webp', src: '/uploads/gallery/IMG-20240901-WA0020- .webp', alt: 'Labor Day Special Edition' },
      
      // September 2024 - Latest Batch
      { filename: 'IMG-20240914-WA0006- .webp', src: '/uploads/gallery/IMG-20240914-WA0006- .webp', alt: 'September 2024 - Fresh Designs' },
      { filename: 'IMG-20240914-WA0007- .webp', src: '/uploads/gallery/IMG-20240914-WA0007- .webp', alt: 'Latest Fashion Trends' },
      { filename: 'IMG-20240914-WA0008- .webp', src: '/uploads/gallery/IMG-20240914-WA0008- .webp', alt: 'Modern Cap Aesthetics' },
      { filename: 'IMG-20240914-WA0009- .webp', src: '/uploads/gallery/IMG-20240914-WA0009- .webp', alt: 'Contemporary Style Elements' },
      { filename: 'IMG-20240914-WA0010- .webp', src: '/uploads/gallery/IMG-20240914-WA0010- .webp', alt: 'Current Design Philosophy' },
      { filename: 'IMG-20240914-WA0011- .webp', src: '/uploads/gallery/IMG-20240914-WA0011- .webp', alt: 'Innovative Techniques' },
      { filename: 'IMG-20240914-WA0012- .webp', src: '/uploads/gallery/IMG-20240914-WA0012- .webp', alt: 'Cutting-Edge Production' },
      { filename: 'IMG-20240914-WA0013- .webp', src: '/uploads/gallery/IMG-20240914-WA0013- .webp', alt: 'Premium Quality Assurance' },
      { filename: 'IMG-20240914-WA0014- .webp', src: '/uploads/gallery/IMG-20240914-WA0014- .webp', alt: 'Excellence in Craftsmanship' },
      { filename: 'IMG-20240914-WA0015- .webp', src: '/uploads/gallery/IMG-20240914-WA0015- .webp', alt: 'Artistic Design Integration' },
      { filename: 'IMG-20240914-WA0016- .webp', src: '/uploads/gallery/IMG-20240914-WA0016- .webp', alt: 'Precision Manufacturing' },
      { filename: 'IMG-20240914-WA0017- .webp', src: '/uploads/gallery/IMG-20240914-WA0017- .webp', alt: 'Detail-Oriented Production' },
      { filename: 'IMG-20240914-WA0018- .webp', src: '/uploads/gallery/IMG-20240914-WA0018- .webp', alt: 'Customer-Focused Design' },
      { filename: 'IMG-20240914-WA0019- .webp', src: '/uploads/gallery/IMG-20240914-WA0019- .webp', alt: 'Market-Leading Innovation' },
      { filename: 'IMG-20240914-WA0020- .webp', src: '/uploads/gallery/IMG-20240914-WA0020- .webp', alt: 'Industry Best Practices' },
      { filename: 'IMG-20240914-WA0021- .webp', src: '/uploads/gallery/IMG-20240914-WA0021- .webp', alt: 'Professional Grade Quality' },
      { filename: 'IMG-20240914-WA0022- .webp', src: '/uploads/gallery/IMG-20240914-WA0022- .webp', alt: 'Sustainable Manufacturing' },
      { filename: 'IMG-20240914-WA0023- .webp', src: '/uploads/gallery/IMG-20240914-WA0023- .webp', alt: 'Eco-Friendly Production' },
      { filename: 'IMG-20240914-WA0024- .webp', src: '/uploads/gallery/IMG-20240914-WA0024- .webp', alt: 'Green Manufacturing Initiative' },
      { filename: 'IMG-20240914-WA0027- .webp', src: '/uploads/gallery/IMG-20240914-WA0027- .webp', alt: 'Environmental Responsibility' },
      { filename: 'IMG-20240914-WA0028- .webp', src: '/uploads/gallery/IMG-20240914-WA0028- .webp', alt: 'Sustainable Materials Usage' },
      { filename: 'IMG-20240914-WA0029- .webp', src: '/uploads/gallery/IMG-20240914-WA0029- .webp', alt: 'Ethical Production Standards' },
      { filename: 'IMG-20240914-WA0030- .webp', src: '/uploads/gallery/IMG-20240914-WA0030- .webp', alt: 'Corporate Social Responsibility' },
      { filename: 'IMG-20240914-WA0031- .webp', src: '/uploads/gallery/IMG-20240914-WA0031- .webp', alt: 'Community Impact Focus' },
      { filename: 'IMG-20240914-WA0032- .webp', src: '/uploads/gallery/IMG-20240914-WA0032- .webp', alt: 'Social Value Creation' },
      { filename: 'IMG-20240914-WA0033- .webp', src: '/uploads/gallery/IMG-20240914-WA0033- .webp', alt: 'Stakeholder Engagement' },
      { filename: 'IMG-20240914-WA0034- .webp', src: '/uploads/gallery/IMG-20240914-WA0034- .webp', alt: 'Partnership Development' },
      { filename: 'IMG-20240914-WA0035- .webp', src: '/uploads/gallery/IMG-20240914-WA0035- .webp', alt: 'Collaborative Excellence' },
      { filename: 'IMG-20240914-WA0038- .webp', src: '/uploads/gallery/IMG-20240914-WA0038- .webp', alt: 'Team Achievement Recognition' },
      { filename: 'IMG-20240914-WA0039- .webp', src: '/uploads/gallery/IMG-20240914-WA0039- .webp', alt: 'Employee Dedication Showcase' },
      { filename: 'IMG-20240914-WA0041- .webp', src: '/uploads/gallery/IMG-20240914-WA0041- .webp', alt: 'Workplace Excellence Culture' },
      { filename: 'IMG-20240914-WA0042- .webp', src: '/uploads/gallery/IMG-20240914-WA0042- .webp', alt: 'Professional Development Focus' },
      { filename: 'IMG-20240914-WA0043- .webp', src: '/uploads/gallery/IMG-20240914-WA0043- .webp', alt: 'Skill Enhancement Programs' },
      { filename: 'IMG-20240914-WA0044- .webp', src: '/uploads/gallery/IMG-20240914-WA0044- .webp', alt: 'Knowledge Transfer Initiative' },
      { filename: 'IMG-20240914-WA0045- .webp', src: '/uploads/gallery/IMG-20240914-WA0045- .webp', alt: 'Innovation Workshop Results' },
      { filename: 'IMG-20240914-WA0072- .webp', src: '/uploads/gallery/IMG-20240914-WA0072- .webp', alt: 'Advanced Technique Implementation' },
      { filename: 'IMG-20240914-WA0073- .webp', src: '/uploads/gallery/IMG-20240914-WA0073- .webp', alt: 'Technology Integration Success' },
      { filename: 'IMG-20240914-WA0075- .webp', src: '/uploads/gallery/IMG-20240914-WA0075- .webp', alt: 'Digital Transformation Impact' },
      { filename: 'IMG-20240914-WA0079- .webp', src: '/uploads/gallery/IMG-20240914-WA0079- .webp', alt: 'Automated Process Excellence' },
      { filename: 'IMG-20240914-WA0085- .webp', src: '/uploads/gallery/IMG-20240914-WA0085- .webp', alt: 'Smart Manufacturing Solutions' },
      { filename: 'IMG-20240914-WA0086- .webp', src: '/uploads/gallery/IMG-20240914-WA0086- .webp', alt: 'IoT Integration Benefits' },
      { filename: 'IMG-20240914-WA0088- .webp', src: '/uploads/gallery/IMG-20240914-WA0088- .webp', alt: 'Data-Driven Optimization' },
      { filename: 'IMG-20240914-WA0089- .webp', src: '/uploads/gallery/IMG-20240914-WA0089- .webp', alt: 'Analytics-Based Improvements' },
      { filename: 'IMG-20240914-WA0090- .webp', src: '/uploads/gallery/IMG-20240914-WA0090- .webp', alt: 'Performance Metrics Excellence' },
      { filename: 'IMG-20240914-WA0091- .webp', src: '/uploads/gallery/IMG-20240914-WA0091- .webp', alt: 'KPI Achievement Showcase' },
      { filename: 'IMG-20240914-WA0092- .webp', src: '/uploads/gallery/IMG-20240914-WA0092- .webp', alt: 'Benchmark Setting Results' },
      { filename: 'IMG-20240914-WA0093- .webp', src: '/uploads/gallery/IMG-20240914-WA0093- .webp', alt: 'Industry Leadership Position' },
      { filename: 'IMG-20240914-WA0095- .webp', src: '/uploads/gallery/IMG-20240914-WA0095- .webp', alt: 'Market Dominance Indicators' },
      { filename: 'IMG-20240914-WA0096- .webp', src: '/uploads/gallery/IMG-20240914-WA0096- .webp', alt: 'Competitive Advantage Demonstration' },
      { filename: 'IMG-20240914-WA0097- .webp', src: '/uploads/gallery/IMG-20240914-WA0097- .webp', alt: 'Strategic Position Strengthening' },
      { filename: 'IMG-20240914-WA0098- .webp', src: '/uploads/gallery/IMG-20240914-WA0098- .webp', alt: 'Long-term Vision Realization' },
      { filename: 'IMG-20240914-WA0099- .webp', src: '/uploads/gallery/IMG-20240914-WA0099- .webp', alt: 'Future-Ready Capabilities' },
      { filename: 'IMG-20240914-WA0101- .webp', src: '/uploads/gallery/IMG-20240914-WA0101- .webp', alt: 'Next-Generation Solutions' },
      { filename: 'IMG-20240914-WA0102- .webp', src: '/uploads/gallery/IMG-20240914-WA0102- .webp', alt: 'Tomorrow\'s Technology Today' },
      { filename: 'IMG-20240914-WA0104- .webp', src: '/uploads/gallery/IMG-20240914-WA0104- .webp', alt: 'Progressive Innovation Approach' },
      { filename: 'IMG-20240914-WA0107- .webp', src: '/uploads/gallery/IMG-20240914-WA0107- .webp', alt: 'Continuous Evolution Commitment' },
      { filename: 'IMG-20240914-WA0109- .webp', src: '/uploads/gallery/IMG-20240914-WA0109- .webp', alt: 'Never-Ending Improvement Journey' },
      
      // WhatsApp September 2024 Series
      { filename: 'WhatsApp Image 2024-09-14 at 13.12.49_b78b8e6a- .webp', src: '/uploads/gallery/WhatsApp Image 2024-09-14 at 13.12.49_b78b8e6a- .webp', alt: 'WhatsApp September Collection' },
      { filename: 'WhatsApp Image 2024-09-14 at 13.12.50_491c1616- .webp', src: '/uploads/gallery/WhatsApp Image 2024-09-14 at 13.12.50_491c1616- .webp', alt: 'Social Media Showcase' },
      { filename: 'WhatsApp Image 2024-09-14 at 13.13.00_b5a0f1d9- .webp', src: '/uploads/gallery/WhatsApp Image 2024-09-14 at 13.13.00_b5a0f1d9- .webp', alt: 'Instant Communication Quality' },
      { filename: 'WhatsApp Image 2024-09-14 at 13.13.00_f33d5b85- .webp', src: '/uploads/gallery/WhatsApp Image 2024-09-14 at 13.13.00_f33d5b85- .webp', alt: 'Real-Time Production Updates' },
      { filename: 'WhatsApp Image 2024-09-14 at 13.13.01_8e1b7d0a- .webp', src: '/uploads/gallery/WhatsApp Image 2024-09-14 at 13.13.01_8e1b7d0a- .webp', alt: 'Live Quality Monitoring' },
      { filename: 'WhatsApp Image 2024-09-14 at 13.13.21_2cdc2f94- .webp', src: '/uploads/gallery/WhatsApp Image 2024-09-14 at 13.13.21_2cdc2f94- .webp', alt: 'Instant Feedback Loop' },
      { filename: 'WhatsApp Image 2024-09-14 at 13.13.22_730be9bc- .webp', src: '/uploads/gallery/WhatsApp Image 2024-09-14 at 13.13.22_730be9bc- .webp', alt: 'Rapid Response Quality' },
      { filename: 'WhatsApp Image 2024-09-14 at 13.13.22_891e6bfe- .webp', src: '/uploads/gallery/WhatsApp Image 2024-09-14 at 13.13.22_891e6bfe- .webp', alt: 'Mobile-First Documentation' },
      { filename: 'WhatsApp Image 2024-09-18 at 13.48.32_3260d869- .webp', src: '/uploads/gallery/WhatsApp Image 2024-09-18 at 13.48.32_3260d869- .webp', alt: 'Mid-September Excellence' },
      { filename: 'WhatsApp Image 2024-09-18 at 13.48.45_6c82f8f0- .webp', src: '/uploads/gallery/WhatsApp Image 2024-09-18 at 13.48.45_6c82f8f0- .webp', alt: 'Latest Quality Standards' }
    ];

    setImages(galleryImages);
    setIsLoading(false);
  }, []);

  const openQuoteModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setQuoteForm(prev => ({ ...prev, referenceImage: imageUrl }));
    setIsQuoteModalOpen(true);
  };

  const closeQuoteModal = () => {
    setIsQuoteModalOpen(false);
    setSelectedImage(null);
    setSubmitStatus('idle');
  };

  const handleFormChange = (field: keyof QuoteFormData, value: string) => {
    setQuoteForm(prev => ({ ...prev, [field]: value }));
  };

  const submitQuote = async () => {
    if (!quoteForm.customerName || !quoteForm.customerEmail || !quoteForm.projectDescription) {
      alert('Please fill in all required fields (Name, Email, Project Description)');
      return;
    }

    console.log('Starting quote submission...', {
      customerName: quoteForm.customerName,
      customerEmail: quoteForm.customerEmail,
      referenceImage: quoteForm.referenceImage
    });

    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      const requestBody = {
        productSlug: 'gallery-reference',
        productName: 'Custom Cap from Gallery Reference',
        customerInfo: {
          name: quoteForm.customerName,
          email: quoteForm.customerEmail,
          phone: quoteForm.customerPhone,
          company: quoteForm.customerCompany,
        },
        requirements: {
          referenceImage: quoteForm.referenceImage,
          projectDescription: quoteForm.projectDescription,
          timeline: quoteForm.timeline,
          additionalNotes: 'Quote request from gallery reference image',
        },
      };

      console.log('Request body:', requestBody);

      const response = await fetch('/api/gallery-quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok) {
        console.log('Quote submitted successfully!');
        setSubmitStatus('success');
        // Reset form
        setQuoteForm({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          customerCompany: '',
          projectDescription: '',
          timeline: '',
          referenceImage: ''
        });
        
        // Auto-close modal after 3 seconds
        setTimeout(() => {
          closeQuoteModal();
        }, 3000);
      } else {
        console.error('Quote submission failed:', responseData);
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-black/10" />
        </div>
        <div className="fixed inset-0 -z-5 pointer-events-none">
          <div className="absolute -top-24 -left-24 h-[480px] w-[480px] rounded-full bg-lime-400/15 blur-[120px]" />
          <div className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-purple-500/15 blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-[120px]" />
        </div>
        <main className="min-h-screen flex items-center justify-center">
          <div className="glass-morphism rounded-2xl p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-48 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-32"></div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {/* Background layers */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-black/10" />
      </div>
      <div className="fixed inset-0 -z-5 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-[480px] w-[480px] rounded-full bg-lime-400/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-purple-500/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.035),_transparent_60%)]" />
      </div>

      <style jsx>{`
        body { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; opacity: 0; }
        .animate-slide-up { animation: slideUp 0.8s ease-out forwards; opacity: 0; transform: translateY(20px); }
        .animate-delay-200 { animation-delay: 0.2s; }
        .animate-delay-400 { animation-delay: 0.4s; }
        .animate-delay-600 { animation-delay: 0.6s; }
        .stagger-animation { animation: slideUp 0.8s ease-out forwards; opacity: 0; transform: translateY(20px); }
        
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
        
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        
        @media (max-width: 768px) {
          .gallery-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
          }
        }
      `}</style>

      <main>
        <section className="mr-auto ml-auto pr-6 pb-20 pl-6 mt-[55px]" style={{maxWidth: '1850px'}}>
          <div className="md:rounded-[40px] md:p-16 lg:p-24 glass-morphism rounded-b-3xl pt-16 pr-8 pb-16 pl-8 min-h-[90vh] animate-fade-in">
            
            {/* Gallery Header */}
            <div className="text-center mb-12 animate-slide-up">
              <div className="inline-flex items-center gap-3 glass-morphism-light rounded-full px-6 py-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-lime-400 to-green-500 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                </div>
                <span className="font-medium text-sm font-sans">Showcase Gallery - {images.length} Custom Caps</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bricolage font-semibold mb-6 animate-slide-up animate-delay-200">
                Our Work Gallery
              </h1>
              
              <p className="text-lg text-stone-300 max-w-3xl mx-auto font-sans animate-slide-up animate-delay-400">
                Explore our extensive collection of custom baseball caps created for teams, businesses, and individuals. 
                Each design showcases our commitment to quality craftsmanship and attention to detail. 
                Click on any image to request a quote for a similar design.
              </p>
            </div>

            {/* Gallery Grid */}
            <div className="gallery-grid">
              {images.map((image, index) => (
                <motion.div 
                  key={image.filename}
                  className="group relative aspect-square rounded-2xl overflow-hidden glass-morphism-subtle shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer stagger-animation"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onMouseEnter={() => setHoveredImage(image.filename)}
                  onMouseLeave={() => setHoveredImage(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 250px, 300px"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Quote Button */}
                  <AnimatePresence>
                    {hoveredImage === image.filename && (
                      <motion.div 
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.button
                          onClick={() => openQuoteModal(image.src)}
                          className="glass-morphism-strong rounded-full px-6 py-3 font-medium text-white hover:bg-gradient-to-r hover:from-lime-500 hover:to-green-600 transition-all duration-300 font-sans flex items-center gap-2"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/>
                          </svg>
                          Request Quote
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Image Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="font-medium text-sm font-sans truncate">{image.alt}</h3>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Call to Action */}
            <div className="text-center mt-16 animate-slide-up animate-delay-600">
              <div className="glass-morphism-light rounded-3xl p-8 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bricolage font-semibold mb-4">Ready to Create Your Custom Cap?</h2>
                <p className="text-stone-300 mb-6 font-sans">
                  Don't see exactly what you're looking for? Our design team can create a completely custom cap tailored to your specific needs.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="/customize/baseball-cap" 
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-full font-medium hover:scale-105 transition-transform duration-300 font-sans"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="m2 17 10 5 10-5"/>
                      <path d="m2 12 10 5 10-5"/>
                    </svg>
                    Start Designing
                  </a>
                  <a 
                    href="/quote-request" 
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 glass-button glass-hover rounded-full font-medium transition-all duration-300 font-sans"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/>
                    </svg>
                    Get Custom Quote
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quote Modal */}
      <AnimatePresence>
        {isQuoteModalOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeQuoteModal}
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div 
              className="relative glass-morphism-strong rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bricolage font-semibold">Request Quote</h2>
                <button 
                  onClick={closeQuoteModal}
                  className="p-2 rounded-full glass-button glass-hover transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18"/>
                    <path d="M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Reference Image */}
              {selectedImage && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">Reference Image</label>
                  <div className="relative h-48 rounded-xl overflow-hidden glass-morphism-subtle">
                    <Image 
                      src={selectedImage} 
                      alt="Selected reference" 
                      fill 
                      className="object-cover" 
                    />
                  </div>
                </div>
              )}

              {/* Quote Form */}
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); submitQuote(); }}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">
                      Name *
                    </label>
                    <input 
                      type="text"
                      value={quoteForm.customerName}
                      onChange={(e) => handleFormChange('customerName', e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl font-sans text-white placeholder-stone-400 border-0 focus:ring-2 focus:ring-lime-500"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">
                      Email *
                    </label>
                    <input 
                      type="email"
                      value={quoteForm.customerEmail}
                      onChange={(e) => handleFormChange('customerEmail', e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl font-sans text-white placeholder-stone-400 border-0 focus:ring-2 focus:ring-lime-500"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">
                      Phone
                    </label>
                    <input 
                      type="tel"
                      value={quoteForm.customerPhone}
                      onChange={(e) => handleFormChange('customerPhone', e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl font-sans text-white placeholder-stone-400 border-0 focus:ring-2 focus:ring-lime-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">
                      Company
                    </label>
                    <input 
                      type="text"
                      value={quoteForm.customerCompany}
                      onChange={(e) => handleFormChange('customerCompany', e.target.value)}
                      className="w-full px-4 py-3 glass-input rounded-xl font-sans text-white placeholder-stone-400 border-0 focus:ring-2 focus:ring-lime-500"
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">
                    Project Description *
                  </label>
                  <textarea 
                    value={quoteForm.projectDescription}
                    onChange={(e) => handleFormChange('projectDescription', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 glass-input rounded-xl font-sans text-white placeholder-stone-400 border-0 focus:ring-2 focus:ring-lime-500 resize-none"
                    placeholder="Describe your custom cap project, including quantity, colors, logo requirements, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-2 font-sans">
                    Timeline
                  </label>
                  <select 
                    value={quoteForm.timeline}
                    onChange={(e) => handleFormChange('timeline', e.target.value)}
                    className="w-full px-4 py-3 glass-input rounded-xl font-sans text-white border-0 focus:ring-2 focus:ring-lime-500"
                  >
                    <option value="">Select timeline</option>
                    <option value="rush">Rush Order (1-2 weeks)</option>
                    <option value="standard">Standard (2-4 weeks)</option>
                    <option value="extended">Extended (4-6 weeks)</option>
                    <option value="flexible">Flexible timing</option>
                  </select>
                </div>

                {/* Submit Status */}
                {submitStatus === 'success' && (
                  <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 12l2 2 4-4"/>
                        <circle cx="12" cy="12" r="9"/>
                      </svg>
                      <span className="font-medium font-sans">Quote request submitted successfully!</span>
                    </div>
                    <p className="text-sm mt-1 font-sans">We'll get back to you within 24 hours with a detailed quote.</p>
                    <p className="text-xs mt-1 font-sans text-green-400">This modal will close automatically in a few seconds.</p>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9"/>
                        <path d="M12 8v4"/>
                        <path d="M12 16h.01"/>
                      </svg>
                      <span className="font-medium font-sans">Failed to submit quote request</span>
                    </div>
                    <p className="text-sm mt-1 font-sans">Please try again or contact us directly.</p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={closeQuoteModal}
                    className="flex-1 px-6 py-3 glass-button glass-hover rounded-xl font-medium transition-all duration-300 font-sans"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-xl font-medium hover:scale-105 transition-transform duration-300 font-sans disabled:opacity-50 disabled:hover:scale-100"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Submitting...
                      </div>
                    ) : (
                      'Submit Quote Request'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}