import {defineField, defineType} from 'sanity'

export const resaleProduct = defineType({
  name: 'resaleProduct',
  title: 'Resale Product',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Product Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'priceTier',
      title: 'Price Tier',
      type: 'string',
      options: {
        list: [
          {title: 'Tier 1', value: 'Tier 1'},
          {title: 'Tier 2', value: 'Tier 2'},
          {title: 'Tier 3', value: 'Tier 3'},
        ],
      },
      initialValue: 'Tier 1',
    }),
    defineField({
      name: 'styleInfo',
      title: 'Style Information',
      type: 'text',
    }),
    defineField({
      name: 'mainImage',
      title: 'Main Image',
      type: 'productImage',
    }),
    defineField({
      name: 'itemData',
      title: 'Item Data Images',
      type: 'array',
      of: [{type: 'productImage'}],
    }),
    defineField({
      name: 'capColorImage',
      title: 'Cap Color Images',
      type: 'array',
      of: [{type: 'productImage'}],
    }),
    defineField({
      name: 'capColorNames',
      title: 'Cap Color Names',
      type: 'string',
      description: 'Comma-separated color names for text-based color input',
    }),
    defineField({
      name: 'referenceProductId',
      title: 'Reference Product ID',
      type: 'string',
      description: 'ID of factory product to reference for colors',
    }),
    defineField({
      name: 'customOptions',
      title: 'Custom Product Options',
      type: 'array',
      of: [{type: 'customOption'}],
    }),
    // Cap Style Setup fields
    defineField({
      name: 'billShape',
      title: 'Bill Shape',
      type: 'string',
      options: {
        list: [
          {title: 'Slight Curved', value: 'Slight Curved'},
          {title: 'Curved', value: 'Curved'},
          {title: 'Flat', value: 'Flat'},
        ],
      },
    }),
    defineField({
      name: 'profile',
      title: 'Profile',
      type: 'string',
      options: {
        list: [
          {title: 'High', value: 'High'},
          {title: 'Mid', value: 'Mid'},
          {title: 'Low', value: 'Low'},
        ],
      },
    }),
    defineField({
      name: 'closureType',
      title: 'Closure Type',
      type: 'string',
      options: {
        list: [
          {title: 'Snapback', value: 'Snapback'},
          {title: 'Velcro', value: 'Velcro'},
          {title: 'Fitted', value: 'Fitted'},
          {title: 'Stretched', value: 'Stretched'},
        ],
      },
    }),
    defineField({
      name: 'structure',
      title: 'Structure',
      type: 'string',
      options: {
        list: [
          {title: 'Structured', value: 'Structured'},
          {title: 'Unstructured', value: 'Unstructured'},
          {title: 'Foam', value: 'Foam'},
        ],
      },
    }),
    defineField({
      name: 'fabricSetup',
      title: 'Fabric Setup',
      type: 'string',
      description: 'Premium fabrics add cost to customization',
    }),
    defineField({
      name: 'customFabricSetup',
      title: 'Custom Fabric Setup',
      type: 'string',
      description: 'Custom fabric setup when "Other" is selected',
      hidden: ({document}) => document?.fabricSetup !== 'Other',
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'productType',
      title: 'Product Type',
      type: 'string',
      initialValue: 'resale',
      readOnly: true,
    }),
    defineField({
      name: 'sellingPrice',
      title: 'Selling Price',
      type: 'number',
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: 'shippingSource',
      title: 'Shipping Source',
      type: 'string',
      options: {
        list: [
          {title: 'Factory', value: 'Factory'},
          {title: 'Warehouse', value: 'Warehouse'},
        ],
      },
      initialValue: 'Factory',
    }),
    defineField({
      name: 'productCategory',
      title: 'Product Category',
      type: 'string',
      options: {
        list: [
          {title: 'Caps', value: 'Caps'},
          {title: 'Shirts', value: 'Shirts'},
          {title: 'Beanies', value: 'Beanies'},
          {title: 'Other', value: 'Other'},
        ],
      },
      initialValue: 'Caps',
    }),
    defineField({
      name: 'customProductCategory',
      title: 'Custom Product Category',
      type: 'string',
      hidden: ({document}) => document?.productCategory !== 'Other',
    }),
    defineField({
      name: 'qcHandler',
      title: 'QC Handler',
      type: 'string',
      options: {
        list: [
          {title: 'Factory', value: 'Factory'},
          {title: '3rd Party', value: '3rd Party'},
          {title: 'Buyer', value: 'Buyer'},
        ],
      },
      initialValue: 'Factory',
    }),
    defineField({
      name: 'productReadiness',
      title: 'Product Readiness',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: [
          {title: 'Stock/Inventory', value: 'Stock/Inventory'},
          {title: 'Customizable', value: 'Customizable'},
        ],
      },
      initialValue: ['Customizable'],
    }),
    defineField({
      name: 'sku',
      title: 'SKU',
      type: 'string',
      hidden: ({document}) => !document?.productReadiness?.includes('Stock/Inventory'),
    }),
    defineField({
      name: 'stockQuantity',
      title: 'Stock Quantity',
      type: 'number',
      hidden: ({document}) => !document?.productReadiness?.includes('Stock/Inventory'),
    }),
    defineField({
      name: 'inventoryLocation',
      title: 'Inventory Location',
      type: 'string',
      hidden: ({document}) => !document?.productReadiness?.includes('Stock/Inventory'),
    }),
    defineField({
      name: 'reorderPoint',
      title: 'Reorder Point',
      type: 'number',
      hidden: ({document}) => !document?.productReadiness?.includes('Stock/Inventory'),
    }),
    defineField({
      name: 'createdBy',
      title: 'Created By',
      type: 'createdBy',
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
})