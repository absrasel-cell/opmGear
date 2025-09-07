'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on login and register pages
  const hideFooterPaths = ['/login', '/register'];
  
  if (hideFooterPaths.includes(pathname)) {
    return null;
  }
  
  return <Footer />;
}