// src/app/store/page.tsx
import Image from "next/image";
import { notFound } from "next/navigation";

// Define types for clarity
interface Pricing {
  price48: number;
  price144: number;
  price576: number;
  price1152: number;
  price2880: number;
  price10000: number;
}

interface Product {
  name: string;
  slug: string;
  draft: boolean;
  description: string;
  mainImage: string;
  pricing?: Pricing;
}

// Hardcoded data from CSV files (simulating fetch from Webflow CMS)
const productsData: Product[] = [
  {
    name: "7-Panel Flat",
    slug: "7-panel-flat",
    draft: false,
    description:
      "<p>Elevate your style with our premium custom snapback cap, designed for those who value quality and individuality. The structured, high-profile, 7P FlatBill Perf cap combines modern aesthetics with superior craftsmanship, making it an essential addition to any wardrobe. Crafted from a lightweight cotton-polyester blend with laser-cut perforations, weighing just 110-112 grams, it offers breathable comfort for all-day wear. At OPM Gear, an On Point Marketing Company, we prioritize both style and quality to ensure you get a product that stands out. Invest in a cap that perfectly balances unique design and unparalleled functionality.</p>",
    mainImage:
      "https://cdn.prod.website-files.com/689adff1e8bb4da83b60751e/689b35c054cf5d3d8dc0831b_WoodlandBlackWoodland%20(4).jpg",
  },
  // Other products omitted as they are draft: true
];

const pricingsData = [
  {
    name: "Tier 3",
    blankCaps: ["7-panel-flat", "7-panel-slight-curved"],
    prices: {
      price48: 2.4,
      price144: 1.7,
      price576: 1.6,
      price1152: 1.47,
      price2880: 1.44,
      price10000: 1.41,
    },
  },
  // Other tiers omitted for brevity
];

// Simulated Webflow API fetch with caching
async function getBlankCapProducts(): Promise<Product[]> {
  try {
    // In production, replace with Webflow API fetch
    // Example: const response = await fetch('https://api.webflow.com/v2/collections/689ae21c87c9aa3cb52a434c/items', {
    //   headers: { Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}` },
    //   next: { revalidate: 3600 },
    // });
    // const data = await response.json();

    // Filter non-draft products
    const filteredProducts = productsData.filter((p) => !p.draft);

    // Attach pricing based on multi-reference
    const productsWithPricing = filteredProducts.map((product) => {
      const tier = pricingsData.find((t) => t.blankCaps.includes(product.slug));
      return {
        ...product,
        pricing: tier ? tier.prices : undefined,
      };
    });

    return productsWithPricing;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export default async function StorePage() {
  const products = await getBlankCapProducts();

  // If no products, return 404
  if (products.length === 0) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header/Hero Section */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Blank Caps Store
          </h1>
          <p className="mt-4 text-xl max-w-2xl mx-auto">
            Discover our premium blank caps ready for customization. High-quality materials for ultimate comfort and style.
          </p>
        </div>
      </header>

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <div
              key={product.slug}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105"
            >
              {/* Product Image */}
              <div className="relative h-64">
                {product.mainImage ? (
                  <Image
                    src={product.mainImage}
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority={true}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">No Image Available</span>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="p-6">
                <h2 className="text-2xl font-semibold mb-2">{product.name}</h2>
                <div
                  className="text-gray-600 dark:text-gray-300 mb-4 prose prose-sm"
                  dangerouslySetInnerHTML={{ __html: product.description || "No description available." }}
                />

                {/* Pricing Table */}
                {product.pricing ? (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Pricing by Quantity</h3>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                          <th className="p-2 text-left">Quantity</th>
                          <th className="p-2 text-right">Price per Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 border-t">48+</td>
                          <td className="p-2 border-t text-right">${product.pricing.price48.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-t">144+</td>
                          <td className="p-2 border-t text-right">${product.pricing.price144.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-t">576+</td>
                          <td className="p-2 border-t text-right">${product.pricing.price576.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-t">1152+</td>
                          <td className="p-2 border-t text-right">${product.pricing.price1152.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-t">2880+</td>
                          <td className="p-2 border-t text-right">${product.pricing.price2880.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border-t">10000+</td>
                          <td className="p-2 border-t text-right">${product.pricing.price10000.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-red-500">Pricing not available</p>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex justify-between gap-4">
                  <a
                    href={`/customize/${product.slug}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition flex-1 text-center"
                  >
                    Customize
                  </a>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex-1">
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// Revalidate every hour for dynamic data
export const revalidate = 3600;